'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    Save,
    BookOpen,
    Headphones,
    AlertCircle,
    CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface Category {
    id: string
    name: string
    icon: string
    color: string
    is_active: boolean
}

interface Rule {
    id: string
    exam_id: string
    question_type: 'reading' | 'listening'
    category_id?: string
    levels: number[]
    tags: string[]
    quantity: number
    points_per_question: number
    time_per_question: number
    section_name?: string
    order_index: number
    available_count?: number
    is_sufficient?: boolean
    category?: Category
}

export default function AdminExamBuilderPage() {
    const params = useParams()
    const router = useRouter()
    const examId = params.id as string

    const [exam, setExam] = useState<any>(null)
    const [rules, setRules] = useState<Rule[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingExam, setIsSavingExam] = useState(false)

    // Form state for Exam Meta
    const [metaForm, setMetaForm] = useState({
        title: '',
        level: 'TOPIK II',
        reading_duration: 70,
        listening_duration: 60,
        status: 'Draft',
        display_order: 0,
        is_free: false,
        free_attempts: 1,
        credits_required: 1,
    })

    // Rule Modal state
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<Rule | null>(null)
    const [ruleForm, setRuleForm] = useState({
        question_type: 'reading' as 'reading' | 'listening',
        category_id: '',
        levels: [] as number[],
        quantity: 5,
        points_per_question: 2,
        time_per_question: 15,
        section_name: '',
    })

    const fetchExam = async () => {
        try {
            const res = await fetch(`/api/admin/exams/${examId}`)
            const data = await res.json()
            if (data.success) {
                setExam(data.data)
                setMetaForm({
                    title: data.data.title || '',
                    level: data.data.level || 'TOPIK II',
                    reading_duration: data.data.reading_duration || 70,
                    listening_duration: data.data.listening_duration || 60,
                    status: data.data.status || 'Draft',
                    display_order: data.data.display_order || 0,
                    is_free: data.data.is_free ?? false,
                    free_attempts: data.data.free_attempts ?? 1,
                    credits_required: data.data.credits_required ?? 1,
                })
            }
        } catch (error) {
            toast.error('Lỗi tải đề thi')
        }
    }

    const fetchRules = async () => {
        try {
            const res = await fetch(`/api/admin/exams/${examId}/rules`)
            const data = await res.json()
            if (data.success) {
                setRules(data.data)
            }
        } catch (error) {
            toast.error('Lỗi tải rules')
        }
    }

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/categories')
            const data = await res.json()
            if (data.success) {
                setCategories(data.data.filter((c: Category) => c.is_active))
            }
        } catch (error) {
            console.error('Lỗi tải categories')
        }
    }

    useEffect(() => {
        const init = async () => {
            setIsLoading(true)
            await Promise.all([fetchExam(), fetchRules(), fetchCategories()])
            setIsLoading(false)
        }
        if (examId) init()
    }, [examId])

    const handleSaveExamMeta = async () => {
        setIsSavingExam(true)
        const toastId = toast.loading('Đang lưu...')
        try {
            const totalQuestions = rules.reduce((sum, r) => sum + r.quantity, 0)
            const res = await fetch(`/api/admin/exams/${examId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...metaForm,
                    total_questions: totalQuestions,
                    duration: metaForm.reading_duration + metaForm.listening_duration,
                }),
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error)

            toast.success('Đã lưu thông tin đề thi!', { id: toastId })
            fetchExam()
        } catch (error: any) {
            toast.error(error.message || 'Lưu thất bại', { id: toastId })
        } finally {
            setIsSavingExam(false)
        }
    }

    const openCreateRuleModal = (type: 'reading' | 'listening') => {
        setEditingRule(null)
        setRuleForm({
            question_type: type,
            category_id: categories[0]?.id || '',
            levels: [3, 4],
            quantity: 5,
            points_per_question: 2,
            time_per_question: 15,
            section_name: '',
        })
        setIsRuleModalOpen(true)
    }

    const openEditRuleModal = (rule: Rule) => {
        setEditingRule(rule)
        setRuleForm({
            question_type: rule.question_type,
            category_id: rule.category_id || '',
            levels: rule.levels,
            quantity: rule.quantity,
            points_per_question: rule.points_per_question,
            time_per_question: rule.time_per_question || 15,
            section_name: rule.section_name || '',
        })
        setIsRuleModalOpen(true)
    }

    const handleSaveRule = async () => {
        if (ruleForm.levels.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 level')
            return
        }
        if (!ruleForm.category_id) {
            toast.error('Vui lòng chọn kho câu hỏi')
            return
        }

        const toastId = toast.loading('Đang lưu...')
        try {
            const url = editingRule
                ? `/api/admin/exams/${examId}/rules/${editingRule.id}`
                : `/api/admin/exams/${examId}/rules`

            const res = await fetch(url, {
                method: editingRule ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ruleForm),
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error)

            toast.success(editingRule ? 'Đã cập nhật!' : 'Đã thêm rule!', { id: toastId })
            setIsRuleModalOpen(false)
            fetchRules()
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        }
    }

    const handleDeleteRule = async (rule: Rule) => {
        if (!confirm(`Xóa rule "${rule.section_name || rule.question_type}"?`)) return

        const toastId = toast.loading('Đang xóa...')
        try {
            const res = await fetch(
                `/api/admin/exams/${examId}/rules/${rule.id}`,
                { method: 'DELETE' }
            )
            const data = await res.json()
            if (!data.success) throw new Error(data.error)

            toast.success('Đã xóa', { id: toastId })
            fetchRules()
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        }
    }

    const readingRules = rules.filter((r) => r.question_type === 'reading')
    const listeningRules = rules.filter((r) => r.question_type === 'listening')
    const totalQuestions = rules.reduce((sum, r) => sum + r.quantity, 0)
    const totalPoints = rules.reduce(
        (sum, r) => sum + r.quantity * (r.points_per_question || 0),
        0
    )

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                Đang tải...
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/admin/exams')}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">Cấu Hình Đề Thi</h2>
                        <p className="text-sm text-muted-foreground">
                            Tạo đề thi từ kho câu hỏi với rules
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Exam Info */}
                <div className="lg:col-span-1">
                    <div className="bg-white border rounded-xl p-6 space-y-4 sticky top-24">
                        <h3 className="font-semibold border-b pb-2">
                            Thông tin Đề thi
                        </h3>

                        <div className="space-y-2">
                            <Label>Tên đề thi</Label>
                            <Input
                                value={metaForm.title}
                                onChange={(e) =>
                                    setMetaForm({ ...metaForm, title: e.target.value })
                                }
                                placeholder="VD: TOPIK II Mock Test 1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Cấp độ</Label>
                            <Select
                                value={metaForm.level}
                                onValueChange={(val) =>
                                    setMetaForm({ ...metaForm, level: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TOPIK I">TOPIK I (1-2)</SelectItem>
                                    <SelectItem value="TOPIK II">TOPIK II (3-6)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label className="text-xs">📖 Đọc (phút)</Label>
                                <Input
                                    type="number"
                                    value={metaForm.reading_duration}
                                    onChange={(e) =>
                                        setMetaForm({
                                            ...metaForm,
                                            reading_duration: parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">🎧 Nghe (phút)</Label>
                                <Input
                                    type="number"
                                    value={metaForm.listening_duration}
                                    onChange={(e) =>
                                        setMetaForm({
                                            ...metaForm,
                                            listening_duration: parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Trạng thái</Label>
                            <Select
                                value={metaForm.status}
                                onValueChange={(val) =>
                                    setMetaForm({ ...metaForm, status: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Draft">Nháp</SelectItem>
                                    <SelectItem value="Published">Xuất bản</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Thứ tự hiển thị</Label>
                            <Input
                                type="number"
                                min={0}
                                value={metaForm.display_order}
                                onChange={(e) =>
                                    setMetaForm({
                                        ...metaForm,
                                        display_order: parseInt(e.target.value) || 0,
                                    })
                                }
                                placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground">
                                Số nhỏ hiển thị trước. VD: 1 = đầu tiên, 2 = thứ hai...
                            </p>
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <h4 className="font-semibold text-sm">Chính sách lượt thi</h4>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={metaForm.is_free}
                                    onChange={(e) =>
                                        setMetaForm({
                                            ...metaForm,
                                            is_free: e.target.checked,
                                        })
                                    }
                                    className="rounded border-gray-300"
                                />
                                <span className="text-sm font-medium">✅ Đề thi miễn phí (không giới hạn lượt)</span>
                            </label>

                            {!metaForm.is_free && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label className="text-xs">🎁 Miễn phí (lần)</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={metaForm.free_attempts}
                                                onChange={(e) =>
                                                    setMetaForm({
                                                        ...metaForm,
                                                        free_attempts: Math.max(0, parseInt(e.target.value) || 0),
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">💰 Phí làm lại (lượt)</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={metaForm.credits_required}
                                                onChange={(e) =>
                                                    setMetaForm({
                                                        ...metaForm,
                                                        credits_required: Math.max(1, parseInt(e.target.value) || 1),
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {metaForm.free_attempts > 0
                                            ? `💡 ${metaForm.free_attempts} lần đầu miễn phí → từ lần ${metaForm.free_attempts + 1} mất ${metaForm.credits_required} lượt/lần`
                                            : `💡 Luôn mất ${metaForm.credits_required} lượt/lần (không miễn phí)`
                                        }
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tổng câu hỏi:</span>
                                <span className="font-bold">{totalQuestions}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tổng điểm:</span>
                                <span className="font-bold">{totalPoints}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tổng thời gian:</span>
                                <span className="font-bold">
                                    {metaForm.reading_duration + metaForm.listening_duration} phút
                                </span>
                            </div>
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleSaveExamMeta}
                            disabled={isSavingExam}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSavingExam ? 'Đang lưu...' : 'Lưu Thông Tin'}
                        </Button>
                    </div>
                </div>

                {/* Right: Rules */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Reading Section */}
                    <div className="bg-white border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-lg">
                                    Phần Đọc Hiểu ({readingRules.length} rules)
                                </h3>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => openCreateRuleModal('reading')}
                            >
                                <Plus className="w-4 h-4 mr-1" /> Thêm
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            ⏱️ {metaForm.reading_duration} phút | Học viên có thể qua lại các câu
                        </p>

                        {readingRules.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                Chưa có rule nào. Click "Thêm" để bắt đầu.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {readingRules.map((rule, idx) => (
                                    <RuleCard
                                        key={rule.id}
                                        rule={rule}
                                        index={idx}
                                        onEdit={openEditRuleModal}
                                        onDelete={handleDeleteRule}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Listening Section */}
                    <div className="bg-white border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Headphones className="w-5 h-5 text-purple-600" />
                                <h3 className="font-bold text-lg">
                                    Phần Nghe Hiểu ({listeningRules.length} rules)
                                </h3>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => openCreateRuleModal('listening')}
                            >
                                <Plus className="w-4 h-4 mr-1" /> Thêm
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            ⏱️ {metaForm.listening_duration} phút | Không quay lại câu đã làm | Auto-next
                        </p>

                        {listeningRules.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                Chưa có rule nào. Click "Thêm" để bắt đầu.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {listeningRules.map((rule, idx) => (
                                    <RuleCard
                                        key={rule.id}
                                        rule={rule}
                                        index={idx}
                                        onEdit={openEditRuleModal}
                                        onDelete={handleDeleteRule}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Rule Form Modal */}
            <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingRule ? 'Sửa Rule' : 'Thêm Rule mới'}
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({ruleForm.question_type === 'reading' ? '📖 Đọc hiểu' : '🎧 Nghe hiểu'})
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tên phần (tuỳ chọn)</Label>
                            <Input
                                value={ruleForm.section_name}
                                onChange={(e) =>
                                    setRuleForm({ ...ruleForm, section_name: e.target.value })
                                }
                                placeholder="VD: Phần 1 - Từ vựng cơ bản"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>📁 Kho câu hỏi *</Label>
                            <Select
                                value={ruleForm.category_id}
                                onValueChange={(val) =>
                                    setRuleForm({ ...ruleForm, category_id: val })
                                }
                            >
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
                        </div>

                        <div className="space-y-2">
                            <Label>Levels *</Label>
                            <div className="grid grid-cols-6 gap-2">
                                {[1, 2, 3, 4, 5, 6].map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => {
                                            if (ruleForm.levels.includes(level)) {
                                                setRuleForm({
                                                    ...ruleForm,
                                                    levels: ruleForm.levels.filter((l) => l !== level),
                                                })
                                            } else {
                                                setRuleForm({
                                                    ...ruleForm,
                                                    levels: [...ruleForm.levels, level].sort(),
                                                })
                                            }
                                        }}
                                        className={`p-2 rounded border text-sm font-medium ${ruleForm.levels.includes(level)
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-white border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Số câu *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={ruleForm.quantity}
                                    onChange={(e) =>
                                        setRuleForm({
                                            ...ruleForm,
                                            quantity: parseInt(e.target.value) || 1,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Điểm/câu</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={ruleForm.points_per_question}
                                    onChange={(e) =>
                                        setRuleForm({
                                            ...ruleForm,
                                            points_per_question: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {ruleForm.question_type === 'listening' && (
                            <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <Label className="text-purple-900">
                                    ⏰ Thời gian đếm ngược sau audio (giây)
                                </Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="60"
                                    value={ruleForm.time_per_question}
                                    onChange={(e) =>
                                        setRuleForm({
                                            ...ruleForm,
                                            time_per_question: parseInt(e.target.value) || 15,
                                        })
                                    }
                                />
                                <p className="text-xs text-purple-700">
                                    Sau khi audio kết thúc, học viên có {ruleForm.time_per_question}s để chọn đáp án trước khi tự động chuyển câu
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsRuleModalOpen(false)}
                        >
                            Hủy
                        </Button>
                        <Button onClick={handleSaveRule}>
                            {editingRule ? 'Cập nhật' : 'Thêm Rule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Rule Card Component
function RuleCard({
    rule,
    index,
    onEdit,
    onDelete,
}: {
    rule: Rule
    index: number
    onEdit: (r: Rule) => void
    onDelete: (r: Rule) => void
}) {
    const isInsufficient = rule.available_count !== undefined && rule.available_count < rule.quantity

    return (
        <div className={`p-4 rounded-lg border ${isInsufficient ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white rounded text-xs font-mono">
                        #{index + 1}
                    </span>
                    {rule.category && (
                        <span
                            className="px-2 py-0.5 rounded text-xs flex items-center gap-1"
                            style={{ backgroundColor: `${rule.category.color}20` }}
                        >
                            {rule.category.icon} {rule.category.name}
                        </span>
                    )}
                    {rule.section_name && (
                        <span className="text-sm font-medium">{rule.section_name}</span>
                    )}
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(rule)}>
                        <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600"
                        onClick={() => onDelete(rule)}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>📊 Levels: {rule.levels.join(', ')}</span>
                <span>📝 {rule.quantity} câu</span>
                <span>🏆 {rule.points_per_question} điểm/câu</span>
                {rule.question_type === 'listening' && (
                    <span>⏰ {rule.time_per_question}s/câu</span>
                )}
            </div>

            {rule.available_count !== undefined && (
                <div className={`mt-2 flex items-center gap-1 text-xs ${isInsufficient ? 'text-red-600' : 'text-green-600'}`}>
                    {isInsufficient ? (
                        <>
                            <AlertCircle className="w-3 h-3" />
                            <span>
                                Chỉ có {rule.available_count}/{rule.quantity} câu trong kho - Thiếu!
                            </span>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-3 h-3" />
                            <span>
                                Có {rule.available_count} câu trong kho - Đủ ✓
                            </span>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
