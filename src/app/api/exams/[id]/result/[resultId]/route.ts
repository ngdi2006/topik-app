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
        const attemptId = resolvedParams.resultId  // resultId is actually attemptId

        const adminClient = createAdminClient()

        // 1. Get attempt (where score/results are saved by submit API)
        const { data: attempt, error: attemptError } = await adminClient
            .from('exam_attempts')
            .select('*')
            .eq('id', attemptId)
            .eq('exam_id', examId)
            .single()

        if (attemptError || !attempt) {
            return NextResponse.json({ error: 'Không tìm thấy kết quả làm bài' }, { status: 404 })
        }

        // Security: learners can only view their own results
        if (attempt.user_id !== user.id) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (!profile || profile.role === 'learner') {
                return NextResponse.json({ error: 'Bạn không có quyền xem kết quả này' }, { status: 403 })
            }
        }

        // 2. Get exam info
        const { data: examData, error: examError } = await adminClient
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single()

        if (examError) {
            return NextResponse.json({ error: 'Không tìm thấy thông tin bài thi' }, { status: 404 })
        }

        // 3. Get saved answers
        const { data: savedAnswers } = await adminClient
            .from('exam_answers')
            .select('*')
            .eq('attempt_id', attemptId)

        // Build answers map: { questionId: selectedOptionIndex }
        const answersMap: Record<string, number> = {}
        if (savedAnswers) {
            savedAnswers.forEach((a: any) => {
                if (a.selected_option !== null && a.selected_option !== undefined) {
                    answersMap[a.question_id] = a.selected_option
                }
            })
        }

        // 4. Get questions from the snapshot stored in the attempt
        const questions = attempt.questions_snapshot || []

        // Build result in the format the frontend expects
        const resultData = {
            id: attempt.id,
            user_id: attempt.user_id,
            score: attempt.score ?? 0,
            total_points: attempt.total_points ?? 0,
            correct_count: attempt.correct_count ?? 0,
            wrong_count: attempt.wrong_count ?? 0,
            total_correct: attempt.correct_count ?? 0,
            status: attempt.status,
            created_at: attempt.completed_at || attempt.started_at,
            time_taken: 0,
            answers: answersMap,
        }

        return NextResponse.json({
            result: resultData,
            exam: examData,
            questions: questions
        }, { status: 200 })

    } catch (error: any) {
        console.error("Result API Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
