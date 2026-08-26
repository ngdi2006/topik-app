import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export const ADMIN_ROLES = ['admin', 'teacher', 'supporter'] as const

export function isAdminRole(role: unknown): role is (typeof ADMIN_ROLES)[number] {
    return typeof role === 'string' && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
}

async function readProfileRole(client: SupabaseClient, userId: string): Promise<string | null> {
    const { data, error } = await client
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

    if (error) return null
    return typeof data?.role === 'string' ? data.role : null
}

export async function getTrustedUserRole(
    user: User,
    sessionClient?: SupabaseClient
): Promise<string | null> {
    const metadataRole = user.app_metadata?.role
    if (isAdminRole(metadataRole)) return metadataRole

    // Fast path for middleware: read the signed-in user's own profile through RLS.
    if (sessionClient) {
        const role = await readProfileRole(sessionClient, user.id)
        if (role) return role
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            const role = await readProfileRole(createAdminClient(), user.id)
            if (role) return role
        } catch (error) {
            console.error('[Auth] Service-role profile lookup failed:', error)
        }
    }

    return null
}
