"use client"

import { useEffect, useState } from "react"
import { BookOpen, CheckCircle2, Database, LoaderCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

type AdminBook = { id: string; title_vi: string; title_ko: string; volume: number; total_pages: number; is_published: boolean; textbook_units: { count: number }[]; textbook_pages: { count: number }[] }

export default function AdminTextbooksPage() {
  const [books, setBooks] = useState<AdminBook[]>([])
  const [loading, setLoading] = useState(true)
  const load = () => { setLoading(true); fetch("/api/admin/textbooks").then((r) => r.json()).then((data) => setBooks(data.books ?? [])).finally(() => setLoading(false)) }
  useEffect(() => {
    let active = true
    void fetch("/api/admin/textbooks").then((r) => r.json()).then((data) => { if (active) setBooks(data.books ?? []) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const toggle = async (book: AdminBook) => { const response = await fetch("/api/admin/textbooks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: book.id, is_published: !book.is_published }) }); const data = await response.json(); if (!response.ok) return toast.error(data.error || "Không thể cập nhật"); toast.success(book.is_published ? "Đã chuyển về bản nháp" : "Đã xuất bản giáo trình"); load() }
  return <main className="p-5 sm:p-8"><div className="mx-auto max-w-6xl"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Nội dung học tập</p><h1 className="mt-1 text-3xl font-black">Quản lý giáo trình số</h1><p className="mt-1 text-sm text-slate-500">Module độc lập với Thi thử và Phỏng vấn Vòng 2.</p></div><button className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold" onClick={load}><RefreshCw className="size-4" />Làm mới</button></div>
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><Database className="mb-3 text-blue-600" /><p className="text-xs text-slate-500">Số giáo trình</p><strong className="text-2xl">{books.length}</strong></div><div className="rounded-2xl border bg-white p-5"><BookOpen className="mb-3 text-violet-600" /><p className="text-xs text-slate-500">Tổng số trang</p><strong className="text-2xl">{books.reduce((sum, book) => sum + book.total_pages, 0)}</strong></div><div className="rounded-2xl border bg-white p-5"><CheckCircle2 className="mb-3 text-emerald-600" /><p className="text-xs text-slate-500">Đã xuất bản</p><strong className="text-2xl">{books.filter((book) => book.is_published).length}</strong></div></div>
    {loading ? <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-blue-600" /></div> : <div className="overflow-hidden rounded-2xl border bg-white">{books.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Chưa có dữ liệu. Hãy chạy dry-run và import sau khi kiểm tra báo cáo.</div> : books.map((book) => { const pages=book.textbook_pages?.[0]?.count??0; const complete=pages===book.total_pages; return <div className="flex flex-col gap-4 border-b p-5 last:border-0 sm:flex-row sm:items-center" key={book.id}><div className="grid size-14 place-items-center rounded-2xl bg-blue-50 font-black text-blue-700">Q{book.volume}</div><div className="flex-1"><h2 className="font-black">{book.title_vi}</h2><p className="text-sm text-slate-500">{book.title_ko}</p><p className={`mt-2 text-xs font-bold ${complete?"text-emerald-600":"text-amber-600"}`}>{pages}/{book.total_pages} trang · {book.textbook_units?.[0]?.count??0} bài</p></div><button className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold disabled:opacity-40" disabled={!complete&&!book.is_published} onClick={()=>toggle(book)}>{book.is_published?"Đang xuất bản":"Xuất bản"}</button></div> })}</div>}</div></main>
}
