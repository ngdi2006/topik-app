"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { BookOpen, BookText, Languages, LoaderCircle, Search } from "lucide-react"
import { LearnerSidebar } from "@/components/shared/LearnerSidebar"
import { LearnerTopbar } from "@/components/shared/LearnerTopbar"

type Book = { id: string; volume: number; edition: string; title_vi: string }
type Unit = { id: string; unit_number: number; title_vi: string | null }
type LearningItem = {
  id: string
  word?: string
  meaning?: string
  title?: string
  summary?: string
  analysis?: string
  examples?: Array<{ ko: string; vi: string }>
  page: number
  unit: Unit
  book: Book
}

export default function TextbookLearningPage() {
  const params = useParams<{ type: string }>()
  const type = params.type === "grammar" ? "grammar" : "vocabulary"
  const [items, setItems] = useState<LearningItem[]>([])
  const [loadedType, setLoadedType] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true)
  const [query, setQuery] = useState("")
  const [volume, setVolume] = useState("all")

  useEffect(() => {
    let active = true
    void fetch(`/api/textbooks/learning?type=${type}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active) setItems(data.items ?? []) })
      .catch(() => { if (active) setItems([]) })
      .finally(() => { if (active) setLoadedType(type) })
    return () => { active = false }
  }, [type])

  const loading = loadedType !== type

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi")
    return items.filter((item) => {
      if (volume !== "all" && String(item.book.volume) !== volume) return false
      if (!normalized) return true
      return [item.word, item.meaning, item.title, item.summary, item.analysis, item.unit.title_vi]
        .some((value) => value?.toLocaleLowerCase("vi").includes(normalized))
    })
  }, [items, query, volume])

  const isGrammar = type === "grammar"
  const Icon = isGrammar ? BookText : Languages
  return <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_right,_#e8efff_0,_#f6f8fb_34rem)]">
    <LearnerSidebar desktopOpen={desktopMenuOpen} mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
    <div className="min-w-0 flex-1">
      <LearnerTopbar onOpenMobileMenu={() => setMobileMenuOpen(true)} onToggleDesktopMenu={() => setDesktopMenuOpen((open) => !open)} title={isGrammar ? "Ngữ pháp" : "Học từ vựng"} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <section className="rounded-[28px] bg-gradient-to-br from-blue-700 to-indigo-600 p-6 text-white shadow-xl shadow-blue-900/10 sm:p-8">
          <div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-white/15"><Icon className="size-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Học tập · Giáo trình 2025</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{isGrammar ? "Ngữ pháp" : "Học từ vựng"}</h1></div></div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50">Nội dung được trích xuất theo từng bài từ bộ Giáo trình EPS‑TOPIK 2025. Chọn “Xem trang sách” để đối chiếu đúng ngữ cảnh gốc.</p>
        </section>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
          <label className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Tìm kiếm</span><input className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" onChange={(event) => setQuery(event.target.value)} placeholder={isGrammar ? "Tìm cấu trúc ngữ pháp..." : "Tìm từ tiếng Hàn hoặc nghĩa..."} value={query} /></label>
          <select aria-label="Lọc theo quyển" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400" onChange={(event) => setVolume(event.target.value)} value={volume}><option value="all">Cả 2 quyển</option><option value="1">Quyển 1</option><option value="2">Quyển 2</option></select>
        </div>

        {loading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-8 animate-spin text-blue-600" /></div> : null}
        {!loading && filteredItems.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Icon className="mx-auto size-8 text-slate-400" /><h2 className="mt-3 font-bold text-slate-800">Chưa tìm thấy nội dung phù hợp</h2><p className="mt-1 text-sm text-slate-500">Hãy thử đổi từ khóa hoặc chọn cả hai quyển.</p></div> : null}
        <div className={`mt-5 grid gap-4 ${isGrammar ? "lg:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
          {filteredItems.map((item) => <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md" key={item.id}>
            <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">Quyển {item.book.volume} · Bài {item.unit.unit_number}</span><span className="text-[10px] font-semibold text-slate-400">Trang {item.page}</span></div>
            <h2 className="mt-4 text-xl font-black text-slate-950">{isGrammar ? item.title : item.word}</h2>
            {isGrammar ? <><p className="mt-2 text-sm leading-6 text-slate-600">{item.summary || item.analysis || "Xem giải thích trong trang giáo trình gốc."}</p>{item.examples?.[0] ? <div className="mt-3 rounded-xl bg-emerald-50 p-3"><p className="text-sm font-bold text-slate-800">{item.examples[0].ko}</p><p className="mt-1 text-xs text-slate-500">{item.examples[0].vi}</p></div> : null}</> : <p className="mt-2 text-sm text-slate-600">{item.meaning || "Tra nghĩa trong ngữ cảnh của bài học."}</p>}
            <div className="mt-auto pt-5"><Link className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900" href={`/textbooks/${item.book.id}/read?page=${item.page}`}><BookOpen className="size-3.5" />Xem trang sách →</Link></div>
          </article>)}
        </div>
      </main>
    </div>
  </div>
}
