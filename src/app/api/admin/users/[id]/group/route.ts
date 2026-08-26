import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { recordAdminUserActivity } from '@/lib/admin-user-audit'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await context.params
        const userId = resolvedParams.id
        const body = await request.json()
        const { groupName } = body

        // 1. Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Check Admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'teacher', 'supporter'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 2. Perform group update via Admin API
        const adminAuthClient = createAdminClient()
        // Here we update the public profile table bypassing RLS
        const { error } = await adminAuthClient.from('profiles').update({ group_name: groupName }).eq('id', userId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        await recordAdminUserActivity({
            targetUserId: userId,
            actor: user,
            actorRole: profile.role,
            action: 'group_changed',
            label: groupName ? `Đổi nhóm/lớp thành ${groupName}` : 'Xóa nhóm/lớp',
            details: { groupName: groupName || null },
        })

        return NextResponse.json({ success: true, newGroup: groupName }, { status: 200 })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
