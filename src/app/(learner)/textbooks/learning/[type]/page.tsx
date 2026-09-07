"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { BookOpen, BookText, LoaderCircle, Search } from "lucide-react"
import { LearnerSidebar } from "@/components/shared/LearnerSidebar"
import { LearnerTopbar } from "@/components/shared/LearnerTopbar"
import { VocabularyStudyHub, type VocabularyItem, type VocabularyLesson } from "@/components/textbooks/VocabularyStudyHub"

type GrammarItem = {
  id: string
  title: string
  summary?: string
  analysis?: string
  examples?: Array<{ ko: string; vi: string }>
  page: number
  unit: { unit_number: number; title_vi: string | null }
  book: { id: string; volume: number }
}

type VocabularyResponse = { lessons?: VocabularyLesson[]; items?: VocabularyItem[]; source?: string }
type GrammarResponse = { items?: GrammarItem[] }

export default function TextbookLearningPage() {
  const params = useParams<{ type: string }>()
  const type = params.type === "grammar" ? "grammar" : "vocabulary"
  const [data, setData] = useState<VocabularyResponse & GrammarResponse>({})
  const [loadedType, setLoadedType] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    void fetch(`/api/textbooks/learning?type=${type}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Không thể tải nội dung")))
      .then((responseData) => setData(responseData))
      .catch((error) => { if (error.name !== "AbortError") setData({}) })
      .finally(() => { if (!controller.signal.aborted) setLoadedType(type) })
    return () => controller.abort()
  }, [type])

  const isGrammar = type === "grammar"
  const loading = loadedType !== type
  return <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_right,_#e8efff_0,_#f6f8fb_34rem)]">
    <LearnerSidebar desktopOpen={desktopMenuOpen} mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
    <div className="min-w-0 flex-1">
      <LearnerTopbar onOpenMobileMenu={() => setMobileMenuOpen(true)} onToggleDesktopMenu={() => setDesktopMenuOpen((open) => !open)} title={isGrammar ? "Ngữ pháp" : "Học từ vựng"} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        {loading ? <div className="grid min-h-[60vh] place-items-center"><div className="text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-blue-600" /><p className="mt-3 text-sm font-semibold text-slate-500">Đang chuẩn bị bài học...</p></div></div> : isGrammar ? <GrammarLibrary items={(data.items ?? []) as GrammarItem[]} /> : <VocabularyStudyHub items={(data.items ?? []) as VocabularyItem[]} lessons={data.lessons ?? []} source={data.source ?? "ocr"} />}
      </main>
    </div>
  </div>
}

function GrammarLibrary({ items }: { items: GrammarItem[] }) {
  const [query, setQuery] = useState("")
  const [volume, setVolume] = useState("all")
  const filtered = useMemo(() => items.filter((item) => {
    if (volume !== "all" && String(item.book.volume) !== volume) return false
    return `${item.title} ${item.summary ?? ""} ${item.analysis ?? ""}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))
  }), [items, query, volume])

  return <>
    <section className="rounded-[28px] bg-gradient-to-br from-emerald-700 to-teal-600 p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-8"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-white/15"><BookText className="size-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">Học tập · Giáo trình 2025</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Ngữ pháp</h1></div></div><p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50">Tra cứu cấu trúc, cách dùng và ví dụ theo từng bài trong giáo trình.</p></section>
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-emerald-400" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm cấu trúc ngữ pháp..." value={query} /></label><select aria-label="Lọc theo quyển" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold" onChange={(event) => setVolume(event.target.value)} value={volume}><option value="all">Cả 2 quyển</option><option value="1">Quyển 1</option><option value="2">Quyển 2</option></select></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">{filtered.map((item) => <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={item.id}><div className="flex justify-between"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">Quyển {item.book.volume} · Bài {item.unit.unit_number}</span><span className="text-[10px] font-semibold text-slate-400">Trang {item.page}</span></div><h2 className="mt-4 text-xl font-black text-slate-950">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{item.summary || item.analysis || "Xem giải thích trong trang giáo trình gốc."}</p>{item.examples?.[0] ? <div className="mt-3 rounded-xl bg-emerald-50 p-3"><p className="text-sm font-bold text-slate-800">{item.examples[0].ko}</p><p className="mt-1 text-xs text-slate-500">{item.examples[0].vi}</p></div> : null}<div className="mt-auto pt-5"><Link className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700" href={`/textbooks/${item.book.id}/read?page=${item.page}`}><BookOpen className="size-3.5" />Xem trang sách →</Link></div></article>)}</div>
  </>
}
