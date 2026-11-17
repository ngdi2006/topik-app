"use client"

import { useState } from "react"
import { BookOpenCheck } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const localDay = (date: Date) => date.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
export default function WorkbookAccessControl({ userId, enabled, expiresAt = null, onChanged, showLabel = false }: { userId: string; enabled: boolean; expiresAt?: string | null; onChanged: (enabled: boolean, expiresAt: string | null) => void; showLabel?: boolean }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [action, setAction] = useState<"extend" | "set_expiry" | "revoke">("extend")
  const [days, setDays] = useState(30)
  const [expiry, setExpiry] = useState("")
  const [error, setError] = useState("")
  const save = async () => {
    setSaving(true); setError("")
    try {
      const body = action === "extend" ? { action, days } : action === "set_expiry" ? { action, expires_at: `${expiry}T23:59:59+07:00` } : { action }
      const response = await fetch(`/api/admin/users/${userId}/workbook-access`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Chưa cập nhật được quyền")
      onChanged(data.workbookAccess, data.workbookAccessExpiresAt)
      toast.success(action === "revoke" ? "Đã hủy quyền sách bài tập" : "Đã cập nhật thời hạn sách bài tập")
      setOpen(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa cập nhật được quyền") }
    finally { setSaving(false) }
  }
  return <>
    <button aria-label="Quản lý thời hạn sách bài tập" title={expiresAt ? `Sách bài tập: ${enabled ? "Còn hạn" : "Đã hết hạn hoặc bị hủy"} · ${new Date(expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}` : "Cấp thời hạn sách bài tập"} className={`flex items-center justify-center gap-2 rounded-lg font-semibold ${showLabel ? "min-h-10 px-3 text-xs" : "size-8"} ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`} onClick={() => { setAction("extend"); setError(""); setExpiry(expiresAt ? localDay(new Date(expiresAt)) : ""); setOpen(true) }} type="button"><BookOpenCheck className="size-4" />{showLabel ? enabled ? "Gia hạn / Quản lý thời hạn" : "Kích hoạt có thời hạn" : null}</button>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value) }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Thời hạn sách bài tập EPS</DialogTitle></DialogHeader>
      <p className="text-xs leading-5 text-slate-500">{expiresAt ? `${enabled ? "Đang còn hạn" : "Đã hết hạn hoặc bị hủy"} · Hạn hiện tại: ${new Date(expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}` : "Chưa được cấp thời hạn sử dụng."}</p>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">{([["extend", "Kích hoạt / Gia hạn"], ["set_expiry", "Đặt hạn"], ["revoke", "Hủy quyền"]] as const).map(([value, label]) => <button aria-pressed={action === value} className={`min-h-10 rounded px-1 text-xs font-bold ${action === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`} disabled={saving} key={value} onClick={() => { setAction(value); setError("") }} type="button">{label}</button>)}</div>
      {action === "extend" ? <div className="space-y-3"><div className="grid grid-cols-4 gap-2">{[7, 30, 90, 365].map(value => <button aria-pressed={days === value} className={`min-h-10 rounded-lg border text-sm ${days === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200"}`} disabled={saving} key={value} onClick={() => setDays(value)} type="button">{value} ngày</button>)}</div><label className="block text-xs font-semibold">Số ngày sử dụng<input aria-label="Số ngày sử dụng" className="mt-1 min-h-10 w-full rounded-lg border px-3 text-sm" disabled={saving} type="number" min={1} max={3650} value={days} onChange={event => setDays(Number(event.target.value))} /></label><p className="text-xs leading-5 text-slate-500">Còn hạn: cộng tiếp từ ngày hết hạn. Đã hết hạn hoặc chưa cấp: tính từ hôm nay.</p></div> : action === "set_expiry" ? <label className="block text-xs font-semibold">Ngày hết hạn<input aria-label="Ngày hết hạn" className="mt-1 min-h-10 w-full rounded-lg border px-3 text-sm" disabled={saving} type="date" min={localDay(new Date())} value={expiry} onChange={event => setExpiry(event.target.value)} /><span className="mt-1 block font-normal text-slate-500">Sử dụng đến 23:59:59 ngày đã chọn (giờ Việt Nam).</span></label> : <p className="rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700">Hủy quyền truy cập ngay. Bài làm và kết quả học vẫn được giữ lại.</p>}
      {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
      <button className={`min-h-11 rounded-lg px-3 text-sm font-bold text-white disabled:opacity-50 ${action === "revoke" ? "bg-red-600" : "bg-blue-600"}`} disabled={saving || (action === "set_expiry" ? !expiry : action === "extend" ? !Number.isInteger(days) || days < 1 || days > 3650 : false)} onClick={() => void save()} type="button">{saving ? "Đang lưu…" : action === "extend" ? `${enabled ? "Cộng thêm" : "Kích hoạt"} ${days} ngày` : action === "set_expiry" ? "Lưu ngày hết hạn" : "Hủy quyền ngay"}</button>
    </DialogContent></Dialog>
  </>
}
