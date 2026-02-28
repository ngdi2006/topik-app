"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, ArrowLeft, Trophy, Clock, Target } from "lucide-react"

export default function ExamResultPage() {
    const params = useParams()
    const router = useRouter()
    const examId = params.id as string
    const resultId = params.resultId as string
    const supabase = createClient()

    const [result, setResult] = useState<any>(null)
    const [exam, setExam] = useState<any>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchResultData = async () => {
            if (!resultId || !examId) return;
            setIsLoading(true);

            try {
                const res = await fetch(`/api/exams/${examId}/result/${resultId}`)
                const data = await res.json()

                if (!res.ok) {
                    throw new Error(data.error || "Không thể tải báo cáo")
                }

                setResult(data.result)
                setExam(data.exam)
                setQuestions(data.questions || [])

            } catch (error) {
                console.error("Lỗi lấy kết quả:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchResultData()
    }, [resultId, examId, supabase])

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50/50">Đang tải kết quả thi...</div>
    }

    if (!result || !exam) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 space-y-4">
                <p>Không tìm thấy kết quả thi.</p>
                <Button onClick={() => router.push('/dashboard')}>Về trang chủ</Button>
            </div>
        )
    }

    // Determine grade color
    let gradeColor = "text-red-500"
    let bgGrade = "bg-red-50"
    let borderGrade = "border-red-200"
    if (result.score >= 80) {
        gradeColor = "text-green-600"
        bgGrade = "bg-green-50"
        borderGrade = "border-green-200"
    } else if (result.score >= 50) {
        gradeColor = "text-yellow-600"
        bgGrade = "bg-yellow-50"
        borderGrade = "border-yellow-200"
    }

    return (
        <div className="min-h-screen bg-muted/20 pb-12">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="font-bold text-lg text-primary">Kết quả bài thi</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 space-y-8">
                {/* Score Summary Card */}
                <Card className={`border-2 ${borderGrade} shadow-md overflow-hidden`}>
                    <div className={`${bgGrade} p-6 sm:p-10 text-center flex flex-col items-center justify-center`}>
                        <Trophy className={`w-16 h-16 ${gradeColor} mb-4`} />
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800">{exam.title}</h2>
                        <p className="text-muted-foreground mb-8">Hoàn thành vào {new Date(result.created_at).toLocaleDateString('vi-VN')}</p>

                        <div className="flex flex-wrap justify-center gap-8 sm:gap-16 w-full">
                            <div className="flex flex-col items-center">
                                <span className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">Điểm Tổng</span>
                                <div className={`text-6xl font-black ${gradeColor}`}>
                                    {result.score}
                                </div>
                                <span className="text-sm text-gray-500 mt-1">/ 100</span>
                            </div>

                            <div className="flex flex-col gap-4 text-left border-l pl-8 sm:pl-16 border-gray-200">
                                <div className="flex items-center gap-3">
                                    <Target className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <p className="text-lg font-bold text-gray-800">{result.total_correct} / {exam.total_questions}</p>
                                        <p className="text-xs text-muted-foreground uppercase">Câu đúng</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-orange-500" />
                                    <div>
                                        <p className="text-lg font-bold text-gray-800">
                                            {Math.floor(result.time_taken / 60)} phút {result.time_taken % 60} giây
                                        </p>
                                        <p className="text-xs text-muted-foreground uppercase">Thời gian làm bài</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Detailed Review Section */}
                <div>
                    <h3 className="text-xl font-bold mb-6 text-gray-800">Xem lại bài làm</h3>
                    <div className="space-y-6">
                        {questions.map((q, idx) => {
                            const userAnswerIndex = result.answers[q.id]
                            const hasAnswered = userAnswerIndex !== undefined && userAnswerIndex !== null
                            const userAnswerText = hasAnswered ? q.options[userAnswerIndex] : null

                            // Check if correct index
                            const isCorrect = hasAnswered &&
                                q.correct_answer !== undefined && q.correct_answer !== null &&
                                Number(userAnswerIndex) === Number(q.correct_answer)

                            return (
                                <Card key={q.id} className={`border-l-4 shadow-sm ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                                    <CardContent className="p-6">
                                        <div className="flex gap-4">
                                            <div className="mt-1">
                                                {isCorrect ? (
                                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-6 h-6 text-red-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <h4 className="text-lg font-semibold text-gray-900">
                                                    <span className="mr-2 text-primary">{idx + 1}.</span>
                                                    {q.question_text}
                                                </h4>

                                                {q.passage && (
                                                    <div className="bg-muted/50 p-4 rounded text-sm text-gray-700">
                                                        {q.passage}
                                                    </div>
                                                )}

                                                <div className="grid sm:grid-cols-2 gap-3">
                                                    {Array.isArray(q.options) && q.options.map((opt: string, optIdx: number) => {
                                                        const isUserChoice = userAnswerIndex === optIdx
                                                        const isActualCorrect = q.correct_answer !== undefined && q.correct_answer !== null &&
                                                            optIdx === Number(q.correct_answer)

                                                        let optClass = "border-gray-200 bg-white"
                                                        if (isActualCorrect) {
                                                            optClass = "border-green-500 bg-green-50 text-green-900 font-medium"
                                                        } else if (isUserChoice && !isCorrect) {
                                                            optClass = "border-red-500 bg-red-50 text-red-900"
                                                        }

                                                        return (
                                                            <div key={optIdx} className={`p-3 rounded-md border-2 ${optClass} flex items-center gap-3`}>
                                                                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold border shadow-sm">
                                                                    {['1', '2', '3', '4'][optIdx] || (optIdx + 1)}
                                                                </span>
                                                                <span className="flex-1">{opt}</span>
                                                                {isUserChoice && <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded">Của bạn</span>}
                                                                {isActualCorrect && !isUserChoice && <span className="text-xs font-bold bg-green-200 text-green-800 px-2 py-1 rounded">Đáp án</span>}
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {!hasAnswered && (
                                                    <p className="text-sm text-red-500 italic mt-2">Bạn đã bỏ trống câu hỏi này!</p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                    <Button size="lg" onClick={() => router.push('/dashboard')}>
                        Trở về trang chủ
                    </Button>
                </div>
            </main>
        </div>
    )
}
