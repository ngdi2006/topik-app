"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { UserNav } from "@/components/shared/UserNav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDays, Clock, Award, ChevronLeft, Search } from "lucide-react"

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
                <div className="flex items-center gap-4">
                    <UserNav />
                </div>
            </header>

            <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Báo cáo quá trình luyện thi</h1>
                        <p className="text-muted-foreground mt-2">Xem lại thẻ báo cáo, điểm số và bài thi bạn đã hoàn thành để tối ưu quá trình học.</p>
                    </div>
                    <div className="bg-white px-4 py-2 border rounded-full flex items-center shadow-sm">
                        <Award className="w-5 h-5 text-yellow-500 mr-2" />
                        <span className="font-semibold text-gray-700">Đã hoàn tất: <span className="text-primary">{history.length}</span> bài</span>
                    </div>
                </div>

                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="bg-white border-b sticky top-0 md:rounded-t-xl z-0">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Dòng thời gian kết quả test TOPIK
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="py-20 text-center text-muted-foreground space-y-3">
                                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent flex mx-auto rounded-full"></div>
                                <p>Đang tải dữ liệu báo cáo...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="py-24 text-center">
                                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800">Chưa có bản ghi nào</h3>
                                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Bạn chưa hoàn thành bài thi nào. Vui lòng chuyển tới Dashboard để bắt đầu làm bài test đầu tiên nhé.</p>
                                <Button className="mt-6" onClick={() => router.push('/dashboard')}>Bắt đầu thi ngay</Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {history.map((record) => (
                                    <div key={record.id} className="p-6 sm:p-8 hover:bg-blue-50/50 transition duration-200 group bg-white">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                                        ${record.exams?.level === 'TOPIK I' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
                                                    `}>
                                                        {record.exams?.level || "Không rõ Cấp độ"}
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                        Phần thi: {record.exams?.part_type || "Reading"}
                                                    </span>
                                                </div>

                                                <h3 className="text-xl font-bold text-gray-900 leading-snug group-hover:text-blue-700 transition-colors">
                                                    {record.exams?.title || "Đề thi không xác định"}
                                                </h3>

                                                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <CalendarDays className="w-4 h-4 text-gray-400" />
                                                        {new Date(record.created_at).toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        {record.type === 'milestone' ? 'Hoàn thành' : `Thời gian đã làm: ${Math.floor((record.time_taken || 0) / 60)} phút ${(record.time_taken || 0) % 60} giây`}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                                                <div className="text-center md:text-right">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Điểm số</p>
                                                    <div className="text-3xl font-black text-primary">
                                                        {record.score}<span className="text-lg text-gray-400 font-semibold">/100</span>
                                                    </div>
                                                    {record.type !== 'milestone' && (
                                                        <p className="text-sm font-medium text-green-600 mt-1">
                                                            Đúng {record.total_correct} câu
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    className="shadow-sm hover:shadow-md transition-all"
                                                    onClick={() => record.type === 'milestone' ? alert('Tính năng xem chi tiết chữa bài Mốc đang được AI biên soạn, sẽ ra mắt sớm!') : router.push(`/exam/${record.exams?.id}/result/${record.id}`)}
                                                >
                                                    Xem chi tiết
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
