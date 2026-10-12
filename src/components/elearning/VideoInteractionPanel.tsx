'use client'

import { useState } from 'react'
import { CheckCircle2, Clock3, Info, LoaderCircle, XCircle } from 'lucide-react'
import type { ElearningVideoInteraction } from '@/features/elearning/types'

export function VideoInteractionPanel({ interactions, activeId, locallyCompletedIds, onCompleted, onContinue, variant = 'below' }: { interactions: ElearningVideoInteraction[]; activeId: string | null; locallyCompletedIds: string[]; onCompleted: (id: string) => void; onContinue: () => void; variant?: 'below' | 'sidebar' }) {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ isCorrect: boolean } | null>(null)
  const active = interactions.find(item => item.id === activeId) || null
  const completed = (item: ElearningVideoInteraction) => Boolean(item.progress?.completed_at) || locallyCompletedIds.includes(item.id)

  const submit = async () => {
    if (!active || (active.interaction_type !== 'info' && !answer)) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/elearning/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interactionId: active.id, answer }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setResult({ isCorrect: data.isCorrect })
      onCompleted(active.id)
    } finally { setSubmitting(false) }
  }

  const continueVideo = () => { setAnswer(''); setResult(null); onContinue() }
  return <section className={`${variant === 'sidebar' ? 'bg-white px-4 py-5 xl:max-h-[calc(100vh-190px)] xl:overflow-y-auto xl:bg-slate-50 xl:py-4' : 'mt-5 bg-slate-50 px-4 py-5 sm:px-6'}`}><div className="flex items-end justify-between gap-3 border-b border-slate-100 pb-3 xl:border-0 xl:pb-0"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-blue-600 sm:text-xs">Lớp học tương tác</p><h3 className="mt-1 text-base font-black text-slate-950">Hoạt động trong video</h3></div><span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{interactions.filter(completed).length}/{interactions.length} hoàn thành</span></div>
    {!interactions.length ? <div className="mt-4 bg-white px-4 py-6 text-center text-sm leading-6 text-slate-500"><Info className="mx-auto mb-2 size-5 text-blue-500" />Nội dung tương tác sẽ xuất hiện tại đây khi giáo viên thêm câu hỏi hoặc ghi chú vào video.</div> : null}
    {active ? <div className="mt-4 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2 text-xs font-bold text-blue-700"><Clock3 className="size-4" />Xuất hiện tại {Math.floor(active.timestamp_seconds / 60)}:{String(active.timestamp_seconds % 60).padStart(2, '0')}</div><h4 className="mt-3 text-lg font-black">{active.title}</h4><p className="mt-2 text-sm leading-6 text-slate-700">{active.prompt}</p>
      {!result && active.interaction_type !== 'info' ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{active.options.map(option => <label className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition ${answer === option ? 'bg-blue-600 font-bold text-white' : 'bg-slate-50 hover:bg-blue-50'}`} key={option}><input type="radio" className="sr-only" name={`interaction-${active.id}`} value={option} checked={answer === option} onChange={() => setAnswer(option)} />{option}</label>)}</div> : null}
      {result ? <div className={`mt-4 flex gap-3 p-4 ${result.isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{result.isCorrect ? <CheckCircle2 className="size-5 shrink-0" /> : <XCircle className="size-5 shrink-0" />}<div><p className="font-bold">{result.isCorrect ? 'Chính xác!' : 'Chưa chính xác'}</p>{active.explanation ? <p className="mt-1 text-sm leading-6">{active.explanation}</p> : null}</div></div> : null}
      <div className="mt-4 flex justify-end">{result ? <button type="button" onClick={continueVideo} className="min-h-10 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white">Tiếp tục video</button> : <button type="button" disabled={submitting || (active.interaction_type !== 'info' && !answer)} onClick={() => void submit()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : active.interaction_type === 'info' ? <Info className="size-4" /> : null}{active.interaction_type === 'info' ? 'Đã hiểu, tiếp tục' : 'Trả lời'}</button>}</div>
    </div> : <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:flex xl:overflow-x-auto xl:pb-1">{interactions.map(item => <div className={`min-w-0 px-3 py-2.5 text-xs xl:min-w-44 ${completed(item) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600 xl:bg-white'}`} key={item.id}><span className="font-bold">{Math.floor(item.timestamp_seconds / 60)}:{String(item.timestamp_seconds % 60).padStart(2, '0')}</span><p className="mt-1 truncate">{item.title}</p></div>)}</div>}
  </section>
}
