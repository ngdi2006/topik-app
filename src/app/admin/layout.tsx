'use client'

import dynamic from "next/dynamic"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
    BookOpen,
    BrainCircuit,
    CreditCard,
    FileText,
    GraduationCap,
    KeyRound,
    LayoutDashboard,
    Menu,
    Package,
    ReceiptText,
    Settings,
    Shield,
    Target,
    Users,
    X,
} from "lucide-react"
import { ADMIN_MENU_ITEMS, type AdminPermissionKey } from "@/lib/admin-permissions"
import { useUserStore } from "@/store/userStore"

const AdminUserNav = dynamic(() => import("@/components/admin/AdminUserNav").then((mod) => mod.AdminUserNav), { ssr: false })

const ADMIN_MENU_ICONS: Record<AdminPermissionKey, typeof LayoutDashboard> = {
    dashboard: LayoutDashboard,
    lessons: GraduationCap,
    practice: Target,
    interview: Target,
    vocabulary_vong2: BookOpen,
    users: Users,
    milestones: FileText,
    categories: BookOpen,
    question_bank: FileText,
    ai_sync: BrainCircuit,
    exams: FileText,
    payments: CreditCard,
    interview_access: KeyRound,
    sepay_logs: ReceiptText,
    payment_packages: Package,
    settings: Settings,
}

const ADMIN_MENU_GROUPS: Array<{ label: string; keys: AdminPermissionKey[] }> = [
    { label: 'Tổng quan', keys: ['dashboard'] },
    { label: 'Đào tạo', keys: ['lessons', 'milestones', 'practice', 'interview', 'vocabulary_vong2'] },
    { label: 'Nội dung & kỳ thi', keys: ['categories', 'question_bank', 'exams', 'ai_sync'] },
    { label: 'Người dùng', keys: ['users', 'interview_access'] },
    { label: 'Tài chính', keys: ['payments', 'payment_packages', 'sepay_logs'] },
    { label: 'Hệ thống', keys: ['settings'] },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [paymentAttentionCount, setPaymentAttentionCount] = useState(0)
    const [adminPermissions, setAdminPermissions] = useState<AdminPermissionKey[]>(['dashboard'])
    const lastAttentionCheckRef = useRef(0)
    const pathname = usePathname()
    const { role, setRole } = useUserStore()

    const isAdmin = role === 'admin'
    const visibleMenuItems = ADMIN_MENU_ITEMS.filter((item) => isAdmin || adminPermissions.includes(item.key))
    const visibleMenuKeys = new Set(visibleMenuItems.map((item) => item.key))
    const menuItemsByKey = new Map(visibleMenuItems.map((item) => [item.key, item]))
    const canViewPayments = isAdmin || adminPermissions.includes('payments')

    useEffect(() => {
        let active = true
        fetch('/api/admin/me/permissions', { cache: 'no-store' })
            .then(async (response) => response.ok ? response.json() : null)
            .then((data) => {
                if (!active || !data) return
                setRole(data.role)
                setAdminPermissions(Array.isArray(data.permissions) ? data.permissions : ['dashboard'])
            })
            .catch(() => undefined)
        return () => { active = false }
    }, [setRole])

    useEffect(() => {
        if (!canViewPayments) return

        let active = true
        const loadAttentionCount = async (force = false) => {
            const now = Date.now()
            if (!force && now - lastAttentionCheckRef.current < 5_000) return
            lastAttentionCheckRef.current = now

            try {
                const response = await fetch('/api/admin/payments?summary=attention', { cache: 'no-store' })
                if (!response.ok) return
                const data = await response.json()
                if (active) setPaymentAttentionCount(Number(data.attention_count) || 0)
            } catch {
                // Keep navigation usable when the notification request fails.
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') loadAttentionCount()
        }
        const handleWindowFocus = () => loadAttentionCount()
        const handlePaymentChange = () => loadAttentionCount(true)

        loadAttentionCount(true)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleWindowFocus)
        window.addEventListener('admin-payment-attention-changed', handlePaymentChange)

        return () => {
            active = false
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleWindowFocus)
            window.removeEventListener('admin-payment-attention-changed', handlePaymentChange)
        }
    }, [canViewPayments])

    return (
        <div className="flex min-h-screen overflow-x-hidden bg-slate-50">
            {sidebarOpen ? (
                <button
                    type="button"
                    aria-label="Đóng menu quản trị"
                    className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            ) : null}

            <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
                    <Link href="/admin" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                        <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <Shield className="size-5" aria-hidden="true" />
                        </span>
                        <span className="leading-tight">
                            <span className="block text-sm font-bold text-slate-950">TOPIK Admin</span>
                            <span className="block text-[11px] font-medium text-slate-500">Quản trị hệ thống</span>
                        </span>
                    </Link>
                    <button
                        type="button"
                        aria-label="Đóng menu"
                        onClick={() => setSidebarOpen(false)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden"
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Chỉ mục quản trị được cấp quyền">
                    {ADMIN_MENU_GROUPS.map((group) => {
                        const groupItems = group.keys.filter((key) => visibleMenuKeys.has(key)).map((key) => menuItemsByKey.get(key)!)
                        if (groupItems.length === 0) return null

                        return (
                            <section key={group.label} className="mb-5 last:mb-0" aria-labelledby={`admin-nav-${group.label}`}>
                                <h2 id={`admin-nav-${group.label}`} className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    {group.label}
                                </h2>
                                <div className="space-y-0.5">
                                    {groupItems.map((item) => {
                                        const Icon = ADMIN_MENU_ICONS[item.key]
                                        const active = item.path === '/admin' ? pathname === item.path : pathname.startsWith(item.path)
                                        return (
                                            <Link
                                                key={item.key}
                                                href={item.path}
                                                aria-current={active ? 'page' : undefined}
                                                className={`group flex min-h-10 items-center rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? 'bg-blue-50 font-semibold text-blue-700' : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <Icon className={`mr-3 size-[18px] shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} aria-hidden="true" />
                                                <span className="min-w-0 flex-1 leading-5">{item.label}</span>
                                                {item.key === 'payments' && paymentAttentionCount > 0 ? (
                                                    <span
                                                        className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white"
                                                        aria-label={`${paymentAttentionCount} giao dịch cần xử lý`}
                                                    >
                                                        {paymentAttentionCount > 99 ? '99+' : paymentAttentionCount}
                                                    </span>
                                                ) : null}
                                            </Link>
                                        )
                                    })}
                                </div>
                            </section>
                        )
                    })}
                </nav>
            </aside>

            <main id="main-content" className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            aria-label="Mở menu quản trị"
                            onClick={() => setSidebarOpen(true)}
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden"
                        >
                            <Menu className="size-5" aria-hidden="true" />
                        </button>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 lg:text-base">Cổng Quản Trị Hệ Thống</p>
                            <p className="hidden text-xs text-slate-500 sm:block">Theo dõi và vận hành TOPIK IBT</p>
                        </div>
                    </div>
                    <AdminUserNav />
                </header>

                <div className="min-w-0 flex-1 p-4 lg:p-6 xl:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
