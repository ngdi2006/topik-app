'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Search, Filter, Upload, Download } from 'lucide-react'
import { BulkImportModal } from '@/components/admin/BulkImportModal'

export default function InterviewModuleAdminPage() {
    const router = useRouter()
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    
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

    useEffect(() => {
        fetchQuestions()
        fetchSettings()
    }, [])

    const fetchQuestions = async () => {
        try {
            const res = await fetch('/api/admin/interview-questions')
            const data = await res.json()
            if (data.success) {
                setQuestions(data.data)
            }
        } catch (error) {
            toast.error('Lỗi tải danh sách câu hỏi')
        } finally {
            setLoading(false)
        }
    }

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/system-settings')
            const data = await res.json()
            if (data.success && data.data) {
                setAiPrompt(data.data.ai_global_prompt || '')
                if (data.data.industry_prompts) {
                    setIndustryPrompts(prev => ({...prev, ...data.data.industry_prompts}))
                }
            }
        } catch (error) {
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
            const data = await res.json()
            if (!data.success) throw new Error(data.error)
            toast.success('Đã lưu cấu hình thành công!', { id: toastId })
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi lưu cấu hình', { id: toastId })
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
            const data = await res.json()
            if (!data.success) throw new Error(data.error)
            toast.success('Đã xóa câu hỏi!', { id: toastId })
            fetchQuestions()
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi xóa', { id: toastId })
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

                    {loading ? (
                        <div className="text-center py-10">Đang tải...</div>
                    ) : (
                        <div className="bg-white rounded-lg border overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Ngành nghề / Phân loại</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Câu hỏi (Tiếng Hàn)</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {questions
                                        .filter(q => filterCategory === 'Tất cả' || q.category === filterCategory)
                                        .filter(q => 
                                            q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                            (q.vietnamese_meaning && q.vietnamese_meaning.toLowerCase().includes(searchQuery.toLowerCase()))
                                        )
                                        .map((q) => (
                                        <tr key={q.id} className="hover:bg-gray-50">
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
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => router.push(`/admin/interview-module/${q.id}`)}
                                                >
                                                    <Edit className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => handleDelete(q.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {questions.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                                Chưa có câu hỏi nào.
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
