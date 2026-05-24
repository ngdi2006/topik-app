"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/shared/UserNav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, PlayCircle, BookOpen, Target, FileText, Bot, ClipboardCheck, Coins, ShoppingCart, Phone, X, Factory, Sparkles, Mic } from "lucide-react"
import { LessonList } from "@/components/lessons/LessonList"
import { PracticeHub } from "@/components/practice/PracticeHub"
import { PaymentModal } from "@/components/payment/PaymentModal"

type ActiveMenu = 'bai-hoc' | 'luyen-tap' | 'thi-thu' | 'ai-chat' | 'kiem-tra' | 'phong-van'

type Exam = {
    id: string
    title: string
    duration: number
    total_questions: number
    is_free?: boolean
    is_ai_generated?: boolean
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
}

const fallbackMenuSettings: LearnerMenuSetting[] = Object.entries(learnerMenuMeta).map(([key, meta], index) => ({
    key: key as ActiveMenu,
    label: meta.label,
    is_enabled: true,
    sort_order: index + 1,
}))

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()
    const { user, setUser, setRole, isLoading, setIsLoading } = useUserStore()
    const [exams, setExams] = useState<Exam[]>([])
    const [enabledMenuSettings, setEnabledMenuSettings] = useState<LearnerMenuSetting[]>(fallbackMenuSettings)
    const [activeMenu, setActiveMenu] = useState<ActiveMenu | null>(null)
    const [userCredits, setUserCredits] = useState<number>(0)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [checkingAccess, setCheckingAccess] = useState<string | null>(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    const enabledMenuItems = useMemo(
        () => enabledMenuSettings
            .filter((item) => item.is_enabled && item.key in learnerMenuMeta)
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
                const [examsRes, menuRes] = await Promise.all([
                    fetch('/api/exams'),
                    fetch('/api/learner/dashboard-menu'),
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
            } catch (error) {
                console.error("Lỗi lấy dữ liệu dashboard:", error)
            }

            setIsLoading(false)
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

    const handleStartExam = async (examId: string) => {
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

    const renderMenuButton = (item: (typeof enabledMenuItems)[number], onClick?: () => void) => {
        const Icon = item.Icon

        return (
            <Button
                key={item.key}
                variant="ghost"
                className={`w-full justify-start font-medium border-0 ${activeMenu === item.key ? 'bg-white/15 text-white hover:bg-white/20' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
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

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Đang tải dữ liệu...</div>
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
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 w-64">
                    {enabledMenuItems.map((item) => renderMenuButton(item))}
                </nav>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-[72px] border-b bg-white px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0">
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
                            <Image src="/logomobile.png" alt="Korea Link" fill className="object-contain" priority />
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
                    <div className="md:hidden border-b border-white/10 bg-[#2B64CE] p-4 shadow-md sticky top-[72px] z-10 flex flex-col gap-1 text-white">
                        {enabledMenuItems.map((item) => renderMenuButton(item, () => setIsMobileMenuOpen(false)))}
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
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* Default view - no menu selected */}
                        {!activeMenu && (
                            <>
                                <h1 className="text-3xl font-bold tracking-tight">Chào mừng trở lại! 👋</h1>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {enabledMenuItems.map((item) => renderOverviewCard(item))}
                                </div>
                            </>
                        )}

                        {/* BÀI HỌC */}
                        {activeMenu === 'bai-hoc' && activeMenuItem && <LessonList />}

                        {/* LUYỆN TẬP */}
                        {activeMenu === 'luyen-tap' && activeMenuItem && <PracticeHub />}

                        {/* THI THỬ */}
                        {activeMenu === 'thi-thu' && activeMenuItem && (
                            <>
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
                                                            onClick={() => handleStartExam(exam.id)}
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

                                <PaymentModal
                                    open={paymentModalOpen}
                                    onClose={() => setPaymentModalOpen(false)}
                                    onSuccess={() => {
                                        setPaymentModalOpen(false)
                                        fetchCredits()
                                    }}
                                />
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
                            <>
                                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                                    <Mic className="w-8 h-8 text-primary" />
                                    Luyện Phỏng Vấn Vòng 2
                                </h1>
                                <Card className="border-primary/50 bg-primary/5">
                                    <CardHeader>
                                        <CardTitle className="text-primary flex items-center gap-2">
                                            <Mic className="w-5 h-5" />
                                            Phỏng Vấn Vòng 2
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                            </span>
                                        </CardTitle>
                                        <CardDescription>Thực hành trả lời câu hỏi và kéo thả công cụ theo khẩu lệnh của Giám khảo AI</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button
                                            variant="default"
                                            className="w-full"
                                            onClick={() => router.push('/interview-practice')}
                                        >
                                            Vào luyện tập ngay
                                        </Button>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                    </div>
                </main>
            </div>
        </div>
    )
}
