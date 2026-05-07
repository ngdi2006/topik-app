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
    Plus,
    Search,
    Download,
    Upload,
    Edit,
    Trash2,
    FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { QuestionBank } from '@/types/exam'

export default function QuestionBankPage() {
    const router = useRouter()
    const [questions, setQuestions] = useState<QuestionBank[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        question_type: '',
        level: '',
        search: '',
    })
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const fetchQuestions = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: '20',
                ...(filters.question_type && {
                    question_type: filters.question_type,
                }),
                ...(filters.level && { level: filters.level }),
                ...(filters.search && { search: filters.search }),
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
    }, [page, filters])

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
                    value={filters.question_type}
                    onValueChange={(val) =>
                        setFilters({ ...filters, question_type: val })
                    }
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Loại câu hỏi" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Tất cả</SelectItem>
                        <SelectItem value="reading">Đọc hiểu</SelectItem>
                        <SelectItem value="listening">Nghe hiểu</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={filters.level}
                    onValueChange={(val) =>
                        setFilters({ ...filters, level: val })
                    }
                >
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Tất cả</SelectItem>
                        {[1, 2, 3, 4, 5, 6].map((l) => (
                            <SelectItem key={l} value={l.toString()}>
                                Level {l}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">
                                Loại
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                Level
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                Câu hỏi
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
                                    colSpan={6}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                >
                                    Đang tải...
                                </td>
                            </tr>
                        ) : questions.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                >
                                    Chưa có câu hỏi nào
                                </td>
                            </tr>
                        ) : (
                            questions.map((q) => (
                                <tr
                                    key={q.id}
                                    className="hover:bg-gray-50"
                                >
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
                                    <td className="px-4 py-3 max-w-md truncate">
                                        {q.question_text}
                                    </td>
                                    <td className="px-4 py-3">{q.points}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1 flex-wrap">
                                            {q.tags?.slice(0, 2).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {q.tags && q.tags.length > 2 && (
                                                <span className="text-xs text-gray-400">
                                                    +{q.tags.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
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
        </div>
    )
}
