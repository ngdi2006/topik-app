// =====================================================================
// API: Save Section Answers (Reading or Listening)
// =====================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string; attemptId: string }> }
) {
    try {
        const params = await context.params
        const body = await request.json()
        const { section, answers } = body

        if (!section || !answers) {
            return NextResponse.json(
                { success: false, error: 'Thiếu dữ liệu' },
                { status: 400 }
            )
        }

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

        // Verify attempt belongs to user
        const { data: attempt, error: attemptError } = await adminClient
            .from('exam_attempts')
            .select('id, user_id')
            .eq('id', params.attemptId)
            .eq('user_id', user.id)
            .single()

        if (attemptError || !attempt) {
            return NextResponse.json(
                { success: false, error: 'Không tìm thấy phiên thi' },
                { status: 404 }
            )
        }

        // Delete existing answers for this section first (to allow re-save)
        const questionIds = answers.map((a: any) => a.question_id)
        if (questionIds.length > 0) {
            await adminClient
                .from('exam_answers')
                .delete()
                .eq('attempt_id', params.attemptId)
                .in('question_id', questionIds)
        }

        // Insert new answers
        const answersToInsert = answers
            .filter((a: any) => a.selected_option !== null && a.selected_option !== undefined) // Only insert answered ones
            .map((a: any) => ({
                attempt_id: params.attemptId,
                question_id: a.question_id,
                selected_option: a.selected_option,
                section: section,
            }))

        if (answersToInsert.length > 0) {
            const { error: insertError } = await adminClient
                .from('exam_answers')
                .insert(answersToInsert)

            if (insertError) {
                console.error('Insert answers error:', insertError)
                throw insertError
            }
        }

        return NextResponse.json({
            success: true,
            saved: answersToInsert.length,
            section: section,
        })
    } catch (error: any) {
        console.error('Save section error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
