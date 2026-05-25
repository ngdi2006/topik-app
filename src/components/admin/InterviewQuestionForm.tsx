'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MediaUploader } from '@/components/admin/MediaUploader'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface InterviewQuestionFormProps {
    initialData?: any
    isEdit?: boolean
}

const CATEGORIES = ['Khẩu lệnh', 'Giao tiếp', 'Toán học', 'Sử dụng công cụ', 'Xử lý tình huống']

const ZONE_OPTIONS = [
    { id: 'shelf_top_left', label: 'Kệ trên (Trái)' },
    { id: 'shelf_bottom_left', label: 'Kệ dưới (Trái)' },
    { id: 'machine_panel', label: 'Bảng điều khiển / Máy móc' },
    { id: 'work_area', label: 'Khu vực thi công' },
    { id: 'toolbox_center', label: 'Hộp công cụ chung' },
    { id: 'special_box', label: 'Hộp chuyên dụng' },
    { id: 'shelf_top_right', label: 'Kệ trên (Phải)' },
    { id: 'shelf_bottom_right', label: 'Kệ dưới (Phải)' }
]

export function InterviewQuestionForm({ initialData, isEdit }: InterviewQuestionFormProps) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        category: initialData?.category || 'Khẩu lệnh',
        question_text: initialData?.question_text || '',
        vietnamese_meaning: initialData?.vietnamese_meaning || '',
        question_audio_url: initialData?.question_audio_url || '',
        suggested_answers: initialData?.suggested_answers || [''],
        countdown_after_audio: initialData?.countdown_after_audio || 5,
        tool_image_url: initialData?.tool_image_url || '',
        target_zone_id: initialData?.target_zone_id || ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!formData.question_text || !formData.category) {
            toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc')
            return
        }

        setSaving(true)
        const toastId = toast.loading('Đang lưu...')
        
        try {
            // Lọc bỏ các câu trả lời trống
            const cleanedAnswers = formData.suggested_answers.filter((a: string) => a.trim() !== '')

            const payload = {
                ...formData,
                suggested_answers: cleanedAnswers.length > 0 ? cleanedAnswers : null,
                countdown_after_audio: parseInt(formData.countdown_after_audio as any) || 0
            }

            const url = isEdit 
                ? `/api/admin/interview-questions/${initialData.id}` 
                : '/api/admin/interview-questions'
            
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            if (!data.success) throw new Error(data.error)

            toast.success(isEdit ? 'Đã cập nhật thành công!' : 'Đã thêm câu hỏi mới!', { id: toastId })
            router.push('/admin/interview-module')
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi lưu', { id: toastId })
        } finally {
            setSaving(false)
        }
    }

    const handleAddAnswer = () => {
        setFormData(prev => ({
            ...prev,
            suggested_answers: [...prev.suggested_answers, '']
        }))
    }

    const handleUpdateAnswer = (index: number, value: string) => {
        const newAnswers = [...formData.suggested_answers]
        newAnswers[index] = value
        setFormData(prev => ({ ...prev, suggested_answers: newAnswers }))
    }

    const handleRemoveAnswer = (index: number) => {
        const newAnswers = formData.suggested_answers.filter((_: any, i: number) => i !== index)
        setFormData(prev => ({ ...prev, suggested_answers: newAnswers }))
    }

    const isToolCategory = formData.category === 'Sử dụng công cụ'

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">{isEdit ? 'Sửa Câu Hỏi Vòng 2' : 'Thêm Câu Hỏi Vòng 2'}</h2>
                        <p className="text-muted-foreground">Module Luyện Phỏng Vấn</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <Label>Phân loại (Category) *</Label>
                        <Select 
                            value={formData.category} 
                            onValueChange={(v) => setFormData({...formData, category: v})}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn phân loại" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <Label>Thời gian suy nghĩ (giây) *</Label>
                        <Input 
                            type="number" 
                            min="0"
                            value={formData.countdown_after_audio} 
                            onChange={(e) => setFormData({...formData, countdown_after_audio: e.target.value as any})}
                            placeholder="Vd: 5"
                        />
                        <p className="text-xs text-muted-foreground">Chỉ kích hoạt đếm ngược sau khi audio đã chạy xong.</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Nội dung câu hỏi (Tiếng Hàn) *</Label>
                    <Textarea 
                        rows={3} 
                        value={formData.question_text}
                        onChange={(e) => setFormData({...formData, question_text: e.target.value})}
                        placeholder="Ví dụ: 이름이 무엇입니까?"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Nghĩa Tiếng Việt (Tùy chọn)</Label>
                    <Textarea 
                        rows={2} 
                        value={formData.vietnamese_meaning}
                        onChange={(e) => setFormData({...formData, vietnamese_meaning: e.target.value})}
                        placeholder="Ví dụ: Tên của bạn là gì?"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Audio Giám khảo đọc câu hỏi (Tùy chọn)</Label>
                    <MediaUploader
                        type="audio"
                        currentUrl={formData.question_audio_url}
                        onUploadComplete={(url) => setFormData({...formData, question_audio_url: url})}
                        folder="interview_audio"
                    />
                </div>

                <div className="space-y-3 p-4 bg-gray-50 border rounded-lg">
                    <Label className="text-base">Các câu trả lời mẫu chuẩn (Dùng cho AI đối chiếu)</Label>
                    <p className="text-xs text-gray-500 mb-2">Thêm các cách trả lời đúng để AI dễ dàng nhận diện và chấm điểm.</p>
                    
                    {formData.suggested_answers.map((answer: string, idx: number) => (
                        <div key={idx} className="flex gap-2">
                            <Input 
                                value={answer}
                                onChange={(e) => handleUpdateAnswer(idx, e.target.value)}
                                placeholder={`Câu trả lời mẫu ${idx + 1}`}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAnswer(idx)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddAnswer} className="mt-2">
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm câu trả lời mẫu
                    </Button>
                </div>

                {isToolCategory && (
                    <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <h3 className="font-semibold text-orange-800">Cấu hình riêng cho bài "Sử dụng công cụ"</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Ảnh vật phẩm cần kéo (tool_image_url)</Label>
                                <MediaUploader
                                    type="image"
                                    currentUrl={formData.tool_image_url}
                                    onUploadComplete={(url) => setFormData({...formData, tool_image_url: url})}
                                    folder="interview_tools"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ID Vùng thả chính xác (target_zone_id)</Label>
                                <Select 
                                    value={formData.target_zone_id} 
                                    onValueChange={(v) => setFormData({...formData, target_zone_id: v})}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="-- Bấm để chọn vùng thả --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ZONE_OPTIONS.map(zone => (
                                            <SelectItem key={zone.id} value={zone.id}>
                                                {zone.label} <span className="text-gray-400 text-xs ml-1">({zone.id})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-orange-600 mt-1">Chọn chính xác vùng đích để hệ thống chấm điểm tự động.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                        Hủy bỏ
                    </Button>
                    <Button type="submit" disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Đang lưu...' : 'Lưu câu hỏi'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
