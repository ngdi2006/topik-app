"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import {
  ArrowLeft, Brain, Check, ChevronRight, CircleAlert,
  Headphones, Keyboard, Layers3, List, Search, Shuffle, Sparkles, Volume2,
} from "lucide-react"

export type VocabularyItem = {
  id: string
  word: string
  meaning: string
  pronunciation?: string | null
  partOfSpeech?: string | null
  topic?: string | null
  exampleKo?: string | null
  exampleVi?: string | null
  audioUrl?: string | null
  imageUrl?: string | null
  page: number
  unit: VocabularyLesson
  book: { id: string; volume: number; title_vi: string }
  progress?: { learning_state?: string; due_at?: string } | null
}

export type VocabularyLesson = {
  id: string
  unit_number: number
  title_ko: string | null
  title_vi: string | null
  start_page: number
  book: { id: string; volume: number; title_vi: string }
  total: number
  mastered: number
  due: number
}

type Mode = "list" | "flashcard" | "listening" | "quiz" | "spelling"
type Rating = "again" | "hard" | "good" | "easy"

const modes: Array<{ id: Mode; label: string; description: string; icon: typeof List }> = [
  { id: "list", label: "Danh sách", description: "Làm quen từ mới", icon: List },
  { id: "flashcard", label: "Flashcard", description: "Nhớ chủ động", icon: Layers3 },
  { id: "listening", label: "Luyện nghe", description: "Nghe và chọn nghĩa", icon: Headphones },
  { id: "quiz", label: "Trắc nghiệm", description: "Kiểm tra nhanh", icon: Brain },
  { id: "spelling", label: "Chính tả", description: "Gõ lại từ tiếng Hàn", icon: Keyboard },
]

export function VocabularyStudyHub({ lessons, items, source }: { lessons: VocabularyLesson[]; items: VocabularyItem[]; source: string }) {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [volume, setVolume] = useState("all")
  const [query, setQuery] = useState("")
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId)
  const lessonItems = useMemo(() => items.filter((item) => item.unit.id === selectedLessonId), [items, selectedLessonId])
  const filteredLessons = lessons.filter((lesson) => {
    if (volume !== "all" && String(lesson.book?.volume) !== volume) return false
    const haystack = `${lesson.unit_number} ${lesson.title_ko ?? ""} ${lesson.title_vi ?? ""}`.toLocaleLowerCase("vi")
    return haystack.includes(query.trim().toLocaleLowerCase("vi"))
  })

  if (selectedLesson) {
    return <StudySession items={lessonItems} lesson={selectedLesson} onBack={() => setSelectedLessonId(null)} source={source} />
  }

  const totalWords = lessons.reduce((sum, lesson) => sum + lesson.total, 0)
  const mastered = lessons.reduce((sum, lesson) => sum + lesson.mastered, 0)
  const due = lessons.reduce((sum, lesson) => sum + lesson.due, 0)

  return <>
    <section className="rounded-[28px] bg-gradient-to-br from-blue-700 to-indigo-600 p-6 text-white shadow-xl shadow-blue-900/10 sm:p-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-white/15"><Sparkles className="size-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Giáo trình EPS-TOPIK 2025</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Học từ vựng theo từng bài</h1></div></div><p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50">Học theo nhóm nhỏ, luyện nghe, flashcard, trắc nghiệm và chính tả. Hệ thống ưu tiên những từ bạn chưa nhớ.</p></div>
        <div className="grid grid-cols-3 gap-2 text-center"><Stat value={totalWords} label="Tổng số từ" /><Stat value={mastered} label="Đã thuộc" /><Stat value={due} label="Cần ôn" /></div>
      </div>
    </section>

    {due > 0 ? <button className="mt-5 flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300" onClick={() => setSelectedLessonId(lessons.find((lesson) => lesson.due > 0)?.id ?? null)} type="button"><span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><Brain className="size-5" /></span><span><strong className="block text-sm text-slate-900">Bạn có {due} từ cần ôn hôm nay</strong><span className="text-xs text-slate-600">Ôn đúng lúc giúp ghi nhớ lâu hơn</span></span></span><ChevronRight className="size-5 text-amber-700" /></button> : null}

    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
      <label className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Tìm bài học</span><input className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo số bài hoặc chủ đề..." value={query} /></label>
      <select aria-label="Lọc theo quyển" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400" onChange={(event) => setVolume(event.target.value)} value={volume}><option value="all">Cả 2 quyển</option><option value="1">Quyển 1</option><option value="2">Quyển 2</option></select>
    </div>

    {source === "ocr" ? <div className="mt-4 flex gap-2 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-600"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span>Kho từ đang trong giai đoạn kiểm duyệt. Chỉ những mục có cấu trúc từ–nghĩa rõ ràng được hiển thị; tiêu đề và nội dung giáo trình đã được loại bỏ.</span></div> : null}

    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filteredLessons.map((lesson) => {
        const percent = lesson.total ? Math.round((lesson.mastered / lesson.total) * 100) : 0
        return <button className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60" disabled={lesson.total === 0} key={lesson.id} onClick={() => setSelectedLessonId(lesson.id)} type="button">
          <div className="flex items-start justify-between"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">Quyển {lesson.book?.volume} · Bài {lesson.unit_number}</span><span className="text-xs font-bold text-slate-400">{lesson.total} từ</span></div>
          <h2 className="mt-4 line-clamp-1 text-lg font-black text-slate-950">{lesson.title_ko || `Bài ${lesson.unit_number}`}</h2><p className="mt-1 line-clamp-1 text-sm text-slate-500">{lesson.title_vi || "Từ vựng theo chủ đề bài học"}</p>
          <div className="mt-5"><div className="mb-2 flex justify-between text-xs"><span className="font-semibold text-slate-600">Đã thuộc {lesson.mastered}/{lesson.total}</span><span className="font-bold text-blue-700">{percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${percent}%` }} /></div></div>
          <div className="mt-4 flex items-center justify-between text-xs font-bold"><span className={lesson.due ? "text-amber-700" : "text-emerald-700"}>{lesson.due ? `${lesson.due} từ cần ôn` : lesson.total ? "Sẵn sàng học" : "Đang cập nhật dữ liệu"}</span>{lesson.total ? <span className="flex items-center gap-1 text-blue-700">{percent ? "Học tiếp" : "Bắt đầu"}<ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" /></span> : null}</div>
        </button>
      })}
    </div>
  </>
}

function StudySession({ lesson, items, onBack, source }: { lesson: VocabularyLesson; items: VocabularyItem[]; onBack: () => void; source: string }) {
  const [mode, setMode] = useState<Mode>("list")
  const [ratings, setRatings] = useState<Record<string, Rating>>({})
  const learned = Object.values(ratings).filter((rating) => rating !== "again").length

  const rate = (item: VocabularyItem, rating: Rating, activeMode: Mode) => {
    setRatings((current) => ({ ...current, [item.id]: rating }))
    if (source !== "reviewed") return
    void fetch("/api/textbooks/learning/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vocabularyId: item.id, result: rating, mode: activeMode === "list" ? "flashcard" : activeMode }) })
  }

  return <div>
    <button className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-700" onClick={onBack} type="button"><ArrowLeft className="size-4" />Tất cả bài học</button>
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-blue-700">Quyển {lesson.book?.volume} · Bài {lesson.unit_number}</span>
          <h1 className="mt-1 text-2xl font-black text-slate-950">{lesson.title_ko || `Bài ${lesson.unit_number}`}</h1>
          <p className="mt-1 text-sm text-slate-500">{lesson.title_vi || `${items.length} từ vựng cần học`}</p>
        </div>
        <div className="min-w-48">
          <div className="mb-2 flex justify-between text-xs font-bold text-slate-600"><span>Phiên này</span><span>{learned}/{items.length}</span></div>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${items.length ? learned / items.length * 100 : 0}%` }} /></div>
        </div>
      </div>
    </section>

    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{modes.map((entry) => { const Icon = entry.icon; return <button className={`rounded-xl border p-3 text-left transition ${mode === entry.id ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`} key={entry.id} onClick={() => setMode(entry.id)} type="button"><Icon className="size-5" /><strong className="mt-2 block text-xs">{entry.label}</strong><span className="hidden text-[10px] text-slate-500 sm:block">{entry.description}</span></button> })}</div>

    <div className="mt-4">{mode === "list" ? <ListMode items={items} ratings={ratings} onRate={(item, rating) => rate(item, rating, mode)} /> : <PracticeMode items={items} mode={mode} onRate={(item, rating) => rate(item, rating, mode)} />}</div>
  </div>
}

function ListMode({ items, ratings, onRate }: { items: VocabularyItem[]; ratings: Record<string, Rating>; onRate: (item: VocabularyItem, rating: Rating) => void }) {
  const [hidden, setHidden] = useState(false)
  const [query, setQuery] = useState("")
  const visible = items.filter((item) => `${item.word} ${item.meaning} ${item.topic ?? ""}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")))
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong bài..." value={query} /></label><button className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700" onClick={() => setHidden((value) => !value)} type="button">{hidden ? "Hiện nghĩa" : "Ẩn nghĩa để tự nhớ"}</button></div>
    <div className="divide-y divide-slate-100">{visible.map((item, index) => <div className="grid gap-3 py-4 sm:grid-cols-[2rem_1fr_auto] sm:items-center" key={item.id}><span className="text-xs font-bold text-slate-300">{String(index + 1).padStart(2, "0")}</span><div><div className="flex flex-wrap items-center gap-2"><strong className="text-lg text-slate-950">{item.word}</strong><SpeakButton item={item} />{item.partOfSpeech ? <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{item.partOfSpeech}</span> : null}</div><p className={`mt-1 text-sm font-semibold text-emerald-700 transition ${hidden ? "select-none blur-sm" : ""}`}>{item.meaning || "Đang cập nhật nghĩa"}</p>{item.exampleKo ? <p className="mt-2 text-xs text-slate-600">{item.exampleKo}<span className="ml-2 text-slate-400">{item.exampleVi}</span></p> : null}</div><button aria-label={ratings[item.id] ? "Đã ghi nhận" : "Đánh dấu đã nhớ"} className={`grid size-9 place-items-center rounded-full border ${ratings[item.id] ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-200 text-slate-400 hover:border-emerald-400"}`} onClick={() => onRate(item, ratings[item.id] ? "again" : "good")} type="button">{ratings[item.id] ? <Check className="size-4" /> : <Brain className="size-4" />}</button></div>)}</div></div>
}

function PracticeMode({ items, mode, onRate }: { items: VocabularyItem[]; mode: Exclude<Mode, "list">; onRate: (item: VocabularyItem, rating: Rating) => void }) {
  const [order, setOrder] = useState(() => items.map((_, index) => index))
  const [position, setPosition] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [answer, setAnswer] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const current = items[order[position]]
  const options = useMemo(() => {
    if (!current) return []
    const distractors = items.filter((item) => item.id !== current.id).slice(0, 3)
    return [current, ...distractors].toSorted((a, b) => a.id.localeCompare(b.id))
  }, [current, items])
  if (!current) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Bài này chưa có từ vựng đã được kiểm duyệt.</div>

  const next = () => { setPosition((value) => (value + 1) % order.length); setRevealed(false); setAnswer(""); setSelected(null) }
  const shuffle = () => { setOrder((currentOrder) => currentOrder.toSorted(() => Math.random() - 0.5)); setPosition(0); setRevealed(false); setSelected(null); setAnswer("") }
  const isCorrect = mode === "spelling" ? answer.trim() === current.word : selected === current.id

  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>{position + 1}/{items.length}</span><button className="flex items-center gap-1 hover:text-blue-700" onClick={shuffle} type="button"><Shuffle className="size-3.5" />Xáo trộn</button></div>
    <div className="mx-auto flex min-h-[330px] max-w-2xl flex-col items-center justify-center py-6 text-center">
      {current.imageUrl && (mode === "flashcard" || mode === "quiz") ? <Image alt={revealed ? current.word : "Hình minh họa từ vựng"} className="mb-4 h-32 w-48 rounded-2xl object-cover" height={128} src={current.imageUrl} unoptimized width={192} /> : null}
      {mode === "listening" ? <><span className="mb-4 grid size-20 place-items-center rounded-full bg-blue-50 text-blue-700"><Headphones className="size-9" /></span><button className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white" onClick={() => speak(current)} type="button"><Volume2 className="mr-2 inline size-4" />Nghe lại</button><p className="mt-3 text-xs text-slate-400">Nghe và chọn nghĩa đúng</p></> : null}
      {mode === "flashcard" ? <button className="w-full py-12" onClick={() => setRevealed((value) => !value)} type="button"><p className="text-4xl font-black text-slate-950">{revealed ? current.meaning : current.word}</p><p className="mt-4 text-sm text-slate-400">{revealed ? current.word : "Chạm để xem nghĩa"}</p></button> : null}
      {mode === "quiz" ? <><p className="text-sm font-semibold text-slate-500">Chọn nghĩa đúng của từ</p><h2 className="mt-3 text-4xl font-black text-slate-950">{current.word}</h2></> : null}
      {mode === "spelling" ? <><p className="text-sm font-semibold text-slate-500">Nhập từ tiếng Hàn có nghĩa</p><h2 className="mt-3 text-2xl font-black text-emerald-700">{current.meaning}</h2><input autoComplete="off" className={`mt-8 h-12 w-full max-w-sm rounded-xl border px-4 text-center text-xl font-bold outline-none ${revealed ? isCorrect ? "border-emerald-500 bg-emerald-50" : "border-rose-400 bg-rose-50" : "border-slate-300 focus:border-blue-500"}`} disabled={revealed} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && answer.trim()) setRevealed(true) }} placeholder="Gõ câu trả lời..." value={answer} /><button className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40" disabled={!answer.trim()} onClick={() => { setRevealed(true); onRate(current, answer.trim() === current.word ? "good" : "again") }} type="button">Kiểm tra</button>{revealed ? <p className={`mt-3 text-sm font-bold ${isCorrect ? "text-emerald-700" : "text-rose-600"}`}>{isCorrect ? "Chính xác!" : `Đáp án: ${current.word}`}</p> : null}</> : null}

      {(mode === "quiz" || mode === "listening") ? <div className="mt-7 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">{options.map((option) => { const answered = selected !== null; const correct = option.id === current.id; const chosen = option.id === selected; return <button className={`rounded-xl border p-3 text-sm font-bold transition ${answered && correct ? "border-emerald-500 bg-emerald-50 text-emerald-800" : answered && chosen ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200 hover:border-blue-400"}`} disabled={answered} key={option.id} onClick={() => { setSelected(option.id); onRate(current, correct ? "good" : "again") }} type="button">{option.meaning}</button> })}</div> : null}
    </div>
    {mode === "flashcard" && revealed ? <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4"><RatingButton color="rose" label="Chưa nhớ" onClick={() => { onRate(current, "again"); next() }} /><RatingButton color="amber" label="Hơi khó" onClick={() => { onRate(current, "hard"); next() }} /><RatingButton color="blue" label="Đã nhớ" onClick={() => { onRate(current, "good"); next() }} /><RatingButton color="emerald" label="Rất dễ" onClick={() => { onRate(current, "easy"); next() }} /></div> : null}
    {((mode === "quiz" || mode === "listening") && selected || mode === "spelling" && revealed) ? <div className="flex justify-end border-t border-slate-100 pt-4"><button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white" onClick={next} type="button">Từ tiếp theo<ChevronRight className="size-4" /></button></div> : null}
  </div>
}

function SpeakButton({ item }: { item: VocabularyItem }) { return <button aria-label={`Nghe phát âm ${item.word}`} className="grid size-7 place-items-center rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={() => speak(item)} type="button"><Volume2 className="size-3.5" /></button> }
function speak(item: VocabularyItem) { if (item.audioUrl) { void new Audio(item.audioUrl).play(); return } if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(item.word); utterance.lang = "ko-KR"; utterance.rate = 0.85; window.speechSynthesis.speak(utterance) } }
function RatingButton({ label, color, onClick }: { label: string; color: "rose" | "amber" | "blue" | "emerald"; onClick: () => void }) { const colors = { rose: "border-rose-200 bg-rose-50 text-rose-700", amber: "border-amber-200 bg-amber-50 text-amber-700", blue: "border-blue-200 bg-blue-50 text-blue-700", emerald: "border-emerald-200 bg-emerald-50 text-emerald-700" }; return <button className={`rounded-xl border px-3 py-2.5 text-xs font-black ${colors[color]}`} onClick={onClick} type="button">{label}</button> }
function Stat({ value, label }: { value: number; label: string }) { return <div className="min-w-20 rounded-xl bg-white/10 px-3 py-2"><strong className="block text-xl">{value}</strong><span className="text-[10px] text-blue-100">{label}</span></div> }
