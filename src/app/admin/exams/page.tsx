"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Search, Plus, Edit, Trash2, Eye, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

export default function AdminExamsPage() {
    const router = useRouter()
    const [exams, setExams] = useState<any[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedExam, setSelectedExam] = useState<any>(null)
    const [examQuestions, setExamQuestions] = useState<any[]>([])
    const [isFetchingQuestions, setIsFetchingQuestions] = useState(false)
    const supabase = createClient()

    const fetchExams = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/admin/exams')
            const data = await res.json()
            if (data.exams) setExams(data.exams)
        } catch (error) {
            console.error("Failed to fetch exams", error)
            toast.error("Không tải được dữ liệu đề thi")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchExams()
    }, [])

    const handleViewConfig = async (exam: any) => {
        setSelectedExam(exam)
        setIsFetchingQuestions(true)
        try {
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('exam_id', exam.id)
                .order('order_index', { ascending: true })

            if (error) throw error
            setExamQuestions(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Không thể tải cấu hình câu hỏi")
        } finally {
            setIsFetchingQuestions(false)
        }
    }

    const handleGenerateExam = async () => {
        setIsGenerating(true)
        const toastId = toast.loading("AI đang phân tích và sinh đề thi tự động...")

        try {
            const response = await fetch('/api/generate-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: "Văn hóa Hàn Quốc", level: "TOPIK II" }),
            })

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate");
            }

            toast.success("AI đã phân tích và sinh đề thi rực rỡ thành công vào DB!", { id: toastId })

            fetchExams()
        } catch (error: any) {
            console.error(error)
            toast.error("Lỗi sinh đề: " + error.message, { id: toastId })
        } finally {
            setIsGenerating(false)
        }
    }

    const handleCreateExam = async () => {
        const toastId = toast.loading("Đang tạo đề thi mới...")
        try {
            const res = await fetch('/api/admin/exams', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast.success("Tạo đề thi thành công!", { id: toastId })
            router.push(`/admin/exams/${data.exam.id}`)
        } catch (error: any) {
            toast.error(error.message || "Tạo đề thất bại.", { id: toastId })
        }
    }

    const handleDeleteExam = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn đề thi "${name}"? Toàn bộ câu hỏi và kết quả thi sẽ bị xóa.`)) return;

        const toastId = toast.loading("Đang xóa...")
        try {
            const res = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast.success("Đã xóa đề thi!", { id: toastId })
            setExams(exams.filter(e => e.id !== id))
        } catch (error: any) {
            toast.error(error.message || "Xóa đề thi thất bại.", { id: toastId })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Quản lý Đề thi</h2>
                    <p className="text-muted-foreground">
                        Tạo mới, chỉnh sửa và cấu hình ngân hàng đề thi TOPIK. Thử nghiệm AI Sinh Đề.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleGenerateExam} disabled={isGenerating} variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800">
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isGenerating ? "Đang sinh đề..." : "AI Auto Gen"}
                    </Button>
                    <Button onClick={handleCreateExam}>
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo đề thi mới
                    </Button>
                </div>
            </div>

            <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-gray-200">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Tìm kiếm đề thi..."
                    className="flex-1 border-none focus:ring-0 outline-none text-sm"
                />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                        <tr>
                            <th className="px-6 py-4 font-medium">Mã Đề</th>
                            <th className="px-6 py-4 font-medium">Tên Đề thi</th>
                            <th className="px-6 py-4 font-medium">Cấp độ</th>
                            <th className="px-6 py-4 font-medium">Thời gian</th>
                            <th className="px-6 py-4 font-medium">Câu hỏi</th>
                            <th className="px-6 py-4 font-medium">Trạng thái</th>
                            <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                                    Đang tải dữ liệu Đề thi từ Hệ thống...
                                </td>
                            </tr>
                        ) : exams.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                                    Chưa có đề thi nào trong ngân hàng. Bấm "AI Auto Gen" để sinh thử!
                                </td>
                            </tr>
                        ) : (
                            exams.map((exam) => (
                                <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[100px]">{exam.id}</td>
                                    <td className="px-6 py-4 font-medium">
                                        {exam.title}
                                        {exam.is_ai_generated && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                                                AI Gen
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${exam.level === 'TOPIK I' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {exam.level}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{exam.duration} phút</td>
                                    <td className="px-6 py-4 text-gray-500">{exam.total_questions} câu</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${exam.status === 'Published' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {exam.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600" onClick={() => window.open(`/exam/${exam.id}`, '_blank')}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => router.push(`/admin/exams/${exam.id}`)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteExam(exam.id, exam.title)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Config Dialog */}
            <Dialog open={!!selectedExam} onOpenChange={(open) => !open && setSelectedExam(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Cấu hình Đề thi: <span className="text-primary">{selectedExam?.title}</span></DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-6">
                        {isFetchingQuestions ? (
                            <div className="flex justify-center py-12">
                                <span className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent"></span>
                            </div>
                        ) : examQuestions.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Đề thi chưa có câu hỏi nào.</p>
                        ) : (
                            examQuestions.map((q, idx) => (
                                <div key={q.id} className="p-5 border rounded-lg bg-gray-50/50 hover:border-primary/30 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-bold text-primary bg-primary/10 px-3 py-1 rounded-full text-sm">Câu {idx + 1}</h4>
                                    </div>
                                    {q.passage && (
                                        <div className="mb-4 p-4 bg-white border rounded-md text-sm whitespace-pre-wrap text-gray-700 font-medium shadow-sm">
                                            {q.passage}
                                        </div>
                                    )}
                                    <p className="font-semibold text-lg mb-4">{q.question_text}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {Array.isArray(q.options) && q.options.map((opt: string, optIdx: number) => {
                                            const isCorrect = optIdx === q.correct_answer;
                                            return (
                                                <div
                                                    key={optIdx}
                                                    className={`p-3 rounded-md border text-sm flex items-center gap-3 transition-colors ${isCorrect
                                                        ? 'bg-green-50 border-green-500 text-green-900 shadow-sm ring-1 ring-green-500/20'
                                                        : 'bg-white hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {['1', '2', '3', '4'][optIdx]}
                                                    </span>
                                                    <span className={isCorrect ? 'font-medium' : ''}>{opt}</span>
                                                    {isCorrect && <span className="ml-auto text-green-500 font-bold text-xs bg-green-100 px-2 py-1 rounded">Đáp án đúng</span>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
