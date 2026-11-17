"use client"

import { useEffect, useRef, useState } from "react"
import { answerKey, type WorkbookField, type WorkbookPage, type WorkbookValue } from "@/lib/textbooks/workbook"
import registry from "@/lib/textbooks/workbook-particle-banks.json"

type Bank = { id: string; tokens: string[]; fieldIds: string[]; rects: Record<string, WorkbookField["rect"]>; x: number; y: number; width: number }
const banksFor = (workbook: WorkbookPage) => (registry as Record<string, Bank[]>)[workbook.image_hash] ?? []

// Match the verified page image, not page number alone (other books reuse numbers).
export function wordBankFields(workbook: WorkbookPage) {
  const ids = new Set(banksFor(workbook).flatMap(bank => bank.fieldIds))
  return workbook.fields.filter(field => field.kind === "text" && ids.has(field.id) && !field.is_context)
}

type Props = {
  workbook: WorkbookPage
  pageNumber: number
  answers: Record<string, WorkbookValue>
  onChange: (pageNumber: number, fieldId: string, value: WorkbookValue) => void
  onEdit?: (field: WorkbookField) => void
}
export default function WorkbookWordBank(props: Props) {
  return banksFor(props.workbook).map(bank => <ParticleBank key={bank.id} {...props} bank={bank} />)
}

function ParticleBank({ workbook, pageNumber, answers, onChange, onEdit, bank }: Props & { bank: Bank }) {
  const compact = bank.tokens.length > 4
  const [expanded, setExpanded] = useState(!compact)
  const [pendingField, setPendingField] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ text: string; x: number; y: number } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const drag = useRef<{ text: string; x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  const fields = wordBankFields(workbook).filter(field => bank.fieldIds.includes(field.id))
  const cancelDrag = () => { if (drag.current?.moved) suppressClick.current = true; drag.current = null; setGhost(null); setOver(null) }
  useEffect(() => {
    const cancel = () => { if (drag.current?.moved) suppressClick.current = true; drag.current = null; setGhost(null); setOver(null) }
    window.addEventListener("blur", cancel)
    return () => window.removeEventListener("blur", cancel)
  }, [])
  const dropTarget = (x: number, y: number) => {
    const targets = root.current?.querySelectorAll<HTMLElement>("[data-word-drop]")
    let closest: { id: string; distance: number } | null = null
    targets?.forEach(target => {
      const rect = target.getBoundingClientRect()
      // A small snap area makes short particles easier to drop on touch screens.
      const dx = Math.max(rect.left - x, 0, x - rect.right)
      const dy = Math.max(rect.top - y, 0, y - rect.bottom)
      const distance = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2))
      if (dx <= 12 && dy <= 5 && (!closest || distance < closest.distance)) closest = { id: target.dataset.wordDrop!, distance }
    })
    return (closest as { id: string; distance: number } | null)?.id ?? null
  }
  if (!fields.length) return null
  return <div ref={root}>
    {compact ? <button type="button" data-word-bank-toggle aria-expanded={expanded} onClick={() => { setPendingField(null); setExpanded(!expanded) }} className="pointer-events-auto absolute z-20 whitespace-nowrap rounded-lg border border-blue-200 bg-white px-1.5 py-1 font-medium text-blue-700 shadow-sm hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600" style={{ left: `${bank.x * 100}%`, top: `${bank.y * 100}%`, fontSize: "clamp(9px, 1.3cqw, 13px)" }}>Trợ từ <span aria-hidden="true">{expanded ? "⌃" : "⌄"}</span></button> : null}
    <div data-word-bank hidden={!expanded} className="pointer-events-auto absolute z-30 rounded-lg border border-blue-200 bg-white/95 shadow-sm" style={{ left: `${(compact ? .35 : bank.x) * 100}%`, top: `${bank.y * 100}%`, width: `${(compact ? .6 : bank.width) * 100}%`, maxWidth: compact ? 420 : 260, padding: "clamp(4px, 0.6cqw, 6px)", opacity: ghost ? 0 : 1, pointerEvents: ghost ? "none" : "auto" }}>
      {compact ? <button type="button" aria-label="Đóng bảng trợ từ" className="float-right px-1 text-xs text-slate-400 hover:text-slate-700" onClick={() => { setExpanded(false); setPendingField(null) }}>×</button> : null}
      <p className="mb-1 whitespace-nowrap leading-tight text-slate-500" style={{ fontSize: "clamp(8px, 1.1cqw, 10px)" }}>Chọn hoặc kéo vào chỗ trống</p>
      <div className="grid grid-cols-4" style={{ gap: "clamp(2px, 0.4cqw, 4px)" }}>
        {bank.tokens.map(text => <button key={text} type="button" data-word-token={text} draggable={false} onDragStart={event => event.preventDefault()}
          aria-label={`Chọn ${text}`} aria-pressed={selected === text}
          className={`min-w-0 touch-none select-none rounded-md border p-0 font-semibold transition-[background-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-sm active:scale-95 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-blue-600 ${selected === text ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100"}`}
          style={{ minHeight: "clamp(26px, 3.5cqw, 36px)", fontSize: "clamp(12px, 2cqw, 18px)" }}
          onClick={event => {
            if (event.detail === 0 || !suppressClick.current) {
              if (pendingField) { onChange(pageNumber, pendingField, text); setPendingField(null); setSelected(null) }
              else setSelected(selected === text ? null : text)
              if (compact) setExpanded(false)
            }
            suppressClick.current = false
            drag.current = null
          }}
          onKeyDown={event => { if (event.key === "Escape") { setSelected(null); setPendingField(null); if (compact) setExpanded(false) } }}
          onPointerDown={event => {
            if (event.button !== 0) return
            suppressClick.current = false
            drag.current = { text, x: event.clientX, y: event.clientY, moved: false }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={event => {
            const start = drag.current
            if (!start) return
            if (event.buttons === 0) { cancelDrag(); return }
            if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) start.moved = true
            if (start.moved) {
              setGhost({ text, x: event.clientX, y: event.clientY })
              setOver(dropTarget(event.clientX, event.clientY))
            }
          }}
          onPointerUp={event => {
            if (!drag.current) return
            const moved = drag.current?.moved
            suppressClick.current = !!moved
            drag.current = null
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            if (moved) {
              const target = dropTarget(event.clientX, event.clientY)
              if (target) {
                onChange(pageNumber, target, text)
                setSelected(null)
                setPendingField(null)
                if (compact) setExpanded(false)
              }
            }
            setGhost(null)
            setOver(null)
          }}
          onPointerCancel={cancelDrag}
          onLostPointerCapture={cancelDrag}
        >{text}</button>)}
      </div>
      {compact && pendingField && answers[answerKey(pageNumber, pendingField)] ? <button type="button" onClick={() => { onChange(pageNumber, pendingField, ""); setSelected(null); setPendingField(null); setExpanded(false) }} className="mr-3 mt-1 min-h-7 text-xs text-slate-500 hover:text-red-600">Xóa phần ghép</button> : null}
      {compact && pendingField && onEdit ? <button type="button" onClick={() => { const field = fields.find(field => field.id === pendingField); setExpanded(false); setPendingField(null); if (field) onEdit(field) }} className="mt-1 min-h-7 text-xs text-slate-500 hover:text-blue-700">Nhập phần ghép khác…</button> : null}
    </div>
    {fields.map(field => {
      const value = answers[answerKey(pageNumber, field.id)]
      const text = typeof value === "string" ? value : ""
      const rect = bank.rects[field.id] ?? field.rect
      return <button key={field.id} type="button" data-word-drop={field.id} data-workbook-field={field.id}
        aria-label={`${field.label}: ${text || "Chọn cụm rồi chạm để điền"}`}
        title="Chọn cụm để thay đáp án; nhấn Delete để xóa"
        data-word-over={over === field.id ? "true" : undefined}
        className={`pointer-events-auto absolute flex items-center justify-start border-0 text-left font-bold text-blue-600 transition-[background-color,box-shadow] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${over === field.id ? "bg-blue-100 shadow-[inset_0_-2px_0_#2563eb]" : selected ? "bg-blue-50 shadow-[inset_0_-1px_0_#93c5fd]" : "bg-white hover:bg-blue-50"}`}
        style={{ left: `${rect.x * 100}%`, top: `${(rect.y + rect.height / 2) * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%`, minHeight: "clamp(9px, 2.7cqw, 16px)", transform: "translateY(-50%)", fontSize: text.length > 1 ? "clamp(8px, 1.9cqw, 24px)" : "clamp(10px, 2cqw, 24px)", lineHeight: 1 }}
        onClick={() => { if (selected) { onChange(pageNumber, field.id, selected); setSelected(null) } else if (compact) { setPendingField(field.id); setExpanded(true) } else if (text) onChange(pageNumber, field.id, "") }}
        onKeyDown={event => {
          if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); onChange(pageNumber, field.id, "") }
          if (event.key === "Escape") setSelected(null)
        }}
      >{text || <span aria-hidden="true" className="w-3/4 border-b border-dotted border-slate-300" />}</button>
    })}
    <span className="sr-only" role="status">{selected ? `Đã chọn ${selected}. Chạm ô trống để điền.` : ""}</span>
    {ghost ? <span aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-50 rounded-lg bg-blue-600 px-3 py-2 text-lg font-bold text-white shadow-lg will-change-transform" style={{ transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0) translate(-50%, -120%)` }}>{ghost.text}</span> : null}
  </div>
}
