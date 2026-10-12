import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function authorized() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin' || data?.role === 'teacher'
}

function payload(body: Record<string, unknown>) {
  const type = ['single_choice', 'true_false', 'info'].includes(String(body.interactionType)) ? String(body.interactionType) : 'single_choice'
  const options = type === 'true_false' ? ['Đúng', 'Sai'] : type === 'info' ? [] : (Array.isArray(body.options) ? body.options : []).map(String).map(value => value.trim()).filter(Boolean)
  return {
    step_id: String(body.stepId), timestamp_seconds: Math.max(0, Math.round(Number(body.timestampSeconds) || 0)),
    interaction_type: type, title: String(body.title || '').trim(), prompt: String(body.prompt || '').trim(),
    options, correct_answer: type === 'info' ? null : String(body.correctAnswer || ''), explanation: String(body.explanation || '').trim() || null,
    is_required: body.isRequired !== false, points: Math.max(0, Math.round(Number(body.points) || 1)), is_published: body.isPublished !== false,
    updated_at: new Date().toISOString(),
  }
}

export async function GET(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const stepId = new URL(request.url).searchParams.get('stepId')
  if (!stepId) return NextResponse.json({ interactions: [] })
  const { data, error } = await createAdminClient().from('elearning_video_interactions').select('*').eq('step_id', stepId).order('timestamp_seconds').order('sort_order')
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ interactions: data || [] })
}

export async function POST(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body?.stepId || !String(body.title || '').trim() || !String(body.prompt || '').trim()) return NextResponse.json({ error: 'Thiếu nội dung tương tác' }, { status: 400 })
  const { data, error } = await createAdminClient().from('elearning_video_interactions').insert(payload(body)).select().single()
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ interaction: data })
}

export async function PATCH(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body?.id || !body.stepId) return NextResponse.json({ error: 'Thiếu tương tác' }, { status: 400 })
  const { step_id: _stepId, ...updates } = payload(body)
  void _stepId
  const { data, error } = await createAdminClient().from('elearning_video_interactions').update(updates).eq('id', body.id).select().single()
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ interaction: data })
}

export async function DELETE(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu tương tác' }, { status: 400 })
  const { error } = await createAdminClient().from('elearning_video_interactions').delete().eq('id', id)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}
