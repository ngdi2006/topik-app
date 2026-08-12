import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export const ADMIN_ROLES = ['admin', 'teacher'] as const

export function isAdminRole(role: unknown): role is (typeof ADMIN_ROLES)[number] {
    return typeof role === 'string' && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
}

export async function getTrustedUserRole(user: User): Promise<string | null> {
    const metadataRole = user.app_metadata?.role
    if (isAdminRole(metadataRole)) return metadataRole

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null

    const admin = createAdminClient()
    const { data, error } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (error) {
        console.error('[Auth] Cannot resolve trusted profile role:', error.message)
        return null
    }

    return typeof data?.role === 'string' ? data.role : null
}
