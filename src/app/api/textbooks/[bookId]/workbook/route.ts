import { createHash } from "node:crypto"
import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canReadTextbook, canPreviewTextbooks, getTextbookPermissions } from "@/lib/textbooks/access"
import { validAnswerKey, sameProtectedAnswerKeys } from "@/lib/textbooks/grading"
import { answerKey, fieldAnswered, fieldTotal, parseWorkbookPage, validWorkbookValue, workbookSaveSchema, workbookPageSchema, type WorkbookAnswer } from "@/lib/textbooks/workbook"

const noStore = { "Cache-Control": "private, no-store" }
function reply(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: noStore }) }
async function contextFor(bookId: string) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: reply({ error: "Unauthorized" }, 401) } as const
  if (!await canReadTextbook(user.id, bookId)) return { error: reply({ error: "Không tìm thấy sách" }, 404) } as const
  return { user, session, db: createAdminClient() } as const
}

export async function GET(request: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await context.params
  const access = await contextFor(bookId)
  if (access.error) return access.error
  const { db, user } = access
  const unitId = request.nextUrl.searchParams.get("unitId")
  const summary = request.nextUrl.searchParams.get("summary") === "1"
  const unitResult = await db.from("textbook_units").select("id,start_page,end_page,is_published").eq("textbook_id", bookId).order("sort_order")
  if (unitResult.error) return reply({ error: unitResult.error.message }, 500)
  const preview = await canPreviewTextbooks(user.id)
  const units = (unitResult.data || []).filter(unit => unit.is_published || preview)
  const unit = units.find(item => item.id === unitId)
  if (!summary && !unit) return reply({ error: "Không tìm thấy bài" }, 404)
  const min = summary ? Math.min(...units.map(item => item.start_page)) : unit!.start_page
  const max = summary ? Math.max(...units.map(item => item.end_page)) : unit!.end_page
  if (!units.length) return reply({ userId: user.id, pages: [], answers: [], progress: [] })
  const pagesResult = await db.from("textbook_pages").select("page_number,ocr_payload").eq("textbook_id", bookId).gte("page_number", min).lte("page_number", max).order("page_number")
  if (pagesResult.error) return reply({ error: pagesResult.error.message }, 500)
  const pages = (pagesResult.data || []).map(page => ({ pageNumber: page.page_number, workbook: parseWorkbookPage(page.ocr_payload) }))
  const definitions = new Map(pages.flatMap(page => (page.workbook?.fields || []).map(field => [answerKey(page.pageNumber, field.id), field] as const)))
  const answers: WorkbookAnswer[] = []
  for (let offset = 0; ; offset += 1000) {
    const result = await db.from("user_textbook_annotations").select("id,page_number,content,updated_at").eq("user_id", user.id).eq("textbook_id", bookId).eq("kind", "workbook_answer").gte("page_number", min).lte("page_number", max).order("id").range(offset, offset + 999)
    if (result.error) return reply({ error: result.error.message }, 500)
    for (const row of result.data || []) {
      try {
        const content = JSON.parse(row.content || "{}")
        const field = definitions.get(answerKey(row.page_number, content.fieldId))
        if (field && validWorkbookValue(field, content.value)) answers.push({ pageNumber: row.page_number, fieldId: content.fieldId, value: content.value, updatedAt: row.updated_at })
      } catch { /* Ignore malformed legacy annotations. */ }
    }
    if ((result.data?.length || 0) < 1000) break
  }
  const values = new Map(answers.map(answer => [answerKey(answer.pageNumber, answer.fieldId), answer.value]))
  const progress = units.map(item => {
    let answered = 0; let total = 0
    for (const page of pages.filter(page => page.pageNumber >= item.start_page && page.pageNumber <= item.end_page)) {
      for (const field of page.workbook?.fields || []) { total += fieldTotal(field); answered += fieldAnswered(field, values.get(answerKey(page.pageNumber, field.id))) }
    }
    return { unitId: item.id, answered, total }
  })
  const publicPages = preview ? pages : pages.map(page => ({ ...page, workbook: page.workbook ? { ...page.workbook, fields: page.workbook.fields.map(field => { const copy = { ...field }; delete copy.answer_key; return copy }) } : null }))
  const permissions = await getTextbookPermissions(user.id)
  return reply({ userId: user.id, canEdit: permissions.canEditLayout, canManageAnswerKeys: permissions.canManageAnswerKeys, pages: summary ? [] : publicPages, answers: summary ? [] : answers, progress })
}

export async function POST(request: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await context.params
  const access = await contextFor(bookId)
  if (access.error) return access.error
  const parsed = workbookSaveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return reply({ error: "Câu trả lời không hợp lệ" }, 400)
  const { db, user } = access
  if (parsed.data.userId !== user.id) return reply({ error: "Tài khoản đã thay đổi. Hãy tải lại trang trước khi tiếp tục." }, 409)
  const numbers = [...new Set(parsed.data.answers.map(answer => answer.pageNumber))]
  const pagesResult = await db.from("textbook_pages").select("page_number,ocr_payload").eq("textbook_id", bookId).in("page_number", numbers)
  if (pagesResult.error) return reply({ error: pagesResult.error.message }, 500)
  const fields = new Map((pagesResult.data || []).flatMap(page => (parseWorkbookPage(page.ocr_payload)?.fields || []).map(field => [answerKey(page.page_number, field.id), field] as const)))
  const now = new Date().toISOString()
  const rows = []
  for (const answer of parsed.data.answers) {
    const field = fields.get(answerKey(answer.pageNumber, answer.fieldId))
    if (!field || !validWorkbookValue(field, answer.value)) return reply({ error: "Bài tập hoặc đáp án đã thay đổi. Hãy tải lại bài." }, 409)
    const hash = createHash("sha256").update(`${user.id}:${bookId}:${answer.pageNumber}:${field.id}`).digest("hex")
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
    rows.push({ id, user_id: user.id, textbook_id: bookId, page_number: answer.pageNumber, kind: "workbook_answer", rect: field.rect, content: JSON.stringify({ fieldId: field.id, value: answer.value }), updated_at: now })
  }
  // Explicit owner and deterministic IDs isolate answers and make retries idempotent.
  const result = await db.from("user_textbook_annotations").upsert(rows, { onConflict: "id" })
  if (result.error) return reply({ error: result.error.message }, 500)
  return reply({ ok: true, savedAt: now })
}

const layoutSchema = z.object({ pageNumber: z.number().int().positive(), workbook: workbookPageSchema })
export async function PATCH(request: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await context.params
  const access = await contextFor(bookId)
  if (access.error) return access.error
  if (!await canPreviewTextbooks(access.user.id)) return reply({ error: "Forbidden" }, 403)
  const permissions = await getTextbookPermissions(access.user.id)
  const parsed = layoutSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return reply({ error: "Vùng làm bài không hợp lệ" }, 400)
  const { pageNumber, workbook } = parsed.data
  if (workbook.fields.some(field => field.answer_key?.status === "reviewed" && !validAnswerKey(field))) return reply({ error: "Đáp án đã xác minh chưa đầy đủ hoặc không khớp lựa chọn" }, 400)
  if (new Set(workbook.fields.map(field => field.id)).size !== workbook.fields.length || workbook.fields.some(field => [field.rect, ...field.options.map(node => node.rect), ...field.sources.map(node => node.rect), ...field.targets.map(node => node.rect)].some(rect => rect.x + rect.width > 1.000001 || rect.y + rect.height > 1.000001))) return reply({ error: "Vùng bị trùng hoặc vượt ngoài trang sách" }, 400)
  const current = await access.db.from("textbook_pages").select("ocr_payload").eq("textbook_id", bookId).eq("page_number", pageNumber).single()
  if (current.error) return reply({ error: "Không tìm thấy trang" }, 404)
  const before = parseWorkbookPage(current.data.ocr_payload)
  if (!permissions.canManageAnswerKeys && (!before || !sameProtectedAnswerKeys(before, workbook))) return reply({ error: "Chỉ admin được cập nhật hoặc duyệt đáp án chuẩn" }, 403)
  const result = await access.db.from("textbook_pages").update({ ocr_payload: { ...current.data.ocr_payload, workbook: { ...workbook, review_status: "reviewed", source: permissions.canManageAnswerKeys ? "admin_reviewed" : "teacher_reviewed" } }, updated_at: new Date().toISOString() }).eq("textbook_id", bookId).eq("page_number", pageNumber)
  return result.error ? reply({ error: result.error.message }, 500) : reply({ ok: true })
}
