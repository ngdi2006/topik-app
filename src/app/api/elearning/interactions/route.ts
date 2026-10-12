import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body?.interactionId) return NextResponse.json({ error: 'Thiếu câu hỏi' }, { status: 400 })
  const admin = createAdminClient()
  const { data: interaction } = await admin.from('elearning_video_interactions').select('id,interaction_type,correct_answer,points,is_published').eq('id', body.interactionId).single()
  if (!interaction?.is_published) return NextResponse.json({ error: 'Không tìm thấy câu hỏi' }, { status: 404 })
  const answer = interaction.interaction_type === 'info' ? 'acknowledged' : String(body.answer || '')
  const isCorrect = interaction.interaction_type === 'info' ? true : answer === String(interaction.correct_answer || '')
  const { data: existing } = await admin.from('elearning_video_interaction_progress').select('attempt_count').eq('user_id', user.id).eq('interaction_id', interaction.id).maybeSingle()
  const { error } = await admin.from('elearning_video_interaction_progress').upsert({ user_id: user.id, interaction_id: interaction.id, answer, is_correct: isCorrect, score: isCorrect ? interaction.points : 0, attempt_count: (existing?.attempt_count || 0) + 1, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'user_id,interaction_id' })
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ isCorrect, explanationAvailable: true })
}
