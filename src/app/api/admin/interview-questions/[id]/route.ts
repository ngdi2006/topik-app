import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { recordInterviewQuestionHistory } from '@/lib/interview-audit'

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error'
}

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('interview_questions')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const adminClient = createAdminClient()

        // Get current user details for audit log
        let actorId: string | undefined
        let actorName = 'Quản trị viên / Giáo viên'
        let actorEmail: string | null = null
        try {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                actorId = user.id
                actorEmail = user.email || null
                const { data: profile } = await adminClient
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', user.id)
                    .maybeSingle()
                if (profile?.full_name) actorName = profile.full_name
                if (profile?.email) actorEmail = profile.email
            }
        } catch {
            // Ignore auth lookup errors
        }

        // Fetch previous question data for audit diff
        const { data: oldQuestion } = await adminClient
            .from('interview_questions')
            .select('*')
            .eq('id', id)
            .maybeSingle()

        // Quick partial update for order_index alone
        const keys = Object.keys(body)
        if (keys.length === 1 && keys[0] === 'order_index') {
            const rawOrder = body.order_index
            const orderIndex = rawOrder !== null && rawOrder !== '' ? Number(rawOrder) : 0
            const { data, error } = await adminClient
                .from('interview_questions')
                .update({
                    order_index: isNaN(orderIndex) ? 0 : orderIndex,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            if (oldQuestion && oldQuestion.order_index !== orderIndex) {
                await recordInterviewQuestionHistory({
                    questionId: id,
                    actorId,
                    actorName,
                    actorEmail,
                    actionType: 'order_change',
                    previousData: { order_index: oldQuestion.order_index },
                    newData: { order_index: orderIndex },
                    changeSummary: `Đổi STT từ #${oldQuestion.order_index} sang #${orderIndex}`
                })
            }

            return NextResponse.json({ success: true, data })
        }

        const updatePayload: Record<string, unknown> = {
            industry: body.industry,
            category: body.category,
            question_text: body.question_text,
            vietnamese_meaning: body.vietnamese_meaning,
            question_audio_url: body.question_audio_url,
            suggested_answers: body.suggested_answers,
            countdown_after_audio: body.countdown_after_audio,
            tool_image_url: body.tool_image_url,
            target_zone_id: body.target_zone_id,
            tool_config: body.tool_config,
            updated_at: new Date().toISOString()
        }

        if (body.order_index !== undefined) {
            const rawOrder = body.order_index
            const orderIndex = rawOrder !== null && rawOrder !== '' ? Number(rawOrder) : 0
            updatePayload.order_index = isNaN(orderIndex) ? 0 : orderIndex
        }

        const { data, error } = await adminClient
            .from('interview_questions')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Generate change summary for history log
        let summary = 'Cập nhật nội dung câu hỏi'
        if (oldQuestion) {
            const changes: string[] = []
            if (oldQuestion.tool_config?.correct_tool !== body.tool_config?.correct_tool) {
                changes.push(`Đổi dụng cụ: ${oldQuestion.tool_config?.correct_tool || '—'} → ${body.tool_config?.correct_tool || '—'}`)
            }
            if (oldQuestion.tool_config?.target_object !== body.tool_config?.target_object) {
                changes.push(`Đổi vật thể: ${oldQuestion.tool_config?.target_object || '—'} → ${body.tool_config?.target_object || '—'}`)
            }
            if (oldQuestion.tool_config?.correct_action !== body.tool_config?.correct_action) {
                changes.push(`Đổi thao tác: ${oldQuestion.tool_config?.correct_action || '—'} → ${body.tool_config?.correct_action || '—'}`)
            }
            if (oldQuestion.vietnamese_meaning !== body.vietnamese_meaning) {
                changes.push('Cập nhật dịch nghĩa')
            }
            if (JSON.stringify(oldQuestion.suggested_answers) !== JSON.stringify(body.suggested_answers)) {
                changes.push('Cập nhật đáp án gợi ý')
            }
            if (changes.length > 0) summary = changes.join('; ')
        }

        await recordInterviewQuestionHistory({
            questionId: id,
            actorId,
            actorName,
            actorEmail,
            actionType: body.is_quick_edit ? 'quick_answer_edit' : 'full_edit',
            previousData: oldQuestion ? {
                tool_config: oldQuestion.tool_config,
                suggested_answers: oldQuestion.suggested_answers,
                vietnamese_meaning: oldQuestion.vietnamese_meaning,
                question_text: oldQuestion.question_text
            } : null,
            newData: {
                tool_config: body.tool_config,
                suggested_answers: body.suggested_answers,
                vietnamese_meaning: body.vietnamese_meaning,
                question_text: body.question_text
            },
            changeSummary: summary
        })

        return NextResponse.json({ success: true, data })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('interview_questions')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}
