import { userAccessManagementRole } from '@/lib/user-access-management'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type CreditAction = 'add' | 'deduct'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const userIds = body.userIds as string[]
        const credits = Number(body.credits)
        const action: CreditAction = body.action === 'deduct' ? 'deduct' : 'add'

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'Chưa chọn người dùng nào' }, { status: 400 })
        }

        if (!Number.isInteger(credits) || credits <= 0) {
            return NextResponse.json({ error: 'Số lượt điều chỉnh phải là số nguyên dương' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const actorRole = await userAccessManagementRole(supabase, user, true)
        if (!actorRole) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const adminClient = createAdminClient()
        if (actorRole === 'supporter') {
            const targets = await adminClient.from('profiles').select('id,role').in('id', [...new Set(userIds)])
            if (targets.error || targets.data?.length !== new Set(userIds).size || targets.data.some(target => target.role !== 'learner')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        
        let successCount = 0
        const errors = []

        for (const userId of userIds) {
            const { error: creditError } = action === 'add'
                ? await adminClient.rpc('increment_user_credits', {
                    p_user_id: userId,
                    p_credits: credits,
                })
                : await adminClient.rpc('deduct_user_credits', {
                    p_user_id: userId,
                    p_credits: credits,
                })

            if (creditError) {
                errors.push({ userId, error: creditError.message })
            } else {
                successCount++
            }
        }

        return NextResponse.json({
            success: true,
            successCount,
            errors,
            action,
            message: `Đã ${action === 'add' ? 'cộng' : 'trừ'} ${credits} lượt cho ${successCount} người dùng`
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
