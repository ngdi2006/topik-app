import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canReadTextbook, canPreviewTextbooks } from "@/lib/textbooks/access"
import { parseWorkbookPage, validWorkbookValue, workbookValueSchema, fieldAnswered } from "@/lib/textbooks/workbook"
import { isAutoGradedField } from "@/lib/textbooks/grading"
import { isWorkbookReviewer, type WorkbookSubmission, type SubmissionSummary, type SubmittedAnswer } from "@/lib/textbooks/submissions"

const section = z.enum(["vocabulary", "grammar", "writing", "reading", "listening"])
const schema = z.object({ unitId: z.string().uuid(), section, teacherId: z.string().uuid(), requestId: z.string().uuid(), answers: z.record(z.string().max(180), workbookValueSchema).refine(value => Object.keys(value).length <= 2000) })
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } })
async function accessFor(bookId: string, unitId: string | null) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: reply({ error: "Unauthorized" }, 401) } as const
  if (!await canReadTextbook(user.id, bookId)) return { error: reply({ error: "Không tìm thấy sách" }, 404) } as const
  if (!z.string().uuid().safeParse(unitId).success) return { error: reply({ error: "Bài học không hợp lệ" }, 400) } as const
  const db = createAdminClient()
  const unit = await db.from("textbook_units").select("id,title_ko,title_vi,unit_number,start_page,end_page,is_published").eq("id", unitId!).eq("textbook_id", bookId).maybeSingle()
  if (!unit.data || (!unit.data.is_published && !await canPreviewTextbooks(user.id))) return { error: reply({ error: "Không tìm thấy bài" }, 404) } as const
  return { db, user, unit: unit.data } as const
}
export async function GET(request: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await context.params
  const access = await accessFor(bookId, request.nextUrl.searchParams.get("unitId"))
  if (access.error) return access.error
  const { db, user, unit } = access
  const [teachers, submissions] = await Promise.all([
    db.from("profiles").select("id,full_name,role,admin_permissions").in("role", ["admin", "teacher"]),
    db.from("user_textbook_annotations").select("id,user_id,content").eq("textbook_id", bookId).eq("kind", "workbook_submission").eq("rect->>student_id", user.id).eq("rect->>unit_id", unit.id).order("created_at", { ascending: false }).limit(100),
  ])
  if (teachers.error || submissions.error) return reply({ error: "Chưa tải được thông tin nộp bài" }, 500)
  const eligible = (teachers.data ?? []).filter(isWorkbookReviewer)
  const eligibleIds = new Set(eligible.map(teacher => teacher.id))
  const latest = new Map<string, SubmissionSummary>()
  for (const row of submissions.data ?? []) {
    try {
      const content = JSON.parse(row.content ?? "") as WorkbookSubmission
      if (!eligibleIds.has(row.user_id) || content.studentId !== user.id || content.unitId !== unit.id || latest.has(content.section)) continue
      latest.set(content.section, { id: row.id, section: content.section, status: content.status, submittedAt: content.submittedAt, teacherId: row.user_id, review: content.review })
    } catch { /* Invalid legacy content is not a submission. */ }
  }
  return reply({ teachers: eligible.map(teacher => ({ id: teacher.id, name: teacher.full_name || "Giáo viên" })), submissions: [...latest.values()] })
}
export async function POST(request: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await context.params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return reply({ error: "Bài nộp không hợp lệ" }, 400)
  const input = parsed.data
  const access = await accessFor(bookId, input.unitId)
  if (access.error) return access.error
  const { db, user, unit } = access
  const digest = createHash("sha256").update(`workbook_submission:${user.id}:${bookId}:${unit.id}:${input.section}:${input.requestId}`).digest("hex")
  const submissionId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`
  const teacher = await db.from("profiles").select("id,role,admin_permissions").eq("id", input.teacherId).maybeSingle()
  if (!isWorkbookReviewer(teacher.data)) return reply({ error: "Giáo viên chưa có quyền chấm giáo trình này" }, 400)
  const [pages, student, book] = await Promise.all([
    db.from("textbook_pages").select("page_number,ocr_payload").eq("textbook_id", bookId).gte("page_number", unit.start_page).lte("page_number", unit.end_page).order("page_number"),
    db.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    db.from("textbooks").select("title_vi").eq("id", bookId).maybeSingle(),
  ])
  if (pages.error) return reply({ error: "Chưa tải được nội dung bài" }, 500)
  const answers: SubmittedAnswer[] = []
  let answered = 0
  for (const page of pages.data ?? []) for (const field of parseWorkbookPage(page.ocr_payload)?.fields ?? []) {
    if (field.is_context || field.section !== input.section || isAutoGradedField(field)) continue
    const value = input.answers[`${page.page_number}:${field.id}`] ?? (field.kind === "match" ? {} : "")
    if (!validWorkbookValue(field, value)) return reply({ error: "Một câu trả lời không còn phù hợp với bài. Hãy tải lại trang." }, 409)
    if (fieldAnswered(field, value)) answered++
    answers.push({ pageNumber: page.page_number, fieldId: field.id, label: field.label, kind: field.kind, value, options: field.options.map(node => ({ id: node.id, label: node.label })), sources: field.sources.filter(node => !node.is_context).map(node => ({ id: node.id, label: node.label })), targets: field.targets.filter(node => !node.is_context).map(node => ({ id: node.id, label: node.label })) })
  }
  if (!answers.length || !answered) return reply({ error: "Hãy làm ít nhất một câu trước khi nộp phần này" }, 400)
  const content: WorkbookSubmission = { version: 1, studentId: user.id, studentName: student.data?.full_name || "Học viên", unitId: unit.id, unitTitle: `Bài ${unit.unit_number} · ${unit.title_vi || unit.title_ko || ""}`, bookTitle: book.data?.title_vi || "Sách bài tập", section: input.section, status: "pending", submittedAt: new Date().toISOString(), answers, review: null }
  // The teacher owns the immutable submitted copy; learners cannot edit it through annotation RLS.
  const row = { id: submissionId, user_id: input.teacherId, textbook_id: bookId, page_number: unit.start_page, kind: "workbook_submission", rect: { student_id: user.id, unit_id: unit.id, section: input.section }, content: JSON.stringify(content) }
  const saved = await db.from("user_textbook_annotations").insert(row)
  let summary: SubmissionSummary = { id: submissionId, section: input.section, status: "pending", submittedAt: content.submittedAt, teacherId: input.teacherId, review: null }
  if (saved.error) {
    if (saved.error.code !== "23505") return reply({ error: "Chưa lưu được bài nộp. Bài chưa được gửi cho giáo viên." }, 500)
    const existing = await db.from("user_textbook_annotations").select("id,user_id,textbook_id,rect,content").eq("id", submissionId).maybeSingle()
    if (!existing.data || existing.data.user_id !== input.teacherId || existing.data.textbook_id !== bookId || existing.data.rect?.student_id !== user.id || existing.data.rect?.unit_id !== unit.id || existing.data.rect?.section !== input.section) return reply({ error: "Mã bài nộp không hợp lệ" }, 409)
    let prior: WorkbookSubmission
    try { prior = JSON.parse(existing.data.content || "") } catch { return reply({ error: "Bài nộp cũ không hợp lệ" }, 409) }
    if (JSON.stringify(prior.answers) !== JSON.stringify(answers)) return reply({ error: "Bài làm đã thay đổi. Hãy nộp bằng mã bài mới." }, 409)
    summary = { ...summary, status: prior.status, submittedAt: prior.submittedAt, review: prior.review }
  }
  return reply({ ok: true, message: summary.status === "reviewed" ? "Bài nộp này đã được giáo viên chấm." : "Đã lưu kết quả và gửi cho giáo viên chấm.", submission: summary })
}
