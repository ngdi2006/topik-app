"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/shared/UserNav"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, PlayCircle, BookOpen, Target, FileText, Bot, ClipboardCheck, Coins, ShoppingCart, Phone, X, Factory, Sparkles, Mic, ArrowLeft, User, Trophy } from "lucide-react"
import { LessonList } from "@/components/lessons/LessonList"
import { PracticeHub } from "@/components/practice/PracticeHub"
import { PaymentModal } from "@/components/payment/PaymentModal"
import { Leaderboard } from "@/components/leaderboard/Leaderboard"
import { InterviewPracticeHub } from "@/components/interview/InterviewPracticeHub"
import { VocabularyPracticeHub } from "@/components/interview/VocabularyPracticeHub"

type ActiveMenu = 'bai-hoc' | 'luyen-tap' | 'thi-thu' | 'ai-chat' | 'kiem-tra' | 'phong-van' | 'tu-vung-vong-2' | 'bang-xep-hang'

type Exam = {
    id: string
    title: string
    duration: number
    total_questions: number
    is_free?: boolean
    is_ai_generated?: boolean
    is_official?: boolean
    description?: string
    free_attempts?: number
    remaining_free_attempts?: number
}

type LearnerMenuSetting = {
    key: ActiveMenu
    label: string
    is_enabled: boolean
    sort_order: number
}

type LearnerMenuMeta = {
    label: string
    Icon: typeof BookOpen
    description: string
    buttonText: string
    highlight?: boolean
}

const learnerMenuMeta: Record<ActiveMenu, LearnerMenuMeta> = {
    'bai-hoc': {
        label: 'Bài học',
        Icon: BookOpen,
        description: 'Học từ vựng, ngữ pháp và hội thoại theo giáo trình EPS-TOPIK',
        buttonText: 'Vào học',
    },
    'luyen-tap': {
        label: 'Luyện Tập',
        Icon: Target,
        description: 'Flashcard, ngữ pháp, trắc nghiệm nhanh theo bài học',
        buttonText: 'Luyện tập ngay',
    },
    'thi-thu': {
        label: 'Thi Thử',
        Icon: FileText,
        description: 'Làm đề thi thử EPS-TOPIK theo cấu trúc đề thi thật',
        buttonText: 'Vào thi thử',
    },
    'ai-chat': {
        label: 'Luyện giao tiếp AI',
        Icon: Bot,
        description: 'Đóng vai và thực hành tiếng Hàn với Giáo viên AI',
        buttonText: 'Khám phá kịch bản',
        highlight: true,
    },
    'kiem-tra': {
        label: 'Kiểm Tra',
        Icon: ClipboardCheck,
        description: 'Kiểm tra phát âm, từ vựng và phản xạ giao tiếp theo tiến độ học',
        buttonText: 'Vào Thi Thực Hành',
        highlight: true,
    },
    'phong-van': {
        label: 'Phỏng vấn Vòng 2',
        Icon: Mic,
        description: 'Luyện nghe khẩu lệnh, trả lời câu hỏi và sử dụng công cụ',
        buttonText: 'Vào Luyện Phỏng Vấn',
        highlight: true,
    },
    'tu-vung-vong-2': {
        label: 'Từ vựng & Biển báo',
        Icon: BookOpen,
        description: 'Luyện tập Flashcard, Trắc nghiệm, Ghép chữ, Nhận diện với AI',
        buttonText: 'Vào Luyện Từ Vựng',
        highlight: true,
    },
    'bang-xep-hang': {
        label: 'Bảng xếp hạng',
        Icon: Trophy,
        description: 'Bảng xếp hạng thành tích học tập',
        buttonText: 'Xem Bảng Xếp Hạng',
    },
}

const fallbackMenuSettings: LearnerMenuSetting[] = Object.entries(learnerMenuMeta).map(([key, meta], index) => ({
    key: key as ActiveMenu,
    label: meta.label,
    is_enabled: true,
    sort_order: index + 1,
}))

export default function DashboardPage() {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const { user, setUser, setRole, isLoading, setIsLoading } = useUserStore()
    const [exams, setExams] = useState<Exam[]>([])
    const [enabledMenuSettings, setEnabledMenuSettings] = useState<LearnerMenuSetting[]>([])
    const [isLocalLoading, setIsLocalLoading] = useState(true)
    const [activeMenu, setActiveMenu] = useState<ActiveMenu | null>(null)
    const [userCredits, setUserCredits] = useState<number>(0)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [checkingAccess, setCheckingAccess] = useState<string | null>(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [selectedOfficialExam, setSelectedOfficialExam] = useState<Exam | null>(null)
    const [showDobModal, setShowDobModal] = useState(false)
    const [userDob, setUserDob] = useState<string>("")
    const [isSavingDob, setIsSavingDob] = useState(false)
    const [examAwaitingDob, setExamAwaitingDob] = useState<Exam | null>(null)
    const [profileDob, setProfileDob] = useState<string | null>(null)
    const [dashboardStats, setDashboardStats] = useState<any>(null)
    const [leaderboard, setLeaderboard] = useState<any[]>([])
    const [currentUserRank, setCurrentUserRank] = useState<any>(null)

    const enabledMenuItems = useMemo(
        () => enabledMenuSettings
            .filter((item) => item.is_enabled && item.key in learnerMenuMeta && item.key !== 'tu-vung-vong-2')
            .map((item) => ({ ...item, ...learnerMenuMeta[item.key] })),
        [enabledMenuSettings]
    )

    const activeMenuItem = activeMenu ? enabledMenuItems.find((item) => item.key === activeMenu) : null

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile) setRole(profile.role)
            }

            try {
                const [examsRes, menuRes, statsRes] = await Promise.all([
                    fetch('/api/exams', { cache: 'no-store' }),
                    fetch('/api/learner/dashboard-menu', { cache: 'no-store' }),
                    fetch('/api/learner/dashboard-stats', { cache: 'no-store' }),
                ])

                if (examsRes.ok) {
                    const latestExams = await examsRes.json()
                    setExams(latestExams)
                }

                if (menuRes.ok) {
                    const menuItems = await menuRes.json()
                    if (Array.isArray(menuItems) && menuItems.length > 0) {
                        setEnabledMenuSettings(menuItems)
                    }
                }

                if (statsRes.ok) {
                    const statsData = await statsRes.json()
                    if (statsData.success) {
                        setDashboardStats(statsData.data.stats)
                        setLeaderboard(statsData.data.leaderboard)
                        setCurrentUserRank(statsData.data.currentUser)
                    }
                }
            } catch (error) {
                console.error("Lỗi lấy dữ liệu dashboard:", error)
                setEnabledMenuSettings(fallbackMenuSettings)
            }

            setIsLoading(false)
            setIsLocalLoading(false)
        }

        fetchUserData()
    }, [supabase, setUser, setRole, setIsLoading])

    useEffect(() => {
        if (user) {
            fetchCredits()
        }
    }, [user])

    useEffect(() => {
        if (activeMenu && !enabledMenuItems.some((item) => item.key === activeMenu)) {
            setActiveMenu(null)
        }
    }, [activeMenu, enabledMenuItems])

    const fetchCredits = async () => {
        try {
            const res = await fetch('/api/payment/credits')
            if (res.ok) {
                const data = await res.json()
                setUserCredits(data.remaining_credits ?? 0)
            }
        } catch {
            // ignore
        }
    }

    const handleStartExam = async (examId: string, isOfficial?: boolean) => {
        if (isOfficial) {
            const exam = exams.find(e => e.id === examId)
            if (exam) {
                setCheckingAccess(exam.id)
                const { data, error } = await supabase.from('profiles').select('date_of_birth').eq('id', user?.id).single()
                setCheckingAccess(null)

                if (data?.date_of_birth) {
                    setProfileDob(data.date_of_birth)
                    setSelectedOfficialExam(exam)
                } else {
                    setExamAwaitingDob(exam)
                    setShowDobModal(true)
                }
                return
            }
        }

        setCheckingAccess(examId)
        try {
            const res = await fetch(`/api/exams/${examId}/check-access`)
            if (!res.ok) {
                router.push(`/exam/${examId}/start`)
                return
            }
            const data = await res.json()
            if (data.can_access) {
                router.push(`/exam/${examId}/start`)
            } else {
                setPaymentModalOpen(true)
            }
        } catch {
            router.push(`/exam/${examId}/start`)
        } finally {
            setCheckingAccess(null)
        }
    }

    const handleSaveDob = async () => {
        if (!user?.id || !userDob) return
        setIsSavingDob(true)
        try {
            const res = await fetch('/api/learner/update-dob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dob: userDob })
            })
            const data = await res.json()
            if (data.success) {
                setProfileDob(userDob)
                setShowDobModal(false)
                if (examAwaitingDob) {
                    setSelectedOfficialExam(examAwaitingDob)
                    setExamAwaitingDob(null)
                }
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            alert("Có lỗi xảy ra khi lưu ngày sinh. Vui lòng thử lại: " + error.message)
        } finally {
            setIsSavingDob(false)
        }
    }

    const renderMenuButton = (item: (typeof enabledMenuItems)[number], onClick?: () => void) => {
        const Icon = item.Icon
        
        const isLeaderboard = item.key === 'bang-xep-hang';
        let buttonClass = '';
        
        if (isLeaderboard) {
            buttonClass = activeMenu === item.key 
                ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 text-blue-900 font-extrabold shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-[1.02]' 
                : 'bg-gradient-to-r from-yellow-400/90 to-amber-500/90 text-blue-900 font-bold shadow-md hover:scale-[1.02] hover:shadow-lg hover:shadow-yellow-500/30 transition-all duration-300';
        } else {
            buttonClass = activeMenu === item.key 
                ? 'bg-white/15 text-white hover:bg-white/20 font-medium' 
                : 'text-white/80 hover:bg-white/10 hover:text-white font-medium';
        }

        return (
            <Button
                key={item.key}
                variant="ghost"
                className={`w-full justify-start border-0 rounded-xl relative overflow-hidden ${buttonClass}`}
                onClick={() => {
                    setActiveMenu(item.key)
                    onClick?.()
                }}
            >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
            </Button>
        )
    }

    const renderOverviewCard = (item: (typeof enabledMenuItems)[number]) => {
        const Icon = item.Icon

        return (
            <Card key={item.key} className="border-primary/20 bg-primary/5 hover:border-primary/50 transition-colors">
                <CardHeader>
                    <CardTitle className="text-primary flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        {item.label}
                        {item.highlight && (
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="default"
                        className="w-full"
                        onClick={() => setActiveMenu(item.key)}
                    >
                        {item.buttonText}
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (isLoading || isLocalLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#f4f6f8]">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative flex items-center justify-center">
                        {/* Outer rotating dashed ring */}
                        <div className="absolute w-24 h-24 border-[3px] border-dashed border-blue-500/40 rounded-full animate-[spin_3s_linear_infinite]" />
                        {/* Middle rotating solid ring */}
                        <div className="absolute w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                        {/* Inner pulsing dot */}
                        <div className="w-6 h-6 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.6)]" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-blue-800 font-bold text-lg tracking-wider animate-pulse">KOREA LINK</p>
                        <p className="text-gray-500 font-medium text-sm">Đang tải dữ liệu, vui lòng đợi...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex bg-[#f4f6f8]">
            {/* Sidebar (Desktop) */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-[#2B64CE] text-white flex-col hidden md:flex h-screen sticky top-0 shrink-0 shadow-lg z-30`}>
                <div className="h-[72px] flex items-center justify-center border-b border-white/10 shrink-0">
                    <div className="relative w-52 h-16 mr-5 mt-5">
                        <Image src="/logo.png" alt="" fill className="object-contain" priority unoptimized={true} />
                    </div>
                </div>
                <nav className="flex-1 overflow-y-auto pt-4 px-3 flex flex-col gap-1 w-64">
                    {enabledMenuItems.filter(item => item.key !== 'bang-xep-hang').map((item) => renderMenuButton(item))}
                    
                    <div className="mt-auto mx-auto w-[204px] pb-4">
                        {enabledMenuItems.filter(item => item.key === 'bang-xep-hang').map((item) => renderMenuButton(item))}
                    </div>
                </nav>
                <div className="shrink-0 pb-4 w-64 flex flex-col items-center">
                    <a
                        href="tel:0965577882"
                        className="flex w-[204px] flex-col items-center justify-center gap-3 rounded border border-white/70 bg-transparent px-5 py-6 text-white shadow-sm transition-colors hover:border-white"
                        aria-label="Gọi hotline hỗ trợ 0965577882"
                    >
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                            <Phone className="h-4 w-4" />
                            Hotline hỗ trợ
                        </span>
                        <span className="text-base font-medium">0965577882</span>
                    </a>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-[72px] border-b bg-white px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Mobile Hamburger */}
                        <button
                            className="text-gray-600 hover:text-gray-900 md:hidden transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-10 h-10" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                                    <line x1="2" x2="16" y1="6" y2="6" />
                                    <line x1="2" x2="22" y1="12" y2="12" />
                                    <line x1="2" x2="16" y1="18" y2="18" />
                                </svg>
                            )}
                        </button>

                        {/* Desktop Hamburger */}
                        <button
                            className="text-gray-600 hover:text-gray-900 hidden md:block transition-colors"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                                <line x1="2" x2="16" y1="6" y2="6" />
                                <line x1="2" x2="22" y1="12" y2="12" />
                                <line x1="2" x2="16" y1="18" y2="18" />
                            </svg>
                        </button>

                        <div className="md:hidden relative w-32 h-8 mr-1">
                            <Image src="/logomobile.png" alt="Korea Link" fill sizes="128px" className="object-contain" priority />
                        </div>

                        <div className="hidden md:flex items-center text-xl font-bold text-gray-800 ml-2">
                            {activeMenuItem?.label ?? 'Tổng quan'}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 ml-auto">
                        <div className="flex items-center gap-2 md:gap-3 mr-1 md:mr-2">
                            <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                                <Coins className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-blue-600 text-sm">{userCredits} <span className="hidden md:inline">lượt</span></span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 md:gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 px-2 md:px-3"
                                onClick={() => setPaymentModalOpen(true)}
                            >
                                <ShoppingCart className="w-4 h-4" />
                                <span className="hidden md:inline">Mua thêm</span>
                            </Button>
                        </div>
                        <UserNav />
                    </div>
                </header>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-b border-white/10 bg-[#2B64CE] p-4 shadow-md sticky top-[72px] z-30 flex flex-col gap-1 text-white">
                        {enabledMenuItems.filter(item => item.key !== 'bang-xep-hang').map((item) => renderMenuButton(item, () => setIsMobileMenuOpen(false)))}
                        
                        <div className="mt-2 pb-2">
                            {enabledMenuItems.filter(item => item.key === 'bang-xep-hang').map((item) => renderMenuButton(item, () => setIsMobileMenuOpen(false)))}
                        </div>

                        <a
                            href="tel:0965577882"
                            className="mt-3 flex items-center justify-between rounded-lg border border-white/25 px-4 py-3 text-white/95"
                        >
                            <span className="flex items-center gap-2 text-sm font-semibold">
                                <Phone className="h-4 w-4" />
                                Hotline hỗ trợ
                            </span>
                            <span className="text-sm font-medium">0965577882</span>
                        </a>
                    </div>
                )}

                {/* Content */}
                <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#f4f6f8]">
                    <div className="max-w-6xl mx-auto space-y-6">

                        {/* Default view - no menu selected */}
                        {!activeMenu && (
                            <div className="grid grid-cols-12 gap-6">
                                {/* Khối bên trái/giữa */}
                                <div className="col-span-12 flex flex-col gap-6">
                                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Chào mừng trở lại! 👋</h1>
                                    
                                    <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4">
                                        {enabledMenuItems.map((item) => renderOverviewCard(item))}
                                    </div>

                                    {/* Khối Thống kê tiến độ nhanh */}
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <Target className="w-5 h-5 text-blue-600" /> Thống kê tiến độ
                                        </h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                                                    <FileText className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium uppercase mb-1">Lượt thi đã làm</p>
                                                <p className="text-xl font-bold text-gray-900">{dashboardStats?.examsTaken || 0} đề</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
                                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                                                    <Target className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium uppercase mb-1">Điểm trung bình</p>
                                                <p className="text-xl font-bold text-gray-900">{dashboardStats?.avgScore || 0}<span className="text-sm font-normal text-gray-500">/200</span></p>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
                                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-2">
                                                    <BookOpen className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium uppercase mb-1">Từ vựng đã thuộc</p>
                                                <p className="text-xl font-bold text-gray-900">{dashboardStats?.vocabLearned || 0} từ</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
                                                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center mb-2">
                                                    <span className="text-xl">🔥</span>
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium uppercase mb-1">Chuỗi ngày học</p>
                                                <p className="text-xl font-bold text-orange-600">{dashboardStats?.streak || 0} ngày</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BÀI HỌC */}
                        {activeMenu === 'bai-hoc' && activeMenuItem && <LessonList />}

                        {/* LUYỆN TẬP */}
                        {activeMenu === 'luyen-tap' && activeMenuItem && <PracticeHub />}

                        {/* THI THỬ */}
                        {activeMenu === 'thi-thu' && activeMenuItem && (
                            <>
                                {selectedOfficialExam ? (
                                    <div className="max-w-3xl mx-auto py-4">
                                        <div className="bg-white rounded-2xl shadow-xl p-5 md:p-8 mb-6 border border-gray-100">
                                            <div className="relative text-center mb-5 md:mb-8 mt-2 px-8 md:px-12">
                                                <button
                                                    onClick={() => setSelectedOfficialExam(null)}
                                                    className="absolute left-0 top-0 md:top-1 text-gray-400 hover:text-gray-700 transition-colors p-1.5 md:p-2 rounded-full hover:bg-gray-100 flex items-center justify-center"
                                                    title="Quay lại"
                                                >
                                                    <ArrowLeft className="w-5 h-5 md:w-7 md:h-7" />
                                                </button>
                                                <h1 className="text-lg md:text-3xl font-bold text-gray-900 mb-1 md:mb-2 uppercase tracking-wide">
                                                    Xác nhận thông tin
                                                </h1>
                                                <p className="text-xs md:text-sm text-gray-500">Vui lòng kiểm tra kỹ thông tin thí sinh trước khi vào phòng thi</p>
                                            </div>

                                            <div className="flex flex-row gap-4 md:gap-10 items-center md:items-start mb-6 md:mb-8 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 md:p-6 rounded-xl border border-blue-100/50">
                                                <div className="shrink-0">
                                                    <div className="w-20 h-20 md:w-32 md:h-32 bg-gray-200 rounded-xl overflow-hidden border-2 md:border-4 border-white shadow-md relative">
                                                        {user?.user_metadata?.avatar_url ? (
                                                            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                                                <User className="w-12 h-12 md:w-16 md:h-16 opacity-50" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-1 w-full min-w-0">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 md:gap-y-5 gap-x-4 text-sm md:text-base">
                                                        <div>
                                                            <p className="text-gray-500 mb-0.5 md:mb-1 text-[10px] md:text-xs uppercase font-bold tracking-wider">Họ và tên</p>
                                                            <p className="font-bold text-gray-900 text-base md:text-lg uppercase truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Thí sinh'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 mb-0.5 md:mb-1 text-[10px] md:text-xs uppercase font-bold tracking-wider">Ngày sinh</p>
                                                            <p className="font-semibold text-gray-900 text-sm md:text-base">{profileDob ? new Date(profileDob).toLocaleDateString('vi-VN') : 'Đang cập nhật'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 mb-0.5 md:mb-1 text-[10px] md:text-xs uppercase font-bold tracking-wider">Số báo danh (SBD)</p>
                                                            <p className="font-extrabold text-blue-600 text-base md:text-xl font-mono tracking-wider truncate">SBD-{user?.id?.substring(0, 5).toUpperCase() || '12345'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 mb-0.5 md:mb-1 text-[10px] md:text-xs uppercase font-bold tracking-wider">Số máy</p>
                                                            <p className="font-semibold text-gray-900 flex items-center gap-2 text-sm md:text-base">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse shrink-0"></span>
                                                                Máy {user?.id ? (parseInt(user.id.substring(0, 4), 16) % 50 + 1).toString().padStart(2, '0') : '01'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 text-sm text-yellow-800 rounded-r-lg">
                                                <p className="font-semibold mb-1">Lưu ý:</p>
                                                <p>Nếu thông tin trên không chính xác, vui lòng báo cáo ngay cho giám thị phòng thi. Không nhấn "Tiếp tục" nếu sai thông tin.</p>
                                            </div>

                                            <div className="text-center">
                                                <Button
                                                    size="lg"
                                                    className="w-full md:w-auto px-6 py-4 md:px-16 md:py-6 text-base md:text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
                                                    onClick={() => handleStartExam(selectedOfficialExam.id, false)}
                                                    disabled={checkingAccess === selectedOfficialExam.id}
                                                >
                                                    {checkingAccess === selectedOfficialExam.id ? (
                                                        <div className="flex items-center">
                                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                                            Đang tải...
                                                        </div>
                                                    ) : (
                                                        'Tiếp tục'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>

                                        {exams.length === 0 ? (
                                            <div className="border rounded-md p-8 text-center text-muted-foreground bg-muted/10">
                                                Hệ thống đang cập nhật đề thi. Vui lòng quay lại sau!
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {exams.map((exam) => (
                                                    <Card key={exam.id} className="hover:border-primary/50 transition-colors flex flex-col">
                                                        <CardHeader className="pb-3">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex gap-2">
                                                                    {exam.is_free && (
                                                                        <Badge className="bg-emerald-500">Miễn phí</Badge>
                                                                    )}
                                                                    {exam.is_ai_generated && (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                                                                            ✨ AI Gen
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <CardTitle className="text-lg line-clamp-2 leading-tight">
                                                                {exam.title}
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="pb-3 flex-1 text-sm text-muted-foreground space-y-3">
                                                            <div className="flex items-center gap-2 font-medium text-slate-700">
                                                                <Clock className="w-4 h-4 text-blue-500" />
                                                                <span>{exam.duration} phút • {exam.total_questions} câu hỏi</span>
                                                            </div>
                                                            <div className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                                                                {exam.description || 'Đề thi bám sát cấu trúc chuẩn EPS-TOPIK mới nhất, giúp bạn đánh giá chính xác năng lực và tự tin chinh phục kỳ thi thật! 🚀'}
                                                            </div>
                                                            {!exam.is_free && (
                                                                <div className="flex items-center justify-between bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                                                                    <span className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                                                                        <Factory className="w-3.5 h-3.5 text-blue-600" />
                                                                        Lượt thi miễn phí:
                                                                    </span>
                                                                    <Badge variant="secondary" className="bg-white border-blue-200 text-blue-700 shadow-sm">
                                                                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-yellow-500" />
                                                                        {exam.remaining_free_attempts ?? exam.free_attempts ?? 0} lượt
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                        <CardFooter>
                                                            <Button
                                                                className="w-full gap-2"
                                                                onClick={() => handleStartExam(exam.id, exam.is_official)}
                                                                disabled={checkingAccess === exam.id}
                                                            >
                                                                <PlayCircle className="w-4 h-4" />
                                                                {checkingAccess === exam.id ? 'Đang kiểm tra...' : 'Vào thi ngay'}
                                                            </Button>
                                                        </CardFooter>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* LUYỆN GIAO TIẾP AI */}
                        {activeMenu === 'ai-chat' && activeMenuItem && (
                            <>
                                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                                    <Bot className="w-8 h-8 text-primary" />
                                    Luyện giao tiếp AI
                                </h1>
                                <Card className="border-primary/50 bg-primary/5">
                                    <CardHeader>
                                        <CardTitle className="text-primary flex items-center gap-2">
                                            <Bot className="w-5 h-5" />
                                            Luyện giao tiếp AI
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                            </span>
                                        </CardTitle>
                                        <CardDescription>Đóng vai và thực hành tiếng Hàn với Giáo viên AI</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button
                                            variant="default"
                                            className="w-full"
                                            onClick={() => router.push('/ai-chat')}
                                        >
                                            Khám phá kịch bản
                                        </Button>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* KIỂM TRA */}
                        {activeMenu === 'kiem-tra' && activeMenuItem && (
                            <>
                                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                                    <ClipboardCheck className="w-8 h-8 text-primary" />
                                    Kiểm Tra
                                </h1>
                                <Card className="border-primary/20 bg-primary/5">
                                    <CardHeader>
                                        <CardTitle className="text-primary flex items-center gap-2">
                                            <ClipboardCheck className="w-5 h-5" />
                                            Đánh giá Năng lực (4 Mốc)
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                            </span>
                                        </CardTitle>
                                        <CardDescription>Kiểm tra phát âm, từ vựng và phản xạ giao tiếp theo tiến độ học</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button
                                            variant="default"
                                            className="w-full"
                                            onClick={() => router.push('/milestones')}
                                        >
                                            Vào Thi Thực Hành
                                        </Button>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* PHỎNG VẤN VÒNG 2 */}
                        {activeMenu === 'phong-van' && activeMenuItem && (
                            <InterviewPracticeHub onBackToDashboard={() => setActiveMenu(null)} />
                        )}

                        {/* TỪ VỰNG VÒNG 2 */}
                        {activeMenu === 'tu-vung-vong-2' && activeMenuItem && (
                            <VocabularyPracticeHub onBackToDashboard={() => setActiveMenu(null)} />
                        )}
                        {/* BẢNG XẾP HẠNG */}
                        {activeMenu === 'bang-xep-hang' && activeMenuItem && (
                            <Leaderboard leaderboard={leaderboard} currentUserRank={currentUserRank} />
                        )}

                        {/* Payment Modal */}
                        <PaymentModal
                            open={paymentModalOpen}
                            onClose={() => setPaymentModalOpen(false)}
                            onSuccess={() => {
                                setPaymentModalOpen(false)
                                fetchCredits()
                            }}
                        />

                        {/* DOB Modal */}
                        <Dialog open={showDobModal} onOpenChange={setShowDobModal}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Cập nhật thông tin</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    <p className="text-sm text-gray-500 mb-4">Vui lòng cập nhật <span className="font-semibold">Ngày sinh</span> của bạn để tham gia kỳ thi chính thức này.</p>
                                    <Input
                                        type="date"
                                        value={userDob}
                                        onChange={(e) => setUserDob(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-4">
                                    <Button variant="outline" onClick={() => setShowDobModal(false)}>Hủy</Button>
                                    <Button
                                        onClick={handleSaveDob}
                                        disabled={!userDob || isSavingDob}
                                    >
                                        {isSavingDob ? 'Đang lưu...' : 'Lưu và tiếp tục'}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </main>
            </div>
        </div>
    )
}
