"use client"

import { useId } from "react"
import type { WorkbookField, WorkbookValue } from "@/lib/textbooks/workbook"

export function isHorizontalTrueFalseField(field: WorkbookField, imageHash?: string) {
  return imageHash === "729672f381afda0434bff2dc107d9192f1ff6bdb074589d1b396970813023df3" && /^p11-f(?:[5-8]|2[0-4])$/.test(field.id) && field.kind === "text" && field.section === "listening"
}

export function isTrueFalseField(field: WorkbookField, imageHash?: string) {
  if (isHorizontalTrueFalseField(field, imageHash)) return true
  return field.kind === "text" && (/\(\s*[O○]\s*[/／]\s*[X×]\s*\)/iu.test(field.label)
    || /맞으면\s*\(\s*O\s*\).*틀리면\s*\(\s*X\s*\)/iu.test(field.label))
}

export default function WorkbookTrueFalse({ field, value, onChange, showHeader = false, onClearGroup, compact = false }: {
  field: WorkbookField
  value: WorkbookValue | undefined
  onChange: (value: string) => void
  showHeader?: boolean
  onClearGroup?: () => void
  compact?: boolean
}) {
  const id = useId()
  const selected = typeof value === "string" ? value.trim().toUpperCase().replace("○", "O").replace("×", "X") : ""
  return <div role="radiogroup" aria-label={field.label} data-workbook-field={field.id} data-true-false
    className={`pointer-events-auto absolute grid grid-cols-2 rounded-md bg-white/95 text-blue-900 ${compact ? "gap-px" : "gap-1"}`}
    style={{ left: `${(field.rect.x + (compact ? field.rect.width / 2 : 0)) * 100}%`, top: `${(field.rect.y + field.rect.height / 2) * 100}%`, transform: compact ? "translate(-50%, -50%)" : "translateY(-50%)", width: compact ? "clamp(24px, 6cqw, 54px)" : "clamp(60px, 10cqw, 100px)", height: compact ? "clamp(14px, 2.4cqw, 24px)" : "clamp(16px, 3cqw, 28px)", fontSize: compact ? "clamp(8px, 1.2cqw, 12px)" : "clamp(10px, 1.65cqw, 18px)" }}>
    {showHeader && !compact ? <div aria-hidden="true" data-true-false-heading className="absolute inset-x-0 bottom-full mb-1 grid grid-cols-2 gap-1 text-center text-[0.85em] font-bold leading-none text-slate-500"><span>O</span><span>X</span></div> : null}
    {showHeader && onClearGroup && !compact ? <button type="button" onClick={onClearGroup} className="absolute bottom-full left-full mb-0.5 ml-2 whitespace-nowrap rounded px-1 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600" title="Xóa lựa chọn đã lưu của nhóm câu này">Xóa chọn</button> : null}
    {["O", "X"].map(option => <label key={option} title={option === "O" ? "O · Đúng" : "X · Sai"} className="group relative flex cursor-pointer items-center justify-center rounded-md">
      <input type="radio" name={id} value={option} checked={selected === option} aria-label={option}
        className="peer sr-only"
        onClick={() => { if (compact && selected === option) onChange("") }}
        onChange={() => onChange(option)} />
      <span aria-hidden="true" className={`flex h-full w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 transition-[background-color,border-color,color,box-shadow] duration-150 group-hover:border-blue-400 group-hover:bg-blue-50 peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 motion-reduce:transition-none ${compact ? "font-semibold text-slate-500" : "text-transparent"}`}>
        {compact ? option : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "clamp(10px, 1.8cqw, 18px)", height: "clamp(10px, 1.8cqw, 18px)" }}><path d="m5 12 4 4L19 6" /></svg>}
      </span>
    </label>)}
  </div>
}
