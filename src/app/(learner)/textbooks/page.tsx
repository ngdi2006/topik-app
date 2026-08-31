"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { BookOpen, ChevronRight, Library, LoaderCircle, Menu, Sparkles } from "lucide-react"
import { LearnerSidebar } from "@/components/shared/LearnerSidebar"
import { UserNav } from "@/components/shared/UserNav"
import type { TextbookSummary } from "@/lib/textbooks/types"

export default function TextbookLibraryPage() {
  const [books, setBooks] = useState<TextbookSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetch("/api/textbooks").then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setBooks(data.books ?? []))
      .finally(() => setLoading(false))
  }, [])

  return <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_right,_#e8efff_0,_#f6f8fb_34rem)]">
    <LearnerSidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button aria-label="Mở menu" className="grid size-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 md:hidden" onClick={() => setMobileMenuOpen(true)} type="button"><Menu className="size-6" /></button><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><Library className="size-4.5" /></span><div><p className="font-black text-slate-950">Giáo trình số</p><p className="hidden text-xs text-slate-500 sm:block">Thư viện EPS-TOPIK 2025</p></div></div><UserNav /></div></header>
      <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
    <section className="mx-auto max-w-7xl">
      <div className="relative mb-6 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#174dcc] via-[#315de0] to-[#6046e8] p-6 text-white shadow-[0_18px_45px_rgba(37,99,235,0.22)] sm:p-8">
        <div aria-hidden="true" className="absolute -right-20 -top-24 size-72 rounded-full border-[45px] border-white/10" /><div aria-hidden="true" className="absolute bottom-4 right-24 size-24 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="relative max-w-3xl"><div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20"><Sparkles className="size-5" /></div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Học tập · Giáo trình số</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">Giáo trình EPS-TOPIK 2025</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">Đọc liên tục theo Unit, tương tác trực tiếp với nội dung và xem tổng kết ngữ pháp tiếng Việt.</p></div>
      </div>

      {loading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-8 animate-spin text-blue-600" /></div> : null}
      {!loading && books.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpen className="mx-auto mb-3 text-slate-400" /><h2 className="font-bold">Giáo trình đang được chuẩn bị</h2><p className="mt-1 text-sm text-slate-500">Quản trị viên cần import và xuất bản dữ liệu sách.</p></div> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        {books.map((book) => {
          const page = book.progress?.last_page || 1
          const percent = Math.round(Number(book.progress?.progress_percent || 0))
          return <article className="group overflow-hidden rounded-[26px] border border-slate-200/90 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_45px_rgba(37,99,235,0.13)]" key={book.id}>
            <div className="flex min-h-60 gap-5 p-5 sm:p-7">
              <div className="relative w-32 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 shadow-inner sm:w-40">
                {book.coverUrl ? <Image alt={`Bìa ${book.title_vi}`} className="object-cover" fill sizes="160px" src={book.coverUrl} unoptimized /> : <div className="grid h-full place-items-center"><BookOpen className="size-12 text-blue-500" /></div>}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Quyển {book.volume} · {book.edition}</span>
                <h2 className="mt-3 text-xl font-black text-slate-900">{book.title_vi}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{book.title_ko}</p>
                <p className="mt-4 text-xs text-slate-500">{book.units.length} bài · {book.total_pages} trang</p>
                <div className="mt-auto pt-5"><div className="mb-1 flex justify-between text-xs"><span>Tiến độ</span><strong>{percent}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} /></div></div>
              </div>
            </div>
            <Link className="flex min-h-12 items-center justify-center gap-2 border-t border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 font-bold text-blue-700 transition group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white" href={`/textbooks/${book.id}/read?page=${page}`}>{percent ? "Tiếp tục đọc" : "Bắt đầu đọc"}<ChevronRight className="size-4" /></Link>
          </article>
        })}
      </div>
    </section>
      </main>
    </div>
  </div>
}
