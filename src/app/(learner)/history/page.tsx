"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { UserNav } from "@/components/shared/UserNav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDays, Clock, Award, ChevronLeft, Search, CheckCircle2, XCircle } from "lucide-react"

export default function HistoryPage() {
    const router = useRouter()
    const [history, setHistory] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch('/api/learner/history')
                if (res.ok) {
                    const data = await res.json()
                    setHistory(data)
                }
            } catch (error) {
                console.error("Lỗi lấy lịch sử:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchHistory()
    }, [])

    const examHistory = history.filter(r => r.type === 'exam')
    const milestoneHistory = history.filter(r => r.type === 'milestone')

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </Button>
                    <div className="font-bold text-xl text-primary">Lịch sử làm bài</div>
                </div>
                <UserNav />
            </header>

            <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
                {/* Title + Stats */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Báo cáo quá trình luyện thi</h1>
                        <p className="text-muted-foreground mt-2">Xem lại điểm số và bài thi bạn đã hoàn thành.</p>
                    </div>
                    <div className="bg-white px-4 py-2 border rounded-full flex items-center shadow-sm">
                        <Award className="w-5 h-5 text-yellow-500 mr-2" />
                        <span className="font-semibold text-gray-700">
                            Đã hoàn tất: <span className="text-primary">{examHistory.length}</span> bài
                        </span>
                    </div>
                </div>

                {/* Exam Attempts */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="bg-white border-b rounded-t-xl">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Lịch sử làm bài
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="py-20 text-center text-muted-foreground space-y-3">
                                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent flex mx-auto rounded-full"></div>
                                <p>Đang tải dữ liệu...</p>
                            </div>
                        ) : examHistory.length === 0 ? (
                            <div className="py-24 text-center">
                                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800">Chưa có bản ghi nào</h3>
                                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                                    Bạn chưa hoàn thành bài thi nào. Vui lòng chuyển tới Dashboard để bắt đầu!
                                </p>
                                <Button className="mt-6" onClick={() => router.push('/dashboard')}>
                                    Bắt đầu thi ngay
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {examHistory.map((record) => {
                                    const examTitle = (record.exams as any)?.title || "Đề thi không xác định"
                                    const examLevel = (record.exams as any)?.level || ""

                                    // score here is percentage 0-100
                                    const pct = record.score
                                    let scoreColor = "text-red-600"
                                    let scoreBg = "bg-red-50"
                                    if (pct >= 80) { scoreColor = "text-green-600"; scoreBg = "bg-green-50" }
                                    else if (pct >= 50) { scoreColor = "text-yellow-600"; scoreBg = "bg-yellow-50" }

                                    const completedDate = new Date(record.created_at).toLocaleDateString("vi-VN", {
                                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })
                                    const minutesTaken = Math.floor((record.time_taken || 0) / 60)
                                    const secondsTaken = (record.time_taken || 0) % 60

                                    return (
                                        <div key={record.id} className="p-5 sm:p-6 hover:bg-blue-50/40 transition-colors group">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex-1 space-y-2">
                                                    {/* Level & attempt badge */}
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {/* Level badge hidden as requested */}
                                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                                            Lần {record.attempt_number || 1}
                                                        </span>
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">
                                                        {examTitle}
                                                    </h3>

                                                    {/* Meta */}
                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <CalendarDays className="w-4 h-4 text-gray-400" />
                                                            {completedDate}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-4 h-4 text-gray-400" />
                                                            {minutesTaken} phút {secondsTaken} giây
                                                        </div>
                                                    </div>

                                                    {/* Correct/Wrong count */}
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span className="flex items-center gap-1 text-green-600 font-medium">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            {record.total_correct} đúng
                                                        </span>
                                                        <span className="flex items-center gap-1 text-red-500 font-medium">
                                                            <XCircle className="w-4 h-4" />
                                                            {record.wrong_count} sai
                                                        </span>
                                                        <span className="text-lg font-bold text-gray-700">
                                                            ({record.raw_score}/{record.total_points} điểm)
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Score + Action */}
                                                <div className={`flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4
                                                    border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[120px]`}>
                                                    <div className={`text-center px-6 py-4 rounded-xl ${scoreBg}`}>
                                                        <p className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1">Kết quả</p>
                                                        <div className={`text-5xl font-black ${scoreColor} leading-none`}>
                                                            {pct}<span className="text-xl font-semibold text-gray-400">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Milestone History (if any) */}
                {milestoneHistory.length > 0 && (
                    <Card className="shadow-sm border-gray-200 mt-8">
                        <CardHeader className="bg-white border-b rounded-t-xl">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Award className="w-5 h-5 text-orange-500" />
                                Lịch sử kiểm tra Mốc
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100">
                                {milestoneHistory.map((record) => (
                                    <div key={record.id} className="p-5 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{record.exams?.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                <CalendarDays className="w-4 h-4 inline mr-1" />
                                                {new Date(record.created_at).toLocaleDateString("vi-VN")}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-orange-600">{record.score}</div>
                                            <p className="text-xs text-gray-400">điểm</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    )
}
