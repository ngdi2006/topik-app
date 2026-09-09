'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight, Circle, FileQuestion, GraduationCap, LoaderCircle, LockKeyhole, PlayCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { ElearningCourse, ElearningLesson, ElearningStep } from '@/features/elearning/types'

const stepIcons = { overview: GraduationCap, video: PlayCircle, document: BookOpen, vocabulary: BookOpen, grammar: BookOpen, practice: Check, quiz: FileQuestion, complete: CheckCircle2 }

function youtubeEmbedUrl(url: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const id = parsed.hostname.includes('youtu.be') ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).at(-1)
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
  } catch { return null }
}

export function ElearningCoursePlayer() {
  const [course, setCourse] = useState<ElearningCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)

  const load = async (keepSelection = true) => {
    const response = await fetch('/api/elearning/course', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Không thể tải khóa học')
    setCourse(data.course)
    const firstAvailable = data.course.lessons.flatMap((lesson: ElearningLesson) => lesson.steps).find((step: ElearningStep) => step.unlocked && step.progress?.status !== 'completed') || data.course.lessons[0]?.steps[0]
    setSelectedStepId(current => keepSelection && current ? current : firstAvailable?.id || null)
    setOpenLessonId(current => current || data.course.lessons.find((lesson: ElearningLesson) => lesson.steps.some((step: ElearningStep) => step.id === firstAvailable?.id))?.id || null)
  }

  useEffect(() => { let active = true; void load(false).catch(error => active && toast.error(error.message)).finally(() => active && setLoading(false)); return () => { active = false } }, [])
  const selected = useMemo(() => course?.lessons.flatMap(lesson => lesson.steps.map(step => ({ lesson, step }))).find(item => item.step.id === selectedStepId) || null, [course, selectedStepId])
  const embedUrl = youtubeEmbedUrl(selected?.step.youtube_url || null)

  const completeStep = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const response = await fetch('/api/elearning/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stepId: selected.step.id, status: 'completed' }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      await load(true)
      const refreshed = await fetch('/api/elearning/course', { cache: 'no-store' }).then(r => r.json())
      const allSteps = (refreshed.course?.lessons || []).flatMap((lesson: ElearningLesson) => lesson.steps)
      const currentIndex = allSteps.findIndex((step: ElearningStep) => step.id === selected.step.id)
      setCourse(refreshed.course); setSelectedStepId(allSteps[currentIndex + 1]?.id || selected.step.id)
      toast.success('Đã hoàn thành bước học')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể lưu tiến độ') } finally { setSaving(false) }
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-8 animate-spin text-blue-600" /></div>
  if (!course) return <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">Khóa học Quyển 1 chưa được khởi tạo. Vui lòng áp dụng migration E-Learning.</div>

  return <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
    <aside className="self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-20">
      <div className="bg-gradient-to-br from-blue-700 to-indigo-700 p-5 text-white"><p className="text-xs font-bold uppercase tracking-wider text-blue-100">Lộ trình học</p><h1 className="mt-1 text-xl font-black">{course.title}</h1><div className="mt-4 flex justify-between text-xs"><span>Tiến độ toàn khóa</span><strong>{course.progressPercent}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${course.progressPercent}%` }} /></div></div>
      <nav className="max-h-[calc(100vh-230px)] overflow-y-auto p-2" aria-label="Tiến độ E-Learning">{course.lessons.map(lesson => <div key={lesson.id} className="mb-1"><button type="button" disabled={!lesson.unlocked} onClick={() => lesson.unlocked && setOpenLessonId(current => current === lesson.id ? null : lesson.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><span className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black ${lesson.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{lesson.status === 'completed' ? <Check className="size-4" /> : lesson.lesson_number}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{lesson.title}</strong><span className="text-[11px] text-slate-500">{lesson.progressPercent}% · {lesson.estimated_minutes} phút</span></span>{lesson.unlocked ? <ChevronDown className={`size-4 transition ${openLessonId === lesson.id ? 'rotate-180' : ''}`} /> : <LockKeyhole className="size-4" />}</button>{openLessonId === lesson.id ? <div className="ml-7 border-l border-slate-200 pl-3">{lesson.steps.map(step => { const Icon = stepIcons[step.step_type]; const done = step.progress?.status === 'completed'; return <button type="button" key={step.id} disabled={!step.unlocked} onClick={() => setSelectedStepId(step.id)} className={`my-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs ${selectedStepId === step.id ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}><Icon className={`size-3.5 ${done ? 'text-emerald-600' : ''}`} /><span className="flex-1">{step.title}</span>{done ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : !step.unlocked ? <LockKeyhole className="size-3" /> : <Circle className="size-3 text-slate-300" />}</button> })}</div> : null}</div>)}</nav>
    </aside>
    <main className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">{selected ? <><header className="border-b p-5 sm:p-7"><p className="text-xs font-black uppercase tracking-wider text-blue-600">Bài {selected.lesson.lesson_number} · Bước {selected.step.sort_order}/8</p><h2 className="mt-1 text-2xl font-black text-slate-950">{selected.step.title}</h2><p className="mt-2 text-sm text-slate-500">{selected.step.instructions || 'Hoàn thành nội dung của bước này để tiếp tục lộ trình.'}</p></header><div className="min-h-[420px] p-5 sm:p-7">
      {selected.step.step_type === 'video' ? embedUrl ? <div className="aspect-video overflow-hidden rounded-2xl bg-black"><iframe className="h-full w-full" src={embedUrl} title={selected.step.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : <div className="grid min-h-80 place-items-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 text-center"><div><PlayCircle className="mx-auto size-12 text-blue-500" /><h3 className="mt-3 font-bold">Video đang được chuẩn bị</h3><p className="mt-1 text-sm text-slate-500">Quản trị viên có thể dán đường dẫn YouTube tại trang quản trị E-Learning.</p></div></div> : <StepPlaceholder step={selected.step} />}
    </div><footer className="flex justify-end border-t bg-slate-50 p-4 sm:px-7"><button disabled={saving || selected.step.progress?.status === 'completed'} onClick={completeStep} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{selected.step.progress?.status === 'completed' ? 'Đã hoàn thành' : 'Hoàn thành và tiếp tục'}<ChevronRight className="size-4" /></button></footer></> : null}</main>
  </div>
}

function StepPlaceholder({ step }: { step: ElearningStep }) {
  const descriptions = { overview: 'Xem mục tiêu và kiến thức trọng tâm của bài.', document: 'Nội dung giáo trình của bài sẽ được liên kết tại đây.', vocabulary: 'Danh sách từ vựng và bài luyện ghi nhớ theo bài.', grammar: 'Giải thích ngữ pháp, ví dụ và bài tập áp dụng.', practice: 'Bài luyện nghe, đọc và phản xạ theo nội dung vừa học.', quiz: 'Quiz đánh giá cuối bài. Ngưỡng thông qua do quản trị viên cấu hình.', complete: 'Tổng kết kết quả và xác nhận hoàn thành bài.', video: '' }
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><BookOpen className="size-10 text-blue-600" /><h3 className="mt-4 text-lg font-bold">{step.title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{descriptions[step.step_type]}</p></div>
}
