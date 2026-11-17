"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { choiceAnswerText, sectionLabels } from "@/lib/textbooks/workbook"
import { submissionTotal, type WorkbookSubmission } from "@/lib/textbooks/submissions"

type Row = { id: string; teacherId: string; bookId: string; content: WorkbookSubmission }
function Review({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const [correct, setCorrect] = useState(row.content.review?.correct ?? 0)
  const [feedback, setFeedback] = useState(row.content.review?.feedback ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const total = submissionTotal(row.content.answers)
  const save = async () => {
    setSaving(true); setError("")
    try {
      const response = await fetch("/api/admin/textbooks/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, correct, feedback }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Chưa lưu được")
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được") }
    finally { setSaving(false) }
  }
  return <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer text-sm font-bold">{row.content.studentName} · {row.content.unitTitle} · {sectionLabels[row.content.section]} <span className="ml-2 text-xs text-blue-700">{row.content.review ? `${row.content.review.correct}/${row.content.review.total} · Đã chấm` : "Chờ chấm"}</span></summary>
    <p className="mt-2 text-xs text-slate-500">{row.content.bookTitle} · {new Date(row.content.submittedAt).toLocaleString("vi-VN")}</p>
    <div className="my-3 space-y-2">{row.content.answers.map(answer => <div className="rounded-lg border bg-slate-50 p-3 text-sm" key={`${answer.pageNumber}:${answer.fieldId}`}><Link className="text-xs text-blue-700" href={`/textbooks/${row.bookId}/read?page=${answer.pageNumber}`} target="_blank" rel="noreferrer">Xem trang {answer.pageNumber} ↗</Link><p className="mt-1 font-semibold" lang="ko">{answer.label}</p>
      {answer.kind === "match" ? answer.sources.map(source => { const value = typeof answer.value === "object" ? answer.value[source.id] : ""; return <p className="mt-1 text-xs" key={source.id}>{source.label} → {answer.targets.find(target => target.id === value)?.label || "Chưa trả lời"}</p> }) : <p className="mt-1 whitespace-pre-wrap text-blue-900" lang="ko">{answer.kind === "choice" ? choiceAnswerText(answer, answer.value) || "Chưa trả lời" : typeof answer.value === "string" ? answer.value || "Chưa trả lời" : "Chưa trả lời"}</p>}
    </div>)}</div>
    <div className="flex items-center gap-2 text-sm"><label htmlFor={`score-${row.id}`}>Số câu đúng</label><input id={`score-${row.id}`} className="w-20 rounded border p-2" type="number" min={0} max={total} value={correct} onChange={event => setCorrect(Number(event.target.value))} /><span>/ {total}</span></div>
    <label className="mt-3 block text-sm">Nhận xét<textarea className="mt-1 min-h-20 w-full rounded border p-2" maxLength={5000} value={feedback} onChange={event => setFeedback(event.target.value)} /></label>
    {error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null}
    <button className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={saving} type="button" onClick={() => void save()}>{saving ? "Đang lưu…" : "Lưu kết quả chấm"}</button>
  </details>
}
export default function WorkbookSubmissionsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void fetch(`/api/admin/textbooks/submissions?offset=${offset}`, { signal: controller.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setRows(data.submissions); setHasMore(data.hasMore); setError("") }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Chưa tải được") })
    return () => controller.abort()
  }, [offset, reload])
  return <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-8"><Link className="text-sm text-blue-700" href="/admin/textbooks">← Giáo trình số</Link><h1 className="text-2xl font-bold">Bài tập chờ giáo viên chấm</h1><p className="text-sm text-slate-500">Mỗi bài nộp lưu riêng theo học viên, bài học và từng phần. Giáo viên xem các bài được gửi cho mình.</p>{error ? <p role="alert" className="text-red-700">{error}</p> : rows.length ? rows.map(row => <Review key={`${row.id}:${row.content.review?.reviewedAt ?? "pending"}`} row={row} onSaved={() => setReload(value => value + 1)} />) : <p className="rounded-lg bg-white p-4 text-sm">Chưa có bài nộp.</p>}<div className="flex justify-between"><button type="button" className="rounded border px-3 py-2 text-sm disabled:opacity-40" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 50))}>Trước</button><button type="button" className="rounded border px-3 py-2 text-sm disabled:opacity-40" disabled={!hasMore} onClick={() => setOffset(value => value + 50)}>Tiếp</button></div></main>
}
