// =====================================================================
// API: Get Exam Attempt Details
// =====================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string; attemptId: string }> }
) {
    try {
        const params = await context.params
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const adminClient = createAdminClient()

        // Get attempt with questions
        const { data: attempt, error: attemptError } = await adminClient
            .from('exam_attempts')
            .select('*')
            .eq('id', params.attemptId)
            .eq('user_id', user.id)
            .eq('exam_id', params.id)
            .single()

        if (attemptError || !attempt) {
            return NextResponse.json(
                { success: false, error: 'Không tìm thấy phiên thi' },
                { status: 404 }
            )
        }

        // Get exam info
        const { data: exam, error: examError } = await adminClient
            .from('exams')
            .select('*')
            .eq('id', params.id)
            .single()

        if (examError || !exam) {
            return NextResponse.json(
                { success: false, error: 'Không tìm thấy đề thi' },
                { status: 404 }
            )
        }

        // Parse questions from snapshot
        const questions = attempt.questions_snapshot || []

        // Get saved answers if any
        const { data: answers } = await adminClient
            .from('exam_answers')
            .select('*')
            .eq('attempt_id', params.attemptId)

        return NextResponse.json({
            success: true,
            attempt: {
                id: attempt.id,
                exam_id: attempt.exam_id,
                user_id: attempt.user_id,
                questions: questions,
                answers: answers || [],
                started_at: attempt.started_at,
                submitted_at: attempt.submitted_at,
                score: attempt.score,
                attempt_number: attempt.attempt_number,
            },
            exam: {
                id: exam.id,
                title: exam.title,
                level: exam.level,
                duration: exam.duration,
                reading_duration: exam.reading_duration,
                listening_duration: exam.listening_duration,
                total_questions: exam.total_questions,
            },
        })
    } catch (error: any) {
        console.error('Get attempt error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
