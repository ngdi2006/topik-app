'use client'

import Link from "next/link"
import { Shield, Users, FileText, Settings, LayoutDashboard, BookOpen, Menu, X, GraduationCap, Target, CreditCard, Package, BrainCircuit, ReceiptText, KeyRound } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useUserStore } from "@/store/userStore"
import { ADMIN_MENU_ITEMS, type AdminPermissionKey } from "@/lib/admin-permissions"

const AdminUserNav = dynamic(() => import("@/components/admin/AdminUserNav").then(mod => mod.AdminUserNav), { ssr: false })

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

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [paymentAttentionCount, setPaymentAttentionCount] = useState(0)
    const [adminPermissions, setAdminPermissions] = useState<AdminPermissionKey[]>(['dashboard'])
    const lastAttentionCheckRef = useRef(0)
    const pathname = usePathname()
    const { role, setRole } = useUserStore()

    const isAdmin = role === 'admin'
    const isTeacher = role === 'teacher'
    const visibleMenuItems = ADMIN_MENU_ITEMS.filter((item) => isAdmin || adminPermissions.includes(item.key))
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
        <div className="flex min-h-screen bg-gray-50/50">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50
                w-64 bg-white border-r border-gray-200
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
                    <div className="flex items-center">
                        <Shield className="w-6 h-6 text-primary mr-2" />
                        <span className="font-bold text-lg">TOPIK Admin</span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <nav className="space-y-1 p-4" aria-label="Chỉ mục quản trị được cấp quyền">
                    {visibleMenuItems.map((item) => {
                        const Icon = ADMIN_MENU_ICONS[item.key]
                        const active = item.path === '/admin' ? pathname === item.path : pathname.startsWith(item.path)
                        return (
                            <Link
                                key={item.key}
                                href={item.path}
                                className={`flex items-center rounded-lg px-4 py-3 transition-colors ${active ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Icon className="mr-3 size-5 shrink-0" aria-hidden="true" />
                                <span className="min-w-0 flex-1">{item.label}</span>
                                {item.key === 'payments' && paymentAttentionCount > 0 ? (
                                    <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                                        {paymentAttentionCount > 99 ? '99+' : paymentAttentionCount}
                                    </span>
                                ) : null}
                            </Link>
                        )
                    })}
                </nav>
                <nav className="hidden" aria-hidden="true">
                    <Link
                        href="/admin"
                        className="flex items-center px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <LayoutDashboard className="w-5 h-5 mr-3" />
                        Dashboard
                    </Link>
                    {!isTeacher && (
                        <>
                            <Link
                                href="/admin/lessons"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <GraduationCap className="w-5 h-5 mr-3" />
                                Bài Học
                            </Link>
                            <Link
                                href="/admin/practice"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Target className="w-5 h-5 mr-3" />
                                Luyện Tập AI
                            </Link>
                            <Link
                                href="/admin/interview-module"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Target className="w-5 h-5 mr-3" />
                                Phỏng Vấn (Vòng 2)
                            </Link>
                            <Link
                                href="/admin/vocabulary-vong2"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <BookOpen className="w-5 h-5 mr-3" />
                                Từ vựng Vòng 2
                            </Link>
                        </>
                    )}
                    <Link
                        href="/admin/users"
                        className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <Users className="w-5 h-5 mr-3" />
                        Người dùng
                    </Link>
                    {!isTeacher && (
                        <>
                            <Link
                                href="/admin/milestones"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <FileText className="w-5 h-5 mr-3" />
                                Các Mốc Học
                            </Link>
                            <Link
                                href="/admin/categories"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <BookOpen className="w-5 h-5 mr-3" />
                                Quản lý Kho
                            </Link>
                            <Link
                                href="/admin/question-bank"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <FileText className="w-5 h-5 mr-3" />
                                Câu Hỏi
                            </Link>
                            <Link
                                href="/admin/ai-sync"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <BrainCircuit className="w-5 h-5 mr-3" />
                                Đồng bộ AI
                            </Link>
                            <Link
                                href="/admin/exams"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <FileText className="w-5 h-5 mr-3" />
                                Đề Thi
                            </Link>
                            <Link
                                href="/admin/payments"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <CreditCard className="w-5 h-5 mr-3" />
                                <span className="flex-1">Thanh Toán</span>
                                {paymentAttentionCount > 0 ? (
                                    <span
                                        className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white"
                                        aria-label={`${paymentAttentionCount} giao dịch đã thanh toán nhưng chưa kích hoạt`}
                                        title={`${paymentAttentionCount} giao dịch cần kích hoạt`}
                                    >
                                        {paymentAttentionCount > 99 ? '99+' : paymentAttentionCount}
                                    </span>
                                ) : null}
                            </Link>
                            <Link
                                href="/admin/interview-access"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <KeyRound className="w-5 h-5 mr-3" />
                                Báo cáo gói Vòng 2
                            </Link>
                            <Link
                                href="/admin/sepay-logs"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <ReceiptText className="w-5 h-5 mr-3" />
                                Log SePay
                            </Link>
                            <Link
                                href="/admin/payment-packages"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Package className="w-5 h-5 mr-3" />
                                Gói thanh toán
                            </Link>
                            <Link
                                href="/admin/settings"
                                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Settings className="w-5 h-5 mr-3" />
                                Settings
                            </Link>
                        </>
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col lg:ml-0">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg lg:text-xl font-semibold text-gray-800">Cổng Quản Trị Hệ Thống</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <AdminUserNav />
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 lg:p-8 flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
