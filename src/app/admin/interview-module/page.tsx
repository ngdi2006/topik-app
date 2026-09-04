'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Search, Filter, Upload, Download, FileSpreadsheet, Save, X, Users, History, CheckCircle2, Clock, CheckCircle } from 'lucide-react'
import { BulkImportModal } from '@/components/admin/BulkImportModal'
import { QuestionHistoryModal } from '@/components/admin/QuestionHistoryModal'
import { TeacherAssignmentManagerModal } from '@/components/admin/TeacherAssignmentManagerModal'
import { resolveToolQuestionConfig, resolveDeskTools, getRequiredTargetForAction, definitionLabel, ACTION_DEFINITIONS, TARGET_DEFINITIONS, TOOL_DEFINITIONS, type ToolQuestionConfig, type VocabularyItem } from '@/components/interview/toolQuestionAnalysis'
import { legacyToolConfigToWorkshopGame } from '@/features/workshop'
import { getWorkshopDetailImage, getWorkshopToolImage } from '@/components/interview/workshopVisualAssets'
import { Badge } from '@/components/ui/badge'

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
    safety_group?: string | null
    safety_topic_number?: number | null
    safety_topic_ko?: string | null
    safety_topic_vi?: string | null
    order_index?: number | null
    review_status?: string | null
    reviewed_by?: string | null
    reviewed_at?: string | null
}

const SAFETY_GROUP_LABELS: Record<string, string> = {
    before_work: 'Trước khi làm việc',
    during_work: 'Trong khi làm việc',
    after_work: 'Sau khi làm việc',
    incident_response: 'Khi có sự cố',
}

type ApiResponse<T> = {
    success: boolean
    data?: T
    total?: number
    error?: string
}

const LIST_STATE_KEY = 'admin_interview_module_list_state_v1'

type InterviewListState = {
    searchQuery: string
    filterCategory: string
    scrollY: number
}

function readListState(): InterviewListState {
    if (typeof window === 'undefined') return { searchQuery: '', filterCategory: 'Tất cả', scrollY: 0 }
    try {
        const stored = JSON.parse(sessionStorage.getItem(LIST_STATE_KEY) || '{}') as Partial<InterviewListState>
        return {
            searchQuery: typeof stored.searchQuery === 'string' ? stored.searchQuery : '',
            filterCategory: typeof stored.filterCategory === 'string' ? stored.filterCategory : 'Tất cả',
            scrollY: typeof stored.scrollY === 'number' ? stored.scrollY : 0,
        }
    } catch {
        return { searchQuery: '', filterCategory: 'Tất cả', scrollY: 0 }
    }
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
    const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({})
    const [, setSavingOrderId] = useState<string | null>(null)
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('Tất cả')
    const [filterReviewStatus, setFilterReviewStatus] = useState<string>('all')
    const [filterMyAssignedOnly, setFilterMyAssignedOnly] = useState(false)
    const [myAssignments, setMyAssignments] = useState<any[]>([])
    const [userRole, setUserRole] = useState<string>('admin')
    const [isRestrictedTeacher, setIsRestrictedTeacher] = useState<boolean>(false)
    const [restrictedMessage, setRestrictedMessage] = useState<string>('')
    
    const isRestoringListState = useRef(true)
    const hasRestoredScroll = useRef(false)
    const pendingScrollY = useRef(0)
    const [inlineEditingId, setInlineEditingId] = useState<string | null>(null)
    const [inlineDraft, setInlineDraft] = useState<ToolQuestionConfig | null>(null)
    const [inlineSavingId, setInlineSavingId] = useState<string | null>(null)

    // Modals state
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [historyModalQuestion, setHistoryModalQuestion] = useState<InterviewQuestionRow | null>(null)
    const [verifyingId, setVerifyingId] = useState<string | null>(null)

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

    const categoriesList = useMemo(() => {
        const set = new Set<string>()
        questions.forEach((q) => {
            if (q.category) set.add(q.category)
        })
        return Array.from(set)
    }, [questions])

    const handleQuickSaveOrder = async (id: string, newOrderVal: string | undefined) => {
        if (newOrderVal === undefined) return
        const orderNum = newOrderVal.trim() === '' ? 0 : parseInt(newOrderVal, 10)
        if (isNaN(orderNum)) return

        const currentQ = questions.find(q => q.id === id)
        if (currentQ && (currentQ.order_index ?? 0) === orderNum) return

        setSavingOrderId(id)
        try {
            const res = await fetch(`/api/admin/interview-questions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_index: orderNum })
            })
            const data = await res.json() as ApiResponse<unknown>
            if (!data.success) throw new Error(data.error)

            toast.success(`Đã cập nhật STT câu hỏi thành ${orderNum}`)
            setQuestions(prev => {
                const updated = prev.map(q => q.id === id ? { ...q, order_index: orderNum } : q)
                return updated.sort((a, b) => {
                    const orderA = a.order_index ?? 0
                    const orderB = b.order_index ?? 0
                    return orderA - orderB
                })
            })
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi cập nhật STT'))
        } finally {
            setSavingOrderId(null)
        }
    }

    const handleToggleVerify = async (q: InterviewQuestionRow) => {
        const newStatus = q.review_status === 'verified' ? 'pending' : 'verified'
        setVerifyingId(q.id)
        try {
            const res = await fetch(`/api/admin/interview-questions/${q.id}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })
            const payload = await res.json()
            if (!res.ok || !payload.success) throw new Error(payload.error || 'Lỗi cập nhật trạng thái')

            toast.success(newStatus === 'verified' ? 'Đã đánh dấu kiểm tra' : 'Đã chuyển về chờ duyệt')
            setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, review_status: newStatus } : item))
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi cập nhật trạng thái')
        } finally {
            setVerifyingId(null)
        }
    }

    const visibleQuestions = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase()

        return questions
            .filter((question) => {
                if (filterMyAssignedOnly && myAssignments.length > 0) {
                    const isAssigned = myAssignments.some((assignment) => {
                        if (assignment.category && question.category !== assignment.category) return false
                        if (assignment.from_order_index !== null && assignment.from_order_index !== undefined) {
                            if ((question.order_index ?? 0) < assignment.from_order_index) return false
                        }
                        if (assignment.to_order_index !== null && assignment.to_order_index !== undefined) {
                            if ((question.order_index ?? 0) > assignment.to_order_index) return false
                        }
                        return true
                    })
                    if (!isAssigned) return false
                }

                if (filterCategory !== 'Tất cả' && question.category !== filterCategory) {
                    return false
                }

                if (filterReviewStatus === 'verified') {
                    return question.review_status === 'verified'
                }
                if (filterReviewStatus === 'pending') {
                    return !question.review_status || question.review_status === 'pending'
                }

                return true
            })
            .filter((question) =>
                !normalizedQuery
                || question.question_text.toLowerCase().includes(normalizedQuery)
                || question.vietnamese_meaning?.toLowerCase().includes(normalizedQuery)
            )
    }, [filterCategory, filterMyAssignedOnly, filterReviewStatus, myAssignments, questions, searchQuery])

    const allVisibleSelected = visibleQuestions.length > 0
        && visibleQuestions.every((question) => selectedQuestionIds.has(question.id))

    useEffect(() => {
        fetchQuestions()
        fetchSettings()
        fetchAssignments()
    }, [])

    useEffect(() => {
        if (isRestoringListState.current) return
        const current = readListState()
        sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({ ...current, searchQuery, filterCategory }))
    }, [filterCategory, searchQuery])

    useEffect(() => {
        const stored = readListState()
        pendingScrollY.current = stored.scrollY
        setSearchQuery(stored.searchQuery)
        setFilterCategory(stored.filterCategory)
        isRestoringListState.current = false
    }, [])

    useEffect(() => {
        if (loading || hasRestoredScroll.current) return
        hasRestoredScroll.current = true
        const frame = requestAnimationFrame(() => window.scrollTo({ top: pendingScrollY.current, behavior: 'instant' }))
        return () => cancelAnimationFrame(frame)
    }, [loading])

    const fetchQuestions = async () => {
        try {
            const res = await fetch('/api/admin/interview-questions')
            const data = await res.json() as ApiResponse<InterviewQuestionRow[]> & { user_role?: string; is_restricted?: boolean; message?: string }
            if (data.success) {
                setQuestions(data.data || [])
                if (data.user_role) setUserRole(data.user_role)
                if (data.is_restricted !== undefined) setIsRestrictedTeacher(data.is_restricted)
                if (data.message) setRestrictedMessage(data.message)
            }
        } catch {
            toast.error('Lỗi tải danh sách câu hỏi')
        } finally {
            setLoading(false)
        }
    }

    const fetchAssignments = async () => {
        try {
            const res = await fetch('/api/admin/interview-assignments')
            const data = await res.json()
            if (data.success) {
                setMyAssignments(data.data || [])
            }
        } catch {
            // Non-blocking
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

            toast.success('Xóa câu hỏi thành công', { id: toastId })
            setQuestions(questions.filter(q => q.id !== id))
            setSelectedQuestionIds((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi xóa câu hỏi'), { id: toastId })
        }
    }

    const handleBulkDelete = async () => {
        const count = selectedQuestionIds.size
        if (count === 0) return
        if (!confirm(`Bạn có chắc chắn muốn xóa ${count} câu hỏi đã chọn không?`)) return

        setIsBulkDeleting(true)
        const toastId = toast.loading(`Đang xoá ${count} câu hỏi...`)
        try {
            const idsToDelete = Array.from(selectedQuestionIds)
            const res = await fetch('/api/admin/interview-questions/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToDelete })
            })
            const data = await res.json() as ApiResponse<unknown>
            if (!data.success) throw new Error(data.error)

            toast.success(`Đã xoá thành công ${count} câu hỏi`, { id: toastId })
            setQuestions(prev => prev.filter(q => !selectedQuestionIds.has(q.id)))
            setSelectedQuestionIds(new Set())
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi xoá hàng loạt'), { id: toastId })
        } finally {
            setIsBulkDeleting(false)
        }
    }

    const toggleQuestionSelection = (id: string) => {
        setSelectedQuestionIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const toggleAllVisibleQuestions = () => {
        setSelectedQuestionIds((prev) => {
            const next = new Set(prev)
            if (allVisibleSelected) {
                visibleQuestions.forEach((question) => next.delete(question.id))
            } else {
                visibleQuestions.forEach((question) => next.add(question.id))
            }
            return next
        })
    }

    const rememberListPosition = () => {
        sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({
            searchQuery,
            filterCategory,
            scrollY: window.scrollY,
        }))
    }

    const getToolAnalysisSummary = (q: InterviewQuestionRow) => {
        if (q.category !== 'Sử dụng công cụ') return null
        const config = resolveToolQuestionConfig(q.question_text || '', q.vietnamese_meaning || '', q.tool_config)
        return {
            tool: definitionLabel(TOOL_DEFINITIONS, config.correct_tool),
            target: config.requires_target === false ? 'Không nêu trong câu' : definitionLabel(TARGET_DEFINITIONS, config.target_object),
            action: config.requires_action ? definitionLabel(ACTION_DEFINITIONS, config.correct_action || '') : 'Đặt/cất đúng vị trí',
            vocabulary: config.vocabulary_analysis || []
        }
    }

    const openInlineAnswerEditor = (q: InterviewQuestionRow) => {
        const resolved = resolveToolQuestionConfig(q.question_text || '', q.vietnamese_meaning || '', q.tool_config)
        setInlineEditingId(q.id)
        setInlineDraft(resolved)
    }

    const closeInlineAnswerEditor = () => {
        setInlineEditingId(null)
        setInlineDraft(null)
    }

    const updateInlineDraft = (patch: Partial<ToolQuestionConfig>) => {
        setInlineDraft((current) => {
            if (!current) return current
            const nextDraft = {
                ...current,
                ...patch,
            }
            if (patch.correct_action !== undefined) {
                const autoTarget = getRequiredTargetForAction(patch.correct_action)
                if (autoTarget) {
                    nextDraft.requires_target = true
                    nextDraft.target_object = autoTarget
                }
            }
            return nextDraft
        })
    }

    const saveInlineAnswer = async (question: InterviewQuestionRow) => {
        if (!inlineDraft) return
        setInlineSavingId(question.id)
        const toastId = toast.loading('Đang lưu đáp án chấm điểm...')
        try {
            const answerSteps: NonNullable<ToolQuestionConfig['answer_steps']> = [
                { step: 1, kind: 'tool', expected: inlineDraft.correct_tool },
            ]
            if (inlineDraft.requires_target !== false) {
                answerSteps.push({ step: 2, kind: 'target', expected: inlineDraft.target_object })
            }
            if (inlineDraft.requires_action) {
                answerSteps.push({ step: inlineDraft.requires_target === false ? 2 : 3, kind: 'action', expected: inlineDraft.correct_action || '' })
            }

            const toolDef = TOOL_DEFINITIONS.find((item) => item.id === inlineDraft.correct_tool)
            const targetDef = TARGET_DEFINITIONS.find((item) => item.id === inlineDraft.target_object)
            const actionDef = ACTION_DEFINITIONS.find((item) => item.id === inlineDraft.correct_action)
            const updatedVocabulary: VocabularyItem[] = [
                { term: toolDef ? (toolDef.patterns.map((p) => question.question_text?.match(p)?.[0]).find(Boolean) || toolDef.ko) : inlineDraft.correct_tool, meaning: toolDef?.label || inlineDraft.correct_tool, role: 'tool' },
                inlineDraft.requires_target !== false
                    ? { term: targetDef ? (targetDef.patterns.map((p) => question.question_text?.match(p)?.[0]).find(Boolean) || targetDef.ko) : inlineDraft.target_object, meaning: targetDef?.label || inlineDraft.target_object, role: 'target' }
                    : { term: '—', meaning: 'Không nêu trong câu', role: 'target' },
                inlineDraft.requires_action && actionDef
                    ? { term: actionDef.patterns.map((p) => question.question_text?.match(p)?.[0]).find(Boolean) || actionDef.ko, meaning: actionDef.label, role: 'action' }
                    : { term: '정해진 곳에 넣다', meaning: 'Đặt/cất đúng vị trí', role: 'action' }
            ]

            const updatedConfig: ToolQuestionConfig = {
                ...inlineDraft,
                manual_override: true,
                tools_on_desk: resolveDeskTools(inlineDraft.correct_tool),
                vocabulary_analysis: updatedVocabulary,
                answer_steps: answerSteps,
                scoring: {
                    tool: 1,
                    target: inlineDraft.requires_target === false ? 0 : 1,
                    action: inlineDraft.requires_action ? 1 : 0,
                    pass_all_required: true,
                },
                game_config: legacyToolConfigToWorkshopGame({ ...inlineDraft, game_config: null }),
            }
            const toolLabel = definitionLabel(TOOL_DEFINITIONS, updatedConfig.correct_tool)
            const targetLabel = definitionLabel(TARGET_DEFINITIONS, updatedConfig.target_object)
            const actionLabel = definitionLabel(ACTION_DEFINITIONS, updatedConfig.correct_action || '')
            const generatedAnswer = updatedConfig.requires_target === false
                ? `Chọn ${toolLabel}; thực hiện ${actionLabel}.`
                : updatedConfig.requires_action
                    ? `Chọn ${toolLabel}; tác động vào ${targetLabel}; thực hiện ${actionLabel}.`
                    : `Chọn ${toolLabel}; đặt đúng vào ${targetLabel}.`
            const existingAnswers = Array.isArray(question.suggested_answers)
                ? question.suggested_answers
                : question.suggested_answers ? [question.suggested_answers] : []
            const response = await fetch(`/api/admin/interview-questions/${question.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...question,
                    is_quick_edit: true,
                    suggested_answers: [generatedAnswer, ...existingAnswers.slice(1)],
                    tool_config: updatedConfig,
                }),
            })
            const payload = await response.json() as ApiResponse<InterviewQuestionRow>
            if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || 'Không thể lưu đáp án')
            setQuestions((current) => current.map((item) => item.id === question.id ? payload.data! : item))
            toast.success('Đã cập nhật đáp án chấm điểm', { id: toastId })
            closeInlineAnswerEditor()
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Không thể lưu đáp án'), { id: toastId })
        } finally {
            setInlineSavingId(null)
        }
    }

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'STT': 1,
                'Ngành nghề': 'Sản xuất chế tạo',
                'Phân loại': 'Sử dụng công cụ',
                'Câu hỏi (Tiếng Hàn)': '드라이버로 나사를 조이세요.',
                'Dịch nghĩa (Tiếng Việt)': 'Hãy dùng tua vít để vặn ốc.',
                'Gợi ý câu trả lời': '네, 드라이버로 나사를 조이겠습니다.',
                'Thời gian chờ (giây)': 10,
                'Tên file âm thanh': 'audio_1.mp3',
                'Tên file ảnh': 'driver_screw.png',
                'Vùng thao tác (ID)': 'zone_table_1'
            }
        ]

        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template')
        XLSX.writeFile(wb, 'Mau_Import_Cau_Hoi_Phong_Van.xlsx')
    }

    const handleExportExcel = () => {
        const exportSource = selectedQuestionIds.size > 0
            ? visibleQuestions.filter(q => selectedQuestionIds.has(q.id))
            : visibleQuestions

        if (exportSource.length === 0) {
            toast.error('Không có câu hỏi nào để xuất Excel')
            return
        }

        const dataToExport = exportSource.map((q, idx) => {
            const suggestedAnswersStr = Array.isArray(q.suggested_answers) 
                ? q.suggested_answers.join('\n') 
                : (q.suggested_answers || '')

            return {
                'STT': q.order_index !== null && q.order_index !== undefined ? q.order_index : idx + 1,
                'Ngành nghề': q.industry || 'Sản xuất chế tạo',
                'Phân loại': q.category || '',
                'Câu hỏi (Tiếng Hàn)': q.question_text || '',
                'Dịch nghĩa (Tiếng Việt)': q.vietnamese_meaning || '',
                'Gợi ý câu trả lời': suggestedAnswersStr,
                'Thời gian chờ (giây)': q.countdown_after_audio || 0,
                'Tên file âm thanh': q.question_audio_url || '',
                'Tên file ảnh': q.tool_image_url || '',
                'Vùng thao tác (ID)': q.target_zone_id || '',
                'Trạng thái duyệt': q.review_status === 'verified' ? 'Đã kiểm tra' : 'Chờ duyệt'
            }
        })

        const ws = XLSX.utils.json_to_sheet(dataToExport)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách câu hỏi')
        
        const timestamp = new Date().toISOString().slice(0, 10)
        XLSX.writeFile(wb, `Danh_Sach_Cau_Hoi_Phong_Van_${timestamp}.xlsx`)
        toast.success(`Đã xuất thành công ${dataToExport.length} câu hỏi ra Excel!`)
    }

    return (
        <div className="p-6 space-y-6 w-full max-w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Luyện Phỏng Vấn Vòng 2</h1>
                    <p className="text-sm text-slate-500">Quản lý câu hỏi, phân công giáo viên rà soát và cấu hình AI chấm điểm</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {userRole === 'admin' ? (
                        <Button 
                            variant="outline" 
                            onClick={() => setIsAssignModalOpen(true)}
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
                        >
                            <Users className="w-4 h-4 mr-2 text-blue-600" />
                            Phân công giáo viên
                        </Button>
                    ) : (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs py-1 px-3">
                            🧑‍🏫 Tài khoản Giáo viên
                        </Badge>
                    )}
                </div>
            </div>

            <Tabs defaultValue="questions" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="questions">Danh sách câu hỏi {isRestrictedTeacher ? `(${questions.length} câu được giao)` : ''}</TabsTrigger>
                    {userRole === 'admin' && (
                        <TabsTrigger value="settings">Cấu hình AI (Theo ngành)</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="questions" className="space-y-4">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white p-4 rounded-lg border">
                        <div className="flex flex-1 flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Tìm câu hỏi..."
                                    className="pl-9 text-xs"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="w-[160px] text-xs">
                                    <Filter className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                                    <SelectValue placeholder="Phân loại" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tất cả">Tất cả danh mục</SelectItem>
                                    <SelectItem value="Khẩu lệnh">Khẩu lệnh</SelectItem>
                                    <SelectItem value="Giao tiếp">Giao tiếp</SelectItem>
                                    <SelectItem value="Toán học">Toán học</SelectItem>
                                    <SelectItem value="Sử dụng công cụ">Sử dụng công cụ</SelectItem>
                                    <SelectItem value="Xử lý tình huống">Xử lý tình huống</SelectItem>
                                    <SelectItem value="An toàn lao động">An toàn lao động</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filterReviewStatus} onValueChange={setFilterReviewStatus}>
                                <SelectTrigger className="w-[150px] text-xs">
                                    <SelectValue placeholder="Trạng thái duyệt" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                    <SelectItem value="pending">⏳ Chờ duyệt</SelectItem>
                                    <SelectItem value="verified">✓ Đã kiểm tra</SelectItem>
                                </SelectContent>
                            </Select>

                            {myAssignments.length > 0 && (
                                <Button
                                    variant={filterMyAssignedOnly ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        const nextState = !filterMyAssignedOnly
                                        setFilterMyAssignedOnly(nextState)
                                        if (nextState) {
                                            setFilterCategory('Tất cả')
                                        }
                                    }}
                                    className={`text-xs h-9 ${filterMyAssignedOnly ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-700 border-blue-200 bg-blue-50/60 hover:bg-blue-100'}`}
                                >
                                    <CheckCircle className="size-3.5 mr-1.5" />
                                    Nhiệm vụ của tôi ({myAssignments.length})
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-2 w-full lg:w-auto shrink-0 flex-wrap justify-end">
                            <Button variant="outline" size="sm" onClick={handleExportExcel} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 text-xs">
                                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                                Xuất Excel{selectedQuestionIds.size > 0 ? ` (${selectedQuestionIds.size})` : ''}
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="text-xs">
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                Mẫu Excel
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => setIsImportModalOpen(true)} className="whitespace-nowrap text-xs">
                                <Upload className="w-3.5 h-3.5 mr-1.5" />
                                Import Excel (+ Zip Ảnh)
                            </Button>
                            <Button size="sm" onClick={() => router.push('/admin/interview-module/create')} className="bg-blue-600 hover:bg-blue-700 text-xs">
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Thêm câu hỏi
                            </Button>
                        </div>
                    </div>

                    {isRestrictedTeacher && (
                        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                                        ✓
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">Nhiệm vụ rà soát của bạn</h4>
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            {questions.length > 0
                                                ? `Bạn đang có ${questions.length} câu hỏi được phân công để kiểm tra nội dung và đáp án chấm điểm.`
                                                : (restrictedMessage || 'Bạn chưa có câu hỏi nào được phân công. Vui lòng liên hệ Quản trị viên.')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-xs font-semibold text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-xs">
                                    Đã duyệt: {questions.filter(q => q.review_status === 'verified').length} / {questions.length} câu
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-700">
                                    {filterCategory === 'Tất cả' ? 'Tất cả câu hỏi' : filterCategory}
                                </span>
                                {filterMyAssignedOnly && (
                                    <Badge className="bg-blue-600 text-white text-xs">Đang lọc theo phân công</Badge>
                                )}
                                {filterReviewStatus !== 'all' && (
                                    <Badge variant="outline" className="bg-white text-xs">
                                        {filterReviewStatus === 'verified' ? 'Đã kiểm tra' : 'Chờ duyệt'}
                                    </Badge>
                                )}
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
                                        <Trash2 aria-hidden="true" className="size-3.5 mr-1" />
                                        {isBulkDeleting ? 'Đang xoá…' : `Xoá ${selectedQuestionIds.size} câu`}
                                    </Button>
                                ) : null}
                                <span className="rounded-full bg-white px-3 py-1 font-bold text-blue-700 shadow-sm ring-1 ring-blue-100 text-xs">
                                    Hiển thị {visibleQuestions.length} / {questions.length} câu
                                </span>
                            </div>
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="text-center py-10 text-slate-500 text-sm">Đang tải danh sách câu hỏi...</div>
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
                                        <th className="w-20 px-2 py-3 font-semibold text-gray-600 text-center">STT</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600">Ngành / Phân loại</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Câu hỏi (Tiếng Hàn)</th>
                                        <th className="w-32 px-3 py-3 font-semibold text-gray-600 text-center">Rà soát</th>
                                        <th className="px-4 py-3 font-semibold text-gray-600 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {visibleQuestions.map((q, idx) => {
                                        const isVerified = q.review_status === 'verified'
                                        const isVerifyingThis = verifyingId === q.id

                                        return (
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
                                                <td className="px-2 py-4 text-center align-top whitespace-nowrap">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-16 h-8 text-center text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 focus:bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-1 transition-all shadow-xs"
                                                            value={orderDrafts[q.id] !== undefined ? orderDrafts[q.id] : (q.order_index ?? '')}
                                                            onChange={(e) => setOrderDrafts(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.currentTarget.blur()
                                                                }
                                                            }}
                                                            onBlur={() => handleQuickSaveOrder(q.id, orderDrafts[q.id])}
                                                            title="Nhập số thứ tự và nhấn Enter hoặc click ra ngoài để lưu"
                                                        />
                                                        <span className="text-[10px] text-slate-400 font-medium" title="Vị trí hiển thị">#{idx + 1}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap align-top">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[11px] font-medium">
                                                            {q.industry || 'Sản xuất chế tạo'}
                                                        </span>
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-medium">
                                                            {q.category}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium">{q.question_text}</div>
                                                    <div className="text-gray-500 text-xs mt-1 line-clamp-1">{q.vietnamese_meaning}</div>
                                                    {getToolAnalysisSummary(q) && (
                                                        <div className="mt-2 rounded-md border border-orange-100 bg-orange-50 px-2 py-1.5 text-xs text-orange-900">
                                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                                <div className="font-medium">
                                                                    Công cụ: {getToolAnalysisSummary(q)?.tool} | Vật thể: {getToolAnalysisSummary(q)?.target} | Thao tác: {getToolAnalysisSummary(q)?.action}
                                                                </div>
                                                                {inlineEditingId !== q.id ? (
                                                                    <button className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50" onClick={() => openInlineAnswerEditor(q)} type="button"><Edit className="size-3" />Sửa đáp án nhanh</button>
                                                                ) : null}
                                                            </div>
                                                            <div className="mt-1 text-orange-700 line-clamp-1">
                                                                {getToolAnalysisSummary(q)?.vocabulary.map((item: VocabularyItem) => `${item.term}: ${item.meaning}`).join(' · ')}
                                                            </div>
                                                            {inlineEditingId === q.id && inlineDraft ? (
                                                                <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3 shadow-sm">
                                                                    <div className="grid gap-3 lg:grid-cols-3">
                                                                        <label className="space-y-1"><span className="font-semibold text-slate-700">Dụng cụ đúng</span><select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900" onChange={(event) => updateInlineDraft({ correct_tool: event.target.value })} value={inlineDraft.correct_tool}>{TOOL_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label} ({item.ko})</option>)}</select></label>
                                                                        <label className="space-y-1"><span className="font-semibold text-slate-700">Vật thể đúng</span><select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900" onChange={(event) => event.target.value === '__none__' ? updateInlineDraft({ requires_target: false }) : updateInlineDraft({ requires_target: true, target_object: event.target.value })} value={inlineDraft.requires_target === false ? '__none__' : inlineDraft.target_object}><option disabled={!inlineDraft.requires_action || Boolean(getRequiredTargetForAction(inlineDraft.correct_action))} value="__none__">Không có vật thể</option>{TARGET_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label} ({item.ko})</option>)}</select></label>
                                                                        <label className="space-y-1"><span className="font-semibold text-slate-700">Thao tác đúng</span>{inlineDraft.requires_action ? <select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900" onChange={(event) => updateInlineDraft({ correct_action: event.target.value })} value={inlineDraft.correct_action || ''}>{ACTION_DEFINITIONS.filter((item) => item.id !== 'store').map((item) => <option key={item.id} value={item.id}>{item.label} ({item.ko})</option>)}</select> : <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-2 text-xs font-medium text-slate-600">Đặt/cất đúng vị trí</div>}</label>
                                                                    </div>
                                                                    <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3">
                                                                        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                                                                            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-white">
                                                                                {getWorkshopToolImage(inlineDraft.correct_tool) ? <Image alt={definitionLabel(TOOL_DEFINITIONS, inlineDraft.correct_tool)} className="size-14 object-contain" height={64} src={getWorkshopToolImage(inlineDraft.correct_tool)!} width={64} /> : <span className="text-[10px] text-slate-400">Chưa có ảnh</span>}
                                                                            </div>
                                                                            <div className="min-w-0"><p className="text-[10px] font-bold uppercase text-blue-500">1. Dụng cụ</p><p className="mt-1 line-clamp-2 font-semibold text-slate-800">{definitionLabel(TOOL_DEFINITIONS, inlineDraft.correct_tool)}</p></div>
                                                                        </div>
                                                                        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                                                                            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-white">
                                                                                {inlineDraft.requires_target === false ? <span className="px-1 text-center text-[10px] font-semibold text-slate-500">Không có vật thể</span> : getWorkshopDetailImage(inlineDraft.target_object) ? <Image alt={definitionLabel(TARGET_DEFINITIONS, inlineDraft.target_object)} className="size-14 object-contain" height={64} src={getWorkshopDetailImage(inlineDraft.target_object)!} width={64} /> : <span className="text-[10px] text-slate-400">Chưa có ảnh</span>}
                                                                            </div>
                                                                            <div className="min-w-0"><p className="text-[10px] font-bold uppercase text-violet-500">2. Vật thể</p><p className="mt-1 line-clamp-2 font-semibold text-slate-800">{inlineDraft.requires_target === false ? 'Không có vật thể' : definitionLabel(TARGET_DEFINITIONS, inlineDraft.target_object)}</p></div>
                                                                        </div>
                                                                        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-100">
                                                                            <div className="grid size-16 shrink-0 place-items-center rounded-md bg-emerald-100 px-1 text-center text-[11px] font-black text-emerald-700">{inlineDraft.requires_action ? definitionLabel(ACTION_DEFINITIONS, inlineDraft.correct_action || '') : 'Không yêu cầu'}</div>
                                                                            <div className="min-w-0"><p className="text-[10px] font-bold uppercase text-emerald-600">{inlineDraft.requires_target === false ? '2' : '3'}. Thao tác</p><p className="mt-1 line-clamp-2 font-semibold text-slate-800">{inlineDraft.requires_action ? definitionLabel(ACTION_DEFINITIONS, inlineDraft.correct_action || '') : 'Không yêu cầu thao tác'}</p></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-3 flex justify-end gap-2">
                                                                        <Button className="h-8 px-3 text-xs" disabled={inlineSavingId === q.id} onClick={closeInlineAnswerEditor} size="sm" variant="outline"><X className="size-3.5" />Hủy</Button>
                                                                        <Button className="h-8 px-3 text-xs" disabled={inlineSavingId === q.id} onClick={() => void saveInlineAnswer(q)} size="sm">{inlineSavingId === q.id ? <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save className="size-3.5" />}Lưu đáp án</Button>
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                    {q.category === 'An toàn lao động' && q.safety_group && (
                                                        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
                                                            <div className="font-semibold">
                                                                {SAFETY_GROUP_LABELS[q.safety_group] || q.safety_group}
                                                                {q.safety_topic_number ? ` · Chủ đề ${q.safety_topic_number}` : ''}
                                                            </div>
                                                            {(q.safety_topic_ko || q.safety_topic_vi) && (
                                                                <div className="mt-1 text-amber-800">
                                                                    {[q.safety_topic_ko, q.safety_topic_vi].filter(Boolean).join(' · ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-4 text-center align-top whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleToggleVerify(q)}
                                                        disabled={isVerifyingThis}
                                                        title={isVerified ? 'Click để chuyển về Chưa duyệt' : 'Click để xác nhận Đã kiểm tra'}
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                                                            isVerified
                                                                ? 'bg-green-50 text-green-700 ring-1 ring-green-300 hover:bg-green-100'
                                                                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:ring-amber-300'
                                                        }`}
                                                    >
                                                        {isVerifyingThis ? (
                                                            <span className="size-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                                        ) : isVerified ? (
                                                            <CheckCircle2 className="size-3.5 text-green-600" />
                                                        ) : (
                                                            <Clock className="size-3.5 text-slate-400" />
                                                        )}
                                                        <span>{isVerified ? 'Đã kiểm tra' : 'Chờ duyệt'}</span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 text-right align-top whitespace-nowrap space-x-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Xem lịch sử chỉnh sửa"
                                                        onClick={() => setHistoryModalQuestion(q)}
                                                        className="text-slate-500 hover:text-purple-600 hover:bg-purple-50"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        aria-label="Chỉnh sửa câu hỏi"
                                                        onClick={() => {
                                                            rememberListPosition()
                                                            router.push(`/admin/interview-module/${q.id}`)
                                                        }}
                                                        className="text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        aria-label="Xoá câu hỏi"
                                                        onClick={() => handleDelete(q.id)}
                                                        className="text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {visibleQuestions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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

            {/* Modals */}
            <BulkImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                onSuccess={fetchQuestions} 
            />

            <TeacherAssignmentManagerModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                categories={categoriesList}
                onAssignmentChanged={fetchAssignments}
            />

            <QuestionHistoryModal
                isOpen={Boolean(historyModalQuestion)}
                onClose={() => setHistoryModalQuestion(null)}
                questionId={historyModalQuestion?.id || null}
                questionText={historyModalQuestion?.question_text}
                orderIndex={historyModalQuestion?.order_index}
            />
        </div>
    )
}
