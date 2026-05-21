"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/shared/UserNav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, PlayCircle, BookOpen, Target, FileText, Bot, ClipboardCheck, Coins, ShoppingCart, Lock, Menu, X } from "lucide-react"
import { LessonList } from "@/components/lessons/LessonList"
import { PracticeHub } from "@/components/practice/PracticeHub"
import { PaymentModal } from "@/components/payment/PaymentModal"

type ActiveMenu = 'bai-hoc' | 'luyen-tap' | 'thi-thu' | 'ai-chat' | 'kiem-tra'

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()
    const { user, role, setUser, setRole, isLoading, setIsLoading } = useUserStore()
    const [exams, setExams] = useState<any[]>([])
    const [activeMenu, setActiveMenu] = useState<ActiveMenu | null>(null)
    const [userCredits, setUserCredits] = useState<number>(0)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [checkingAccess, setCheckingAccess] = useState<string | null>(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
                const examsRes = await fetch('/api/exams')
                if (examsRes.ok) {
                    const latestExams = await examsRes.json()
                    setExams(latestExams)
                }
            } catch (error) {
                console.error("Lỗi lấy dữ liệu dashboard:", error)
            }

            setIsLoading(false)
        }

        fetchUserData()
    }, [supabase, setUser, setRole, setIsLoading])

    useEffect(() => {
        if (activeMenu === 'thi-thu') {
            fetchCredits()
        }
    }, [activeMenu])

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

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Đang tải dữ liệu...</div>
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b bg-white px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-2 md:gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="md:hidden flex-shrink-0" 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </Button>
                    <div className="font-bold text-lg md:text-xl text-primary leading-tight">THI THỬ EPS-TOPIK CÙNG KOREA LINK</div>
                </div>
                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                    <UserNav />
                </div>
            </header>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-b bg-white p-4 shadow-md sticky top-[72px] z-10 flex flex-col gap-2">
                    <Button
                        variant="ghost"
                        className={`w-full justify-start font-medium border ${activeMenu === 'bai-hoc' ? 'bg-primary/10 text-primary border-primary/20' : 'border-transparent text-muted-foreground'}`}
                        onClick={() => { setActiveMenu('bai-hoc'); setIsMobileMenuOpen(false); }}
                    >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Bài học
                    </Button>
                    <Button
                        variant="ghost"
                        className={`w-full justify-start font-medium border ${activeMenu === 'luyen-tap' ? 'bg-primary/10 text-primary border-primary/20' : 'border-transparent text-muted-foreground'}`}
                        onClick={() => { setActiveMenu('luyen-tap'); setIsMobileMenuOpen(false); }}
                    >
                        <Target className="w-4 h-4 mr-2" />
                        Luyện Tập
                    </Button>
                    <Button
                        variant="ghost"
                        className={`w-full justify-start font-medium border ${activeMenu === 'thi-thu' ? 'bg-primary/10 text-primary border-primary/20' : 'border-transparent text-muted-foreground'}`}
                        onClick={() => { setActiveMenu('thi-thu'); setIsMobileMenuOpen(false); }}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Thi Thử
                    </Button>
                    <Button
                        variant="ghost"
                        className={`w-full justify-start font-medium border ${activeMenu === 'ai-chat' ? 'bg-primary/10 text-primary border-primary/20' : 'border-transparent text-muted-foreground'}`}
                        onClick={() => { setActiveMenu('ai-chat'); setIsMobileMenuOpen(false); }}
                    >
                        <Bot className="w-4 h-4 mr-2" />
                        Luyện giao tiếp AI
                    </Button>
                    <Button
                        variant="ghost"
                        className={`w-full justify-start font-medium border ${activeMenu === 'kiem-tra' ? 'bg-primary/10 text-primary border-primary/20' : 'border-transparent text-muted-foreground'}`}
                        onClick={() => { setActiveMenu('kiem-tra'); setIsMobileMenuOpen(false); }}
                    >
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        Kiểm Tra
                    </Button>
                </div>
            )}

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 border-r bg-muted/20 p-4 hidden md:block">
                    <nav className="space-y-2">
                        <Button
                            variant="ghost"
                            className={`w-full justify-start font-medium border ${activeMenu === 'bai-hoc' ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            onClick={() => setActiveMenu('bai-hoc')}
                        >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Bài học
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start font-medium border ${activeMenu === 'luyen-tap' ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            onClick={() => setActiveMenu('luyen-tap')}
                        >
                            <Target className="w-4 h-4 mr-2" />
                            Luyện Tập
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start font-medium border ${activeMenu === 'thi-thu' ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            onClick={() => setActiveMenu('thi-thu')}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Thi Thử
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start font-medium border ${activeMenu === 'ai-chat' ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            onClick={() => setActiveMenu('ai-chat')}
                        >
                            <Bot className="w-4 h-4 mr-2" />
                            Luyện giao tiếp AI
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start font-medium border ${activeMenu === 'kiem-tra' ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            onClick={() => setActiveMenu('kiem-tra')}
                        >
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Kiểm Tra
                        </Button>
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* Default view - no menu selected */}
                        {!activeMenu && (
                            <>
                                <h1 className="text-3xl font-bold tracking-tight">Chào mừng trở lại! 👋</h1>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Card className="border-primary/20 bg-primary/5 hover:border-primary/50 transition-colors">
                                        <CardHeader>
                                            <CardTitle className="text-primary flex items-center gap-2">
                                                <BookOpen className="w-5 h-5" />
                                                Bài học
                                            </CardTitle>
                                            <CardDescription>Học từ vựng, ngữ pháp và hội thoại theo giáo trình EPS-TOPIK</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                variant="default"
                                                className="w-full"
                                                onClick={() => setActiveMenu('bai-hoc')}
                                            >
                                                Vào học
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-primary/20 bg-primary/5 hover:border-primary/50 transition-colors">
                                        <CardHeader>
                                            <CardTitle className="text-primary flex items-center gap-2">
                                                <Target className="w-5 h-5" />
                                                Luyện Tập
                                            </CardTitle>
                                            <CardDescription>Flashcard, ngữ pháp, trắc nghiệm nhanh theo bài học</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                variant="default"
                                                className="w-full"
                                                onClick={() => setActiveMenu('luyen-tap')}
                                            >
                                                Luyện tập ngay
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-primary/20 bg-primary/5 hover:border-primary/50 transition-colors">
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
                                                onClick={() => setActiveMenu('ai-chat')}
                                            >
                                                Khám phá kịch bản
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-primary/20 bg-primary/5 hover:border-primary/50 transition-colors">
                                        <CardHeader>
                                            <CardTitle className="text-primary flex items-center gap-2">
                                                <ClipboardCheck className="w-5 h-5" />
                                                Kiểm Tra
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
                                                onClick={() => setActiveMenu('kiem-tra')}
                                            >
                                                Vào Thi Thực Hành
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                        )}

                        {/* BÀI HỌC */}
                        {activeMenu === 'bai-hoc' && <LessonList />}

                        {/* LUYỆN TẬP */}
                        {activeMenu === 'luyen-tap' && <PracticeHub />}

                        {/* THI THỬ */}
                        {activeMenu === 'thi-thu' && (
                            <>
                                <div className="flex items-center justify-between">
                                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                                        <FileText className="w-8 h-8 text-primary" />
                                        Thi Thử
                                    </h1>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                                            <Coins className="w-5 h-5 text-primary" />
                                            <span className="font-semibold text-primary">{userCredits} lượt</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => setPaymentModalOpen(true)}
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                            Mua thêm
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-semibold">Đề thi gợi ý cho bạn</h2>
                                        <Button variant="link" className="text-primary">Xem tất cả</Button>
                                    </div>
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
                                                    <CardContent className="pb-3 flex-1 text-sm text-muted-foreground space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4" />
                                                            <span>{exam.duration} phút - {exam.total_questions} câu hỏi</span>
                                                        </div>
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
                        {activeMenu === 'ai-chat' && (
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
                        {activeMenu === 'kiem-tra' && (
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

                    </div>
                </main>
            </div>
        </div>
    )
}
