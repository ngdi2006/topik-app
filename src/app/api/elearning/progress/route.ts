import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body?.stepId || !['in_progress', 'completed', 'needs_review'].includes(body.status)) return NextResponse.json({ error: 'Dữ liệu tiến độ không hợp lệ' }, { status: 400 })
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data: step } = await admin.from('elearning_steps').select('id,lesson_id,sort_order,elearning_lessons(course_id)').eq('id', body.stepId).single()
  if (!step) return NextResponse.json({ error: 'Không tìm thấy bước học' }, { status: 404 })
  const { error } = await admin.from('elearning_step_progress').upsert({
    user_id: user.id, step_id: step.id, status: body.status,
    progress_percent: body.status === 'completed' ? 100 : Math.max(0, Math.min(99, Number(body.progressPercent) || 1)),
    score: body.score == null ? null : Number(body.score), watched_seconds: Math.max(0, Number(body.watchedSeconds) || 0),
    started_at: now, completed_at: body.status === 'completed' ? now : null, last_accessed_at: now,
  }, { onConflict: 'user_id,step_id' })
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}
