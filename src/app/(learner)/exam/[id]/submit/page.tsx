'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    CheckCircle, Loader2, Trophy, Target, BookOpen,
    ChevronLeft, ChevronRight, XCircle, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'

// ===== Score Display Component =====
function ScoreDisplay({
    result,
    exam,
    examId,
    attemptId,
    router,
}: {
    result: any
    exam: any
    examId: string
    attemptId: string
    router: any
}) {
    const [showAnswers, setShowAnswers] = useState(false)
    const [questions, setQuestions] = useState<any[]>([])
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isLoadingAnswers, setIsLoadingAnswers] = useState(false)

    const percentage = result.total_points > 0
        ? Math.round((result.score / result.total_points) * 100)
        : 0

    let gradeColor = 'text-red-500'
    let bgGrade = 'from-red-50 to-red-100'
    let borderGrade = 'border-red-300'
    let emoji = '😓'
    if (percentage >= 80) {
        gradeColor = 'text-green-600'
        bgGrade = 'from-green-50 to-emerald-100'
        borderGrade = 'border-green-300'
        emoji = '🎉'
    } else if (percentage >= 50) {
        gradeColor = 'text-yellow-600'
        bgGrade = 'from-yellow-50 to-amber-100'
        borderGrade = 'border-yellow-300'
        emoji = '👍'
    }

    const handleViewAnswers = async () => {
        if (questions.length > 0) {
            setShowAnswers(true)
            return
        }
        setIsLoadingAnswers(true)
        try {
            const res = await fetch(`/api/exams/${examId}/result/${attemptId}`)
            const data = await res.json()
            if (data.questions) setQuestions(data.questions)
            if (data.result?.answers) setAnswers(data.result.answers)
            setShowAnswers(true)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoadingAnswers(false)
        }
    }

    // ===== Answer Review Modal =====
    if (showAnswers && questions.length > 0) {
        const q = questions[currentIndex]
        const userAnswerIndex = answers[q.id]
        const hasAnswered = userAnswerIndex !== undefined && userAnswerIndex !== null

        const getOptions = (q: any) => Array.isArray(q.options) ? q.options : []
        const options = getOptions(q)

        const isCorrect = hasAnswered &&
            q.correct_answer !== undefined &&
            Number(userAnswerIndex) === Number(q.correct_answer)

        const isImageUrl = (url: string) =>
            typeof url === 'string' && (url.startsWith('http') || /\.(png|jpe?g|gif|webp)$/i.test(url)) && url.length < 500

        return (
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                    <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowAnswers(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="font-bold text-gray-900">Xem đáp án</h1>
                                <p className="text-xs text-gray-500">{exam?.title}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                                {currentIndex + 1} / {questions.length}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isCorrect
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'}`}>
                                {isCorrect ? '✓ Đúng' : '✗ Sai'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Question Card */}
                    <div className="lg:col-span-3">
                        <Card className="p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                    Câu {currentIndex + 1}
                                </span>
                                {isCorrect
                                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    : <XCircle className="w-5 h-5 text-red-500" />
                                }
                            </div>

                            {/* Passage */}
                            {q.passage && (
                                <div className="mb-5 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                                    <div
                                        className="prose prose-sm max-w-none text-gray-800 text-sm"
                                        dangerouslySetInnerHTML={{ __html: q.passage }}
                                    />
                                </div>
                            )}

                            {/* Question Image */}
                            {q.question_image_url && (
                                <div className="mb-4 flex justify-center">
                                    <img
                                        src={q.question_image_url}
                                        alt="Question"
                                        className="max-h-60 w-auto object-contain rounded-lg border shadow-sm"
                                    />
                                </div>
                            )}

                            {/* Question Text */}
                            <div className="mb-6">
                                <div
                                    className="prose prose-sm max-w-none text-gray-900 text-base"
                                    dangerouslySetInnerHTML={{ __html: q.question_text }}
                                />
                            </div>

                            {/* Options */}
                            <div className="space-y-3">
                                {options.map((optItem: any, idx: number) => {
                                    const optContent = typeof optItem === 'string' ? optItem : (optItem?.content || '')
                                    const optType = typeof optItem === 'object' ? optItem?.type : 'text'
                                    const isImg = optType === 'image' || isImageUrl(optContent)

                                    const isUserChoice = userAnswerIndex === idx
                                    const isActualCorrect = q.correct_answer !== undefined &&
                                        idx === Number(q.correct_answer)

                                    let cls = 'border-gray-200 bg-white'
                                    if (isActualCorrect) cls = 'border-green-500 bg-green-50'
                                    else if (isUserChoice && !isCorrect) cls = 'border-red-500 bg-red-50'

                                    return (
                                        <div key={idx} className={`p-4 rounded-lg border-2 ${cls} flex items-start gap-3 transition-all`}>
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                                ${isActualCorrect ? 'bg-green-500 text-white'
                                                    : isUserChoice && !isCorrect ? 'bg-red-500 text-white'
                                                    : 'bg-gray-200 text-gray-700'}`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                {isImg ? (
                                                    <img src={optContent} alt={`Option ${idx + 1}`} className="max-h-32 object-contain rounded" />
                                                ) : (
                                                    <div
                                                        className="prose prose-sm max-w-none text-gray-900 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic"
                                                        dangerouslySetInnerHTML={{ __html: optContent }}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-shrink-0 flex flex-col gap-1">
                                                {isUserChoice && (
                                                    <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Của bạn</span>
                                                )}
                                                {isActualCorrect && !isUserChoice && (
                                                    <span className="text-xs font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded">Đáp án</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {!hasAnswered && (
                                <p className="mt-4 text-sm text-red-500 italic">Bạn đã bỏ trống câu hỏi này!</p>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between mt-8 pt-5 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                                    disabled={currentIndex === 0}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Câu trước
                                </Button>
                                <Button
                                    onClick={() => setCurrentIndex(p => Math.min(questions.length - 1, p + 1))}
                                    disabled={currentIndex === questions.length - 1}
                                >
                                    Câu sau
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar - Question List */}
                    <div className="lg:col-span-1">
                        <Card className="p-4 sticky top-20">
                            <h3 className="font-semibold mb-3 pb-2 border-b text-sm">Danh sách câu</h3>
                            <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto pb-1">
                                {questions.map((question, idx) => {
                                    const uAns = answers[question.id]
                                    const hasAns = uAns !== undefined && uAns !== null
                                    const isOk = hasAns && Number(uAns) === Number(question.correct_answer)

                                    return (
                                        <button
                                            key={question.id}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`aspect-square rounded-lg font-semibold text-xs transition-all
                                                ${idx === currentIndex
                                                    ? 'ring-2 ring-offset-1 ring-blue-400 bg-blue-500 text-white'
                                                    : isOk
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : hasAns
                                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="mt-4 pt-3 border-t space-y-2">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span className="w-4 h-4 rounded bg-green-100 inline-block"></span> Đúng
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span className="w-4 h-4 rounded bg-red-100 inline-block"></span> Sai
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span className="w-4 h-4 rounded bg-gray-100 inline-block"></span> Bỏ trống
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full mt-4 text-sm"
                                onClick={() => router.push('/dashboard')}
                            >
                                Về trang chủ
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        )
    }

    // ===== Score Summary =====
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-4">
                {/* Score Card */}
                <Card className={`border-2 ${borderGrade} overflow-hidden shadow-xl`}>
                    <div className={`bg-gradient-to-br ${bgGrade} p-8 text-center`}>
                        <div className="text-5xl mb-3">{emoji}</div>
                        <h2 className="text-xl font-bold text-gray-700 mb-1">{exam?.title}</h2>
                        <p className="text-sm text-gray-500 mb-6">Bài thi đã hoàn thành</p>

                        {/* Big Score */}
                        <div className="mb-6">
                            <div className={`text-7xl font-black ${gradeColor} leading-none`}>
                                {result.score}
                            </div>
                            <div className="text-gray-500 text-sm mt-1">
                                / {result.total_points} điểm &nbsp;·&nbsp; {percentage}%
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex justify-center gap-8">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{result.correct_count}</div>
                                <div className="text-xs text-gray-500 uppercase">Câu đúng</div>
                            </div>
                            <div className="w-px bg-gray-300"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-500">{result.wrong_count}</div>
                                <div className="text-xs text-gray-500 uppercase">Câu sai</div>
                            </div>
                            <div className="w-px bg-gray-300"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-600">
                                    {result.blank_count || 0}
                                </div>
                                <div className="text-xs text-gray-500 uppercase">Bỏ trống</div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                    <Button
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700 shadow-md"
                        onClick={handleViewAnswers}
                        disabled={isLoadingAnswers}
                    >
                        {isLoadingAnswers ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang tải...</>
                        ) : (
                            <><BookOpen className="w-5 h-5 mr-2" /> Xem đáp án</>
                        )}
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push('/dashboard')}
                    >
                        Về trang chủ
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ===== Main Submit Page =====
export default function SubmitPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()

    const examId = params.id as string
    const attemptId = searchParams.get('attemptId')

    const [status, setStatus] = useState<'submitting' | 'grading' | 'complete' | 'error'>('submitting')
    const [progress, setProgress] = useState(0)
    const [resultData, setResultData] = useState<any>(null)
    const [examData, setExamData] = useState<any>(null)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        if (!attemptId) {
            router.push(`/exam/${examId}/start`)
            return
        }

        const submitExam = async () => {
            try {
                setStatus('submitting')
                setProgress(30)
                await new Promise(resolve => setTimeout(resolve, 800))

                setStatus('grading')
                setProgress(65)

                const res = await fetch(`/api/exams/${examId}/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attemptId }),
                })

                const data = await res.json()

                if (!data.success) {
                    throw new Error(data.error || 'Lỗi chấm bài')
                }

                setProgress(100)

                // Fetch full attempt data for display
                const resultRes = await fetch(`/api/exams/${examId}/result/${attemptId}`)
                const resultJson = await resultRes.json()
                setResultData(resultJson.result)
                setExamData(resultJson.exam)

                setStatus('complete')
            } catch (error: any) {
                console.error('Submit error:', error)
                if (error.message?.includes('Unauthorized')) {
                    toast.error('Tài khoản của bạn đang đăng nhập ở một thiết bị khác. Vui lòng đăng nhập lại.')
                    router.push('/')
                    return
                }
                setErrorMessage(error.message || 'Lỗi không xác định')
                setStatus('error')
            }
        }

        submitExam()
    }, [attemptId, examId, router])

    // Show score page when done
    if (status === 'complete' && resultData && examData) {
        return (
            <ScoreDisplay
                result={resultData}
                exam={examData}
                examId={examId}
                attemptId={attemptId!}
                router={router}
            />
        )
    }

    // Loading / Error State
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
            <Card className="max-w-sm w-full p-8">
                <div className="text-center">
                    <div className="mb-6">
                        {status === 'error' ? (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
                                <XCircle className="w-12 h-12 text-red-500" />
                            </div>
                        ) : (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full">
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                            </div>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {status === 'submitting' && 'Đang nộp bài...'}
                        {status === 'grading' && 'Đang chấm điểm...'}
                        {status === 'error' && 'Có lỗi xảy ra'}
                    </h1>

                    <p className="text-gray-500 mb-6 text-sm">
                        {status === 'submitting' && 'Hệ thống đang xử lý bài thi của bạn'}
                        {status === 'grading' && 'Đang tính điểm và lưu kết quả'}
                        {status === 'error' && (errorMessage || 'Vui lòng thử lại hoặc liên hệ hỗ trợ')}
                    </p>

                    {status !== 'error' && (
                        <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-700"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{progress}%</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <Button onClick={() => router.push('/dashboard')} className="w-full">
                            Quay lại Dashboard
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    )
}
