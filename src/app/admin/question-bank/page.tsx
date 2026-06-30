'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { MediaUploader } from '@/components/admin/MediaUploader'
import {
    Plus,
    Search,
    Download,
    Upload,
    Edit,
    Trash2,
    FileSpreadsheet,
    Gift,
    Music,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { QuestionBank } from '@/types/exam'

interface Category {
    id: string
    name: string
    icon: string
    color: string
    is_active: boolean
}

interface QuestionWithCategory extends QuestionBank {
    category?: Category
    category_id?: string | null
}

export default function QuestionBankPage() {
    const router = useRouter()
    const [questions, setQuestions] = useState<QuestionWithCategory[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        question_type: '',
        level: '',
        search: '',
        category_id: '',
        freeOnly: false,
    })
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [audioModalQuestion, setAudioModalQuestion] = useState<QuestionWithCategory | null>(null)
    const [audioUrl, setAudioUrl] = useState('')
    const [savingAudio, setSavingAudio] = useState(false)

    const closeAudioModal = () => {
        setAudioModalQuestion(null)
        setAudioUrl('')
    }

    const openAudioModal = (question: QuestionWithCategory) => {
        setAudioModalQuestion(question)
        setAudioUrl(question.audio_url || '')
    }

    const handleSaveAudio = async () => {
        if (!audioModalQuestion) return
        if (!audioUrl) {
            toast.error('Vui lòng upload file audio mới')
            return
        }

        setSavingAudio(true)
        const toastId = toast.loading('Đang lưu audio...')

        try {
            const res = await fetch(`/api/admin/question-bank/${audioModalQuestion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...audioModalQuestion,
                    audio_url: audioUrl,
                }),
            })
            const data = await res.json()

            if (!data.success) {
                throw new Error(data.error || 'Cập nhật audio thất bại')
            }

            setQuestions((prev) =>
                prev.map((question) =>
                    question.id === audioModalQuestion.id
                        ? { ...question, audio_url: data.data.audio_url }
                        : question
                )
            )
            toast.success('Đã cập nhật audio', { id: toastId })
            closeAudioModal()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Cập nhật audio thất bại'
            toast.error(message, { id: toastId })
        } finally {
            setSavingAudio(false)
        }
    }

    const handleGoToEdit = () => {
        if (!audioModalQuestion) return
        const id = audioModalQuestion.id
        closeAudioModal()
        router.push(`/admin/question-bank/${id}`)
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/categories')
            const data = await res.json()
            if (data.success) {
                setCategories(data.data)
            }
        } catch (error) {
            console.error('Lỗi tải kho')
        }
    }

    const fetchQuestions = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: '10000',
                ...(filters.question_type && {
                    question_type: filters.question_type,
                }),
                ...(filters.level && { level: filters.level }),
                ...(filters.search && { search: filters.search }),
                ...(filters.category_id && { category_id: filters.category_id }),
                ...(filters.freeOnly && { tag: 'free' }),
            })

            const res = await fetch(`/api/admin/question-bank?${params}`)
            const data = await res.json()

            if (data.success) {
                setQuestions(data.data)
                setTotalPages(data.totalPages)
            }
        } catch (error) {
            toast.error('Không thể tải danh sách câu hỏi')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchQuestions()
        setSelectedIds([]) // Reset selection on page or filter change
    }, [page, filters])

    const toggleSelectAll = () => {
        if (selectedIds.length === questions.length && questions.length > 0) {
            setSelectedIds([])
        } else {
            setSelectedIds(questions.map((q) => q.id))
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return
        if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.length} câu hỏi đã chọn?`)) return

        const toastId = toast.loading('Đang xóa...')
        try {
            const res = await fetch(`/api/admin/question-bank`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            })
            const data = await res.json()

            if (data.success) {
                toast.success(`Đã xóa ${selectedIds.length} câu hỏi`, { id: toastId })
                setSelectedIds([])
                fetchQuestions()
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast.error(error.message || 'Xóa thất bại', { id: toastId })
        }
    }

    const handleBulkToggleFree = async (action: 'add' | 'remove') => {
        if (selectedIds.length === 0) return

        const toastId = toast.loading(action === 'add' ? 'Đang gắn mác...' : 'Đang bỏ mác...')
        try {
            const res = await fetch(`/api/admin/question-bank`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds, tag: 'free', action }),
            })
            const data = await res.json()

            if (data.success) {
                toast.success(
                    action === 'add'
                        ? `Đã gắn mác Free cho ${selectedIds.length} câu`
                        : `Đã bỏ mác Free khỏi ${selectedIds.length} câu`,
                    { id: toastId }
                )
                setSelectedIds([])
                fetchQuestions()
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast.error(error.message || 'Thao tác thất bại', { id: toastId })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa câu hỏi này?')) return

        const toastId = toast.loading('Đang xóa...')
        try {
            const res = await fetch(`/api/admin/question-bank/${id}`, {
                method: 'DELETE',
            })
            const data = await res.json()

            if (data.success) {
                toast.success('Đã xóa câu hỏi', { id: toastId })
                fetchQuestions()
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast.error(error.message || 'Xóa thất bại', { id: toastId })
        }
    }

    const handleUpdateCorrectAnswer = async (question: QuestionWithCategory, newCorrectAnswer: number) => {
        if (question.correct_answer === newCorrectAnswer) return;
        
        const toastId = toast.loading('Đang cập nhật đáp án...');
        try {
            const res = await fetch(`/api/admin/question-bank/${question.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correct_answer: newCorrectAnswer }),
            });
            const data = await res.json();
            
            if (data.success) {
                setQuestions((prev) => 
                    prev.map((q) => q.id === question.id ? { ...q, correct_answer: newCorrectAnswer } : q)
                );
                toast.success('Đã cập nhật đáp án', { id: toastId });
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message || 'Cập nhật thất bại', { id: toastId });
        }
    }

    const handleExport = () => {
        const params = new URLSearchParams({
            ...(filters.question_type && {
                question_type: filters.question_type,
            }),
            ...(filters.level && { level: filters.level }),
        })
        window.open(`/api/admin/question-bank/export?${params}`, '_blank')
    }

    const handleDownloadTemplate = () => {
        window.open('/api/admin/question-bank/template', '_blank')
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Kho Câu Hỏi</h2>
                    <p className="text-muted-foreground">
                        Quản lý ngân hàng câu hỏi cho đề thi
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <>
                            <Button
                                variant="outline"
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleBulkToggleFree('add')}
                            >
                                <Gift className="w-4 h-4 mr-2" />
                                Gắn Free
                            </Button>
                            <Button
                                variant="outline"
                                className="border-orange-200 text-orange-700 hover:bg-orange-50"
                                onClick={() => handleBulkToggleFree('remove')}
                            >
                                Bỏ Free
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleBulkDelete}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Xóa {selectedIds.length}
                            </Button>
                        </>
                    )}
                    <Button
                        variant="outline"
                        onClick={handleDownloadTemplate}
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Template
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push('/admin/question-bank/import')}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Import Excel
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button
                        onClick={() =>
                            router.push('/admin/question-bank/create')
                        }
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo câu hỏi
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 bg-white p-4 rounded-lg border">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Tìm kiếm câu hỏi..."
                            className="pl-10"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters({ ...filters, search: e.target.value })
                            }
                        />
                    </div>
                </div>
                <Select
                    value={filters.question_type || "all"}
                    onValueChange={(val) =>
                        setFilters({ ...filters, question_type: val === "all" ? "" : val })
                    }
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Loại câu hỏi" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="reading">Đọc hiểu</SelectItem>
                        <SelectItem value="listening">Nghe hiểu</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={filters.level || "all"}
                    onValueChange={(val) =>
                        setFilters({ ...filters, level: val === "all" ? "" : val })
                    }
                >
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        {[1, 2, 3, 4, 5, 6].map((l) => (
                            <SelectItem key={l} value={l.toString()}>
                                Level {l}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={filters.category_id || "all"}
                    onValueChange={(val) =>
                        setFilters({ ...filters, category_id: val === "all" ? "" : val })
                    }
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Lọc theo kho" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả kho</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                <span className="flex items-center gap-2">
                                    <span>{cat.icon}</span>
                                    <span>{cat.name}</span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <button
                    onClick={() => setFilters({ ...filters, freeOnly: !filters.freeOnly })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-colors whitespace-nowrap ${filters.freeOnly
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Gift className="w-3.5 h-3.5" />
                    Câu Free
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left w-10">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300"
                                    checked={questions.length > 0 && selectedIds.length === questions.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                Kho
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                Loại
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                Level
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                Câu hỏi
                            </th>
                            <th className="px-4 py-3 text-center font-medium">
                                Đáp án
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                Điểm
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                Tags
                            </th>
                            <th className="px-4 py-3 text-right font-medium">
                                Thao tác
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        ) : questions.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                >
                                    Chưa có câu hỏi nào
                                </td>
                            </tr>
                        ) : (
                            questions.map((q) => (
                                <tr
                                    key={q.id}
                                    className={`hover:bg-gray-50 ${selectedIds.includes(q.id) ? 'bg-blue-50/50' : ''}`}
                                >
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300"
                                            checked={selectedIds.includes(q.id)}
                                            onChange={() => toggleSelect(q.id)}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        {q.category ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{q.category.icon}</span>
                                                <span className="text-xs font-medium">{q.category.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">Chưa phân loại</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${q.question_type === 'reading'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-purple-100 text-purple-700'
                                                }`}
                                        >
                                            {q.question_type === 'reading'
                                                ? 'Đọc'
                                                : 'Nghe'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-medium">
                                            Level {q.level}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 max-w-md">
                                        <div
                                            className="font-medium truncate mb-1"
                                            title="Câu hỏi"
                                            dangerouslySetInnerHTML={{ __html: q.question_text }}
                                        />
                                        {q.passage && (
                                            <div
                                                className="text-xs text-muted-foreground line-clamp-2 mt-1 border-l-2 border-gray-200 pl-2"
                                                title="Nội dung đính kèm"
                                                dangerouslySetInnerHTML={{ __html: q.passage }}
                                            />
                                        )}
                                        {q.translated_text && (
                                            <div
                                                className="text-xs text-blue-700 mt-2 bg-blue-50/80 p-2 rounded border border-blue-100 line-clamp-2 hover:line-clamp-none cursor-pointer transition-all"
                                                title="Dịch nghĩa AI (Rê chuột hoặc bấm để xem toàn bộ)"
                                            >
                                                <span className="font-bold mr-1">🤖 AI:</span>
                                                <span dangerouslySetInnerHTML={{ __html: q.translated_text }} />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center align-top pt-4">
                                        <div className="flex flex-col items-center gap-1.5 max-w-[150px] mx-auto">
                                            <Select
                                                value={(q.correct_answer !== undefined && q.correct_answer !== null ? q.correct_answer : '').toString()}
                                                onValueChange={(val) => handleUpdateCorrectAnswer(q, parseInt(val))}
                                            >
                                                <SelectTrigger className="w-12 h-7 mx-auto px-1 flex justify-center border-transparent bg-emerald-100 text-emerald-700 font-bold focus:ring-0 focus:ring-offset-0 hover:bg-emerald-200 transition-colors [&>svg]:hidden rounded-full">
                                                    <SelectValue placeholder="?" />
                                                </SelectTrigger>
                                                <SelectContent className="min-w-[3rem]">
                                                    {q.options?.map((_, idx) => (
                                                        <SelectItem key={idx} value={idx.toString()} className="justify-center font-bold">
                                                            {idx + 1}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {q.options && q.options[q.correct_answer] && (
                                                <div 
                                                    className="text-xs text-muted-foreground truncate w-full text-center px-1"
                                                    title="Nội dung đáp án"
                                                    dangerouslySetInnerHTML={{ __html: q.options[q.correct_answer].content }}
                                                />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{q.points}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1 flex-wrap">
                                            {q.tags?.includes('free') && (
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                                                    FREE
                                                </span>
                                            )}
                                            {q.tags?.filter(t => t !== 'free').slice(0, 2).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {q.tags && q.tags.filter(t => t !== 'free').length > 2 && (
                                                <span className="text-xs text-gray-400">
                                                    +{q.tags.filter(t => t !== 'free').length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {q.question_type === 'listening' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-purple-600"
                                                    onClick={() => openAudioModal(q)}
                                                    title="Thay audio"
                                                >
                                                    <Music className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() =>
                                                    router.push(
                                                        `/admin/question-bank/${q.id}`
                                                    )
                                                }
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-600"
                                                onClick={() =>
                                                    handleDelete(q.id)
                                                }
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                    >
                        Trước
                    </Button>
                    <span className="px-4 py-2">
                        Trang {page} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Sau
                    </Button>
                </div>
            )}

            <Dialog
                open={!!audioModalQuestion}
                onOpenChange={(open) => {
                    if (!open) closeAudioModal()
                }}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Thay file audio</DialogTitle>
                    </DialogHeader>

                    {audioModalQuestion && (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Câu hỏi</p>
                                <p className="text-sm text-muted-foreground">
                                    {audioModalQuestion.question_text}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Audio mới</p>
                                <MediaUploader
                                    type="audio"
                                    currentUrl={audioUrl}
                                    onUploadComplete={setAudioUrl}
                                    folder="audio"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleGoToEdit}
                            disabled={!audioModalQuestion}
                        >
                            Mở trang sửa đầy đủ
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeAudioModal}
                                disabled={savingAudio}
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSaveAudio}
                                disabled={savingAudio || !audioUrl}
                            >
                                {savingAudio ? 'Đang lưu...' : 'Lưu audio'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
