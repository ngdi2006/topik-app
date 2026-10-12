'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, BookText, Check, CheckCircle2, ChevronDown, ChevronRight, Circle, FileQuestion, GraduationCap, Languages, Lightbulb, ListTree, LoaderCircle, LockKeyhole, PlayCircle, Sparkles, Target, X } from 'lucide-react'
import { toast } from 'sonner'
import type { ElearningCourse, ElearningLesson, ElearningStep } from '@/features/elearning/types'
import { YouTubeLearningPlayer } from '@/components/elearning/YouTubeLearningPlayer'
import { VideoInteractionPanel } from '@/components/elearning/VideoInteractionPanel'

const stepIcons = { overview: GraduationCap, video: PlayCircle, document: BookOpen, vocabulary: Languages, grammar: BookText, practice: Check, culture_video: PlayCircle, quiz: FileQuestion, complete: CheckCircle2 }

function isVideoStep(stepType?: string) {
  return stepType === 'video' || stepType === 'culture_video'
}

function youtubeVideoId(url: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const id = parsed.hostname.includes('youtu.be') ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).at(-1)
    return id || null
  } catch { return null }
}

function formatWatchTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds || 0))
  const minutes = Math.floor(safeSeconds / 60)
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`
}

function nextAvailableStep(course: ElearningCourse, currentStepId?: string) {
  const steps = course.lessons.flatMap(lesson => lesson.steps)
  if (currentStepId) {
    const currentIndex = steps.findIndex(step => step.id === currentStepId)
    const next = steps.slice(currentIndex + 1).find(step => step.unlocked && step.progress?.status !== 'completed')
    if (next) return next
  }
  return steps.find(step => step.unlocked && step.progress?.status !== 'completed') || steps.find(step => step.unlocked) || null
}

type ObjectiveSection = { title: string; items: string[] }

function parseObjectives(body: string) {
  const lines = body.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 1 && line !== '.')
  const intro: string[] = []
  const sections: ObjectiveSection[] = []
  let current: ObjectiveSection | null = null

  for (const line of lines) {
    const numberedHeading = line.match(/^\d+[.)]\s*(.+)$/)
    const isShortHeading = line.endsWith(':') && line.length <= 100
    if (numberedHeading || isShortHeading) {
      current = { title: (numberedHeading?.[1] || line).replace(/:$/, '').trim(), items: [] }
      sections.push(current)
    } else if (current) {
      current.items.push(line.replace(/^[-•]\s*/, ''))
    } else {
      intro.push(line)
    }
  }

  if (!sections.length && intro.length > 1) {
    sections.push({ title: 'Sau bài học, bạn có thể', items: intro.slice(1) })
    return { intro: [intro[0]], sections }
  }
  return { intro, sections }
}

export function ElearningCoursePlayer() {
  const [course, setCourse] = useState<ElearningCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)
  const [mobileRoadmapOpen, setMobileRoadmapOpen] = useState(false)
  const [videoProgress, setVideoProgress] = useState<Record<string, { watchedSeconds: number; durationSeconds: number; percent: number }>>({})
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null)
  const [locallyCompletedInteractionIds, setLocallyCompletedInteractionIds] = useState<string[]>([])

  const load = useCallback(async (preferredStepId?: string) => {
    const response = await fetch('/api/elearning/course', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Không thể tải khóa học')
    const loadedCourse = data.course as ElearningCourse
    const preferred = preferredStepId
      ? loadedCourse.lessons.flatMap(lesson => lesson.steps).find(step => step.id === preferredStepId && step.unlocked)
      : null
    const selectedStep = preferred || nextAvailableStep(loadedCourse)
    setCourse(loadedCourse)
    setSelectedStepId(selectedStep?.id || null)
    setOpenLessonId(loadedCourse.lessons.find(lesson => lesson.steps.some(step => step.id === selectedStep?.id))?.id || null)
    return loadedCourse
  }, [])

  useEffect(() => {
    let active = true
    void load().catch(error => active && toast.error(error.message)).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [load])

  const selected = useMemo(() => course?.lessons.flatMap(lesson => lesson.steps.map(step => ({ lesson, step }))).find(item => item.step.id === selectedStepId) || null, [course, selectedStepId])
  const videoId = youtubeVideoId(selected?.step.youtube_url || null)
  const currentVideoProgress = selected ? videoProgress[selected.step.id] : undefined
  const requiredVideoPercent = isVideoStep(selected?.step.step_type) ? selected!.step.required_watch_percent : 0
  const savedVideoPercent = selected?.step.progress?.progress_percent || 0
  const videoWatchPercent = currentVideoProgress?.percent ?? savedVideoPercent
  const watchedVideoSeconds = currentVideoProgress?.watchedSeconds ?? selected?.step.progress?.watched_seconds ?? 0
  const videoDurationSeconds = currentVideoProgress?.durationSeconds ?? selected?.step.progress?.metadata?.video_duration_seconds ?? 0
  const selectedInteractions = useMemo(() => selected?.step.interactions || [], [selected?.step.interactions])
  const completedInteractionIds = useMemo(() => selectedInteractions.filter(item => item.progress?.completed_at || locallyCompletedInteractionIds.includes(item.id)).map(item => item.id), [locallyCompletedInteractionIds, selectedInteractions])
  const requiredInteractionsComplete = selectedInteractions.filter(item => item.is_required).every(item => completedInteractionIds.includes(item.id))
  const activeInteractionOpen = selectedInteractions.some(item => item.id === activeInteractionId)
  const canCompleteSelected = !isVideoStep(selected?.step.step_type) || selected?.step.progress?.status === 'completed' || (videoWatchPercent >= requiredVideoPercent && requiredInteractionsComplete)

  const completeStep = async () => {
    if (!selected) return
    setSaving(true)
    try {
      if (!canCompleteSelected) return toast.error(`Bạn cần xem ít nhất ${requiredVideoPercent}% video trước khi tiếp tục`)
      const response = await fetch('/api/elearning/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stepId: selected.step.id, status: 'completed', watchedSeconds: currentVideoProgress?.watchedSeconds, videoDurationSeconds: currentVideoProgress?.durationSeconds }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không thể lưu tiến độ')
      const refreshed = await load(selected.step.id)
      const next = nextAvailableStep(refreshed, selected.step.id)
      if (next) {
        setSelectedStepId(next.id)
        setOpenLessonId(refreshed.lessons.find(lesson => lesson.steps.some(step => step.id === next.id))?.id || null)
      }
      toast.success('Đã hoàn thành bước học')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu tiến độ')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-8 animate-spin text-blue-600" /></div>
  if (!course) return <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">Khóa học Quyển 1 chưa được khởi tạo. Vui lòng áp dụng migration E-Learning.</div>

  return <div className="grid w-full min-w-0 max-w-full overflow-x-clip gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
    <aside className="w-full min-w-0 self-start border-b border-slate-200 bg-white xl:sticky xl:top-[72px] xl:h-[calc(100vh-72px)] xl:border-r xl:shadow-sm">
      <button type="button" aria-expanded={mobileRoadmapOpen} aria-controls="course-roadmap" onClick={() => setMobileRoadmapOpen(true)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left transition hover:bg-blue-50 xl:hidden"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white"><ListTree className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-950">Lộ trình học</strong><span className="block truncate text-[11px] text-slate-500">{course.title}</span></span><span className="text-xs font-black tabular-nums text-blue-700">{course.progressPercent}%</span><ChevronRight className="size-4 text-slate-400" /></button>
      <div className="hidden bg-gradient-to-br from-blue-700 to-indigo-700 p-5 text-white xl:block"><p className="text-xs font-bold uppercase tracking-wider text-blue-100">Lộ trình học</p><h1 className="mt-1 text-xl font-black">{course.title}</h1><div className="mt-4 flex justify-between text-xs"><span>Tiến độ toàn khóa</span><strong>{course.progressPercent}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${course.progressPercent}%` }} /></div></div>
      {mobileRoadmapOpen ? <button type="button" aria-label="Đóng lộ trình học" className="fixed inset-0 top-[72px] z-50 bg-slate-950/35 backdrop-blur-[2px] xl:hidden" onClick={() => setMobileRoadmapOpen(false)} /> : null}
      <nav id="course-roadmap" className={`fixed inset-y-0 left-0 z-[60] flex w-[min(88vw,360px)] flex-col overflow-y-auto bg-white p-2 shadow-[18px_0_45px_rgba(15,23,42,0.22)] transition-transform duration-300 ease-out xl:static xl:z-auto xl:block xl:max-h-[calc(100vh-209px)] xl:w-auto xl:translate-x-0 xl:shadow-none ${mobileRoadmapOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Tiến độ E-Learning"><div className="sticky top-0 z-10 -mx-2 -mt-2 mb-2 flex items-center gap-3 bg-gradient-to-r from-blue-700 to-indigo-700 px-4 py-4 text-white xl:hidden"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15"><ListTree className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Lộ trình học</p><strong className="block truncate text-sm">{course.title}</strong><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${course.progressPercent}%` }} /></div></div><button type="button" aria-label="Đóng" onClick={() => setMobileRoadmapOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button></div>{course.lessons.map(lesson => <div key={lesson.id} className="mb-1"><button type="button" disabled={!lesson.unlocked} onClick={() => lesson.unlocked && setOpenLessonId(current => current === lesson.id ? null : lesson.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><span className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black ${lesson.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{lesson.status === 'completed' ? <Check className="size-4" /> : lesson.lesson_number}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{lesson.title}</strong><span className="text-[11px] text-slate-500">{lesson.progressPercent}% · {lesson.estimated_minutes} phút</span></span>{lesson.unlocked ? <ChevronDown className={`size-4 transition ${openLessonId === lesson.id ? 'rotate-180' : ''}`} /> : <LockKeyhole className="size-4" />}</button>{openLessonId === lesson.id ? <div className="ml-7 border-l border-slate-200 pl-3">{lesson.steps.map(step => { const Icon = stepIcons[step.step_type]; const done = step.progress?.status === 'completed'; return <button type="button" key={step.id} disabled={!step.unlocked} onClick={() => { setSelectedStepId(step.id); setMobileRoadmapOpen(false) }} className={`my-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs ${selectedStepId === step.id ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}><Icon className={`size-3.5 ${done ? 'text-emerald-600' : ''}`} /><span className="flex-1">{step.title}</span>{done ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : !step.unlocked ? <LockKeyhole className="size-3" /> : <Circle className="size-3 text-slate-300" />}</button> })}</div> : null}</div>)}</nav>
    </aside>
    <main className="w-full min-w-0 max-w-full bg-white xl:m-4">{selected ? <><header className="border-b border-slate-100 px-4 py-4 sm:px-7 sm:py-5"><p className="text-[11px] font-black uppercase tracking-wider text-blue-600 sm:text-xs">Bài {selected.lesson.lesson_number} · Bước {selected.step.sort_order}/{selected.lesson.steps.length}</p><h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{selected.step.title}</h2><p className="mt-1.5 text-sm leading-5 text-slate-500 sm:mt-2">{selected.step.instructions || 'Hoàn thành nội dung của bước này để tiếp tục lộ trình.'}</p></header><div className="min-h-[420px] p-0 sm:p-5 lg:p-7">
      {isVideoStep(selected.step.step_type) ? <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="min-w-0">{videoId ? <YouTubeLearningPlayer key={selected.step.id} videoId={videoId} stepId={selected.step.id} title={selected.step.title} initialWatchedSeconds={selected.step.progress?.watched_seconds || 0} interactions={selectedInteractions} completedInteractionIds={completedInteractionIds} interactionOpen={activeInteractionOpen} onInteraction={setActiveInteractionId} onProgress={progress => setVideoProgress(current => ({ ...current, [selected.step.id]: progress }))} /> : <div className="grid min-h-80 place-items-center bg-blue-50 text-center"><div><PlayCircle className="mx-auto size-12 text-blue-500" /><h3 className="mt-3 font-bold">Video đang được chuẩn bị</h3><p className="mt-1 text-sm text-slate-500">Quản trị viên có thể dán đường dẫn YouTube tại trang quản trị E-Learning.</p></div></div>}{videoId ? <VideoProgressCard percent={selected.step.progress?.status === 'completed' ? 100 : videoWatchPercent} requiredPercent={requiredVideoPercent} watchedSeconds={watchedVideoSeconds} durationSeconds={videoDurationSeconds} completed={selected.step.progress?.status === 'completed'} /> : null}{typeof selected.step.content?.body === 'string' && selected.step.content.body ? <p className="mt-4 whitespace-pre-line bg-slate-50 p-4 text-sm leading-6 text-slate-700">{selected.step.content.body}</p> : null}</div><aside className="xl:sticky xl:top-[88px]"><VideoInteractionPanel variant="sidebar" interactions={selectedInteractions} activeId={activeInteractionId} locallyCompletedIds={locallyCompletedInteractionIds} onCompleted={id => setLocallyCompletedInteractionIds(current => current.includes(id) ? current : [...current, id])} onContinue={() => setActiveInteractionId(null)} /></aside></div> : <StepContent lesson={selected.lesson} step={selected.step} />}
    </div><footer className="flex flex-col items-end gap-2 border-t bg-slate-50 p-4 sm:px-7">{isVideoStep(selected.step.step_type) && !canCompleteSelected ? <p className="text-xs font-semibold text-amber-700">{videoWatchPercent < requiredVideoPercent ? `Cần xem thêm ${Math.max(0, requiredVideoPercent - videoWatchPercent)}% video.` : 'Cần hoàn thành các câu hỏi bắt buộc trong video.'}</p> : null}<button disabled={saving || selected.step.progress?.status === 'completed' || !canCompleteSelected} onClick={completeStep} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{selected.step.progress?.status === 'completed' ? 'Đã hoàn thành' : canCompleteSelected ? 'Hoàn thành và tiếp tục' : videoWatchPercent < requiredVideoPercent ? `Cần xem ${requiredVideoPercent}% video` : 'Hoàn thành câu hỏi'}<ChevronRight className="size-4" /></button></footer></> : null}</main>
  </div>
}

function VideoProgressCard({ percent, requiredPercent, watchedSeconds, durationSeconds, completed }: { percent: number; requiredPercent: number; watchedSeconds: number; durationSeconds: number; completed: boolean }) {
  const displayPercent = Math.min(100, Math.max(0, percent))
  const requirementMet = completed || displayPercent >= requiredPercent
  const progressColor = requirementMet ? '#10b981' : '#2563eb'
  return <section className={`flex items-center gap-3 px-4 py-3 sm:mt-3 sm:rounded-xl sm:border sm:px-4 ${requirementMet ? 'bg-emerald-50/70 sm:border-emerald-200' : 'bg-blue-50 sm:border-blue-100'}`} aria-label={`Đã xem ${displayPercent}% video`}>
    <div className="relative grid size-12 shrink-0 place-items-center rounded-full sm:size-16" style={{ background: `conic-gradient(${progressColor} ${displayPercent * 3.6}deg, #dbeafe 0deg)` }}><div className="grid size-9 place-items-center rounded-full bg-white text-center shadow-inner sm:size-[50px]"><strong className={`text-xs font-black tabular-nums sm:text-sm ${requirementMet ? 'text-emerald-600' : 'text-blue-700'}`}>{displayPercent}%</strong></div></div>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><div className="min-w-0"><h3 className="text-sm font-black text-slate-950">Tiến độ xem</h3><p className="text-[11px] text-slate-500"><strong className="tabular-nums text-slate-700">{formatWatchTime(watchedSeconds)}</strong> / {durationSeconds ? formatWatchTime(durationSeconds) : '--:--'} · Tua không tính tiến độ</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${requirementMet ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-blue-700 ring-1 ring-blue-100'}`}>{requirementMet ? 'Đã đạt' : `Yêu cầu ${requiredPercent}%`}</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100"><div className={`h-full rounded-full transition-[width] ${requirementMet ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${displayPercent}%` }} /></div>
    </div>
  </section>
}

function StepContent({ lesson, step }: { lesson: ElearningLesson; step: ElearningStep }) {
  const descriptions = { overview: 'Xem mục tiêu và kiến thức trọng tâm của bài.', document: 'Đọc nội dung giáo trình và ghi chú những phần quan trọng.', vocabulary: 'Học danh sách từ vựng và luyện ghi nhớ theo bài.', grammar: 'Ôn cấu trúc, cách dùng và ví dụ của bài học.', practice: 'Luyện nghe, đọc và phản xạ theo nội dung vừa học.', culture_video: 'Khám phá thông tin văn hóa Hàn Quốc liên quan đến bài học.', quiz: 'Hoàn thành bài đánh giá cuối bài để kiểm tra kiến thức.', complete: 'Tổng kết kết quả và xác nhận hoàn thành bài.', video: '' }
  const configuredUrl = typeof step.content?.resourceUrl === 'string' ? step.content.resourceUrl : ''
  const configuredBody = typeof step.content?.body === 'string' ? step.content.body : ''
  const buttonLabel = typeof step.content?.buttonLabel === 'string' && step.content.buttonLabel ? step.content.buttonLabel : 'Mở nội dung bài học'
  const href = configuredUrl || (lesson.textbook_unit_id && (step.step_type === 'vocabulary' || step.step_type === 'grammar')
    ? `/textbooks/learning/${step.step_type}?unit=${lesson.textbook_unit_id}`
    : step.step_type === 'document' ? '/textbooks' : '')
  const Icon = stepIcons[step.step_type]
  if (step.step_type === 'overview') return <ObjectiveContent body={configuredBody || descriptions.overview} href={href} buttonLabel={buttonLabel} lessonNumber={lesson.lesson_number} />
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><Icon className="size-10 text-blue-600" /><h3 className="mt-4 text-lg font-bold">{step.title}</h3><p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-600">{configuredBody || descriptions[step.step_type]}</p>{href ? <Link href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-blue-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-blue-50">{buttonLabel}<ChevronRight className="size-4" /></Link> : null}</div>
}

function ObjectiveContent({ body, href, buttonLabel, lessonNumber }: { body: string; href: string; buttonLabel: string; lessonNumber: number }) {
  const content = parseObjectives(body)
  const outcomeCount = content.sections.reduce((total, section) => total + section.items.length, 0)
  return <div className="overflow-hidden bg-white sm:rounded-2xl sm:shadow-[0_14px_40px_rgba(37,99,235,0.07)]">
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 px-6 py-7 text-white sm:px-8 sm:py-9">
      <div aria-hidden="true" className="absolute -right-16 -top-20 size-56 rounded-full bg-white/10 blur-sm" />
      <div aria-hidden="true" className="absolute -bottom-24 right-32 size-48 rounded-full bg-cyan-300/10" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-blue-50 ring-1 ring-white/20"><Sparkles className="size-3.5" />Định hướng bài học</span><h3 className="mt-4 text-2xl font-black sm:text-3xl">Bạn sẽ làm được gì sau Bài {lessonNumber}?</h3><p className="mt-3 text-sm leading-6 text-blue-50 sm:text-base">{content.intro.join(' ') || 'Nắm rõ mục tiêu trước khi bắt đầu để học đúng trọng tâm và theo dõi kết quả dễ dàng hơn.'}</p></div>
        <div className="grid shrink-0 grid-cols-2 divide-x divide-white/20"><div className="px-5 py-2 text-center"><strong className="block text-2xl font-black">{content.sections.length || 1}</strong><span className="text-xs text-blue-100">Nhóm kiến thức</span></div><div className="px-5 py-2 text-center"><strong className="block text-2xl font-black">{outcomeCount || 1}</strong><span className="text-xs text-blue-100">Kết quả cần đạt</span></div></div>
      </div>
    </section>
    <div className="px-4 py-5 sm:p-8">
      <div className="mb-6 flex items-start gap-3 bg-amber-50 px-4 py-3 sm:rounded-xl"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Lightbulb className="size-4" /></span><div><p className="text-sm font-bold text-amber-950">Cách học hiệu quả</p><p className="mt-0.5 text-sm leading-6 text-amber-900/75">Đọc từng mục tiêu, hình dung tình huống sử dụng thực tế và quay lại kiểm tra sau khi hoàn thành bài.</p></div></div>
      <div className="grid items-start gap-x-8 lg:grid-cols-2">{content.sections.map((section, sectionIndex) => <article className="border-b border-slate-100 py-5 first:pt-0 lg:min-h-full" key={`${section.title}-${sectionIndex}`}><header className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">{sectionIndex + 1}</span><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Mục tiêu trọng tâm</p><h4 className="mt-0.5 font-black leading-6 text-slate-950">{section.title}</h4></div></header><ul className="mt-3 space-y-1 pl-1 sm:pl-10">{section.items.length ? section.items.map((item, itemIndex) => <li className="flex gap-3 py-2 text-sm leading-6 text-slate-700" key={`${item}-${itemIndex}`}><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" /><span>{item}</span></li>) : <li className="flex gap-3 py-2 text-sm text-slate-500"><Target className="size-4 shrink-0 text-blue-500" />Nắm vững nội dung trọng tâm của phần này.</li>}</ul></article>)}</div>
      {href ? <Link href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">{buttonLabel}<ChevronRight className="size-4" /></Link> : null}
    </div>
  </div>
}
