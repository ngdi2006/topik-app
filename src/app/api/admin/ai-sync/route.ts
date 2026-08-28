import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const AI_ANALYSIS_VERSION = 2
const MAX_BATCH_SIZE = 5
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type SyncScope = 'missing' | 'all'
type QuestionRow = {
    id: string
    category_id: string | null
    question_type: string
    level: number
    question_text: string | null
    passage: string | null
    options: unknown
    correct_answer: number
    translated_text?: string | null
    ai_vocab_list?: unknown[] | null
    ai_grammar_list?: unknown[] | null
    ai_question_analysis?: Record<string, unknown> | null
    category?: { name?: string } | null
}

function errorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    if (error && typeof error === 'object') {
        const value = error as Record<string, unknown>
        const parts = [value.message, value.details, value.hint]
            .filter((part): part is string => typeof part === 'string' && part.length > 0)
        if (parts.length > 0) return parts.join(' — ')
        try {
            return JSON.stringify(error)
        } catch {
            return 'Lỗi dữ liệu không xác định'
        }
    }
    return 'Lỗi không xác định'
}

function isMissingAnalysis(question: QuestionRow) {
    return !question.translated_text
        || !Array.isArray(question.ai_vocab_list)
        || !Array.isArray(question.ai_grammar_list)
        || !question.ai_question_analysis
}

function normalizeOption(option: unknown) {
    if (typeof option === 'string') return option
    if (option && typeof option === 'object' && 'content' in option) return String((option as { content?: unknown }).content || '')
    return ''
}

async function callGemini(prompt: string, retries = 3): Promise<Record<string, unknown>> {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!key) throw new Error('Chưa cấu hình GEMINI_API_KEY hoặc GOOGLE_API_KEY')

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
    })

    if (!response.ok) {
        if (response.status === 429 && retries > 0) {
            await sleep(5_000)
            return callGemini(prompt, retries - 1)
        }
        throw new Error(`Gemini API (${response.status}): ${await response.text()}`)
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini không trả về nội dung phân tích')

    try {
        return JSON.parse(text) as Record<string, unknown>
    } catch {
        throw new Error('Gemini trả về JSON không hợp lệ')
    }
}

async function fetchQuestionRows(includeDetailedAnalysis: boolean) {
    const admin = createAdminClient()
    const columns = includeDetailedAnalysis
        ? 'id, category_id, translated_text, ai_vocab_list, ai_grammar_list, ai_question_analysis'
        : 'id, category_id, translated_text, ai_vocab_list, ai_grammar_list'
    const rows: QuestionRow[] = []
    const pageSize = 1_000

    for (let from = 0; ; from += pageSize) {
        const { data, error } = await admin.from('question_bank').select(columns).range(from, from + pageSize - 1)
        if (error) throw error
        rows.push(...((data || []) as unknown as QuestionRow[]))
        if (!data || data.length < pageSize) break
    }
    return rows
}

export async function GET() {
    try {
        const admin = createAdminClient()
        const categoriesPromise = Promise.resolve(
            admin
                .from('question_categories')
                .select('id, name, description, icon, color, sort_order')
                .order('sort_order', { ascending: true }),
        )

        let schemaReady = true
        let questions: QuestionRow[]
        try {
            questions = await fetchQuestionRows(true)
        } catch (error) {
            if (!errorMessage(error).includes('ai_question_analysis')) throw error
            schemaReady = false
            questions = await fetchQuestionRows(false)
        }

        let { data: categories, error: categoryError } = await categoriesPromise
        if (categoryError && errorMessage(categoryError).includes('sort_order')) {
            const fallback = await admin
                .from('question_categories')
                .select('id, name, description, icon, color')
                .order('created_at', { ascending: true })
            categories = fallback.data?.map((category, index) => ({ ...category, sort_order: index })) || null
            categoryError = fallback.error
        }
        if (categoryError) throw categoryError

        const counts = new Map<string, { total: number; pending: number; analyzed: number }>()
        for (const question of questions) {
            const key = question.category_id || 'uncategorized'
            const current = counts.get(key) || { total: 0, pending: 0, analyzed: 0 }
            current.total += 1
            if (schemaReady && !isMissingAnalysis(question)) current.analyzed += 1
            else current.pending += 1
            counts.set(key, current)
        }

        const warehouses = (categories || []).map((category) => ({
            ...category,
            ...(counts.get(category.id) || { total: 0, pending: 0, analyzed: 0 }),
        }))
        const uncategorized = counts.get('uncategorized')
        if (uncategorized?.total) {
            warehouses.push({
                id: 'uncategorized',
                name: 'Chưa phân kho',
                description: 'Câu hỏi chưa được gán vào kho nội dung.',
                icon: '📥',
                color: '#64748B',
                sort_order: 9999,
                ...uncategorized,
            })
        }

        return NextResponse.json({
            success: true,
            schemaReady,
            analysisVersion: AI_ANALYSIS_VERSION,
            totals: warehouses.reduce((sum, item) => ({
                total: sum.total + item.total,
                pending: sum.pending + item.pending,
                analyzed: sum.analyzed + item.analyzed,
            }), { total: 0, pending: 0, analyzed: 0 }),
            warehouses,
        })
    } catch (error) {
        return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}))
        const categoryId = typeof body.categoryId === 'string' ? body.categoryId : ''
        const scope: SyncScope = body.scope === 'all' ? 'all' : 'missing'
        const cursor = typeof body.cursor === 'string' ? body.cursor : null
        const batchSize = Math.min(MAX_BATCH_SIZE, Math.max(1, Number(body.batchSize) || 2))

        if (!categoryId) {
            return NextResponse.json({ success: false, error: 'Hãy chọn một kho câu hỏi cần phân tích' }, { status: 400 })
        }

        const admin = createAdminClient()
        let query = admin
            .from('question_bank')
            .select('id, category_id, question_type, level, question_text, passage, options, correct_answer, translated_text, ai_vocab_list, ai_grammar_list, ai_question_analysis, category:question_categories(name)')
            .order('id', { ascending: true })
            .limit(batchSize)

        query = categoryId === 'uncategorized' ? query.is('category_id', null) : query.eq('category_id', categoryId)
        if (scope === 'missing') {
            query = query.or('translated_text.is.null,ai_vocab_list.is.null,ai_grammar_list.is.null,ai_question_analysis.is.null')
        } else if (cursor) {
            query = query.gt('id', cursor)
        }

        const { data, error: fetchError } = await query
        if (fetchError) {
            if (fetchError.message.includes('ai_question_analysis')) {
                return NextResponse.json({
                    success: false,
                    error: 'Cơ sở dữ liệu chưa có cột phân tích chi tiết. Hãy chạy migration 202608270001_add_question_ai_analysis.sql trước.',
                }, { status: 409 })
            }
            throw fetchError
        }

        const questions = (data || []) as unknown as QuestionRow[]
        if (questions.length === 0) {
            return NextResponse.json({ success: true, processed: 0, failed: 0, finished: true, results: [] })
        }

        const results: Array<{ id: string; status: 'success' | 'error'; error?: string }> = []
        let processed = 0

        for (const question of questions) {
            if (processed > 0) await sleep(4_000)
            const options = Array.isArray(question.options) ? question.options.map(normalizeOption) : []
            const categoryName = Array.isArray(question.category) ? question.category[0]?.name : question.category?.name
            const correctAnswerNumber = Number(question.correct_answer)
            const correctAnswerText = options[correctAnswerNumber] || ''
            const clean = (value: string | null) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

            const prompt = `Bạn là chuyên gia luyện thi TOPIK cho người Việt. Hãy dịch và phân tích câu hỏi trong đúng kho đã chọn. Mục tiêu là giúp học viên hiểu lỗi sai khi luyện lại và nhận diện được dạng bài khi luyện dạng.

KHO: ${categoryName || 'Chưa phân kho'}
KỸ NĂNG: ${question.question_type}; CẤP ĐỘ: ${question.level}
ĐOẠN VĂN/NGỮ CẢNH: ${clean(question.passage)}
CÂU HỎI: ${clean(question.question_text)}
CÁC ĐÁP ÁN: ${options.map((option, index) => `${index + 1}. ${option}`).join(' | ')}
ĐÁP ÁN ĐÚNG: ${correctAnswerNumber + 1}. ${correctAnswerText}

Trả về duy nhất JSON hợp lệ theo cấu trúc:
{
  "translated_text": "Bản dịch đầy đủ, tự nhiên của ngữ cảnh, câu hỏi và các đáp án cần thiết",
  "vocab_list": [{"id":"v1","word":"từ nguyên thể","meaning":"nghĩa tiếng Việt","explanation":"sắc thái/cách dùng/dạng chia","example":"ví dụ lấy từ đề","example_translation":"dịch ví dụ","fillInBlankQuestion":"ví dụ thay từ bằng (   )","fillInBlankAnswer":"phần bị thay"}],
  "grammar_list": [{"id":"g1","structures":"cấu trúc","usage":"ý nghĩa/chức năng","explanation":"cách nhận biết và dùng","example":"ví dụ lấy từ đề","example_translation":"dịch ví dụ","fillInBlankQuestion":"ví dụ thay cấu trúc bằng (   )","fillInBlankAnswer":"phần bị thay"}],
  "question_analysis": {
    "question_kind": {"code":"mã dạng ngắn gọn","name":"tên dạng câu hỏi bằng tiếng Việt","skill":"reading hoặc listening"},
    "task_summary":"Câu hỏi yêu cầu người học làm gì",
    "passage_translation":"Bản dịch riêng của đoạn văn/ngữ cảnh",
    "question_translation":"Bản dịch riêng của yêu cầu câu hỏi",
    "key_clues":["manh mối tiếng Hàn kèm giải nghĩa"],
    "correct_answer_explanation":"Vì sao đáp án đúng phù hợp, dẫn chiếu manh mối",
    "option_explanations":[{"index":0,"is_correct":false,"translation":"dịch đáp án","explanation":"vì sao đúng hoặc sai"}],
    "solving_strategy":["các bước giải dạng này"],
    "common_mistakes":["lỗi học viên thường mắc"],
    "difficulty":"easy|medium|hard"
  }
}
Tối đa 8 từ vựng, 5 ngữ pháp. option_explanations phải đủ ${options.length} đáp án và index bắt đầu từ 0.`

            try {
                const aiResult = await callGemini(prompt)
                const questionAnalysis = aiResult.question_analysis
                if (!aiResult.translated_text || !questionAnalysis || typeof questionAnalysis !== 'object') {
                    throw new Error('Kết quả AI thiếu bản dịch hoặc phân tích dạng câu')
                }

                const { error: updateError } = await admin
                    .from('question_bank')
                    .update({
                        translated_text: String(aiResult.translated_text),
                        ai_vocab_list: Array.isArray(aiResult.vocab_list) ? aiResult.vocab_list : [],
                        ai_grammar_list: Array.isArray(aiResult.grammar_list) ? aiResult.grammar_list : [],
                        ai_question_analysis: questionAnalysis,
                        ai_analysis_version: AI_ANALYSIS_VERSION,
                        ai_analyzed_at: new Date().toISOString(),
                    })
                    .eq('id', question.id)
                if (updateError) throw updateError

                processed += 1
                results.push({ id: question.id, status: 'success' })
            } catch (error) {
                results.push({ id: question.id, status: 'error', error: errorMessage(error) })
            }
        }

        if (processed === 0) {
            return NextResponse.json({ success: false, error: results[0]?.error || 'Không thể phân tích lô câu hỏi này', results }, { status: 502 })
        }

        return NextResponse.json({
            success: true,
            processed,
            failed: results.length - processed,
            finished: questions.length < batchSize,
            nextCursor: scope === 'all' ? questions.at(-1)?.id : null,
            results,
        })
    } catch (error) {
        return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 })
    }
}
