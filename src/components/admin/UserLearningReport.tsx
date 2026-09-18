import { Activity, BookOpen, CheckCircle2, Circle, History } from 'lucide-react'

export type UserLearningReportData = {
  summary: { totalLessons: number; completedLessons: number; inProgressLessons: number; notStartedLessons: number; completedExams: number; inProgressExams: number; interactionCount: number; latestActivityAt: string | null }
  lessons: Array<{ id: string; lessonNumber: number; title: string; progressPercent: number; status: 'completed' | 'in_progress' | 'not_started'; completedSections: string[]; lastAccessedAt: string | null }>
  attempts: Array<{ id: string; status?: string; raw_score?: number; score: number; total_points?: number; total_correct: number; created_at: string; exams?: { title?: string } }>
  events: Array<{ id: string; event_name: string; content_type: string | null; content_id: string | null; is_correct: boolean | null; occurred_at: string }>
  interview: {
    syncedAt: string | null
    topics: Array<{ topicId: string; attempted: number; mastered: number; incorrect: number; lastSeenAt: string | null }>
    exams: Array<{ id: string; score: number; totalScore: number; passed: boolean; industry: string; completedAt: string }>
    practicedTopics: number; totalAttempted: number; totalMastered: number; needsReview: number; aiEvaluations: number; aiUses: number
    entitlement: { status: string; starts_at: string; expires_at: string } | null
  }
}

const EVENT_LABELS: Record<string, string> = {
  lesson_started: 'Bắt đầu bài học', lesson_completed: 'Hoàn thành bài học', exam_started: 'Bắt đầu bài thi',
  exam_completed: 'Hoàn thành bài thi', question_answered: 'Trả lời câu hỏi', question_skipped: 'Bỏ qua câu hỏi',
  practice_started: 'Bắt đầu luyện tập', practice_completed: 'Hoàn thành luyện tập', practice_retried: 'Luyện tập lại',
}

const INTERVIEW_TOPICS = [
  ['introduction', 'P1', 'Giới thiệu bản thân'], ['command', 'P2', 'Khẩu lệnh phản xạ'], ['vocabulary', 'P3', 'Từ vựng và biển báo'],
  ['math', 'P4', 'Toán học'], ['tools', 'P5', 'Sử dụng công cụ'], ['communication', 'P6', 'Kỹ năng giao tiếp'],
  ['situation', 'P7', 'Xử lý tình huống'], ['safety', 'P8', 'An toàn lao động'],
] as const

export function UserLearningReport({ report }: { report: UserLearningReportData }) {
  const { summary } = report
  const cards: Array<[string, number, string]> = [
    ['Bài học xong', summary.completedLessons, 'bg-emerald-50 text-emerald-700'], ['Đang học', summary.inProgressLessons, 'bg-blue-50 text-blue-700'],
    ['Bài chưa mở', summary.notStartedLessons, 'bg-slate-100 text-slate-700'], ['Thi hoàn thành', summary.completedExams, 'bg-violet-50 text-violet-700'],
    ['Thi chưa nộp', summary.inProgressExams, 'bg-amber-50 text-amber-700'], ['Tổng tương tác', summary.interactionCount, 'bg-cyan-50 text-cyan-700'],
  ]
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{cards.map(([label, value, color]) => <div key={label} className={`rounded-xl p-3 ${color}`}><span className="block text-[11px] font-semibold">{label}</span><strong className="mt-1 block text-2xl">{value}</strong></div>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-xl border border-slate-200">
        <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3"><h3 className="flex items-center gap-2 font-bold"><BookOpen className="size-4 text-blue-600" />Tiến độ bài học</h3><span className="text-xs text-slate-500">Đã tương tác {summary.completedLessons + summary.inProgressLessons}/{summary.totalLessons}</span></div>
        <div className="max-h-[370px] divide-y overflow-y-auto">{report.lessons.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Chưa có bài học được xuất bản.</p> : report.lessons.map(lesson => <div key={lesson.id} className="flex gap-3 p-3.5">
          {lesson.status === 'completed' ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : lesson.status === 'in_progress' ? <Activity className="mt-0.5 size-5 shrink-0 text-blue-600" /> : <Circle className="mt-0.5 size-5 shrink-0 text-slate-300" />}
          <div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="truncate text-sm font-semibold">Bài {lesson.lessonNumber}: {lesson.title}</p><span className="text-xs font-bold">{lesson.progressPercent}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${lesson.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${lesson.progressPercent}%` }} /></div><div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-slate-500"><span>{lesson.status === 'completed' ? 'Đã hoàn thành' : lesson.status === 'in_progress' ? 'Đang thực hiện' : 'Chưa tương tác'}</span>{lesson.completedSections.length > 0 ? <span>Phần đã làm: {lesson.completedSections.join(', ')}</span> : null}{lesson.lastAccessedAt ? <span>Lần cuối: {new Date(lesson.lastAccessedAt).toLocaleString('vi-VN')}</span> : null}</div></div>
        </div>)}</div>
      </section>
      <section className="rounded-xl border border-slate-200"><div className="border-b bg-slate-50 px-4 py-3"><h3 className="flex items-center gap-2 font-bold"><Activity className="size-4 text-cyan-600" />Tương tác gần đây</h3></div><div className="max-h-[370px] divide-y overflow-y-auto">{report.events.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Chưa ghi nhận tương tác nào.</p> : report.events.map(event => <div key={event.id} className="p-3.5"><div className="flex justify-between gap-2"><p className="text-sm font-semibold">{EVENT_LABELS[event.event_name] || event.event_name}</p>{event.is_correct !== null ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${event.is_correct ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{event.is_correct ? 'Đúng' : 'Chưa đúng'}</span> : null}</div><p className="mt-1 truncate text-xs text-slate-500">{event.content_type || 'Nội dung'}{event.content_id ? ` · ${event.content_id}` : ''}</p><time className="text-[11px] text-slate-400">{new Date(event.occurred_at).toLocaleString('vi-VN')}</time></div>)}</div></section>
    </div>
    <InterviewProgressSection interview={report.interview} />
    <section className="rounded-xl border border-slate-200"><div className="border-b bg-slate-50 px-4 py-3"><h3 className="flex items-center gap-2 font-bold"><History className="size-4 text-violet-600" />Lịch sử làm bài thi</h3></div>{report.attempts.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Chưa bắt đầu bài thi nào.</p> : <div className="divide-y">{report.attempts.map(record => <div key={record.id} className="flex items-center justify-between gap-4 p-3.5"><div className="min-w-0"><p className="truncate text-sm font-semibold">{record.exams?.title || 'Đề thi'}</p><p className="mt-1 text-xs text-slate-500">{new Date(record.created_at).toLocaleString('vi-VN')} · {record.status === 'completed' ? 'Đã nộp bài' : record.status === 'abandoned' ? 'Đã dừng/chưa nộp' : 'Đang thực hiện'}</p></div>{record.status === 'completed' ? <div className="shrink-0 text-right"><strong className="text-lg text-blue-700">{record.raw_score ?? record.score}/{record.total_points ?? 100}</strong><span className="block text-[11px] text-emerald-600">Đúng {record.total_correct} câu</span></div> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Chưa hoàn thành</span>}</div>)}</div>}</section>
  </div>
}

function InterviewProgressSection({ interview }: { interview: UserLearningReportData['interview'] }) {
  const byTopic = new Map(interview.topics.map(topic => [topic.topicId, topic]))
  const stats: Array<[string, string | number]> = [['Phần đã luyện', `${interview.practicedTopics}/8`], ['Câu đã luyện', interview.totalAttempted], ['Đã thành thạo', interview.totalMastered], ['Cần ôn lại', interview.needsReview], ['Chấm AI', Math.max(interview.aiEvaluations, interview.aiUses)], ['Thi thử V2', interview.exams.length]]
  return <section className="overflow-hidden rounded-xl border border-violet-200">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 bg-violet-50 px-4 py-3"><h3 className="flex items-center gap-2 font-bold text-violet-950"><Activity className="size-4 text-violet-600" />Luyện phỏng vấn Vòng 2</h3><span className="text-xs text-violet-700">{interview.syncedAt ? `Đồng bộ ${new Date(interview.syncedAt).toLocaleString('vi-VN')}` : 'Chưa đồng bộ tiến độ từ thiết bị'}</span></div>
    <div className="grid gap-2 border-b p-3 sm:grid-cols-3 lg:grid-cols-6">{stats.map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-2.5"><span className="block text-[10px] font-semibold text-slate-500">{label}</span><strong className="text-lg">{value}</strong></div>)}</div>
    <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">{INTERVIEW_TOPICS.map(([id, code, name]) => { const topic = byTopic.get(id); const attempted = topic?.attempted || 0; return <div key={id} className={`rounded-xl border p-3 ${attempted ? 'border-violet-200 bg-violet-50/40' : 'border-slate-200'}`}><div className="flex items-center justify-between"><strong className="text-sm">{code} · {name}</strong>{attempted ? <CheckCircle2 className="size-4 text-violet-600" /> : <Circle className="size-4 text-slate-300" />}</div><p className="mt-2 text-xs text-slate-600">{attempted ? `${attempted} câu đã luyện · ${topic?.mastered || 0} thành thạo` : 'Chưa ghi nhận tương tác'}</p>{topic?.incorrect ? <p className="mt-1 text-[11px] font-semibold text-amber-700">{topic.incorrect} câu cần ôn lại</p> : null}</div> })}</div>
    {interview.exams.length ? <div className="border-t p-3"><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Thi thử Vòng 2 gần đây</h4><div className="space-y-2">{interview.exams.slice(0, 5).map(exam => <div key={exam.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{exam.industry} · {new Date(exam.completedAt).toLocaleString('vi-VN')}</span><strong className={exam.passed ? 'text-emerald-700' : 'text-amber-700'}>{exam.score}/{exam.totalScore}</strong></div>)}</div></div> : null}
  </section>
}
