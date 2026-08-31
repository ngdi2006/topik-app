import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(_request: Request, context: { params: Promise<{ bookId: string; unitId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookId, unitId } = await context.params
  const admin = createAdminClient()
  const { data: unit, error: unitError } = await admin.from("textbook_units").select("id,start_page,end_page,is_published,textbook_id").eq("id", unitId).eq("textbook_id", bookId).maybeSingle()
  if (unitError || !unit?.is_published) return NextResponse.json({ error: "Unit not found" }, { status: 404 })

  const { data: pages, error } = await admin.from("textbook_pages").select("page_number,image_path,width,height,ocr_text").eq("textbook_id", bookId).gte("page_number", unit.start_page).lte("page_number", unit.end_page).order("page_number")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pages?.length) return NextResponse.json({ error: "Unit has no pages" }, { status: 404 })

  const { data: signed, error: signedError } = await admin.storage.from("textbooks").createSignedUrls(pages.map((page) => page.image_path), 3600)
  if (signedError) return NextResponse.json({ error: signedError.message }, { status: 503 })

  return NextResponse.json({
    pages: pages.map((page, index) => ({
      page_number: page.page_number,
      imageUrl: signed?.[index]?.signedUrl ?? "",
      width: page.width,
      height: page.height,
      ocr_text: page.ocr_text,
      ocr_payload: {},
      error: signed?.[index]?.error ?? undefined,
    })),
  }, { headers: { "Cache-Control": "private, max-age=300" } })
}
