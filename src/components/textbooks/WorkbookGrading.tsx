"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCheck, LoaderCircle } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { sectionLabels, type WorkbookPage, type WorkbookValue } from "@/lib/textbooks/workbook"
import { isAutoGradedField, summarizeGrade, type WorkbookGrade } from "@/lib/textbooks/grading"
import type { ManualSection, SubmissionSummary } from "@/lib/textbooks/submissions"

const labels = { correct: "Đúng", incorrect: "Sai", unanswered: "Chưa trả lời", ungraded: "Chưa có đáp án chuẩn" }
const sections: ManualSection[] = ["vocabulary", "grammar", "writing", "reading", "listening"]
export default function WorkbookGrading({ bookId, unitId, pages, answers, result, onResult, onNavigate }: {
  bookId: string; unitId: string; pages: { pageNumber: number; workbook: WorkbookPage | null }[]; answers: Record<string, WorkbookValue>; result: WorkbookGrade | null
  onResult: (result: WorkbookGrade) => void; onNavigate: (page: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<ManualSection>("vocabulary")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [teacherId, setTeacherId] = useState("")
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([])
  const requests = useRef(new Map<string, string>())
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    void fetch(`/api/textbooks/${bookId}/workbook/submit?unitId=${unitId}`, { signal: controller.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Chưa tải được thông tin nộp bài")
      if (controller.signal.aborted) return
      setTeachers(data.teachers); setSubmissions(data.submissions)
      setTeacherId(current => current || (data.teachers.length === 1 ? data.teachers[0].id : ""))
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Chưa tải được") })
    return () => controller.abort()
  }, [open, bookId, unitId])
  const fields = pages.flatMap(page => page.workbook?.fields ?? []).filter(field => !field.is_context && field.section === section)
  const auto = fields.filter(isAutoGradedField)
  const manual = fields.filter(field => !isAutoGradedField(field))
  const graded = summarizeGrade((result?.items ?? []).filter(item => item.section === section))
  const submitted = submissions.find(item => item.section === section)
  const grade = async () => {
    if (section !== "reading" && section !== "listening") return
    setLoading(true); setError(""); setMessage("")
    try {
      const response = await fetch(`/api/textbooks/${bookId}/workbook/grade`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unitId, section, answers }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Chưa chấm được bài")
      onResult(data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa chấm được bài") }
    finally { setLoading(false) }
  }
  const submit = async () => {
    if (!teacherId) { setError("Hãy chọn giáo viên nhận bài trước khi nộp."); return }
    setLoading(true); setError(""); setMessage("")
    const fingerprint = JSON.stringify({ section, teacherId, answers })
    const requestId = requests.current.get(fingerprint) ?? crypto.randomUUID()
    requests.current.set(fingerprint, requestId)
    try {
      const response = await fetch(`/api/textbooks/${bookId}/workbook/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unitId, section, teacherId, requestId, answers }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Chưa gửi được bài")
      setSubmissions(current => [data.submission, ...current.filter(item => item.section !== section)])
      setMessage(data.message)
      requests.current.delete(fingerprint)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa gửi được bài") }
    finally { setLoading(false) }
  }
  return <Sheet open={open} onOpenChange={setOpen}>
    <button aria-label="Chấm bài" title="Nộp và chấm từng phần" className="grid min-h-9 min-w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 sm:min-h-11 sm:min-w-11" type="button" onClick={() => { setOpen(true); setError("") }}><CheckCheck className="size-4" /></button>
    <SheetContent aria-describedby={undefined} className="flex w-[min(94vw,400px)] flex-col gap-3 overflow-y-auto p-4">
      <SheetTitle>Nộp và chấm bài</SheetTitle>
      <div aria-label="Các phần của bài" className="flex flex-wrap gap-1" role="group">{sections.map(value => <button className={`min-h-9 rounded-lg px-2 text-xs font-bold ${section === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`} aria-pressed={section === value} disabled={loading} key={value} type="button" onClick={() => { setSection(value); setError(""); setMessage("") }}>{sectionLabels[value]}</button>)}</div>
      <h3 className="text-sm font-bold">{sectionLabels[section]}</h3>
      {!fields.length ? <p className="text-xs text-slate-500">Bài này chưa có phần {sectionLabels[section].toLocaleLowerCase("vi")}.</p> : null}
      {auto.length ? <>
        <p className="text-xs leading-5 text-slate-500">Trắc nghiệm được chấm tự động và hiện đúng/sai ngay sau khi nộp phần này.</p>
        <button className="min-h-10 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50" disabled={loading} onClick={() => void grade()} type="button">Nộp trắc nghiệm · Xem đúng/sai</button>
        {graded.items.length ? <><div className="rounded-xl bg-emerald-50 p-3" aria-live="polite"><p className="text-xl font-bold text-emerald-800">{graded.total ? `${graded.correct}/${graded.total} câu đúng` : "Chưa có đáp án chuẩn"}</p>{graded.total ? <p className="mt-1 text-xs">{graded.incorrect} sai · {graded.unanswered} chưa trả lời</p> : null}{graded.ungraded ? <p className="mt-2 text-xs text-amber-800">{graded.ungraded} câu chưa có đáp án đã duyệt, chưa tính điểm.</p> : null}</div>
          <div className="space-y-2">{graded.items.map(item => <button className={`w-full rounded-lg border p-2 text-left text-xs ${item.status === "correct" ? "border-emerald-200 bg-emerald-50" : item.status === "incorrect" ? "border-red-200 bg-red-50" : "border-slate-200"}`} key={`${item.pageNumber}:${item.fieldId}`} type="button" onClick={() => { setOpen(false); onNavigate(item.pageNumber) }}><span className="font-bold">{labels[item.status]} · Trang {item.pageNumber}</span><span className="mt-1 block leading-5" lang="ko">{item.label}</span>{item.expected && item.status !== "correct" ? <span className="mt-1 block font-semibold text-emerald-800">Đáp án: {item.expected}</span> : null}</button>)}</div></> : null}
      </> : null}
      {manual.length ? <div className="space-y-3 rounded-xl border p-3">
        <p className="text-xs leading-5 text-slate-600">Phần này gửi cho giáo viên chấm; hệ thống không tự kết luận đúng/sai.</p>
        <label className="block text-xs font-semibold">Giáo viên nhận bài<select aria-label="Giáo viên nhận bài" className="mt-1 min-h-10 w-full rounded border bg-white px-2 text-sm" value={teacherId} onChange={event => setTeacherId(event.target.value)}><option value="">Chọn giáo viên</option>{teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
        {!teachers.length ? <p className="text-xs text-amber-800">Chưa có giáo viên được cấp quyền nhận bài.</p> : null}
        <button className="min-h-10 w-full rounded-lg bg-blue-600 px-3 text-sm font-bold text-white disabled:opacity-50" disabled={loading || !teachers.length} type="button" onClick={() => void submit()}>{submitted ? "Nộp lại phần này" : "Nộp cho giáo viên"}</button>
        {submitted ? <div aria-live="polite" className="rounded-lg bg-blue-50 p-2 text-xs leading-5"><p>{submitted.status === "reviewed" ? "Giáo viên đã chấm" : "Đã lưu kết quả và gửi cho giáo viên chấm."}</p>{submitted.review ? <><strong>{submitted.review.correct}/{submitted.review.total} câu đúng</strong><p className="whitespace-pre-wrap">{submitted.review.feedback}</p></> : <p>Trạng thái: Chờ chấm.</p>}</div> : null}
      </div> : null}
      {loading ? <p className="flex items-center gap-2 text-xs"><LoaderCircle className="size-4 animate-spin" />Đang xử lý…</p> : null}
      {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
      {message && !submitted ? <p className="text-xs text-emerald-800" role="status">{message}</p> : null}
    </SheetContent>
  </Sheet>
}
