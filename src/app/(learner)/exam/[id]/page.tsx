"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useExamStore } from "@/store/examStore"
import { useTimer } from "@/hooks/useTimer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export default function ExamPage() {
    const params = useParams()
    const router = useRouter()
    const examId = params.id as string
    const supabase = createClient()

    const { currentQuestionIndex, setCurrentQuestionIndex, answers, setAnswer, submitExam, resetExam } = useExamStore()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [examData, setExamData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Fetch Exam Data
    useEffect(() => {
        const fetchExamDetails = async () => {
            if (!examId) return;
            setIsLoading(true);
            try {
                // Fetch Exam info & Questions via API
                const res = await fetch(`/api/exams/${examId}`)
                const data = await res.json()

                if (!res.ok) throw new Error(data.error || "Không thể tải đề thi")

                setExamData({
                    ...data.exam,
                    questions: data.questions || []
                });

                resetExam(); // Đặt lại bộ nhớ khi mới vào thi

            } catch (error: any) {
                console.error("Lỗi lấy đề thi:", error);
                toast.error("Không thể tải đề thi. Vui lòng thử lại!");
                router.push('/dashboard');
            } finally {
                setIsLoading(false);
            }
        }

        fetchExamDetails();
    }, [examId, supabase, router, resetExam]);

    const handleAutoSubmit = useCallback(async () => {
        submitExam()
        toast.info("Hết giờ làm bài! Đang nộp bài tự động...")

        try {
            const res = await fetch(`/api/exams/${examId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers })
            })

            const text = await res.text()
            let data: any = {}
            try { data = JSON.parse(text) } catch (e) { console.error("Non-JSON response:", text) }

            if (!res.ok) throw new Error(data?.error || `Lỗi HTTP: ${res.status}`)

            toast.success("Đã lưu kết quả bài thi thành công!")
            router.push(`/exam/${examId}/result/${data.resultId}`)
        } catch (error: any) {
            console.error("Auto submit error:", error)
            toast.error(error.message || "Đã xảy ra lỗi khi nộp bài tự động.")
            router.push("/dashboard")
        }
    }, [submitExam, router, examId, answers])

    const { formatTime, start, pause } = useTimer(examData?.duration ? examData.duration * 60 : 3600, () => {
        handleAutoSubmit()
    })

    useEffect(() => {
        // Bắt đầu đếm thời gian khi dữ liệu đã sẵn sàng
        if (examData && !isLoading) {
            start()
        }
        return () => pause()
    }, [examData, isLoading, start, pause])

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-muted/20 text-lg">Đang tải đề thi...</div>
    }

    if (!examData || !examData.questions || examData.questions.length === 0) {
        return <div className="min-h-screen flex items-center justify-center bg-muted/20 text-lg">Đề thi trống hoặc không tồn tại.</div>
    }

    const currentQuestion = examData.questions[currentQuestionIndex]
    const totalQuestions = examData.questions.length

    // Calculate answered questions
    const answeredCount = Object.keys(answers).length

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1)
        }
    }

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1)
        }
    }

    const handleManualSubmit = () => {
        setIsDialogOpen(true)
    }

    const confirmSubmit = async () => {
        setIsSubmitting(true)
        pause()
        submitExam()

        try {
            const res = await fetch(`/api/exams/${examId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers })
            })

            const text = await res.text()
            let data: any = {}
            try { data = JSON.parse(text) } catch (e) { console.error("Non-JSON response:", text) }

            if (!res.ok) throw new Error(data?.error || `Lỗi HTTP: ${res.status}`)

            toast.success("Nộp bài thành công! Hệ thống đã ghi nhận kết quả.")

            // Redirect tới trang kết quả
            router.push(`/exam/${examId}/result/${data.resultId}`)
            setIsDialogOpen(false)

        } catch (error: any) {
            console.error("Submit error:", error)
            toast.error(error.message || "Không thể kết nối đến máy chủ.")
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            {/* Top Navigation Bar */}
            <header className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-20">
                <div>
                    <h1 className="font-bold text-lg">{examData.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        Đã làm: {answeredCount}/{totalQuestions} câu
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-md font-mono font-bold text-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        {formatTime()}
                    </div>

                    <Button variant="default" onClick={handleManualSubmit}>
                        Nộp bài
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left Side: Question List Navigation */}
                <aside className="w-64 bg-white border-r overflow-y-auto p-4 hidden md:block">
                    <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">Danh sách câu hỏi</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {examData.questions.map((q: any, idx: number) => {
                            const isAnswered = answers[q.id] !== undefined
                            const isCurrent = currentQuestionIndex === idx

                            return (
                                <button
                                    key={q.id || idx}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`
                    w-10 h-10 rounded-md flex items-center justify-center text-sm font-medium transition-colors
                    ${isCurrent ? 'ring-2 ring-primary ring-offset-1' : ''}
                    ${isAnswered
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted hover:bg-muted/80'
                                        }
                  `}
                                >
                                    {idx + 1}
                                </button>
                            )
                        })}
                    </div>
                </aside>

                {/* Right Side: Question View */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-10">
                    <div className="max-w-4xl mx-auto">
                        <Card className="shadow-sm border-blue-100 mb-6">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                        Câu hỏi {currentQuestionIndex + 1} / {totalQuestions}
                                    </span>
                                    <span className="text-sm font-medium text-muted-foreground">{examData.level} - {examData.part_type}</span>
                                </div>

                                {/* Passage or Audio Context */}
                                {currentQuestion.passage && (
                                    <div className="bg-muted/30 p-6 rounded-lg mb-8 border border-muted">
                                        <p className="whitespace-pre-wrap leading-relaxed text-lg font-medium text-gray-800">
                                            {currentQuestion.passage}
                                        </p>
                                    </div>
                                )}

                                {/* Question */}
                                <h2 className="text-xl font-semibold mb-6">
                                    <span className="mr-2 text-primary">{currentQuestionIndex + 1}.</span>
                                    {currentQuestion.question_text}
                                </h2>

                                {/* Options */}
                                <div className="space-y-3">
                                    {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option: string, idx: number) => {
                                        const isSelected = answers[currentQuestion.id] === idx

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setAnswer(currentQuestion.id, idx)}
                                                className={`
                          flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                          hover:bg-muted/50
                          ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent bg-white shadow-sm'}
                        `}
                                            >
                                                <div className={`
                          flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold
                          ${isSelected ? 'border-primary bg-primary text-white' : 'border-muted-foreground text-muted-foreground'}
                        `}>
                                                    {['1', '2', '3', '4'][idx] || (idx + 1)}
                                                </div>
                                                <span className="text-lg">{option}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bottom Navigation Controls */}
                        <div className="flex justify-between items-center">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handlePrev}
                                disabled={currentQuestionIndex === 0}
                            >
                                &larr; Câu trước
                            </Button>

                            <Button
                                variant="default"
                                size="lg"
                                onClick={handleNext}
                                disabled={currentQuestionIndex === totalQuestions - 1}
                            >
                                Câu tiếp &rarr;
                            </Button>
                        </div>
                    </div>
                </main>
            </div>

            {/* Submit Confirmation Dialog */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
                        <h2 className="text-lg font-bold mb-2">Xác nhận nộp bài</h2>
                        <p className="text-muted-foreground mb-6">
                            Bạn đã làm {answeredCount}/{totalQuestions} câu hỏi. Bạn có chắc chắn muốn nộp bài thi kết thúc sớm?
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Hủy</Button>
                            <Button onClick={confirmSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "Đang xử lý..." : "Nộp bài ngay"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
