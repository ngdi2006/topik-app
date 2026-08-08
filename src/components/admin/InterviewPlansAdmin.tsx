"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type InterviewPlan = {
  id: string
  code: string
  name: string
  duration_days: number
  price_vnd: number
  is_active: boolean
  display_order: number
}

const EMPTY_FORM = { name: "", duration_days: "10", price_vnd: "", display_order: "0", is_active: true }

export function InterviewPlansAdmin() {
  const [plans, setPlans] = useState<InterviewPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InterviewPlan | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    let active = true
    void fetch("/api/admin/interview-plans", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || "Không thể tải danh sách gói")
        if (active) setPlans(payload.data || [])
      })
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Không thể tải danh sách gói"))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(plan: InterviewPlan) {
    setEditing(plan)
    setForm({
      name: plan.name,
      duration_days: String(plan.duration_days),
      price_vnd: String(plan.price_vnd),
      display_order: String(plan.display_order),
      is_active: plan.is_active,
    })
    setDialogOpen(true)
  }

  async function savePlan() {
    const durationDays = Number(form.duration_days)
    const priceVnd = Number(form.price_vnd)
    if (!form.name.trim() || !Number.isInteger(durationDays) || durationDays < 1 || !Number.isInteger(priceVnd) || priceVnd < 0) {
      toast.error("Vui lòng nhập tên, thời hạn và giá hợp lệ")
      return
    }
    setSaving(true)
    try {
      const response = await fetch(editing ? `/api/admin/interview-plans/${editing.id}` : "/api/admin/interview-plans", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          duration_days: durationDays,
          price_vnd: priceVnd,
          display_order: Number(form.display_order || 0),
          is_active: form.is_active,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Không thể lưu gói")
      setPlans((current) => editing
        ? current.map((plan) => plan.id === payload.data.id ? payload.data : plan).sort((a, b) => a.display_order - b.display_order)
        : [...current, payload.data].sort((a, b) => a.display_order - b.display_order))
      setDialogOpen(false)
      toast.success(editing ? "Đã cập nhật gói Vòng 2" : "Đã thêm gói Vòng 2")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu gói")
    } finally {
      setSaving(false)
    }
  }

  async function togglePlan(plan: InterviewPlan) {
    try {
      const response = await fetch(`/api/admin/interview-plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...plan, is_active: !plan.is_active }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Không thể cập nhật trạng thái")
      setPlans((current) => current.map((item) => item.id === plan.id ? payload.data : item))
      toast.success(plan.is_active ? "Đã ẩn gói" : "Đã hiển thị gói")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái")
    }
  }

  async function deletePlan(plan: InterviewPlan) {
    if (!confirm(`Xóa gói “${plan.name}”?`)) return
    try {
      const response = await fetch(`/api/admin/interview-plans/${plan.id}`, { method: "DELETE" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Không thể xóa gói")
      setPlans((current) => current.filter((item) => item.id !== plan.id))
      toast.success("Đã xóa gói")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa gói")
    }
  }

  const formatPrice = (price: number) => `${new Intl.NumberFormat("vi-VN").format(price)} đ`

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm"><ShieldCheck className="size-5" /></span>
          <div><h2 className="font-black text-slate-950">Gói Phỏng vấn Vòng 2</h2><p className="text-xs text-slate-600">Giá và thời hạn tại đây được hiển thị trực tiếp cho học viên.</p></div>
        </div>
        <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-700"><Plus className="mr-2 size-4" />Thêm gói Vòng 2</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 text-left font-semibold">Tên gói</th><th className="px-4 py-3 text-center font-semibold">Thời hạn</th><th className="px-4 py-3 text-right font-semibold">Giá</th><th className="px-4 py-3 text-center font-semibold">Thứ tự</th><th className="px-4 py-3 text-center font-semibold">Trạng thái</th><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr> : null}
            {!loading && plans.map((plan) => (
              <tr key={plan.id} className={plan.is_active ? "bg-white" : "bg-slate-50 opacity-60"}>
                <td className="px-4 py-3"><strong className="block text-slate-900">{plan.name}</strong><span className="text-[10px] text-slate-400">{plan.code}</span></td>
                <td className="px-4 py-3 text-center"><span className="inline-flex items-center gap-1 font-semibold"><CalendarDays className="size-3.5 text-violet-600" />{plan.duration_days} ngày</span></td>
                <td className="px-4 py-3 text-right text-base font-black text-violet-700">{formatPrice(plan.price_vnd)}</td>
                <td className="px-4 py-3 text-center">{plan.display_order}</td>
                <td className="px-4 py-3 text-center"><button onClick={() => void togglePlan(plan)}><Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? "Hiển thị" : "Ẩn"}</Badge></button></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(plan)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" className="text-red-600" onClick={() => void deletePlan(plan)}><Trash2 className="size-4" /></Button></div></td>
              </tr>
            ))}
            {!loading && plans.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Chưa có gói Phỏng vấn Vòng 2</td></tr> : null}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[430px]">
          <DialogHeader><DialogTitle>{editing ? "Sửa gói Phỏng vấn Vòng 2" : "Thêm gói Phỏng vấn Vòng 2"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Tên gói</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="VD: Ôn cấp tốc 15 ngày" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Thời hạn (ngày)</Label><Input type="number" min={1} value={form.duration_days} onChange={(event) => setForm({ ...form, duration_days: event.target.value })} /></div>
              <div className="space-y-2"><Label>Giá (VNĐ)</Label><Input type="number" min={0} step={1000} value={form.price_vnd} onChange={(event) => setForm({ ...form, price_vnd: event.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Thứ tự</Label><Input type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} /></div>
              <div className="space-y-2"><Label>Trạng thái</Label><Button type="button" variant={form.is_active ? "default" : "secondary"} className="w-full" onClick={() => setForm({ ...form, is_active: !form.is_active })}>{form.is_active ? "Hiển thị" : "Ẩn"}</Button></div>
            </div>
            <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">Học viên chỉ thấy các gói đang bật. Gói đã phát sinh giao dịch nên chuyển sang Ẩn thay vì xóa.</p>
            <Button onClick={() => void savePlan()} disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700">{saving ? <Loader2 className="size-4 animate-spin" /> : null}{editing ? "Cập nhật gói" : "Tạo gói"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
