'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function SubmitPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()

    const examId = params.id as string
    const attemptId = searchParams.get('attemptId')

    const [status, setStatus] = useState<'submitting' | 'grading' | 'complete' | 'error'>('submitting')
    const [progress, setProgress] = useState(0)
    const [errorMsg, setErrorMsg] = useState<string>('')

    useEffect(() => {
        if (!attemptId) {
            router.push(`/exam/${examId}/start`)
            return
        }

        const submitExam = async () => {
            try {
                // Step 1: Submitting
                setStatus('submitting')
                setProgress(30)

                await new Promise(resolve => setTimeout(resolve, 1000))

                // Step 2: Grading
                setStatus('grading')
                setProgress(60)

                const res = await fetch(`/api/exams/${examId}/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attemptId }),
                })

                const data = await res.json()

                if (!data.success) {
                    throw new Error(data.error || 'Lỗi chấm bài')
                }

                // Step 3: Complete
                setStatus('complete')
                setProgress(100)

                await new Promise(resolve => setTimeout(resolve, 1500))

                // Redirect to result
                router.push(`/exam/${examId}/result/${attemptId}`)
            } catch (error: any) {
                console.error('Submit error:', error)
                if (error.message === 'Phiên thi đã được nộp') {
                    router.push(`/exam/${examId}/result/${attemptId}`)
                } else {
                    setErrorMsg(error.message || 'Có lỗi xảy ra')
                    setStatus('error')
                }
            }
        }

        submitExam()
    }, [attemptId, examId, router])

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8">
                <div className="text-center">
                    {/* Icon */}
                    <div className="mb-6">
                        {status === 'complete' ? (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            </div>
                        ) : status === 'error' ? (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
                                <span className="text-4xl">❌</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full">
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {status === 'submitting' && 'Đang nộp bài...'}
                        {status === 'grading' && 'Đang chấm điểm...'}
                        {status === 'complete' && 'Hoàn thành!'}
                        {status === 'error' && 'Có lỗi xảy ra'}
                    </h1>

                    {/* Description */}
                    <p className="text-gray-600 mb-6">
                        {status === 'submitting' && 'Hệ thống đang xử lý bài thi của bạn'}
                        {status === 'grading' && 'AI đang chấm điểm và phân tích kết quả'}
                        {status === 'complete' && 'Bài thi đã được chấm xong'}
                        {status === 'error' && (errorMsg || 'Vui lòng thử lại hoặc liên hệ hỗ trợ')}
                    </p>

                    {/* Progress Bar */}
                    {status !== 'error' && (
                        <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">{progress}%</p>
                        </div>
                    )}

                    {/* Status Messages */}
                    <div className="space-y-2 text-sm text-gray-600">
                        {status === 'submitting' && (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span>Đang lưu câu trả lời...</span>
                            </div>
                        )}
                        {status === 'grading' && (
                            <>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>✓ Đã lưu câu trả lời</span>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span>Đang tính điểm...</span>
                                </div>
                            </>
                        )}
                        {status === 'complete' && (
                            <>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>✓ Đã chấm xong</span>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span>Đang chuyển đến kết quả...</span>
                                </div>
                            </>
                        )}
                    </div>

                    {status === 'error' && (
                        <div className="mt-4">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Quay lại Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
