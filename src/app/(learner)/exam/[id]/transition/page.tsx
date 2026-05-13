'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle, Headphones } from 'lucide-react'

export default function TransitionPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()

    const examId = params.id as string
    const attemptId = searchParams.get('attemptId')

    const handleStartListening = () => {
        if (!attemptId) {
            router.push(`/exam/${examId}/start`)
            return
        }
        router.push(`/exam/${examId}/listening?attemptId=${attemptId}`)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full p-8">
                {/* Success Icon */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Hoàn thành Phần Đọc Hiểu!
                    </h1>
                    <p className="text-gray-600">
                        Bạn đã hoàn thành phần đọc hiểu. Giờ chuyển sang phần nghe hiểu.
                    </p>
                </div>

                {/* Divider */}
                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-4 text-sm text-gray-500">Tiếp theo</span>
                    </div>
                </div>

                {/* Listening Section Info */}
                <div className="bg-purple-50 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Headphones className="w-8 h-8 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                Phần nghe hiểu
                            </h2>
                            <p className="text-gray-700">
                                Không thể quay lại câu đã làm
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                        size="lg"
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
                        onClick={handleStartListening}
                    >
                        <Headphones className="w-5 h-5 mr-2" />
                        Bắt Đầu Nghe Hiểu
                    </Button>
                </div>

                <p className="text-center text-sm text-gray-500 mt-4">
                    Nhấn nút khi bạn đã sẵn sàng
                </p>
            </Card>
        </div>
    )
}
