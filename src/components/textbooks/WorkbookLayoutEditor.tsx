"use client"

import { useRef, useState, type PointerEvent } from "react"
import type { WorkbookField, WorkbookPage } from "@/lib/textbooks/workbook"
import WorkbookAnswerKeyEditor from "@/components/textbooks/WorkbookAnswerKeyEditor"

type Rect = WorkbookField["rect"]
type Zone = { key: string; label: string; fieldId: string; collection?: "options" | "sources" | "targets"; nodeId?: string; rect: Rect }
export default function WorkbookLayoutEditor({ bookId, pageNumber, workbook, onSaved, canManageAnswerKeys = false }: { bookId: string; pageNumber: number; workbook: WorkbookPage; onSaved: () => void; canManageAnswerKeys?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(workbook)
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const surface = useRef<HTMLDivElement>(null)
  const drag = useRef<{ zone: Zone; x: number; y: number; width: number; height: number; resize: boolean } | null>(null)
  const zones: Zone[] = draft.fields.filter(field => !field.is_context).flatMap(field => field.kind === "text" ? [{ key: field.id, fieldId: field.id, label: field.label, rect: field.rect }] : (field.kind === "choice" ? ["options" as const] : ["sources" as const, "targets" as const]).flatMap(collection => field[collection].map(node => ({ key: `${field.id}:${collection}:${node.id}`, fieldId: field.id, collection, nodeId: node.id, label: `${field.label} · ${node.label}`, rect: node.rect }))))
  const active = zones.find(zone => zone.key === selected)
  const update = (zone: Zone, rect: Rect) => {
    const safe = { x: Math.max(0, Math.min(rect.x, 0.99)), y: Math.max(0, Math.min(rect.y, 0.99)), width: Math.max(0.005, rect.width), height: Math.max(0.005, rect.height) }
    safe.width = Math.min(safe.width, 1 - safe.x); safe.height = Math.min(safe.height, 1 - safe.y)
    setDraft(current => ({ ...current, fields: current.fields.map(field => field.id !== zone.fieldId ? field : zone.collection ? { ...field, [zone.collection]: field[zone.collection].map(node => node.id === zone.nodeId ? { ...node, rect: safe, hit_rect: undefined, port: undefined } : node) } : { ...field, rect: safe }) }))
  }
  const start = (event: PointerEvent<HTMLButtonElement>, zone: Zone) => {
    event.preventDefault(); event.stopPropagation()
    const bounds = surface.current!.getBoundingClientRect()
    drag.current = { zone, x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height, resize: (event.target as HTMLElement).dataset.resize === "true" }
    setSelected(zone.key)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = drag.current
    if (!gesture) return
    const dx = (event.clientX - gesture.x) / gesture.width; const dy = (event.clientY - gesture.y) / gesture.height
    const original = gesture.zone.rect
    update(gesture.zone, gesture.resize ? { ...original, width: original.width + dx, height: original.height + dy } : { ...original, x: original.x + dx, y: original.y + dy })
  }
  const save = async () => {
    setSaving(true); setError(null)
    try {
      const response = await fetch(`/api/textbooks/${bookId}/workbook`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageNumber, workbook: draft }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Chưa lưu được vùng làm bài")
      setEditing(false); onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được") } finally { setSaving(false) }
  }
  return <>
    <div className="absolute right-2 top-2 z-30 flex gap-1 rounded-lg bg-white/95 p-1 text-[10px] font-bold shadow">
      {!editing && canManageAnswerKeys ? <WorkbookAnswerKeyEditor bookId={bookId} pageNumber={pageNumber} workbook={workbook} onSaved={onSaved} /> : null}
      {!editing ? <span className={`self-center px-1 ${workbook.review_status === "reviewed" ? "text-emerald-700" : "text-amber-700"}`}>{workbook.review_status === "reviewed" ? "Đã duyệt vùng" : "Vùng cần kiểm tra"}</span> : null}
      {editing ? <><button className="rounded bg-blue-600 px-2 py-1.5 text-white disabled:opacity-50" disabled={saving} onClick={() => void save()} type="button">{saving ? "Đang lưu…" : "Lưu vùng"}</button><button className="rounded bg-blue-50 px-2 py-1.5 text-blue-700" disabled={draft.fields.length >= 80} onClick={() => { const id = `p${pageNumber}-custom-${crypto.randomUUID().slice(0, 8)}`; setDraft(current => ({ ...current, fields: [...current.fields, { id, kind: "text", label: "Ô trả lời bổ sung", section: "writing", rect: { x: 0.4, y: 0.4, width: 0.2, height: 0.025 }, options: [], sources: [], targets: [] }] })); setSelected(id) }} type="button">+ Ô điền</button><button className="rounded px-2 py-1.5 text-slate-600" onClick={() => { setEditing(false); setDraft(workbook); setSelected(null) }} type="button">Hủy</button></> : <button className="rounded px-2 py-1.5 text-blue-700" onClick={() => setEditing(true)} type="button">Chỉnh vùng làm bài</button>}
    </div>
    {editing ? <div className="pointer-events-none absolute inset-0 z-20" ref={surface}>
      {zones.map(zone => <button aria-label={`Chỉnh ${zone.label}`} className={`pointer-events-auto absolute touch-none rounded-sm border-2 ${zone.key === selected ? "border-orange-600 bg-orange-200/30" : "border-violet-500 bg-violet-100/20"}`} key={zone.key} onPointerCancel={() => { drag.current = null }} onPointerDown={event => start(event, zone)} onPointerMove={move} onPointerUp={() => { drag.current = null }} style={{ left: `${zone.rect.x * 100}%`, top: `${zone.rect.y * 100}%`, width: `${zone.rect.width * 100}%`, height: `${zone.rect.height * 100}%` }} type="button"><span aria-hidden="true" className="absolute -bottom-1 -right-1 size-3 rounded-sm bg-orange-600" data-resize="true" /></button>)}
      <div className="pointer-events-auto absolute inset-x-2 bottom-2 rounded-xl border bg-white/95 p-2 text-[10px] shadow-lg">
        <p className="truncate font-bold">{active ? active.label : "Chọn vùng để kéo vị trí hoặc kéo góc dưới để đổi kích thước."}</p>
        {active ? <div className="mt-1 flex flex-wrap items-end gap-2">{(["x", "y", "width", "height"] as const).map((key, index) => <label className="flex flex-col gap-0.5" key={key}>{["Trái (%)", "Trên (%)", "Rộng (%)", "Cao (%)"][index]}<input aria-label={["Trái (%)", "Trên (%)", "Rộng (%)", "Cao (%)"][index]} className="w-14 rounded border p-1 text-xs" max="100" min="0" onChange={event => update(active, { ...active.rect, [key]: Number(event.target.value) / 100 })} step="0.1" type="number" value={Number((active.rect[key] * 100).toFixed(1))} /></label>)}<button className="rounded bg-red-50 px-2 py-1.5 font-bold text-red-700" onClick={() => { setDraft(current => ({ ...current, fields: current.fields.filter(field => field.id !== active.fieldId) })); setSelected(null) }} type="button">Xóa câu này</button></div> : null}
        {error ? <p className="mt-1 text-red-700" role="alert">{error}</p> : null}
      </div>
    </div> : null}
  </>
}
