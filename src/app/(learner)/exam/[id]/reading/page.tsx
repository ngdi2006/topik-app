'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Clock, ChevronLeft, ChevronRight, AlertCircle, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

export default function ReadingPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()

    const examId = params.id as string
    const attemptId = searchParams.get('attemptId')

    const [questions, setQuestions] = useState<any[]>([]) // Only reading questions for display
    const [allQuestions, setAllQuestions] = useState<any[]>([]) // All questions (reading + listening) for sidebar
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [timeLeft, setTimeLeft] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [exam, setExam] = useState<any>(null)
    const [hasListening, setHasListening] = useState(false)
    const [allowNavigation, setAllowNavigation] = useState(false)

    // Fetch attempt data
    useEffect(() => {
        const fetchAttempt = async () => {
            if (!attemptId) {
                toast.error('Không tìm thấy phiên thi')
                router.push(`/exam/${examId}/start`)
                return
            }

            try {
                const res = await fetch(`/api/exams/${examId}/attempt/${attemptId}`)
                const data = await res.json()

                if (!data.success) {
                    throw new Error(data.error)
                }

                // Sort questions: reading first, then listening to ensure sidebar grouping is correct
                const sortedAllQuestions = [...data.attempt.questions].sort((a: any, b: any) => {
                    if (a.section === 'reading' && b.section === 'listening') return -1;
                    if (a.section === 'listening' && b.section === 'reading') return 1;
                    return 0;
                });

                // Filter reading questions
                const readingQuestions = sortedAllQuestions.filter(
                    (q: any) => q.section === 'reading'
                )

                // Check if exam has listening section
                const listeningQuestions = sortedAllQuestions.filter(
                    (q: any) => q.section === 'listening'
                )
                setHasListening(listeningQuestions.length > 0)

                // Set all questions for sidebar (reading + listening)
                setAllQuestions(sortedAllQuestions)
                setQuestions(readingQuestions)
                setExam(data.exam)
                setTimeLeft((data.exam.reading_duration || 40) * 60)

                // Load saved answers
                if (data.attempt.answers && data.attempt.answers.length > 0) {
                    const savedAnswers: Record<string, number> = {}
                    data.attempt.answers.forEach((a: any) => {
                        if (a.section === 'reading') {
                            savedAnswers[a.question_id] = a.selected_option
                        }
                    })
                    setAnswers(savedAnswers)
                }
            } catch (error: any) {
                toast.error(error.message || 'Lỗi tải dữ liệu')
                router.push(`/exam/${examId}/start`)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAttempt()
    }, [attemptId, examId, router])

    // Prevent page reload/close during exam
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!allowNavigation) {
                e.preventDefault()
                e.returnValue = '' // Chrome requires returnValue to be set
                return ''
            }
        }

        // Intercept F5 key to redirect instead of reload
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                if (!allowNavigation) {
                    e.preventDefault()
                    const confirmLeave = window.confirm(
                        'Bạn có chắc muốn rời khỏi bài thi không? Tiến trình của bạn sẽ bị mất.'
                    )
                    if (confirmLeave) {
                        setAllowNavigation(true)
                        router.push('/dashboard')
                    }
                }
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [allowNavigation, router])

    // Prevent browser back/forward navigation during exam
    useEffect(() => {
        if (allowNavigation) return

        // Push a dummy state to prevent back navigation
        window.history.pushState(null, '', window.location.href)

        const handlePopState = () => {
            if (!allowNavigation) {
                const confirmLeave = window.confirm(
                    'Bạn có chắc muốn rời khỏi bài thi không? Tiến trình của bạn sẽ bị mất.'
                )
                if (confirmLeave) {
                    setAllowNavigation(true)
                    router.push('/dashboard')
                } else {
                    // Push state again to prevent navigation
                    window.history.pushState(null, '', window.location.href)
                }
            }
        }

        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
        }
    }, [allowNavigation, router])

    const handleNext = useCallback(async (isAutoSubmit: boolean = false) => {
        if (isSubmitting) return

        if (!hasListening && !isAutoSubmit) {
            const confirmed = window.confirm('Bạn muốn nộp bài? Sau khi đồng ý, hệ thống sẽ kết thúc bài thi và tính điểm.')
            if (!confirmed) return
        }

        setIsSubmitting(true)
        setAllowNavigation(true) // Allow navigation when submitting

        try {
            // Save reading answers
            const readingAnswers = questions.map((q) => ({
                question_id: q.id,
                selected_option: answers[q.id] !== undefined ? answers[q.id] : null,
            }))

            const res = await fetch(`/api/exams/${examId}/attempt/${attemptId}/save-section`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section: 'reading',
                    answers: readingAnswers,
                }),
            })

            const data = await res.json()
            if (!data.success) {
                throw new Error(data.error)
            }

            if (!isAutoSubmit) {
                toast.success('Đã lưu phần Đọc hiểu!')
            } else {
                toast.success('Đã hết thời gian phần Đọc hiểu!')
            }

            // Nếu có phần Nghe → đi đến transition
            if (hasListening) {
                router.push(`/exam/${examId}/transition?attemptId=${attemptId}`)
            } else {
                // Không có phần Nghe → submit luôn
                router.push(`/exam/${examId}/submit?attemptId=${attemptId}`)
            }
        } catch (error: any) {
            if (error.message?.includes('Unauthorized')) {
                toast.error('Tài khoản của bạn đang đăng nhập ở một thiết bị khác. Vui lòng đăng nhập lại.')
                router.push('/')
                return
            }
            toast.error(error.message || 'Lỗi lưu bài')
            setIsSubmitting(false)
        }
    }, [isSubmitting, hasListening, questions, answers, examId, attemptId, router])

    // Timer countdown
    useEffect(() => {
        if (timeLeft <= 0 || isLoading) return

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleNext(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLeft, isLoading, handleNext])

    const handleAnswerSelect = (questionId: string, optionIndex: number) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: optionIndex,
        }))
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const currentQuestion = questions[currentIndex]
    const answeredCount = Object.keys(answers).length
    const readingQuestionsCount = questions.length
    const allAnsweredReading = answeredCount === readingQuestionsCount

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Đang tải câu hỏi...</p>
                </div>
            </div>
        )
    }

    if (!currentQuestion) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Không có câu hỏi đọc hiểu</h2>
                    <Button onClick={() => router.push('/dashboard')}>
                        Quay lại Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    // Get options - support both array format and individual fields
    const getOptions = (q: any) => {
        if (Array.isArray(q.options)) {
            return q.options
        }
        // Fallback to individual fields
        return [
            { content: q.option_1 },
            { content: q.option_2 },
            { content: q.option_3 },
            { content: q.option_4 }
        ].filter(opt => opt.content)
    }

    const isImageUrl = (url: string) => {
        return typeof url === 'string' && (url.startsWith('http') || /\.(png|jpe?g|gif|webp)$/i.test(url)) && url.length < 500
    }

    const options = getOptions(currentQuestion)

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with Timer */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg">
                            <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                        </div>
                        <span className="text-base md:text-xl font-black text-blue-700 tracking-tighter">KOREA LINK</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 ml-auto">
                        {/* Timer Đọc - đang chạy */}
                        <div className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-4 py-1 md:py-2 rounded-lg ${timeLeft < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'
                            }`}>
                            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <div className="text-center">
                                <p className="text-[9px] md:text-[10px] leading-none mb-0.5">읽기</p>
                                <span className="text-xs md:text-base font-medium font-mono tabular-nums">
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                        </div>
                        {/* Timer Nghe - chưa bắt đầu */}
                        {hasListening && (
                            <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-4 py-1 md:py-2 rounded-lg bg-gray-100 text-gray-400">
                                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <div className="text-center">
                                    <p className="text-[9px] md:text-[10px] leading-none mb-0.5">듣기</p>
                                    <span className="text-xs md:text-base font-medium font-mono tabular-nums">
                                        {formatTime((exam?.listening_duration || 30) * 60)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Question Area */}
                    <div className="lg:col-span-3">
                        <Card className="p-6">
                            <div className="mb-6">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                    Câu {currentIndex + 1}
                                </span>
                            </div>

                            {/* Question content - Question Text always first */}
                            {/* Question Text - Always at the top */}
                            <div className="mb-8">
                                <div
                                    className="prose prose-sm max-w-none text-lg text-gray-900"
                                    dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
                                />
                            </div>

                            {/* Question Image */}
                            {currentQuestion.question_image_url && (
                                <div className="mb-4 flex justify-center">
                                    <img
                                        src={currentQuestion.question_image_url}
                                        alt="Question"
                                        className="max-h-72 w-auto object-contain rounded-lg border shadow-sm"
                                    />
                                </div>
                            )}

                            {/* Passage - Always after question and image */}
                            {currentQuestion.passage && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                                    <div
                                        className="prose prose-sm max-w-none text-gray-800"
                                        dangerouslySetInnerHTML={{ __html: currentQuestion.passage }}
                                    />
                                </div>
                            )}

                            {/* Options */}
                            <div className="mt-8">
                                {options.length === 0 ? (
                                    <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
                                        ⚠️ Câu hỏi này chưa có đáp án trong hệ thống
                                    </div>
                                ) : (
                                    <div className={`grid gap-4 ${
                                        options.length === 2 ? 'grid-cols-1 max-w-2xl mx-auto' :
                                        options.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                                        'grid-cols-2'
                                    }`}>
                                        {options.map((opt: any, idx: number) => {
                                            const isSelected = answers[currentQuestion.id] === idx
                                            const optionText = typeof opt === 'string' ? opt : opt.content || opt.text || ''
                                            const isImg = opt.type === 'image' || isImageUrl(optionText)

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleAnswerSelect(currentQuestion.id, idx)}
                                                    className={`relative w-full min-h-[70px] md:min-h-[120px] text-left p-3 md:p-6 pt-6 md:pt-8 rounded-lg md:rounded-2xl border transition-all ${isSelected
                                                        ? 'border-blue-400 bg-blue-50'
                                                        : 'border-gray-200 hover:border-blue-300 bg-white hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {/* Option number at top-left corner */}
                                                    <div className="absolute -top-2.5 left-3 md:-top-3 md:left-4">
                                                        <div className={`w-5 h-5 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-base font-medium md:font-bold border ${isSelected
                                                            ? 'bg-blue-500 text-white border-blue-500'
                                                            : 'bg-white text-gray-500 border-gray-200'
                                                            }`}>
                                                            {idx + 1}
                                                        </div>
                                                    </div>

                                                    {/* Answer content */}
                                                    <div className="flex items-center h-full">
                                                        {isImg ? (
                                                            <img
                                                                src={optionText}
                                                                alt={`Option ${idx + 1}`}
                                                                className="max-h-28 w-auto rounded border shadow-sm mx-auto"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="prose prose-sm max-w-none text-gray-900 w-full text-sm md:text-base [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic"
                                                                dangerouslySetInnerHTML={{ __html: optionText }}
                                                            />
                                                        )}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between mt-8 pt-6 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={currentIndex === 0}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    이전
                                </Button>

                                <Button
                                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                                    disabled={currentIndex === questions.length - 1}
                                >
                                    다음
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Question List Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="p-4 sticky top-24 flex flex-col max-h-[calc(100vh-6rem)]">
                            {/* Show button only when all reading questions are answered */}
                            {allAnsweredReading && (
                                <Button
                                    onClick={() => handleNext(false)}
                                    disabled={isSubmitting}
                                    className={`w-full mb-4 shadow-sm font-semibold ${hasListening ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'}`}
                                >
                                    {isSubmitting ? 'Đang lưu...' : (hasListening ? 'Chuyển Nghe' : 'Nộp bài ngay')}
                                </Button>
                            )}

                            <h3 className="font-semibold mb-3 pb-2 border-b text-center">Danh sách câu hỏi</h3>
                            <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 overflow-y-auto pr-1 pb-2">
                                {allQuestions.map((q, idx) => {
                                    const isReading = q.section === 'reading'
                                    const readingIdx = isReading ? questions.findIndex(rq => rq.id === q.id) : -1
                                    const isCurrentQuestion = isReading && readingIdx === currentIndex
                                    const isAnswered = answers[q.id] !== undefined

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => {
                                                if (isReading && readingIdx !== -1) {
                                                    setCurrentIndex(readingIdx)
                                                }
                                            }}
                                            disabled={!isReading}
                                            className={`aspect-square rounded-md font-medium text-xs transition-all ${
                                                isCurrentQuestion
                                                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                                                    : isReading && isAnswered
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : isReading
                                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    )
                                })}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
