"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useWorkbookInputFit } from "./useWorkbookInputFit"
import WorkbookWordBank, { wordBankFields } from "./WorkbookWordBank"
import WorkbookTrueFalse, { isHorizontalTrueFalseField, isTrueFalseField } from "./WorkbookTrueFalse"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import pictureChoices from "@/lib/textbooks/workbook-picture-choices.json"
import { wordChoiceRect } from "@/lib/textbooks/workbook-word-choices"
import { bracketInputRect } from "@/lib/textbooks/workbook-bracket-inputs"
import { workbookInputRect } from "@/lib/textbooks/workbook-input-layout"
import type { GradeItem } from "@/lib/textbooks/grading"
import {
  answerKey,
  choiceHitRect,
  choiceOptionSelected,
  selectChoiceOption,
  connectMatch,
  matchingPort,
  matchingContentRect,
  matchingCurvePath,
  sectionLabels,
  workbookAnswerFields,
  type WorkbookField,
  type WorkbookPage,
  type WorkbookValue,
} from "@/lib/textbooks/workbook"
import {
  type WorkbookListeningController,
} from "@/components/textbooks/useWorkbookListening"

type Rect = WorkbookField["rect"]
const position = (rect: Rect): CSSProperties => ({
  left: `${rect.x * 100}%`,
  top: `${rect.y * 100}%`,
  width: `${rect.width * 100}%`,
  height: `${rect.height * 100}%`,
})

function isCharacterCell(field: WorkbookField) {
  const { width, height } = field.rect
  const aspect = width / (height * (1864 / 1440))
  return field.kind === "text" && width <= 0.09 && height >= 0.022 && aspect >= 0.55 && aspect <= 1.85
}

function useInputViewport(open: boolean) {
  const [viewport, setViewport] = useState<{ bottom: number; height: number } | null>(null)
  useEffect(() => {
    if (!open || !window.visualViewport) return
    const visible = window.visualViewport
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setViewport({
        bottom: Math.max(0, window.innerHeight - visible.height - visible.offsetTop),
        height: visible.height,
      }))
    }
    update()
    visible.addEventListener("resize", update)
    visible.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    return () => {
      cancelAnimationFrame(frame)
      visible.removeEventListener("resize", update)
      visible.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [open])
  return viewport
}

const characterStyle = (field: WorkbookField): CSSProperties => ({
  ...position(field.rect),
  fontSize: `clamp(10px, ${Math.min(field.rect.height * (1864 / 1440) * 68, field.rect.width * 72)}cqw, 40px)`,
  lineHeight: 1,
  fontWeight: 700,
  textAlign: "center",
})

function MatchingField({
  field,
  value,
  onChange,
}: {
  field: WorkbookField
  value: WorkbookValue | undefined
  onChange: (value: WorkbookValue) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const connections = typeof value === "object" && value !== null ? value : {}
  const nodeGeometry = (node: WorkbookField["sources"][number], side: "source" | "target") => {
    const rect = matchingContentRect(field, node, side)
    const port = matchingPort(field, node, side)
    const x = Math.max(0, Math.min(rect.x, port.x - 0.012))
    const y = Math.max(0, Math.min(rect.y - 0.004, port.y - 0.01))
    const right = Math.min(1, Math.max(rect.x + rect.width, port.x + 0.012))
    const bottom = Math.min(1, Math.max(rect.y + rect.height + 0.004, port.y + 0.01))
    return { hit: position({ x, y, width: right-x, height: bottom-y }), marker: { left: `${(port.x-x)/(right-x)*100}%`, top: `${(port.y-y)/(bottom-y)*100}%` } }
  }
  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 1000 1000"
      >
        {Object.entries(connections).map(([sourceId, targetId]) => {
          const source = field.sources.find((node) => node.id === sourceId)
          const target = field.targets.find((node) => node.id === targetId)
          if (!source || !target || source.is_context || target.is_context) return null
          const start = matchingPort(field, source, "source")
          const end = matchingPort(field, target, "target")

          return (
            <path
              key={sourceId}
              data-match-connection="true"
              d={matchingCurvePath(start, end, field.sources.indexOf(source))}
              fill="none"
              stroke="#2563eb"
              strokeLinecap="round"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>
      {field.sources
        .filter((node) => !node.is_context)
        .map((source) => (
          <button
            aria-label={`${field.label}: chọn ${source.label} để nối`}
            aria-pressed={selected === source.id}
            className="pointer-events-auto absolute rounded-sm border-0 bg-transparent hover:bg-blue-100/20 focus-visible:outline-2 focus-visible:outline-blue-600"
            key={`source-${source.id}`}
            onClick={() => setSelected(selected === source.id ? null : source.id)}
            data-match-port="source"
            data-workbook-field={field.id}
            style={nodeGeometry(source, "source").hit}
            title={`Chọn ${source.label} rồi chạm đáp án bên kia`}
            type="button"
          >
            <span
              style={nodeGeometry(source, "source").marker}
              className={`pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow ${
                selected === source.id
                  ? "bg-orange-500 ring-4 ring-orange-200/60"
                  : connections[source.id]
                  ? "bg-blue-700 ring-2 ring-blue-200/60"
                  : "bg-blue-500"
              }`}
            >
              <span className="absolute -inset-2" />
            </span>
          </button>
        ))}
      {field.targets
        .filter((node) => !node.is_context)
        .map((target) => (
          <button
            aria-label={`${field.label}: nối tới ${target.label}`}
            className="pointer-events-auto absolute rounded-sm border-0 bg-transparent hover:bg-blue-100/20 focus-visible:outline-2 focus-visible:outline-blue-600"
            key={`target-${target.id}`}
            onClick={() => {
              if (selected) {
                onChange(connectMatch(value, selected, target.id, field.allow_shared_targets))
                setSelected(null)
              }
            }}
            data-match-port="target"
            data-workbook-field={field.id}
            style={nodeGeometry(target, "target").hit}
            title={selected ? `Nối tới ${target.label}` : "Chọn hình hoặc nội dung bên trái trước"}
            type="button"
          >
            <span
              style={nodeGeometry(target, "target").marker}
              className={`pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow ${
                selected
                  ? "bg-orange-500 ring-2 ring-orange-200/60"
                  : Object.values(connections).includes(target.id)
                  ? "bg-blue-700 ring-2 ring-blue-200/60"
                  : "bg-blue-500"
              }`}
            >
              <span className="absolute -inset-2" />
            </span>
          </button>
        ))}
      {selected ? (
        <div
          className="pointer-events-auto absolute bottom-3 left-1/2 z-20 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
          role="status"
        >
          <span>Chạm đáp án để nối.</span>
          {connections[selected] ? (
            <button
              className="shrink-0 rounded bg-white/20 px-2 py-1 font-bold"
              onClick={() => {
                const next = { ...connections }
                delete next[selected]
                onChange(next)
                setSelected(null)
              }}
              type="button"
            >
              Xóa nối
            </button>
          ) : null}
          <button
            aria-label="Hủy chọn điểm nối"
            className="px-1 text-lg"
            onClick={() => setSelected(null)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}
    </>
  )
}

export default function WorkbookPageOverlay({
  pageNumber,
  workbook,
  answers,
  onChange,
  grades = [],
}: {
  pageNumber: number
  workbook: WorkbookPage
  answers: Record<string, WorkbookValue>
  onChange: (pageNumber: number, fieldId: string, value: WorkbookValue) => void
  listeningController?: WorkbookListeningController | null
  allListeningFields?: (WorkbookField & { pageNumber?: number })[]
  grades?: GradeItem[]
}) {
  const [editing, setEditing] = useState<WorkbookField | null>(null)
  const inputViewport = useInputViewport(!!editing)
  const inputRoot = useRef<HTMLDivElement>(null)
  useWorkbookInputFit(inputRoot, answers)
  const bankFields = new Set(wordBankFields(workbook).map(field => field.id))
  const textValue = (field: WorkbookField) => {
    const value = answers[answerKey(pageNumber, field.id)]
    return typeof value === "string" ? value : ""
  }

  return (
    <>
      <div
        aria-label={`Bài tập tương tác trang ${pageNumber}`}
        className="pointer-events-none absolute inset-0 z-10"
        ref={inputRoot}
      >
        <WorkbookWordBank workbook={workbook} pageNumber={pageNumber} answers={answers} onChange={onChange} onEdit={setEditing} />
        {workbookAnswerFields(workbook.fields).map((field) => {
          if (bankFields.has(field.id)) return null
          if (field.is_context) return null
          const value = answers[answerKey(pageNumber, field.id)]
          if (isTrueFalseField(field, workbook.image_hash)) {
            const previous = workbook.fields.filter(other => !other.is_context && isTrueFalseField(other, workbook.image_hash) && Math.abs(other.rect.x - field.rect.x) < 0.025 && other.rect.y < field.rect.y).sort((a, b) => b.rect.y - a.rect.y)[0]
            const showHeader = !previous || field.rect.y - previous.rect.y > 0.1
            const group = workbook.fields.filter(other => !other.is_context && isTrueFalseField(other, workbook.image_hash) && Math.abs(other.rect.x - field.rect.x) < 0.025 && other.rect.y >= field.rect.y).sort((a, b) => a.rect.y - b.rect.y)
            const end = group.findIndex((other, index) => index > 0 && other.rect.y - group[index - 1].rect.y > 0.1)
            const groupFields = end < 0 ? group : group.slice(0, end)
            const hasAnswers = groupFields.some(other => typeof answers[answerKey(pageNumber, other.id)] === "string" && String(answers[answerKey(pageNumber, other.id)]).trim())
            return <WorkbookTrueFalse key={field.id} field={field} value={value} compact={isHorizontalTrueFalseField(field, workbook.image_hash)} showHeader={showHeader} onClearGroup={showHeader && hasAnswers ? () => groupFields.forEach(other => onChange(pageNumber, other.id, "")) : undefined} onChange={next => onChange(pageNumber, field.id, next)} />
          }
          if (field.kind === "match")
            return (
              <MatchingField
                field={field}
                key={field.id}
                onChange={(next) => onChange(pageNumber, field.id, next)}
                value={value}
              />
            )
          if (field.kind === "choice")
            return (
              <div key={field.id}>
                {field.options.map((option) => {
                  const picture = (pictureChoices as Record<string, Record<string, Rect>>)[workbook.image_hash]?.[`${field.id}:${option.id}`]
                  const wordRect = wordChoiceRect(workbook.image_hash, field.id, option)
                  const corrected = wordRect ? { ...option, rect: wordRect, hit_rect: { x: wordRect.x - 0.0014, y: wordRect.y - 0.001, width: wordRect.width + 0.0028, height: wordRect.height + 0.002 } } : option
                  const hit = picture ?? choiceHitRect(corrected, workbook.fields)
                  const selected = choiceOptionSelected(field, value, option.id)
                  const marker = {
                    left: `${((corrected.rect.x - hit.x) / hit.width) * 100}%`,
                    top: `${((corrected.rect.y - hit.y) / hit.height) * 100}%`,
                    width: `${(corrected.rect.width / hit.width) * 100}%`,
                    height: `${(corrected.rect.height / hit.height) * 100}%`,
                  }
                  return (
                    <button
                      aria-label={`${sectionLabels[field.section]} · ${field.label}: ${option.label}`}
                      aria-pressed={selected}
                      className={`pointer-events-auto absolute rounded-sm border-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                        selected ? "bg-blue-400/25" : "bg-transparent hover:bg-blue-100/30"
                      }`}
                      data-choice-option={option.id}
                      data-choice-picture={picture ? "true" : undefined}
                      data-workbook-field={field.id}
                      key={option.id}
                      onClick={() => onChange(pageNumber, field.id, selectChoiceOption(field, value, option.id))}
                      style={position(hit)}
                      title={option.label}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute ${
                          option.presentation === "word"
                            ? selected
                              ? "flex items-center justify-center whitespace-nowrap border-0 border-b-2 border-blue-600 bg-white font-bold leading-none text-blue-700"
                              : "border-0"
                            : selected
                            ? "rounded-full border-2 border-blue-700 bg-blue-500/30 ring-1 ring-blue-500/70"
                            : "rounded-full border border-blue-400/80"
                        }`}
                        data-choice-marker
                        style={{ ...marker, ...(option.presentation === "word" && selected ? { fontSize: `${Math.min(1.95, corrected.rect.width * 100 / Array.from(option.label).length)}cqw` } : {}) }}
                      >{option.presentation === "word" && selected ? option.label : null}</span>
                    </button>
                  )
                })}
              </div>
            )
          const bracketRect = bracketInputRect(workbook.image_hash, field.id)
          const combinationInput = workbook.image_hash === "8c0360915cf9978f515f78be6f27716193de2a4adc1f431cbb5426f6eb2bda2e" && /^p8-f(?:[7-9]|1[0-6])$/.test(field.id)
          if (combinationInput) {
            const style: CSSProperties = {
              ...position(field.rect),
              top: `${(field.rect.y + field.rect.height / 2) * 100}%`,
              height: "clamp(26px, 4cqw, 40px)",
              transform: "translateY(-50%)",
              borderRadius: "clamp(5px, .8cqw, 9px)",
              fontSize: "clamp(14px, 2.4cqw, 24px)",
              lineHeight: 1,
              fontWeight: 700,
              textAlign: "center",
            }
            const classes = "pointer-events-auto absolute min-w-0 border border-blue-300 bg-white px-1 text-blue-700 shadow-sm transition-[border-color,box-shadow,background-color] hover:border-blue-500 hover:bg-blue-50 focus:z-20 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25"
            return <div key={field.id}>
              <input type="text" data-input-fit data-workbook-field={field.id} data-combination-input aria-label={`${sectionLabels[field.section]} · ${field.label}`} className={`${classes} hidden sm:block`} style={style} value={textValue(field)} spellCheck={false} autoComplete="off" onDoubleClick={() => setEditing(field)} onChange={event => onChange(pageNumber, field.id, event.target.value)} />
              <button type="button" data-input-fit data-workbook-field={field.id} data-combination-input aria-label={`${sectionLabels[field.section]} · ${field.label}: ${textValue(field) || "Nhập câu trả lời"}`} className={`${classes} flex items-center justify-center sm:hidden`} style={style} onClick={() => setEditing(field)}>{textValue(field)}</button>
            </div>
          }
          const inputStyle = bracketRect ? { ...characterStyle({ ...field, rect: bracketRect }), fontSize: "clamp(10px, 1.65cqw, 22px)" } : characterStyle(field)
          if (isCharacterCell(field) || bracketRect) return <div key={field.id}>
            <input type="text" data-input-fit data-workbook-field={field.id} data-character-cell={bracketRect ? undefined : "true"} data-bracket-input={bracketRect ? "true" : undefined} aria-label={`${sectionLabels[field.section]} · ${field.label}`}
              className="pointer-events-auto absolute hidden min-w-0 rounded-sm border border-blue-300 bg-white/95 p-0 text-blue-700 shadow-sm transition-colors hover:border-blue-500 focus:z-20 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 sm:block"
              style={inputStyle} value={textValue(field)} spellCheck={false} autoComplete="off"
              onDoubleClick={() => setEditing(field)} onChange={event => onChange(pageNumber, field.id, event.target.value)} />
            <button type="button" data-input-fit data-workbook-field={field.id} data-character-cell={bracketRect ? undefined : "true"} data-bracket-input={bracketRect ? "true" : undefined} aria-label={`${sectionLabels[field.section]} · ${field.label}: ${textValue(field) || "Nhập chữ"}`}
              className="pointer-events-auto absolute flex items-center justify-center overflow-hidden rounded-sm border border-blue-300 bg-white/95 p-0 text-blue-700 shadow-sm transition-colors hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 sm:hidden"
              style={inputStyle} onClick={() => setEditing(field)}>{textValue(field)}</button>
          </div>
          const longAnswer = field.rect.width >= 0.6 && field.rect.height <= 0.025
          const inputRect = workbookInputRect(field, workbook.fields)
          const inline = field.rect.width < 0.12
          const lineStyle: CSSProperties = {
            ...position(inputRect),
            borderRadius: inline ? "clamp(2px, .3cqw, 4px)" : "clamp(4px, .6cqw, 8px)",
            fontSize: `clamp(10px, ${Math.min(2.4, inputRect.height * 100)}cqw, 24px)`,
            lineHeight: 1.25,
            fontWeight: 700,
            textAlign: longAnswer ? "left" : "center",
            padding: inline ? 0 : "0 .35cqw",
            alignContent: "center",
          }
          return (
            <div key={field.id}>
              <textarea
                data-input-fit data-workbook-field={field.id}
                aria-label={`${sectionLabels[field.section]} · ${field.label}`}
                className="pointer-events-auto absolute hidden resize-none overflow-hidden border border-blue-300 bg-white/95 text-blue-700 shadow-sm transition-colors hover:border-blue-500 hover:bg-blue-50/70 focus:z-20 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 sm:block"
                onDoubleClick={() => setEditing(field)}
                onChange={(event) => onChange(pageNumber, field.id, event.target.value)}
                placeholder=""
                spellCheck={false}
                wrap={longAnswer ? "off" : undefined}
                title={longAnswer ? "Nhấn đúp để mở ô soạn câu đầy đủ" : undefined}
                style={{
                  ...position(field.rect),
                  fontSize: "clamp(10px, 1.65cqw, 20px)",
                  lineHeight: 1.25,
                  ...lineStyle,
                }}
                value={textValue(field)}
              />
              <button
                data-input-fit data-workbook-field={field.id}
                aria-label={`${sectionLabels[field.section]} · ${field.label}: ${
                  textValue(field) || "Nhập câu trả lời"
                }`}
                className="pointer-events-auto absolute flex items-center justify-center overflow-hidden border border-blue-300 bg-white/95 text-blue-700 shadow-sm transition-colors hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 sm:hidden"
                onClick={() => setEditing(field)}
                style={{ ...position(field.rect), ...lineStyle }}
                type="button"
              >
                <span className="block w-full whitespace-pre-wrap break-words">{textValue(field) || ""}</span>
              </button>
            </div>
          )
        })}
        {grades.filter(item => item.pageNumber === pageNumber && item.status !== "ungraded").map(item => {
          const field = workbook.fields.find(field => field.id === item.fieldId)
          if (!field) return null
          const source = item.sourceId ? field.sources.find(source => source.id === item.sourceId) : null
          const point = source ? matchingPort(field, source, "source") : { x: Math.max(0.02, field.rect.x - 0.025), y: field.rect.y }
          const correct = item.status === "correct"
          return <span aria-label={`${item.label}: ${correct ? "Đúng" : item.status === "unanswered" ? "Chưa trả lời" : "Sai"}`} className={`pointer-events-none absolute z-20 grid size-4 -translate-x-full -translate-y-1/2 place-items-center rounded-full text-[10px] font-bold text-white shadow ${correct ? "bg-emerald-600" : item.status === "unanswered" ? "bg-slate-500" : "bg-red-600"}`} key={`${item.fieldId}:${item.sourceId ?? ""}`} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}>{correct ? "✓" : item.status === "unanswered" ? "–" : "×"}</span>
        })}
      </div>
      <Sheet
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        open={!!editing}
      >
        <SheetContent
          aria-describedby={undefined}
          className="mx-auto w-full max-w-xl gap-2 overflow-y-auto overscroll-contain rounded-t-2xl p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:mb-3 sm:w-[calc(100%-2rem)] sm:rounded-2xl sm:p-4"
          data-workbook-answer-editor
          style={{ bottom: inputViewport?.bottom ?? 0, maxHeight: inputViewport ? Math.max(0, inputViewport.height - 16) : "calc(100dvh - 16px)" }}
          side="bottom"
        >
          <SheetTitle className="shrink-0 truncate pr-8 text-sm">
            {editing ? `${sectionLabels[editing.section]} · ${editing.label}` : "Câu trả lời"}
          </SheetTitle>
          {editing ? (
            <textarea
              aria-label="Nhập câu trả lời"
              className="min-h-12 w-full shrink resize-none rounded-xl border border-blue-300 bg-blue-50/30 px-3 py-2 text-base font-bold leading-relaxed text-blue-700 shadow-sm focus:outline-2 focus:outline-blue-600"
              onChange={(event) => onChange(pageNumber, editing.id, event.target.value)}
              placeholder="Nhập câu trả lời tiếng Hàn…"
              spellCheck={false}
              rows={editing.rect.width >= 0.45 ? 3 : 2}
              style={editing && isCharacterCell(editing) ? { textAlign: "center", fontSize: 32, fontWeight: 700 } : undefined}
              value={textValue(editing)}
            />
          ) : null}
          <div className="flex shrink-0 items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Tự động lưu</p>
          <button
            className="min-h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            onClick={() => setEditing(null)}
            type="button"
          >
            Xong
          </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
