"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/shared/UserNav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Clock, PlayCircle } from "lucide-react"

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()
    const { user, role, setUser, setRole, isLoading, setIsLoading } = useUserStore()
    const [exams, setExams] = useState<any[]>([])

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                // Fetch User Role from Profiles Table
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile) setRole(profile.role)
            }

            try {
                // Fetch available exams
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

    // Bỏ hàm handleSignOut vì UserNav đã tự xử lý

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Đang tải dữ liệu...</div>
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="font-bold text-xl text-primary">LUYỆN NÓI CÙNG KOREA LINK</div>
                <div className="flex items-center gap-4">
                    <UserNav />
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 border-r bg-muted/20 p-4 hidden md:block">
                    <nav className="space-y-2">
                        {role === 'admin' && (
                            <Button
                                variant="destructive"
                                className="w-full justify-start text-white bg-red-600 hover:bg-red-700"
                                onClick={() => router.push('/admin')}
                            >
                                Truy cập Admin Panel
                            </Button>
                        )}
                        <Button variant="secondary" className="w-full justify-start mt-4">
                            Tổng quan
                        </Button>
                        <Button variant="ghost" className="w-full justify-start">
                            Luyện thi Reading/Listening
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full justify-start border border-primary/20 text-primary"
                            onClick={() => router.push('/ai-chat')}
                        >
                            Luyện giao tiếp AI ✨
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full justify-start border border-orange-500/20 text-orange-600 bg-orange-50/50 mt-2 font-medium"
                            onClick={() => router.push('/milestones')}
                        >
                            Kiểm tra tiến độ (4 Mốc) 🎯
                        </Button>
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <h1 className="text-3xl font-bold tracking-tight">Chào mừng trở lại! 👋</h1>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="border-primary/50 bg-primary/5">
                                <CardHeader>
                                    <CardTitle className="text-primary flex items-center gap-2">
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

                            <Card className="border-orange-500/50 bg-orange-500/5 hover:border-orange-500/80 transition-colors">
                                <CardHeader>
                                    <CardTitle className="text-orange-700 flex items-center gap-2">
                                        Đánh giá Năng lực (4 Mốc)
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                        </span>
                                    </CardTitle>
                                    <CardDescription>Kiểm tra phát âm, từ vựng và phản xạ giao tiếp theo tiến độ học</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="default"
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                        onClick={() => router.push('/milestones')}
                                    >
                                        Vào Thi Thực Hành
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Exam List */}
                        <div>
                            <div className="flex items-center justify-between mb-4 mt-8">
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
                                                    {/* Level badge */}
                                                    {exam.level && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">
                                                            {exam.level}
                                                        </span>
                                                    )}
                                                    {exam.is_ai_generated && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                                                            ✨ AI Gen
                                                        </span>
                                                    )}
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
                                                    onClick={() => router.push(`/exam/${exam.id}/start`)}
                                                >
                                                    <PlayCircle className="w-4 h-4" />
                                                    Vào thi ngay
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>



                    </div>
                </main>
            </div>
        </div>
    )
}
