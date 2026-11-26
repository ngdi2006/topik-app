"use client"

import type { WorkbookValue } from "@/lib/textbooks/workbook"
import { correctionMarks, correctionText, type CorrectionSpec } from "@/lib/textbooks/error-correction"

export default function WorkbookErrorCorrection({ exercise, value, onChange }: {
  exercise: CorrectionSpec
  value: WorkbookValue | undefined
  onChange: (value: WorkbookValue) => void
}) {
  const marks = new Set(correctionMarks(value).split(",").filter(Boolean))
  return <div role="group" aria-label="Chọn phần sai để gạch chân" className="pointer-events-none absolute inset-0">
    {exercise.tokens.map(({ text, index, rect }) => <button
      key={index} type="button" aria-label={`Gạch chân ${text}, vị trí ${index + 1}`} aria-pressed={marks.has(String(index))}
      className="pointer-events-auto absolute m-0 border-0 bg-transparent p-0 hover:bg-blue-100/30 focus-visible:outline-2 focus-visible:outline-blue-600"
      style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%`, boxShadow: marks.has(String(index)) ? "inset 0 -2px 0 #2563eb" : undefined }}
      onClick={() => {
        if (marks.has(String(index))) marks.delete(String(index))
        else marks.add(String(index))
        onChange({ correction: correctionText(value), marks: [...marks].sort((a, b) => Number(a) - Number(b)).join(",") })
      }}><span className="sr-only">{text}</span></button>)}
  </div>
}
