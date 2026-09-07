import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const reviewSchema = z.object({
  vocabularyId: z.string().uuid(),
  result: z.enum(["again", "hard", "good", "easy"]),
  mode: z.enum(["flashcard", "listening", "quiz", "spelling"]),
})

const intervals = {
  again: { days: 0, ease: -0.2 },
  hard: { days: 1, ease: -0.1 },
  good: { days: 3, ease: 0 },
  easy: { days: 7, ease: 0.15 },
} as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu luyện tập không hợp lệ" }, { status: 400 })

  const { vocabularyId, result, mode } = parsed.data
  const { data: current } = await supabase.from("user_vocabulary_progress")
    .select("ease_factor,interval_days,correct_count,incorrect_count,streak")
    .eq("user_id", user.id).eq("vocabulary_id", vocabularyId).maybeSingle()

  const rating = intervals[result]
  const previousInterval = Number(current?.interval_days ?? 0)
  const intervalDays = result === "again" ? 0 : Math.max(rating.days, Math.round(previousInterval * Number(current?.ease_factor ?? 2.5)))
  const dueAt = new Date(Date.now() + (result === "again" ? 10 / 1440 : intervalDays) * 86_400_000)
  const correct = result !== "again"
  const streak = correct ? Number(current?.streak ?? 0) + 1 : 0
  const learningState = !correct ? "relearning" : streak >= 3 && intervalDays >= 7 ? "mastered" : intervalDays > 1 ? "review" : "learning"

  const { data, error } = await supabase.from("user_vocabulary_progress").upsert({
    user_id: user.id,
    vocabulary_id: vocabularyId,
    learning_state: learningState,
    ease_factor: Math.min(3.2, Math.max(1.3, Number(current?.ease_factor ?? 2.5) + rating.ease)),
    interval_days: intervalDays,
    due_at: dueAt.toISOString(),
    correct_count: Number(current?.correct_count ?? 0) + (correct ? 1 : 0),
    incorrect_count: Number(current?.incorrect_count ?? 0) + (correct ? 0 : 1),
    streak,
    last_mode: mode,
    last_reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,vocabulary_id" }).select("learning_state,due_at,correct_count,incorrect_count").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ progress: data })
}
