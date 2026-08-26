import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminUserAuditEntry = {
    id: string
    action: string
    label: string
    actorId: string
    actorEmail: string | null
    actorName: string | null
    actorRole: string
    createdAt: string
    details?: Record<string, unknown>
}

const MAX_AUDIT_ENTRIES = 30

export async function recordAdminUserActivity(input: {
    targetUserId: string
    actor: User
    actorRole: string
    action: string
    label: string
    details?: Record<string, unknown>
}) {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.getUserById(input.targetUserId)
    if (error || !data.user) return

    const current = Array.isArray(data.user.app_metadata?.admin_user_audit)
        ? data.user.app_metadata.admin_user_audit as AdminUserAuditEntry[]
        : []
    const entry: AdminUserAuditEntry = {
        id: crypto.randomUUID(),
        action: input.action,
        label: input.label,
        actorId: input.actor.id,
        actorEmail: input.actor.email || null,
        actorName: typeof input.actor.user_metadata?.full_name === 'string'
            ? input.actor.user_metadata.full_name
            : null,
        actorRole: input.actorRole,
        createdAt: new Date().toISOString(),
        details: input.details,
    }

    await admin.auth.admin.updateUserById(input.targetUserId, {
        app_metadata: {
            ...data.user.app_metadata,
            admin_user_audit: [entry, ...current].slice(0, MAX_AUDIT_ENTRIES),
        },
    })
}

