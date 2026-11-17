"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { ArrowRight, BookOpen, BookOpenCheck, FilePenLine, RefreshCw } from "lucide-react"
import type { TextbookSummary } from "@/lib/textbooks/types"

type Filter = "all" | "course" | "workbook"
const isWorkbook = (book: TextbookSummary) => book.code.includes("-workbook-")
const progressOf = (book: TextbookSummary) => Math.round(Math.max(0, Math.min(100, Number(book.progress?.progress_percent) || 0)))

function BookCard({ book }: { book: TextbookSummary }) {
  const workbook = isWorkbook(book)
  const locked = book.canAccess === false
  const progress = progressOf(book)
  const lastPage = Math.min(book.total_pages, Math.max(1, Math.floor(Number(book.progress?.last_page) || 1)))
  const started = !!book.progress && (progress > 0 || lastPage > 1)
  const lessons = book.units.filter(unit => unit.unit_number > 0).length
  const cover = /^eps-topik-2025-workbook-[12]$/.test(book.code)
    ? `/textbooks/covers/eps-topik-2025-workbook-volume-${book.volume}.webp`
    : /^eps-topik-2025-[12]$/.test(book.code) ? `/textbooks/covers/eps-topik-2025-volume-${book.volume}.png` : book.coverUrl
  const Icon = workbook ? FilePenLine : BookOpen
  return <article data-library-book={book.id} className="flex min-w-0 gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:gap-5 sm:p-5">
    <div className={`relative aspect-[3/4] w-[82px] shrink-0 self-start overflow-hidden rounded-lg border border-slate-200/70 sm:w-[124px] ${workbook ? "bg-violet-50" : "bg-blue-50"}`}>
      {cover ? <Image alt={`Bìa ${book.title_vi}`} className="object-contain p-1" fill sizes="(max-width: 639px) 82px, 124px" src={cover} /> : <div className="absolute inset-0 grid place-items-center"><Icon className="size-9 text-slate-400" /></div>}
    </div>
    <div className="flex min-w-0 flex-1 flex-col">
      <div className={`flex items-center gap-1.5 text-[10px] font-bold sm:text-xs ${workbook ? "text-violet-700" : "text-blue-700"}`}><Icon aria-hidden="true" className="size-3.5" />{workbook ? "THỰC HÀNH" : "KIẾN THỨC"}</div>
      <h3 className="mt-1.5 text-base font-bold leading-snug text-slate-900 sm:text-xl">{workbook ? "Sách bài tập" : "Giáo trình"} <span className="whitespace-nowrap">· Quyển {book.volume}</span></h3>
      <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs" lang="ko" title={book.title_ko}>{book.title_ko}</p>
      <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">{lessons} bài học <span aria-hidden="true" className="px-1">·</span> {book.total_pages} trang</p>
      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex items-center justify-between gap-1 text-[10px] sm:text-xs"><span className="text-slate-500">{started ? `Đang đọc trang ${lastPage}` : "Chưa bắt đầu"}</span><span className="font-bold tabular-nums text-slate-700">{progress}%</span></div>
        <div aria-label={`Tiến độ ${book.title_vi}`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="h-1 overflow-hidden rounded-full bg-slate-100" role="progressbar"><div className={`h-full rounded-full ${workbook ? "bg-violet-500" : "bg-blue-600"}`} style={{ width: `${progress}%` }} /></div>
        {locked ? <div className="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-slate-100 px-2 text-center text-xs font-semibold text-slate-500" title="Liên hệ admin để kích hoạt quyền sử dụng sách bài tập">Cần admin kích hoạt</div> : <Link aria-label={`${started ? "Tiếp tục" : "Mở"} ${book.title_vi}`} className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:text-sm ${workbook ? "bg-violet-50 text-violet-800 hover:bg-violet-100" : "bg-blue-600 text-white hover:bg-blue-700"}`} href={`/textbooks/${book.id}/read?page=${lastPage}`}>{started ? "Tiếp tục học" : workbook ? "Bắt đầu làm bài" : "Bắt đầu học"}<ArrowRight aria-hidden="true" className="size-4" /></Link>}
      </div>
    </div>
  </article>
}

export default function TextbookLibrary({ books, loading, error, onRetry }: { books: TextbookSummary[]; loading: boolean; error: string | null; onRetry: () => void }) {
  const [filter, setFilter] = useState<Filter>("all")
  const sorted = [...books].sort((a, b) => b.edition.localeCompare(a.edition, "vi", { numeric: true }) || a.volume - b.volume || Number(isWorkbook(a)) - Number(isWorkbook(b)) || a.title_vi.localeCompare(b.title_vi, "vi"))
  const groups = new Map<string, { volume: number; edition: string; books: TextbookSummary[] }>()
  for (const book of sorted) {
    if ((filter === "course" && isWorkbook(book)) || (filter === "workbook" && !isWorkbook(book))) continue
    const key = `${book.edition}:${book.volume}`
    if (!groups.has(key)) groups.set(key, { volume: book.volume, edition: book.edition, books: [] })
    groups.get(key)!.books.push(book)
  }
  return <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-7 lg:px-8" data-textbook-library>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">THƯ VIỆN HỌC TẬP</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Giáo trình EPS-TOPIK</h1><p className="mt-2 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm">Học kiến thức với giáo trình, luyện tập cùng sách bài tập theo từng quyển.</p></div>
      <div aria-label="Lọc loại sách" className="flex w-fit max-w-full gap-1 rounded-xl border border-slate-200 bg-white p-1" role="group">{([["all", "Tất cả"], ["course", "Giáo trình"], ["workbook", "Sách bài tập"]] as const).map(([value, label]) => <button aria-pressed={filter === value} className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${filter === value ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`} key={value} onClick={() => setFilter(value)} type="button">{label}</button>)}</div>
    </div>
    {loading ? <div aria-label="Đang tải thư viện" className="grid gap-4 sm:grid-cols-2" role="status">{[0, 1, 2, 3].map(index => <div className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5" key={index}><div className="h-40 w-24 shrink-0 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" /><div className="flex-1 space-y-4"><div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" /><div className="h-8 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" /><div className="h-10 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" /></div></div>)}</div> : error ? <div className="rounded-2xl border border-red-100 bg-white p-6 text-center" role="alert"><p className="text-sm text-slate-700">{error}</p><button className="mx-auto mt-3 flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white" onClick={onRetry} type="button"><RefreshCw aria-hidden="true" className="size-4" />Thử lại</button></div> : !groups.size ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><BookOpenCheck aria-hidden="true" className="mx-auto mb-3 size-8 text-slate-400" /><h2 className="font-semibold text-slate-800">{books.length ? "Chưa có sách thuộc loại này" : "Giáo trình đang được chuẩn bị"}</h2><p className="mt-2 text-xs text-slate-500">{books.length ? "Chọn Tất cả để xem các sách hiện có." : "Các sách sẽ xuất hiện tại đây khi được phát hành."}</p></div> : <div className="space-y-6 sm:space-y-7">{[...groups].map(([key, group]) => {
      const units = group.books.flatMap(book => book.units).filter(unit => unit.unit_number > 0)
      const first = units.length ? Math.min(...units.map(unit => unit.unit_number)) : null
      const last = units.length ? Math.max(...units.map(unit => unit.unit_number)) : null
      return <section aria-labelledby={`volume-${key}`} key={key} data-library-volume={group.volume}><div className="mb-3 flex flex-wrap items-center gap-2"><span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-white text-xs font-bold text-blue-700 ring-1 ring-slate-200">{String(group.volume).padStart(2, "0")}</span><h2 className="text-sm font-bold text-slate-800 sm:text-base" id={`volume-${key}`}>Quyển {group.volume}</h2><span className="text-[11px] text-slate-400 sm:text-xs">{group.edition}{first !== null ? ` · Bài ${first}–${last}` : ""}</span></div><div className="grid gap-3 lg:grid-cols-2 sm:gap-4">{group.books.map(book => <BookCard book={book} key={book.id} />)}</div></section>
    })}</div>}
  </main>
}
