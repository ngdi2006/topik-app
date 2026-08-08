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

export async function GET() {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await createAdminClient()
    .from('interview_subscription_plans')
    .select('id, code, name, duration_days, price_vnd, is_active, display_order, created_at, updated_at')
    .order('display_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [] })
}

export async function POST(request: Request) {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    const durationDays = Number(body.duration_days)
    const priceVnd = Number(body.price_vnd)
    const displayOrder = Number(body.display_order || 0)
    if (!name || !Number.isInteger(durationDays) || durationDays < 1 || !Number.isInteger(priceVnd) || priceVnd < 0) {
      return NextResponse.json({ error: 'Tên gói, thời hạn hoặc giá không hợp lệ' }, { status: 400 })
    }
    const code = `INTERVIEW_${durationDays}D_${Date.now().toString(36).toUpperCase()}`
    const { data, error } = await createAdminClient().from('interview_subscription_plans').insert({
      code,
      name,
      duration_days: durationDays,
      price_vnd: priceVnd,
      daily_ai_limit: 10,
      display_order: displayOrder,
      is_active: body.is_active !== false,
      updated_at: new Date().toISOString(),
    }).select().single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tạo gói' }, { status: 500 })
  }
}
