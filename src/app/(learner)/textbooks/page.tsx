"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { BookOpen, ChevronRight, LoaderCircle } from "lucide-react"
import { LearnerSidebar } from "@/components/shared/LearnerSidebar"
import { LearnerTopbar } from "@/components/shared/LearnerTopbar"
import type { TextbookSummary } from "@/lib/textbooks/types"

export default function TextbookLibraryPage() {
  const [books, setBooks] = useState<TextbookSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true)

  useEffect(() => {
    fetch("/api/textbooks").then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setBooks(data.books ?? []))
      .finally(() => setLoading(false))
  }, [])

  return <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_right,_#e8efff_0,_#f6f8fb_34rem)]">
    <LearnerSidebar desktopOpen={desktopMenuOpen} mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
    <div className="min-w-0 flex-1">
      <LearnerTopbar onOpenMobileMenu={() => setMobileMenuOpen(true)} onToggleDesktopMenu={() => setDesktopMenuOpen((open) => !open)} title="Giáo trình 2025" />
      <main className="px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
    <section className="mx-auto max-w-7xl">
      {loading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-8 animate-spin text-blue-600" /></div> : null}
      {!loading && books.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpen className="mx-auto mb-3 text-slate-400" /><h2 className="font-bold">Giáo trình đang được chuẩn bị</h2><p className="mt-1 text-sm text-slate-500">Quản trị viên cần import và xuất bản dữ liệu sách.</p></div> : null}
      <div className="grid gap-3 sm:gap-6 md:grid-cols-2 xl:gap-8">
        {books.map((book) => {
          const page = book.progress?.last_page || 1
          const percent = Math.round(Number(book.progress?.progress_percent || 0))
          const coverSrc = book.edition === "2025" && (book.volume === 1 || book.volume === 2)
            ? `/textbooks/covers/eps-topik-2025-volume-${book.volume}.png`
            : book.coverUrl
          return <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_22px_52px_rgba(37,99,235,0.14)] motion-reduce:transform-none sm:rounded-[28px] sm:shadow-[0_12px_35px_rgba(15,23,42,0.07)]" key={book.id}>
            <div className="grid min-h-[218px] grid-cols-[145px_minmax(0,1fr)] gap-0 sm:min-h-0 sm:grid-cols-[44%_1fr]">
              <div className="relative min-h-full overflow-hidden bg-white sm:min-h-[390px]">
                {coverSrc ? <Image alt={`Bìa ${book.title_vi}`} className="object-contain object-center transition-transform duration-500 group-hover:scale-[1.015] motion-reduce:transform-none" fill priority={book.volume <= 2} sizes="(max-width: 639px) 145px, (max-width: 1279px) 44vw, 560px" src={coverSrc} /> : <div className="grid h-full place-items-center bg-gradient-to-br from-blue-50 to-indigo-100"><BookOpen className="size-10 text-blue-500 sm:size-16" /></div>}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
              </div>
              <div className="flex min-w-0 flex-col p-3.5 sm:p-7">
                <span className="w-fit rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 sm:px-3 sm:py-1 sm:text-xs">Quyển {book.volume} · {book.edition}</span>
                <h2 className="mt-2 line-clamp-2 text-sm font-black leading-snug text-slate-950 sm:mt-4 sm:text-balance sm:text-2xl sm:leading-tight">{book.title_vi}</h2>
                <p className="mt-1 truncate text-[11px] font-medium text-slate-500 sm:mt-2 sm:text-sm">{book.title_ko}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-500 sm:mt-5 sm:gap-2 sm:text-xs"><span>{book.units.length} bài</span><span aria-hidden="true" className="size-1 rounded-full bg-slate-300" /><span>{book.total_pages} trang</span></div>
                <div className="mt-auto pt-3 sm:pt-7"><div className="mb-1 flex justify-between text-[10px] sm:mb-2 sm:text-xs"><span className="font-medium text-slate-600">Tiến độ</span><strong className="tabular-nums text-slate-900">{percent}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 sm:h-2"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" style={{ width: `${percent}%` }} /></div></div>
                <Link className="mt-3 flex min-h-9 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 text-xs font-bold text-white shadow-sm transition-[background-color,box-shadow,transform] hover:bg-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:translate-y-px sm:mt-6 sm:min-h-11 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-base" href={`/textbooks/${book.id}/read?page=${page}`}>{percent ? "Tiếp tục đọc" : "Bắt đầu đọc"}<ChevronRight aria-hidden="true" className="size-3.5 sm:size-4" /></Link>
              </div>
            </div>
          </article>
        })}
      </div>
    </section>
      </main>
    </div>
  </div>
}
