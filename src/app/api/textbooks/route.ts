import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: books, error }, { data: progress }] = await Promise.all([
    admin.from("textbooks").select("id,code,title_ko,title_vi,volume,edition,total_pages,cover_path,textbook_units(id,unit_number,title_ko,title_vi,start_page,end_page,sort_order)").eq("is_published", true).eq("textbook_units.is_published", true).order("volume"),
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
      progress: progressByBook.get(book.id) ?? null,
      coverUrl,
    }
  }))
  return NextResponse.json({ books: result })
}
