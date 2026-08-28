"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Bot, BookOpen, ClipboardCheck, FileText, Mic, Phone, Target, X } from "lucide-react"

const menuItems = [
    { key: "bai-hoc", label: "Bài học", Icon: BookOpen },
    { key: "luyen-tap", label: "Luyện tập", Icon: Target },
    { key: "thi-thu", label: "Thi thử EPS-TOPIK", Icon: FileText },
    { key: "ai-chat", label: "Luyện giao tiếp AI", Icon: Bot },
    { key: "kiem-tra", label: "Kiểm tra", Icon: ClipboardCheck },
    { key: "phong-van", label: "Phỏng vấn Vòng 2", Icon: Mic },
    { key: "tu-vung-vong-2", label: "Từ vựng & Biển báo", Icon: BookOpen },
] as const

type MenuKey = (typeof menuItems)[number]["key"]

type DashboardMenuSetting = {
    key: string
    is_enabled: boolean
}

function SidebarContent({ enabledKeys, onNavigate }: { enabledKeys: ReadonlySet<MenuKey>; onNavigate?: () => void }) {
    return (
        <>
            <div className="flex h-[72px] shrink-0 items-center justify-center border-b border-white/10">
                <Link className="relative h-16 w-52 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/dashboard" onClick={onNavigate}>
                    <Image alt="Korea Link" className="object-contain" fill priority src="/logo.png" unoptimized />
                </Link>
            </div>
            <nav aria-label="Menu học viên" className="flex w-64 flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
                {menuItems.filter(({ key }) => enabledKeys.has(key)).map(({ key, label, Icon }) => (
                    <Link className="flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-blue-50 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href={`/dashboard?section=${key}`} key={key} onClick={onNavigate}>
                        <Icon aria-hidden="true" className="size-5 shrink-0" />
                        <span>{label}</span>
                    </Link>
                ))}
                <div className="mt-auto" />
            </nav>
            <div className="flex w-64 shrink-0 flex-col items-center pb-4">
                <a aria-label="Gọi hotline hỗ trợ 0965577882" className="flex w-[204px] flex-col items-center justify-center gap-3 rounded border border-white/70 px-5 py-6 text-white shadow-sm transition-colors hover:border-white" href="tel:0965577882">
                    <span className="flex items-center gap-1.5 text-sm font-semibold"><Phone className="size-4" />Hotline hỗ trợ</span>
                    <span className="text-base font-medium">0965577882</span>
                </a>
            </div>
        </>
    )
}

export function LearnerSidebar({ mobileOpen, onMobileOpenChange }: { mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void }) {
    const [enabledKeys, setEnabledKeys] = useState<ReadonlySet<MenuKey>>(() => new Set())

    useEffect(() => {
        let active = true
        void fetch("/api/learner/dashboard-menu", { cache: "no-store" })
            .then(async (response) => response.ok ? response.json() as Promise<DashboardMenuSetting[]> : [])
            .then((settings) => {
                if (!active || !Array.isArray(settings)) return
                const knownKeys = new Set(menuItems.map(({ key }) => key))
                setEnabledKeys(new Set(settings
                    .filter(({ key, is_enabled }) => is_enabled && knownKeys.has(key as MenuKey) && key !== "tu-vung-vong-2" && key !== "bang-xep-hang")
                    .map(({ key }) => key as MenuKey)))
            })
            .catch(() => undefined)
        return () => { active = false }
    }, [])

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
            <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col overflow-hidden bg-[#2B64CE] text-white shadow-lg md:flex">
                <SidebarContent enabledKeys={enabledKeys} />
            </aside>
            <button aria-label="Đóng menu" className={`fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] transition-opacity md:hidden ${mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => onMobileOpenChange(false)} tabIndex={mobileOpen ? 0 : -1} type="button" />
            <aside aria-hidden={!mobileOpen} aria-label="Menu điều hướng" className={`fixed inset-y-0 left-0 z-[60] flex w-[min(88vw,340px)] flex-col overflow-hidden bg-[#2B64CE] text-white shadow-2xl transition-transform duration-300 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`} inert={!mobileOpen}>
                <button aria-label="Đóng menu" className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20" onClick={() => onMobileOpenChange(false)} type="button"><X className="size-6" /></button>
                <SidebarContent enabledKeys={enabledKeys} onNavigate={() => onMobileOpenChange(false)} />
            </aside>
        </>
    )
}
