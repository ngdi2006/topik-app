import Link from "next/link"
import EpsHome from "@/components/home/EpsHome"
import RoundTwoHome from "@/components/home/RoundTwoHome"
import { createClient } from "@/lib/supabase/server"
import { getHomepageVariant, parseHomepageVariant } from "@/lib/homepage-settings"

export const metadata = {
  title: "Korea Link · Học tiếng Hàn & luyện thi EPS-TOPIK",
  description: "Học tiếng Hàn cùng giáo trình EPS-TOPIK, sách bài tập tương tác và đề thi thử. Đọc, nghe và luyện tập theo nhịp học của bạn cùng Korea Link.",
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()
  const [{ data: { user } }, savedVariant, params] = await Promise.all([supabase.auth.getUser(), getHomepageVariant(), searchParams])
  let variant = savedVariant
  let preview = false
  const requestedPreview = params["homepage-preview"]
  if (user && typeof requestedPreview === "string" && ["eps", "round-two"].includes(requestedPreview)) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role === "admin") {
      variant = parseHomepageVariant(requestedPreview)
      preview = true
    }
  }
  const account = user ? {
    name: String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Tài khoản"),
    avatarUrl: [user.user_metadata?.avatar_url, user.user_metadata?.picture].find((value): value is string => typeof value === "string" && !!value.trim()) ?? null,
  } : null
  return <>
    {preview ? <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900">Xem trước giao diện {variant === "eps" ? "EPS-TOPIK" : "Vòng 2"} · Chưa thay đổi trang chủ đang hiển thị<Link href="/admin/settings" className="underline underline-offset-2">Về Cài đặt</Link></div> : null}
    {variant === "round-two" ? <RoundTwoHome /> : <EpsHome account={account} />}
  </>
}
