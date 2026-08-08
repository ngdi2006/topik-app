'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, GripVertical, PackageOpen, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkshopAssetIcon } from '@/features/workshop/components'
import { getWorkshopAsset, resolveWorkshopAssetId } from '@/features/workshop/assetRegistry'
import { legacyToolConfigToWorkshopGame } from '@/features/workshop/legacyAdapter'
import { resolveToolQuestionConfig, TOOL_DEFINITIONS } from './toolQuestionAnalysis'

type ToolQuestion = {
    id: string
    question_text: string
    vietnamese_meaning?: string
    tool_config?: unknown
}

type ToolDropGameProps = {
    questions: ToolQuestion[]
    onBack: () => void
    onFinish: (answers?: Record<string, string>, masteredIds?: string[]) => void
}

const TOOL_NAMES: Record<string, string> = {
    ...Object.fromEntries(TOOL_DEFINITIONS.map((item) => [item.id, item.label])),
    wrench: 'Cờ lê / Mỏ lết', adjustable_wrench: 'Mỏ lết', spanner: 'Cờ lê',
    pliers: 'Kìm', needle_nose_pliers: 'Kìm mỏ nhọn', hammer: 'Búa', claw_hammer: 'Búa nhổ đinh',
    screwdriver: 'Tua vít', phillips_screwdriver: 'Tua vít bake', flat_screwdriver: 'Tua vít dẹt',
    hex_key: 'Cờ lê lục giác', drill: 'Máy khoan', grinder: 'Máy mài', saw: 'Cưa',
    tape_measure: 'Thước dây', brush: 'Chổi / Cọ', rust_preventive_oil: 'Dầu chống rỉ',
}

const DEFAULT_TOOLS = ['wrench', 'pliers', 'hammer', 'phillips_screwdriver', 'flat_screwdriver', 'hex_key', 'drill', 'tape_measure']

function parseConfig(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') return value as Record<string, unknown>
    if (typeof value === 'string') {
        try { return JSON.parse(value) as Record<string, unknown> } catch { return {} }
    }
    return {}
}

function labelFor(tool: string) {
    return getWorkshopAsset(tool)?.nameVi || TOOL_NAMES[tool] || tool.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function ToolDropGame({ questions, onBack, onFinish }: ToolDropGameProps) {
    const rounds = useMemo(() => questions.map((question) => {
        const rawConfig = parseConfig(question.tool_config)
        const config = resolveToolQuestionConfig(
            question.question_text,
            question.vietnamese_meaning || '',
            rawConfig
        )
        const gameConfig = legacyToolConfigToWorkshopGame(config)
        const correct = resolveWorkshopAssetId(String(gameConfig.toolId || config.correct_tool || ''))
        const configured = [
            ...(gameConfig.distractorIds || []),
            ...(Array.isArray(config.tools_on_desk) ? config.tools_on_desk.map(String) : []),
        ].map(resolveWorkshopAssetId)
        const choices = Array.from(new Set([correct, ...configured, ...DEFAULT_TOOLS]))
            .filter(Boolean)
            .slice(0, 5)
        return { question, correct, choices }
    }).filter((round) => round.correct && round.choices.length > 1).slice(0, 10), [questions])

    const [index, setIndex] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [mastered, setMastered] = useState<string[]>([])
    const round = rounds[index]

    if (!round) {
        return <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm">
            <PackageOpen className="mx-auto mb-3 size-10 text-orange-500" />
            <h2 className="text-xl font-bold">Chưa đủ dữ liệu kéo thả</h2>
            <p className="mt-2 text-sm text-slate-500">Các câu hỏi cần có cấu hình dụng cụ và phương án lựa chọn.</p>
            <Button className="mt-5" onClick={onBack}>Quay lại chế độ học</Button>
        </div>
    }

    const submit = (tool: string) => {
        if (result) return
        setSelected(tool)
        const isCorrect = tool === round.correct
        setResult(isCorrect ? 'correct' : 'wrong')
        setAnswers((current) => ({ ...current, [round.question.id]: tool }))
        if (isCorrect) setMastered((current) => [...current, round.question.id])
    }

    const next = () => {
        if (index === rounds.length - 1) {
            onFinish(answers, mastered)
            return
        }
        setIndex((current) => current + 1)
        setSelected(null)
        setResult(null)
    }

    return <div className="mx-auto w-full max-w-3xl px-3 py-2 md:px-6">
        <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-xl shadow-orange-100/40">
            <header className="flex items-center gap-3 border-b px-4 py-3 md:px-6">
                <button onClick={onBack} className="grid size-10 place-items-center rounded-full border bg-white text-slate-600 shadow-sm" aria-label="Quay lại">
                    <ArrowLeft className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="font-extrabold text-slate-900">Kéo thả dụng cụ</h1>
                    <p className="text-xs text-slate-500">Câu {index + 1}/{rounds.length} · Nghe hiểu và chọn đúng dụng cụ</p>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">P5</span>
            </header>

            <div className="h-1 bg-slate-100"><div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all" style={{ width: `${((index + 1) / rounds.length) * 100}%` }} /></div>

            <main className="space-y-4 p-4 md:p-6">
                <section className="rounded-2xl bg-slate-900 p-4 text-white md:p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Yêu cầu thao tác</p>
                    <p className="mt-2 text-base font-bold leading-relaxed md:text-lg">{round.question.question_text}</p>
                    {round.question.vietnamese_meaning && <p className="mt-1 text-sm text-slate-300">{round.question.vietnamese_meaning}</p>}
                </section>

                <section
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => submit(event.dataTransfer.getData('text/tool'))}
                    onClick={() => selected && !result && submit(selected)}
                    className={`grid min-h-28 place-items-center rounded-2xl border-2 border-dashed p-4 text-center transition ${result === 'correct' ? 'border-emerald-400 bg-emerald-50' : result === 'wrong' ? 'border-rose-300 bg-rose-50' : 'border-orange-300 bg-orange-50/60'}`}
                >
                    {result ? <div>
                        {result === 'correct' ? <CheckCircle2 className="mx-auto size-8 text-emerald-500" /> : <RotateCcw className="mx-auto size-8 text-rose-500" />}
                        <p className="mt-2 font-bold text-slate-900">{result === 'correct' ? 'Chính xác!' : `Đáp án: ${labelFor(round.correct)}`}</p>
                    </div> : <div>
                        <PackageOpen className="mx-auto size-8 text-orange-500" />
                        <p className="mt-2 text-sm font-bold text-slate-800">Thả dụng cụ vào bàn làm việc</p>
                        <p className="text-xs text-slate-500">Điện thoại: chạm vào dụng cụ để chọn</p>
                    </div>}
                </section>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {round.choices.map((tool) => <button
                        key={tool}
                        draggable={!result}
                        onDragStart={(event) => event.dataTransfer.setData('text/tool', tool)}
                        onClick={() => submit(tool)}
                        disabled={Boolean(result)}
                        className={`flex min-h-20 items-center gap-2 rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 hover:border-orange-400 ${selected === tool ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white'} disabled:hover:translate-y-0`}
                    >
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><WorkshopAssetIcon assetId={tool} size={36} /></span>
                        <span className="min-w-0 flex-1 text-xs font-bold text-slate-800 md:text-sm">{labelFor(tool)}</span>
                        <GripVertical className="size-4 shrink-0 text-slate-300" />
                    </button>)}
                </div>

                {result && <Button onClick={next} className="h-11 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 font-bold">
                    {index === rounds.length - 1 ? 'Hoàn thành' : 'Câu tiếp theo'}
                </Button>}
            </main>
        </div>
    </div>
}
