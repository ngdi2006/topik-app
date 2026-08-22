'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MediaUploader } from '@/components/admin/MediaUploader'
import { ArrowLeft, Save, Plus, Trash2, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { analyzeToolQuestionText, resolveToolQuestionConfig, ACTION_DEFINITIONS, TARGET_DEFINITIONS, TOOL_DEFINITIONS, type VocabularyItem } from '@/components/interview/toolQuestionAnalysis'
import { legacyToolConfigToWorkshopGame, type WorkshopGameConfig } from '@/features/workshop'
import { WorkshopGamePreview } from '@/features/workshop/components'
import { getWorkshopDetailImage, getWorkshopToolImage } from '@/components/interview/workshopVisualAssets'

type ToolAnswerStep = {
    step: number
    kind: 'tool' | 'target' | 'action'
    expected: string
}

type ToolConfig = {
    schema_version?: number
    tools_on_desk: string[]
    correct_tool: string
    target_object: string
    correct_action: string | null
    requires_action: boolean
    vocabulary_analysis: VocabularyItem[]
    answer_steps?: ToolAnswerStep[]
    scoring?: {
        tool: number
        target: number
        action: number
        pass_all_required: boolean
    }
    vietnamese_instruction?: string
    game_config?: WorkshopGameConfig | null
}

type InitialInterviewQuestion = {
    id?: string
    industry?: string
    category?: string
    question_text?: string
    vietnamese_meaning?: string
    question_audio_url?: string
    suggested_answers?: string[] | null
    countdown_after_audio?: number | string | null
    tool_image_url?: string
    target_zone_id?: string
    tool_config?: ToolConfig | null
}

interface InterviewQuestionFormProps {
    initialData?: InitialInterviewQuestion
    isEdit?: boolean
}

const CATEGORIES = ['Khẩu lệnh', 'Giao tiếp', 'Toán học', 'Sử dụng công cụ', 'Xử lý tình huống', 'An toàn lao động']
const INDUSTRIES = ['Sản xuất chế tạo', 'Ngư nghiệp', 'Nông nghiệp', 'Lâm nghiệp', 'Xây dựng', 'Dịch vụ']

const TOOL_OPTIONS = [
    { id: 'phillips_screwdriver', label: 'Tua vít chữ thập', ko: '십자드라이버' },
    { id: 'flat_screwdriver', label: 'Tua vít dẹt', ko: '일자드라이버' },
    { id: 'screwdriver', label: 'Tua vít thường', ko: '드라이버' },
    { id: 'allen_wrench', label: 'Cờ lê lục giác', ko: '육각 렌치' },
    { id: 'wrench', label: 'Cờ lê / Mỏ lết', ko: '스패너 / 렌치' },
    { id: 'pliers', label: 'Kìm', ko: '펜치 / 니퍼' },
    { id: 'hammer', label: 'Búa', ko: '망치' },
    { id: 'saw', label: 'Cưa tay', ko: '톱' },
    { id: 'welder', label: 'Máy hàn', ko: '용접기' },
    { id: 'ruler', label: 'Thước đo', ko: '줄자' }
]

const TARGET_OBJECT_OPTIONS = [
    { id: 'phillips_screw', label: 'Ốc vít rãnh chữ thập', ko: '십자 홈이 있는 나사' },
    { id: 'slotted_screw', label: 'Ốc vít rãnh dẹt', ko: '일자 홈이 있는 나사' },
    { id: 'hex_bolt', label: 'Bu lông / ốc lục giác', ko: '볼트' },
    { id: 'electric_wire', label: 'Dây điện / dây dẫn', ko: '전선' },
    { id: 'gear', label: 'Bánh răng', ko: '기어' },
    { id: 'metal_pipe', label: 'Ống sắt', ko: '철관' },
    { id: 'switch_power', label: 'Cầu dao / công tắc', ko: '스위치' },
    { id: 'emergency_button', label: 'Nút khẩn cấp', ko: '비상 버튼' },
    { id: 'signal_light', label: 'Đèn báo', ko: '신호등' },
    { id: 'toolbox_center', label: 'Hộp công cụ chung', ko: '공구함' },
    { id: 'special_box', label: 'Hộp chuyên dụng', ko: '전용함' },
    { id: 'shelf_top_left', label: 'Kệ trên trái', ko: '왼쪽 위 선반' },
    { id: 'shelf_bottom_left', label: 'Kệ dưới trái', ko: '왼쪽 아래 선반' },
    { id: 'shelf_top_right', label: 'Kệ trên phải', ko: '오른쪽 위 선반' },
    { id: 'shelf_bottom_right', label: 'Kệ dưới phải', ko: '오른쪽 아래 선반' }
]

const ACTION_OPTIONS = [
    { id: 'clockwise', label: 'Vặn vào / siết ốc', ko: '조이다' },
    { id: 'counter_clockwise', label: 'Vặn ra / tháo ốc', ko: '풀다' },
    { id: 'cut', label: 'Cắt', ko: '자르다' },
    { id: 'strip', label: 'Tuốt vỏ dây', ko: '피복을 벗기다' },
    { id: 'turn_on', label: 'Bật / gạt lên', ko: '켜다 / 올리다' },
    { id: 'turn_off', label: 'Tắt / gạt xuống', ko: '끄다 / 내리다' },
    { id: 'push', label: 'Đặt vào / cất vào', ko: '넣다' },
    { id: 'pull', label: 'Lấy ra / kéo ra', ko: '빼다' }
]

const TOOL_SELECT_OPTIONS = [
    ...TOOL_OPTIONS,
    ...TOOL_DEFINITIONS
        .filter((definition) => !TOOL_OPTIONS.some((item) => item.id === definition.id))
        .map((definition) => ({ id: definition.id, label: definition.label, ko: definition.ko }))
]

const TARGET_SELECT_OPTIONS = [
    ...TARGET_OBJECT_OPTIONS,
    ...TARGET_DEFINITIONS
        .filter((definition) => !TARGET_OBJECT_OPTIONS.some((item) => item.id === definition.id))
        .map((definition) => ({ id: definition.id, label: definition.label, ko: definition.ko }))
]

const ACTION_SELECT_OPTIONS = [
    ...ACTION_OPTIONS,
    ...ACTION_DEFINITIONS
        .filter((definition) => !ACTION_OPTIONS.some((item) => item.id === definition.id))
        .map((definition) => ({ id: definition.id, label: definition.label, ko: definition.ko }))
]

const DEFAULT_TOOL_CONFIG: ToolConfig = {
    schema_version: 2,
    tools_on_desk: ['phillips_screwdriver', 'flat_screwdriver', 'screwdriver', 'wrench', 'pliers'],
    correct_tool: 'phillips_screwdriver',
    target_object: 'phillips_screw',
    correct_action: 'clockwise',
    requires_action: true,
    vocabulary_analysis: [
        { term: '십자드라이버', meaning: 'tua vít chữ thập', role: 'tool' },
        { term: '십자 홈이 있는 나사', meaning: 'ốc vít có rãnh chữ thập', role: 'target' },
        { term: '조이는 행동', meaning: 'hành động siết/vặn vào', role: 'action' }
    ],
    answer_steps: [
        { step: 1, kind: 'tool', expected: 'phillips_screwdriver' },
        { step: 2, kind: 'target', expected: 'phillips_screw' },
        { step: 3, kind: 'action', expected: 'clockwise' }
    ],
    scoring: { tool: 1, target: 1, action: 1, pass_all_required: true },
    game_config: {
        schemaVersion: 1,
        type: 'tool_action',
        toolId: 'phillips_screwdriver',
        objectId: 'bolt',
        actionId: 'tighten',
        distractorIds: ['hammer', 'adjustable_wrench', 'diagonal_cutters']
    }
}

function buildToolConfig(config: ToolConfig, vietnameseInstruction: string): ToolConfig {
    const answerSteps: ToolAnswerStep[] = [
        { step: 1, kind: 'tool', expected: config.correct_tool },
        { step: 2, kind: 'target', expected: config.target_object }
    ]

    if (config.requires_action) {
        answerSteps.push({ step: 3, kind: 'action', expected: config.correct_action || '' })
    }

    return {
        ...config,
        vietnamese_instruction: vietnameseInstruction,
        answer_steps: answerSteps,
        scoring: {
            tool: 1,
            target: 1,
            action: config.requires_action ? 1 : 0,
            pass_all_required: true
        }
    }
}

function buildToolAnswerText(config: ToolConfig) {
    const tool = TOOL_SELECT_OPTIONS.find((item) => item.id === config.correct_tool)?.label || config.correct_tool
    const target = TARGET_SELECT_OPTIONS.find((item) => item.id === config.target_object)?.label || config.target_object
    const action = ACTION_SELECT_OPTIONS.find((item) => item.id === config.correct_action)?.label || config.correct_action || ''
    return config.requires_action
        ? `Chọn ${tool}; tác động vào ${target}; thực hiện ${action}.`
        : `Chọn ${tool}; đặt đúng vào ${target}.`
}

function AnswerVisualPreview({ config }: { config: ToolConfig }) {
    const tool = TOOL_SELECT_OPTIONS.find((item) => item.id === config.correct_tool)
    const target = TARGET_SELECT_OPTIONS.find((item) => item.id === config.target_object)
    const action = ACTION_SELECT_OPTIONS.find((item) => item.id === config.correct_action)
    const toolImage = getWorkshopToolImage(config.correct_tool)
    const targetImage = getWorkshopDetailImage(config.target_object)

    const items = [
        { key: 'tool', eyebrow: '1. Dụng cụ', label: tool?.label || config.correct_tool, image: toolImage },
        { key: 'target', eyebrow: '2. Chi tiết / vật thể', label: target?.label || config.target_object, image: targetImage },
    ]

    return (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
            {items.map((item) => (
                <div key={item.key} className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                    <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-white">
                        {item.image ? (
                            <Image src={item.image} alt={item.label} width={96} height={96} className="size-[72px] object-contain" />
                        ) : (
                            <div className="grid place-items-center gap-1 text-center text-[10px] text-slate-400">
                                <ImageIcon className="size-5" />
                                <span>Chưa có ảnh</span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.eyebrow}</p>
                        <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">{item.label}</p>
                    </div>
                </div>
            ))}
            <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-emerald-50 text-center text-sm font-extrabold text-emerald-700">
                    {action?.label || config.correct_action || '—'}
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">3. Thao tác</p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">{action?.label || config.correct_action || 'Không chọn'}</p>
                </div>
            </div>
        </div>
    )
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Lỗi khi lưu'
}

function resolveInitialToolConfig(initialData?: InitialInterviewQuestion): ToolConfig {
    if (initialData?.category !== CATEGORIES[3]) return initialData?.tool_config || DEFAULT_TOOL_CONFIG
    const resolved = resolveToolQuestionConfig(
        initialData.question_text || '',
        initialData.vietnamese_meaning || '',
        initialData.tool_config
    )
    return {
        ...resolved,
        game_config: resolved.game_config || legacyToolConfigToWorkshopGame(resolved)
    }
}

export function InterviewQuestionForm({ initialData, isEdit }: InterviewQuestionFormProps) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [initialToolConfig] = useState(() => resolveInitialToolConfig(initialData))
    const [formData, setFormData] = useState({
        industry: initialData?.industry || 'Sản xuất chế tạo',
        category: initialData?.category || 'Khẩu lệnh',
        question_text: initialData?.question_text || '',
        vietnamese_meaning: initialData?.vietnamese_meaning || '',
        question_audio_url: initialData?.question_audio_url || '',
        suggested_answers: initialData?.suggested_answers || [''],
        countdown_after_audio: initialData?.countdown_after_audio || 5,
        tool_image_url: initialData?.tool_image_url || '',
        target_zone_id: initialData?.target_zone_id || '',
        tool_config: initialToolConfig
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

            const toolConfig = buildToolConfig(formData.tool_config, formData.vietnamese_meaning)
            const generatedToolAnswer = buildToolAnswerText(toolConfig)
            const isSubmittingToolCategory = formData.category === CATEGORIES[3]
            const finalAnswers = isSubmittingToolCategory
                ? Array.from(new Set([generatedToolAnswer, ...cleanedAnswers]))
                : cleanedAnswers

            const payload = {
                ...formData,
                suggested_answers: finalAnswers.length > 0 ? finalAnswers : null,
                countdown_after_audio: parseInt(String(formData.countdown_after_audio)) || 0,
                tool_config: isSubmittingToolCategory ? toolConfig : null
            }

            const questionId = initialData?.id
            if (isEdit && !questionId) throw new Error('Missing question ID')

            const url = isEdit
                ? `/api/admin/interview-questions/${questionId}`
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
        } catch (error: unknown) {
            toast.error(getErrorMessage(error), { id: toastId })
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
        const newAnswers = formData.suggested_answers.filter((_, i: number) => i !== index)
        setFormData(prev => ({ ...prev, suggested_answers: newAnswers }))
    }

    const updateToolConfig = (patch: Partial<ToolConfig>) => {
        setFormData(prev => ({
            ...prev,
            tool_config: {
                ...prev.tool_config,
                ...patch
            }
        }))
    }

    const analyzeToolQuestion = () => {
        const analyzed = analyzeToolQuestionText(formData.question_text, formData.vietnamese_meaning)
        updateToolConfig({
            ...analyzed,
            // Replace the old structured answer too. Keeping the previous
            // game_config made the preview/runtime continue using stale data.
            game_config: legacyToolConfigToWorkshopGame({
                ...analyzed,
                game_config: null,
            }),
        })
    }

    const isToolCategory = formData.category === CATEGORIES[3]
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>Ngành nghề (Industry) *</Label>
                        <Select
                            value={formData.industry}
                            onValueChange={(v) => setFormData({...formData, industry: v})}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn ngành nghề" />
                            </SelectTrigger>
                            <SelectContent>
                                {INDUSTRIES.map(ind => (
                                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
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

                    <div className="space-y-2">
                        <Label>Thời gian suy nghĩ (giây) *</Label>
                        <Input
                            type="number"
                            min="0"
                            value={formData.countdown_after_audio}
                            onChange={(e) => setFormData({...formData, countdown_after_audio: e.target.value})}
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
                    <div className="space-y-5 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <h3 className="font-semibold text-orange-800">Khung chấm điểm bài &quot;Sử dụng công cụ&quot;</h3>
                            <Button type="button" variant="outline" size="sm" onClick={analyzeToolQuestion}>
                                Tự phân tích từ câu hỏi
                            </Button>
                        </div>

                        <section className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                            <div className="mb-4">
                                <h4 className="font-semibold text-slate-900">Đáp án chấm điểm</h4>
                                <p className="text-xs text-slate-500">Ba trường quan trọng cần kiểm tra trước khi lưu.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Dụng cụ đúng</Label>
                                <Select value={formData.tool_config.correct_tool} onValueChange={(value) => updateToolConfig({ correct_tool: value })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {TOOL_SELECT_OPTIONS.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>{item.label} ({item.ko})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Vật thể / vị trí đúng</Label>
                                <Select value={formData.tool_config.target_object} onValueChange={(value) => updateToolConfig({ target_object: value })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {TARGET_SELECT_OPTIONS.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>{item.label} ({item.ko})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Hành động đúng</Label>
                                <Select value={formData.tool_config.correct_action || 'clockwise'} onValueChange={(value) => updateToolConfig({ correct_action: value })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ACTION_SELECT_OPTIONS.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>{item.label} ({item.ko})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            </div>

                            <AnswerVisualPreview config={formData.tool_config} />

                            <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input
                                type="checkbox"
                                checked={Boolean(formData.tool_config.requires_action)}
                                onChange={(event) => updateToolConfig({ requires_action: event.target.checked })}
                            />
                            Câu này cần chọn bước hành động
                            </label>
                            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                Danh sách dụng cụ trong game được tải tự động theo từng nhóm. Không cần đánh dấu toàn bộ dụng cụ tại đây.
                            </div>
                        </section>

                        <details className="group rounded-xl border border-slate-200 bg-white">
                            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-slate-800 marker:content-none">
                                <span>Xem trước bài kéo thả</span>
                                <span className="text-xs font-normal text-slate-500">Mở khi cần kiểm tra trực quan</span>
                            </summary>
                            <div className="border-t border-slate-100 p-3">
                                <WorkshopGamePreview
                                    config={formData.tool_config.game_config || legacyToolConfigToWorkshopGame(formData.tool_config)}
                                    questionKo={formData.question_text}
                                    questionVi={formData.vietnamese_meaning}
                                />
                            </div>
                        </details>

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
