import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getHomepageVariant, HOMEPAGE_BUCKET, HOMEPAGE_FILE } from "@/lib/homepage-settings"
import { revalidatePath } from "next/cache"

async function administrator() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  return data?.role === "admin" ? user : null
}

export async function GET() {
  if (!await administrator()) return NextResponse.json({ error: "Chỉ admin được quản lý trang chủ" }, { status: 403 })
  return NextResponse.json({ variant: await getHomepageVariant() }, { headers: { "Cache-Control": "private, no-store" } })
}

export async function PATCH(request: NextRequest) {
  const user = await administrator()
  if (!user) return NextResponse.json({ error: "Chỉ admin được quản lý trang chủ" }, { status: 403 })
  const parsed = z.object({ variant: z.enum(["eps", "round-two"]) }).strict().safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Giao diện không hợp lệ" }, { status: 400 })
  const db = createAdminClient()
  const existing = await db.storage.getBucket(HOMEPAGE_BUCKET)
  if (!existing.data) {
    const created = await db.storage.createBucket(HOMEPAGE_BUCKET, { public: false, fileSizeLimit: 16384, allowedMimeTypes: ["application/json"] })
    if (created.error && !["409", "Duplicate"].includes(String(created.error.statusCode))) return NextResponse.json({ error: "Chưa tạo được cấu hình trang chủ" }, { status: 500 })
  } else if (existing.data.public) {
    return NextResponse.json({ error: "Kho cấu hình trang chủ cần đặt ở chế độ riêng tư" }, { status: 500 })
  }
  const config = JSON.stringify({ variant: parsed.data.variant, updatedAt: new Date().toISOString(), updatedBy: user.id })
  const { error } = await db.storage.from(HOMEPAGE_BUCKET).upload(HOMEPAGE_FILE, Buffer.from(config), { contentType: "application/json", upsert: true, cacheControl: "0" })
  if (error) return NextResponse.json({ error: "Chưa lưu được giao diện trang chủ" }, { status: 500 })
  revalidatePath("/")
  return NextResponse.json({ variant: parsed.data.variant }, { headers: { "Cache-Control": "private, no-store" } })
}
