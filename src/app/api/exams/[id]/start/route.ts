// =====================================================================
// API: Start Exam - Random questions với non-repeat logic
// =====================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
    generateRandomQuestionsForUser
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

        // Verify exam exists and is published or internal
        const { data: exam, error: examError } = await adminClient
            .from('exams')
            .select('*')
            .eq('id', params.id)
            .in('status', ['Published', 'Internal'])
            .single()

        if (examError || !exam) {
            return NextResponse.json(
                { success: false, error: 'Đề thi trống hoặc không tồn tại' },
                { status: 404 }
            )
        }

        // Check internal exam assignment
        if (exam.status === 'Internal') {
            const { data: assignment, error: assignmentError } = await adminClient
                .from('exam_assignments')
                .select('id')
                .eq('exam_id', params.id)
                .eq('user_id', user.id)
                .maybeSingle()
            
            if (assignmentError || !assignment) {
                return NextResponse.json(
                    { success: false, error: 'Bạn không có quyền truy cập đề thi nội bộ này' },
                    { status: 403 }
                )
            }
        }

        // Determine if user has free attempts or needs to consume credits
        const { count: attemptCount } = await adminClient
            .from('exam_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('exam_id', params.id)

        const totalAttempts = attemptCount || 0
        const freeAttempts = exam.free_attempts ?? 1
        const creditsRequired = exam.credits_required ?? 1

        let isFreeAttempt = false
        let canStart = false

        if (exam.is_free || totalAttempts < freeAttempts) {
            isFreeAttempt = true
            canStart = true
        } else {
            // Need to consume credits
            const { data: creditsData } = await adminClient
                .from('user_exam_credits')
                .select('remaining_credits, used_credits')
                .eq('user_id', user.id)
                .single()

            const remaining = creditsData?.remaining_credits || 0
            const currentUsed = creditsData?.used_credits || 0

            if (remaining >= creditsRequired) {
                const { error: deductError } = await adminClient
                    .from('user_exam_credits')
                    .update({ used_credits: currentUsed + creditsRequired })
                    .eq('user_id', user.id)

                if (!deductError) {
                    canStart = true
                }
            }
        }

        if (!canStart) {
            return NextResponse.json(
                { success: false, error: 'Không thể bắt đầu bài thi. Bạn đã hết lượt miễn phí và không đủ số dư.' },
                { status: 403 }
            )
        }

        // Generate questions (fixed for free attempts if configured, random otherwise)
        const questions = await generateRandomQuestionsForUser(
            adminClient,
            user.id,
            params.id,
            isFreeAttempt
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

        const attemptNumber = totalAttempts + 1

        // Create attempt row
        const { data: attemptRow, error: attemptError } = await adminClient
            .from('exam_attempts')
            .insert({
                user_id: user.id,
                exam_id: params.id,
                is_free_attempt: isFreeAttempt,
                status: 'in_progress',
                questions_snapshot: questions,
                attempt_number: attemptNumber
            })
            .select()
            .single()

        if (attemptError || !attemptRow) {
             console.error("Insert error:", attemptError)
             throw new Error('Không thể tạo phiên làm bài')
        }

        return NextResponse.json({
            success: true,
            attempt: {
                id: attemptRow.id,
                exam_id: attemptRow.exam_id,
                questions: questions,
                started_at: attemptRow.started_at,
                attempt_number: attemptNumber,
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
