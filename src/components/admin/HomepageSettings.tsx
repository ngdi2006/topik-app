"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, BookOpen, Check, Mic2 } from "lucide-react"
import { toast } from "sonner"
import type { HomepageVariant } from "@/lib/homepage-settings"

export default function HomepageSettings() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [selected, setSelected] = useState<HomepageVariant>("eps")
  const [saved, setSaved] = useState<HomepageVariant>("eps")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const load = async () => {
    try {
      const response = await fetch("/api/admin/settings/homepage", { cache: "no-store" })
      if (response.status === 403) { setAllowed(false); return }
      setAllowed(true)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Chưa tải được cấu hình trang chủ")
      setSelected(data.variant); setSaved(data.variant); setError("")
    } catch (cause) { setAllowed(true); setError(cause instanceof Error ? cause.message : "Chưa tải được cấu hình trang chủ") }
  }
  useEffect(() => { void load() }, [])
  const save = async () => {
    setSaving(true); setError("")
    try {
      const response = await fetch("/api/admin/settings/homepage", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant: selected }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Chưa lưu được giao diện")
      setSaved(data.variant); toast.success("Đã cập nhật giao diện trang chủ")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được giao diện") }
    finally { setSaving(false) }
  }
  if (allowed === false) return null
  return <section className="rounded-xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="homepage-settings-title">
    <div className="mb-5"><h2 id="homepage-settings-title" className="text-lg font-semibold">Giao diện trang chủ</h2><p className="mt-1 text-sm leading-6 text-slate-500">Chọn trang khách truy cập nhìn thấy. Giao diện còn lại được giữ nguyên để dùng lại khi cần.</p></div>
    {allowed === null ? <p className="text-sm text-slate-500">Đang tải cấu hình…</p> : <>
      <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">Chọn giao diện trang chủ</legend>{([{ variant: "eps", title: "Học tiếng Hàn · EPS-TOPIK", description: "Giáo trình, sách bài tập và thi thử. Giao diện mặc định mới.", icon: BookOpen }, { variant: "round-two", title: "Luyện tập Vòng 2", description: "Giao diện trước đây: phỏng vấn, phản xạ và thực hành Vòng 2.", icon: Mic2 }] as const).map(({ variant, title, description, icon: Icon }) => <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${selected === variant ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`} key={variant}><input type="radio" name="homepage-variant" value={variant} checked={selected === variant} onChange={() => setSelected(variant)} className="mt-1 size-4 accent-blue-600" /><div><Icon className="mb-3 size-5 text-blue-600" /><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>{saved === variant ? <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="size-3.5" /> Đang hiển thị</span> : <span className="mt-3 block text-xs text-slate-400">Đang ẩn · Có thể bật lại</span>}</div></label>)}</fieldset>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><a href={`/?homepage-preview=${selected}`} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800">Xem trước giao diện<ArrowUpRight className="size-4" /></a><button type="button" disabled={saving || !!error || selected === saved} onClick={() => void save()} className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Đang lưu…" : "Áp dụng cho trang chủ"}</button></div>
    </>}
    {error ? <div role="alert" className="mt-3 text-sm text-red-700">{error}<button type="button" onClick={() => void load()} className="ml-3 min-h-10 underline">Tải lại</button></div> : null}
  </section>
}
