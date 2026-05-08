'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { QuestionBank } from '@/types/exam'

interface Category {
    id: string
    name: string
    icon: string
    color: string
    is_active: boolean
}

export default function EditQuestionPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [question, setQuestion] = useState<QuestionBank | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [categoryId, setCategoryId] = useState<string>('')
    const [tagsInput, setTagsInput] = useState('')

    useEffect(() => {
        fetchQuestion()
        fetchCategories()
    }, [id])

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/categories')
            const data = await res.json()
            if (data.success) {
                setCategories(data.data.filter((c: Category) => c.is_active))
            }
        } catch (error) {
            console.error('Lỗi tải kho')
        }
    }

    const fetchQuestion = async () => {
        try {
            const res = await fetch(`/api/admin/question-bank/${id}`)
            const data = await res.json()

            if (data.success) {
                setQuestion(data.data)
                setCategoryId(data.data.category_id || '')
                setTagsInput(data.data.tags?.join(', ') || '')
            } else {
                toast.error('Không tìm thấy câu hỏi')
                router.push('/admin/question-bank')
            }
        } catch (error) {
            toast.error('Lỗi tải câu hỏi')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!question) return

        if (!categoryId) {
            toast.error('Vui lòng chọn kho')
            return
        }

        setSaving(true)
        const toastId = toast.loading('Đang lưu...')

        try {
            const res = await fetch(`/api/admin/question-bank/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...question,
                    category_id: categoryId,
                    tags: tagsInput
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                }),
            })

            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'Cập nhật thất bại')

            toast.success('Đã cập nhật câu hỏi!', { id: toastId })
            router.push('/admin/question-bank')
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Xóa câu hỏi này?')) return

        const toastId = toast.loading('Đang xóa...')
        try {
            const res = await fetch(`/api/admin/question-bank/${id}`, {
                method: 'DELETE',
            })
            const data = await res.json()

            if (data.success) {
                toast.success('Đã xóa câu hỏi', { id: toastId })
                router.push('/admin/question-bank')
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Đang tải...</p>
            </div>
        )
    }

    if (!question) return null

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">Sửa Câu Hỏi</h2>
                        <p className="text-muted-foreground">Cập nhật thông tin câu hỏi</p>
                    </div>
                </div>
                <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa
                </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-lg border p-6 space-y-6">
                    {/* Category Selector */}
                    <div className="space-y-2 pb-4 border-b">
                        <Label className="text-base font-semibold">📁 Kho câu hỏi *</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn kho" />
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
                        <p className="text-xs text-muted-foreground">
                            Bạn có thể chuyển câu hỏi sang kho khác
                        </p>
                    </div>

                    {/* Question Type & Level */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Loại câu hỏi *</Label>
                            <Select
                                value={question.question_type}
                                onValueChange={(val: any) =>
                                    setQuestion({ ...question, question_type: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="reading">Đọc hiểu</SelectItem>
                                    <SelectItem value="listening">Nghe hiểu</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Level *</Label>
                            <Select
                                value={question.level.toString()}
                                onValueChange={(val) =>
                                    setQuestion({ ...question, level: parseInt(val) })
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

                    {/* Passage */}
                    {question.question_type === 'reading' && (
                        <div className="space-y-2">
                            <Label>Đoạn văn (tùy chọn)</Label>
                            <Textarea
                                rows={4}
                                value={question.passage || ''}
                                onChange={(e) =>
                                    setQuestion({ ...question, passage: e.target.value })
                                }
                            />
                        </div>
                    )}

                    {/* Question Text */}
                    <div className="space-y-2">
                        <Label>Câu hỏi *</Label>
                        <Textarea
                            rows={3}
                            value={question.question_text}
                            onChange={(e) =>
                                setQuestion({ ...question, question_text: e.target.value })
                            }
                            required
                        />
                    </div>

                    {/* Question Image */}
                    <div className="space-y-2">
                        <Label>Hình ảnh câu hỏi (tùy chọn)</Label>
                        <MediaUploader
                            type="image"
                            currentUrl={question.question_image_url || ''}
                            onUploadComplete={(url) =>
                                setQuestion({ ...question, question_image_url: url })
                            }
                            folder="questions"
                        />
                    </div>

                    {/* Audio */}
                    {question.question_type === 'listening' && (
                        <div className="space-y-2">
                            <Label>File Audio *</Label>
                            <MediaUploader
                                type="audio"
                                currentUrl={question.audio_url || ''}
                                onUploadComplete={(url) =>
                                    setQuestion({ ...question, audio_url: url })
                                }
                                folder="audio"
                            />
                        </div>
                    )}

                    {/* 4 Options */}
                    <div className="space-y-3">
                        <Label>Đáp án (4 đáp án) *</Label>
                        {question.options.map((opt, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="radio"
                                        name="correct_answer"
                                        checked={question.correct_answer === idx}
                                        onChange={() =>
                                            setQuestion({ ...question, correct_answer: idx })
                                        }
                                        className="w-4 h-4"
                                    />
                                    <span className="font-medium text-sm">{idx + 1}.</span>
                                </div>
                                <OptionInput
                                    value={opt}
                                    onChange={(newOpt) => {
                                        const newOptions = [...question.options]
                                        newOptions[idx] = newOpt
                                        setQuestion({ ...question, options: newOptions })
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
                                value={question.points}
                                onChange={(e) =>
                                    setQuestion({
                                        ...question,
                                        points: parseFloat(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tags</Label>
                            <Input
                                placeholder="vocabulary, grammar"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={saving}
                    >
                        Hủy
                    </Button>
                    <Button type="submit" disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
