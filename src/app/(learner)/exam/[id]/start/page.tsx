'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Clock, BookOpen, Headphones, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function ExamStartPage() {
    const params = useParams()
    const router = useRouter()
    const examId = params.id as string

    const [exam, setExam] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isStarting, setIsStarting] = useState(false)

    useEffect(() => {
        const fetchExam = async () => {
            try {
                const res = await fetch(`/api/admin/exams/${examId}`)
                const data = await res.json()
                if (data.success) {
                    setExam(data.data)
                } else {
                    toast.error('Không tìm thấy đề thi')
                    router.push('/learner/dashboard')
                }
            } catch (error) {
                toast.error('Lỗi tải đề thi')
            } finally {
                setIsLoading(false)
            }
        }

        if (examId) fetchExam()
    }, [examId, router])

    const handleStartExam = async () => {
        setIsStarting(true)
        const toastId = toast.loading('Đang chuẩn bị đề thi...')

        try {
            const res = await fetch(`/api/exams/${examId}/start`, {
                method: 'POST',
            })
            const data = await res.json()

            if (!data.success) {
                throw new Error(data.error || 'Không thể bắt đầu thi')
            }

            toast.success('Bắt đầu làm bài!', { id: toastId })

            // Redirect to reading section
            router.push(`/exam/${examId}/reading?attemptId=${data.attempt.id}`)
        } catch (error: any) {
            toast.error(error.message || 'Lỗi bắt đầu thi', { id: toastId })
            setIsStarting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Đang tải...</p>
                </div>
            </div>
        )
    }

    if (!exam) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Không tìm thấy đề thi</h2>
                    <Button onClick={() => router.push('/learner/dashboard')}>
                        Quay lại Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {exam.title}
                        </h1>
                    </div>

                    {/* Exam Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-1">Tổng thời gian</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {exam.duration} phút
                            </p>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <BookOpen className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-1">Đọc hiểu</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {exam.reading_duration || 0} phút
                            </p>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                            <Headphones className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-1">Nghe hiểu</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {exam.listening_duration || 0} phút
                            </p>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                        <div className="flex">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-yellow-900 mb-2">
                                    Lưu ý quan trọng:
                                </h3>
                                <ul className="text-sm text-yellow-800 space-y-1">
                                    <li>• <strong>Phần Đọc hiểu:</strong> Bạn có thể qua lại giữa các câu hỏi</li>
                                    <li>• <strong>Phần Nghe hiểu:</strong> Không được quay lại câu đã làm</li>
                                    <li>• Audio chỉ phát 1 lần duy nhất</li>
                                    <li>• Sau khi hết thời gian, hệ thống tự động chuyển câu</li>
                                    <li>• Đảm bảo kết nối internet ổn định</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Start Button */}
                    <div className="text-center">
                        <Button
                            size="lg"
                            className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            onClick={handleStartExam}
                            disabled={isStarting}
                        >
                            {isStarting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Đang chuẩn bị...
                                </>
                            ) : (
                                <>
                                    Bắt Đầu Làm Bài
                                </>
                            )}
                        </Button>
                        <p className="text-sm text-gray-500 mt-4">
                            Nhấn nút để bắt đầu. Bạn sẽ không thể tạm dừng sau khi bắt đầu.
                        </p>
                    </div>
                </div>

                {/* Back Button */}
                <div className="text-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/learner/dashboard')}
                        disabled={isStarting}
                    >
                        ← Quay lại Dashboard
                    </Button>
                </div>
            </div>
        </div>
    )
}
