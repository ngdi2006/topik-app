import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function authorize() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin' || data?.role === 'teacher'
}

export async function GET() {
  if (!await authorize()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await createAdminClient().from('elearning_courses')
    .select('id,slug,title,description,is_published,sequential_learning,elearning_lessons(id,lesson_number,title,description,estimated_minutes,pass_percent,sort_order,is_published,elearning_steps(id,step_type,title,instructions,youtube_url,required_watch_percent,sort_order,is_required,is_published))')
    .eq('slug', 'giao-trinh-quyen-1').single()
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ course: data })
}

export async function PATCH(request: Request) {
  if (!await authorize()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body?.stepId) return NextResponse.json({ error: 'Thiếu bước học' }, { status: 400 })
  const payload = {
    youtube_url: String(body.youtubeUrl || '').trim() || null,
    instructions: String(body.instructions || '').trim() || null,
    required_watch_percent: Math.max(0, Math.min(100, Number(body.requiredWatchPercent) || 85)),
    is_required: body.isRequired !== false,
    is_published: body.isPublished !== false,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await createAdminClient().from('elearning_steps').update(payload).eq('id', body.stepId).select().single()
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ step: data })
}
