"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, BookOpen, BookText, ChevronDown, FileText, Languages, LayoutDashboard, Mic, Phone, RotateCcw, Target, Trophy, UserRound, X } from "lucide-react"
import { UserNav } from "@/components/shared/UserNav"

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()
    const [examOpen, setExamOpen] = useState(false)
    const [interviewOpen, setInterviewOpen] = useState(false)
    return (
        <>
            <div className="flex h-[72px] shrink-0 items-center justify-center border-b border-white/10">
                <Link className="relative h-16 w-52 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/dashboard" onClick={onNavigate}>
                    <Image alt="Korea Link" className="object-contain" fill priority src="/logo.png" unoptimized />
                </Link>
            </div>
            <nav aria-label="Menu học viên" className="flex w-64 flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100/70">Luyện thi</p>
                <button aria-expanded={examOpen} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/15" onClick={() => setExamOpen((open) => !open)} type="button"><FileText className="size-5 shrink-0" /><span className="min-w-0 flex-1">Thi Thử EPS-TOPIK</span><ChevronDown className={`size-3.5 transition-transform ${examOpen ? "rotate-180" : ""}`} /></button>
                {examOpen ? <div className="ml-6 space-y-0.5 border-l border-white/20 pb-1 pl-3">{[["Tổng quan kỳ thi", "/dashboard?section=thi-thu", LayoutDashboard], ["Danh sách đề thi", "/dashboard?section=thi-thu-de-thi", FileText], ["Bảng xếp hạng", "/dashboard?section=thi-thu-bang-xep-hang", Trophy]].map(([label, href, Icon]) => <Link className="flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-50 transition hover:bg-white/15 hover:text-white" href={String(href)} key={String(label)} onClick={onNavigate}><Icon className="size-3.5" />{String(label)}</Link>)}</div> : null}
                <button aria-expanded={interviewOpen} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/15" onClick={() => setInterviewOpen((open) => !open)} type="button"><Mic className="size-5 shrink-0" /><span className="min-w-0 flex-1">Phỏng vấn Vòng 2</span><ChevronDown className={`size-3.5 transition-transform ${interviewOpen ? "rotate-180" : ""}`} /></button>
                {interviewOpen ? <div className="ml-6 space-y-0.5 border-l border-white/20 pb-1 pl-3">{[["Tổng quan", "/dashboard?section=phong-van-tong-quan", LayoutDashboard], ["Luyện tập", "/dashboard?section=phong-van-luyen-tap", Target], ["Thi thử", "/dashboard?section=phong-van-thi-thu", UserRound], ["Củng cố", "/dashboard?section=phong-van-cung-co", RotateCcw], ["Báo cáo", "/dashboard?section=phong-van-bao-cao", BarChart3]].map(([label, href, Icon]) => <Link className="flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-50 transition hover:bg-white/15 hover:text-white" href={String(href)} key={String(label)} onClick={onNavigate}><Icon className="size-3.5" />{String(label)}</Link>)}</div> : null}
                <p className="mt-4 px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100/70">Học tập</p>
                {[["Giáo trình 2025", "/textbooks", BookOpen], ["Học từ vựng", "/textbooks/learning/vocabulary", Languages], ["Ngữ pháp", "/textbooks/learning/grammar", BookText]].map(([label, href, Icon]) => {
                    const active = href === "/textbooks" ? pathname === href : pathname.startsWith(String(href))
                    return <Link aria-current={active ? "page" : undefined} className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-white transition ${active ? "bg-white/15 hover:bg-white/20" : "text-white/80 hover:bg-white/10 hover:text-white"}`} href={String(href)} key={String(href)} onClick={onNavigate}><Icon className="size-4 shrink-0" />{String(label)}</Link>
                })}
                <div className="mt-auto" />
            </nav>
            <div className="flex w-64 shrink-0 flex-col items-center pb-4">
                <div aria-hidden="true" className="relative -mb-2 h-44 w-[220px] overflow-hidden"><div className="absolute inset-x-4 bottom-0 h-24 rounded-full bg-blue-400/20 blur-2xl" /><Image alt="" className="object-contain object-bottom drop-shadow-[0_12px_18px_rgba(15,23,42,0.22)]" fill sizes="220px" src="/dashboard/sidebar/sidebar-champion.webp" /></div>
                <a aria-label="Gọi hotline hỗ trợ 0965577882" className="relative flex w-[204px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-white shadow-lg shadow-blue-950/10 backdrop-blur-sm transition-[background-color,border-color] hover:border-white/50 hover:bg-white/15" href="tel:0965577882">
                    <span className="flex items-center gap-1.5 text-sm font-semibold"><Phone className="size-4" />Hotline hỗ trợ</span>
                    <span className="text-base font-medium">0965577882</span>
                </a>
            </div>
        </>
    )
}

export function LearnerSidebar({ mobileOpen, onMobileOpenChange, desktopOpen = true }: { mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void; desktopOpen?: boolean }) {
    const pathname = usePathname()
    const [examOpen, setExamOpen] = useState(false)
    const [interviewOpen, setInterviewOpen] = useState(false)

    useEffect(() => {
        if (!mobileOpen) return
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onMobileOpenChange(false)
        window.addEventListener("keydown", closeOnEscape)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener("keydown", closeOnEscape)
        }
    }, [mobileOpen, onMobileOpenChange])

    return (
        <>
            <aside className={`${desktopOpen ? "w-64" : "w-0"} sticky top-0 z-30 hidden h-screen shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#164dcc] via-[#315ed8] to-[#654fe5] text-white shadow-xl transition-[width] duration-300 md:flex`}>
                <SidebarContent />
            </aside>
            <button aria-label="Đóng menu" className={`fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] transition-opacity md:hidden ${mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => onMobileOpenChange(false)} tabIndex={mobileOpen ? 0 : -1} type="button" />
            <aside aria-hidden={!mobileOpen} aria-label="Menu điều hướng" className={`fixed inset-y-0 left-0 z-[60] flex w-[min(90vw,360px)] flex-col overflow-hidden rounded-tr-[30px] border-l-[6px] border-t-4 border-blue-600 bg-blue-600 text-slate-800 shadow-[20px_0_55px_rgba(15,36,80,0.26)] transition-transform duration-300 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`} inert={!mobileOpen}>
                <div className="relative z-10 flex min-h-[84px] shrink-0 items-center justify-between rounded-tl-[34px] rounded-tr-[26px] border-b border-slate-100 bg-white px-5 py-3">
                    <Link aria-label="Về dashboard tổng quan" className="relative h-9 w-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" href="/dashboard" onClick={() => onMobileOpenChange(false)}>
                        <Image alt="Korea Link" className="object-contain" fill priority sizes="112px" src="/logomobile.png" />
                    </Link>
                    <button aria-label="Đóng menu" className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => onMobileOpenChange(false)} type="button"><X className="size-5" /></button>
                </div>

                <nav className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto bg-white px-4 py-4 [scrollbar-gutter:stable]">
                    <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Học và luyện thi</p>
                    <div className="order-3 mt-3 space-y-1 border-t border-slate-100 pt-3">
                        <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Học tập</p>
                        {[["Giáo trình 2025", "/textbooks", BookOpen], ["Học từ vựng", "/textbooks/learning/vocabulary", Languages], ["Ngữ pháp", "/textbooks/learning/grammar", BookText]].map(([label, href, Icon]) => {
                            const active = href === "/textbooks" ? pathname === href : pathname.startsWith(String(href))
                            return <Link aria-current={active ? "page" : undefined} className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[13px] font-bold ${active ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-slate-700 hover:bg-slate-50 hover:text-emerald-700"}`} href={String(href)} key={String(href)} onClick={() => onMobileOpenChange(false)}><span className={`grid size-8 place-items-center rounded-lg ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}><Icon className="size-3.5" /></span>{String(label)}</Link>
                        })}
                    </div>
                    <div className="order-1 space-y-1">
                        <button aria-expanded={examOpen} className="flex h-10 w-full items-center rounded-xl bg-blue-50 px-3 text-[13px] font-bold text-blue-700 shadow-sm" onClick={() => setExamOpen((open) => !open)} type="button">
                            <span className="mr-2.5 grid size-8 place-items-center rounded-lg bg-blue-600 text-white shadow-sm"><FileText className="size-3.5" /></span><span className="min-w-0 flex-1 truncate text-left">Thi Thử EPS-TOPIK</span><ChevronDown className={`size-3.5 transition-transform ${examOpen ? "rotate-180" : ""}`} />
                        </button>
                        {examOpen ? <div className="ml-6 space-y-0.5 border-l border-blue-200 pl-4">
                            {[
                                ["Tổng quan kỳ thi", "/dashboard?section=thi-thu", LayoutDashboard],
                                ["Danh sách đề thi", "/dashboard?section=thi-thu-de-thi", FileText],
                                ["Bảng xếp hạng", "/dashboard?section=thi-thu-bang-xep-hang", Trophy],
                            ].map(([label, href, Icon]) => <Link className="flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700" href={String(href)} key={String(label)} onClick={() => onMobileOpenChange(false)}><Icon className="size-3.5" />{String(label)}</Link>)}
                        </div> : null}
                    </div>

                    <div className="order-2 space-y-1">
                        <button aria-expanded={interviewOpen} className="flex h-10 w-full items-center rounded-xl bg-violet-50 px-3 text-[13px] font-bold text-violet-700 shadow-sm" onClick={() => setInterviewOpen((open) => !open)} type="button">
                            <span className="mr-2.5 grid size-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-sm"><Mic className="size-3.5" /></span><span className="min-w-0 flex-1 truncate text-left">Phỏng vấn Vòng 2</span><ChevronDown className={`size-3.5 transition-transform ${interviewOpen ? "rotate-180" : ""}`} />
                        </button>
                        {interviewOpen ? <div className="ml-6 space-y-0.5 border-l border-violet-200 pl-4">
                            {[
                                ["Tổng quan", "/dashboard?section=phong-van-tong-quan", LayoutDashboard],
                                ["Luyện tập", "/dashboard?section=phong-van-luyen-tap", Target],
                                ["Thi thử", "/dashboard?section=phong-van-thi-thu", UserRound],
                                ["Củng cố", "/dashboard?section=phong-van-cung-co", RotateCcw],
                                ["Báo cáo", "/dashboard?section=phong-van-bao-cao", BarChart3],
                            ].map(([label, href, Icon]) => <Link className="flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700" href={String(href)} key={String(label)} onClick={() => onMobileOpenChange(false)}><Icon className="size-3.5" />{String(label)}</Link>)}
                        </div> : null}
                    </div>
                </nav>

                <div className="relative mt-auto shrink-0 space-y-2 border-t border-blue-100 bg-white p-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
                    <UserNav variant="drawer" onNavigate={() => onMobileOpenChange(false)} />
                    <a className="mt-2.5 flex min-h-12 items-center justify-between rounded-xl border border-blue-100 bg-white px-3 py-1.5 text-slate-700 shadow-sm" href="tel:0965577882">
                        <span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-200"><Phone className="size-3" /></span><span><span className="block text-[9px] font-medium text-slate-500">Hotline hỗ trợ</span><strong className="block text-sm font-black tabular-nums text-blue-700">0965 577 882</strong></span></span><span className="grid size-7 place-items-center rounded-full bg-blue-50 text-blue-600"><Phone className="size-3" /></span>
                    </a>
                    <div aria-hidden="true" className="relative -mx-2.5 -mb-[max(10px,env(safe-area-inset-bottom))] h-16 overflow-hidden">
                        <span className="absolute bottom-0 right-9 z-10 block size-16 drop-shadow-[0_8px_12px_rgba(37,99,235,0.22)]"><Image alt="" className="object-contain" fill sizes="64px" src="/dashboard/mobile-menu/rocket-3d.webp" /></span>
                        <svg className="absolute inset-x-0 bottom-0 h-16 w-full" preserveAspectRatio="none" viewBox="0 0 390 80"><path d="M0 35C48 15 91 15 134 34C180 55 218 66 262 58C307 50 343 28 390 33V80H0Z" fill="#dbeafe"/><path d="M0 47C47 27 91 29 136 48C181 67 220 74 263 66C308 58 346 39 390 43V80H0Z" fill="#93c5fd"/><path d="M0 59C45 41 91 42 137 59C183 76 224 81 267 73C311 65 350 50 390 53V80H0Z" fill="#2563eb"/></svg>
                    </div>
                </div>
            </aside>
        </>
    )
}
