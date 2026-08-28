'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Plus, Trash2, ListChecks, Clock, CheckCircle, RefreshCw, UserCheck, BookOpen, Layers, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

type Teacher = {
    id: string
    full_name: string | null
    email: string | null
    role: string | null
}

type Assignment = {
    id: string
    teacher_id: string
    category: string | null
    from_order_index: number | null
    to_order_index: number | null
    notes: string | null
    created_at: string
    teacher?: Teacher | null
    assigner?: Teacher | null
    total_questions?: number
    verified_questions?: number
    progress_percent?: number
}

type TeacherAssignmentManagerModalProps = {
    isOpen: boolean
    onClose: () => void
    categories: string[]
    onAssignmentChanged?: () => void
}

export function TeacherAssignmentManagerModal({
    isOpen,
    onClose,
    categories,
    onAssignmentChanged,
}: TeacherAssignmentManagerModalProps) {
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [fromOrder, setFromOrder] = useState<string>('')
    const [toOrder, setToOrder] = useState<string>('')
    const [notes, setNotes] = useState<string>('')
    const [teacherSearch, setTeacherSearch] = useState<string>('')

    const fetchData = async () => {
        setLoading(true)
        try {
            const [teachersRes, assignmentsRes] = await Promise.all([
                fetch('/api/admin/interview-teachers'),
                fetch('/api/admin/interview-assignments'),
            ])
            const teachersPayload = await teachersRes.json()
            const assignmentsPayload = await assignmentsRes.json()

            if (teachersPayload.success) {
                const list: Teacher[] = teachersPayload.data || []
                setTeachers(list)
                if (list.length > 0 && !selectedTeacherId) {
                    setSelectedTeacherId(list[0].id)
                }
            }
            if (assignmentsPayload.success) {
                setAssignments(assignmentsPayload.data || [])
            }
        } catch (err) {
            toast.error('Lỗi khi tải dữ liệu phân công')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchData()
        }
    }, [isOpen])

    const filteredTeachers = useMemo(() => {
        if (!teacherSearch.trim()) return teachers.slice(0, 100)
        const q = teacherSearch.toLowerCase()
        return teachers.filter(
            (t) =>
                (t.full_name || '').toLowerCase().includes(q) ||
                (t.email || '').toLowerCase().includes(q) ||
                (t.role || '').toLowerCase().includes(q)
        ).slice(0, 100)
    }, [teachers, teacherSearch])

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTeacherId) {
            toast.error('Vui lòng chọn giáo viên')
            return
        }

        setSubmitting(true)
        const toastId = toast.loading('Đang phân công...')
        try {
            const res = await fetch('/api/admin/interview-assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacher_id: selectedTeacherId,
                    category: selectedCategory === 'all' ? null : selectedCategory,
                    from_order_index: fromOrder.trim() ? Number(fromOrder) : null,
                    to_order_index: toOrder.trim() ? Number(toOrder) : null,
                    notes: notes.trim() || null,
                }),
            })

            const payload = await res.json()
            if (!res.ok || !payload.success) {
                throw new Error(payload.error || 'Không thể tạo phân công')
            }

            toast.success('Phân công nhiệm vụ thành công!', { id: toastId })
            setFromOrder('')
            setToOrder('')
            setNotes('')
            fetchData()
            onAssignmentChanged?.()
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi tạo phân công', { id: toastId })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteAssignment = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa phân công này?')) return

        const toastId = toast.loading('Đang xóa...')
        try {
            const res = await fetch(`/api/admin/interview-assignments/${id}`, {
                method: 'DELETE',
            })
            const payload = await res.json()
            if (!res.ok || !payload.success) throw new Error(payload.error || 'Không thể xóa')

            toast.success('Đã xóa phân công', { id: toastId })
            fetchData()
            onAssignmentChanged?.()
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi xóa', { id: toastId })
        }
    }

    const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId)

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto p-6 md:p-8">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 shrink-0">
                            <Users className="size-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl md:text-2xl font-bold text-slate-900">
                                Phân công Giáo viên rà soát Phỏng vấn Vòng 2
                            </DialogTitle>
                            <p className="text-xs font-normal text-slate-500 mt-1">
                                Giao việc theo danh mục hoặc khoảng STT câu hỏi và theo dõi tiến độ duyệt của từng giáo viên
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="mt-6 flex flex-col lg:flex-row gap-6 items-start">
                    {/* Form phân công mới (Trái) */}
                    <div className="w-full lg:w-[420px] shrink-0 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 via-white to-slate-50 p-5 shadow-xs">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-blue-100">
                            <div className="size-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                                <Plus className="size-3.5" />
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm">Giao nhiệm vụ mới</h3>
                        </div>

                        <form onSubmit={handleCreateAssignment} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <UserCheck className="size-3.5 text-blue-600" />
                                        <span>Chọn Giáo viên / Người rà soát *</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                        ({teachers.length} tài khoản)
                                    </span>
                                </label>

                                {/* Tìm kiếm nhanh tài khoản */}
                                <div className="relative mb-1.5">
                                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                                    <Input
                                        type="text"
                                        placeholder="Tìm theo tên hoặc email..."
                                        className="h-8 pl-8 text-xs bg-white border-slate-200"
                                        value={teacherSearch}
                                        onChange={(e) => setTeacherSearch(e.target.value)}
                                    />
                                </div>

                                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                                    <SelectTrigger className="h-10 bg-white border-slate-200 text-xs shadow-xs focus:ring-2 focus:ring-blue-500">
                                        <SelectValue placeholder="Chọn giáo viên...">
                                            {selectedTeacher ? (
                                                <span className="font-medium text-slate-800">
                                                    {selectedTeacher.full_name || selectedTeacher.email} 
                                                    {selectedTeacher.email ? ` (${selectedTeacher.email})` : ''}
                                                </span>
                                            ) : null}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {filteredTeachers.map((t) => (
                                            <SelectItem key={t.id} value={t.id} className="text-xs py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800">{t.full_name || 'Chưa đặt tên'}</span>
                                                    {t.email && <span className="text-slate-400 font-mono text-[11px]">({t.email})</span>}
                                                    {t.role && (
                                                        <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4 bg-slate-100">
                                                            {t.role}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                    <BookOpen className="size-3.5 text-blue-600" />
                                    <span>Danh mục câu hỏi</span>
                                </label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="h-9 bg-white border-slate-200 text-xs shadow-xs focus:ring-2 focus:ring-blue-500">
                                        <SelectValue placeholder="Chọn danh mục..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs font-semibold py-1.5">
                                            🌟 Tất cả danh mục
                                        </SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem key={c} value={c} className="text-xs py-1.5">
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                    <Layers className="size-3.5 text-blue-600" />
                                    <span>Khoảng STT câu hỏi (Tùy chọn)</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Từ STT (vd: 803)"
                                        className="h-9 bg-white text-xs px-2.5 border-slate-200 shadow-xs"
                                        value={fromOrder}
                                        onChange={(e) => setFromOrder(e.target.value)}
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Đến STT (vd: 850)"
                                        className="h-9 bg-white text-xs px-2.5 border-slate-200 shadow-xs"
                                        value={toOrder}
                                        onChange={(e) => setToOrder(e.target.value)}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 italic">
                                    Để trống nếu muốn giao toàn bộ trong danh mục.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Ghi chú nhiệm vụ (Tùy chọn)
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Ví dụ: Rà soát ảnh & đáp án đợt 1"
                                    className="h-9 bg-white text-xs border-slate-200 shadow-xs"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all mt-1"
                            >
                                <Plus className="size-3.5 mr-1.5" />
                                {submitting ? 'Đang phân công...' : 'Giao việc cho giáo viên'}
                            </Button>
                        </form>
                    </div>

                    {/* Danh sách nhiệm vụ đã giao (Phải) */}
                    <div className="flex-1 w-full min-w-0 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <ListChecks className="size-4 text-slate-700" />
                                <h3 className="font-bold text-slate-800 text-sm">
                                    Danh sách phân công hiện tại ({assignments.length})
                                </h3>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={fetchData} 
                                className="text-xs text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100 h-7 px-2.5 gap-1"
                            >
                                <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
                                <span>Làm mới</span>
                            </Button>
                        </div>

                        {loading ? (
                            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                                <Clock className="size-6 animate-spin text-blue-500" />
                                <span>Đang tải danh sách phân công...</span>
                            </div>
                        ) : assignments.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center text-slate-500">
                                <Users className="mx-auto size-8 text-slate-400 mb-2" />
                                <p className="text-xs font-semibold text-slate-700">Chưa có phân công nào</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Hãy chọn giáo viên và thiết lập phạm vi ở khung bên trái để bắt đầu giao việc.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1.5">
                                {assignments.map((item) => {
                                    const teacherName = item.teacher?.full_name || item.teacher?.email || 'Giáo viên'
                                    const progress = item.progress_percent ?? 0
                                    const isComplete = progress === 100 && (item.total_questions ?? 0) > 0

                                    return (
                                        <div
                                            key={item.id}
                                            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="size-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                        {teacherName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                                            <span>{teacherName}</span>
                                                            {item.teacher?.role && (
                                                                <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-3.5 bg-slate-50">
                                                                    {item.teacher.role}
                                                                </Badge>
                                                            )}
                                                            {isComplete && (
                                                                <Badge className="bg-green-100 text-green-800 text-[9px] font-bold py-0 h-3.5 gap-0.5">
                                                                    <CheckCircle className="size-2.5 text-green-600" />
                                                                    Đã hoàn thành
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {item.teacher?.email && (
                                                            <div className="text-[10px] text-slate-400 font-mono">
                                                                {item.teacher.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteAssignment(item.id)}
                                                    className="size-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Xóa phân công này"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>

                                            {/* Phạm vi câu hỏi */}
                                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                                                <span className="font-bold text-slate-600 text-[11px]">Phạm vi:</span>
                                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold py-0">
                                                    {item.category || 'Tất cả danh mục'}
                                                </Badge>
                                                {(item.from_order_index !== null || item.to_order_index !== null) && (
                                                    <Badge className="bg-amber-50 text-amber-900 border-amber-200 text-[11px] font-mono font-bold py-0">
                                                        STT #{item.from_order_index ?? 1} → #{item.to_order_index ?? 'Hết'}
                                                    </Badge>
                                                )}
                                            </div>

                                            {item.notes && (
                                                <div className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 p-2 rounded italic">
                                                    💬 &quot;{item.notes}&quot;
                                                </div>
                                            )}

                                            {/* Progress bar */}
                                            <div className="mt-2.5 space-y-1 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                                <div className="flex justify-between items-center text-[11px] font-medium">
                                                    <span className="text-slate-600">Tiến độ rà soát</span>
                                                    <span className={`font-bold ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
                                                        {item.verified_questions ?? 0} / {item.total_questions ?? 0} câu ({progress}%)
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-300 rounded-full ${
                                                            isComplete ? 'bg-green-500' : 'bg-blue-600'
                                                        }`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
