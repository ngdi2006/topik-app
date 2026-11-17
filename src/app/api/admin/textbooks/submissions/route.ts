import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canPreviewTextbooks } from "@/lib/textbooks/access"
import { isWorkbookReviewer, submissionTotal, type WorkbookSubmission } from "@/lib/textbooks/submissions"

const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } })
async function sessionFor() {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return { error: reply({ error: "Unauthorized" }, 401) } as const
  if (!await canPreviewTextbooks(user.id)) return { error: reply({ error: "Forbidden" }, 403) } as const
  const db = createAdminClient()
  const profile = await db.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (!profile.data || !["admin", "teacher"].includes(profile.data.role)) return { error: reply({ error: "Forbidden" }, 403) } as const
  return { db, user, admin: profile.data.role === "admin" } as const
}
export async function GET(request: NextRequest) {
  const access = await sessionFor()
  if (access.error) return access.error
  const offset = Math.max(0, Number(request.nextUrl.searchParams.get("offset")) || 0)
  const teachers = await access.db.from("profiles").select("id,role,admin_permissions").in("role", ["admin", "teacher"])
  const ids = (teachers.data ?? []).filter(isWorkbookReviewer).map(person => person.id)
  let query = access.db.from("user_textbook_annotations").select("id,user_id,textbook_id,content,updated_at").eq("kind", "workbook_submission").order("updated_at", { ascending: false }).range(offset, offset + 49)
  query = access.admin ? query.in("user_id", ids) : query.eq("user_id", access.user.id)
  const result = await query
  if (result.error || teachers.error) return reply({ error: "Chưa tải được danh sách bài nộp" }, 500)
  const submissions = (result.data ?? []).flatMap(row => {
    try { const content = JSON.parse(row.content || "") as WorkbookSubmission; return content.version === 1 && Array.isArray(content.answers) ? [{ id: row.id, teacherId: row.user_id, bookId: row.textbook_id, content }] : [] } catch { return [] }
  })
  return reply({ submissions, hasMore: (result.data?.length ?? 0) === 50 })
}
const schema = z.object({ id: z.string().uuid(), correct: z.number().int().nonnegative(), feedback: z.string().trim().max(5000) })
export async function PATCH(request: NextRequest) {
  const access = await sessionFor()
  if (access.error) return access.error
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return reply({ error: "Kết quả chấm không hợp lệ" }, 400)
  const current = await access.db.from("user_textbook_annotations").select("id,user_id,content").eq("id", parsed.data.id).eq("kind", "workbook_submission").maybeSingle()
  if (!current.data || (!access.admin && current.data.user_id !== access.user.id)) return reply({ error: "Không tìm thấy bài nộp" }, 404)
  let content: WorkbookSubmission
  try { content = JSON.parse(current.data.content || "") } catch { return reply({ error: "Bài nộp không hợp lệ" }, 400) }
  if (content.version !== 1 || !Array.isArray(content.answers)) return reply({ error: "Bài nộp không hợp lệ" }, 400)
  const total = submissionTotal(content.answers)
  if (parsed.data.correct > total) return reply({ error: "Số câu đúng vượt quá tổng số câu" }, 400)
  const review = { reviewedAt: new Date().toISOString(), teacherId: access.user.id, correct: parsed.data.correct, total, feedback: parsed.data.feedback }
  const saved = await access.db.from("user_textbook_annotations").update({ content: JSON.stringify({ ...content, status: "reviewed", review }), updated_at: review.reviewedAt }).eq("id", current.data.id).eq("user_id", current.data.user_id).eq("content", current.data.content).select("id")
  if (saved.error) return reply({ error: "Chưa lưu được kết quả chấm" }, 500)
  if (!saved.data?.length) return reply({ error: "Bài đã thay đổi. Hãy tải lại trước khi chấm." }, 409)
  return reply({ ok: true, review })
}
