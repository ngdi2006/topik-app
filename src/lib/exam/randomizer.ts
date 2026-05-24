// =====================================================================
// TOPIK-IBT: Random Question Selection với Non-Repeat Logic
// =====================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
    ExamQuestionRule,
    QuestionBank,
    QuestionSnapshot,
    UserQuestionHistory,
} from '@/types/exam'

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

/**
 * Shuffle options for a question and return mapping
 * Returns: { shuffledOptions, originalCorrectIndex }
 */
function shuffleOptions(question: QuestionBank): {
    shuffledOptions: any[]
    shuffledCorrectAnswer: number
} {
    // If shuffle_options is false, return original
    if (question.shuffle_options === false) {
        return {
            shuffledOptions: question.options,
            shuffledCorrectAnswer: question.correct_answer,
        }
    }

    // Create array of indices [0, 1, 2, 3]
    const indices = question.options.map((_, i) => i)
    const shuffledIndices = shuffleArray(indices)

    // Shuffle options according to shuffled indices
    const shuffledOptions = shuffledIndices.map((i) => question.options[i])

    // Find new position of correct answer
    const shuffledCorrectAnswer = shuffledIndices.indexOf(question.correct_answer)

    return { shuffledOptions, shuffledCorrectAnswer }
}

/**
 * Lấy chu kỳ hiện tại của user cho rule
 */
async function getCurrentCycle(
    supabase: SupabaseClient,
    userId: string,
    ruleId: string
): Promise<number> {
    const { data } = await supabase
        .from('user_question_history')
        .select('cycle_number')
        .eq('user_id', userId)
        .eq('rule_id', ruleId)
        .order('cycle_number', { ascending: false })
        .limit(1)

    return data?.[0]?.cycle_number || 1
}

/**
 * Lấy IDs câu hỏi đã thấy trong chu kỳ hiện tại
 */
async function getSeenQuestionIds(
    supabase: SupabaseClient,
    userId: string,
    ruleId: string,
    cycleNumber: number
): Promise<string[]> {
    const { data } = await supabase
        .from('user_question_history')
        .select('question_bank_id')
        .eq('user_id', userId)
        .eq('rule_id', ruleId)
        .eq('cycle_number', cycleNumber)

    return data?.map((h) => h.question_bank_id) || []
}

/**
 * Lưu câu hỏi đã thấy vào history
 */
async function saveToHistory(
    supabase: SupabaseClient,
    userId: string,
    ruleId: string,
    questionIds: string[],
    cycleNumber: number
): Promise<void> {
    const records = questionIds.map((qId) => ({
        user_id: userId,
        rule_id: ruleId,
        question_bank_id: qId,
        cycle_number: cycleNumber,
    }))

    await supabase.from('user_question_history').insert(records)
}

/**
 * Lấy số lần attempt của user cho exam
 */
async function getAttemptNumber(
    supabase: SupabaseClient,
    userId: string,
    examId: string
): Promise<number> {
    const { count } = await supabase
        .from('exam_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('exam_id', examId)

    return (count || 0) + 1
}

/**
 * Get fixed free questions for an exam (if configured)
 */
async function getFixedFreeQuestions(
    supabase: SupabaseClient,
    examId: string
): Promise<QuestionBank[] | null> {
    const { data, error } = await supabase
        .from('exam_free_questions')
        .select(`
            question_bank_id,
            order_index,
            question_bank (*, question_categories(shuffle_options))
        `)
        .eq('exam_id', examId)
        .order('order_index')

    if (error || !data || data.length === 0) {
        return null
    }

    // Extract question_bank objects, sort reading first then listening
    const questions = data.map((item: any) => item.question_bank as QuestionBank)
    questions.sort((a, b) => {
        if (a.question_type === 'reading' && b.question_type === 'listening') return -1
        if (a.question_type === 'listening' && b.question_type === 'reading') return 1
        return 0
    })
    return questions
}

/**
 * CORE FUNCTION: Generate random questions cho user với non-repeat logic
 */
export async function generateRandomQuestionsForUser(
    supabase: SupabaseClient,
    userId: string,
    examId: string,
    isFreeAttempt: boolean = false
): Promise<QuestionSnapshot[]> {
    // If this is a free attempt, check for fixed free questions
    if (isFreeAttempt) {
        const fixedQuestions = await getFixedFreeQuestions(supabase, examId)

        if (fixedQuestions && fixedQuestions.length > 0) {
            // Use fixed questions for free attempts
            const snapshots: QuestionSnapshot[] = fixedQuestions.map((q, idx) => {
                // Category shuffle_options ưu tiên hơn question shuffle_options
                const cat = (q as any).question_categories
                const categoryShuffle = Array.isArray(cat) ? cat[0]?.shuffle_options : cat?.shuffle_options
                const qb = {
                    ...q,
                    shuffle_options: categoryShuffle !== undefined ? categoryShuffle : q.shuffle_options,
                } as QuestionBank

                // Shuffle options for this question
                const { shuffledOptions, shuffledCorrectAnswer } = shuffleOptions(qb)

                return {
                    ...qb,
                    options: shuffledOptions,
                    correct_answer: shuffledCorrectAnswer,
                    rule_id: 'fixed-free', // Special marker for fixed free questions
                    order: idx,
                    section: q.question_type === 'listening' ? 'listening' : 'reading',
                    points_override: undefined,
                    time_per_question: q.question_type === 'listening' ? (q.countdown_after_audio ?? 5) : undefined,
                }
            })

            return snapshots
        }
        // If no fixed questions configured, fall through to random logic
    }
    // 1. Lấy tất cả rules của đề thi
    const { data: rules, error: rulesError } = await supabase
        .from('exam_question_rules')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true })

    if (rulesError || !rules || rules.length === 0) {
        throw new Error('Không tìm thấy cấu hình câu hỏi cho đề thi này')
    }

    const allSelectedQuestions: QuestionSnapshot[] = []
    let globalOrder = 0

    // 2. Xử lý từng rule
    for (const rule of rules as any[]) {
        // 2a. Lấy tất cả câu hỏi match với rule từ kho
        // JOIN với category để lấy shuffle_options của category
        let query = supabase
            .from('question_bank')
            .select('*, question_categories!inner(shuffle_options)')
            .eq('question_type', rule.question_type)

        // Filter by category (nếu có)
        if (rule.category_id) {
            query = query.eq('category_id', rule.category_id)
        }

        // Filter by levels
        if (rule.levels && rule.levels.length > 0) {
            query = query.in('level', rule.levels)
        }

        // Filter by tags (nếu có)
        if (rule.tags && rule.tags.length > 0) {
            query = query.contains('tags', rule.tags)
        }

        const { data: poolQuestions, error: poolError } = await query

        if (poolError || !poolQuestions || poolQuestions.length === 0) {
            throw new Error(
                `Không tìm thấy câu hỏi phù hợp cho rule: ${rule.section_name || rule.question_type}`
            )
        }

        // 2b. Kiểm tra đủ câu không
        if (poolQuestions.length < rule.quantity) {
            throw new Error(
                `Kho chỉ có ${poolQuestions.length} câu nhưng cần ${rule.quantity} câu cho ${rule.section_name || rule.question_type}`
            )
        }

        // 2c. Lấy chu kỳ hiện tại
        const currentCycle = await getCurrentCycle(supabase, userId, rule.id)

        // 2d. Lấy IDs đã thấy trong chu kỳ này
        const seenIds = await getSeenQuestionIds(
            supabase,
            userId,
            rule.id,
            currentCycle
        )

        // 2e. Filter câu chưa thấy
        let availableQuestions = poolQuestions.filter(
            (q) => !seenIds.includes(q.id)
        )
        let cycleToUse = currentCycle

        // 2f. RESET nếu không đủ câu
        if (availableQuestions.length < rule.quantity) {
            cycleToUse = currentCycle + 1
            availableQuestions = poolQuestions // Reset toàn bộ pool
        }

        // 2g. Shuffle và lấy N câu
        const shuffled = shuffleArray(availableQuestions)
        const selected = shuffled.slice(0, rule.quantity)

        // 2h. Lưu vào history
        await saveToHistory(
            supabase,
            userId,
            rule.id,
            selected.map((q) => q.id),
            cycleToUse
        )

        // 2i. Transform sang QuestionSnapshot với shuffled options
        const snapshots: QuestionSnapshot[] = selected.map((q) => {
            // Category shuffle_options ưu tiên hơn question shuffle_options
            const cat = (q as any).question_categories
            const categoryShuffle = Array.isArray(cat) ? cat[0]?.shuffle_options : cat?.shuffle_options
            const qb = {
                ...q,
                shuffle_options: categoryShuffle !== undefined ? categoryShuffle : q.shuffle_options,
            } as QuestionBank

            // Shuffle options for this question
            const { shuffledOptions, shuffledCorrectAnswer } = shuffleOptions(qb)

            return {
                ...qb,
                options: shuffledOptions, // Use shuffled options
                correct_answer: shuffledCorrectAnswer, // Use new correct answer index
                rule_id: rule.id,
                order: globalOrder++,
                section: rule.question_type === 'listening' ? 'listening' : 'reading',
                points_override:
                    rule.points_per_question > 0
                        ? rule.points_per_question
                        : undefined,
                time_per_question:
                    rule.question_type === 'listening' && rule.time_per_question
                        ? rule.time_per_question
                        : undefined,
            }
        })

        allSelectedQuestions.push(...snapshots)
    }

    return allSelectedQuestions
}

/**
 * Tạo exam attempt với snapshot câu hỏi
 */
export async function createExamAttempt(
    supabase: SupabaseClient,
    userId: string,
    examId: string,
    questionsSnapshot: QuestionSnapshot[]
) {
    const attemptNumber = await getAttemptNumber(supabase, userId, examId)

    const { data: attempt, error } = await supabase
        .from('exam_attempts')
        .insert({
            user_id: userId,
            exam_id: examId,
            questions_snapshot: questionsSnapshot,
            attempt_number: attemptNumber,
            status: 'in_progress',
        })
        .select()
        .single()

    if (error) {
        throw new Error('Không thể tạo phiên thi: ' + error.message)
    }

    return attempt
}
