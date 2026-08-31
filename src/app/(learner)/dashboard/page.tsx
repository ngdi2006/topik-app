"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/shared/UserNav"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, PlayCircle, BookOpen, Target, FileText, Bot, ClipboardCheck, Coins, ShoppingCart, Phone, X, Factory, Sparkles, Mic, ArrowLeft, User, Trophy, ChevronDown, Award, LayoutDashboard, RotateCcw, BarChart3, ListChecks } from "lucide-react"

const LessonList = dynamic(() => import("@/components/lessons/LessonList").then((module) => module.LessonList))
const PracticeHub = dynamic(() => import("@/components/practice/PracticeHub").then((module) => module.PracticeHub))
const PaymentModal = dynamic(() => import("@/components/payment/PaymentModal").then((module) => module.PaymentModal))
const Leaderboard = dynamic(() => import("@/components/leaderboard/Leaderboard").then((module) => module.Leaderboard))
const SecondRoundInterviewDashboard = dynamic(
    () => import("@/components/interview/SecondRoundInterviewDashboard").then((module) => module.SecondRoundInterviewDashboard),
    { loading: () => <DashboardSectionLoader /> },
)
const VocabularyPracticeHub = dynamic(
    () => import("@/components/interview/VocabularyPracticeHub").then((module) => module.VocabularyPracticeHub),
    { loading: () => <DashboardSectionLoader /> },
)

function DashboardSectionLoader() {
    return (
        <div className="flex min-h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white">
            <div className="size-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 motion-reduce:animate-none" />
            <span className="sr-only">Đang mở nội dung…</span>
        </div>
    )
}

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

type DashboardCache = {
    exams: Exam[]
    menuSettings: LearnerMenuSetting[]
    stats: DashboardStats | null
    leaderboard: LeaderboardEntry[]
    currentUserRank: CurrentUserRank | null
    credits: number
    updatedAt: number
}

// Preserve the last successful paint while navigating within the learner app.
// The page still revalidates these values in the background after mounting.
let dashboardCache: DashboardCache | null = null

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
    const cachedDashboard = dashboardCache
    const [exams, setExams] = useState<Exam[]>(() => cachedDashboard?.exams || [])
    const [enabledMenuSettings, setEnabledMenuSettings] = useState<LearnerMenuSetting[]>(() => cachedDashboard?.menuSettings || fallbackMenuSettings)
    const [isLocalLoading, setIsLocalLoading] = useState(() => !cachedDashboard)
    const [activeMenu, setActiveMenu] = useState<ActiveTab | null>(null)
    const [userCredits, setUserCredits] = useState<number>(() => cachedDashboard?.credits || 0)
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
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(() => cachedDashboard?.stats || null)
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => cachedDashboard?.leaderboard || [])
    const [currentUserRank, setCurrentUserRank] = useState<CurrentUserRank | null>(() => cachedDashboard?.currentUserRank || null)
    const [isPhongVanMenuOpen, setIsPhongVanMenuOpen] = useState(false)
    const [isExamMenuOpen, setIsExamMenuOpen] = useState(false)
    const [hasInterviewMobileBack, setHasInterviewMobileBack] = useState(false)

    useEffect(() => {
        const requestedSection = new URLSearchParams(window.location.search).get('section') as ActiveTab | null
        const validSections: ActiveTab[] = [
            'bai-hoc', 'luyen-tap', 'thi-thu', 'ai-chat', 'kiem-tra', 'phong-van',
            'tu-vung-vong-2', 'bang-xep-hang', 'thi-thu-de-thi', 'thi-thu-bang-xep-hang',
            'phong-van-tong-quan', 'phong-van-luyen-tap', 'phong-van-thi-thu',
            'phong-van-cung-co', 'phong-van-bao-cao',
        ]
        if (requestedSection && validSections.includes(requestedSection)) setActiveMenu(requestedSection)
    }, [])

    const handleInterviewMobileBackChange = useCallback((handler: (() => void) | null) => {
        setHasInterviewMobileBack(Boolean(handler))
    }, [])

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

    const isInterviewSection = Boolean(activeMenu?.startsWith('phong-van'))

    useEffect(() => {
        if (isInterviewSection) return
        setHasInterviewMobileBack(false)
    }, [isInterviewSection])

    const hasDashboardActivity = Boolean(
        dashboardStats && (
            dashboardStats.examsTaken > 0 ||
            dashboardStats.avgScore > 0 ||
            dashboardStats.vocabLearned > 0 ||
            dashboardStats.streak > 0
        ),
    )
    const overallProgress = Math.min(100, Math.max(0, Math.round((dashboardStats?.avgScore || 0) / 2)))
    const weeklyGoalDays = Math.min(7, Math.max(0, dashboardStats?.streak || 0))

    useEffect(() => {
        let active = true

        const fetchUserData = async () => {
            const currentUser = useUserStore.getState().user || (await supabase.auth.getUser()).data.user
            if (!active) return
            setUser(currentUser)

            if (!currentUser) {
                window.location.replace('/login?next=/dashboard')
                return
            }

            const profilePromise = supabase
                .from('profiles')
                .select('role')
                .eq('id', currentUser.id)
                .single()

            try {
                const [{ data: profile }, examsRes, menuRes, statsRes] = await Promise.all([
                    profilePromise,
                    fetch('/api/exams'),
                    fetch('/api/learner/dashboard-menu'),
                    fetch('/api/learner/dashboard-stats'),
                ])
                if (!active) return

                let nextExams = dashboardCache?.exams || []
                let nextMenuSettings = dashboardCache?.menuSettings || fallbackMenuSettings
                let nextStats = dashboardCache?.stats || null
                let nextLeaderboard = dashboardCache?.leaderboard || []
                let nextCurrentUserRank = dashboardCache?.currentUserRank || null

                if (profile) setRole(profile.role)

                if (examsRes.ok) {
                    const latestExams = await examsRes.json()
                    nextExams = latestExams
                    setExams(latestExams)
                }

                if (menuRes.ok) {
                    const menuItems = await menuRes.json()
                    if (Array.isArray(menuItems) && menuItems.length > 0) {
                        nextMenuSettings = menuItems
                        setEnabledMenuSettings(menuItems)
                    }
                }

                if (statsRes.ok) {
                    const statsData = await statsRes.json()
                    if (statsData.success) {
                        nextStats = statsData.data.stats
                        nextLeaderboard = statsData.data.leaderboard
                        nextCurrentUserRank = statsData.data.currentUser
                        setDashboardStats(statsData.data.stats)
                        setLeaderboard(statsData.data.leaderboard)
                        setCurrentUserRank(statsData.data.currentUser)
                    }
                }

                if (!active) return
                dashboardCache = {
                    exams: nextExams,
                    menuSettings: nextMenuSettings,
                    stats: nextStats,
                    leaderboard: nextLeaderboard,
                    currentUserRank: nextCurrentUserRank,
                    credits: dashboardCache?.credits || 0,
                    updatedAt: Date.now(),
                }
            } catch (error) {
                console.error("Lỗi lấy dữ liệu dashboard:", error)
                if (!dashboardCache) setEnabledMenuSettings(fallbackMenuSettings)
            }

            if (active) {
                setIsLoading(false)
                setIsLocalLoading(false)
            }
        }

        void fetchUserData()
        return () => { active = false }
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
                const credits = data.remaining_credits ?? 0
                setUserCredits(credits)
                if (dashboardCache) dashboardCache = { ...dashboardCache, credits }
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
        const isDrawer = Boolean(onClick)

        if (item.key === 'thi-thu') {
            const isOpen = isExamMenuOpen
            const isActive = activeMenu?.startsWith('thi-thu')
            return (
                <div className="w-full space-y-1" key={item.key}>
                    <Button
                        aria-expanded={isOpen}
                        className={`relative w-full overflow-hidden border-0 ${isDrawer ? (isActive ? 'h-10 rounded-xl bg-blue-50 text-[13px] font-bold text-blue-700 shadow-sm hover:bg-blue-100' : 'h-10 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-700') : (isActive ? 'rounded-xl bg-white/15 font-medium text-white hover:bg-white/20' : 'rounded-xl font-medium text-white/80 hover:bg-white/10 hover:text-white')}`}
                        onClick={() => {
                            setIsExamMenuOpen((current) => !current)
                            if (!isActive) setActiveMenu('thi-thu')
                        }}
                        variant="ghost"
                    >
                        <span className="flex min-w-0 flex-1 items-center">
                            <span className={isDrawer ? 'mr-2.5 grid size-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-200' : 'mr-3'}><Icon aria-hidden="true" className="size-3.5 shrink-0" /></span>
                            <span className="truncate">{item.label}</span>
                        </span>
                        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
                    </Button>
                    {isOpen ? (
                        <div className={`ml-6 space-y-0.5 border-l pl-4 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none ${isDrawer ? 'border-blue-200' : 'border-white/10'}`}>
                            {examMenuItems.map((subItem) => {
                                const SubIcon = subItem.Icon
                                return (
                                    <button
                                        aria-current={activeMenu === subItem.key ? 'page' : undefined}
                                        className={`flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${isDrawer ? (activeMenu === subItem.key ? 'bg-blue-50 text-blue-700 shadow-sm ring-blue-600' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-700 ring-blue-600') : (activeMenu === subItem.key ? 'bg-white/15 text-white shadow-sm ring-white' : 'text-white/70 hover:bg-white/10 hover:text-white ring-white')}`}
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
                        className={`relative w-full justify-between overflow-hidden border-0 ${isDrawer ? (isActive ? 'h-10 rounded-xl bg-violet-50 text-[13px] font-bold text-violet-700 shadow-sm hover:bg-violet-100' : 'h-10 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-violet-700') : (isActive ? 'rounded-xl bg-white/15 font-medium text-white hover:bg-white/20' : 'rounded-xl font-medium text-white/80 hover:bg-white/10 hover:text-white')}`}
                        onClick={() => {
                            setIsPhongVanMenuOpen((current) => !current)
                            if (!isActive) {
                                setActiveMenu('phong-van-tong-quan')
                            }
                        }}
                    >
                        <span className="flex min-w-0 flex-1 items-center">
                            <span className={isDrawer ? 'mr-2.5 grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-sm shadow-violet-200' : 'mr-3'}><Icon className="size-3.5" /></span>
                            <span className="truncate">{item.label}</span>
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </Button>
                    {isOpen && (
                        <div className={`ml-6 space-y-0.5 border-l pl-4 animate-in fade-in slide-in-from-top-1 duration-250 ${isDrawer ? 'border-violet-200' : 'border-white/10'}`}>
                            {interviewMenuItems.map((subItem) => {
                                const SubIcon = subItem.Icon
                                return (
                                    <button
                                        aria-current={activeMenu === subItem.key ? 'page' : undefined}
                                        className={`flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${isDrawer ? (activeMenu === subItem.key ? 'bg-violet-50 text-violet-700 shadow-sm ring-violet-600' : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700 ring-violet-600') : (activeMenu === subItem.key ? 'bg-white/15 text-white shadow-sm ring-white' : 'text-white/70 hover:bg-white/10 hover:text-white ring-white')}`}
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
            ? 'Luyện 8 phần phỏng vấn thực tế.'
            : 'Luyện đề sát cấu trúc thi thật.'
        const features = isInterview
            ? ['8 phần thi chuẩn', 'Gợi ý trả lời chi tiết', 'Thu âm & chấm điểm AI']
            : ['Câu hỏi bám sát đề thật', 'Mô phỏng cấu trúc thi', 'Phân tích kết quả chi tiết']
        const cardTone = isInterview
            ? {
                icon: 'bg-violet-50 text-violet-700 ring-violet-100',
                badge: 'border-violet-100 bg-violet-50 text-violet-700',
                button: 'bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-600',
                title: 'text-violet-700',
                check: 'bg-violet-100 text-violet-700',
                background: 'from-white via-violet-50/50 to-violet-100/60',
                image: '/dashboard/interview-learner-v2.webp',
            }
            : {
                icon: 'bg-blue-50 text-blue-700 ring-blue-100',
                badge: 'border-blue-100 bg-blue-50 text-blue-700',
                button: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
                title: 'text-blue-700',
                check: 'bg-blue-100 text-blue-700',
                background: 'from-white via-blue-50/50 to-blue-100/60',
                image: '/dashboard/exam-learner-v2.webp',
            }

        return (
            <Card
                key={item.key}
                className={`group relative min-h-[248px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br p-0 shadow-[0_10px_26px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_44px_rgba(15,23,42,0.11)] motion-reduce:transform-none sm:min-h-[310px] sm:rounded-3xl ${cardTone.background}`}
            >
                <div className="absolute inset-0 block sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[58%]">
                    <Image
                        alt=""
                        aria-hidden="true"
                        className="object-cover object-[66%_center] mix-blend-multiply sm:object-center"
                        fill
                        priority
                        sizes="(min-width: 1280px) 380px, (min-width: 640px) 55vw, 100vw"
                        src={cardTone.image}
                    />
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-white via-white/90 via-45% to-transparent sm:inset-y-0 sm:left-0 sm:right-auto sm:w-32 sm:bg-gradient-to-r sm:from-white sm:via-white/80 sm:to-transparent" />
                </div>
                <CardHeader className="relative z-10 max-w-[62%] px-4 pb-1 pt-3 sm:max-w-[54%] sm:px-6 sm:pb-2 sm:pt-6">
                    <div className="mb-2 flex items-center gap-2 sm:mb-3">
                        <div className={`flex size-7 items-center justify-center rounded-lg ring-1 sm:size-8 sm:rounded-xl ${cardTone.icon}`}>
                            <Icon aria-hidden="true" className="size-4" />
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.14em] ${cardTone.title}`}>Lộ trình luyện thi</span>
                    </div>
                    <CardTitle className={`text-lg font-black tracking-tight sm:text-2xl ${cardTone.title}`}>{item.label}</CardTitle>
                    <CardDescription className="mt-1 text-xs leading-4 text-slate-600 sm:text-sm sm:leading-5">{shortDescription}</CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 max-w-full px-4 pb-3 pt-1 sm:max-w-[54%] sm:px-6 sm:pb-6 sm:pt-2">
                    <ul className="mb-2.5 min-h-[62px] w-[58%] space-y-1 sm:mb-4 sm:min-h-0 sm:w-full sm:space-y-2">
                        {features.map((feature) => (
                            <li className="flex items-center gap-1.5 text-[10px] font-medium leading-4 text-slate-600 sm:gap-2 sm:text-xs" key={feature}>
                                <span aria-hidden="true" className={`grid size-3.5 shrink-0 place-items-center rounded-full text-[9px] font-black sm:size-4 sm:text-[10px] ${cardTone.check}`}>✓</span>
                                {feature}
                            </li>
                        ))}
                    </ul>
                    <Button
                        className={`min-h-9 w-full rounded-xl text-sm font-bold shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-10 ${cardTone.button}`}
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
        <div className="app-typography min-h-screen flex bg-[#f4f6f8]">
            {/* Sidebar (Desktop) */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden bg-gradient-to-b from-[#164dcc] via-[#315ed8] to-[#654fe5] text-white flex-col hidden md:flex h-screen sticky top-0 shrink-0 shadow-xl z-30 transition-[width] duration-300`}>
                <div className="h-[72px] flex items-center justify-center border-b border-white/10 shrink-0">
                    <button aria-label="Về dashboard tổng quan" className="relative h-16 w-52 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" onClick={() => setActiveMenu(null)} type="button">
                        <Image src="/logo.png" alt="" fill className="object-contain" priority unoptimized={true} />
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto px-3 pt-4 flex flex-col gap-1 w-64">
                    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100/70">Luyện thi</p>
                    <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/15" onClick={() => router.push('/textbooks')} type="button"><BookOpen className="size-5" />Giáo trình EPS-TOPIK</button>
                    {enabledMenuItems.filter(item => item.key !== 'bang-xep-hang').map((item) => renderMenuButton(item))}
                    
                    <div className="mt-auto mx-auto w-[204px] pb-4">
                        {enabledMenuItems.filter(item => item.key === 'bang-xep-hang').map((item) => renderMenuButton(item))}
                    </div>
                </nav>
                <div className="shrink-0 pb-4 w-64 flex flex-col items-center">
                    <div aria-hidden="true" className="relative -mb-2 h-44 w-[220px] overflow-hidden">
                        <div className="absolute inset-x-4 bottom-0 h-24 rounded-full bg-blue-400/20 blur-2xl" />
                        <Image
                            alt=""
                            className="object-contain object-bottom drop-shadow-[0_12px_18px_rgba(15,23,42,0.22)]"
                            fill
                            sizes="220px"
                            src="/dashboard/sidebar/sidebar-champion.webp"
                        />
                    </div>
                    <a
                        href="tel:0965577882"
                        className="relative flex w-[204px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-white shadow-lg shadow-blue-950/10 backdrop-blur-sm transition-[background-color,border-color] hover:border-white/50 hover:bg-white/15"
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
                <header className={`${isInterviewSection ? 'hidden md:flex' : 'flex'} h-[72px] border-b bg-white px-4 md:px-6 items-center justify-between sticky top-0 z-40 shrink-0`}>
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

                {isInterviewSection && !hasInterviewMobileBack ? (
                    <button
                        aria-controls="mobile-navigation"
                        aria-expanded={isMobileMenuOpen}
                        aria-label="Mở menu"
                        className="fixed left-3 top-3 z-40 grid size-10 place-items-center rounded-xl bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-200 backdrop-blur md:hidden"
                        onClick={() => setIsMobileMenuOpen(true)}
                        type="button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="size-6">
                            <line x1="3" x2="15" y1="6" y2="6" />
                            <line x1="3" x2="21" y1="12" y2="12" />
                            <line x1="3" x2="15" y1="18" y2="18" />
                        </svg>
                    </button>
                ) : null}

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
                    className={`fixed inset-y-0 left-0 z-[60] flex w-[min(90vw,360px)] flex-col overflow-hidden overscroll-contain rounded-tr-[30px] border-l-[6px] border-t-4 border-blue-600 bg-blue-600 text-slate-800 shadow-[20px_0_55px_rgba(15,36,80,0.26)] transition-transform duration-300 ease-out md:hidden ${
                        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <div className="relative z-10 flex min-h-[84px] shrink-0 items-center justify-between rounded-tl-[34px] rounded-tr-[26px] border-b border-slate-100 bg-white px-5 py-3">
                        <button aria-label="Về dashboard tổng quan" className="relative h-9 w-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => { setActiveMenu(null); setIsMobileMenuOpen(false) }} type="button">
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
                            className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            onClick={() => setIsMobileMenuOpen(false)}
                            type="button"
                        >
                            <X aria-hidden="true" className="size-5" />
                        </button>
                    </div>

                    <nav className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto bg-white px-4 py-4 [scrollbar-gutter:stable]">
                        <p className="relative px-3 pb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Học và luyện thi</p>
                        <button className="flex h-10 w-full items-center gap-2.5 rounded-xl bg-emerald-50 px-3 text-left text-[13px] font-bold text-emerald-700 shadow-sm" onClick={() => { setIsMobileMenuOpen(false); router.push('/textbooks') }} type="button"><span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white"><BookOpen className="size-3.5" /></span>Giáo trình EPS-TOPIK</button>
                        {enabledMenuItems
                            .filter(item => item.key !== 'bang-xep-hang')
                            .map((item) => renderMenuButton(item, () => setIsMobileMenuOpen(false)))}

                    </nav>

                    <div className="relative mt-auto shrink-0 space-y-2 border-t border-blue-100 bg-white p-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
                        <UserNav variant="drawer" onNavigate={() => setIsMobileMenuOpen(false)} />
                        <a
                            href="tel:0965577882"
                            className="mt-2.5 flex min-h-12 items-center justify-between rounded-xl border border-blue-100 bg-white px-3 py-1.5 text-slate-700 shadow-sm transition-[border-color,box-shadow] hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                            <span className="flex items-center gap-3 text-sm font-semibold">
                                <span className="grid size-7 place-items-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-200"><Phone aria-hidden="true" className="size-3" /></span>
                                <span><span className="block text-[9px] font-medium text-slate-500">Hotline hỗ trợ</span><strong className="block text-sm font-black tabular-nums text-blue-700">0965 577 882</strong></span>
                            </span>
                            <span className="grid size-7 place-items-center rounded-full bg-blue-50 text-blue-600"><Phone aria-hidden="true" className="size-3" /></span>
                        </a>
                        <div aria-hidden="true" className="relative -mx-2.5 -mb-[max(10px,env(safe-area-inset-bottom))] h-16 overflow-hidden">
                            <Sparkles className="absolute left-[45%] top-6 size-4 text-blue-300" />
                            <span className="absolute bottom-0 right-9 z-10 block size-16 drop-shadow-[0_8px_12px_rgba(37,99,235,0.22)]">
                                <Image alt="" className="object-contain" fill sizes="64px" src="/dashboard/mobile-menu/rocket-3d.webp" />
                            </span>
                            <svg className="absolute inset-x-0 bottom-0 h-20 w-full" preserveAspectRatio="none" viewBox="0 0 390 80">
                                <defs><linearGradient id="wave-back" x1="0" x2="390" y1="20" y2="70" gradientUnits="userSpaceOnUse"><stop stopColor="#dbeafe"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient><linearGradient id="wave-mid" x1="20" x2="370" y1="30" y2="76" gradientUnits="userSpaceOnUse"><stop stopColor="#93c5fd"/><stop offset="1" stopColor="#818cf8"/></linearGradient><linearGradient id="wave-front" x1="0" x2="390" y1="48" y2="78" gradientUnits="userSpaceOnUse"><stop stopColor="#2563eb"/><stop offset="1" stopColor="#4f46e5"/></linearGradient></defs>
                                <path d="M0 35C48 15 91 15 134 34C180 55 218 66 262 58C307 50 343 28 390 33V80H0Z" fill="url(#wave-back)" />
                                <path d="M0 47C47 27 91 29 136 48C181 67 220 74 263 66C308 58 346 39 390 43V80H0Z" fill="url(#wave-mid)" />
                                <path d="M0 59C45 41 91 42 137 59C183 76 224 81 267 73C311 65 350 50 390 53V80H0Z" fill="url(#wave-front)" />
                            </svg>
                        </div>
                    </div>
                </aside>

                {/* Content */}
                <main className={`flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,_#eef4ff_0,_#f6f8fb_32rem)] md:p-6 ${isInterviewSection ? 'px-3 pb-4 pt-2' : 'p-4'}`}>
                    <div className={`mx-auto max-w-7xl ${isInterviewSection ? 'space-y-3 md:space-y-6' : 'space-y-6'}`}>

                        {/* Default view - no menu selected */}
                        {!activeMenu && (
                            <div className="space-y-3 pb-8 sm:space-y-7">

                                <section aria-labelledby="learning-path-heading">
                                    <div className="mb-4 hidden flex-col gap-4 md:flex sm:mb-5 lg:flex-row lg:items-end lg:justify-between">
                                        <div className="min-w-0">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Trung tâm học tập</span>
                                            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 text-balance sm:text-3xl" id="learning-path-heading">Lộ trình học tập</h1>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">Chọn hình thức luyện tập phù hợp với mục tiêu của bạn.</p>
                                        </div>
                                    </div>
                                    <div className="mb-5 hidden gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                                        <div className="relative hidden min-h-28 overflow-hidden rounded-3xl bg-gradient-to-r from-[#102b78] via-[#17175b] to-[#24115f] p-5 text-white shadow-lg shadow-indigo-950/10 lg:flex lg:items-center">
                                            <div aria-hidden="true" className="absolute -bottom-16 right-10 size-44 rounded-full bg-violet-500/30 blur-2xl" />
                                            <div aria-hidden="true" className="absolute right-8 top-2 text-5xl">🚀</div>
                                            <div className="relative flex w-full items-center gap-4 pr-24">
                                                <div aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-2xl shadow-lg">🏅</div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black">Bạn đang tiến bộ rất tốt!</p>
                                                    <p className="mt-1 text-xs text-blue-100">Hãy tiếp tục duy trì phong độ nhé.</p>
                                                </div>
                                                <div className="w-56 shrink-0">
                                                    <div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-blue-100">Tiến độ tổng thể</span><strong className="tabular-nums">{overallProgress}%</strong></div>
                                                    <div className="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Tiến độ tổng thể" aria-valuemax={100} aria-valuemin={0} aria-valuenow={overallProgress}>
                                                        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-violet-400" style={{ width: `${overallProgress}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50 p-5 shadow-sm lg:flex lg:items-center lg:justify-between">
                                            <div><span className="text-[10px] font-bold uppercase tracking-wide text-violet-600">Đã thi</span><strong className="mt-1 block text-3xl font-black tabular-nums text-indigo-950">{dashboardStats?.examsTaken || 0}</strong><span className="text-xs text-slate-500">lượt</span></div>
                                            <div className="grid size-12 place-items-center rounded-full bg-white text-violet-600 shadow-sm"><FileText aria-hidden="true" className="size-6" /></div>
                                        </div>
                                        <div className="hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 shadow-sm lg:flex lg:items-center lg:justify-between">
                                            <div><span className="text-[10px] font-bold uppercase tracking-wide text-orange-600">Chuỗi học</span><strong className="mt-1 block text-3xl font-black tabular-nums text-orange-950">{dashboardStats?.streak || 0}</strong><span className="text-xs text-slate-500">ngày</span></div>
                                            <div className="grid size-12 place-items-center rounded-full bg-white text-orange-500 shadow-sm"><Award aria-hidden="true" className="size-6" /></div>
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
                                        <button
                                            className="group relative min-h-52 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6 text-left shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                            onClick={() => router.push('/textbooks')}
                                            type="button"
                                        >
                                            <div aria-hidden="true" className="absolute -right-12 -top-12 size-44 rounded-full bg-emerald-200/40 blur-2xl" />
                                            <div className="relative flex h-full flex-col">
                                                <div className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-200"><BookOpen className="size-5" /></div>
                                                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Module học tập mới</p>
                                                <h2 className="mt-1 text-xl font-black text-slate-950">Giáo trình EPS-TOPIK 2025</h2>
                                                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Đọc Quyển 1 và Quyển 2 theo trang, tra cứu nội dung và tiếp tục từ vị trí đã học.</p>
                                                <span className="mt-auto pt-5 text-sm font-black text-emerald-700">Mở thư viện →</span>
                                            </div>
                                        </button>
                                        {enabledMenuItems.map((item) => renderOverviewCard(item))}
                                    </div>
                                </section>

                                <section aria-labelledby="progress-heading" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                                    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-6 sm:pb-3 sm:pt-5">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm"><Target aria-hidden="true" className="size-5" /></div>
                                            <div className="min-w-0"><h2 className="text-lg font-black tracking-tight text-slate-950" id="progress-heading">Tiến độ của bạn</h2><p className="truncate text-xs text-slate-500">Tổng quan kết quả học gần đây</p></div>
                                        </div>
                                        {hasDashboardActivity ? (
                                            <div className="flex items-center gap-2">
                                                <span className="hidden rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 sm:inline-flex">Mục tiêu tuần: {weeklyGoalDays}/7 ngày</span>
                                                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Đang tiến bộ</span>
                                            </div>
                                        ) : null}
                                    </div>

                                    {hasDashboardActivity ? (
                                        <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-5 lg:grid-cols-4 lg:pt-3">
                                            {[
                                                ['Lượt thi', `${dashboardStats?.examsTaken || 0} đề`, FileText, 'bg-blue-50 text-blue-700'],
                                                ['Điểm trung bình', `${dashboardStats?.avgScore || 0}/200`, Target, 'bg-emerald-50 text-emerald-700'],
                                                ['Từ đã thuộc', `${dashboardStats?.vocabLearned || 0} từ`, BookOpen, 'bg-violet-50 text-violet-700'],
                                                ['Chuỗi học', `${dashboardStats?.streak || 0} ngày`, Award, 'bg-orange-50 text-orange-700'],
                                            ].map(([label, value, Icon, iconClass]) => (
                                                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4" key={String(label)}>
                                                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/[0.03] ${String(iconClass)}`}><Icon aria-hidden="true" className="size-4.5" /></div>
                                                    <div className="min-w-0"><span className="block truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">{String(label)}</span><strong className="mt-0.5 block truncate text-base font-black tabular-nums text-slate-950 sm:text-lg">{String(value)}</strong></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="relative overflow-hidden px-4 py-5 sm:px-5 sm:py-6">
                                            <div aria-hidden="true" className="absolute -right-10 -top-14 size-36 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 blur-2xl" />
                                            <div className="relative flex items-start gap-3">
                                                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-md shadow-blue-200">
                                                    <Sparkles aria-hidden="true" className="size-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-slate-950">Bắt đầu hành trình của bạn</h3>
                                                    <p className="mt-1 text-sm leading-5 text-slate-600">Chọn một lộ trình phía trên. Kết quả học và luyện thi sẽ tự động xuất hiện tại đây.</p>
                                                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">Lưu tiến độ</span>
                                                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">Theo dõi kết quả</span>
                                                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">Duy trì chuỗi học</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>

                                <section aria-labelledby="achievement-heading" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] sm:p-5">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div><h2 className="font-black text-slate-950" id="achievement-heading">Thành tích của bạn</h2><p className="mt-0.5 text-xs text-slate-500">Mở khóa huy hiệu bằng hoạt động học tập thực tế.</p></div>
                                        <Award aria-hidden="true" className="size-5 text-amber-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                                        {[
                                            { title: 'Chiến binh', detail: 'Hoàn thành bài thi đầu tiên', unlocked: (dashboardStats?.examsTaken || 0) >= 1, image: '/dashboard/achievements/warrior-medal-3d.png' },
                                            { title: 'Nhà chinh phục', detail: 'Hoàn thành 10 lượt thi', unlocked: (dashboardStats?.examsTaken || 0) >= 10, image: '/dashboard/achievements/conqueror-shield-3d.png' },
                                            { title: 'Người kiên trì', detail: 'Duy trì chuỗi học 5 ngày', unlocked: (dashboardStats?.streak || 0) >= 5, image: '/dashboard/achievements/perseverance-emerald-3d.png' },
                                            { title: 'Ngôi sao', detail: 'Học thuộc 200 từ', unlocked: (dashboardStats?.vocabLearned || 0) >= 200, image: '/dashboard/achievements/vocabulary-star-3d.png' },
                                        ].map(({ title, detail, unlocked, image: badgeImage }) => (
                                            <div className={`rounded-2xl border p-3 text-center ${unlocked ? 'border-slate-100 bg-slate-50/70' : 'border-slate-100 bg-slate-50/40'}`} key={title}>
                                                <div className="relative mx-auto grid size-16 place-items-center">
                                                    <Image
                                                        alt=""
                                                        aria-hidden="true"
                                                        className={unlocked ? 'object-contain drop-shadow-md' : 'object-contain grayscale opacity-35'}
                                                        height={64}
                                                        src={badgeImage}
                                                        width={64}
                                                    />
                                                    {!unlocked ? <span aria-hidden="true" className="absolute bottom-0 right-0 grid size-6 place-items-center rounded-full border-2 border-white bg-slate-600 text-[11px] shadow-sm">🔒</span> : null}
                                                </div>
                                                <h3 className="mt-1 truncate text-xs font-black text-slate-800">{title}</h3>
                                                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{detail}</p>
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
                            <div className="mx-auto w-full max-w-7xl space-y-4 pb-8 sm:space-y-5">
                                <section className="relative min-h-[300px] overflow-hidden rounded-3xl bg-[#10166b] text-white shadow-xl shadow-blue-900/15 sm:min-h-[330px]">
                                    <Image
                                        alt=""
                                        aria-hidden="true"
                                        className="object-cover object-[76%_center] opacity-80 sm:object-[68%_center] sm:opacity-100"
                                        fill
                                        priority
                                        sizes="(min-width: 1280px) 1152px, 100vw"
                                        src="/dashboard/exam-overview-hero-v2.webp"
                                    />
                                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#10166b] via-[#151870]/95 via-48% to-[#151870]/5 sm:via-45% sm:to-transparent" />
                                    <div className="relative flex min-h-[258px] flex-col justify-center p-4 sm:min-h-[330px] sm:p-7 lg:max-w-[62%] lg:p-9">
                                        <Badge className="w-fit border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] text-white shadow-sm backdrop-blur-sm hover:bg-white/10 sm:px-3 sm:py-1 sm:text-xs">
                                            <Award aria-hidden="true" className="size-3 text-amber-300 sm:size-3.5" /> Kỳ thi EPS-TOPIK
                                        </Badge>
                                        <h1 className="mt-2 max-w-[62%] text-balance text-[22px] font-black leading-[1.12] tracking-tight sm:mt-3 sm:max-w-none sm:text-4xl">Sẵn sàng cho kỳ thi</h1>
                                        <p className="mt-1 max-w-[58%] text-[11px] leading-4 text-blue-100 sm:mt-1.5 sm:max-w-none sm:text-base sm:leading-6">Luyện đề chuẩn, theo dõi kết quả và xếp hạng.</p>
                                        <div className="mt-3 grid max-w-2xl grid-cols-3 gap-1.5 sm:mt-5 sm:gap-3">
                                            {[
                                                [String(exams.length), 'Đề đang mở', FileText],
                                                [String(dashboardStats?.examsTaken || 0), 'Lượt đã thi', ClipboardCheck],
                                                [`${overallProgress}%`, 'Điểm trung bình', Target],
                                            ].map(([value, label, Icon]) => (
                                                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/15 bg-[#252b82]/85 px-2 py-1.5 backdrop-blur-md sm:gap-3 sm:rounded-2xl sm:bg-white/10 sm:px-4 sm:py-3" key={String(label)}>
                                                    <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-blue-100 sm:grid"><Icon aria-hidden="true" className="size-5" /></span>
                                                    <span className="min-w-0"><strong className="block text-base font-black leading-5 tabular-nums sm:text-2xl">{String(value)}</strong><span className="block truncate text-[8px] font-semibold leading-3 text-blue-100 sm:text-xs">{String(label)}</span></span>
                                                </div>
                                            ))}
                                        </div>
                                        <Button className="mt-3 min-h-9 w-full rounded-xl bg-white px-5 text-sm font-black text-blue-700 shadow-lg transition-transform hover:scale-[1.01] hover:bg-blue-50 motion-reduce:transform-none sm:mt-5 sm:min-h-11 sm:w-fit sm:px-6" onClick={() => setActiveMenu('thi-thu-de-thi')}>
                                            Xem đề thi <ChevronDown aria-hidden="true" className="size-4 -rotate-90" />
                                        </Button>
                                    </div>
                                </section>

                                <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                                    <Card className="group relative overflow-hidden border-blue-200 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50/60 p-0 shadow-lg shadow-blue-100/60 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transform-none">
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

                                    <Card className="overflow-hidden border-violet-100 bg-gradient-to-b from-white to-violet-50/60 p-4 shadow-sm sm:p-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-50 text-orange-500 shadow-sm ring-1 ring-orange-100">
                                                    <Trophy aria-hidden="true" className="size-5 stroke-[2.25]" />
                                                    <Sparkles aria-hidden="true" className="absolute -right-1 -top-1 size-3 text-amber-400" />
                                                </span>
                                                <h2 className="font-black text-slate-950">Xếp hạng</h2>
                                            </div>
                                            <button className="text-xs font-bold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => setActiveMenu('thi-thu-bang-xep-hang')} type="button">Xem tất cả</button>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {leaderboard.slice(0, 3).map((entry, index) => (
                                                <div className="flex items-center gap-2.5 rounded-xl border border-white bg-white/85 px-3 py-2.5 shadow-sm" key={entry.rank}>
                                                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-sm ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>{entry.rank}</span>
                                                    <Award aria-hidden="true" className={`size-4 shrink-0 ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-orange-500'}`} />
                                                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{entry.name}</span>
                                                    <strong className="text-xs tabular-nums text-blue-700">{entry.score}đ</strong>
                                                </div>
                                            ))}
                                            {leaderboard.length === 0 ? <p className="py-4 text-center text-xs text-slate-500">Chưa có dữ liệu xếp hạng.</p> : null}
                                        </div>
                                    </Card>
                                </div>

                                <Card className="relative overflow-hidden border-blue-100 bg-gradient-to-r from-white via-white to-blue-50/60 p-4 shadow-sm sm:p-5">
                                    <div aria-hidden="true" className="absolute -bottom-16 -right-12 size-48 rounded-full bg-blue-100/60 blur-3xl" />
                                    <div className="relative flex items-center gap-2.5">
                                        <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-600 shadow-sm ring-1 ring-blue-100">
                                            <ListChecks aria-hidden="true" className="size-5 stroke-[2.25]" />
                                            <Sparkles aria-hidden="true" className="absolute -right-1 -top-1 size-3 text-violet-400" />
                                        </span>
                                        <h2 className="font-black text-slate-950">Quy trình dự thi</h2>
                                    </div>
                                    <div className="relative mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-[repeat(3,minmax(0,1fr))_190px]">
                                        {[
                                            ['1', 'Chọn đề', 'Xem cấu trúc, thời lượng và số lượt thi.', '/dashboard/exam-process/choose-exam.webp', 'from-blue-500 to-indigo-600'],
                                            ['2', 'Xác nhận', 'Kiểm tra thông tin thí sinh trước khi bắt đầu.', '/dashboard/exam-process/confirm-identity.webp', 'from-violet-500 to-indigo-600'],
                                            ['3', 'Làm bài', 'Hoàn thành đúng thời gian và xem kết quả.', '/dashboard/exam-process/take-exam.webp', 'from-cyan-500 to-blue-600'],
                                        ].map(([step, title, description, stepImage, stepTone], index) => (
                                            <div className="group relative flex min-h-36 items-center gap-3 rounded-2xl border border-blue-100 bg-white/90 p-4 pr-5 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none" key={String(step)}>
                                                <span className="relative grid size-20 shrink-0 place-items-center">
                                                    <Image alt="" aria-hidden="true" className="object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" fill sizes="80px" src={String(stepImage)} />
                                                    <span className={`absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-gradient-to-br text-[10px] font-black text-white shadow-md ring-2 ring-white ${String(stepTone)}`}>{String(step)}</span>
                                                </span>
                                                <div><h3 className="text-sm font-black text-slate-900">{String(title)}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{String(description)}</p></div>
                                                {index < 2 ? <span aria-hidden="true" className="absolute -right-5 top-1/2 z-10 hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-white text-indigo-500 shadow-sm ring-1 ring-indigo-100 sm:grid"><ChevronDown className="size-4 -rotate-90" /></span> : null}
                                            </div>
                                        ))}
                                        <div aria-hidden="true" className="relative hidden min-h-36 xl:block">
                                            <Image alt="" className="object-contain object-right-bottom opacity-90 drop-shadow-sm" fill sizes="190px" src="/dashboard/exam-process/exam-finish.webp" />
                                            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-blue-50/70 to-transparent" />
                                        </div>
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
                                onMobileBackChange={handleInterviewMobileBackChange}
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
