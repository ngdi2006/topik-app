"use client"

import { useState, type CSSProperties } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import pictureChoices from "@/lib/textbooks/workbook-picture-choices.json"
import type { GradeItem } from "@/lib/textbooks/grading"
import {
  answerKey,
  choiceHitRect,
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
  const textValue = (field: WorkbookField) => {
    const value = answers[answerKey(pageNumber, field.id)]
    return typeof value === "string" ? value : ""
  }

  return (
    <>
      <div
        aria-label={`Bài tập tương tác trang ${pageNumber}`}
        className="pointer-events-none absolute inset-0 z-10"
      >
        {workbookAnswerFields(workbook.fields).map((field) => {
          if (field.is_context) return null
          const value = answers[answerKey(pageNumber, field.id)]
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
                  const hit = picture ?? choiceHitRect(option, workbook.fields)
                  const selected = value === option.id
                  const marker = {
                    left: `${((option.rect.x - hit.x) / hit.width) * 100}%`,
                    top: `${((option.rect.y - hit.y) / hit.height) * 100}%`,
                    width: `${(option.rect.width / hit.width) * 100}%`,
                    height: `${(option.rect.height / hit.height) * 100}%`,
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
                      onClick={() => onChange(pageNumber, field.id, selected ? "" : option.id)}
                      style={position(hit)}
                      title={option.label}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute ${
                          option.presentation === "word"
                            ? selected
                              ? "border-0 border-b-2 border-blue-600"
                              : "border-0"
                            : selected
                            ? "rounded-full border-2 border-blue-700 bg-blue-500/30 ring-1 ring-blue-500/70"
                            : "rounded-full border border-blue-400/80"
                        }`}
                        data-choice-marker
                        style={marker}
                      />
                    </button>
                  )
                })}
              </div>
            )
          return (
            <div key={field.id}>
              <textarea
                data-workbook-field={field.id}
                aria-label={`${sectionLabels[field.section]} · ${field.label}`}
                className="pointer-events-auto absolute hidden resize-none overflow-hidden rounded-none border border-blue-400/80 bg-white/30 p-0 text-blue-900 shadow-sm focus:z-20 focus:bg-white/95 focus:outline-1 focus:outline-blue-600 sm:block"
                onDoubleClick={() => setEditing(field)}
                onChange={(event) => onChange(pageNumber, field.id, event.target.value)}
                placeholder=""
                spellCheck={false}
                style={{
                  ...position(field.rect),
                  fontSize: "clamp(10px, 1.65cqw, 20px)",
                  lineHeight: 1.25,
                }}
                value={textValue(field)}
              />
              <button
                data-workbook-field={field.id}
                aria-label={`${sectionLabels[field.section]} · ${field.label}: ${
                  textValue(field) || "Nhập câu trả lời"
                }`}
                className="pointer-events-auto absolute overflow-hidden rounded-none border border-blue-400/80 bg-white/30 p-0 text-left text-[11px] leading-tight text-blue-900 shadow-sm sm:hidden"
                onClick={() => setEditing(field)}
                style={position(field.rect)}
                type="button"
              >
                <span className="line-clamp-2">{textValue(field) || ""}</span>
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
          className="max-h-[75dvh] gap-3 rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          side="bottom"
        >
          <SheetTitle className="pr-8 text-sm">
            {editing ? `${sectionLabels[editing.section]} · ${editing.label}` : "Câu trả lời"}
          </SheetTitle>
          {editing ? (
            <textarea
              aria-label="Nhập câu trả lời"
              className="min-h-28 w-full resize-y rounded-xl border border-blue-300 bg-blue-50/30 p-3 text-base text-slate-900 focus:outline-2 focus:outline-blue-600"
              onChange={(event) => onChange(pageNumber, editing.id, event.target.value)}
              placeholder="Nhập câu trả lời tiếng Hàn…"
              spellCheck={false}
              value={textValue(editing)}
            />
          ) : null}
          <p className="text-xs text-slate-500">
            Câu trả lời được tự động lưu. Đóng bảng để tiếp tục làm bài trên sách.
          </p>
          <button
            className="min-h-11 rounded-xl bg-blue-600 px-4 font-bold text-white"
            onClick={() => setEditing(null)}
            type="button"
          >
            Xong
          </button>
        </SheetContent>
      </Sheet>
    </>
  )
}
