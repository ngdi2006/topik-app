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
import { Clock, PlayCircle, BookOpen, Target, FileText, Bot, ClipboardCheck, Coins, ShoppingCart, Phone, X, Factory, Sparkles, Mic, ArrowLeft, User, Trophy, ChevronDown, Award, LayoutDashboard, RotateCcw, BarChart3 } from "lucide-react"
import { LessonList } from "@/components/lessons/LessonList"
import { PracticeHub } from "@/components/practice/PracticeHub"
import { PaymentModal } from "@/components/payment/PaymentModal"
import { Leaderboard } from "@/components/leaderboard/Leaderboard"
import { SecondRoundInterviewDashboard } from "@/components/interview/SecondRoundInterviewDashboard"
import { VocabularyPracticeHub } from "@/components/interview/VocabularyPracticeHub"

type ActiveMenu = 'bai-hoc' | 'luyen-tap' | 'thi-thu' | 'ai-chat' | 'kiem-tra' | 'phong-van' | 'tu-vung-vong-2' | 'bang-xep-hang'
type InterviewMenuTab =
    | 'phong-van-tong-quan'
    | 'phong-van-luyen-tap'
    | 'phong-van-thi-thu'
    | 'phong-van-cung-co'
    | 'phong-van-bao-cao'
type ExamMenuTab = 'thi-thu-de-thi' | 'thi-thu-bang-xep-hang'
type ActiveTab = ActiveMenu | InterviewMenuTab | ExamMenuTab

const examMenuItems = [
    { key: 'thi-thu', label: 'Tổng quan kỳ thi', Icon: LayoutDashboard },
    { key: 'thi-thu-de-thi', label: 'Danh sách đề thi', Icon: FileText },
    { key: 'thi-thu-bang-xep-hang', label: 'Bảng xếp hạng', Icon: Trophy },
] as const satisfies ReadonlyArray<{
    key: 'thi-thu' | ExamMenuTab
    label: string
    Icon: typeof FileText
}>

const interviewMenuItems = [
    { key: 'phong-van-tong-quan', label: 'Tổng quan', Icon: LayoutDashboard },
    { key: 'phong-van-luyen-tap', label: 'Luyện tập', Icon: Target },
    { key: 'phong-van-thi-thu', label: 'Thi thử', Icon: Award },
    { key: 'phong-van-cung-co', label: 'Củng cố', Icon: RotateCcw },
    { key: 'phong-van-bao-cao', label: 'Báo cáo', Icon: BarChart3 },
] as const satisfies ReadonlyArray<{
    key: InterviewMenuTab
    label: string
    Icon: typeof Target
}>

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

type DashboardStats = {
    examsTaken: number
    avgScore: number
    streak: number
    vocabLearned: number
}

type LeaderboardEntry = {
    rank: number
    name: string
    score: number
    time: string
    avatar: string
}

type CurrentUserRank = {
    rank: number | string
    score: number
    time: string
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
        label: 'Thi Thử EPS-TOPIK',
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
    const [activeMenu, setActiveMenu] = useState<ActiveTab | null>(null)
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
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [currentUserRank, setCurrentUserRank] = useState<CurrentUserRank | null>(null)
    const [isPhongVanMenuOpen, setIsPhongVanMenuOpen] = useState(false)
    const [isExamMenuOpen, setIsExamMenuOpen] = useState(false)

    useEffect(() => {
        if (!isMobileMenuOpen) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsMobileMenuOpen(false)
        }
        window.addEventListener('keydown', handleEscape)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleEscape)
        }
    }, [isMobileMenuOpen])

    useEffect(() => {
        if (activeMenu?.startsWith('thi-thu')) setIsExamMenuOpen(true)
        if (activeMenu?.startsWith('phong-van')) setIsPhongVanMenuOpen(true)
    }, [activeMenu])

    const enabledMenuItems = useMemo(
        () => enabledMenuSettings
            .filter((item) => item.is_enabled && item.key in learnerMenuMeta && item.key !== 'tu-vung-vong-2' && item.key !== 'bang-xep-hang')
            .map((item) => ({ ...item, ...learnerMenuMeta[item.key] })),
        [enabledMenuSettings]
    )

    const activeMenuItem = useMemo(() => {
        if (!activeMenu) return null
        const lookupKey = activeMenu.startsWith('phong-van')
            ? 'phong-van'
            : activeMenu.startsWith('thi-thu')
                ? 'thi-thu'
                : activeMenu
        return enabledMenuItems.find((item) => item.key === lookupKey) || null
    }, [activeMenu, enabledMenuItems])

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (!user) {
                window.location.replace('/login?next=/dashboard')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile) setRole(profile.role)

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
        if (activeMenu) {
            const lookupKey = activeMenu.startsWith('phong-van')
                ? 'phong-van'
                : activeMenu.startsWith('thi-thu')
                    ? 'thi-thu'
                    : activeMenu
            if (!enabledMenuItems.some((item) => item.key === lookupKey)) {
                setActiveMenu(null)
            }
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
                const { data } = await supabase.from('profiles').select('date_of_birth').eq('id', user?.id).single()
                setCheckingAccess(null)

                if (data?.date_of_birth) {
                    setProfileDob(data.date_of_birth)
                    setActiveMenu('thi-thu-de-thi')
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
                    setActiveMenu('thi-thu-de-thi')
                    setSelectedOfficialExam(examAwaitingDob)
                    setExamAwaitingDob(null)
                }
            } else {
                throw new Error(data.error)
            }
        } catch (error: unknown) {
            alert("Có lỗi xảy ra khi lưu ngày sinh. Vui lòng thử lại: " + (error instanceof Error ? error.message : 'Lỗi không xác định'))
        } finally {
            setIsSavingDob(false)
        }
    }

    const renderMenuButton = (item: (typeof enabledMenuItems)[number], onClick?: () => void) => {
        const Icon = item.Icon

        if (item.key === 'thi-thu') {
            const isOpen = isExamMenuOpen
            const isActive = activeMenu?.startsWith('thi-thu')
            return (
                <div className="w-full space-y-1" key={item.key}>
                    <Button
                        aria-expanded={isOpen}
                        className={`relative w-full overflow-hidden rounded-xl border-0 ${isActive ? 'bg-white/15 font-medium text-white hover:bg-white/20' : 'font-medium text-white/80 hover:bg-white/10 hover:text-white'}`}
                        onClick={() => {
                            setIsExamMenuOpen((current) => !current)
                            if (!isActive) setActiveMenu('thi-thu')
                        }}
                        variant="ghost"
                    >
                        <span className="flex min-w-0 flex-1 items-center">
                            <Icon aria-hidden="true" className="mr-3 size-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </span>
                        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
                    </Button>
                    {isOpen ? (
                        <div className="ml-5 space-y-1 border-l border-white/10 pl-6 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none">
                            {examMenuItems.map((subItem) => {
                                const SubIcon = subItem.Icon
                                return (
                                    <button
                                        aria-current={activeMenu === subItem.key ? 'page' : undefined}
                                        className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${activeMenu === subItem.key ? 'bg-white/15 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                        key={subItem.key}
                                        onClick={() => {
                                            setActiveMenu(subItem.key)
                                            onClick?.()
                                        }}
                                        type="button"
                                    >
                                        <SubIcon aria-hidden="true" className="size-3.5" />
                                        {subItem.label}
                                    </button>
                                )
                            })}
                        </div>
                    ) : null}
                </div>
            )
        }
        
        if (item.key === 'phong-van') {
            const isOpen = isPhongVanMenuOpen
            const isActive = activeMenu?.startsWith('phong-van')
            return (
                <div className="space-y-1 w-full" key={item.key}>
                    <Button
                        variant="ghost"
                        className={`w-full justify-between border-0 rounded-xl relative overflow-hidden ${
                            isActive
                                ? 'bg-white/15 text-white hover:bg-white/20 font-medium'
                                : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
                        }`}
                        onClick={() => {
                            setIsPhongVanMenuOpen((current) => !current)
                            if (!isActive) {
                                setActiveMenu('phong-van-tong-quan')
                            }
                        }}
                    >
                        <span className="flex items-center">
                            <Icon className="w-4 h-4 mr-3" />
                            {item.label}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </Button>
                    {isOpen && (
                        <div className="pl-6 space-y-1 border-l border-white/10 ml-5 animate-in fade-in slide-in-from-top-1 duration-250">
                            {interviewMenuItems.map((subItem) => {
                                const SubIcon = subItem.Icon
                                return (
                                    <button
                                        aria-current={activeMenu === subItem.key ? 'page' : undefined}
                                        className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                                            activeMenu === subItem.key
                                                ? 'bg-white/15 text-white shadow-sm'
                                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                                        }`}
                                        key={subItem.key}
                                        onClick={() => {
                                            setActiveMenu(subItem.key)
                                            onClick?.()
                                        }}
                                        type="button"
                                    >
                                        <SubIcon aria-hidden="true" className="h-3.5 w-3.5" />
                                        {subItem.label}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            )
        }

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
        const isInterview = item.key === 'phong-van'
        const shortDescription = isInterview
            ? 'Luyện 7 phần phỏng vấn thực tế.'
            : 'Luyện đề sát cấu trúc thi thật.'

        return (
            <Card
                key={item.key}
                className={`group relative min-h-44 overflow-hidden border-0 p-0 shadow-lg transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none sm:min-h-52 ${isInterview ? 'bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 text-white' : 'bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-white'}`}
            >
                <div aria-hidden="true" className="absolute -right-12 -top-16 size-44 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125 motion-reduce:transform-none" />
                <div aria-hidden="true" className="absolute -bottom-16 right-16 size-32 rounded-full bg-white/10 blur-xl" />
                <Icon aria-hidden="true" className="absolute -right-3 top-9 size-24 rotate-6 text-white/[0.08] transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-110 motion-reduce:transform-none" />
                <CardHeader className="relative px-5 pb-1 pt-4 sm:p-6 sm:pb-2">
                    <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="relative flex size-10 items-center justify-center rounded-xl border border-white/25 bg-white/15 shadow-inner backdrop-blur-sm sm:size-12 sm:rounded-2xl">
                            <Icon aria-hidden="true" className="size-5 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transform-none sm:size-6" />
                            <Sparkles aria-hidden="true" className="absolute -right-1.5 -top-1.5 size-3.5 animate-pulse text-amber-300 motion-reduce:animate-none" />
                        </div>
                        <Badge className="border border-white/20 bg-white/15 px-2 py-0.5 text-[10px] text-white hover:bg-white/15 sm:text-xs">
                            {isInterview ? '7 phần' : 'Thi thật'}
                        </Badge>
                    </div>
                    <CardTitle className="text-lg font-black tracking-tight text-white sm:text-2xl">{item.label}</CardTitle>
                    <CardDescription className="text-sm leading-5 text-white/80 sm:min-h-11 sm:leading-6">{shortDescription}</CardDescription>
                </CardHeader>
                <CardContent className="relative mt-auto px-5 pb-4 pt-1 sm:px-6 sm:pb-5 sm:pt-0">
                    <Button
                        className="min-h-10 w-full rounded-xl bg-white font-black text-blue-700 shadow-md hover:bg-blue-50 sm:min-h-11"
                        onClick={() => setActiveMenu(item.key)}
                    >
                        {item.buttonText}
                        <ChevronDown aria-hidden="true" className="size-4 -rotate-90" />
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
                    <button aria-label="Về dashboard tổng quan" className="relative h-16 w-52 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" onClick={() => setActiveMenu(null)} type="button">
                        <Image src="/logo.png" alt="" fill className="object-contain" priority unoptimized={true} />
                    </button>
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
                            aria-controls="mobile-navigation"
                            aria-expanded={isMobileMenuOpen}
                            aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
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

                        <button aria-label="Về dashboard tổng quan" className="relative mr-1 h-8 w-32 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden" onClick={() => { setActiveMenu(null); setIsMobileMenuOpen(false) }} type="button">
                            <Image src="/logomobile.png" alt="Korea Link" fill sizes="128px" className="object-contain" priority />
                        </button>

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

                {/* Mobile off-canvas menu */}
                <button
                    aria-label="Đóng menu"
                    className={`fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
                        isMobileMenuOpen
                            ? 'pointer-events-auto opacity-100'
                            : 'pointer-events-none opacity-0'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    tabIndex={isMobileMenuOpen ? 0 : -1}
                    type="button"
                />
                <aside
                    aria-hidden={!isMobileMenuOpen}
                    aria-label="Menu điều hướng"
                    id="mobile-navigation"
                    inert={!isMobileMenuOpen}
                    className={`fixed inset-y-0 left-0 z-[60] flex w-[min(84vw,320px)] flex-col overscroll-contain bg-[#2B64CE] text-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
                        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 bg-white px-4">
                        <button aria-label="Về dashboard tổng quan" className="relative h-9 w-32 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => { setActiveMenu(null); setIsMobileMenuOpen(false) }} type="button">
                            <Image
                                src="/logomobile.png"
                                alt="Korea Link"
                                fill
                                sizes="128px"
                                className="object-contain"
                                priority
                            />
                        </button>
                        <button
                            aria-label="Đóng menu"
                            className="flex size-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            onClick={() => setIsMobileMenuOpen(false)}
                            type="button"
                        >
                            <X aria-hidden="true" className="size-7" />
                        </button>
                    </div>

                    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
                        {enabledMenuItems
                            .filter(item => item.key !== 'bang-xep-hang')
                            .map((item) => renderMenuButton(item, () => setIsMobileMenuOpen(false)))}

                        <div className="mt-auto pt-5">
                            {enabledMenuItems
                                .filter(item => item.key === 'bang-xep-hang')
                                .map((item) => renderMenuButton(item, () => setIsMobileMenuOpen(false)))}
                        </div>
                    </nav>

                    <div className="shrink-0 border-t border-white/10 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                        <a
                            href="tel:0965577882"
                            className="flex min-h-12 items-center justify-between rounded-xl border border-white/30 px-3 py-2.5 text-white/95 transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                            <span className="flex items-center gap-2 text-sm font-semibold">
                                <Phone aria-hidden="true" className="size-4" />
                                Hotline hỗ trợ
                            </span>
                            <span className="text-sm font-bold tabular-nums">0965577882</span>
                        </a>
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#f4f6f8]">
                    <div className="max-w-6xl mx-auto space-y-6">

                        {/* Default view - no menu selected */}
                        {!activeMenu && (
                            <div className="space-y-4 pb-8 sm:space-y-6">
                                <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-violet-50 px-5 py-5 shadow-sm sm:px-7 sm:py-7 lg:px-9">
                                    <div aria-hidden="true" className="absolute -right-20 -top-28 size-72 rounded-full bg-gradient-to-br from-blue-200/70 to-violet-200/70 blur-2xl" />
                                    <div aria-hidden="true" className="absolute right-5 top-5 hidden size-14 items-center justify-center rounded-2xl border border-white/70 bg-white/50 text-blue-600 shadow-sm backdrop-blur-sm sm:flex">
                                        <Sparkles className="size-7 animate-pulse motion-reduce:animate-none" />
                                    </div>
                                    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                        <div className="max-w-2xl">
                                            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 shadow-sm">
                                                <Target aria-hidden="true" className="size-3.5" /> Lộ trình hôm nay
                                            </div>
                                            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">Chào mừng trở lại! <span aria-hidden="true">👋</span></h1>
                                            <p className="mt-1.5 max-w-xl text-sm leading-5 text-slate-600 sm:text-base sm:leading-6">Chọn lộ trình bạn muốn tiếp tục.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 sm:flex">
                                            <div className="rounded-xl border border-slate-200 bg-white/85 px-3 py-2.5 shadow-sm backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                                                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Đã thi</span>
                                                <strong className="block text-base font-black tabular-nums text-slate-950 sm:text-lg">{dashboardStats?.examsTaken || 0} lượt</strong>
                                            </div>
                                            <div className="rounded-xl border border-orange-100 bg-orange-50/90 px-3 py-2.5 shadow-sm sm:rounded-2xl sm:px-4 sm:py-3">
                                                <span className="block text-[10px] font-bold uppercase tracking-wide text-orange-700">Chuỗi học</span>
                                                <strong className="block text-base font-black tabular-nums text-orange-600 sm:text-lg">{dashboardStats?.streak || 0} ngày 🔥</strong>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section aria-labelledby="learning-path-heading">
                                    <div className="mb-2 flex items-end justify-between gap-3 sm:mb-3">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-950 sm:text-2xl" id="learning-path-heading">Chọn lộ trình</h2>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                                        {enabledMenuItems.map((item) => renderOverviewCard(item))}
                                    </div>
                                </section>

                                <section aria-labelledby="progress-heading" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                    <div className="mb-4 flex items-center gap-2">
                                        <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Target aria-hidden="true" className="size-5" /></div>
                                        <div><h2 className="font-black text-slate-950" id="progress-heading">Tiến độ của bạn</h2><p className="text-xs text-slate-500">Tổng hợp hoạt động học gần đây</p></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
                                        {[
                                            ['Lượt thi', `${dashboardStats?.examsTaken || 0} đề`, FileText, 'bg-blue-50 text-blue-700'],
                                            ['Điểm trung bình', `${dashboardStats?.avgScore || 0}/200`, Target, 'bg-emerald-50 text-emerald-700'],
                                            ['Từ vựng đã thuộc', `${dashboardStats?.vocabLearned || 0} từ`, BookOpen, 'bg-violet-50 text-violet-700'],
                                            ['Chuỗi ngày học', `${dashboardStats?.streak || 0} ngày`, Award, 'bg-orange-50 text-orange-700'],
                                        ].map(([label, value, Icon, iconClass]) => (
                                            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4" key={String(label)}>
                                                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${String(iconClass)}`}><Icon aria-hidden="true" className="size-5" /></div>
                                                <div className="min-w-0"><span className="block truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">{String(label)}</span><strong className="block truncate text-lg font-black tabular-nums text-slate-950">{String(value)}</strong></div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* BÀI HỌC */}
                        {activeMenu === 'bai-hoc' && activeMenuItem && <LessonList />}

                        {/* LUYỆN TẬP */}
                        {activeMenu === 'luyen-tap' && activeMenuItem && <PracticeHub />}

                        {/* TỔNG QUAN THI THỬ EPS-TOPIK */}
                        {activeMenu === 'thi-thu' && activeMenuItem && (
                            <div className="mx-auto w-full max-w-6xl space-y-4 pb-8 sm:space-y-5">
                                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-4 text-white shadow-xl shadow-blue-900/15 sm:p-6 lg:p-7">
                                    <div aria-hidden="true" className="absolute -right-20 -top-24 size-64 rounded-full bg-white/10 blur-2xl transition-transform duration-700 hover:scale-110 motion-reduce:transform-none" />
                                    <div aria-hidden="true" className="absolute -bottom-24 left-1/3 size-52 rounded-full bg-fuchsia-400/20 blur-3xl" />
                                    <Award aria-hidden="true" className="absolute -right-3 top-12 size-28 rotate-12 text-white/[0.07] animate-pulse motion-reduce:animate-none sm:right-8 sm:size-36" />
                                    <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                                        <div className="max-w-2xl">
                                            <Badge className="border border-white/20 bg-white/15 text-white hover:bg-white/15">
                                                <Award aria-hidden="true" className="size-3.5 text-amber-300" /> Kỳ thi EPS-TOPIK
                                            </Badge>
                                            <h1 className="mt-3 text-balance text-xl font-black tracking-tight sm:text-3xl">Sẵn sàng cho kỳ thi</h1>
                                            <p className="mt-1.5 text-xs leading-5 text-blue-100 sm:text-base sm:leading-6">Luyện đề chuẩn, theo dõi kết quả và xếp hạng.</p>
                                            <div className="mt-4 grid max-w-xl grid-cols-3 gap-2 sm:gap-3">
                                                {[
                                                    [String(exams.length), 'Đề đang mở'],
                                                    [String(dashboardStats?.examsTaken || 0), 'Lượt đã thi'],
                                                    [`${dashboardStats?.avgScore || 0}%`, 'Điểm trung bình'],
                                                ].map(([value, label]) => (
                                                    <div className="rounded-xl border border-white/15 bg-white/10 px-1.5 py-2 text-center backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3" key={label}>
                                                        <strong className="block text-lg font-black tabular-nums sm:text-2xl">{value}</strong>
                                                        <span className="mt-0.5 block truncate text-[9px] font-semibold text-blue-100 sm:text-xs">{label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <Button className="min-h-11 w-full rounded-xl bg-white px-6 font-black text-blue-700 shadow-lg transition-transform hover:scale-[1.02] hover:bg-blue-50 motion-reduce:transform-none lg:w-auto" onClick={() => setActiveMenu('thi-thu-de-thi')}>
                                            Xem đề thi <ChevronDown aria-hidden="true" className="size-4 -rotate-90" />
                                        </Button>
                                    </div>
                                </section>

                                <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                                    <Card className="group relative overflow-hidden border-blue-200 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50/60 p-0 shadow-lg shadow-blue-100/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transform-none">
                                        <div aria-hidden="true" className="absolute -right-10 top-10 size-28 rounded-full bg-blue-200/30 blur-2xl transition-transform duration-700 group-hover:scale-125 motion-reduce:transform-none" />
                                        <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
                                        <div className="relative flex items-center justify-between border-b border-blue-100/80 px-4 py-3 sm:px-5">
                                            <div>
                                                <h2 className="flex items-center gap-1.5 font-black text-slate-950"><Sparkles aria-hidden="true" className="size-4 animate-pulse text-amber-500 motion-reduce:animate-none" /> Đề thi nổi bật</h2>
                                                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">Đề phù hợp nhất hiện tại</p>
                                            </div>
                                            <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><span className="mr-1 size-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />Đang mở</Badge>
                                        </div>
                                        {exams[0] ? (
                                            <div className="relative p-4 sm:p-5">
                                                <div className="flex items-start gap-3">
                                                    <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200"><FileText aria-hidden="true" className="size-5 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transform-none" /><Sparkles aria-hidden="true" className="absolute -right-1 -top-1 size-3 text-amber-300" /></div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-pretty font-black text-slate-950">{exams[0].title}</h3>
                                                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                                                            <span className="inline-flex items-center gap-1"><Clock aria-hidden="true" className="size-3.5 text-blue-600" />{exams[0].duration} phút</span>
                                                            <span className="inline-flex items-center gap-1"><ClipboardCheck aria-hidden="true" className="size-3.5 text-blue-600" />{exams[0].total_questions} câu</span>
                                                            <span>{exams[0].remaining_free_attempts ?? exams[0].free_attempts ?? 0} lượt miễn phí</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button className="mt-3 min-h-11 w-full rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 font-bold shadow-md shadow-blue-200 transition-transform hover:scale-[1.01] hover:from-blue-800 hover:to-indigo-700 motion-reduce:transform-none" disabled={checkingAccess === exams[0].id} onClick={() => handleStartExam(exams[0].id, exams[0].is_official)}>
                                                    <PlayCircle aria-hidden="true" className="size-4" />
                                                    {checkingAccess === exams[0].id ? 'Đang kiểm tra…' : 'Vào thi ngay'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="p-5 text-sm text-slate-500">Hệ thống đang cập nhật đề thi.</p>
                                        )}
                                    </Card>

                                    <Card className="border-slate-200 p-4 shadow-sm sm:p-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2"><Trophy aria-hidden="true" className="size-5 text-amber-500" /><h2 className="font-black text-slate-950">Xếp hạng</h2></div>
                                            <button className="text-xs font-bold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => setActiveMenu('thi-thu-bang-xep-hang')} type="button">Xem tất cả</button>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {leaderboard.slice(0, 3).map((entry) => (
                                                <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2" key={entry.rank}>
                                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-blue-700 shadow-sm">{entry.rank}</span>
                                                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{entry.name}</span>
                                                    <strong className="text-xs tabular-nums text-blue-700">{entry.score}đ</strong>
                                                </div>
                                            ))}
                                            {leaderboard.length === 0 ? <p className="py-4 text-center text-xs text-slate-500">Chưa có dữ liệu xếp hạng.</p> : null}
                                        </div>
                                    </Card>
                                </div>

                                <Card className="border-slate-200 p-4 shadow-sm sm:p-5">
                                    <h2 className="font-black text-slate-950">Quy trình dự thi</h2>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                        {[
                                            ['1', 'Chọn đề', 'Xem cấu trúc, thời lượng và số lượt thi.'],
                                            ['2', 'Xác nhận', 'Kiểm tra thông tin thí sinh trước khi bắt đầu.'],
                                            ['3', 'Làm bài', 'Hoàn thành đúng thời gian và xem kết quả.'],
                                        ].map(([step, title, description]) => (
                                            <div className="flex gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100" key={step}>
                                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">{step}</span>
                                                <div><h3 className="text-sm font-black text-slate-900">{title}</h3><p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* DANH SÁCH ĐỀ THI */}
                        {activeMenu === 'thi-thu-de-thi' && activeMenuItem && (
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
                                                            <Image unoptimized width={128} height={128} src={user.user_metadata.avatar_url} alt="Ảnh đại diện thí sinh" className="h-full w-full object-cover" />
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
                                                <p>Nếu thông tin trên không chính xác, vui lòng báo cáo ngay cho giám thị phòng thi. Không nhấn &ldquo;Tiếp tục&rdquo; nếu sai thông tin.</p>
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
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><FileText aria-hidden="true" className="size-5" /></div>
                                                <div>
                                                    <h1 className="text-lg font-black text-slate-950">Danh sách đề thi</h1>
                                                    <p className="mt-0.5 text-xs text-slate-500">Chọn đề phù hợp để bắt đầu kiểm tra.</p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary">{exams.length} đề đang mở</Badge>
                                        </div>

                                        {exams.length === 0 ? (
                                            <div className="border rounded-md p-8 text-center text-muted-foreground bg-muted/10">
                                                Hệ thống đang cập nhật đề thi. Vui lòng quay lại sau!
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                {exams.map((exam) => (
                                                    <Card key={exam.id} className="group flex flex-col border-slate-200 shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md motion-reduce:transform-none">
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
                        {activeMenu?.startsWith('phong-van') && activeMenuItem && (
                            <SecondRoundInterviewDashboard
                                key={activeMenu}
                                onBackToDashboard={() => setActiveMenu(null)} 
                                onViewChange={(nextView) => {
                                    const menuByView = {
                                        overview: 'phong-van-tong-quan',
                                        practice: 'phong-van-luyen-tap',
                                        exam: 'phong-van-thi-thu',
                                        review: 'phong-van-cung-co',
                                        report: 'phong-van-bao-cao',
                                    } as const
                                    setActiveMenu(menuByView[nextView])
                                }}
                                initialView={
                                    activeMenu === 'phong-van-luyen-tap'
                                        ? 'practice'
                                        : activeMenu === 'phong-van-thi-thu'
                                            ? 'exam'
                                            : activeMenu === 'phong-van-cung-co'
                                                ? 'review'
                                                : activeMenu === 'phong-van-bao-cao'
                                                    ? 'report'
                                                    : 'overview'
                                }
                            />
                        )}

                        {/* TỪ VỰNG VÒNG 2 */}
                        {activeMenu === 'tu-vung-vong-2' && activeMenuItem && (
                            <VocabularyPracticeHub onBackToDashboard={() => setActiveMenu(null)} />
                        )}
                        {/* BẢNG XẾP HẠNG EPS-TOPIK */}
                        {activeMenu === 'thi-thu-bang-xep-hang' && activeMenuItem && (
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
