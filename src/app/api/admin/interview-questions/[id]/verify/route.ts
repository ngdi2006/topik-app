import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { recordInterviewQuestionHistory } from '@/lib/interview-audit'

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error'
}

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const targetStatus = body.status === 'verified' ? 'verified' : 'pending'

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        let actorName = 'Giáo viên'
        let actorEmail = user?.email || null

        const adminClient = createAdminClient()
        if (user) {
            const { data: profile } = await adminClient
                .from('profiles')
                .select('full_name, email, role')
                .eq('id', user.id)
                .maybeSingle()
            if (profile?.full_name) actorName = profile.full_name
            if (profile?.email) actorEmail = profile.email
        }

        const { data: oldQuestion } = await adminClient
            .from('interview_questions')
            .select('review_status, order_index, question_text')
            .eq('id', id)
            .maybeSingle()

        const { data, error } = await adminClient
            .from('interview_questions')
            .update({
                review_status: targetStatus,
                reviewed_by: targetStatus === 'verified' ? user?.id || null : null,
                reviewed_at: targetStatus === 'verified' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        await recordInterviewQuestionHistory({
            questionId: id,
            actorId: user?.id,
            actorName,
            actorEmail,
            actionType: targetStatus === 'verified' ? 'mark_verified' : 'mark_pending',
            previousData: { review_status: oldQuestion?.review_status || 'pending' },
            newData: { review_status: targetStatus },
            changeSummary: targetStatus === 'verified' 
                ? `Đánh dấu "Đã kiểm tra / Đã duyệt"` 
                : `Hủy trạng thái duyệt, chuyển về "Chờ duyệt"`
        })

        return NextResponse.json({ success: true, data })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}
