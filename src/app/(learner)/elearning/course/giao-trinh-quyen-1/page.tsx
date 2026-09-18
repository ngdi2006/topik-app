'use client'

import Link from 'next/link'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { UserNav } from '@/components/shared/UserNav'
import { ElearningCoursePlayer } from '@/components/elearning/ElearningCoursePlayer'

export default function ElearningVolumeOnePage() {
  return <div className="min-h-screen bg-slate-50">
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Link href="/elearning" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <ArrowLeft className="size-4" /><span className="hidden sm:inline">Thoát khóa học</span><span className="sm:hidden">Thoát</span>
        </Link>
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <div className="flex min-w-0 items-center gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><GraduationCap className="size-5" /></span><div className="min-w-0"><h1 className="truncate text-base font-black text-slate-950 sm:text-xl">E-Learning Quyển 1</h1><p className="hidden text-xs text-slate-500 sm:block">Chế độ học tập tập trung</p></div></div>
      </div>
      <UserNav />
    </header>
    <main className="p-3 sm:p-6"><ElearningCoursePlayer /></main>
  </div>
}
