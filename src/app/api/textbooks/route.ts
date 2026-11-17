import { canPreviewTextbooks, hasWorkbookAccess } from "@/lib/textbooks/access"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { workbookVolumeFromCode } from "@/lib/textbooks/workbook-entitlement"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const preview = await canPreviewTextbooks(user.id)
  const [volume1Access, volume2Access] = preview ? [true, true] : await Promise.all([hasWorkbookAccess(user.id, 1), hasWorkbookAccess(user.id, 2)])
  let booksQuery = admin.from("textbooks").select("id,code,title_ko,title_vi,volume,edition,total_pages,cover_path,metadata,textbook_units(id,unit_number,title_ko,title_vi,start_page,end_page,sort_order)").order("volume")
  if (!preview) booksQuery = booksQuery.or("is_published.eq.true,code.in.(eps-topik-2025-workbook-1,eps-topik-2025-workbook-2)").eq("textbook_units.is_published", true)
  const [{ data: books, error }, { data: progress }] = await Promise.all([
    booksQuery,
    admin.from("user_textbook_progress").select("textbook_id,last_page,progress_percent").eq("user_id", user.id),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const progressByBook = new Map((progress ?? []).map((item) => [item.textbook_id, item]))
  const result = await Promise.all((books ?? []).map(async (book) => {
    const coverUrl = book.cover_path
      ? (await admin.storage.from("textbooks").createSignedUrl(book.cover_path, 3600)).data?.signedUrl ?? null
      : null
    return {
      ...book,
      units: [...(book.textbook_units ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      textbook_units: undefined,
      metadata: undefined,
      progress: progressByBook.get(book.id) ?? null,
      coverUrl,
      canAccess: !book.code.includes("-workbook-") || ((workbookVolumeFromCode(book.code) === 1 ? volume1Access : workbookVolumeFromCode(book.code) === 2 ? volume2Access : false) && (preview || book.metadata?.activation_enabled !== false)),
    }
  }))
  return NextResponse.json({ books: result }, { headers: { "Cache-Control": "private, no-store" } })
}
