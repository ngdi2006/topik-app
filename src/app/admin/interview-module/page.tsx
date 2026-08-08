'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Search, Filter, Upload, Download, FileSpreadsheet } from 'lucide-react'
import { BulkImportModal } from '@/components/admin/BulkImportModal'
import { resolveToolQuestionConfig, definitionLabel, ACTION_DEFINITIONS, TARGET_DEFINITIONS, TOOL_DEFINITIONS, type ToolQuestionConfig, type VocabularyItem } from '@/components/interview/toolQuestionAnalysis'

type InterviewQuestionRow = {
    id: string
    industry?: string | null
    category: string
    question_text: string
    vietnamese_meaning?: string | null
    question_audio_url?: string | null
    suggested_answers?: string[] | string | null
    countdown_after_audio?: number | null
    tool_image_url?: string | null
    target_zone_id?: string | null
    tool_config?: ToolQuestionConfig | null
}

type ApiResponse<T> = {
    success: boolean
    data?: T
    total?: number
    error?: string
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

export default function InterviewModuleAdminPage() {
    const router = useRouter()
    const [questions, setQuestions] = useState<InterviewQuestionRow[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(() => new Set())
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('Tất cả')
    
    // Import Modal state
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)

    // Settings state
    const [aiPrompt, setAiPrompt] = useState('')
    const [industryPrompts, setIndustryPrompts] = useState<Record<string, string>>({
        "Sản xuất chế tạo": "",
        "Ngư nghiệp": "",
        "Nông nghiệp": "",
        "Lâm nghiệp": "",
        "Xây dựng": "",
        "Dịch vụ": ""
    })
    const [activeIndustryTab, setActiveIndustryTab] = useState("Sản xuất chế tạo")
    const [savingSettings, setSavingSettings] = useState(false)

    const visibleQuestions = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase()

        return questions
            .filter((question) =>
                filterCategory === 'Tất cả' || question.category === filterCategory
            )
            .filter((question) =>
                !normalizedQuery
                || question.question_text.toLowerCase().includes(normalizedQuery)
                || question.vietnamese_meaning?.toLowerCase().includes(normalizedQuery)
            )
    }, [filterCategory, questions, searchQuery])

    const allVisibleSelected = visibleQuestions.length > 0
        && visibleQuestions.every((question) => selectedQuestionIds.has(question.id))

    useEffect(() => {
        fetchQuestions()
        fetchSettings()
    }, [])

    const fetchQuestions = async () => {
        try {
            const res = await fetch('/api/admin/interview-questions')
            const data = await res.json() as ApiResponse<InterviewQuestionRow[]>
            if (data.success) {
                setQuestions(data.data || [])
            }
        } catch {
            toast.error('Lỗi tải danh sách câu hỏi')
        } finally {
            setLoading(false)
        }
    }

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/system-settings')
            const data = await res.json() as ApiResponse<{ ai_global_prompt?: string; industry_prompts?: Record<string, string> }>
            const settings = data.data
            if (data.success && settings) {
                setAiPrompt(settings.ai_global_prompt || '')
                if (settings.industry_prompts) {
                    setIndustryPrompts(prev => ({...prev, ...settings.industry_prompts}))
                }
            }
        } catch {
            toast.error('Lỗi tải cấu hình')
        }
    }

    const handleSaveSettings = async () => {
        setSavingSettings(true)
        const toastId = toast.loading('Đang lưu cấu hình...')
        try {
            const res = await fetch('/api/admin/system-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ai_global_prompt: aiPrompt,
                    industry_prompts: industryPrompts
                })
            })
            const data = await res.json() as ApiResponse<unknown>
            if (!data.success) throw new Error(data.error)
            toast.success('Đã lưu cấu hình thành công!', { id: toastId })
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi lưu cấu hình'), { id: toastId })
        } finally {
            setSavingSettings(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return
        const toastId = toast.loading('Đang xóa...')
        try {
            const res = await fetch(`/api/admin/interview-questions/${id}`, {
                method: 'DELETE'
            })
            const data = await res.json() as ApiResponse<unknown>
            if (!data.success) throw new Error(data.error)
            toast.success('Đã xóa câu hỏi!', { id: toastId })
            setSelectedQuestionIds((current) => {
                const next = new Set(current)
                next.delete(id)
                return next
            })
            fetchQuestions()
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi xóa'), { id: toastId })
        }
    }

    const toggleQuestionSelection = (id: string) => {
        setSelectedQuestionIds((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAllVisibleQuestions = () => {
        setSelectedQuestionIds((current) => {
            const next = new Set(current)
            if (allVisibleSelected) {
                visibleQuestions.forEach((question) => next.delete(question.id))
            } else {
                visibleQuestions.forEach((question) => next.add(question.id))
            }
            return next
        })
    }

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedQuestionIds)
        if (ids.length === 0) return
        if (!window.confirm(`Bạn có chắc muốn xoá ${ids.length} câu hỏi đã chọn? Thao tác này không thể hoàn tác.`)) return

        setIsBulkDeleting(true)
        const toastId = toast.loading(`Đang xoá ${ids.length} câu hỏi…`)
        try {
            const res = await fetch('/api/admin/interview-questions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            })
            const data = await res.json() as ApiResponse<{ deleted: number }>
            if (!res.ok || !data.success) throw new Error(data.error)

            setQuestions((current) => current.filter((question) => !selectedQuestionIds.has(question.id)))
            setSelectedQuestionIds(new Set())
            toast.success(`Đã xoá ${data.data?.deleted ?? ids.length} câu hỏi.`, { id: toastId })
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Không thể xoá các câu hỏi đã chọn'), { id: toastId })
            await fetchQuestions()
        } finally {
            setIsBulkDeleting(false)
        }
    }

    const getToolAnalysisSummary = (q: InterviewQuestionRow) => {
        if (q.category !== 'Sử dụng công cụ') return null
        const config = resolveToolQuestionConfig(q.question_text || '', q.vietnamese_meaning || '', q.tool_config)
        return {
            tool: definitionLabel(TOOL_DEFINITIONS, config.correct_tool),
            target: definitionLabel(TARGET_DEFINITIONS, config.target_object),
            action: config.requires_action ? definitionLabel(ACTION_DEFINITIONS, config.correct_action || '') : 'Đặt/cất đúng vị trí',
            vocabulary: config.vocabulary_analysis || []
        }
    }

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                "Ngành nghề": "MANUFACTURING",
                "Phân loại": "Khẩu lệnh",
                "Câu hỏi": "위를 보세요.",
                "Dịch nghĩa": "Hãy nhìn lên trên.",
                "Giây đếm ngược": 5,
                "Link Audio": "",
                "Gợi ý trả lời": "네, 알겠습니다|네",
                "Tên File Ảnh": "",
                "ID Ô thả": ""
            },
            {
                "Ngành nghề": "FISHERY",
                "Phân loại": "Sử dụng công cụ",
                "Câu hỏi": "망치를 오른쪽 아래 선반에 넣으세요.",
                "Dịch nghĩa": "Hãy đặt búa vào kệ dưới bên phải.",
                "Giây đếm ngược": 15,
                "Link Audio": "",
                "Gợi ý trả lời": "",
                "Tên File Ảnh": "hammer.png",
                "ID Ô thả": "shelf_bottom_right"
            },
            {
                "Ngành nghề": "COMMON",
                "Phân loại": "Khẩu lệnh",
                "Câu hỏi": "앞으로 가세요.",
                "Dịch nghĩa": "Đi về phía trước.",
                "Giây đếm ngược": 5,
                "Link Audio": "",
                "Gợi ý trả lời": "네, 알겠습니다|네",
                "Tên File Ảnh": "",
                "ID Ô thả": ""
            }
        ]
        
        const ws = XLSX.utils.json_to_sheet(templateData)
        ws['!cols'] = [
            { wch: 18 }, // Ngành nghề
            { wch: 15 }, // Phân loại
            { wch: 30 }, // Câu hỏi
            { wch: 30 }, // Dịch nghĩa
            { wch: 15 }, // Giây đếm ngược
            { wch: 20 }, // Link Audio
            { wch: 25 }, // Gợi ý trả lời
            { wch: 20 }, // Tên File Ảnh
            { wch: 15 }  // ID Ô thả
        ];

        const guideData = [
            ['HƯỚNG DẪN NHẬP DỮ LIỆU CÂU HỎI PHỎNG VẤN VÒNG 2'],
            [],
            ['1. CỘT "Ngành nghề" (Bắt buộc)'],
            ['Nhập 1 trong các mã sau viết hoa:'],
            ['MANUFACTURING', 'Sản xuất chế tạo'],
            ['FISHERY', 'Ngư nghiệp'],
            ['AGRICULTURE', 'Nông nghiệp'],
            ['FORESTRY', 'Lâm nghiệp'],
            ['SERVICE', 'Dịch vụ'],
            ['CONSTRUCTION', 'Xây dựng'],
            ['COMMON', 'Chung (Tất cả ngành)'],
            [],
            ['2. CỘT "Phân loại" (Bắt buộc)'],
            ['Nhập 1 trong các mục sau:'],
            ['Khẩu lệnh', 'Giao tiếp', 'Toán học', 'Sử dụng công cụ', 'Xử lý tình huống'],
            [],
            ['* LƯU Ý ĐỐI VỚI KHẨU LỆNH CHUNG:'],
            ['Để nhập khẩu lệnh dùng chung cho tất cả ngành, bạn vui lòng điền:'],
            [' - Cột "Ngành nghề":', 'COMMON'],
            [' - Cột "Phân loại":', 'Khẩu lệnh'],
            [],
            ['3. CÁC CỘT KHÁC'],
            ['Gợi ý trả lời', 'Phân cách các câu bằng dấu gạch đứng | (Ví dụ: 네|알겠습니다)'],
            ['ID Ô thả', 'Chỉ dùng cho Phân loại "Sử dụng công cụ" (vd: shelf_bottom_right, box_1, v.v...)'],
            ['Tên File Ảnh', 'Tên file (vd: hammer.png) nếu nén cùng file ZIP, hoặc link http'],
            ['Link Audio', 'Link http đến file âm thanh nếu có (hoặc để trống hệ thống tự đọc AI)']
        ];
        const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
        wsGuide['!cols'] = [{ wch: 25 }, { wch: 80 }];

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, wsGuide, "Hướng dẫn")
        XLSX.utils.book_append_sheet(wb, ws, "Template")
        XLSX.writeFile(wb, "Template_Phong_Van_Vong_2.xlsx")
    }

    const handleExportExcel = () => {
        const selectedRows = selectedQuestionIds.size > 0
            ? questions.filter((question) => selectedQuestionIds.has(question.id))
            : visibleQuestions

        if (selectedRows.length === 0) {
            toast.error('Không có dữ liệu để xuất')
            return
        }

        const exportRows = selectedRows.map((question, index) => {
            const resolvedToolConfig = question.category === 'Sử dụng công cụ'
                ? resolveToolQuestionConfig(question.question_text, question.vietnamese_meaning || '', question.tool_config)
                : null
            const suggestedAnswers = Array.isArray(question.suggested_answers)
                ? question.suggested_answers.join('|')
                : question.suggested_answers || ''

            return {
                'STT': index + 1,
                'ID': question.id,
                'Ngành nghề': question.industry || 'COMMON',
                'Phân loại': question.category,
                'Câu hỏi': question.question_text,
                'Dịch nghĩa': question.vietnamese_meaning || '',
                'Giây đếm ngược': question.countdown_after_audio ?? '',
                'Link Audio': question.question_audio_url || '',
                'Gợi ý trả lời': suggestedAnswers,
                'Tên File Ảnh': question.tool_image_url || '',
                'ID Ô thả': question.target_zone_id || '',
                'Công cụ chính xác': resolvedToolConfig
                    ? definitionLabel(TOOL_DEFINITIONS, resolvedToolConfig.correct_tool)
                    : '',
                'Mã công cụ': resolvedToolConfig?.correct_tool || '',
                'Vật thể/Vật tư': resolvedToolConfig
                    ? definitionLabel(TARGET_DEFINITIONS, resolvedToolConfig.target_object)
                    : '',
                'Mã vật thể': resolvedToolConfig?.target_object || '',
                'Thao tác': resolvedToolConfig?.requires_action
                    ? definitionLabel(ACTION_DEFINITIONS, resolvedToolConfig.correct_action || '')
                    : '',
                'Mã thao tác': resolvedToolConfig?.correct_action || '',
                'Cấu hình công cụ (JSON)': resolvedToolConfig ? JSON.stringify(resolvedToolConfig) : ''
            }
        })

        const worksheet = XLSX.utils.json_to_sheet(exportRows)
        worksheet['!cols'] = [
            { wch: 7 }, { wch: 38 }, { wch: 20 }, { wch: 20 }, { wch: 48 }, { wch: 48 },
            { wch: 16 }, { wch: 42 }, { wch: 36 }, { wch: 36 }, { wch: 22 }, { wch: 24 },
            { wch: 22 }, { wch: 24 }, { wch: 22 }, { wch: 24 }, { wch: 22 }, { wch: 80 }
        ]
        worksheet['!autofilter'] = { ref: worksheet['!ref'] || 'A1:R1' }

        const summary = XLSX.utils.aoa_to_sheet([
            ['BÁO CÁO DỮ LIỆU PHỎNG VẤN VÒNG 2'],
            ['Thời gian xuất', new Date().toLocaleString('vi-VN')],
            ['Bộ lọc', filterCategory],
            ['Từ khóa', searchQuery || 'Không có'],
            ['Số bản ghi', selectedRows.length],
            ['Phạm vi', selectedQuestionIds.size > 0 ? 'Các câu đã chọn' : 'Danh sách đang hiển thị']
        ])
        summary['!cols'] = [{ wch: 24 }, { wch: 55 }]

        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách câu hỏi')
        XLSX.utils.book_append_sheet(workbook, summary, 'Thông tin xuất')

        const date = new Date().toISOString().slice(0, 10)
        const categorySlug = filterCategory === 'Tất cả'
            ? 'Tat-ca'
            : filterCategory.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\s+/g, '-')
        XLSX.writeFile(workbook, `Phong_Van_Vong_2_${categorySlug}_${date}.xlsx`)
        toast.success(`Đã xuất ${selectedRows.length} câu hỏi ra Excel`)
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Luyện Phỏng Vấn Vòng 2</h2>
                <p className="text-muted-foreground">Quản lý câu hỏi và cấu hình AI chấm điểm</p>
            </div>

            <Tabs defaultValue="questions" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="questions">Danh sách câu hỏi</TabsTrigger>
                    <TabsTrigger value="settings">Cấu hình AI (Theo ngành)</TabsTrigger>
                </TabsList>

                <TabsContent value="questions" className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border">
                        <div className="flex flex-1 items-center gap-4 w-full md:w-auto">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Tìm câu hỏi..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="w-4 h-4 mr-2 text-gray-500" />
                                    <SelectValue placeholder="Phân loại" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tất cả">Tất cả danh mục</SelectItem>
                                    <SelectItem value="Khẩu lệnh">Khẩu lệnh</SelectItem>
                                    <SelectItem value="Giao tiếp">Giao tiếp</SelectItem>
                                    <SelectItem value="Toán học">Toán học</SelectItem>
                                    <SelectItem value="Sử dụng công cụ">Sử dụng công cụ</SelectItem>
                                    <SelectItem value="Xử lý tình huống">Xử lý tình huống</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto shrink-0 flex-wrap justify-end">
                            <Button variant="outline" onClick={handleExportExcel} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Xuất Excel{selectedQuestionIds.size > 0 ? ` (${selectedQuestionIds.size})` : ''}
                            </Button>
                            <Button variant="outline" onClick={handleDownloadTemplate}>
                                <Download className="w-4 h-4 mr-2" />
                                Mẫu Excel
                            </Button>
                            <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="whitespace-nowrap">
                                <Upload className="w-4 h-4 mr-2" />
                                Import Excel (+ Zip Ảnh)
                            </Button>
                            <Button onClick={() => router.push('/admin/interview-module/create')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm câu hỏi
                            </Button>
                        </div>
                    </div>

                    {!loading ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-700">
                                    {filterCategory === 'Tất cả' ? 'Tất cả câu hỏi' : filterCategory}
                                </span>
                                {selectedQuestionIds.size > 0 ? (
                                    <span className="rounded-full bg-blue-700 px-2.5 py-1 text-xs font-bold text-white">
                                        Đã chọn {selectedQuestionIds.size}
                                    </span>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedQuestionIds.size > 0 ? (
                                    <Button
                                        className="h-8 bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700"
                                        disabled={isBulkDeleting}
                                        onClick={handleBulkDelete}
                                        size="sm"
                                    >
                                        <Trash2 aria-hidden="true" className="size-3.5" />
                                        {isBulkDeleting ? 'Đang xoá…' : `Xoá ${selectedQuestionIds.size} câu`}
                                    </Button>
                                ) : null}
                                <span className="rounded-full bg-white px-3 py-1 font-bold text-blue-700 shadow-sm ring-1 ring-blue-100">
                                    Hiển thị {visibleQuestions.length} / {questions.length} câu
                                </span>
                            </div>
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="text-center py-10">Đang tải...</div>
                    ) : (
                        <div className="bg-white rounded-lg border overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="w-12 px-4 py-3 text-center">
                                            <input
                                                aria-label={`Chọn tất cả ${visibleQuestions.length} câu hỏi đang hiển thị`}
                                                checked={allVisibleSelected}
                                                className="size-4 cursor-pointer rounded border-gray-300 accent-blue-600"
                                                onChange={toggleAllVisibleQuestions}
                                                type="checkbox"
                                            />
                                        </th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Ngành nghề / Phân loại</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Câu hỏi (Tiếng Hàn)</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {visibleQuestions.map((q) => (
                                        <tr
                                            key={q.id}
                                            className={`${selectedQuestionIds.has(q.id) ? 'bg-blue-50/70' : 'hover:bg-gray-50'} [content-visibility:auto] [contain-intrinsic-size:auto_72px]`}
                                        >
                                            <td className="px-4 py-4 text-center align-top">
                                                <input
                                                    aria-label={`Chọn câu hỏi ${q.question_text}`}
                                                    checked={selectedQuestionIds.has(q.id)}
                                                    className="size-4 cursor-pointer rounded border-gray-300 accent-blue-600"
                                                    onChange={() => toggleQuestionSelection(q.id)}
                                                    type="checkbox"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                        {q.industry || 'Sản xuất chế tạo'}
                                                    </span>
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                                        {q.category}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{q.question_text}</div>
                                                <div className="text-gray-500 text-xs mt-1 line-clamp-1">{q.vietnamese_meaning}</div>
                                                {getToolAnalysisSummary(q) && (
                                                    <div className="mt-2 rounded-md border border-orange-100 bg-orange-50 px-2 py-1.5 text-xs text-orange-900">
                                                        <div className="font-medium">
                                                            Công cụ: {getToolAnalysisSummary(q)?.tool} | Vật thể: {getToolAnalysisSummary(q)?.target} | Thao tác: {getToolAnalysisSummary(q)?.action}
                                                        </div>
                                                        <div className="mt-1 text-orange-700 line-clamp-1">
                                                            {getToolAnalysisSummary(q)?.vocabulary.map((item: VocabularyItem) => `${item.term}: ${item.meaning}`).join(' · ')}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    aria-label="Chỉnh sửa câu hỏi"
                                                    onClick={() => router.push(`/admin/interview-module/${q.id}`)}
                                                >
                                                    <Edit className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    aria-label="Xoá câu hỏi"
                                                    onClick={() => handleDelete(q.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {visibleQuestions.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                Không tìm thấy câu hỏi phù hợp.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="settings">
                    <div className="bg-white rounded-lg border p-6 space-y-4">
                        <div>
                            <h3 className="font-semibold text-lg">System Prompt & Nguồn tham khảo theo từng ngành</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Hệ thống sẽ tự động chọn đúng System Prompt tương ứng với ngành nghề của câu hỏi để AI chấm điểm chính xác nhất.
                            </p>
                        </div>

                        <Tabs value={activeIndustryTab} onValueChange={setActiveIndustryTab} className="w-full">
                            <TabsList className="mb-4 flex flex-wrap h-auto gap-2 bg-slate-100 p-1">
                                {Object.keys(industryPrompts).map((ind) => (
                                    <TabsTrigger key={ind} value={ind} className="data-[state=active]:bg-white">
                                        {ind}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {Object.keys(industryPrompts).map((ind) => (
                                <TabsContent key={ind} value={ind} className="m-0">
                                    <Textarea 
                                        rows={15} 
                                        placeholder={`Nhập prompt hệ thống và tiêu chí chấm điểm cho ngành ${ind}...`} 
                                        value={industryPrompts[ind]}
                                        onChange={(e) => setIndustryPrompts(prev => ({ ...prev, [ind]: e.target.value }))}
                                        className="font-mono text-sm leading-relaxed"
                                    />
                                </TabsContent>
                            ))}
                        </Tabs>

                        <div className="flex justify-end pt-4 border-t mt-6">
                            <Button onClick={handleSaveSettings} disabled={savingSettings}>
                                {savingSettings ? 'Đang lưu...' : 'Lưu cấu hình AI'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <BulkImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                onSuccess={fetchQuestions} 
            />
        </div>
    )
}
