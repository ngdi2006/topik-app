import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isReferenceBook } from '@/lib/textbooks/catalog'

async function authorize() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await createAdminClient().from("profiles").select("role,admin_permissions").eq("id", user.id).maybeSingle()
  return profile?.role === "admin" || profile?.role === "teacher"
}

export async function GET() {
  if (!await authorize()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { data, error } = await createAdminClient().from("textbooks").select("id,code,title_vi,title_ko,volume,total_pages,is_published,updated_at,metadata,textbook_units(count),textbook_pages(count)").order("volume")
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ books: (data ?? []).map(book => ({ ...book, metadata: undefined, accessMode: book.metadata?.access_mode, activationEnabled: book.metadata?.activation_enabled })) })
}

const patchSchema = z.object({ id: z.string().uuid(), is_published: z.boolean() })
export async function PATCH(request: NextRequest) {
  if (!await authorize()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
  const admin = createAdminClient()
  const { id, is_published } = parsed.data
  const bookResult = await admin.from("textbooks").select("code,total_pages,metadata").eq("id", id).single()
  if (bookResult.error || !bookResult.data) return NextResponse.json({ error: "Không tìm thấy giáo trình" }, { status: 404 })
  if (is_published) {
    const { count: pages, error: pageError } = await admin.from("textbook_pages").select("id", { count: "exact", head: true }).eq("textbook_id", id)
    if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 })
    const book = bookResult.data
    if (!book || pages !== book.total_pages) return NextResponse.json({ error: `Chưa thể xuất bản: mới có ${pages ?? 0}/${book?.total_pages ?? 0} ảnh trang.` }, { status: 409 })
    const unitUpdate = await admin.from("textbook_units").update({ is_published: true }).eq("textbook_id", id)
    if (unitUpdate.error) return NextResponse.json({ error: unitUpdate.error.message }, { status: 500 })
  }
  if (bookResult.data.code.includes("-workbook-")) {
    const units = await admin.from("textbook_units").select("id").eq("textbook_id", id)
    if (units.error) return NextResponse.json({ error: units.error.message }, { status: 500 })
    if (units.data.length) {
      const audioUpdate = await admin.from("textbook_resources").update({ is_published: false }).in("unit_id", units.data.map(unit => unit.id)).eq("kind", "audio")
      if (audioUpdate.error) return NextResponse.json({ error: audioUpdate.error.message }, { status: 500 })
    }
  }
  const restricted = bookResult.data.code.includes("-workbook-") || isReferenceBook(bookResult.data)
  const { error } = await admin.from("textbooks").update({ is_published: restricted ? false : is_published, ...(restricted ? { metadata: { ...bookResult.data.metadata, access_mode: isReferenceBook(bookResult.data) ? 'reference_activation' : "workbook_activation", activation_enabled: is_published } } : {}), updated_at: new Date().toISOString() }).eq("id", id)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}
