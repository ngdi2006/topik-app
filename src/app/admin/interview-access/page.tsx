"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, CalendarClock, KeyRound, Loader2, Search, ShieldCheck, Sparkles, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type Access = { id: string; active: boolean; source: 'sepay' | 'admin_internal' | 'promotion'; startsAt: string; expiresAt: string; planName?: string }
type ManagedUser = { id: string; email: string; name: string; groupName: string; role: string; access: Access | null }
type Stats = { totalUsers: number; activeAccess: number; internalAccess: number; apiCalls: number; characters: number }

const EMPTY_STATS: Stats = { totalUsers: 0, activeAccess: 0, internalAccess: 0, apiCalls: 0, characters: 0 }

function formatDate(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
}

function sourceLabel(source?: Access['source']) {
  if (source === 'sepay') return 'SePay'
  if (source === 'admin_internal') return 'Nội bộ'
  if (source === 'promotion') return 'Khuyến mãi'
  return '—'
}

export default function InterviewAccessAdminPage() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ManagedUser | null>(null)
  const [days, setDays] = useState(30)
  const [action, setAction] = useState<'extend' | 'set_expiry' | 'revoke'>('extend')
  const [expiryDate, setExpiryDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/interview-access', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Không thể tải dữ liệu')
      setUsers(payload.users || [])
      setStats(payload.stats || EMPTY_STATS)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi')
    if (!keyword) return users
    return users.filter((user) => `${user.name} ${user.email} ${user.groupName}`.toLocaleLowerCase('vi').includes(keyword))
  }, [search, users])

  async function activate() {
    if (!selected) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/interview-access', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selected.id, days, note: `Cấp nội bộ ${days} ngày` }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Không thể kích hoạt')
      toast.success(`Đã cộng ${days} ngày cho ${selected.name}`)
      setSelected(null)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể kích hoạt')
    } finally {
      setSubmitting(false)
    }
  }

  async function adjust() {
    if (!selected || action === 'extend') return void activate()
    if (action === 'revoke' && !confirm(`Hủy quyền Phỏng vấn Vòng 2 của ${selected.name} ngay?`)) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/interview-access', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selected.id, action, expires_at: action === 'set_expiry' ? `${expiryDate}T23:59:59+07:00` : undefined }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Không thể điều chỉnh quyền')
      toast.success(action === 'revoke' ? 'Đã hủy quyền truy cập' : 'Đã cập nhật ngày hết hạn')
      setSelected(null)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể điều chỉnh quyền')
    } finally {
      setSubmitting(false)
    }
  }

  const statCards = [
    { label: 'Đang có quyền', value: stats.activeAccess, icon: ShieldCheck, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Tài khoản nội bộ', value: stats.internalAccess, icon: KeyRound, tone: 'text-violet-700 bg-violet-50' },
    { label: 'Lượt API đã ghi nhận', value: stats.apiCalls, icon: Activity, tone: 'text-blue-700 bg-blue-50' },
    { label: 'Tổng học viên', value: stats.totalUsers, icon: Users, tone: 'text-slate-700 bg-slate-100' },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700"><Sparkles className="size-3" /> Phỏng vấn Vòng 2</div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Quản lý gói học viên</h1>
          <p className="mt-1 text-sm text-slate-600">Kích hoạt nội bộ, kiểm tra hạn dùng và theo dõi mức sử dụng.</p>
        </div>
        <Button onClick={() => void loadData()} variant="outline">Làm mới dữ liệu</Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={label}>
            <div className={`flex size-9 items-center justify-center rounded-xl ${tone}`}><Icon className="size-4.5" /></div>
            <p className="mt-3 text-2xl font-black tabular-nums text-slate-950">{value.toLocaleString('vi-VN')}</p>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-black text-slate-950">Danh sách học viên</h2><p className="text-xs text-slate-500">Gói nội bộ được cộng theo tháng, mỗi tháng 30 ngày.</p></div>
          <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, email hoặc nhóm..." value={search} /></div>
        </div>

        {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="size-7 animate-spin text-violet-600" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Học viên</th><th className="px-4 py-3">Nhóm</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Nguồn</th><th className="px-4 py-3">Hết hạn</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr className="hover:bg-slate-50/70" key={user.id}>
                    <td className="px-4 py-3"><p className="font-bold text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td>
                    <td className="px-4 py-3 text-slate-600">{user.groupName || '—'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${user.access?.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.access?.active ? 'Đang hoạt động' : 'Chưa kích hoạt'}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{sourceLabel(user.access?.source)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{formatDate(user.access?.expiresAt)}</td>
                    <td className="px-4 py-3 text-right"><Button onClick={() => { setSelected(user); setDays(30); setAction('extend'); setExpiryDate(user.access?.expiresAt?.slice(0, 10) || '') }} size="sm" variant={user.access?.active ? 'outline' : 'default'}>{user.access?.active ? 'Quản lý' : 'Kích hoạt'}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredUsers.length ? <p className="py-12 text-center text-sm text-slate-500">Không tìm thấy học viên phù hợp.</p> : null}
          </div>
        )}
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader><DialogTitle>Quản lý gói nội bộ</DialogTitle><DialogDescription>{selected?.name} · {selected?.email}<br />Cộng ngày, sửa hạn dùng hoặc hủy quyền mà không xóa lịch sử học.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">{([['extend', 'Cộng ngày'], ['set_expiry', 'Đặt hạn'], ['revoke', 'Hủy quyền']] as const).map(([value, label]) => <button className={`rounded-lg px-2 py-2 text-xs font-bold ${action === value ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600'}`} key={value} onClick={() => setAction(value)} type="button">{label}</button>)}</div>
            {action === 'extend' ? <><p className="text-xs font-black uppercase tracking-wide text-slate-500">Số ngày cấp thêm</p><div className="grid grid-cols-4 gap-2">{[10, 30, 60, 90].map((value) => <button className={`rounded-xl border px-2 py-2 text-sm font-bold ${days === value ? 'border-violet-600 bg-violet-50 text-violet-700 ring-2 ring-violet-100' : 'border-slate-200 hover:bg-slate-50'}`} key={value} onClick={() => setDays(value)} type="button">{value}</button>)}</div><Input min={1} max={3650} onChange={(event) => setDays(Number(event.target.value))} type="number" value={days} /></> : null}
            {action === 'set_expiry' ? <><p className="text-xs font-black uppercase tracking-wide text-slate-500">Ngày hết hạn mới</p><Input min={new Date().toISOString().slice(0, 10)} onChange={(event) => setExpiryDate(event.target.value)} type="date" value={expiryDate} /></> : null}
            {action === 'revoke' ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">Khóa quyền ngay nhưng vẫn giữ tài khoản, kết quả học và lịch sử quản trị.</div> : null}
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900"><CalendarClock className="size-4 shrink-0" /> Tài khoản nội bộ chỉ được đăng nhập trên một thiết bị.</div>
            <Button className={`w-full ${action === 'revoke' ? 'bg-red-600 hover:bg-red-700' : ''}`} disabled={submitting || (action === 'set_expiry' && !expiryDate)} onClick={() => void adjust()}>{submitting ? <Loader2 className="size-4 animate-spin" /> : action === 'extend' ? `${selected?.access?.active ? 'Cộng thêm' : 'Kích hoạt'} ${days} ngày` : action === 'set_expiry' ? 'Lưu ngày hết hạn' : 'Hủy quyền ngay'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
