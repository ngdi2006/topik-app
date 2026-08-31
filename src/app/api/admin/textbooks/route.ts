import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

async function authorize() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await createAdminClient().from("profiles").select("role,admin_permissions").eq("id", user.id).maybeSingle()
  return profile?.role === "admin" || (Array.isArray(profile?.admin_permissions) && profile.admin_permissions.includes("textbooks"))
}

export async function GET() {
  if (!await authorize()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { data, error } = await createAdminClient().from("textbooks").select("id,code,title_vi,title_ko,volume,total_pages,is_published,updated_at,textbook_units(count),textbook_pages(count)").order("volume")
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ books: data ?? [] })
}

const patchSchema = z.object({ id: z.string().uuid(), is_published: z.boolean() })
export async function PATCH(request: NextRequest) {
  if (!await authorize()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
  const admin = createAdminClient()
  const { id, is_published } = parsed.data
  if (is_published) {
    const [{ count: pages }, { data: book }] = await Promise.all([admin.from("textbook_pages").select("id", { count: "exact", head: true }).eq("textbook_id", id), admin.from("textbooks").select("total_pages").eq("id", id).single()])
    if (!book || pages !== book.total_pages) return NextResponse.json({ error: `Chưa thể xuất bản: mới có ${pages ?? 0}/${book?.total_pages ?? 0} ảnh trang.` }, { status: 409 })
    await admin.from("textbook_units").update({ is_published: true }).eq("textbook_id", id)
  }
  const { error } = await admin.from("textbooks").update({ is_published, updated_at: new Date().toISOString() }).eq("id", id)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}
