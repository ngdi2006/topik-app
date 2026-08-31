import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const bodySchema = z.object({ page: z.number().int().positive(), totalPages: z.number().int().positive() })

export async function POST(request: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid progress" }, { status: 400 })
  const { bookId } = await context.params
  const { page, totalPages } = parsed.data
  const { error } = await supabase.from("user_textbook_progress").upsert({
    user_id: user.id,
    textbook_id: bookId,
    last_page: page,
    progress_percent: Math.min(100, Number(((page / totalPages) * 100).toFixed(2))),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,textbook_id" })
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}
