import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminUserActivity } from '@/lib/admin-user-audit'
import { permissionsForRole } from '@/lib/admin-permissions'
import { isAdminRole } from '@/lib/admin-role'

async function requireInterviewAccessActor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isAdminRole(profile?.role)) return null
  if (profile.role === 'admin') return { user, role: profile.role }

  const { data: permissionProfile, error: permissionError } = await supabase
    .from('profiles')
    .select('admin_permissions')
    .eq('id', user.id)
    .maybeSingle()
  const storedPermissions = permissionError
    ? user.app_metadata?.admin_permissions
    : permissionProfile?.admin_permissions
  if (!permissionsForRole(profile.role, storedPermissions).includes('interview_access')) return null
  return { user, role: profile.role }
}

export async function GET() {
  const actor = await requireInterviewAccessActor()
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = createAdminClient()
  const [{ data: entitlements, error }, { data: usage }, { data: profiles }, authResult] = await Promise.all([
    admin.from('user_interview_entitlements').select('*, interview_subscription_plans(name, code)').order('created_at', { ascending: false }).limit(500),
    admin.from('interview_api_usage_logs').select('feature, provider, status, character_count, estimated_cost_usd, created_at').order('created_at', { ascending: false }).limit(1000),
    admin.from('profiles').select('id, full_name, group_name, role'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (authResult.error) return NextResponse.json({ error: authResult.error.message }, { status: 500 })

  const now = Date.now()
  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))
  const latestByUser = new Map<string, NonNullable<typeof entitlements>[number]>()
  for (const entitlement of entitlements || []) {
    if (!latestByUser.has(entitlement.user_id)) latestByUser.set(entitlement.user_id, entitlement)
  }
  const users = authResult.data.users.map((user) => {
    const profile = profileById.get(user.id)
    const entitlement = latestByUser.get(user.id)
    const isActive = Boolean(entitlement?.status === 'active' && new Date(entitlement.expires_at).getTime() > now)
    return {
      id: user.id,
      email: user.email || '',
      name: profile?.full_name || user.user_metadata?.full_name || 'Học viên',
      groupName: profile?.group_name || '',
      role: profile?.role || 'learner',
      access: entitlement ? {
        id: entitlement.id,
        active: isActive,
        source: entitlement.source,
        startsAt: entitlement.starts_at,
        expiresAt: entitlement.expires_at,
        planName: Array.isArray(entitlement.interview_subscription_plans)
          ? entitlement.interview_subscription_plans[0]?.name
          : entitlement.interview_subscription_plans?.name,
      } : null,
    }
  })
  const successfulUsage = (usage || []).filter((item) => item.status === 'success')
  return NextResponse.json({
    users,
    usage: usage || [],
    stats: {
      totalUsers: users.length,
      activeAccess: users.filter((user) => user.access?.active).length,
      internalAccess: users.filter((user) => user.access?.active && user.access.source === 'admin_internal').length,
      apiCalls: successfulUsage.length,
      characters: successfulUsage.reduce((sum, item) => sum + Number(item.character_count || 0), 0),
    },
  })
}

export async function POST(request: Request) {
  const actor = await requireInterviewAccessActor()
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { user_id, months, days, note } = await request.json()
    const normalizedDays = days == null ? Number(months ?? 1) * 30 : Number(days)
    if (!user_id || !Number.isInteger(normalizedDays) || normalizedDays < 1 || normalizedDays > 3650) {
      return NextResponse.json({ error: 'Dữ liệu kích hoạt không hợp lệ' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { data: plan } = await admin.from('interview_subscription_plans').select('id').eq('code', 'INTERVIEW_30D').single()
    if (!plan) return NextResponse.json({ error: 'Chưa cấu hình gói 30 ngày' }, { status: 409 })
    const { data, error } = await admin.rpc('grant_interview_access', {
      p_user_id: user_id,
      p_plan_id: plan.id,
      p_days: normalizedDays,
      p_source: 'admin_internal',
      p_performed_by: actor.user.id,
      p_notes: note || `Admin cấp thêm ${normalizedDays} ngày`,
    })
    if (error) throw error
    await recordAdminUserActivity({
      targetUserId: user_id,
      actor: actor.user,
      actorRole: actor.role,
      action: 'interview_access_granted',
      label: `Kích hoạt/gia hạn gói Vòng 2 thêm ${normalizedDays} ngày`,
      details: { days: normalizedDays, note: note || null },
    })
    return NextResponse.json({ success: true, entitlement: data })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể kích hoạt' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const actor = await requireInterviewAccessActor()
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { user_ids, months, days, note } = await request.json()
    const normalizedDays = days == null ? Number(months ?? 1) * 30 : Number(days)
    const uniqueUserIds = Array.from(new Set(Array.isArray(user_ids) ? user_ids.filter((id): id is string => typeof id === 'string' && id.length > 0) : []))

    if (uniqueUserIds.length === 0 || uniqueUserIds.length > 1000 || !Number.isInteger(normalizedDays) || normalizedDays < 1 || normalizedDays > 3650) {
      return NextResponse.json({ error: 'Danh sách học viên hoặc thời hạn không hợp lệ' }, { status: 400 })
    }

    const admin = createAdminClient()
    const [{ data: plan }, { data: profiles, error: profileError }] = await Promise.all([
      admin.from('interview_subscription_plans').select('id').eq('code', 'INTERVIEW_30D').single(),
      admin.from('profiles').select('id, role').in('id', uniqueUserIds),
    ])
    if (!plan) return NextResponse.json({ error: 'Chưa cấu hình gói 30 ngày' }, { status: 409 })
    if (profileError) throw profileError

    const learnerIds = (profiles || []).filter((profile) => profile.role === 'learner').map((profile) => profile.id)
    const entitlements: unknown[] = []
    const errors: Array<{ userId: string; message: string }> = []

    for (let index = 0; index < learnerIds.length; index += 10) {
      const batch = learnerIds.slice(index, index + 10)
      const results = await Promise.all(batch.map(async (userId) => {
        const { data, error } = await admin.rpc('grant_interview_access', {
          p_user_id: userId,
          p_plan_id: plan.id,
          p_days: normalizedDays,
          p_source: 'admin_internal',
          p_performed_by: actor.user.id,
          p_notes: note || `Admin cấp thêm hàng loạt ${normalizedDays} ngày`,
        })
        return { userId, data, error }
      }))

      for (const result of results) {
        if (result.error) errors.push({ userId: result.userId, message: result.error.message })
        else {
          entitlements.push(result.data)
          await recordAdminUserActivity({
            targetUserId: result.userId,
            actor: actor.user,
            actorRole: actor.role,
            action: 'interview_access_granted',
            label: `Kích hoạt/gia hạn gói Vòng 2 thêm ${normalizedDays} ngày`,
            details: { days: normalizedDays, bulk: true, note: note || null },
          })
        }
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      successCount: entitlements.length,
      skippedCount: uniqueUserIds.length - learnerIds.length,
      errorCount: errors.length,
      entitlements,
      errors,
    }, { status: errors.length === learnerIds.length && learnerIds.length > 0 ? 500 : 200 })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể kích hoạt hàng loạt' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const actor = await requireInterviewAccessActor()
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { user_id, action, expires_at, note } = await request.json()
    if (!user_id || !['revoke', 'set_expiry'].includes(action)) {
      return NextResponse.json({ error: 'Yêu cầu điều chỉnh không hợp lệ' }, { status: 400 })
    }

    const admin = createAdminClient()
    const now = new Date()
    const targetExpiry = action === 'set_expiry' ? new Date(expires_at) : null
    if (targetExpiry && (!Number.isFinite(targetExpiry.getTime()) || targetExpiry <= now)) {
      return NextResponse.json({ error: 'Ngày hết hạn mới phải sau thời điểm hiện tại' }, { status: 400 })
    }
    const { data: activeRows, error: activeError } = await admin
      .from('user_interview_entitlements')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .gt('expires_at', now.toISOString())
      .order('expires_at', { ascending: false })
    if (activeError) throw activeError

    const current = activeRows?.[0]
    const previousExpiry = current?.expires_at ?? null
    if (activeRows?.length) {
      const { error: revokeError } = await admin
        .from('user_interview_entitlements')
        .update({ status: 'revoked', updated_at: now.toISOString() })
        .in('id', activeRows.map((row) => row.id))
      if (revokeError) throw revokeError
    }

    if (action === 'revoke') {
      const { error: historyError } = await admin.from('interview_entitlement_history').insert({
        entitlement_id: current?.id ?? null,
        user_id,
        action: 'revoke',
        source: 'admin_internal',
        days: 0,
        previous_expires_at: previousExpiry,
        new_expires_at: now.toISOString(),
        performed_by: actor.user.id,
        metadata: { note: note || 'Admin hủy quyền truy cập' },
      })
      if (historyError) throw historyError
      await recordAdminUserActivity({
        targetUserId: user_id,
        actor: actor.user,
        actorRole: actor.role,
        action: 'interview_access_revoked',
        label: 'Hủy quyền truy cập gói Vòng 2',
        details: { note: note || null },
      })
      return NextResponse.json({ success: true, entitlement: null })
    }

    if (!targetExpiry) return NextResponse.json({ error: 'Thiếu ngày hết hạn mới' }, { status: 400 })
    const { data: plan } = await admin.from('interview_subscription_plans').select('id').eq('code', 'INTERVIEW_30D').single()
    const { data: entitlement, error: insertError } = await admin
      .from('user_interview_entitlements')
      .insert({
        user_id,
        plan_id: current?.plan_id ?? plan?.id ?? null,
        starts_at: now.toISOString(),
        expires_at: targetExpiry.toISOString(),
        status: 'active',
        source: 'admin_internal',
        granted_by: actor.user.id,
        notes: note || 'Admin đặt lại ngày hết hạn',
      })
      .select('*')
      .single()
    if (insertError) throw insertError

    const changedDays = previousExpiry
      ? Math.ceil((targetExpiry.getTime() - new Date(previousExpiry).getTime()) / 86_400_000)
      : Math.ceil((targetExpiry.getTime() - now.getTime()) / 86_400_000)
    const { error: historyError } = await admin.from('interview_entitlement_history').insert({
      entitlement_id: entitlement.id,
      user_id,
      action: 'set_expiry',
      source: 'admin_internal',
      days: changedDays,
      previous_expires_at: previousExpiry,
      new_expires_at: targetExpiry.toISOString(),
      performed_by: actor.user.id,
      metadata: { note: note || 'Admin đặt lại ngày hết hạn' },
    })
    if (historyError) throw historyError

    await recordAdminUserActivity({
      targetUserId: user_id,
      actor: actor.user,
      actorRole: actor.role,
      action: 'interview_expiry_changed',
      label: `Đổi hạn gói Vòng 2 đến ${targetExpiry.toLocaleDateString('vi-VN')}`,
      details: { expiresAt: targetExpiry.toISOString(), note: note || null },
    })

    return NextResponse.json({ success: true, entitlement })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể điều chỉnh quyền truy cập' }, { status: 500 })
  }
}
