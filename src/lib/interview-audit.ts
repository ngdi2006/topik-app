import { createAdminClient } from '@/lib/supabase/admin'

export type InterviewHistoryEntry = {
    id: string
    question_id: string
    changed_by: string | null
    changed_by_name: string | null
    changed_by_email: string | null
    action_type: string
    previous_data: Record<string, unknown> | null
    new_data: Record<string, unknown> | null
    change_summary: string | null
    created_at: string
}

export async function recordInterviewQuestionHistory(input: {
    questionId: string
    actorId?: string | null
    actorName?: string | null
    actorEmail?: string | null
    actionType: string
    previousData?: Record<string, unknown> | null
    newData?: Record<string, unknown> | null
    changeSummary?: string | null
}) {
    try {
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('interview_question_history')
            .insert({
                question_id: input.questionId,
                changed_by: input.actorId || null,
                changed_by_name: input.actorName || 'Hệ thống / Quản trị viên',
                changed_by_email: input.actorEmail || null,
                action_type: input.actionType,
                previous_data: input.previousData || null,
                new_data: input.newData || null,
                change_summary: input.changeSummary || null,
                created_at: new Date().toISOString()
            })

        if (error) {
            console.warn('[Interview Audit] Could not write history log:', error.message)
        }
    } catch (err) {
        console.warn('[Interview Audit] Error logging history:', err)
    }
}
