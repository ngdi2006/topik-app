import 'server-only'

import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { permissionsForRole, type AdminPermissionKey } from '@/lib/admin-permissions'
import { isAdminRole } from '@/lib/admin-role'
import { createClient } from '@/lib/supabase/server'

type AdminApiAuthResult =
    | { user: User; error: null }
    | { user: null; error: NextResponse }

export async function requireAdminApiPermission(permission: AdminPermissionKey): Promise<AdminApiAuthResult> {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, admin_permissions')
        .eq('id', user.id)
        .maybeSingle()

    const role = profile?.role
    if (profileError || !profile || !isAdminRole(role)) {
        return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    const permissions = permissionsForRole(role, profile.admin_permissions)
    if (!permissions.includes(permission)) {
        return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    return { user, error: null }
}
