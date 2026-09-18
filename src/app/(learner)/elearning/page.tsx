'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight, GraduationCap, LockKeyhole, Route } from 'lucide-react'
import { LearnerSidebar } from '@/components/shared/LearnerSidebar'
import { LearnerTopbar } from '@/components/shared/LearnerTopbar'

export default function ElearningCatalogPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)
  return <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_right,_#e8efff_0,_#f6f8fb_34rem)]">
    <LearnerSidebar desktopOpen={desktopOpen} mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
    <div className="min-w-0 flex-1"><LearnerTopbar title="E-Learning" onOpenMobileMenu={() => setMobileOpen(true)} onToggleDesktopMenu={() => setDesktopOpen(open => !open)} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-7 lg:py-12">
        <header className="mb-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Trung tâm E-Learning</p><h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Chọn lộ trình học tập</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Học theo từng bước với video, tài liệu, từ vựng, ngữ pháp, luyện tập và quiz đánh giá.</p></header>
        <section className="grid gap-5 lg:grid-cols-2">
          <article className="group overflow-hidden rounded-[28px] border border-blue-200 bg-white shadow-[0_16px_45px_rgba(37,99,235,0.10)] transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(37,99,235,0.16)]">
            <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 p-6 text-white sm:p-8"><div className="flex items-start justify-between gap-4"><span className="grid size-14 place-items-center rounded-2xl bg-white/15"><GraduationCap className="size-7" /></span><span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-100">Đang mở</span></div><p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Lộ trình đầu tiên</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Giáo trình EPS-TOPIK Quyển 1</h2><p className="mt-3 text-sm leading-6 text-blue-100">Học tuần tự từng bài và hoàn thành đầy đủ 8 bước để mở khóa bài tiếp theo.</p></div>
            <div className="p-6 sm:p-8"><div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-blue-50 p-3"><BookOpen className="mx-auto size-5 text-blue-600" /><strong className="mt-2 block text-sm">Theo bài</strong></div><div className="rounded-xl bg-violet-50 p-3"><Route className="mx-auto size-5 text-violet-600" /><strong className="mt-2 block text-sm">8 bước</strong></div><div className="rounded-xl bg-emerald-50 p-3"><GraduationCap className="mx-auto size-5 text-emerald-600" /><strong className="mt-2 block text-sm">Có tiến độ</strong></div></div><Link href="/elearning/course/giao-trinh-quyen-1" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">Vào học Quyển 1<ChevronRight className="size-4" /></Link></div>
          </article>
          <article className="flex min-h-[330px] flex-col justify-center rounded-[28px] border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><LockKeyhole className="size-6" /></span><h2 className="mt-4 text-xl font-black text-slate-800">Lộ trình tiếp theo</h2><p className="mt-2 text-sm text-slate-500">Giáo trình Quyển 2 và các khóa học khác sẽ được bổ sung tại đây.</p></article>
        </section>
      </main>
    </div>
  </div>
}
