'use client'

import { useEffect, useState } from 'react'
import { Clock3, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Interaction = { id: string; timestamp_seconds: number; interaction_type: 'single_choice' | 'true_false' | 'info'; title: string; prompt: string; options: string[]; correct_answer: string | null; explanation: string | null; is_required: boolean; points: number; is_published: boolean }
type Draft = Omit<Interaction, 'id'> & { id?: string }
const emptyDraft: Draft = { timestamp_seconds: 0, interaction_type: 'single_choice', title: '', prompt: '', options: ['', ''], correct_answer: '', explanation: '', is_required: true, points: 1, is_published: true }
const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

export function AdminVideoInteractions({ stepId }: { stepId: string }) {
  const [items, setItems] = useState<Interaction[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    void fetch(`/api/admin/elearning/interactions?stepId=${stepId}`, { signal: controller.signal }).then(response => response.json()).then(data => setItems(data.interactions || [])).catch(error => { if (error.name !== 'AbortError') toast.error('Không thể tải tương tác video') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    setDraft(emptyDraft)
    return () => controller.abort()
  }, [stepId])

  const save = async () => {
    if (!draft.title.trim() || !draft.prompt.trim()) return toast.error('Vui lòng nhập tiêu đề và nội dung')
    const options = draft.interaction_type === 'true_false' ? ['Đúng', 'Sai'] : draft.interaction_type === 'info' ? [] : draft.options.map(value => value.trim()).filter(Boolean)
    if (draft.interaction_type !== 'info' && (!options.length || !draft.correct_answer)) return toast.error('Vui lòng nhập và chọn đáp án đúng')
    setSaving(true)
    try {
      const response = await fetch('/api/admin/elearning/interactions', { method: draft.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, stepId, interactionType: draft.interaction_type, timestampSeconds: draft.timestamp_seconds, correctAnswer: draft.correct_answer, options, isRequired: draft.is_required, isPublished: draft.is_published }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      const saved = data.interaction as Interaction
      setItems(current => [...current.filter(item => item.id !== saved.id), saved].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds))
      setDraft(emptyDraft)
      toast.success(draft.id ? 'Đã cập nhật tương tác' : 'Đã thêm tương tác')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể lưu') } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Xóa tương tác này?')) return
    const response = await fetch(`/api/admin/elearning/interactions?id=${id}`, { method: 'DELETE' })
    if (response.ok) setItems(current => current.filter(item => item.id !== id)); else toast.error('Không thể xóa tương tác')
  }

  if (loading) return <div className="grid min-h-28 place-items-center"><LoaderCircle className="size-5 animate-spin text-blue-600" /></div>
  return <section className="border-t pt-6"><div className="flex items-center justify-between gap-3"><div><h3 className="font-black">Tương tác trong video</h3><p className="mt-1 text-xs text-slate-500">Video tự dừng tại mốc thời gian để học viên trả lời.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{items.length} tương tác</span></div>
    {items.length ? <div className="mt-4 divide-y rounded-xl bg-slate-50 px-4">{items.map(item => <div className="flex items-center gap-3 py-3" key={item.id}><span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-blue-700"><Clock3 className="size-3.5" />{timeLabel(item.timestamp_seconds)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.title}</p><p className="truncate text-xs text-slate-500">{item.prompt}</p></div><button type="button" aria-label="Sửa" onClick={() => setDraft({ ...item, options: [...(item.options || [])] })} className="p-2 text-blue-600"><Pencil className="size-4" /></button><button type="button" aria-label="Xóa" onClick={() => void remove(item.id)} className="p-2 text-red-500"><Trash2 className="size-4" /></button></div>)}</div> : <p className="mt-4 bg-slate-50 p-4 text-center text-sm text-slate-500">Chưa có tương tác trong video.</p>}
    <div className="mt-5 space-y-4 bg-blue-50/60 p-4 sm:p-5"><div className="grid gap-4 sm:grid-cols-3"><label className="block"><span className="mb-1.5 block text-xs font-bold">Mốc thời gian (giây)</span><input type="number" min="0" value={draft.timestamp_seconds} onChange={event => setDraft(current => ({ ...current, timestamp_seconds: Number(event.target.value) }))} className="h-10 w-full rounded-lg border bg-white px-3 text-sm" /></label><label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Loại tương tác</span><select value={draft.interaction_type} onChange={event => setDraft(current => ({ ...current, interaction_type: event.target.value as Draft['interaction_type'], correct_answer: '' }))} className="h-10 w-full rounded-lg border bg-white px-3 text-sm"><option value="single_choice">Trắc nghiệm một đáp án</option><option value="true_false">Đúng / Sai</option><option value="info">Thẻ kiến thức</option></select></label></div>
      <label className="block"><span className="mb-1.5 block text-xs font-bold">Tiêu đề</span><input value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} className="h-10 w-full rounded-lg border bg-white px-3 text-sm" placeholder="Kiểm tra nhanh" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Câu hỏi / nội dung</span><textarea rows={3} value={draft.prompt} onChange={event => setDraft(current => ({ ...current, prompt: event.target.value }))} className="w-full rounded-lg border bg-white p-3 text-sm" /></label>
      {draft.interaction_type === 'single_choice' ? <label className="block"><span className="mb-1.5 block text-xs font-bold">Các đáp án (mỗi dòng một đáp án)</span><textarea rows={4} value={draft.options.join('\n')} onChange={event => setDraft(current => ({ ...current, options: event.target.value.split('\n') }))} className="w-full rounded-lg border bg-white p-3 text-sm" /></label> : null}
      {draft.interaction_type !== 'info' ? <label className="block"><span className="mb-1.5 block text-xs font-bold">Đáp án đúng</span><select value={draft.correct_answer || ''} onChange={event => setDraft(current => ({ ...current, correct_answer: event.target.value }))} className="h-10 w-full rounded-lg border bg-white px-3 text-sm"><option value="">Chọn đáp án</option>{(draft.interaction_type === 'true_false' ? ['Đúng', 'Sai'] : draft.options).filter(Boolean).map(option => <option key={option} value={option}>{option}</option>)}</select></label> : null}
      <label className="block"><span className="mb-1.5 block text-xs font-bold">Giải thích sau khi trả lời</span><textarea rows={2} value={draft.explanation || ''} onChange={event => setDraft(current => ({ ...current, explanation: event.target.value }))} className="w-full rounded-lg border bg-white p-3 text-sm" /></label><div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_required} onChange={event => setDraft(current => ({ ...current, is_required: event.target.checked }))} />Bắt buộc</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_published} onChange={event => setDraft(current => ({ ...current, is_published: event.target.checked }))} />Xuất bản</label></div><div className="flex gap-2"><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{draft.id ? 'Cập nhật' : 'Thêm tương tác'}</button>{draft.id ? <button type="button" onClick={() => setDraft(emptyDraft)} className="rounded-lg bg-white px-4 text-sm font-bold text-slate-600">Hủy sửa</button> : null}</div>
    </div>
  </section>
}
