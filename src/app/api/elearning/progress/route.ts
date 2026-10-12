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
  const [{ data: step }, { data: existing }] = await Promise.all([
    admin.from('elearning_steps').select('id,step_type,required_watch_percent,is_published').eq('id', body.stepId).single(),
    admin.from('elearning_step_progress').select('status,watched_seconds,started_at,completed_at,metadata').eq('user_id', user.id).eq('step_id', body.stepId).maybeSingle(),
  ])
  if (!step?.is_published) return NextResponse.json({ error: 'Không tìm thấy bước học' }, { status: 404 })

  const existingMetadata = (existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}) as Record<string, unknown>
  const requestedWatchedSeconds = Math.max(0, Number(body.watchedSeconds) || 0)
  const watchedSeconds = Math.max(Number(existing?.watched_seconds) || 0, requestedWatchedSeconds)
  const requestedDuration = Math.max(0, Number(body.videoDurationSeconds) || 0)
  const durationSeconds = requestedDuration || Math.max(0, Number(existingMetadata.video_duration_seconds) || 0)

  const isVideoStep = step.step_type === 'video' || step.step_type === 'culture_video'
  if (isVideoStep && body.status === 'completed' && existing?.status !== 'completed') {
    if (!durationSeconds) return NextResponse.json({ error: 'Chưa xác định được thời lượng video. Vui lòng phát video trước.' }, { status: 400 })
    const requiredSeconds = Math.ceil(durationSeconds * step.required_watch_percent / 100)
    if (watchedSeconds < requiredSeconds) return NextResponse.json({ error: `Bạn cần xem ít nhất ${step.required_watch_percent}% video trước khi tiếp tục.` }, { status: 400 })
    const { data: requiredInteractions } = await admin.from('elearning_video_interactions').select('id').eq('step_id', step.id).eq('is_published', true).eq('is_required', true)
    const requiredIds = (requiredInteractions || []).map(item => item.id)
    if (requiredIds.length) {
      const { data: answered } = await admin.from('elearning_video_interaction_progress').select('interaction_id').eq('user_id', user.id).in('interaction_id', requiredIds)
      const answeredIds = new Set((answered || []).map(item => item.interaction_id))
      if (requiredIds.some(id => !answeredIds.has(id))) return NextResponse.json({ error: 'Bạn cần hoàn thành tất cả câu hỏi bắt buộc trong video.' }, { status: 400 })
    }
  }

  const now = new Date().toISOString()
  const calculatedVideoPercent = durationSeconds ? Math.min(99, Math.round(watchedSeconds / durationSeconds * 100)) : 0
  const progressPercent = body.status === 'completed' ? 100 : isVideoStep
    ? calculatedVideoPercent
    : Math.max(0, Math.min(99, Number(body.progressPercent) || 1))
  const { error } = await admin.from('elearning_step_progress').upsert({
    user_id: user.id,
    step_id: step.id,
    status: body.status,
    progress_percent: progressPercent,
    score: body.score == null ? null : Number(body.score),
    watched_seconds: watchedSeconds,
    started_at: existing?.started_at || now,
    completed_at: body.status === 'completed' ? existing?.completed_at || now : null,
    last_accessed_at: now,
    metadata: { ...existingMetadata, ...(durationSeconds ? { video_duration_seconds: durationSeconds } : {}) },
  }, { onConflict: 'user_id,step_id' })
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true, progressPercent, watchedSeconds })
}
