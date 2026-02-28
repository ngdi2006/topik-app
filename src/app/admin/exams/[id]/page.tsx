"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Edit, Trash2, Save } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"

export default function AdminExamBuilderPage() {
    const params = useParams()
    const router = useRouter()
    const examId = params.id as string

    const [exam, setExam] = useState<any>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingExam, setIsSavingExam] = useState(false)

    // Form state for Exam Meta
    const [metaForm, setMetaForm] = useState({
        title: "",
        level: "TOPIK II",
        duration: 60,
        total_questions: 0,
        status: "Draft"
    })

    // Question Modal state
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
    const [isSavingQuestion, setIsSavingQuestion] = useState(false)
    const [currentEditingQuestion, setCurrentEditingQuestion] = useState<any>(null)

    // Question Form state
    const [qForm, setQForm] = useState({
        passage: "",
        question_text: "",
        options: ["", "", "", ""],
        correct_answer: 0,
        order_index: 0
    })

    const fetchExamData = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/admin/exams/${examId}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setExam(data.exam)
            setMetaForm({
                title: data.exam.title || "",
                level: data.exam.level || "TOPIK II",
                duration: data.exam.duration || 60,
                total_questions: data.exam.total_questions || 0,
                status: data.exam.status || "Draft"
            })
            setQuestions(data.questions || [])
        } catch (error: any) {
            console.error(error)
            toast.error("Không thể tải thông tin Đề thi")
            router.push('/admin/exams')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (examId) fetchExamData()
    }, [examId])

    const handleSaveExamMeta = async () => {
        setIsSavingExam(true)
        const toastId = toast.loading("Đang lưu thông tin Đề thi...")
        try {
            const res = await fetch(`/api/admin/exams/${examId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metaForm)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast.success("Đã lưu thông tin Đề thi!", { id: toastId })
            setExam(data.exam)
        } catch (error: any) {
            toast.error(error.message || "Lưu thất bại", { id: toastId })
        } finally {
            setIsSavingExam(false)
        }
    }

    const handleOpenQuestionModal = (q?: any) => {
        if (q) {
            setCurrentEditingQuestion(q)
            setQForm({
                passage: q.passage || "",
                question_text: q.question_text || "",
                options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["", "", "", ""],
                correct_answer: q.correct_answer !== undefined ? q.correct_answer : 0,
                order_index: q.order_index || 0
            })
        } else {
            setCurrentEditingQuestion(null)
            setQForm({
                passage: "",
                question_text: "",
                options: ["", "", "", ""],
                correct_answer: 0,
                order_index: questions.length
            })
        }
        setIsQuestionModalOpen(true)
    }

    const handleSaveQuestion = async () => {
        if (!qForm.question_text.trim() || qForm.options.some(o => !o.trim())) {
            toast.error("Vui lòng điền đủ câu hỏi và 4 đáp án")
            return
        }

        setIsSavingQuestion(true)
        const toastId = toast.loading("Đang lưu câu hỏi...")
        try {
            const isEdit = !!currentEditingQuestion
            const url = isEdit
                ? `/api/admin/exams/${examId}/questions/${currentEditingQuestion.id}`
                : `/api/admin/exams/${examId}/questions`

            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(qForm)
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast.success(isEdit ? "Cập nhật thành công!" : "Thêm câu hỏi thành công!", { id: toastId })
            setIsQuestionModalOpen(false)
            fetchExamData() // Reload to get updated order and counts
        } catch (error: any) {
            toast.error(error.message || "Lỗi lưu câu hỏi", { id: toastId })
        } finally {
            setIsSavingQuestion(false)
        }
    }

    const handleDeleteQuestion = async (qId: string) => {
        if (!confirm("Xóa vĩnh viễn câu hỏi này?")) return;
        const toastId = toast.loading("Đang xóa...")
        try {
            const res = await fetch(`/api/admin/exams/${examId}/questions/${qId}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast.success("Đã xóa câu hỏi", { id: toastId })
            fetchExamData() // Reload
        } catch (error: any) {
            toast.error(error.message || "Xóa thất bại", { id: toastId })
        }
    }

    if (isLoading) {
        return <div className="min-h-[60vh] flex justify-center items-center text-muted-foreground">Đang tải Builder...</div>
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/exams')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Builder Đề Thi</h2>
                        <p className="text-sm text-muted-foreground">ID: {examId}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Exam Meta */}
                <div className="lg:col-span-1 border rounded-xl bg-white p-6 h-fit sticky top-24 shadow-sm">
                    <h3 className="font-semibold text-lg mb-6 border-b pb-2">Thông tin Đề thi</h3>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label>Tên đề thi</Label>
                            <Input
                                value={metaForm.title}
                                onChange={e => setMetaForm({ ...metaForm, title: e.target.value })}
                                placeholder="VD: TOPIK Mock Test"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Cấp độ</Label>
                            <Select value={metaForm.level} onValueChange={val => setMetaForm({ ...metaForm, level: val })}>
                                <SelectTrigger><SelectValue placeholder="Chọn cấp độ" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TOPIK I">TOPIK I (Cấp 1-2)</SelectItem>
                                    <SelectItem value="TOPIK II">TOPIK II (Cấp 3-6)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Thời lượng (Phút)</Label>
                            <Input
                                type="number"
                                value={metaForm.duration}
                                onChange={e => setMetaForm({ ...metaForm, duration: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Trạng thái hiển thị</Label>
                            <Select value={metaForm.status} onValueChange={val => setMetaForm({ ...metaForm, status: val })}>
                                <SelectTrigger><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Draft">Nháp (Draft)</SelectItem>
                                    <SelectItem value="Published">Xuất bản (Published)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-4 border-t">
                            <Button className="w-full" onClick={handleSaveExamMeta} disabled={isSavingExam}>
                                <Save className="w-4 h-4 mr-2" />
                                {isSavingExam ? "Đang lưu..." : "Lưu Cấu Hình"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Questions List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 border rounded-xl shadow-sm">
                        <h3 className="font-bold text-lg text-gray-800">
                            Danh sách Câu hỏi <span className="text-muted-foreground font-normal text-sm ml-2">({questions.length} câu)</span>
                        </h3>
                        <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenQuestionModal()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Viết câu hỏi mới
                        </Button>
                    </div>

                    {questions.length === 0 ? (
                        <div className="text-center py-16 bg-white border rounded-xl border-dashed">
                            <p className="text-muted-foreground mb-4">Chưa có câu hỏi nào trong đề thi này.</p>
                            <Button variant="outline" onClick={() => handleOpenQuestionModal()}>Tạo câu hỏi đầu tiên</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="bg-white border rounded-xl p-5 hover:border-blue-300 transition-colors shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-white bg-gray-800 px-3 py-1 rounded-md text-sm">Câu {idx + 1}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 bg-blue-50" onClick={() => handleOpenQuestionModal(q)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 bg-red-50" onClick={() => handleDeleteQuestion(q.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {q.passage && (
                                        <div className="mb-3 p-3 bg-gray-50 border rounded-md text-sm text-gray-600 line-clamp-3">
                                            {q.passage}
                                        </div>
                                    )}
                                    <p className="font-semibold text-gray-900 mb-4">{q.question_text}</p>

                                    <div className="grid grid-cols-2 gap-3">
                                        {Array.isArray(q.options) && q.options.map((opt: string, optIdx: number) => {
                                            const isCorrect = optIdx === q.correct_answer;
                                            return (
                                                <div key={optIdx} className={`p-2 rounded text-sm flex items-center gap-2 border ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-100'}`}>
                                                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                        {['1', '2', '3', '4'][optIdx]}
                                                    </span>
                                                    <span className="truncate">{opt}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Modal */}
            <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{currentEditingQuestion ? "Sửa Câu hỏi" : "Tạo Câu hỏi mới"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Đoạn văn / Bài đọc (Tùy chọn)</Label>
                            <Textarea
                                placeholder="Nhập đoạn văn dài dùng chung cho câu hỏi này..."
                                className="min-h-[100px]"
                                value={qForm.passage}
                                onChange={e => setQForm({ ...qForm, passage: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Nội dung Câu hỏi <span className="text-red-500">*</span></Label>
                            <Textarea
                                placeholder="VD: Đáp án nào sau đây nói đúng về..."
                                className="font-medium"
                                value={qForm.question_text}
                                onChange={e => setQForm({ ...qForm, question_text: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3 pt-2">
                            <Label>Các đáp án <span className="text-red-500">*</span></Label>
                            {qForm.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-3">
                                    <span className="font-bold text-gray-400 w-6 text-center">{['1', '2', '3', '4'][oIdx]}</span>
                                    <Input
                                        value={opt}
                                        placeholder={`Nhập đáp án ${oIdx + 1}...`}
                                        onChange={(e: any) => {
                                            const newOps = [...qForm.options]
                                            newOps[oIdx] = e.target.value
                                            setQForm({ ...qForm, options: newOps })
                                        }}
                                        className={qForm.correct_answer === oIdx ? 'border-green-500 bg-green-50/30' : ''}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2 pt-2 border-t mt-4">
                            <Label>Đáp án đúng <span className="text-red-500">*</span></Label>
                            <div className="flex gap-4">
                                {[0, 1, 2, 3].map(idx => (
                                    <Button
                                        key={idx}
                                        type="button"
                                        variant={qForm.correct_answer === idx ? "default" : "outline"}
                                        className={qForm.correct_answer === idx ? 'bg-green-600 hover:bg-green-700' : ''}
                                        onClick={() => setQForm({ ...qForm, correct_answer: idx })}
                                    >
                                        Đáp án {['1', '2', '3', '4'][idx]}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsQuestionModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveQuestion} disabled={isSavingQuestion}>
                            {isSavingQuestion ? "Đang lưu..." : "Lưu Câu hỏi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
