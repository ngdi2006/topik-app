// =====================================================================
// API: Start Exam - Random questions với non-repeat logic
// =====================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
    generateRandomQuestionsForUser,
    createExamAttempt,
} from '@/lib/exam/randomizer'

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
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

        // Use admin client to bypass RLS for question selection
        const adminClient = createAdminClient()

        // Verify exam exists and is published
        const { data: exam, error: examError } = await adminClient
            .from('exams')
            .select('*')
            .eq('id', params.id)
            .eq('status', 'Published')
            .single()

        if (examError || !exam) {
            return NextResponse.json(
                { success: false, error: 'Đề thi trống hoặc không tồn tại' },
                { status: 404 }
            )
        }

        // Generate random questions
        const questions = await generateRandomQuestionsForUser(
            adminClient,
            user.id,
            params.id
        )

        if (!questions || questions.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Không thể tạo bộ câu hỏi. Vui lòng kiểm tra cấu hình đề thi.',
                },
                { status: 400 }
            )
        }

        // Create attempt
        const attempt = await createExamAttempt(
            adminClient,
            user.id,
            params.id,
            questions
        )

        return NextResponse.json({
            success: true,
            attempt: {
                id: attempt.id,
                exam_id: attempt.exam_id,
                questions: questions, // full snapshot to client
                started_at: attempt.started_at,
                attempt_number: attempt.attempt_number,
            },
            exam: {
                title: exam.title,
                level: exam.level,
                duration: exam.duration,
                reading_duration: exam.reading_duration,
                listening_duration: exam.listening_duration,
            },
        })
    } catch (error: any) {
        console.error('Start exam error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
