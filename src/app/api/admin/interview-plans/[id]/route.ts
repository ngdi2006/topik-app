import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const [{ id }, body] = await Promise.all([params, request.json()])
    const name = String(body.name || '').trim()
    const durationDays = Number(body.duration_days)
    const priceVnd = Number(body.price_vnd)
    const displayOrder = Number(body.display_order || 0)
    if (!name || !Number.isInteger(durationDays) || durationDays < 1 || !Number.isInteger(priceVnd) || priceVnd < 0) {
      return NextResponse.json({ error: 'Tên gói, thời hạn hoặc giá không hợp lệ' }, { status: 400 })
    }
    const { data, error } = await createAdminClient().from('interview_subscription_plans').update({
      name,
      duration_days: durationDays,
      price_vnd: priceVnd,
      display_order: displayOrder,
      is_active: body.is_active !== false,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể cập nhật gói' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { id } = await params
    const admin = createAdminClient()
    const { count, error: countError } = await admin
      .from('user_interview_entitlements')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', id)
    if (countError) throw countError
    if ((count || 0) > 0) {
      return NextResponse.json({ error: 'Gói đã có người sử dụng. Hãy chuyển trạng thái sang Ẩn để giữ lịch sử.' }, { status: 409 })
    }
    const { error } = await admin.from('interview_subscription_plans').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể xóa gói' }, { status: 500 })
  }
}
