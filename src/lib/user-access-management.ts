import type { SupabaseClient, User } from '@supabase/supabase-js'
import { permissionsForRole } from './admin-permissions'

export function canManageLearnerAccess(role: string | null | undefined, permissions: unknown, allowTeacher = false) {
    return role === 'admin' || ((role === 'supporter' || (allowTeacher && role === 'teacher')) && permissionsForRole(role, permissions).includes('users'))
}

export function canManageInterviewFromUsers(role: string | null | undefined, permissions: unknown, path: string, method: string) {
    return role === 'supporter' && canManageLearnerAccess(role, permissions)
        && path.replace(/\/+$/, '') === '/api/admin/interview-access'
        && ['POST', 'PUT', 'PATCH'].includes(method)
}

export async function userAccessManagementRole(db: SupabaseClient, user: User, allowTeacher = false): Promise<string | null> {
    const { data, error } = await db.from('profiles').select('role,admin_permissions').eq('id', user.id).maybeSingle()
    if (error || !canManageLearnerAccess(data?.role, data?.admin_permissions, allowTeacher)) return null
    return data!.role
}
