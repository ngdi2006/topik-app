'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, FileQuestion, GraduationCap, Languages, LoaderCircle, PlayCircle, Save } from 'lucide-react'
import { toast } from 'sonner'
import { AdminVideoInteractions } from '@/components/elearning/AdminVideoInteractions'

type StepContent = { body?: string; resourceUrl?: string; buttonLabel?: string }
type AdminStep = { id: string; step_type: string; title: string; instructions: string | null; content: StepContent | null; youtube_url: string | null; required_watch_percent: number; sort_order: number; is_required: boolean; is_published: boolean }
type AdminLesson = { id: string; lesson_number: number; title: string; sort_order: number; is_published: boolean; elearning_steps: AdminStep[] }
type AdminCourse = { id: string; title: string; description: string | null; is_published: boolean; elearning_lessons: AdminLesson[] }

const stepIcons: Record<string, typeof BookOpen> = { overview: GraduationCap, video: PlayCircle, document: BookOpen, vocabulary: Languages, grammar: BookOpen, practice: CheckCircle2, culture_video: PlayCircle, quiz: FileQuestion, complete: CheckCircle2 }

function youtubePreviewUrl(url: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const id = parsed.hostname.includes('youtu.be') ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).at(-1)
    return id ? `https://www.youtube-nocookie.com/embed/${id}?controls=1&playsinline=1&rel=0&iv_load_policy=3&cc_load_policy=0&fs=1` : null
  } catch { return null }
}

export default function AdminElearningPage() {
  const [course, setCourse] = useState<AdminCourse | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AdminStep | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void fetch('/api/admin/elearning').then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (!active) return
      const loadedCourse = data.course as AdminCourse
      const firstLesson = [...(loadedCourse.elearning_lessons || [])].sort((a, b) => a.sort_order - b.sort_order)[0]
      const firstStep = [...(firstLesson?.elearning_steps || [])].sort((a, b) => a.sort_order - b.sort_order)[0]
      setCourse(loadedCourse)
      setSelectedLessonId(firstLesson?.id || null)
      setSelectedStepId(firstStep?.id || null)
      setDraft(firstStep ? { ...firstStep, content: { ...(firstStep.content || {}) } } : null)
    }).catch(error => toast.error(error.message))
    return () => { active = false }
  }, [])

  const lessons = useMemo(() => [...(course?.elearning_lessons || [])].sort((a, b) => a.sort_order - b.sort_order), [course])
  const selectedLesson = lessons.find(lesson => lesson.id === selectedLessonId) || null
  const steps = useMemo(() => [...(selectedLesson?.elearning_steps || [])].sort((a, b) => a.sort_order - b.sort_order), [selectedLesson])

  const selectLesson = (lesson: AdminLesson) => {
    const firstStep = [...lesson.elearning_steps].sort((a, b) => a.sort_order - b.sort_order)[0]
    setSelectedLessonId(lesson.id)
    setSelectedStepId(firstStep?.id || null)
    setDraft(firstStep ? { ...firstStep, content: { ...(firstStep.content || {}) } } : null)
  }
  const selectStep = (step: AdminStep) => { setSelectedStepId(step.id); setDraft({ ...step, content: { ...(step.content || {}) } }) }
  const updateContent = (field: keyof StepContent, value: string) => setDraft(current => current ? { ...current, content: { ...(current.content || {}), [field]: value } } : current)

  const saveStep = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/elearning', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stepId: draft.id, title: draft.title, instructions: draft.instructions, contentBody: draft.content?.body, resourceUrl: draft.content?.resourceUrl, buttonLabel: draft.content?.buttonLabel, youtubeUrl: draft.youtube_url, requiredWatchPercent: draft.required_watch_percent, isRequired: draft.is_required, isPublished: draft.is_published }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      const saved = data.step as AdminStep
      setCourse(current => current ? { ...current, elearning_lessons: current.elearning_lessons.map(lesson => ({ ...lesson, elearning_steps: lesson.elearning_steps.map(step => step.id === saved.id ? saved : step) })) } : current)
      setDraft({ ...saved, content: { ...(saved.content || {}) } })
      toast.success('Đã lưu nội dung bước học')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể lưu nội dung') } finally { setSaving(false) }
  }

  const Icon = draft ? stepIcons[draft.step_type] || BookOpen : BookOpen
  const previewUrl = youtubePreviewUrl(draft?.youtube_url || null)
  return <main className="mx-auto max-w-7xl"><header className="mb-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Module độc lập</p><h1 className="mt-1 text-3xl font-black">Quản trị E-Learning Quyển 1</h1><p className="mt-2 text-sm text-slate-500">Chọn bài và từng bước để biên soạn nội dung hiển thị cho học viên.</p></header>
    {!course ? <div className="grid min-h-64 place-items-center rounded-2xl border bg-white"><LoaderCircle className="size-8 animate-spin text-blue-600" /></div> : <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]"><aside className="self-start overflow-hidden rounded-2xl border bg-white lg:sticky lg:top-5"><div className="border-b bg-slate-50 p-4"><h2 className="font-bold">{course.title}</h2><p className="mt-1 text-xs text-slate-500">{lessons.length} bài học</p></div><div className="max-h-[70vh] overflow-y-auto p-2">{lessons.map(lesson => <button type="button" key={lesson.id} onClick={() => selectLesson(lesson)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left ${lesson.id === selectedLessonId ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm font-black">{lesson.lesson_number}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{lesson.title}</span>{lesson.elearning_steps.every(step => step.content?.body || step.youtube_url) ? <CheckCircle2 className="size-4 text-emerald-600" /> : null}</button>)}</div></aside>
      <section className="rounded-2xl border bg-white p-5 sm:p-7">{selectedLesson && draft ? <><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon /></span><div><p className="text-xs font-bold uppercase text-slate-400">Bài {selectedLesson.lesson_number} · Bước {draft.sort_order}</p><h2 className="text-xl font-black">{draft.title}</h2></div></div>
        <div className="mt-6"><h3 className="font-bold">Các bước của bài</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{steps.map(step => { const StepIcon = stepIcons[step.step_type] || BookOpen; return <button type="button" key={step.id} onClick={() => selectStep(step)} className={`rounded-xl border p-3 text-left transition ${step.id === selectedStepId ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'bg-slate-50 hover:border-blue-300'}`}><span className="flex items-center gap-2 text-xs font-bold text-blue-600"><StepIcon className="size-3.5" />Bước {step.sort_order}</span><p className="mt-1 truncate text-sm font-semibold">{step.title}</p></button> })}</div></div>
        <div className="mt-7 space-y-5 border-t pt-6"><label className="block"><span className="mb-2 block text-sm font-bold">Tiêu đề bước</span><input value={draft.title} onChange={event => setDraft(current => current ? { ...current, title: event.target.value } : current)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" /></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Hướng dẫn cho học viên</span><textarea value={draft.instructions || ''} onChange={event => setDraft(current => current ? { ...current, instructions: event.target.value } : current)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" placeholder="Mô tả học viên cần làm gì ở bước này..." /></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Nội dung chi tiết</span><textarea value={draft.content?.body || ''} onChange={event => updateContent('body', event.target.value)} rows={8} className="w-full rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-blue-500" placeholder="Nhập kiến thức, mục tiêu, bài tập hoặc câu hỏi. Xuống dòng để chia đoạn." /><span className="mt-1.5 block text-xs text-slate-500">Nội dung được hiển thị nguyên văn và giữ các dòng xuống hàng.</span></label>
          {['video', 'culture_video'].includes(draft.step_type) ? <><label className="block"><span className="mb-2 block text-sm font-bold">Đường dẫn YouTube</span><input value={draft.youtube_url || ''} onChange={event => setDraft(current => current ? { ...current, youtube_url: event.target.value } : current)} placeholder="https://www.youtube.com/watch?v=..." className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" /></label>{previewUrl ? <div><div className="mb-2 flex items-center justify-between"><span className="text-sm font-bold">Xem trước trên nền học</span><span className="text-xs text-slate-500">Tỷ lệ 16:9 · Cột nội dung 360px bên phải</span></div><div className="grid items-start gap-3 rounded-xl bg-slate-100 p-3 xl:grid-cols-[minmax(0,1fr)_220px]"><div className="aspect-video overflow-hidden rounded-lg bg-black"><iframe className="size-full" src={previewUrl} title="Xem trước video bài học" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div><div className="hidden min-h-40 rounded-lg bg-white p-3 text-xs text-slate-500 xl:block"><strong className="block text-sm text-slate-800">Vùng tương tác</strong><p className="mt-2 leading-5">Câu hỏi, ghi chú và hoạt động của học viên sẽ hiển thị tại cột này.</p></div></div></div> : <p className="text-xs text-slate-500">Dán URL YouTube hợp lệ để xem trước cách video hiển thị trong lớp học.</p>}<label className="block"><span className="mb-2 block text-sm font-bold">Tỷ lệ xem yêu cầu: {draft.required_watch_percent}%</span><input type="range" min="0" max="100" value={draft.required_watch_percent} onChange={event => setDraft(current => current ? { ...current, required_watch_percent: Number(event.target.value) } : current)} className="w-full" /></label></> : null}
          <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-bold">Liên kết tài nguyên</span><input value={draft.content?.resourceUrl || ''} onChange={event => updateContent('resourceUrl', event.target.value)} placeholder="https://... hoặc /duong-dan" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" /></label><label className="block"><span className="mb-2 block text-sm font-bold">Nhãn nút liên kết</span><input value={draft.content?.buttonLabel || ''} onChange={event => updateContent('buttonLabel', event.target.value)} placeholder="Mở tài liệu / Bắt đầu luyện tập" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" /></label></div>
          <div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_required} onChange={event => setDraft(current => current ? { ...current, is_required: event.target.checked } : current)} />Bắt buộc</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_published} onChange={event => setDraft(current => current ? { ...current, is_published: event.target.checked } : current)} />Xuất bản bước</label></div>
          <button type="button" onClick={saveStep} disabled={saving || !draft.title.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Lưu nội dung bước</button>
          {['video', 'culture_video'].includes(draft.step_type) ? <AdminVideoInteractions key={draft.id} stepId={draft.id} /> : null}
        </div></> : null}</section></div>}
  </main>
}
