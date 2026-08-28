'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { History, User, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type HistoryItem = {
    id: string
    question_id: string
    changed_by_name: string | null
    changed_by_email: string | null
    action_type: string
    change_summary: string | null
    previous_data: any
    new_data: any
    created_at: string
}

type QuestionHistoryModalProps = {
    isOpen: boolean
    onClose: () => void
    questionId: string | null
    questionText?: string
    orderIndex?: number | null
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    quick_answer_edit: { label: 'Sửa đáp án nhanh', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    full_edit: { label: 'Chỉnh sửa toàn bộ', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    mark_verified: { label: 'Đã duyệt / Đã kiểm tra', color: 'bg-green-100 text-green-800 border-green-200' },
    mark_pending: { label: 'Chuyển về Chờ duyệt', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    order_change: { label: 'Đổi thứ tự STT', color: 'bg-slate-100 text-slate-800 border-slate-200' },
}

export function QuestionHistoryModal({
    isOpen,
    onClose,
    questionId,
    questionText,
    orderIndex,
}: QuestionHistoryModalProps) {
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen || !questionId) {
            setHistory([])
            return
        }

        const fetchHistory = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(`/api/admin/interview-questions/${questionId}/history`)
                const payload = await res.json()
                if (payload.success) {
                    setHistory(payload.data || [])
                } else {
                    setError(payload.error || 'Không thể tải lịch sử')
                }
            } catch (err) {
                setError('Lỗi kết nối khi tải lịch sử')
            } finally {
                setLoading(false)
            }
        }

        fetchHistory()
    }, [isOpen, questionId])

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-3xl md:max-w-4xl w-[92vw] max-h-[85vh] overflow-y-auto p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <History className="size-5 text-blue-600" />
                        <span>Lịch sử chỉnh sửa câu hỏi {orderIndex ? `#${orderIndex}` : ''}</span>
                    </DialogTitle>
                    {questionText && (
                        <p className="text-sm text-slate-600 line-clamp-2 mt-1 italic">
                            &quot;{questionText}&quot;
                        </p>
                    )}
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Clock className="size-8 animate-spin text-blue-500 mb-2" />
                            <p className="text-sm">Đang tải lịch sử chỉnh sửa...</p>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
                            <History className="mx-auto size-8 text-slate-400 mb-2" />
                            <p className="text-sm font-medium">Chưa có lịch sử chỉnh sửa nào</p>
                            <p className="text-xs text-slate-400 mt-1">Các lần lưu đáp án hoặc duyệt của giáo viên sẽ được ghi nhận tại đây.</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-blue-200 ml-4 pl-4 space-y-6">
                            {history.map((item, idx) => {
                                const actionMeta = ACTION_LABELS[item.action_type] || {
                                    label: item.action_type,
                                    color: 'bg-slate-100 text-slate-800 border-slate-200',
                                }
                                const dateFormatted = new Date(item.created_at).toLocaleString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                })

                                return (
                                    <div key={item.id || idx} className="relative group">
                                        {/* Timeline node */}
                                        <div className="absolute -left-[25px] top-1.5 size-4 rounded-full border-2 border-white bg-blue-500 shadow-sm" />

                                        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-300">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800 text-sm flex items-center gap-1">
                                                        <User className="size-3.5 text-slate-500" />
                                                        {item.changed_by_name || 'Quản trị viên / Giáo viên'}
                                                    </span>
                                                    {item.changed_by_email && (
                                                        <span className="text-xs text-slate-400">
                                                            ({item.changed_by_email})
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                                                    <Clock className="size-3 text-slate-400" />
                                                    {dateFormatted}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className={`text-xs ${actionMeta.color}`}>
                                                    {actionMeta.label}
                                                </Badge>
                                                {item.change_summary && (
                                                    <span className="text-xs font-medium text-slate-700">
                                                        {item.change_summary}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Extra details diff if any */}
                                            {item.previous_data && item.new_data && item.action_type === 'quick_answer_edit' && (
                                                <div className="mt-2.5 rounded bg-slate-50 p-2 text-xs text-slate-600 space-y-1">
                                                    {item.previous_data.tool_config?.correct_tool !== item.new_data.tool_config?.correct_tool && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-medium text-slate-700">Dụng cụ:</span>
                                                            <span className="line-through text-red-500">{item.previous_data.tool_config?.correct_tool || 'none'}</span>
                                                            <ArrowRight className="size-3 text-slate-400" />
                                                            <span className="text-green-600 font-semibold">{item.new_data.tool_config?.correct_tool}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
