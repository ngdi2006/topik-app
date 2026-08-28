import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, context: { params: Promise<{ id: string, resultId: string }> }) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const resolvedParams = await context.params
        const examId = resolvedParams.id
        const resultId = resolvedParams.resultId

        const adminAuthClient = createAdminClient()

        // 1. Fetch Attempt
        const { data: attemptData, error: attemptError } = await adminAuthClient
            .from('exam_attempts')
            .select('*')
            .eq('id', resultId)
            .single()

        if (attemptError || !attemptData) {
            return NextResponse.json({ error: 'Không tìm thấy kết quả làm bài' }, { status: 404 })
        }

        if (attemptData.user_id !== user.id) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (!profile || profile.role === 'learner') {
                return NextResponse.json({ error: 'Bạn không có quyền xem kết quả này' }, { status: 403 })
            }
        }

        // 2. Fetch Exam Info
        const { data: examData, error: examError } = await adminAuthClient
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single()

        if (examError) {
            return NextResponse.json({ error: 'Không tìm thấy thông tin bài thi' }, { status: 404 })
        }

        // 3. Fetch Answers
        const { data: answersData, error: answersError } = await adminAuthClient
            .from('exam_answers')
            .select('*')
            .eq('attempt_id', resultId)

        const answersMap: Record<string, number> = {}
        if (answersData) {
            answersData.forEach((ans: any) => {
                if (ans.selected_option !== null && ans.selected_option !== undefined) {
                    answersMap[ans.question_id] = ans.selected_option
                }
            })
        }

        // Calculate time taken in seconds
        const startedAt = new Date(attemptData.started_at).getTime()
        const completedAt = attemptData.completed_at ? new Date(attemptData.completed_at).getTime() : Date.now()
        const timeTaken = Math.floor((completedAt - startedAt) / 1000)

        // Map to expected format for the frontend
        const resultFormatted = {
            ...attemptData,
            total_correct: attemptData.correct_count,
            time_taken: timeTaken,
            answers: answersMap,
            created_at: attemptData.completed_at || attemptData.started_at
        }

        // Lấy thông tin AI metadata mới nhất từ question_bank
        const snapshot = attemptData.questions_snapshot || [];
        const questionIds = snapshot.map((q: any) => q.id);

        const aiDataMap: Record<string, any> = {};
        if (questionIds.length > 0) {
            const detailedResult = await adminAuthClient
                .from('question_bank')
                .select('id, translated_text, ai_vocab_list, ai_grammar_list, ai_question_analysis')
                .in('id', questionIds);
            let qbData: Array<Record<string, any>> = detailedResult.data || []
            let aiDataError = detailedResult.error

            if (aiDataError?.message.includes('ai_question_analysis')) {
                const fallback = await adminAuthClient
                    .from('question_bank')
                    .select('id, translated_text, ai_vocab_list, ai_grammar_list')
                    .in('id', questionIds)
                qbData = (fallback.data || []).map((item) => ({ ...item, ai_question_analysis: null }))
                aiDataError = fallback.error
            }

            if (aiDataError) console.error('AI metadata fetch error:', aiDataError)
            
            if (qbData) {
                qbData.forEach((q: any) => {
                    aiDataMap[q.id] = q;
                });
            }
        }

        const enrichedQuestions = snapshot.map((q: any) => ({
            ...q,
            translated_text: aiDataMap[q.id]?.translated_text || null,
            ai_vocab_list: aiDataMap[q.id]?.ai_vocab_list || null,
            ai_grammar_list: aiDataMap[q.id]?.ai_grammar_list || null,
            ai_question_analysis: aiDataMap[q.id]?.ai_question_analysis || null
        }));

        return NextResponse.json({
            result: resultFormatted,
            exam: examData,
            questions: enrichedQuestions
        }, { status: 200 })

    } catch (error: any) {
        console.error("Result API Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
