import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { recordAdminUserActivity } from '@/lib/admin-user-audit'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await context.params
        const userId = resolvedParams.id
        const body = await request.json()
        const { role } = body

        if (!['admin', 'learner', 'teacher', 'supporter'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        // 1. Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Check Admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 2. Perform role update via Admin API
        const adminAuthClient = createAdminClient()
        // Here we just update the public profile table bypassing RLS
        const { error } = await adminAuthClient.from('profiles').update({ role }).eq('id', userId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const { data: authTarget } = await adminAuthClient.auth.admin.getUserById(userId)
        const { error: metadataError } = await adminAuthClient.auth.admin.updateUserById(userId, {
            app_metadata: { ...authTarget.user?.app_metadata, role }
        })

        if (metadataError) {
            return NextResponse.json({ error: metadataError.message }, { status: 500 })
        }

        await recordAdminUserActivity({
            targetUserId: userId,
            actor: user,
            actorRole: profile.role,
            action: 'role_changed',
            label: `Đổi vai trò thành ${role}`,
            details: { role },
        })

        return NextResponse.json({ success: true, newRole: role }, { status: 200 })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
