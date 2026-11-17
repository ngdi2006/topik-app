"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ArrowRight, Check, Headphones, Pause, Play, RotateCcw } from "lucide-react"
import Link from "next/link"

export default function LessonPreview({ destination }: { destination: string }) {
  const [mode, setMode] = useState<"reading" | "listening">("reading")
  const [selected, setSelected] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const options = mode === "reading" ? ["Xin chào", "Cảm ơn", "Tạm biệt"] : ["Giáo viên", "Học sinh", "Bác sĩ"]
  const correct = mode === "reading" ? 0 : 1
  const changeMode = (next: typeof mode) => {
    audio.current?.pause()
    if (audio.current) audio.current.currentTime = 0
    setMode(next); setSelected(null); setPlaying(false); setAudioError(false)
  }
  const toggleAudio = async () => {
    if (!audio.current) return
    if (playing) audio.current.pause()
    else try { await audio.current.play() } catch { setAudioError(true) }
  }
  return <div className="rounded-[28px] border border-[#dbe4f3] bg-white p-5 shadow-[0_18px_60px_-35px_#354c89] sm:p-7" data-home-lesson>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-600"><span aria-hidden="true" className="relative block size-9 overflow-hidden rounded-xl border border-violet-100 bg-violet-50"><Image src="/dashboard/interview-learner-v2.webp" width={96} height={64} sizes="96px" alt="" className="absolute -right-2 -top-1 h-16 w-24 max-w-none object-cover" /></span><span>Bài học mẫu<span className="mt-0.5 block text-[9px] font-normal text-slate-500">Thử học cùng Korea Link</span></span></span>
      <div aria-label="Chọn bài học mẫu" className="flex rounded-full bg-[#eef2ff] p-1">{([['reading', 'Đọc hiểu'], ['listening', 'Nghe hiểu']] as const).map(([value, label]) => <button type="button" aria-pressed={mode === value} className={`min-h-10 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${mode === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`} onClick={() => changeMode(value)} key={value}>{label}</button>)}</div>
    </div>
    {mode === "reading" ? <div className="rounded-2xl bg-[#f2f5ff] px-4 py-6 text-center"><p lang="ko" className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">안녕하세요!</p><p className="mt-3 text-sm text-slate-500">Câu chào này có nghĩa là gì?</p></div> : <div className="rounded-2xl bg-[#eff3ff] p-5"><div className="flex items-center gap-3"><button type="button" onClick={() => void toggleAudio()} aria-label={playing ? 'Tạm dừng bài nghe mẫu' : 'Phát bài nghe mẫu'} className="grid size-12 shrink-0 place-items-center rounded-full bg-[#195bff] text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}</button><div><p className="flex items-center gap-1.5 text-xs font-semibold text-blue-600"><Headphones className="size-3.5" /> Nghe đoạn hội thoại</p><p className="mt-1 text-sm font-semibold text-slate-900">Nam làm nghề gì?</p></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Bấm nút nghe, sau đó chọn một đáp án bên dưới.</p>{audioError ? <p role="alert" className="mt-2 text-xs text-red-600">Chưa phát được âm thanh. Bạn có thể chuyển sang bài Đọc hiểu.</p> : null}</div>}
    <audio ref={audio} preload="none" src="/textbooks/tutorial/listening-example.mp3" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setAudioError(true) }} />
    <fieldset className="mt-5 space-y-2"><legend className="sr-only">Chọn đáp án cho bài học mẫu</legend>{options.map((label, index) => <button key={label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${selected === index ? index === correct ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'}`}><span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold ${selected === index ? 'bg-white' : 'bg-slate-100'}`}>{selected === index && index === correct ? <Check className="size-4" /> : `0${index + 1}`}</span>{label}</button>)}</fieldset>
    <div aria-live="polite" className="mt-4 min-h-10 text-xs leading-5">{selected === null ? <p className="text-slate-500">Một câu hỏi nhỏ. Một điều mới mỗi ngày.</p> : <div className="flex items-start justify-between gap-3"><p className={selected === correct ? 'font-semibold text-emerald-700' : 'text-amber-800'}>{selected === correct ? mode === 'reading' ? 'Đúng rồi! 안녕하세요 có nghĩa là “Xin chào”.' : 'Đúng rồi! 학생 có nghĩa là học sinh.' : 'Chưa đúng rồi. Bạn hãy thử lại nhé.'}</p><button type="button" aria-label="Làm lại bài học mẫu" onClick={() => setSelected(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"><RotateCcw className="size-4" /></button></div>}</div>
    <Link href={destination} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#195bff] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#174bce] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Khám phá bài học tiếp theo <ArrowRight className="size-4" /></Link>
  </div>
}
