"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import type { WorkbookField, WorkbookPage } from "@/lib/textbooks/workbook"

export default function WorkbookAnswerKeyEditor({ bookId, pageNumber, workbook, onSaved }: { bookId: string; pageNumber: number; workbook: WorkbookPage; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(workbook)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const update = (id: string, key: WorkbookField["answer_key"]) => setDraft(current => ({ ...current, fields: current.fields.map(field => field.id === id ? { ...field, answer_key: key } : field) }))
  const save = async () => {
    setSaving(true); setError("")
    try {
      const response = await fetch(`/api/textbooks/${bookId}/workbook`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageNumber, workbook: draft }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Chưa lưu được đáp án")
      setOpen(false); onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được đáp án") }
    finally { setSaving(false) }
  }
  return <Sheet open={open} onOpenChange={setOpen}>
    <button className="rounded px-2 py-1.5 text-emerald-700" onClick={() => { setDraft(workbook); setOpen(true) }} type="button">Đáp án chuẩn</button>
    <SheetContent aria-describedby={undefined} className="flex w-[min(94vw,440px)] flex-col gap-3 overflow-y-auto p-4"><SheetTitle>Đáp án chuẩn · Trang {pageNumber}</SheetTitle>
      <p className="text-xs leading-5 text-slate-500">Nhập theo đáp án gốc. Chỉ câu được đánh dấu “Đã xác minh” mới dùng để chấm.</p>
      {draft.fields.filter(field => !field.is_context).map(field => {
        const key = field.answer_key ?? { status: "draft" as const, value: field.kind === "match" ? {} : "" }
        return <fieldset className="space-y-2 rounded-lg border p-3 text-xs" key={field.id}><legend className="px-1 font-bold">{field.label}</legend>
          {field.kind === "choice" ? <select aria-label={`Đáp án ${field.label}`} className="min-h-10 w-full rounded border px-2" value={typeof key.value === "string" ? key.value : ""} onChange={event => update(field.id, { ...key, value: event.target.value, status: "draft" })}><option value="">Chọn đáp án</option>{field.options.map(option => <option key={option.id} value={option.id}>{option.id}. {option.label}</option>)}</select> : field.kind === "text" ? <>
            <textarea aria-label={`Đáp án ${field.label}`} className="min-h-16 w-full rounded border p-2" value={typeof key.value === "string" ? key.value : ""} onChange={event => update(field.id, { ...key, value: event.target.value, status: "draft" })} />
            <label className="block">Đáp án khác được chấp nhận (mỗi dòng một đáp án)<textarea className="mt-1 min-h-12 w-full rounded border p-2" value={key.alternatives?.join("\n") ?? ""} onChange={event => update(field.id, { ...key, alternatives: event.target.value.split("\n").filter(value => value.trim()), status: "draft" })} /></label>
          </> : field.sources.filter(source => !source.is_context).map(source => <label className="flex items-center gap-2" key={source.id}><span className="min-w-0 flex-1">{source.label}</span><select className="min-h-10 max-w-[65%] rounded border px-2" value={typeof key.value === "object" ? key.value[source.id] ?? "" : ""} onChange={event => update(field.id, { ...key, value: { ...(typeof key.value === "object" ? key.value : {}), [source.id]: event.target.value }, status: "draft" })}><option value="">Chọn cặp nối</option>{field.targets.filter(target => !target.is_context).map(target => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label>)}
          <label className="flex min-h-9 items-center gap-2"><input type="checkbox" checked={key.status === "reviewed"} onChange={event => update(field.id, { ...key, status: event.target.checked ? "reviewed" : "draft" })} />Đã xác minh theo đáp án chuẩn</label>
          {field.answer_key ? <button type="button" className="text-red-700" onClick={() => update(field.id, undefined)}>Bỏ đáp án câu này</button> : null}
        </fieldset>
      })}
      {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
      <button className="min-h-10 rounded-lg bg-emerald-600 font-bold text-white disabled:opacity-50" type="button" disabled={saving} onClick={() => void save()}>{saving ? "Đang lưu…" : "Lưu đáp án"}</button>
    </SheetContent>
  </Sheet>
}
