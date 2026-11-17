"use client"

import { useState } from "react"
import { BookOpenCheck } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { WorkbookVolume, WorkbookVolumeAccess } from "@/lib/textbooks/workbook-entitlement"
import type { WorkbookAccessResult, WorkbookAccessUpdate } from "@/lib/textbooks/workbook-access-admin"

const localDay = (date: Date) => date.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
const emptyAccess: WorkbookVolumeAccess = { 1: { active: false, expiresAt: null }, 2: { active: false, expiresAt: null } }
type Props = { userId?: string; userIds?: string[]; access?: WorkbookVolumeAccess; onChanged: (updates: WorkbookAccessUpdate[]) => void; showLabel?: boolean }

export default function WorkbookAccessControl({ userId, userIds, access = emptyAccess, onChanged, showLabel = false }: Props) {
  const bulk = userIds !== undefined
  const ids = bulk ? userIds : userId ? [userId] : []
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [action, setAction] = useState<"extend" | "set_expiry" | "revoke">("extend")
  const [volumes, setVolumes] = useState<WorkbookVolume[]>([1])
  const [days, setDays] = useState(30)
  const [expiry, setExpiry] = useState("")
  const [error, setError] = useState("")
  const [progress, setProgress] = useState("")
  const active = access[1].active || access[2].active
  const save = async () => {
    setSaving(true); setError(""); setProgress("")
    const targets = [...new Set(ids)]
    let successes = 0
    const failures: string[] = []
    try {
      const change = { volumes, ...(action === "extend" ? { action, days } : action === "set_expiry" ? { action, expires_at: `${expiry}T23:59:59+07:00` } : { action }) }
      for (let offset = 0; offset < targets.length; offset += 100) {
        const chunk = targets.slice(offset, offset + 100)
        const response = await fetch(bulk ? "/api/admin/users/bulk-workbook-access" : `/api/admin/users/${userId}/workbook-access`, { method: bulk ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bulk ? { ...change, userIds: chunk } : change) })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Chưa cập nhật được quyền")
        const results: WorkbookAccessResult[] = bulk ? data.results : [data]
        const updates = results.filter((result): result is { ok: true } & WorkbookAccessUpdate => result.ok)
        if (updates.length) onChanged(updates)
        successes += updates.length
        failures.push(...results.filter(result => !result.ok).map(result => !result.ok ? result.error : ""))
        setProgress(`Đã xử lý ${Math.min(offset + chunk.length, targets.length)}/${targets.length} tài khoản`)
      }
      if (failures.length) {
        setError(`${successes} tài khoản thành công, ${failures.length} tài khoản chưa cập nhật. ${[...new Set(failures)].join(". ")}. Chỉ những tài khoản chưa thành công còn được chọn.`)
      } else {
        toast.success(`Đã ${action === "revoke" ? "hủy quyền" : "cập nhật thời hạn"} Quyển ${volumes.join(", ")} cho ${successes} tài khoản`)
        setOpen(false)
      }
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : "Chưa cập nhật được quyền"}. Đã xác nhận ${successes} tài khoản thành công. Nếu mất kết nối, hãy kiểm tra hạn hiện tại trước khi thử lại để tránh cộng thêm lần nữa.`)
    } finally { setSaving(false) }
  }
  return <>
    <button aria-label={bulk ? "Cấp quyền sách bài tập hàng loạt" : "Quản lý quyền từng quyển sách bài tập"} title="Quản lý Quyển 1 và Quyển 2 riêng biệt" disabled={ids.length === 0} className={`flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors hover:bg-blue-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${bulk || showLabel ? "min-h-10 px-3 text-xs" : "size-8"} ${active || bulk ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`} onClick={() => { setAction("extend"); setVolumes([1]); setDays(30); setError(""); setProgress(""); setExpiry(""); setOpen(true) }} type="button"><BookOpenCheck className="size-4" />{bulk ? `Sách bài tập (${ids.length})` : showLabel ? "Quản lý từng quyển" : null}</button>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value) }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle>{bulk ? "Cấp quyền sách bài tập hàng loạt" : "Quyền sách bài tập EPS"}</DialogTitle></DialogHeader>
      <p className="text-xs leading-5 text-slate-500">{bulk ? `Áp dụng cho ${ids.length} tài khoản được chọn. Admin và giáo viên có quyền mặc định.` : "Mỗi quyển có thời hạn riêng. Chỉ thay đổi những quyển được chọn bên dưới."}</p>
      <fieldset disabled={saving} className="grid grid-cols-2 gap-2"><legend className="mb-2 text-xs font-semibold">Chọn quyển sách</legend>{([1, 2] as const).map(volume => <label key={volume} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition-colors ${volumes.includes(volume) ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><input type="checkbox" aria-label={`Quyển ${volume}`} checked={volumes.includes(volume)} className="mt-0.5 size-4 accent-blue-600" onChange={event => setVolumes(current => event.target.checked ? [...current, volume].sort() : current.filter(value => value !== volume))} /><span className="min-w-0 text-sm font-bold">Quyển {volume}{!bulk ? <span className={`mt-1 block text-[11px] font-normal ${access[volume].active ? "text-emerald-700" : "text-slate-500"}`}>{access[volume].active ? "Còn hạn" : access[volume].expiresAt ? "Hết hạn / Đã hủy" : "Chưa kích hoạt"}{access[volume].expiresAt ? <span className="mt-0.5 block">Đến {new Date(access[volume].expiresAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Bangkok" })}</span> : null}</span> : null}</span></label>)}</fieldset>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">{([["extend", "Kích hoạt / Gia hạn"], ["set_expiry", "Đặt hạn"], ["revoke", "Hủy quyền"]] as const).map(([value, label]) => <button aria-pressed={action === value} className={`min-h-10 rounded px-1 text-xs font-bold ${action === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`} disabled={saving} key={value} onClick={() => { setAction(value); setError("") }} type="button">{label}</button>)}</div>
      {action === "extend" ? <div className="space-y-3"><div className="grid grid-cols-4 gap-2">{[7, 30, 90, 365].map(value => <button aria-pressed={days === value} className={`min-h-10 rounded-lg border text-sm ${days === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200"}`} disabled={saving} key={value} onClick={() => setDays(value)} type="button">{value} ngày</button>)}</div><label className="block text-xs font-semibold">Số ngày sử dụng<input aria-label="Số ngày sử dụng" className="mt-1 min-h-10 w-full rounded-lg border px-3 text-sm" disabled={saving} type="number" min={1} max={3650} value={days} onChange={event => setDays(Number(event.target.value))} /></label><p className="text-xs leading-5 text-slate-500">Từng quyển còn hạn: cộng tiếp từ hạn của quyển đó. Hết hạn hoặc chưa cấp: tính từ hôm nay.</p></div> : action === "set_expiry" ? <label className="block text-xs font-semibold">Ngày hết hạn<input aria-label="Ngày hết hạn" className="mt-1 min-h-10 w-full rounded-lg border px-3 text-sm" disabled={saving} type="date" min={localDay(new Date())} value={expiry} onChange={event => setExpiry(event.target.value)} /><span className="mt-1 block font-normal text-slate-500">Đến 23:59:59 ngày đã chọn (giờ Việt Nam).</span></label> : <p className="rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700">Hủy quyền ngay đối với quyển được chọn. Quyển còn lại và bài làm đã lưu được giữ nguyên.</p>}
      {progress ? <p role="status" className="text-xs text-blue-700">{progress}</p> : null}
      {error ? <p className="text-xs leading-5 text-red-700" role="alert">{error}</p> : null}
      <button className={`min-h-11 rounded-lg px-3 text-sm font-bold text-white disabled:opacity-50 ${action === "revoke" ? "bg-red-600" : "bg-blue-600"}`} disabled={saving || !ids.length || !volumes.length || (action === "set_expiry" ? !expiry : action === "extend" ? !Number.isInteger(days) || days < 1 || days > 3650 : false)} onClick={() => void save()} type="button">{saving ? "Đang lưu…" : `${action === "revoke" ? "Hủy quyền" : action === "set_expiry" ? "Lưu thời hạn" : `Cấp / Gia hạn ${days} ngày`} · Quyển ${volumes.join(", ") || "…"} · ${ids.length} tài khoản`}</button>
    </DialogContent></Dialog>
  </>
}
