import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type RawParagraph = { text?: unknown; confidence?: unknown; boundingBox?: { x?: unknown; y?: unknown; width?: unknown; height?: unknown } }

export async function GET(_request: Request, context: { params: Promise<{ bookId: string; pageNumber: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookId, pageNumber } = await context.params
  const number = Number.parseInt(pageNumber, 10)
  if (!Number.isInteger(number) || number < 1) return NextResponse.json({ error: "Invalid page" }, { status: 400 })
  const admin = createAdminClient()
  const { data: book } = await admin.from("textbooks").select("is_published").eq("id", bookId).maybeSingle()
  if (!book?.is_published) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const { data, error } = await admin.from("textbook_pages").select("ocr_payload").eq("textbook_id", bookId).eq("page_number", number).maybeSingle()
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Page not found" }, { status: 404 })

  const payload = data.ocr_payload as { paragraphs?: RawParagraph[] } | null
  const regions = (payload?.paragraphs ?? []).flatMap((paragraph, index) => {
    const box = paragraph.boundingBox
    const text = typeof paragraph.text === "string" ? paragraph.text.trim() : ""
    const x = Number(box?.x); const y = Number(box?.y); const width = Number(box?.width); const height = Number(box?.height)
    if (!text || ![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return []
    return [{ id: `${number}-${index}`, text, confidence: typeof paragraph.confidence === "number" ? paragraph.confidence : null, x: Math.max(0, x), y: Math.max(0, y), width: Math.min(1 - x, width), height: Math.min(1 - y, height) }]
  })
  return NextResponse.json({ regions }, { headers: { "Cache-Control": "private, max-age=3600" } })
}
