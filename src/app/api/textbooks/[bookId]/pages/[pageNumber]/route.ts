import { canReadTextbook } from "@/lib/textbooks/access"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(_request: NextRequest, context: { params: Promise<{ bookId: string; pageNumber: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookId, pageNumber } = await context.params
  const page = Number.parseInt(pageNumber, 10)
  if (!Number.isInteger(page) || page < 1) return NextResponse.json({ error: "Invalid page" }, { status: 400 })

  const admin = createAdminClient()
  const { data: book } = await admin.from("textbooks").select("id,total_pages,is_published").eq("id", bookId).maybeSingle()
  if (!book || !await canReadTextbook(user.id, bookId)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const { data, error } = await admin.from("textbook_pages").select("page_number,image_path,width,height,ocr_text,ocr_payload").eq("textbook_id", bookId).eq("page_number", page).maybeSingle()
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Page not found" }, { status: 404 })
  const { data: signed } = await admin.storage.from("textbooks").createSignedUrl(data.image_path, 3600)
  if (!signed?.signedUrl) return NextResponse.json({ error: "Page image unavailable" }, { status: 503 })
  const publicPayload = data.ocr_payload && typeof data.ocr_payload === "object" ? { ...data.ocr_payload } : {}
  delete publicPayload.workbook
  return NextResponse.json({ page: { ...data, ocr_payload: publicPayload, imageUrl: signed.signedUrl }, totalPages: book.total_pages })
}
