"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Headphones, Languages, List, LoaderCircle, Minus, MousePointer2, PanelRight, Plus, X } from "lucide-react"
import type { TextbookPagePayload, TextbookSummary, TextbookUnit } from "@/lib/textbooks/types"

type LoadedPage = TextbookPagePayload & { error?: string }
type OcrRegion = { id: string; text: string; confidence: number | null; x: number; y: number; width: number; height: number }
type UnitSummary = { grammar: Array<{ title: string; summary: string; analysis_vi?: string; examples?: Array<{ ko: string; vi: string }>; page_number: number }>; audio: Array<{ id: string; title: string; resource_url: string | null }>; listening: { page_number: number; track: string | null } | null }

export default function TextbookReader({ bookId, initialPage }: { bookId: string; initialPage: number }) {
  const [book, setBook] = useState<TextbookSummary | null>(null)
  const [unit, setUnit] = useState<TextbookUnit | null>(null)
  const [pages, setPages] = useState<LoadedPage[]>([])
  const [activePage, setActivePage] = useState(initialPage)
  const [zoom, setZoom] = useState(90)
  const [tocOpen, setTocOpen] = useState(false)
  const [resourceOpen, setResourceOpen] = useState(true)
  const [interactionMode, setInteractionMode] = useState(false)
  const [regionsByPage, setRegionsByPage] = useState<Record<number, OcrRegion[]>>({})
  const [selectedRegion, setSelectedRegion] = useState<OcrRegion | null>(null)
  const [unitSummary, setUnitSummary] = useState<UnitSummary | null>(null)
  const [resourceTab, setResourceTab] = useState<"grammar" | "audio">("grammar")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadVersion = useRef(0)
  const pageElements = useRef(new Map<number, HTMLDivElement>())

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
      setUnit(found.units.find((item) => initialPage >= item.start_page && initialPage <= item.end_page) ?? found.units[0] ?? null)
    }).catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : "Không tải được giáo trình"); setLoading(false) } })
    return () => { active = false }
  }, [bookId, initialPage])

  const loadUnit = useCallback(async (selected: TextbookUnit, focusPage = selected.start_page) => {
    const version = ++loadVersion.current
    setLoading(true)
    setError(null)
    setPages([])
    setActivePage(focusPage)
    try {
      const response = await fetch(`/api/textbooks/${bookId}/units/${selected.id}`)
      if (!response.ok) throw new Error("Không tải được nội dung Unit")
      const payload = await response.json()
      const loaded = payload.pages as LoadedPage[]
      if (loadVersion.current !== version) return
      setPages(loaded)
      window.history.replaceState(null, "", `/textbooks/${bookId}/read?page=${focusPage}`)
      requestAnimationFrame(() => pageElements.current.get(focusPage)?.scrollIntoView({ block: "start" }))
    } catch (cause) {
      if (loadVersion.current === version) setError(cause instanceof Error ? cause.message : "Không tải được Unit")
    } finally {
      if (loadVersion.current === version) setLoading(false)
    }
  }, [bookId])

  useEffect(() => { if (unit) void loadUnit(unit, initialPage >= unit.start_page && initialPage <= unit.end_page ? initialPage : unit.start_page) }, [initialPage, loadUnit, unit])

  useEffect(() => {
    if (!pages.length || !book) return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (!visible) return
      const number = Number((visible.target as HTMLElement).dataset.page)
      if (!number || number === activePage) return
      setActivePage(number)
      window.history.replaceState(null, "", `/textbooks/${bookId}/read?page=${number}`)
      void fetch(`/api/textbooks/${bookId}/progress`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ page: number, totalPages: book.total_pages }) })
    }, { root: document.querySelector("[data-reader-scroll]"), threshold: [0.25, 0.55, 0.8] })
    pageElements.current.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [activePage, book, bookId, pages])

  useEffect(() => {
    if (!interactionMode || regionsByPage[activePage]) return
    let active = true
    void fetch(`/api/textbooks/${bookId}/pages/${activePage}/regions`).then(async (response) => {
      if (!response.ok) throw new Error("Không tải được tọa độ OCR")
      return response.json()
    }).then((data) => { if (active) setRegionsByPage((current) => ({ ...current, [activePage]: data.regions ?? [] })) }).catch(() => undefined)
    return () => { active = false }
  }, [activePage, bookId, interactionMode, regionsByPage])

  useEffect(() => {
    if (!unit) return
    let active = true
    setUnitSummary(null)
    void fetch(`/api/textbooks/${bookId}/units/${unit.id}/summary?v=2`, { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (active) setUnitSummary(data) }).catch(() => { if (active) setUnitSummary({ grammar: [], audio: [], listening: null }) })
    return () => { active = false }
  }, [bookId, unit])

  const unitIndex = useMemo(() => book?.units.findIndex((item) => item.id === unit?.id) ?? -1, [book, unit])
  const chooseUnit = (next: TextbookUnit) => { setUnit(next); setTocOpen(false) }
  const adjacentUnit = (offset: number) => { const next = book?.units[unitIndex + offset]; if (next) chooseUnit(next) }
  const speak = (text: string) => { if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "ko-KR"; window.speechSynthesis.speak(utterance) }

  return <main className="flex h-dvh overflow-hidden bg-slate-100 text-slate-800">
    <button aria-label="Đóng mục lục" className={`fixed inset-0 z-40 bg-slate-950/40 lg:hidden ${tocOpen ? "block" : "hidden"}`} onClick={() => setTocOpen(false)} type="button" />
    <aside className={`${tocOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-[min(86vw,310px)] flex-col border-r bg-white shadow-xl transition-transform lg:static lg:translate-x-0 lg:shadow-none`}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4"><Link className="flex items-center gap-2 font-black text-blue-700" href="/textbooks"><ChevronLeft className="size-4" />Thư viện</Link><button className="lg:hidden" onClick={() => setTocOpen(false)} type="button"><X /></button></div>
      <div className="border-b px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">{book ? `Quyển ${book.volume} · ${book.edition}` : "Giáo trình"}</p><h1 className="mt-1 font-black text-slate-900">{book?.title_vi ?? "Đang tải..."}</h1></div>
      <nav aria-label="Mục lục Unit" className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Mục lục</p>
        {book?.units.map((item) => <button className={`mb-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${item.id === unit?.id ? "bg-blue-50 text-blue-700 shadow-sm" : "hover:bg-slate-50"}`} key={item.id} onClick={() => chooseUnit(item)} type="button"><span className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black ${item.id === unit?.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{item.unit_number}</span><span className="min-w-0"><strong className="block text-sm">Unit {item.unit_number}{item.title_ko ? ` · ${item.title_ko}` : ""}</strong><span className="mt-0.5 block text-xs text-slate-500">Trang {item.start_page}–{item.end_page}</span></span></button>)}
      </nav>
    </aside>

    <section className="relative flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-white px-3 shadow-sm sm:px-5">
        <button aria-label="Mở mục lục" className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setTocOpen(true)} type="button"><List /></button>
        <div className="min-w-0"><strong className="block truncate text-sm">Unit {unit?.unit_number ?? "-"}</strong><span className="block text-[10px] text-slate-500">Trang đang xem: {activePage}</span></div>
        <div className="flex items-center gap-1"><button className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold ${interactionMode ? "bg-amber-100 text-amber-800" : "hover:bg-slate-100"}`} onClick={() => { setInteractionMode((value) => !value); setSelectedRegion(null) }} title="Bật lớp tương tác OCR" type="button"><MousePointer2 className="size-4" /><span className="hidden sm:inline">Tương tác</span></button><button aria-label="Thu nhỏ" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setZoom((value) => Math.max(55, value - 10))} type="button"><Minus className="size-4" /></button><span className="w-11 text-center text-xs font-bold">{zoom}%</span><button aria-label="Phóng to" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setZoom((value) => Math.min(140, value + 10))} type="button"><Plus className="size-4" /></button><button aria-label="Nội dung liên kết" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setResourceOpen((value) => !value)} type="button"><PanelRight className="size-4" /></button></div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto scroll-smooth px-2 py-4 sm:px-6" data-reader-scroll>
        {loading ? <div className="absolute inset-0 z-20 grid place-items-center bg-slate-100/80"><div className="text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-blue-600" /><p className="mt-2 text-xs font-bold text-slate-500">Đang tải Unit...</p></div></div> : null}
        {error ? <div className="grid min-h-80 place-items-center text-center"><div><p className="font-bold text-red-700">{error}</p>{unit ? <button className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white" onClick={() => void loadUnit(unit, activePage)} type="button">Thử tải lại</button> : null}</div></div> : null}
        <div className="mx-auto flex flex-col items-center gap-4" style={{ width: `${zoom}%`, maxWidth: `${zoom * 10}px` }}>
          {pages.map((page) => <div className="relative w-full scroll-mt-4 overflow-hidden bg-white shadow-xl" data-page={page.page_number} key={page.page_number} ref={(element) => { if (element) pageElements.current.set(page.page_number, element); else pageElements.current.delete(page.page_number) }}>
            <div className="absolute left-2 top-2 z-10 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-white">Trang {page.page_number}</div>
            {page.error ? <div className="grid aspect-[3/4] place-items-center text-sm text-red-600">{page.error}</div> : <Image alt={`Trang ${page.page_number}`} className="h-auto w-full" height={page.height || 1400} loading={page.page_number === pages[0]?.page_number ? "eager" : "lazy"} width={page.width || 1000} src={page.imageUrl} unoptimized />}
            {interactionMode && page.page_number === activePage ? <div className="absolute inset-0 z-10">{(regionsByPage[page.page_number] ?? []).map((region) => <button aria-label={`Chọn đoạn: ${region.text}`} className={`absolute rounded-sm border transition ${selectedRegion?.id === region.id ? "border-orange-500 bg-orange-300/35 ring-2 ring-orange-300" : "border-amber-400/55 bg-yellow-200/10 hover:bg-yellow-300/35"}`} key={region.id} onClick={() => { setSelectedRegion(region); setResourceOpen(true) }} style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }} title={region.text} type="button" />)}</div> : null}
          </div>)}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center"><div className="pointer-events-auto flex h-8 items-center overflow-hidden rounded-full bg-slate-900/80 text-white shadow-lg backdrop-blur"><button aria-label="Unit trước" className="grid h-full w-8 place-items-center transition hover:bg-white/15 disabled:opacity-30" disabled={unitIndex <= 0} onClick={() => adjacentUnit(-1)} type="button"><ChevronLeft className="size-3.5" /></button><span className="min-w-16 border-x border-white/15 px-2 text-center text-[10px] font-bold">Unit {unit?.unit_number ?? "-"}</span><button aria-label="Unit tiếp theo" className="grid h-full w-8 place-items-center transition hover:bg-white/15 disabled:opacity-30" disabled={!book || unitIndex >= book.units.length - 1} onClick={() => adjacentUnit(1)} type="button"><ChevronRight className="size-3.5" /></button></div></div>
    </section>

    {resourceOpen ? <aside className="hidden w-[340px] shrink-0 border-l bg-white xl:flex xl:flex-col 2xl:w-[380px]">
      <div className="shrink-0 border-b px-4 pb-0 pt-3">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Unit {unit?.unit_number ?? "-"}</p><h2 className="mt-0.5 text-base font-black text-slate-950">Tổng kết nhanh</h2></div><button aria-label="Đóng nội dung liên kết" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setResourceOpen(false)} type="button"><X className="size-4" /></button></div>
        <div className="mt-3 grid grid-cols-2"><button className={`flex items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-bold ${resourceTab === "grammar" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`} onClick={() => setResourceTab("grammar")} type="button"><Languages className="size-3.5" />Ngữ pháp</button><button className={`flex items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-bold ${resourceTab === "audio" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`} onClick={() => setResourceTab("audio")} type="button"><Headphones className="size-3.5" />File nghe</button></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!unitSummary ? <div className="grid min-h-36 place-items-center"><LoaderCircle className="size-5 animate-spin text-blue-600" /></div> : resourceTab === "grammar" ? <div className="space-y-2.5">{unitSummary.grammar.length ? unitSummary.grammar.map((grammar, index) => <details className="group overflow-hidden rounded-xl border border-blue-100 bg-white" key={`${grammar.title}-${grammar.page_number}`} open={index === 0}><summary className="flex cursor-pointer list-none items-center gap-2 bg-gradient-to-r from-blue-50 to-violet-50 px-3 py-3"><span className="grid size-6 place-items-center rounded-lg bg-blue-600 text-[10px] font-black text-white">{index + 1}</span><strong className="min-w-0 flex-1 text-sm font-black text-blue-800">{grammar.title}</strong><ChevronDown className="size-3.5 text-blue-500 transition-transform group-open:rotate-180" /></summary><div className="space-y-3 border-t border-blue-100 px-3 py-3">{grammar.summary ? <div><p className="text-[9px] font-black uppercase tracking-wider text-blue-600">Ý nghĩa · Cách dùng</p><p className="mt-1 text-xs leading-5 text-slate-700">{grammar.summary}</p></div> : null}{grammar.analysis_vi ? <div className="rounded-lg bg-amber-50 p-2.5"><p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Phân tích cấu trúc</p><p className="mt-1 text-xs leading-5 text-slate-700">{grammar.analysis_vi}</p></div> : null}{grammar.examples?.length ? <div><p className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Ví dụ thực tế</p><div className="mt-1.5 space-y-2">{grammar.examples.map((example, exampleIndex) => <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5" key={`${example.ko}-${exampleIndex}`}><p className="text-xs font-bold leading-5 text-slate-900"><span className="mr-1 text-emerald-600">{exampleIndex + 1}.</span>{example.ko}</p><p className="mt-0.5 text-[11px] leading-4 text-slate-500">{example.vi}</p></div>)}</div></div> : null}<button className="text-[10px] font-bold text-blue-600" onClick={() => pageElements.current.get(grammar.page_number)?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button">Xem trang {grammar.page_number} →</button></div></details>) : <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">Unit này chưa trích xuất được tóm tắt ngữ pháp.</p>}</div> : <div className="space-y-2.5">{unitSummary.audio.length ? unitSummary.audio.map((audio) => <div className="rounded-xl border border-slate-200 p-3" key={audio.id}><p className="text-sm font-bold">{audio.title}</p>{audio.resource_url ? <audio className="mt-2 h-9 w-full" controls preload="none" src={audio.resource_url} /> : <p className="mt-1 text-xs text-slate-500">Chưa có đường dẫn file nghe.</p>}</div>) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><Headphones className="mx-auto size-6 text-slate-400" /><p className="mt-2 text-sm font-bold text-slate-700">{unitSummary.listening?.track ? `Track ${unitSummary.listening.track}` : "File nghe"}</p><p className="mt-1 text-xs leading-5 text-slate-500">Chưa có MP3 trong dữ liệu nguồn của Unit này.</p>{unitSummary.listening ? <button className="mt-3 text-[10px] font-bold text-blue-600" onClick={() => pageElements.current.get(unitSummary.listening!.page_number)?.scrollIntoView({ behavior: "smooth", block: "start" })} type="button">Xem bài nghe trang {unitSummary.listening.page_number} →</button> : null}</div>}</div>}
      </div>
    </aside> : null}
    {interactionMode && selectedRegion ? <div className="fixed inset-x-3 bottom-16 z-30 rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl xl:hidden"><button aria-label="Đóng đoạn đã chọn" className="absolute right-3 top-3" onClick={() => setSelectedRegion(null)} type="button"><X className="size-4" /></button><p className="pr-7 text-sm font-bold leading-6">{selectedRegion.text}</p><div className="mt-2 flex gap-2"><button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white" onClick={() => speak(selectedRegion.text)} type="button">Nghe</button><button className="rounded-lg border px-3 py-1.5 text-xs font-bold" onClick={() => void navigator.clipboard.writeText(selectedRegion.text)} type="button">Sao chép</button></div></div> : null}
  </main>
}
