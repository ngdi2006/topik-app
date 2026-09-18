import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const snapshot = await request.json().catch(() => null)
  if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.topics) || !Array.isArray(snapshot.exams)) {
    return NextResponse.json({ error: 'Invalid progress snapshot' }, { status: 400 })
  }

  const compactSnapshot = {
    version: 1,
    updatedAt: new Date().toISOString(),
    recentActivity: snapshot.recentActivity || null,
    topics: snapshot.topics.slice(0, 8).map((topic: Record<string, unknown>) => ({
      topicId: String(topic.topicId || '').slice(0, 40),
      attempted: Math.max(0, Number(topic.attempted) || 0),
      mastered: Math.max(0, Number(topic.mastered) || 0),
      incorrect: Math.max(0, Number(topic.incorrect) || 0),
      lastSeenAt: typeof topic.lastSeenAt === 'string' ? topic.lastSeenAt : null,
    })),
    exams: snapshot.exams.slice(0, 20).map((exam: Record<string, unknown>) => ({
      id: String(exam.id || '').slice(0, 80),
      industry: String(exam.industry || '').slice(0, 80),
      score: Number(exam.score) || 0,
      totalScore: Number(exam.totalScore) || 0,
      passed: Boolean(exam.passed),
      correctCount: Math.max(0, Number(exam.correctCount) || 0),
      incorrectCount: Math.max(0, Number(exam.incorrectCount) || 0),
      completedAt: typeof exam.completedAt === 'string' ? exam.completedAt : new Date().toISOString(),
    })),
  }

  const admin = createAdminClient()
  const { data: authUser } = await admin.auth.admin.getUserById(user.id)
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...(authUser.user?.user_metadata || {}), interview_progress_snapshot: compactSnapshot },
  })
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}
