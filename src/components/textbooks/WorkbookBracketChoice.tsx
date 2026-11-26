"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { choiceOptionSelected, inlineChoiceGroups, selectChoiceOption, type WorkbookField, type WorkbookValue } from "@/lib/textbooks/workbook"
import { wordChoiceRect } from "@/lib/textbooks/workbook-word-choices"

export function isBracketChoice(field: WorkbookField) {
  return field.kind === "choice" && /[（(][^()（）]*[/／][^()（）]*[)）]/u.test(field.label)
    && field.options.length > 0 && field.options.every(option => option.presentation === "word")
}

export default function WorkbookBracketChoice({ field, imageHash, value, onChange }: {
  field: WorkbookField
  imageHash: string
  value: WorkbookValue | undefined
  onChange: (value: WorkbookValue) => void
}) {
  const [open, setOpen] = useState(false)
  const options = field.options.map(option => ({ ...option, rect: wordChoiceRect(imageHash, field.id, option) ?? option.rect }))
  const groups = inlineChoiceGroups(field)
  const choices = groups.length ? groups : [{ id: "g1", label: "Đáp án", options: field.options }]
  const top = Math.min(...options.map(option => option.rect.y))
  const bottom = Math.max(...options.map(option => option.rect.y + option.rect.height))
  return <>
    {options.map(option => {
      const rect = option.rect
      const previous = options.filter(other => other.rect.x < rect.x).at(-1)
      const next = options.find(other => other.rect.x > rect.x)
      const left = Math.max(rect.x - .009, previous ? (previous.rect.x + previous.rect.width + rect.x) / 2 : 0)
      const right = Math.min(rect.x + rect.width + .009, next ? (rect.x + rect.width + next.rect.x) / 2 : 1)
      const selected = choiceOptionSelected(field, value, option.id)
      return <div key={option.id}>
        <button type="button" data-choice-option={option.id} data-workbook-field={field.id}
          aria-label={`${field.label}: ${option.label}`} aria-pressed={selected}
          className="pointer-events-auto absolute hidden bg-transparent hover:bg-blue-100/25 focus-visible:outline-2 focus-visible:outline-blue-600 sm:block"
          style={{ left: `${left * 100}%`, top: `${(rect.y - .007) * 100}%`, width: `${(right - left) * 100}%`, height: `${(rect.height + .014) * 100}%` }}
          onClick={() => onChange(selectChoiceOption(field, value, option.id))}>
          <span className="sr-only">{option.label}</span>
        </button>
        {selected ? <span data-choice-marker data-bracket-circle={option.id} aria-hidden="true"
          className="pointer-events-none absolute rounded-[50%] border-2 border-blue-600"
          style={{ left: `${(rect.x - .0025) * 100}%`, top: `${(rect.y - .002) * 100}%`, width: `${(rect.width + .005) * 100}%`, height: `${(rect.height + .004) * 100}%` }} /> : null}
      </div>
    })}
    {choices.map(group => {
      const rects = options.filter(option => group.options.some(item => item.id === option.id)).map(option => option.rect)
      const left = Math.min(...rects.map(rect => rect.x)) - .012
      const right = Math.max(...rects.map(rect => rect.x + rect.width)) + .012
      return <button key={group.id} type="button" data-bracket-open data-workbook-field={field.id}
        aria-label={`Mở lựa chọn lớn · ${field.label} · ${group.label}`}
        className="pointer-events-auto absolute rounded border border-blue-300/60 bg-transparent active:bg-blue-100/30 focus-visible:outline-2 focus-visible:outline-blue-600 sm:hidden"
        style={{ left: `${left * 100}%`, top: `${(top - .009) * 100}%`, width: `${(right - left) * 100}%`, height: `${(bottom - top + .018) * 100}%` }}
        onClick={() => setOpen(true)} />
    })}
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto p-5" aria-describedby={undefined}>
        <SheetTitle>Chọn đáp án trong ngoặc</SheetTitle>
        <p className="text-sm leading-6 text-slate-600" lang="ko">{field.label}</p>
        {choices.map(group => <div key={group.id} className="space-y-2">
          {choices.length > 1 ? <p className="text-xs font-semibold text-slate-500">{group.label}</p> : null}
          <div className="flex flex-wrap gap-3">{group.options.map(option => {
            const selected = choiceOptionSelected(field, value, option.id)
            return <button key={option.id} type="button" aria-pressed={selected}
              className={`min-h-12 min-w-16 rounded-full border-2 px-5 py-2 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-900"}`}
              onClick={() => onChange(selectChoiceOption(field, value, option.id))}>{option.label}</button>
          })}</div>
        </div>)}
        <button type="button" className="mt-2 min-h-11 rounded-lg bg-blue-600 px-5 font-semibold text-white" onClick={() => setOpen(false)}>Xong</button>
      </SheetContent>
    </Sheet>
  </>
}
