import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookId: string; pageNumber: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookId, pageNumber: rawPageNumber } = await context.params
  const pageNumber = Number(rawPageNumber)
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 })
  }

  const admin = createAdminClient()
  const [{ data: book }, { data: page, error: pageError }] = await Promise.all([
    admin.from("textbooks").select("id,is_published").eq("id", bookId).maybeSingle(),
    admin.from("textbook_pages").select("image_path,checksum").eq("textbook_id", bookId).eq("page_number", pageNumber).maybeSingle(),
  ])
  if (!book?.is_published || pageError || !page?.image_path) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 })
  }

  const { data: image, error } = await admin.storage.from("textbooks").download(page.image_path)
  if (error || !image) {
    return NextResponse.json({ error: error?.message || "Image unavailable" }, { status: 503 })
  }

  return new NextResponse(await image.arrayBuffer(), {
    headers: {
      "Content-Type": image.type || "image/webp",
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      ...(page.checksum ? { ETag: `"${page.checksum}"` } : {}),
    },
  })
}
