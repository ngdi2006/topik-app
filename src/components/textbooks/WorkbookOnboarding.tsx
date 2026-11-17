"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Dialog } from "radix-ui"
import { Check, ChevronLeft, ChevronRight, Headphones, MousePointer2, Play, X } from "lucide-react"

const steps = [
  { title: "Chọn chế độ đọc hoặc làm bài", description: "Khi mới vào, sách ở chế độ chỉ đọc. Bật nút Làm bài trên thanh công cụ khi muốn chọn đáp án hoặc điền chữ.", selector: "[data-workbook-mode]" },
  { title: "Thử chọn đáp án bài đọc", description: "Chạm vào đáp án hoặc hình ảnh để chọn. Mỗi cặp ngoặc chọn độc lập; từ cho sẵn có thể kéo thả hoặc chạm để điền.", selector: "[data-reader-scroll]" },
  { title: "Thử nghe và trả lời", description: "Bấm biểu tượng loa cạnh tiêu đề để nghe từng nhóm câu, hoặc mở File nghe. Có thể nghe lại và chạm sóng âm để tua.", selector: "[data-workbook-audio]" },
]
type Rect = { top: number; left: number; width: number; height: number }

export default function WorkbookOnboarding({ onClose, onStart, onRead }: { onClose: () => void; onStart: () => void; onRead: () => void }) {
  const [step, setStep] = useState(0)
  const [enabled, setEnabled] = useState(false)
  const [reading, setReading] = useState<number | null>(null)
  const [heard, setHeard] = useState(false)
  const [listening, setListening] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cardHeight, setCardHeight] = useState(460)
  const card = useRef<HTMLDivElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const complete = step === 0 ? enabled : step === 1 ? reading !== null : heard && listening !== null

  useEffect(() => {
    const update = () => {
      const target = document.querySelector(steps[step].selector) ?? document.querySelector("[data-workbook-mode]")
      if (!target) { setRect(null); return }
      const box = target.getBoundingClientRect()
      const left = Math.max(8, box.left - 5), top = Math.max(8, box.top - 5)
      const right = Math.min(innerWidth - 8, box.right + 5)
      const bottom = Math.min(innerHeight - 8, step === 1 ? top + 140 : box.bottom + 5)
      setRect({ top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) })
    }
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true) }
  }, [step])
  useLayoutEffect(() => {
    const element = card.current
    if (!element) return
    const observer = new ResizeObserver(() => setCardHeight(element.getBoundingClientRect().height))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const player = audio.current
    return () => { player?.pause() }
  }, [step])

  const playSample = () => {
    setHeard(true)
    if (!audio.current) { setAudioUnavailable(true); return }
    audio.current.currentTime = 0
    setAudioUnavailable(false)
    void audio.current.play().catch(() => { setPlaying(false); setAudioUnavailable(true) })
  }
  const width = typeof window === "undefined" ? 380 : Math.min(400, innerWidth - 24)
  const left = rect && typeof window !== "undefined" ? Math.max(12, Math.min(innerWidth - width - 12, rect.left + rect.width / 2 - width / 2)) : 12
  const top = rect && typeof window !== "undefined" ? (rect.top + rect.height + cardHeight + 24 <= innerHeight ? rect.top + rect.height + 12 : Math.max(12, innerHeight - cardHeight - 12)) : 80
  const choices = (kind: "reading" | "listening") => {
    const selected = kind === "reading" ? reading : listening
    const labels = kind === "reading" ? ["사과", "포도", "우유", "빵"] : ["학생", "의사", "회사원", "요리사"]
    return <div role="group" aria-label={kind === "reading" ? "Thử chọn đáp án đọc" : "Thử chọn đáp án nghe"} className="grid grid-cols-2 gap-2">{labels.map((label, index) => <button type="button" key={label} aria-pressed={selected === index} disabled={kind === "listening" && !heard} onClick={() => kind === "reading" ? setReading(index) : setListening(index)} className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 text-left text-sm transition-colors disabled:opacity-40 ${selected === index ? "border-blue-500 bg-blue-50 font-bold text-blue-700" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"}`}><span className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] ${selected === index ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-500"}`}>{selected === index ? <Check className="size-3" /> : index + 1}</span><span lang="ko">{label}</span></button>)}</div>
  }

  return <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}><audio ref={audio} src="/textbooks/tutorial/listening-example.mp3" preload="none" onPlaying={() => setPlaying(true)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setAudioUnavailable(true) }} /><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[200]" data-workbook-guide-backdrop>
      {rect ? <>
        <div className="absolute inset-x-0 top-0 bg-slate-950/55" style={{ height: rect.top }} />
        <div className="absolute left-0 bg-slate-950/55" style={{ top: rect.top, width: rect.left, height: rect.height }} />
        <div className="absolute right-0 bg-slate-950/55" style={{ top: rect.top, left: rect.left + rect.width, height: rect.height }} />
        <div className="absolute inset-x-0 bottom-0 bg-slate-950/55" style={{ top: rect.top + rect.height }} />
        <div aria-hidden="true" className="pointer-events-none absolute rounded-xl ring-2 ring-amber-400 ring-offset-2 ring-offset-white/40 shadow-[0_0_20px_#fbbf2466]" style={rect} />
      </> : <div className="absolute inset-0 bg-slate-950/55" />}
    </Dialog.Overlay>
    <Dialog.Content ref={card} data-workbook-guide data-guide-step={step + 1} onPointerDownOutside={event => event.preventDefault()} className="fixed z-[201] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-amber-200 bg-white p-4 text-slate-800 shadow-2xl outline-none sm:p-5" style={{ width, left, top }}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-amber-700">Hướng dẫn · {step + 1}/3</p><Dialog.Title className="mt-1 text-base font-bold leading-snug">{steps[step].title}</Dialog.Title></div><Dialog.Close aria-label="Đóng hướng dẫn" className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X className="size-4" /></Dialog.Close></div>
      <div aria-hidden="true" className="mt-3 flex gap-1">{steps.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-blue-600" : "bg-slate-100"}`} />)}</div>
      <Dialog.Description className="mt-3 text-xs leading-5 text-slate-600">{steps[step].description}</Dialog.Description>
      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Thực hành thử · Không lưu vào bài thật</p>
        {step === 0 ? <><button type="button" aria-label="Thử bật Làm bài" aria-pressed={enabled} onClick={() => setEnabled(!enabled)} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border font-semibold ${enabled ? "border-amber-300 bg-amber-100 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}><MousePointer2 className="size-4" />{enabled ? "Làm bài đã bật" : "Bật Làm bài"}{enabled ? <Check className="size-4" /> : null}</button><p className="mt-2 text-xs leading-5 text-slate-500">Thử bấm nút trên. Khi tắt, bạn chỉ xem và cuộn trang sách.</p></> : step === 1 ? <><p lang="ko" className="mb-1 text-sm font-semibold">사과를 먹어요.</p><p className="mb-3 text-xs text-slate-500">Người nói ăn gì? Chọn thử một đáp án.</p>{choices("reading")}</> : <><button type="button" onClick={playSample} className="mb-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"><Play className="size-4" />{playing ? "Đang đọc mẫu · Nghe lại" : heard ? "Nghe lại mẫu" : "Nghe mẫu"}<Headphones className="size-4" /></button><p className="mb-3 text-xs text-slate-500">Người nói làm nghề gì?</p>{choices("listening")}{audioUnavailable ? <p className="mt-2 text-xs leading-5 text-slate-500">Thiết bị chưa phát được giọng mẫu. Bạn có thể đọc để thử: <span lang="ko">남 씨는 학생입니까? 네, 학생입니다.</span></p> : null}</>}
      </div>
      <p className={`mt-2 min-h-5 text-xs leading-5 ${complete ? "text-emerald-700" : "text-slate-400"}`} role="status">{complete ? step === 2 ? "Bạn đã biết cách thao tác. Bài thật sẽ tự động lưu đáp án." : "Đã thao tác xong. Chọn Tiếp để thử bước kế tiếp." : step === 0 ? "Bấm nút Bật Làm bài để thử." : step === 1 ? "Chạm một đáp án để tiếp tục." : "Nghe mẫu, rồi chạm một đáp án."}</p>
      {step === 2 ? <p className="mt-1 text-[11px] leading-5 text-slate-500">Làm xong, chọn Chấm bài trên thanh công cụ để chấm trắc nghiệm hoặc nộp phần còn lại cho giáo viên.</p> : null}
      <div className="mt-3 flex items-center justify-between gap-1"><button type="button" onClick={step === 2 ? onRead : onClose} className="min-h-10 rounded-lg px-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">{step === 2 ? "Chỉ đọc" : "Bỏ qua"}</button><div className="flex gap-1.5"><button type="button" disabled={step === 0} onClick={() => { setPlaying(false); setStep(step - 1) }} className="flex min-h-10 items-center rounded-lg border border-slate-200 px-2 text-xs font-semibold disabled:opacity-30"><ChevronLeft className="size-3" />Trước</button><button type="button" disabled={!complete} onClick={() => step === 2 ? onStart() : setStep(step + 1)} className="flex min-h-10 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{step === 2 ? "Bắt đầu làm bài" : "Tiếp"}{step !== 2 ? <ChevronRight className="size-3" /> : null}</button></div></div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
}
