"use client"
import { useState } from 'react'
import { LibraryBig } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { referenceBookCodes } from '@/lib/textbooks/catalog'
import type { WorkbookVolumeAccess } from '@/lib/textbooks/workbook-entitlement'
import { referenceLabels, type ReferenceAccess } from '@/lib/textbooks/reference-entitlement'
import type { ReferenceAccessResult, ReferenceAccessUpdate } from '@/lib/textbooks/reference-access-admin'

const bookOptions = ['eps-topik-2025-workbook-1', 'eps-topik-2025-workbook-2', ...referenceBookCodes] as const
type ManagedBookCode = typeof bookOptions[number]
const labels: Record<ManagedBookCode, string> = { ...referenceLabels, 'eps-topik-2025-workbook-1': 'Sách bài tập quyển 1', 'eps-topik-2025-workbook-2': 'Sách bài tập quyển 2' }
type Props = { userId?: string; userIds?: string[]; access?: ReferenceAccess; workbookAccess?: WorkbookVolumeAccess; onChanged: (updates: ReferenceAccessUpdate[]) => void; showLabel?: boolean }
export default function ReferenceAccessControl({ userId, userIds, access, workbookAccess, onChanged, showLabel }: Props) {
  const bulk = userIds !== undefined, ids = userIds ?? (userId ? [userId] : [])
  const [open, setOpen] = useState(false), [saving, setSaving] = useState(false)
  const [books, setBooks] = useState<ManagedBookCode[]>([bookOptions[0]])
  const [action, setAction] = useState<'extend' | 'set_expiry' | 'revoke'>('extend')
  const [days, setDays] = useState(30), [expiry, setExpiry] = useState(''), [error, setError] = useState('')
  const accessFor = (book: ManagedBookCode) => book === 'eps-topik-2025-workbook-1' ? workbookAccess?.[1] : book === 'eps-topik-2025-workbook-2' ? workbookAccess?.[2] : access?.[book]
  const save = async () => {
    setSaving(true); setError('')
    let successes = 0
    const failures: string[] = []
    try {
      const targets = [...new Set(ids)]
      const change = { books, ...(action === 'extend' ? { action, days } : action === 'set_expiry' ? { action, expires_at: `${expiry}T23:59:59+07:00` } : { action }) }
      for (let offset = 0; offset < targets.length; offset += 100) {
        const response = await fetch(bulk ? '/api/admin/users/bulk-reference-access' : `/api/admin/users/${userId}/reference-access`, { method: bulk ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bulk ? { ...change, userIds: targets.slice(offset, offset + 100) } : change) })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Chưa cập nhật được quyền')
        const results: ReferenceAccessResult[] = bulk ? data.results : [data]
        const updates = results.filter((r): r is { ok: true } & ReferenceAccessUpdate => r.ok)
        if (updates.length) onChanged(updates)
        successes += updates.length
        failures.push(...results.flatMap(r => r.ok ? [] : [r.error]))
      }
      if (failures.length) setError(`${successes} tài khoản thành công; ${failures.length} chưa cập nhật. ${[...new Set(failures)].join('. ')}`)
      else setOpen(false)
    } catch (cause) { setError(`${cause instanceof Error ? cause.message : 'Chưa cập nhật được quyền'}. Đã xác nhận ${successes} thành công. Hãy kiểm tra thời hạn trước khi thử lại nếu mất kết nối.`) }
    finally { setSaving(false) }
  }
  return <>
    <button aria-label={bulk ? 'Cấp quyền sách và tài liệu hàng loạt' : 'Quản lý quyền sách và tài liệu'} title="Sách bài tập, từ vựng, văn hóa và ngữ pháp" className={`flex min-h-8 items-center justify-center gap-2 rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 ${bulk || showLabel ? 'px-3 py-2' : 'size-8'}`} disabled={!ids.length} onClick={() => { setBooks([bookOptions[0]]); setAction('extend'); setDays(30); setExpiry(''); setError(''); setOpen(true) }} type="button"><LibraryBig className="size-4" />{bulk ? `Sách & tài liệu (${ids.length})` : showLabel ? 'Quyền sách & tài liệu' : null}</button>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value) }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto"><DialogHeader><DialogTitle>{bulk ? 'Cấp quyền sách và tài liệu hàng loạt' : 'Quyền sách và tài liệu EPS'}</DialogTitle></DialogHeader>
      <p className="text-xs leading-5 text-slate-500">{bulk ? `Áp dụng cho ${ids.length} tài khoản được chọn.` : 'Mỗi tài liệu có thời hạn riêng.'} Chỉ thay đổi các tài liệu được chọn.</p>
      <fieldset disabled={saving} className="space-y-2"><legend className="mb-2 text-xs font-semibold">Chọn tài liệu</legend>{bookOptions.map(book => <label key={book} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${books.includes(book) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}><input type="checkbox" className="mt-0.5 size-4" checked={books.includes(book)} onChange={event => setBooks(current => event.target.checked ? [...current, book] : current.filter(value => value !== book))} /><span className="text-sm font-semibold">{labels[book]}{!bulk ? <span className="mt-1 block text-xs font-normal text-slate-500">{accessFor(book)?.active ? 'Còn hạn' : accessFor(book)?.expiresAt ? 'Hết hạn / Đã hủy' : 'Chưa kích hoạt'}{accessFor(book)?.expiresAt ? ` · Đến ${new Date(accessFor(book)!.expiresAt!).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' })}` : ''}</span> : null}</span></label>)}</fieldset>
      <div className="grid grid-cols-3 gap-1">{([['extend', 'Kích hoạt / Gia hạn'], ['set_expiry', 'Đặt hạn'], ['revoke', 'Thu hồi']] as const).map(([value, label]) => <button type="button" key={value} disabled={saving} aria-pressed={action === value} className={`min-h-10 rounded-lg px-1 text-xs font-bold ${action === value ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100'}`} onClick={() => setAction(value)}>{label}</button>)}</div>
      {action === 'extend' ? <label className="text-xs font-semibold">Số ngày sử dụng<input className="mt-1 min-h-10 w-full rounded-lg border px-3" type="number" min={1} max={3650} disabled={saving} value={days} onChange={e => setDays(Number(e.target.value))} /><span className="mt-1 block font-normal text-slate-500">Còn hạn: cộng từ hạn hiện tại. Chưa có quyền/hết hạn: tính từ hôm nay.</span></label> : action === 'set_expiry' ? <label className="text-xs font-semibold">Ngày hết hạn<input className="mt-1 min-h-10 w-full rounded-lg border px-3" type="date" disabled={saving} value={expiry} onChange={e => setExpiry(e.target.value)} /><span className="mt-1 block font-normal text-slate-500">Đến 23:59:59 ngày đã chọn, giờ Việt Nam.</span></label> : <p className="text-xs text-red-700">Thu hồi ngay quyền các tài liệu được chọn.</p>}
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
      <button type="button" disabled={saving || !books.length || (action === 'extend' && (!Number.isInteger(days) || days < 1 || days > 3650)) || (action === 'set_expiry' && !expiry)} className="min-h-11 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50" onClick={() => void save()}>{saving ? 'Đang cập nhật...' : 'Lưu quyền sách và tài liệu'}</button>
    </DialogContent></Dialog>
  </>
}
