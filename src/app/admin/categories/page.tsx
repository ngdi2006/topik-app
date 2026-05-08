'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Plus,
    Edit,
    Trash2,
    FolderOpen,
    FileText,
    FileType,
    Shuffle,
    Pin,
} from 'lucide-react'
import { toast } from 'sonner'

interface Category {
    id: string
    name: string
    description?: string
    icon: string
    color: string
    parent_id?: string
    question_count: number
    is_active: boolean
    sort_order: number
    shuffle_options: boolean
    created_at: string
}

const ICONS = ['📚', '📝', '🎎', '💬', '📖', '🎧', '🇰🇷', '🎓', '✍️', '🗣️', '👂', '👁️']
const COLORS = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#F97316',
]

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [exportingId, setExportingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: '📚',
        color: '#3B82F6',
        sort_order: 0,
        shuffle_options: true,
        is_active: true,
    })

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
            toast.error('Lỗi tải danh sách kho')
        } finally {
            setLoading(false)
        }
    }

    const openCreateDialog = () => {
        setEditingCategory(null)
        const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order || 0))
        setFormData({
            name: '',
            description: '',
            icon: '📚',
            color: '#3B82F6',
            sort_order: maxOrder + 1,
            shuffle_options: true,
            is_active: true,
        })
        setDialogOpen(true)
    }

    const openEditDialog = (cat: Category) => {
        setEditingCategory(cat)
        setFormData({
            name: cat.name,
            description: cat.description || '',
            icon: cat.icon,
            color: cat.color,
            sort_order: cat.sort_order || 0,
            shuffle_options: cat.shuffle_options ?? true,
            is_active: cat.is_active,
        })
        setDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            toast.error('Vui lòng nhập tên kho')
            return
        }

        const toastId = toast.loading(
            editingCategory ? 'Đang cập nhật...' : 'Đang tạo...'
        )

        try {
            const url = editingCategory
                ? `/api/admin/categories/${editingCategory.id}`
                : '/api/admin/categories'
            const method = editingCategory ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (!data.success) {
                throw new Error(data.error)
            }

            toast.success(
                editingCategory ? 'Đã cập nhật!' : 'Đã tạo kho mới!',
                { id: toastId }
            )
            setDialogOpen(false)
            fetchCategories()
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        }
    }

    const handleDelete = async (cat: Category) => {
        if (!confirm(`Xóa kho "${cat.name}"?`)) return

        const toastId = toast.loading('Đang xóa...')
        try {
            const res = await fetch(`/api/admin/categories/${cat.id}`, {
                method: 'DELETE',
            })
            const data = await res.json()

            if (!data.success) {
                throw new Error(data.error)
            }

            toast.success('Đã xóa kho', { id: toastId })
            fetchCategories()
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        }
    }

    const handleToggleShuffle = async (cat: Category) => {
        const newValue = !cat.shuffle_options
        const toastId = toast.loading('Đang cập nhật...')

        try {
            const res = await fetch(`/api/admin/categories/${cat.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...cat,
                    shuffle_options: newValue,
                }),
            })

            const data = await res.json()
            if (!data.success) throw new Error(data.error)

            toast.success(
                newValue ? '✅ Đã BẬT đảo đáp án' : '✅ Đã TẮT đảo đáp án',
                { id: toastId }
            )
            fetchCategories()
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        }
    }

    const handleExport = async (cat: Category, format: 'pdf' | 'docx') => {
        if (cat.question_count === 0) {
            toast.error('Kho chưa có câu hỏi nào để xuất')
            return
        }

        setExportingId(cat.id)
        const toastId = toast.loading(`Đang xuất file ${format.toUpperCase()}...`)

        try {
            const res = await fetch(
                `/api/admin/categories/${cat.id}/export?format=${format}`
            )

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Xuất file thất bại')
            }

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${cat.name}_${new Date().toISOString().split('T')[0]}.${format}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)

            toast.success(`Đã xuất file ${format.toUpperCase()}!`, { id: toastId })
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        } finally {
            setExportingId(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Quản lý Kho Câu Hỏi</h2>
                    <p className="text-muted-foreground">
                        Tạo, quản lý kho và xuất file đề thi
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tạo kho mới
                </Button>
            </div>

            {/* Categories Grid */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                    Đang tải...
                </div>
            ) : categories.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border">
                    <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-muted-foreground mb-4">Chưa có kho nào</p>
                    <Button onClick={openCreateDialog}>
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo kho đầu tiên
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow"
                            style={{
                                borderTopColor: cat.color,
                                borderTopWidth: 4,
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                                        style={{
                                            backgroundColor: `${cat.color}20`,
                                        }}
                                    >
                                        {cat.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">
                                                #{cat.sort_order || 0}
                                            </span>
                                            <h3 className="font-semibold">
                                                {cat.name}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {cat.question_count} câu hỏi
                                        </p>
                                    </div>
                                </div>
                                {!cat.is_active && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                        Đã ẩn
                                    </span>
                                )}
                            </div>

                            {cat.description && (
                                <p className="text-sm text-muted-foreground mb-3">
                                    {cat.description}
                                </p>
                            )}

                            {/* Shuffle Toggle */}
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-3">
                                <div className="flex items-center gap-2">
                                    {cat.shuffle_options ? (
                                        <Shuffle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Pin className="w-4 h-4 text-gray-500" />
                                    )}
                                    <span className="text-xs">
                                        {cat.shuffle_options
                                            ? 'Đảo đáp án: BẬT'
                                            : 'Đảo đáp án: TẮT'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleToggleShuffle(cat)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cat.shuffle_options
                                            ? 'bg-green-500'
                                            : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${cat.shuffle_options
                                                ? 'translate-x-5'
                                                : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2 pt-3 border-t">
                                {/* Export buttons */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleExport(cat, 'pdf')}
                                        disabled={
                                            exportingId === cat.id ||
                                            cat.question_count === 0
                                        }
                                    >
                                        <FileText className="w-3 h-3 mr-1" />
                                        PDF
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleExport(cat, 'docx')}
                                        disabled={
                                            exportingId === cat.id ||
                                            cat.question_count === 0
                                        }
                                    >
                                        <FileType className="w-3 h-3 mr-1" />
                                        Word
                                    </Button>
                                </div>

                                {/* Edit/Delete */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => openEditDialog(cat)}
                                    >
                                        <Edit className="w-4 h-4 mr-1" />
                                        Sửa
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={() => handleDelete(cat)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Sửa kho' : 'Tạo kho mới'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tên kho *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                placeholder="Ví dụ: Từ vựng cơ bản"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Mô tả</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                                placeholder="Mô tả ngắn về kho..."
                                rows={2}
                            />
                        </div>

                        {/* STT Sắp xếp */}
                        <div className="space-y-2">
                            <Label>STT Sắp xếp *</Label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.sort_order}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        sort_order: parseInt(e.target.value) || 0,
                                    })
                                }
                                placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground">
                                Số nhỏ hơn sẽ hiển thị trước. VD: 1, 2, 3...
                            </p>
                        </div>

                        {/* Đảo đáp án */}
                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-semibold">
                                        🔀 Đảo đáp án khi làm bài
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Bật: Đáp án A,B,C,D sẽ được xáo trộn
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFormData({
                                            ...formData,
                                            shuffle_options: !formData.shuffle_options,
                                        })
                                    }
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.shuffle_options
                                            ? 'bg-green-500'
                                            : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.shuffle_options
                                                ? 'translate-x-6'
                                                : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Icon</Label>
                            <div className="grid grid-cols-6 gap-2">
                                {ICONS.map((icon) => (
                                    <button
                                        key={icon}
                                        type="button"
                                        onClick={() =>
                                            setFormData({ ...formData, icon })
                                        }
                                        className={`p-3 text-2xl rounded border-2 transition-colors ${formData.icon === icon
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Màu sắc</Label>
                            <div className="grid grid-cols-8 gap-2">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() =>
                                            setFormData({ ...formData, color })
                                        }
                                        className={`w-10 h-10 rounded-lg border-2 transition-all ${formData.color === color
                                                ? 'border-gray-800 scale-110'
                                                : 'border-gray-200'
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        is_active: e.target.checked,
                                    })
                                }
                                className="w-4 h-4"
                            />
                            <Label htmlFor="is_active" className="cursor-pointer">
                                Kho đang hoạt động
                            </Label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button type="submit">
                                {editingCategory ? 'Cập nhật' : 'Tạo kho'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
