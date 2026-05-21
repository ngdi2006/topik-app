'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, BookOpen, Headphones, AlertCircle, Coins, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { PaymentModal } from '@/components/payment/PaymentModal'

export default function ExamStartPage() {
    const params = useParams()
    const router = useRouter()
    const examId = params.id as string

    const [exam, setExam] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isStarting, setIsStarting] = useState(false)
    const [accessInfo, setAccessInfo] = useState<any>(null)
    const [accessLoaded, setAccessLoaded] = useState(false)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch exam details
                const examRes = await fetch(`/api/admin/exams/${examId}`)
                const examData = await examRes.json()
                if (examData.success) {
                    setExam(examData.data)
                } else {
                    toast.error('Không tìm thấy đề thi')
                    router.push('/dashboard')
                    return
                }

                // Check access
                if (examData.data.is_free) {
                    setAccessInfo({
                        can_access: true,
                        exam: { id: examData.data.id, title: examData.data.title, is_free: true },
                        user_credits: 0,
                        previous_attempts: [],
                        message: 'Đề thi miễn phí - không giới hạn lượt'
                    })
                } else {
                    const accessRes = await fetch(`/api/exams/${examId}/check-access`)
                    if (!accessRes.ok) {
                        let errorMsg = 'Không thể kiểm tra quyền truy cập'
                        try {
                            const errData = await accessRes.json()
                            errorMsg = `Lỗi: ${errData.error || errData.message || accessRes.status}`
                            if (errData.details) errorMsg += ` - ${JSON.stringify(errData.details)}`
                        } catch (e) {}

                        setAccessInfo({ 
                            can_access: false, 
                            user_credits: 0, 
                            previous_attempts: [], 
                            message: errorMsg
                        })
                    } else {
                        const accessData = await accessRes.json()
                        setAccessInfo(accessData)
                    }
                }
                setAccessLoaded(true)
            } catch (error) {
                toast.error('Lỗi tải đề thi')
            } finally {
                setIsLoading(false)
            }
        }

        if (examId) fetchData()
    }, [examId, router])

    const handleStartExam = async () => {
        // Free exams: skip credit check
        const canStart = exam.is_free || accessInfo?.can_access

        if (!canStart) {
            setPaymentModalOpen(true)
            return
        }

        setIsStarting(true)
        const toastId = toast.loading('Đang chuẩn bị đề thi...')

        try {
            // Start exam (will consume credit internally)
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
                        <div className="flex items-center justify-center gap-2 mb-3">
                            {exam.is_free && (
                                <Badge className="bg-emerald-500">Miễn phí</Badge>
                            )}
                            {accessLoaded && !exam.is_free && accessInfo?.can_access && accessInfo?.debug?.totalAttempts < exam.free_attempts && (
                                <Badge className="bg-emerald-500 gap-1">
                                    Lượt miễn phí
                                </Badge>
                            )}
                            {accessLoaded && !accessInfo?.can_access && !exam.is_free && (
                                <Badge variant="destructive" className="gap-1">
                                    <Coins className="w-3 h-3" />
                                    Cần mua lượt
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {exam.title}
                        </h1>
                        {accessLoaded && !exam.is_free && accessInfo?.can_access && accessInfo?.debug?.totalAttempts < exam.free_attempts && (
                            <p className="text-sm text-emerald-600 font-medium">
                                Bạn còn {exam.free_attempts - (accessInfo?.debug?.totalAttempts || 0)} lượt miễn phí
                            </p>
                        )}
                        {accessLoaded && !exam.is_free && !(accessInfo?.debug?.totalAttempts < exam.free_attempts) && (
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                                <Coins className="w-4 h-4" />
                                Bạn còn {accessInfo?.user_credits || 0} lượt làm bài
                            </p>
                        )}
                        {exam.is_free && (
                            <p className="text-sm text-emerald-600 font-medium">
                                Đề thi miễn phí - Không giới hạn lượt làm bài
                            </p>
                        )}
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

                    {/* Access Warning - only show for paid exams without access */}
                    {accessLoaded && !exam.is_free && !accessInfo?.can_access && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                            <div className="flex">
                                <AlertCircle className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-amber-900 mb-2">
                                        {accessInfo?.message || 'Bạn cần mua lượt làm bài'}
                                    </h3>
                                    <Button
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => setPaymentModalOpen(true)}
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        Mua lượt làm bài
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

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
                                    {exam.is_free || accessInfo?.can_access ? 'Bắt Đầu Làm Bài' : 'Mua lượt để làm bài'}
                                </>
                            )}
                        </Button>
                        {accessLoaded && (
                            <p className="text-sm text-gray-500 mt-4">
                                {exam.is_free || accessInfo?.can_access
                                    ? 'Nhấn nút để bắt đầu. Bạn sẽ không thể tạm dừng sau khi bắt đầu.'
                                    : 'Vui lòng mua lượt làm bài để tiếp tục'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Back Button */}
                <div className="text-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard')}
                        disabled={isStarting}
                    >
                        ← Quay lại Dashboard
                    </Button>
                </div>
            </div>

            <PaymentModal
                open={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onSuccess={() => {
                    setPaymentModalOpen(false)
                    window.location.reload()
                }}
            />
        </div>
    )
}
