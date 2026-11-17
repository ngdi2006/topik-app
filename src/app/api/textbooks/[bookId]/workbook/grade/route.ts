import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canReadTextbook, canPreviewTextbooks } from "@/lib/textbooks/access"
import { parseWorkbookPage, workbookValueSchema } from "@/lib/textbooks/workbook"
import { gradeWorkbook, isAutoGradedField } from "@/lib/textbooks/grading"

const schema = z.object({ unitId: z.string().uuid(), section: z.enum(["reading", "listening"]).optional(), answers: z.record(z.string().max(180), workbookValueSchema).refine(value => Object.keys(value).length <= 2000) })
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } })
export async function POST(request: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await context.params
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return reply({ error: "Unauthorized" }, 401)
  if (!await canReadTextbook(user.id, bookId)) return reply({ error: "Không tìm thấy sách" }, 404)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return reply({ error: "Bài làm không hợp lệ" }, 400)
  const db = createAdminClient()
  const unit = await db.from("textbook_units").select("start_page,end_page,is_published").eq("id", parsed.data.unitId).eq("textbook_id", bookId).maybeSingle()
  if (!unit.data || (!unit.data.is_published && !await canPreviewTextbooks(user.id))) return reply({ error: "Không tìm thấy bài" }, 404)
  const pages = await db.from("textbook_pages").select("page_number,ocr_payload").eq("textbook_id", bookId).gte("page_number", unit.data.start_page).lte("page_number", unit.data.end_page).order("page_number")
  if (pages.error) return reply({ error: "Chưa tải được đáp án" }, 500)
  const definitions = (pages.data ?? []).map(page => {
    const workbook = parseWorkbookPage(page.ocr_payload)
    return { pageNumber: page.page_number, workbook: workbook ? { ...workbook, fields: workbook.fields.filter(field => isAutoGradedField(field) && (!parsed.data.section || field.section === parsed.data.section)) } : null }
  })
  return reply(gradeWorkbook(definitions, parsed.data.answers))
}
