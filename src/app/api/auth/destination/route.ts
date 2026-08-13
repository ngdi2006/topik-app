import { NextRequest, NextResponse } from 'next/server'
import { getTrustedUserRole, isAdminRole } from '@/lib/admin-role'
import { sanitizeNextPath } from '@/lib/auth-flow'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestedPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'))
    const role = await getTrustedUserRole(user, supabase)
    const hasAdminAccess = isAdminRole(role)

    let destination = requestedPath
    if (requestedPath.startsWith('/admin') && !hasAdminAccess) destination = '/dashboard'

    return NextResponse.json({ destination, role })
}
