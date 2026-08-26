import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permissionsForRole } from '@/lib/admin-permissions'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Read the role first. Admin access must not depend on the optional
    // per-user permissions column used by teacher/supporter accounts.
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (error || !profile || !['admin', 'teacher', 'supporter'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (profile.role === 'admin') {
        return NextResponse.json({
            role: profile.role,
            permissions: permissionsForRole(profile.role, null),
        })
    }

    const { data: permissionProfile, error: permissionError } = await supabase
        .from('profiles')
        .select('admin_permissions')
        .eq('id', user.id)
        .single()

    return NextResponse.json({
        role: profile.role,
        permissions: permissionsForRole(
            profile.role,
            permissionError ? user.app_metadata?.admin_permissions : permissionProfile?.admin_permissions,
        ),
    })
}
