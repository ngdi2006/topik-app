"use client"

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Headphones, Languages, List, LoaderCircle, Minus, MousePointer2, PanelRight, ScrollText, Pause, Play, Plus, X } from "lucide-react"
import WorkbookOnboarding from "@/components/textbooks/WorkbookOnboarding"
import type { TextbookPagePayload, TextbookSummary, TextbookUnit } from "@/lib/textbooks/types"
import { isReferenceBook, textbookKind } from "@/lib/textbooks/catalog"
import WorkbookPageOverlay from "@/components/textbooks/WorkbookPageOverlay"
import WorkbookPageAudio from "@/components/textbooks/WorkbookPageAudio"
import ListeningTranscript from "@/components/textbooks/ListeningTranscript"
import AudioWaveform from "@/components/textbooks/AudioWaveform"
import { useWorkbook } from "@/components/textbooks/useWorkbook"
import WorkbookListeningPanel from "@/components/textbooks/WorkbookListeningPanel"
import WorkbookLayoutEditor from "@/components/textbooks/WorkbookLayoutEditor"
import WorkbookGrading from "@/components/textbooks/WorkbookGrading"
import { summarizeGrade, type WorkbookGrade } from "@/lib/textbooks/grading"
import { buildCanonicalGroups, useWorkbookListening } from "@/components/textbooks/useWorkbookListening"

type LoadedPage = TextbookPagePayload & { error?: string }
type OcrRegion = { id: string; text: string; confidence: number | null; x: number; y: number; width: number; height: number }
type UnitSummary = { grammar: Array<{ title: string; summary: string; analysis_vi?: string; examples?: Array<{ ko: string; vi: string }>; page_number: number }>; audio: Array<{ id: string; title: string; resource_url: string | null }>; listening: { page_number: number; track: string | null } | null }
const readerHref = (bookId: string, page: number, unitId?: string) => `/textbooks/${bookId}/read?page=${page}${unitId ? `&unit=${encodeURIComponent(unitId)}` : ""}`

export default function TextbookReader({ bookId, initialPage, initialUnitId }: { bookId: string; initialPage: number; initialUnitId?: string }) {
  const [book, setBook] = useState<TextbookSummary | null>(null)
  const [unit, setUnit] = useState<TextbookUnit | null>(null)
  const [pages, setPages] = useState<LoadedPage[]>([])
  const [activePage, setActivePage] = useState(initialPage)
  const [unitPage, setUnitPage] = useState(initialPage)
  const [zoom, setZoom] = useState(100)
  const [tocOpen, setTocOpen] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [grading, setGrading] = useState<{ unitId: string; answers: typeof workbook.answers; result: WorkbookGrade } | null>(null)
  const [resourceOpen, setResourceOpen] = useState(true)
  const [mobileResourceOpen, setMobileResourceOpen] = useState(false)
  const [interactionMode, setInteractionMode] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const guideChecked = useRef<string | null>(null)
  const [regionsByPage, setRegionsByPage] = useState<Record<number, OcrRegion[]>>({})
  const [selectedRegion, setSelectedRegion] = useState<OcrRegion | null>(null)
  const [unitSummary, setUnitSummary] = useState<UnitSummary | null>(null)
  const [resourceTab, setResourceTab] = useState<"grammar" | "audio">("grammar")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isWorkbook = !!book?.code.includes("-workbook-")
  const isReference = !!book && isReferenceBook(book)
  const isGrammarReference = !!book && textbookKind(book) === "grammar"
  const workbook = useWorkbook(bookId, unit?.id, isWorkbook)
  const workbookPages = useMemo(() => new Map(workbook.pages.map(page => [page.pageNumber, page.workbook])), [workbook.pages])
  const allListeningFields = useMemo(() => (workbook.pages || []).flatMap((p) => (p.workbook?.fields || []).map((f) => ({ ...f, pageNumber: p.pageNumber }))), [workbook.pages])
  const listeningController = useWorkbookListening(unitSummary?.audio[0], workbook.userId)
  const audioGroups = useMemo(() => buildCanonicalGroups(allListeningFields, listeningController.segments), [allListeningFields, listeningController.segments])
  const activeAudioGroup = audioGroups.find(group => group.id === listeningController.activeGroupId)
  const playbackDuration = activeAudioGroup?.duration ?? listeningController.duration
  const playbackTime = Math.max(0, Math.min(playbackDuration, listeningController.currentTime - (activeAudioGroup?.startTime ?? 0)))
  const formatPlaybackTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
  const guideStorageKey = workbook.userId ? `workbook-guide:v1:${workbook.userId}` : null
  useEffect(() => {
    if (!isWorkbook || !workbook.ready || loading || !guideStorageKey || guideChecked.current === guideStorageKey) return
    guideChecked.current = guideStorageKey
    try { if (localStorage.getItem(guideStorageKey) === "done") return } catch { /* The guide is still usable without browser storage. */ }
    setGuideOpen(true)
  }, [guideStorageKey, isWorkbook, loading, workbook.ready])
  const closeGuide = () => {
    setGuideOpen(false)
    try { if (guideStorageKey) localStorage.setItem(guideStorageKey, "done") } catch { /* Read-only browser storage must not block reading. */ }
  }
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)")
    const closeMobilePanel = () => { if (desktop.matches) setMobileResourceOpen(false) }
    desktop.addEventListener("change", closeMobilePanel)
    return () => desktop.removeEventListener("change", closeMobilePanel)
  }, [])

  const loadVersion = useRef(0)
  const pageElements = useRef(new Map<number, HTMLDivElement>())
  const pendingFocusPage = useRef<number | null>(initialPage)
  const activePageRef = useRef(initialPage)
  useEffect(() => { activePageRef.current = activePage }, [activePage])
  useLayoutEffect(() => {
    if (!pages.length || pendingFocusPage.current === null) return
    if (isWorkbook && (!workbook.ready || !unitSummary || !listeningController.ready)) return
    const target = pageElements.current.get(pendingFocusPage.current)
    if (target) { target.scrollIntoView({ block: "start" }); pendingFocusPage.current = null }
  }, [pages, isWorkbook, workbook.ready, unitSummary, listeningController.ready])

  useEffect(() => {
    let active = true
    void fetch("/api/textbooks").then(async (response) => {
      if (!response.ok) throw new Error("Không tải được mục lục")
      return response.json()
    }).then((data) => {
      if (!active) return
      const found = (data.books as TextbookSummary[] | undefined)?.find((item) => item.id === bookId)
      if (!found) throw new Error("Không tìm thấy giáo trình")
      setBook(found)
      if (isReferenceBook(found)) {
        setResourceOpen(false)
        setMobileResourceOpen(false)
        setInteractionMode(false)
      }
      if (found.code.includes("-workbook-")) {
        setInteractionMode(false)
        setResourceTab("audio")
      }
      const requestedUnit = found.units.find(item => item.id === initialUnitId && initialPage >= item.start_page && initialPage <= item.end_page)
      setUnit(requestedUnit ?? found.units.find((item) => initialPage >= item.start_page && initialPage <= item.end_page) ?? found.units[0] ?? null)
    }).catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : "Không tải được giáo trình"); setLoading(false) } })
    return () => { active = false }
  }, [bookId, initialPage, initialUnitId])

  const loadUnit = useCallback(async (selected: TextbookUnit, focusPage = selected.start_page) => {
    const version = ++loadVersion.current
    setLoading(true)
    setError(null)
    setPages([])
    setActivePage(focusPage)
    pendingFocusPage.current = focusPage
    try {
      const response = await fetch(`/api/textbooks/${bookId}/units/${selected.id}`)
      if (!response.ok) throw new Error("Không tải được nội dung Unit")
      const payload = await response.json()
      const loaded = payload.pages as LoadedPage[]
      if (loadVersion.current !== version) return
      setPages(loaded)
      window.history.replaceState(null, "", readerHref(bookId, focusPage, isReference ? selected.id : undefined))
    } catch (cause) {
      if (loadVersion.current === version) setError(cause instanceof Error ? cause.message : "Không tải được Unit")
    } finally {
      if (loadVersion.current === version) setLoading(false)
    }
  }, [bookId, isReference])

  useEffect(() => { if (unit) void loadUnit(unit, unitPage >= unit.start_page && unitPage <= unit.end_page ? unitPage : unit.start_page) }, [unitPage, loadUnit, unit])

  useEffect(() => {
    if (!pages.length || !book) return
    const visiblePages = new Map<number, number>()
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const number = Number((entry.target as HTMLElement).dataset.page)
        if (entry.isIntersecting) visiblePages.set(number, entry.intersectionRect.height)
        else visiblePages.delete(number)
      }
      const number = [...visiblePages].sort((a, b) => b[1] - a[1])[0]?.[0]
      if (!number || number === activePageRef.current) return
      activePageRef.current = number
      setActivePage(number)
      window.history.replaceState(null, "", readerHref(bookId, number, isReference ? unit?.id : undefined))
      void fetch(`/api/textbooks/${bookId}/progress`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ page: number, totalPages: book.total_pages }) })
    }, { root: document.querySelector("[data-reader-scroll]"), threshold: [0.25, 0.55, 0.8] })
    pageElements.current.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [book, bookId, pages, isReference, unit?.id])

  useEffect(() => {
    if (isWorkbook || !interactionMode || regionsByPage[activePage]) return
    let active = true
    void fetch(`/api/textbooks/${bookId}/pages/${activePage}/regions`).then(async (response) => {
      if (!response.ok) throw new Error("Không tải được tọa độ OCR")
      return response.json()
    }).then((data) => { if (active) setRegionsByPage((current) => ({ ...current, [activePage]: data.regions ?? [] })) }).catch(() => undefined)
    return () => { active = false }
  }, [activePage, bookId, interactionMode, isWorkbook, regionsByPage])

  useEffect(() => {
    if (!unit || isReference) return
    let active = true
    setUnitSummary(null)
    void fetch(`/api/textbooks/${bookId}/units/${unit.id}/summary?v=2`, { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (active) setUnitSummary(data) }).catch(() => { if (active) setUnitSummary({ grammar: [], audio: [], listening: null }) })
    return () => { active = false }
  }, [bookId, unit, isReference])

  const unitIndex = useMemo(() => book?.units.findIndex((item) => item.id === unit?.id) ?? -1, [book, unit])
  const chooseUnit = (next: TextbookUnit) => {
    if (next.id === unit?.id && unitPage === next.start_page) void loadUnit(next, next.start_page)
    else { setUnitPage(next.start_page); setUnit(next) }
    setTocOpen(false)
  }
  const unitLabel = (item: TextbookUnit | null) => !item ? "Mục lục" : item.unit_number > 0 ? `${isGrammarReference ? "Chủ đề" : "Bài"} ${item.unit_number}` : item.title_vi || "Mở đầu"
  const renderUnitBadge = (item: TextbookUnit) => {
    const progress = workbook.progress.get(item.id)
    const percent = progress?.total ? Math.max(0, Math.min(100, Math.round(progress.answered / progress.total * 100))) : 0
    const selected = item.id === unit?.id
    return <span aria-label={`${unitLabel(item)}${isWorkbook ? ` · Hoàn thành ${percent}%` : ""}`} className="relative mt-0.5 grid size-9 shrink-0 place-items-center" title={progress?.total ? `Đã làm ${progress.answered}/${progress.total} · ${percent}%` : undefined}>
      {isWorkbook ? <svg aria-hidden="true" className="absolute inset-0 size-9 -rotate-90" viewBox="0 0 40 40"><circle className={selected ? "text-blue-200" : "text-slate-200"} cx="20" cy="20" fill="none" r="17" stroke="currentColor" strokeWidth="2.5" /><circle className={percent === 100 ? "text-emerald-500" : "text-blue-600"} cx="20" cy="20" fill="none" pathLength="100" r="17" stroke="currentColor" strokeDasharray={`${percent} 100`} strokeLinecap={percent ? "round" : "butt"} strokeWidth="2.5" /></svg> : null}
      <span aria-hidden="true" className={`grid size-7 place-items-center rounded-full text-[11px] font-bold tabular-nums ${selected ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600"}`}>{item.unit_number > 0 ? item.unit_number : "MĐ"}</span>
    </span>
  }
  const adjacentUnit = (offset: number) => { const next = book?.units[unitIndex + offset]; if (next) chooseUnit(next) }
  const speak = (text: string) => { if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "ko-KR"; window.speechSynthesis.speak(utterance) }

  const summaryContent = <>
      <div className="shrink-0 border-b px-4 pb-0 pt-3">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">{unitLabel(unit)}</p><h2 className="mt-0.5 text-base font-black text-slate-950">Tổng kết nhanh</h2></div><button aria-label="Đóng nội dung liên kết" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => { setResourceOpen(false); setMobileResourceOpen(false) }} type="button"><X className="size-4" /></button></div>
        <div className="mt-3 grid grid-cols-2"><button className={`flex items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-bold ${resourceTab === "grammar" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`} onClick={() => setResourceTab("grammar")} type="button"><Languages className="size-3.5" />Ngữ pháp</button><button className={`flex items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-bold ${resourceTab === "audio" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`} onClick={() => setResourceTab("audio")} type="button"><Headphones className="size-3.5" />File nghe</button></div>
      </div>
      <div className={`min-h-0 flex-1 ${resourceTab === "audio" ? "flex flex-col overflow-hidden" : "overflow-y-auto p-3"}`}>
        {!unitSummary ? <div className="grid min-h-36 place-items-center"><LoaderCircle className="size-5 animate-spin text-blue-600" /></div> : resourceTab === "grammar" ? <div className="space-y-2.5">{unitSummary.grammar.length ? unitSummary.grammar.map((grammar, index) => <details className="group overflow-hidden rounded-xl border border-blue-100 bg-white" key={`${grammar.title}-${grammar.page_number}`} open={index === 0}><summary className="flex cursor-pointer list-none items-center gap-2 bg-gradient-to-r from-blue-50 to-violet-50 px-3 py-3"><span className="grid size-6 place-items-center rounded-lg bg-blue-600 text-[10px] font-black text-white">{index + 1}</span><strong className="min-w-0 flex-1 text-sm font-black text-blue-800">{grammar.title}</strong><ChevronDown className="size-3.5 text-blue-500 transition-transform group-open:rotate-180" /></summary><div className="space-y-3 border-t border-blue-100 px-3 py-3">{grammar.summary ? <div><p className="text-[9px] font-black uppercase tracking-wider text-blue-600">Ý nghĩa · Cách dùng</p><p className="mt-1 text-xs leading-5 text-slate-700">{grammar.summary}</p></div> : null}{grammar.analysis_vi ? <div className="rounded-lg bg-amber-50 p-2.5"><p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Phân tích cấu trúc</p><p className="mt-1 text-xs leading-5 text-slate-700">{grammar.analysis_vi}</p></div> : null}{grammar.examples?.length ? <div><p className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Ví dụ thực tế</p><div className="mt-1.5 space-y-2">{grammar.examples.map((example, exampleIndex) => <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5" key={`${example.ko}-${exampleIndex}`}><p className="text-xs font-bold leading-5 text-slate-900"><span className="mr-1 text-emerald-600">{exampleIndex + 1}.</span>{example.ko}</p><p className="mt-0.5 text-[11px] leading-4 text-slate-500">{example.vi}</p></div>)}</div></div> : null}<button className="text-[10px] font-bold text-blue-600" onClick={() => pageElements.current.get(grammar.page_number)?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button">Xem trang {grammar.page_number} →</button></div></details>) : <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">Unit này chưa trích xuất được tóm tắt ngữ pháp.</p>}</div> : <div className="flex h-full min-h-0 flex-col">{unitSummary.audio.length ? <WorkbookListeningPanel controller={listeningController} key={unitSummary.audio[0].id} onNavigatePage={(p) => pageElements.current.get(p)?.scrollIntoView({ behavior: "instant", block: "start" })} workbookPages={workbook.pages} /> : <div className="p-4"><div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><Headphones className="mx-auto size-6 text-slate-400" /><p className="mt-2 text-sm font-bold text-slate-700">{unitSummary.listening?.track ? `Track ${unitSummary.listening.track}` : "File nghe"}</p><p className="mt-1 text-xs leading-5 text-slate-500">Chưa có MP3 trong dữ liệu nguồn của Unit này.</p>{unitSummary.listening ? <button className="mt-3 text-[10px] font-bold text-blue-600" onClick={() => pageElements.current.get(unitSummary.listening!.page_number)?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button">Xem bài nghe trang {unitSummary.listening.page_number} →</button> : null}</div></div>}</div>}
      </div>
  </>

  return <Sheet open={mobileResourceOpen} onOpenChange={setMobileResourceOpen}><main className="flex h-dvh overflow-hidden bg-slate-100 text-slate-800">
    <audio
      ref={listeningController.audioRef}
      src={listeningController.audioUrl || undefined}
      onTimeUpdate={listeningController.handleTimeUpdate}
      onLoadedMetadata={listeningController.handleLoadedMetadata}
      onEnded={listeningController.handleEnded}
      onPause={() => listeningController.setIsPlaying(false)}
      onPlay={() => listeningController.setIsPlaying(true)}
      className="hidden"
      preload="metadata"
    />
    <button aria-label="Đóng mục lục" className={`fixed inset-0 z-40 bg-slate-950/40 lg:hidden ${tocOpen ? "block" : "hidden"}`} onClick={() => setTocOpen(false)} type="button" />
    <aside className={`${tocOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-[min(86vw,310px)] flex-col border-r bg-white shadow-xl transition-transform lg:static lg:translate-x-0 lg:shadow-none`}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4"><Link className="flex items-center gap-2 font-black text-blue-700" href="/textbooks"><ChevronLeft className="size-4" />Thư viện</Link><button className="lg:hidden" onClick={() => setTocOpen(false)} type="button"><X /></button></div>
      <div className="border-b px-3 py-3"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-blue-600">{book ? `${isGrammarReference ? "Tổng hợp" : `Quyển ${book.volume}`} · ${book.edition}` : "Giáo trình"}</p><h1 className="mt-1 text-[13px] font-bold leading-5 text-slate-900">{book?.title_vi ?? "Đang tải..."}</h1></div>
      <nav aria-label="Mục lục Unit" className="min-h-0 flex-1 overflow-y-auto p-2">
        <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Mục lục</p>
        {book?.units.map((item) => { const progress = workbook.progress.get(item.id); const percent = progress?.total ? Math.max(0, Math.min(100, Math.round(progress.answered / progress.total * 100))) : 0; return <a aria-current={item.id === unit?.id ? "location" : undefined} className={`mb-0.5 flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${item.id === unit?.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"}`} href={readerHref(bookId, item.start_page, isReference ? item.id : undefined)} key={item.id} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); chooseUnit(item) }}>{renderUnitBadge(item)}<span className="min-w-0 flex-1"><strong className="block text-[11px] font-semibold leading-4">{unitLabel(item)}{item.title_ko ? ` · ${item.title_ko}` : ""}</strong>{item.title_vi ? <span className="block text-[10px] leading-[14px] text-slate-600">{item.title_vi}</span> : null}<span className="mt-0.5 flex items-center justify-between gap-2 text-[9px] leading-3 text-slate-400"><span>Trang {item.start_page}–{item.end_page}</span>{isWorkbook ? <span className={`shrink-0 font-semibold tabular-nums ${percent === 100 ? "text-emerald-600" : "text-blue-600"}`}>{percent}%</span> : null}</span></span></a> })}
      </nav>
    </aside>

    <section className="relative flex min-w-0 flex-1 flex-col">
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-1 border-b bg-white px-2 py-1 shadow-sm sm:gap-2 sm:px-5">
        <button aria-label="Mở mục lục" className="grid min-h-9 min-w-8 sm:min-h-11 sm:min-w-11 place-items-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 lg:hidden" onClick={() => setTocOpen(true)} type="button"><List aria-hidden="true" /></button>
        <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-1"><strong className="block min-w-0 truncate text-sm">{unitLabel(unit)}</strong>{isWorkbook ? <button type="button" aria-label="Xem hướng dẫn làm bài" title="Hướng dẫn · thực hành 3 bước" className="hidden sm:grid size-6 shrink-0 place-items-center rounded-full text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => { listeningController.pause(); setGuideOpen(true) }}><CircleHelp className="size-4" /></button> : null}</div><span className="block truncate text-[10px] tabular-nums text-slate-500">Trang {activePage}</span></div>
        <div aria-label="Tỉ lệ trang sách" className="flex shrink-0 items-center gap-0" data-reader-zoom role="group">
          <button aria-label="Thu nhỏ" className="grid min-h-9 min-w-7 sm:min-w-9 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-blue-600" disabled={zoom <= 70} onClick={() => setZoom(value => Math.max(70, value - 25))} type="button"><Minus aria-hidden="true" className="size-4" /></button>
          <button aria-label="Vừa chiều rộng trang" className="min-h-9 min-w-10 rounded-lg px-1 text-[11px] font-bold tabular-nums text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => setZoom(100)} title="Trở về 100%" type="button">{zoom}%</button>
          <button aria-label="Phóng to" className="grid min-h-9 min-w-7 sm:min-w-9 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-blue-600" disabled={zoom >= 200} onClick={() => setZoom(value => Math.min(200, value + 25))} type="button"><Plus aria-hidden="true" className="size-4" /></button>
        </div>
        <div className="flex items-center gap-1">
          {isWorkbook && unit && workbook.ready ? <WorkbookGrading key={unit.id} bookId={bookId} unitId={unit.id} pages={workbook.pages} answers={Object.fromEntries(workbook.pages.flatMap(page => (page.workbook?.fields ?? []).map(field => [`${page.pageNumber}:${field.id}`, workbook.answers[`${page.pageNumber}:${field.id}`] ?? (field.kind === "match" ? {} : "")])))} result={grading?.unitId === unit.id && grading.answers === workbook.answers ? grading.result : null} onResult={result => setGrading(current => { const prior = current?.unitId === unit.id && current.answers === workbook.answers ? current.result.items : []; const sections = new Set(result.items.map(item => item.section)); return { unitId: unit.id, answers: workbook.answers, result: summarizeGrade([...prior.filter(item => !sections.has(item.section)), ...result.items]) } })} onNavigate={page => pageElements.current.get(page)?.scrollIntoView({ behavior: "instant", block: "start" })} /> : null}
          {unitSummary?.audio[0]?.resource_url ? (
            <button
              aria-label="Mở file nghe"
              data-workbook-audio
              className={`flex min-h-9 min-w-8 sm:min-h-11 sm:min-w-11 items-center justify-center gap-1.5 rounded-lg border px-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                resourceOpen && resourceTab === "audio"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
              onClick={() => {
                setResourceTab("audio")
                setResourceOpen(true)
                setMobileResourceOpen(!window.matchMedia("(min-width: 1280px)").matches)
              }}
              type="button"
            >
              <Headphones className="size-3.5" />
              <span className="hidden xl:inline">File nghe</span>
            </button>
          ) : null}
          {!isReference ? <><button data-workbook-mode aria-label={isWorkbook ? "Bật/tắt làm bài trên sách" : "Bật lớp tương tác OCR"} className={`flex min-h-9 min-w-8 sm:min-h-11 sm:min-w-11 items-center justify-center gap-1.5 rounded-lg px-1.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-blue-600 ${interactionMode ? "bg-amber-100 text-amber-800" : "hover:bg-slate-100"}`} onClick={() => { setInteractionMode(value => !value); setSelectedRegion(null) }} aria-pressed={interactionMode} type="button"><MousePointer2 aria-hidden="true" className="size-4" /><span className="hidden xl:inline">{isWorkbook ? "Làm bài" : "Tương tác"}</span></button>
          <SheetTrigger asChild><button aria-label="Nội dung liên kết" className="grid min-h-9 min-w-8 sm:min-h-11 sm:min-w-11 place-items-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 xl:hidden" type="button"><PanelRight aria-hidden="true" className="size-4" /></button></SheetTrigger>
          <button aria-label="Nội dung liên kết" aria-expanded={resourceOpen} className="hidden min-h-9 min-w-8 sm:min-h-11 sm:min-w-11 place-items-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 xl:grid" onClick={() => setResourceOpen(value => !value)} type="button"><PanelRight aria-hidden="true" className="size-4" /></button></> : null}
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain scroll-smooth px-2 py-3 motion-reduce:scroll-auto sm:px-6" data-reader-scroll>
        {loading ? <div className="absolute inset-0 z-20 grid place-items-center bg-slate-100/80"><div className="text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-blue-600" /><p className="mt-2 text-xs font-bold text-slate-500">Đang tải Unit...</p></div></div> : null}
        {error ? <div className="grid min-h-80 place-items-center text-center"><div><p className="font-bold text-red-700">{error}</p>{unit ? <button className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white" onClick={() => void loadUnit(unit, activePage)} type="button">Thử tải lại</button> : null}</div></div> : null}
        <div className="mx-auto flex flex-col items-center gap-4" style={{ width: `${zoom}%`, maxWidth: `${zoom * 10}px` }}>
          {pages.map((page) => <div className="w-full scroll-mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md" data-page={page.page_number} key={page.page_number} ref={(element) => { if (element) pageElements.current.set(page.page_number, element); else pageElements.current.delete(page.page_number) }}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2 text-[11px] font-medium tabular-nums text-slate-500"><span>Trang {page.page_number}</span><button type="button" aria-label="Xem hướng dẫn làm bài" title="Hướng dẫn · thực hành 3 bước" className="grid sm:hidden size-6 shrink-0 place-items-center rounded-full text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => { listeningController.pause(); setGuideOpen(true) }}><CircleHelp className="size-4" /></button></div>
            <div className="relative w-full" data-page-canvas={page.page_number} style={{ containerType: "inline-size" }}>
            <WorkbookPageAudio bookCode={book?.code || ""} controller={listeningController} groups={audioGroups.filter(group => group.pageNumber === page.page_number)} pageNumber={page.page_number} />
            {isWorkbook && interactionMode && workbook.canEdit && workbook.ready && workbookPages.get(page.page_number) ? <div className="hidden xl:block"><WorkbookLayoutEditor canManageAnswerKeys={workbook.canManageAnswerKeys} bookId={bookId} onSaved={workbook.refresh} pageNumber={page.page_number} workbook={workbookPages.get(page.page_number)!} /></div> : null}
            {isWorkbook && interactionMode && workbook.ready && workbookPages.get(page.page_number) ? <WorkbookPageOverlay grades={grading?.unitId === unit?.id && grading?.answers === workbook.answers ? grading.result.items : []} allListeningFields={allListeningFields} answers={workbook.answers} listeningController={listeningController} onChange={workbook.change} pageNumber={page.page_number} workbook={workbookPages.get(page.page_number)!} /> : null}
            {page.error ? <div className="grid aspect-[3/4] place-items-center text-sm text-red-600">{page.error}</div> : <Image alt={`Trang ${page.page_number}`} className="h-auto w-full" height={page.height || 1400} loading={page.page_number === pages[0]?.page_number ? "eager" : "lazy"} width={page.width || 1000} src={page.imageUrl} unoptimized />}
            {!isWorkbook && interactionMode && page.page_number === activePage ? <div className="absolute inset-0 z-10">{(regionsByPage[page.page_number] ?? []).map((region) => <button aria-label={`Chọn đoạn: ${region.text}`} className={`absolute rounded-sm border transition ${selectedRegion?.id === region.id ? "border-orange-500 bg-orange-300/35 ring-2 ring-orange-300" : "border-amber-400/55 bg-yellow-200/10 hover:bg-yellow-300/35"}`} key={region.id} onClick={() => { setSelectedRegion(region); setResourceOpen(true) }} style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }} title={region.text} type="button" />)}</div> : null}
            </div>
          </div>)}
        </div>
      </div>

      <footer className={`grid shrink-0 items-center bg-transparent px-1 pb-[env(safe-area-inset-bottom)] ${listeningController.canViewTranscript && unitSummary?.audio[0]?.resource_url ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-1"}`} data-reader-dock>
      {listeningController.canViewTranscript && unitSummary?.audio[0]?.resource_url ? (
        <div className="grid w-full min-w-0 grid-cols-[32px_52px_minmax(0,1fr)_28px_28px] items-center gap-0.5 px-1 sm:grid-cols-[36px_90px_minmax(0,1fr)_32px_32px] sm:gap-1" data-reader-mini-player>
            <button
              onClick={() => { if (listeningController.isPlaying) listeningController.pause(); else if (listeningController.activeGroupId) listeningController.togglePlay(); else listeningController.playFull() }}
              aria-label={listeningController.isPlaying ? "Tạm dừng âm thanh" : "Phát tiếp âm thanh"}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              type="button"
              title={listeningController.isPlaying ? "Tạm dừng" : "Phát tiếp"}
            >
              {listeningController.isPlaying ? (
                <Pause className="size-4 fill-current" />
              ) : (
                <Play className="size-4 ml-0.5 fill-current" />
              )}
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900">
                {activeAudioGroup ? `Nhóm ${activeAudioGroup.rangeLabel}` : "Nghe cả bài"}
              </p>
              <p className="text-[9px] tabular-nums text-slate-500">
                {formatPlaybackTime(playbackTime)} / {formatPlaybackTime(playbackDuration)}
              </p>
            </div>
          <div className="min-w-0">
            <AudioWaveform className="h-11" currentTime={playbackTime} duration={playbackDuration} label="Sóng âm cuối trang" onSeek={seconds => listeningController.seek((activeAudioGroup?.startTime ?? 0)+seconds)} peaks={activeAudioGroup?.waveform ?? listeningController.waveform} />
          </div>
          <button aria-label="Xem lời thoại đang nghe" aria-expanded={showTranscript} onClick={() => setShowTranscript(value => !value)} className="grid h-9 w-7 place-items-center rounded text-indigo-600 hover:bg-indigo-50" type="button" title="Xem lời thoại"><ScrollText className="size-4" /></button>
          <button
            aria-label="Mở bảng file nghe"
            onClick={() => {
              setResourceTab("audio")
              setResourceOpen(true)
              setMobileResourceOpen(!window.matchMedia("(min-width: 1280px)").matches)
            }}
            className="grid h-9 w-7 place-items-center rounded text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
            type="button"
          >
            <Headphones aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}

      {listeningController.canViewTranscript && showTranscript && unitSummary?.audio[0] ? <div className="order-first col-span-2 mx-auto w-full max-h-[25dvh] max-w-3xl overflow-y-auto rounded-lg border border-indigo-100 bg-white/90 px-3 py-2 text-xs leading-6" data-footer-transcript><div className="flex items-center justify-between"><strong>Lời thoại {activeAudioGroup ? `nhóm ${activeAudioGroup.rangeLabel}` : "cả bài"}</strong><button aria-label="Đóng lời thoại" className="grid size-8 place-items-center" onClick={() => setShowTranscript(false)} type="button"><X className="size-4" /></button></div><ListeningTranscript text={listeningController.segments.filter(segment => !activeAudioGroup || segment.id === activeAudioGroup.id || (segment.start >= activeAudioGroup.startTime && segment.start < activeAudioGroup.endTime)).map(segment => segment.text_ko).join("\n")} /></div> : null}
      <nav aria-label="Chuyển bài học" className="flex items-center justify-center gap-0 px-0.5">
        <button aria-label="Unit trước" title="Bài trước" className="flex size-8 items-center justify-center rounded-lg text-xs font-semibold hover:bg-slate-100 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-blue-600" disabled={unitIndex <= 0} onClick={() => adjacentUnit(-1)} type="button"><ChevronLeft aria-hidden="true" className="size-4" /></button>
        <span className="max-w-12 truncate text-center text-[10px] font-bold tabular-nums">{unitLabel(unit)}</span>
        <button aria-label="Unit tiếp theo" title="Bài sau" className="flex size-8 items-center justify-center rounded-lg text-xs font-semibold hover:bg-slate-100 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-blue-600" disabled={!book || unitIndex >= book.units.length - 1} onClick={() => adjacentUnit(1)} type="button"><ChevronRight aria-hidden="true" className="size-4" /></button>
      </nav>
      </footer>
    </section>

    {!isReference && resourceOpen ? <aside className="hidden w-[340px] shrink-0 border-l bg-white xl:flex xl:flex-col 2xl:w-[380px]">{summaryContent}</aside> : null}
    <SheetContent aria-describedby={undefined} className="h-dvh w-[min(92vw,380px)] gap-0 bg-white p-0" showCloseButton={false}>
      <SheetTitle className="sr-only">Tổng kết nhanh</SheetTitle>
      {summaryContent}
    </SheetContent>
    {interactionMode && selectedRegion ? <div className="fixed inset-x-3 bottom-16 z-30 rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl xl:hidden"><button aria-label="Đóng đoạn đã chọn" className="absolute right-3 top-3" onClick={() => setSelectedRegion(null)} type="button"><X className="size-4" /></button><p className="pr-7 text-sm font-bold leading-6">{selectedRegion.text}</p><div className="mt-2 flex gap-2"><button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white" onClick={() => speak(selectedRegion.text)} type="button">Nghe</button><button className="rounded-lg border px-3 py-1.5 text-xs font-bold" onClick={() => void navigator.clipboard.writeText(selectedRegion.text)} type="button">Sao chép</button></div></div> : null}
    {isWorkbook && guideOpen ? <WorkbookOnboarding onClose={closeGuide} onRead={() => { closeGuide(); setInteractionMode(false) }} onStart={() => { closeGuide(); setInteractionMode(true); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-workbook-mode]")?.focus()) }} /> : null}
  </main></Sheet>
}
