'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { MediaUploader } from '@/components/admin/MediaUploader'
import { OptionInput } from '@/components/admin/OptionInput'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { QuestionBankCreate } from '@/types/exam'

interface Category {
    id: string
    name: string
    icon: string
    color: string
    is_active: boolean
}

export default function CreateQuestionPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const preSelectedCategoryId = searchParams.get('category_id')
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<Category[]>([])
    const [categoryId, setCategoryId] = useState<string>(preSelectedCategoryId || '')
    const [formData, setFormData] = useState<QuestionBankCreate>({
        question_type: 'reading',
        level: 1,
        passage: '',
        question_text: '',
        question_image_url: '',
        audio_url: '',
        options: [
            { type: 'text', content: '' },
            { type: 'text', content: '' },
            { type: 'text', content: '' },
            { type: 'text', content: '' },
        ],
        correct_answer: 0,
        shuffle_options: true,
        points: 1,
        tags: [],
    })
    const [tagsInput, setTagsInput] = useState('')

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/categories')
            const data = await res.json()
            if (data.success) {
                const activeCategories = data.data.filter((c: Category) => c.is_active)
                setCategories(activeCategories)
                if (!preSelectedCategoryId && activeCategories.length > 0) {
                    setCategoryId(activeCategories[0].id)
                }
            }
        } catch (error) {
            toast.error('Lỗi tải danh sách kho')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!formData.question_text.trim()) {
            toast.error('Vui lòng nhập câu hỏi')
            return
        }

        if (formData.options.some((opt) => !opt.content.trim())) {
            toast.error('Vui lòng nhập đủ 4 đáp án')
            return
        }

        if (formData.question_type === 'listening' && !formData.audio_url) {
            toast.error('Câu hỏi nghe hiểu cần có file audio')
            return
        }

        if (!categoryId) {
            toast.error('Vui lòng chọn kho cho câu hỏi')
            return
        }

        setLoading(true)
        const toastId = toast.loading('Đang tạo câu hỏi...')

        try {
            // Clean up HTML - remove unnecessary <p> tags if content is simple
            const cleanQuestionText = formData.question_text.trim()
            const cleanPassage = formData.passage?.trim() || ''

            const res = await fetch('/api/admin/question-bank', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    question_text: cleanQuestionText,
                    passage: cleanPassage,
                    category_id: categoryId,
                    tags: tagsInput
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                }),
            })

            const data = await res.json()

            if (!data.success) {
                throw new Error(data.error || 'Tạo câu hỏi thất bại')
            }

            toast.success('Đã tạo câu hỏi thành công!', { id: toastId })
            router.push('/admin/question-bank')
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">Tạo Câu Hỏi Mới</h2>
                    <p className="text-muted-foreground">
                        Thêm câu hỏi vào kho câu hỏi
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-lg border p-6 space-y-6">
                    {/* Category Selector - Bắt buộc */}
                    <div className="space-y-2 pb-4 border-b">
                        <Label className="text-base font-semibold">
                            📁 Kho câu hỏi *
                        </Label>
                        {categories.length === 0 ? (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ Chưa có kho nào. Vui lòng{' '}
                                    <a
                                        href="/admin/categories"
                                        className="text-blue-600 underline font-medium"
                                    >
                                        tạo kho trước
                                    </a>{' '}
                                    rồi mới tạo câu hỏi.
                                </p>
                            </div>
                        ) : (
                            <Select
                                value={categoryId}
                                onValueChange={setCategoryId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn kho cho câu hỏi" />
                                </SelectTrigger>
                                <SelectContent>
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
                        )}
                        <p className="text-xs text-muted-foreground">
                            Câu hỏi sẽ được lưu vào kho được chọn
                        </p>
                    </div>

                    {/* Question Type & Level */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Loại câu hỏi *</Label>
                            <Select
                                value={formData.question_type}
                                onValueChange={(val: any) =>
                                    setFormData({
                                        ...formData,
                                        question_type: val,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="reading">
                                        Đọc hiểu
                                    </SelectItem>
                                    <SelectItem value="listening">
                                        Nghe hiểu
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Level *</Label>
                            <Select
                                value={formData.level.toString()}
                                onValueChange={(val) =>
                                    setFormData({
                                        ...formData,
                                        level: parseInt(val),
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6].map((l) => (
                                        <SelectItem key={l} value={l.toString()}>
                                            Level {l}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Passage (optional for reading) */}
                    {formData.question_type === 'reading' && (
                        <div className="space-y-2">
                            <Label>Đoạn văn (tùy chọn)</Label>
                            <RichTextEditor
                                value={formData.passage || ''}
                                onChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        passage: value,
                                    })
                                }
                                placeholder="Nhập đoạn văn để đọc hiểu..."
                                minHeight="200px"
                            />
                        </div>
                    )}

                    {/* Question Text */}
                    <div className="space-y-2">
                        <Label>Câu hỏi *</Label>
                        <RichTextEditor
                            value={formData.question_text}
                            onChange={(value) =>
                                setFormData({
                                    ...formData,
                                    question_text: value,
                                })
                            }
                            placeholder="Nhập nội dung câu hỏi..."
                            minHeight="150px"
                        />
                    </div>

                    {/* Question Image (optional) */}
                    <div className="space-y-2">
                        <Label>Hình ảnh câu hỏi (tùy chọn)</Label>
                        <MediaUploader
                            type="image"
                            currentUrl={formData.question_image_url}
                            onUploadComplete={(url) =>
                                setFormData({
                                    ...formData,
                                    question_image_url: url,
                                })
                            }
                            folder="questions"
                        />
                    </div>

                    {/* Audio (required for listening) */}
                    {formData.question_type === 'listening' && (
                        <div className="space-y-2">
                            <Label>File Audio *</Label>
                            <MediaUploader
                                type="audio"
                                currentUrl={formData.audio_url}
                                onUploadComplete={(url) =>
                                    setFormData({
                                        ...formData,
                                        audio_url: url,
                                    })
                                }
                                folder="audio"
                            />
                        </div>
                    )}

                    {/* 4 Options với hỗ trợ text/image */}
                    <div className="space-y-3">
                        <Label>Đáp án (4 đáp án) *</Label>
                        {formData.options.map((opt, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="radio"
                                        name="correct_answer"
                                        checked={
                                            formData.correct_answer === idx
                                        }
                                        onChange={() =>
                                            setFormData({
                                                ...formData,
                                                correct_answer: idx,
                                            })
                                        }
                                        className="w-4 h-4"
                                    />
                                    <span className="font-medium text-sm">
                                        {idx + 1}.
                                    </span>
                                </div>
                                <OptionInput
                                    value={opt}
                                    onChange={(newOpt) => {
                                        const newOptions = [...formData.options]
                                        newOptions[idx] = newOpt
                                        setFormData({
                                            ...formData,
                                            options: newOptions,
                                        })
                                    }}
                                    placeholder={`Đáp án ${idx + 1}`}
                                />
                            </div>
                        ))}
                        <p className="text-xs text-muted-foreground">
                            ✓ Chọn radio button để đánh dấu đáp án đúng<br />
                            ✓ Mỗi đáp án có thể là văn bản hoặc hình ảnh
                        </p>
                    </div>

                    {/* Points & Tags */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Điểm</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.points}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        points: parseFloat(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tags (cách nhau bởi dấu phẩy)</Label>
                            <Input
                                placeholder="vocabulary, grammar, culture"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={loading}
                    >
                        Hủy
                    </Button>
                    <Button type="submit" disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Đang lưu...' : 'Lưu câu hỏi'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
