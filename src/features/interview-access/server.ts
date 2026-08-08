import 'server-only'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { INTERVIEW_FREE_LIMITS, type InterviewAccessSnapshot } from './model'

type EntitlementRow = {
    source: 'sepay' | 'admin_internal' | 'promotion'
    expires_at: string
    interview_subscription_plans: { daily_ai_limit: number } | null
}

export async function getInterviewAccess(
    supabase: SupabaseClient,
    user: User | null,
): Promise<InterviewAccessSnapshot> {
    const free: InterviewAccessSnapshot = {
        authenticated: Boolean(user),
        hasFullAccess: false,
        source: 'free',
        expiresAt: null,
        daysRemaining: 0,
        deviceLimit: 2,
        ai: { used: 0, limit: 0, remaining: 0 },
        freeLimits: INTERVIEW_FREE_LIMITS,
    }
    if (!user) return free

    const now = new Date()
    const [{ data: entitlement }, { data: usage }] = await Promise.all([
        supabase
            .from('user_interview_entitlements')
            .select('source, expires_at, interview_subscription_plans(daily_ai_limit)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('expires_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .from('interview_ai_daily_usage')
            .select('used_count')
            .eq('user_id', user.id)
            .eq('usage_date', new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now))
            .maybeSingle(),
    ])

    const row = entitlement as unknown as EntitlementRow | null
    if (!row) return free
    const remainingMs = new Date(row.expires_at).getTime() - now.getTime()
    const hasFullAccess = remainingMs > 0
    const limit = hasFullAccess ? row.interview_subscription_plans?.daily_ai_limit ?? 10 : 0
    const used = Number(usage?.used_count || 0)
    return {
        ...free,
        hasFullAccess,
        source: row.source,
        expiresAt: row.expires_at,
        daysRemaining: hasFullAccess ? Math.max(1, Math.ceil(remainingMs / 86_400_000)) : 0,
        deviceLimit: row.source === 'admin_internal' ? 1 : 2,
        ai: { used, limit, remaining: Math.max(0, limit - used) },
    }
}

export async function consumeInterviewAiQuota(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase.rpc('consume_interview_ai_quota', {
        p_user_id: userId,
        p_amount: 1,
    })
    if (error) throw error
    const result = Array.isArray(data) ? data[0] : data
    return {
        allowed: Boolean(result?.allowed),
        used: Number(result?.used || 0),
        limit: Number(result?.daily_limit || 0),
    }
}
