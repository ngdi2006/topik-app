'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Clock, Headphones, AlertCircle, Volume2, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function ListeningPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()

    const examId = params.id as string
    const attemptId = searchParams.get('attemptId')

    const [questions, setQuestions] = useState<any[]>([]) // Only listening questions for display
    const [allQuestions, setAllQuestions] = useState<any[]>([]) // All questions (reading + listening) for sidebar
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [readingAnswers, setReadingAnswers] = useState<Record<string, number>>({}) // Store reading answers
    const [timeLeft, setTimeLeft] = useState(0) // Tổng thời gian Nghe
    const [questionTimeLeft, setQuestionTimeLeft] = useState(0) // Thời gian cho câu hiện tại
    const [audioPlaying, setAudioPlaying] = useState(false)
    const [audioEnded, setAudioEnded] = useState(false)
    const [audioError, setAudioError] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [exam, setExam] = useState<any>(null)
    const [readingCount, setReadingCount] = useState(0)
    const [allowNavigation, setAllowNavigation] = useState(false)

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const questionTimerRef = useRef<NodeJS.Timeout | null>(null)

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

                const listeningQuestions = data.attempt.questions.filter(
                    (q: any) => q.section === 'listening'
                )

                if (listeningQuestions.length === 0) {
                    toast.error('Đề thi không có phần nghe hiểu')
                    router.push(`/exam/${examId}/submit?attemptId=${attemptId}`)
                    return
                }

                // Count reading questions for continuous numbering
                const readingQuestions = data.attempt.questions.filter(
                    (q: any) => q.section === 'reading'
                )
                setReadingCount(readingQuestions.length)

                // Load saved reading answers
                if (data.attempt.answers && data.attempt.answers.length > 0) {
                    const savedReadingAnswers: Record<string, number> = {}
                    data.attempt.answers.forEach((a: any) => {
                        if (a.section === 'reading' && a.selected_option !== null) {
                            savedReadingAnswers[a.question_id] = a.selected_option
                        }
                    })
                    setReadingAnswers(savedReadingAnswers)
                }

                // Set all questions for sidebar (reading + listening)
                setAllQuestions(data.attempt.questions)
                setQuestions(listeningQuestions)
                setExam(data.exam)
                setTimeLeft((data.exam.listening_duration || 30) * 60)
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

    // Total time countdown
    useEffect(() => {
        if (timeLeft <= 0 || isLoading) return

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleSubmitAll()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLeft, isLoading])

    const handleSubmitAll = useCallback(async () => {
        if (isSubmitting) return
        setIsSubmitting(true)
        setAllowNavigation(true) // Allow navigation when submitting

        if (questionTimerRef.current) {
            clearInterval(questionTimerRef.current)
        }

        try {
            // Save listening answers
            const listeningAnswers = questions.map((q) => ({
                question_id: q.id,
                selected_option: answers[q.id] !== undefined ? answers[q.id] : null,
            }))

            const res = await fetch(`/api/exams/${examId}/attempt/${attemptId}/save-section`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section: 'listening',
                    answers: listeningAnswers,
                }),
            })

            const data = await res.json()
            if (!data.success) {
                throw new Error(data.error)
            }

            toast.success('Đã lưu phần Nghe hiểu!')
            router.push(`/exam/${examId}/submit?attemptId=${attemptId}`)
        } catch (error: any) {
            toast.error(error.message || 'Lỗi nộp bài')
            setIsSubmitting(false)
        }
    }, [isSubmitting, questions, answers, examId, attemptId, router])

    const startQuestionTimer = useCallback((question: any, questionIndex: number) => {
        const timeLimit = question.time_per_question || 15
        setQuestionTimeLeft(timeLimit)

        questionTimerRef.current = setInterval(() => {
            setQuestionTimeLeft((prev) => {
                if (prev <= 1) {
                    if (questionTimerRef.current) {
                        clearInterval(questionTimerRef.current)
                    }

                    // Chỉ chuyển câu, KHÔNG nộp bài
                    // Nộp bài chỉ xảy ra khi hết thời gian TỔNG (trong useEffect timeLeft)
                    if (questionIndex < questions.length - 1) {
                        setCurrentIndex(questionIndex + 1)
                    }
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [questions.length])

    const handleAudioEnded = () => {
        setAudioPlaying(false)
        setAudioEnded(true)
        const currentQ = questions[currentIndex]
        if (currentQ) {
            startQuestionTimer(currentQ, currentIndex)
        }
    }

    const handleAnswerSelect = (optionIndex: number) => {
        const currentQ = questions[currentIndex]
        if (!currentQ) return

        setAnswers((prev) => ({
            ...prev,
            [currentQ.id]: optionIndex,
        }))
    }

    // Auto-play audio when question changes
    useEffect(() => {
        if (questions.length === 0 || isLoading) return

        const currentQ = questions[currentIndex]
        if (!currentQ) return

        setAudioEnded(false)
        setAudioError(false)

        // Clear previous timer
        if (questionTimerRef.current) {
            clearInterval(questionTimerRef.current)
        }

        // Auto-play audio
        if (currentQ.audio_url && audioRef.current) {
            audioRef.current.src = currentQ.audio_url
            audioRef.current.load() // Preload audio

            // Try to play
            const playPromise = audioRef.current.play()

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setAudioPlaying(true)
                }).catch((err) => {
                    console.error('Audio play error:', err)
                    setAudioError(true)
                    // Don't start timer yet - wait for user to manually play
                })
            }
        } else {
            // No audio - start countdown immediately
            startQuestionTimer(currentQ, currentIndex)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex, questions, isLoading])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getOptions = (q: any) => {
        if (Array.isArray(q.options)) {
            return q.options
        }
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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Đang tải câu hỏi nghe...</p>
                </div>
            </div>
        )
    }

    const currentQuestion = questions[currentIndex]
    if (!currentQuestion) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Không có câu hỏi</h2>
                    <Button onClick={() => router.push('/dashboard')}>
                        Quay lại Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    const options = getOptions(currentQuestion)
    const isLastQuestion = currentIndex === questions.length - 1

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                onEnded={handleAudioEnded}
                onPlay={() => setAudioPlaying(true)}
                onPause={() => setAudioPlaying(false)}
                preload="auto"
                playsInline
                className="hidden"
            />

            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Headphones className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                듣기
                            </h1>
                            <p className="text-sm text-gray-600">
                                {exam?.title}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Timer Đọc - đã dừng */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-400">
                            <Clock className="w-5 h-5" />
                            <div>
                                <p className="text-xs">읽기</p>
                                <span className="text-xl font-bold font-mono tabular-nums">
                                    00:00
                                </span>
                            </div>
                        </div>
                        {/* Timer Nghe - đang chạy */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeLeft < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-purple-100 text-purple-700'
                            }`}>
                            <Clock className="w-5 h-5" />
                            <div>
                                <p className="text-xs">듣기</p>
                                <span className="text-xl font-bold font-mono tabular-nums">
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Question Area */}
                    <div className="lg:col-span-3">
                        <Card className="p-6">
                            {/* Audio Error - Manual Play Button */}
                            {audioError && !audioPlaying && !audioEnded && (
                                <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Volume2 className="w-6 h-6 text-yellow-600" />
                                            <p className="text-yellow-700 font-medium">
                                                Nhấn nút để phát audio
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (audioRef.current) {
                                                    audioRef.current.play().then(() => {
                                                        setAudioPlaying(true)
                                                        setAudioError(false)
                                                    }).catch((err) => {
                                                        console.error('Manual play error:', err)
                                                        toast.error('Không thể phát audio. Vui lòng kiểm tra lại.')
                                                    })
                                                }
                                            }}
                                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold flex items-center gap-2"
                                        >
                                            <Volume2 className="w-5 h-5" />
                                            Phát Audio
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Audio Status */}
                            {audioPlaying && (
                                <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Volume2 className="w-6 h-6 text-blue-600" />
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                                        </div>
                                        <p className="text-blue-700 font-medium">
                                            🎧 Đang phát audio... Hãy lắng nghe
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Question Time Countdown */}
                            {audioEnded && questionTimeLeft > 0 && (
                                <div className="mb-6 flex items-start justify-end">
                                    <div className="text-4xl font-black text-orange-600 font-mono tabular-nums">
                                        {questionTimeLeft}
                                    </div>
                                </div>
                            )}

                            {/* Question Number */}
                            <div className="mb-6">
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                    Câu {readingCount + currentIndex + 1}
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
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-purple-500">
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
                                    <div className={`grid gap-4 ${options.length === 2 ? 'grid-cols-1 max-w-2xl mx-auto' :
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
                                                    onClick={() => handleAnswerSelect(idx)}
                                                    className={`relative w-full min-h-[120px] text-left p-6 pt-8 rounded-2xl border-2 transition-all ${isSelected
                                                        ? 'border-purple-500 bg-purple-50'
                                                        : 'border-gray-300 hover:border-purple-300 bg-white hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {/* Option number at top-left corner */}
                                                    <div className="absolute -top-3 left-4">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-bold border-2 ${isSelected
                                                            ? 'bg-purple-500 text-white border-purple-500'
                                                            : 'bg-white text-gray-700 border-gray-400'
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
                                                                className="prose prose-sm max-w-none text-gray-900 w-full [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic"
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
                        </Card>
                    </div>

                    {/* Question List Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="p-4 sticky top-24 flex flex-col max-h-[calc(100vh-6rem)]">
                            {/* Nút Nộp Bài - chỉ hiển thị ở câu cuối */}
                            {isLastQuestion && (
                                <Button
                                    onClick={handleSubmitAll}
                                    disabled={isSubmitting}
                                    size="lg"
                                    className="w-full mb-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {isSubmitting ? 'Đang nộp bài...' : 'Nộp Bài'}
                                </Button>
                            )}

                            <h3 className="font-semibold mb-3 pb-2 border-b text-center">Danh sách câu hỏi</h3>
                            <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 overflow-y-auto pr-1 pb-2">
                                {allQuestions.map((q, idx) => {
                                    const isListening = q.section === 'listening'
                                    const listeningIdx = isListening ? questions.findIndex(lq => lq.id === q.id) : -1
                                    const isCurrentQuestion = isListening && listeningIdx === currentIndex
                                    const isAnswered = isListening
                                        ? answers[q.id] !== undefined
                                        : readingAnswers[q.id] !== undefined

                                    return (
                                        <button
                                            key={q.id}
                                            disabled
                                            className={`aspect-square rounded-lg font-semibold text-sm transition-all cursor-not-allowed ${isCurrentQuestion
                                                ? 'bg-purple-500 text-white ring-2 ring-purple-300'
                                                : isAnswered
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-700'
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
