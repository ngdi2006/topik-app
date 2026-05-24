'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { InterviewQuestionForm } from '@/components/admin/InterviewQuestionForm'
import { toast } from 'sonner'

export default function EditInterviewQuestionPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    
    const [initialData, setInitialData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchQuestion = async () => {
            try {
                const res = await fetch(`/api/admin/interview-questions/${id}`)
                const data = await res.json()
                if (data.success) {
                    setInitialData(data.data)
                } else {
                    toast.error('Không tìm thấy câu hỏi')
                    router.push('/admin/interview-module')
                }
            } catch (error) {
                toast.error('Lỗi tải dữ liệu')
            } finally {
                setLoading(false)
            }
        }

        fetchQuestion()
    }, [id, router])

    if (loading) return <div className="text-center py-20">Đang tải...</div>
    if (!initialData) return null

    return <InterviewQuestionForm initialData={initialData} isEdit={true} />
}
