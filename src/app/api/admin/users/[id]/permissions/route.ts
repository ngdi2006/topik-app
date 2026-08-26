import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sanitizeAdminPermissions } from '@/lib/admin-permissions'
import { recordAdminUserActivity } from '@/lib/admin-user-audit'

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (currentProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const permissions = sanitizeAdminPermissions(body.permissions)
    const admin = createAdminClient()
    const { data: target } = await admin.from('profiles').select('role').eq('id', id).single()
    if (!target || !['teacher', 'supporter'].includes(target.role)) {
        return NextResponse.json({ error: 'Chỉ có thể cấu hình quyền cho teacher hoặc supporter.' }, { status: 400 })
    }

    const { data: authTarget, error: authLookupError } = await admin.auth.admin.getUserById(id)
    if (authLookupError || !authTarget.user) {
        return NextResponse.json({ error: authLookupError?.message || 'Không tìm thấy tài khoản.' }, { status: 404 })
    }

    // Keep a secure Auth metadata copy so permissions work even before the
    // optional profiles.admin_permissions migration has been applied.
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(id, {
        app_metadata: {
            ...authTarget.user.app_metadata,
            admin_permissions: permissions,
        },
    })
    if (authUpdateError) return NextResponse.json({ error: authUpdateError.message }, { status: 500 })

    const { error: profileUpdateError } = await admin
        .from('profiles')
        .update({ admin_permissions: permissions })
        .eq('id', id)

    if (profileUpdateError && !profileUpdateError.message.includes('admin_permissions')) {
        return NextResponse.json({ error: profileUpdateError.message }, { status: 500 })
    }
    await recordAdminUserActivity({
        targetUserId: id,
        actor: user,
        actorRole: currentProfile.role,
        action: 'permissions_changed',
        label: `Cập nhật ${permissions.length} chỉ mục quản trị`,
        details: { permissions },
    })
    return NextResponse.json({ success: true, permissions })
}
