'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Image from 'next/image'
import { ArrowLeft, CheckCircle2, GripVertical, Loader2, PackageOpen, RotateCcw, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { speakText, stopTTS } from '@/lib/tts'
import { getWorkshopAsset, resolveWorkshopAssetId } from '@/features/workshop/assetRegistry'
import { legacyToolConfigToWorkshopGame } from '@/features/workshop/legacyAdapter'
import { resolveToolQuestionConfig, TOOL_DEFINITIONS } from './toolQuestionAnalysis'
import { WorkshopToolIcon } from './WorkshopToolIcon'
import { getGameV2ToolAsset } from './InterviewToolTableGame'

type ToolQuestion = {
    id: string
    question_text: string
    vietnamese_meaning?: string
    question_audio_url?: string | null
    audio_url?: string | null
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

function shuffleChoices<T>(items: T[]): T[] {
    const shuffled = [...items]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1))
        ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
    }
    return shuffled
}

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

function iconIdFor(tool: string) {
    return getWorkshopAsset(tool)?.fallbackIconId || tool
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
        const distractors = Array.from(new Set([...configured, ...DEFAULT_TOOLS]))
            .filter((tool) => Boolean(tool) && tool !== correct)
            .slice(0, 4)
        const choices = shuffleChoices([correct, ...distractors])
        return { question, correct, choices }
    }).filter((round) => round.correct && round.choices.length > 1).slice(0, 10), [questions])

    const [index, setIndex] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [isDraggingOver, setIsDraggingOver] = useState(false)
    const [draggingTool, setDraggingTool] = useState<string | null>(null)
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
    const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [mastered, setMastered] = useState<string[]>([])
    const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
    const [isQuestionVisible, setIsQuestionVisible] = useState(false)
    const dropZoneRef = useRef<HTMLElement>(null)
    const dropBoundsRef = useRef<DOMRect | null>(null)
    const activeDragRef = useRef<string | null>(null)
    const dragStartRef = useRef({ x: 0, y: 0 })
    const dragMovedRef = useRef(false)
    const questionAudioRef = useRef<HTMLAudioElement | null>(null)
    const playbackTokenRef = useRef(0)
    const autoPlayRef = useRef<() => void>(() => undefined)
    const round = rounds[index]!

    const stopQuestionAudio = () => {
        playbackTokenRef.current += 1
        questionAudioRef.current?.pause()
        questionAudioRef.current = null
        stopTTS()
        setAudioState('idle')
    }

    useEffect(() => () => {
        playbackTokenRef.current += 1
        questionAudioRef.current?.pause()
        stopTTS()
    }, [])

    const roundId = round?.question.id
    useEffect(() => {
        if (!roundId) return
        const timer = window.setTimeout(() => autoPlayRef.current(), 120)
        return () => window.clearTimeout(timer)
    }, [roundId])

    const submit = (tool: string) => {
        if (result) return
        setSelected(tool)
        const isCorrect = tool === round.correct
        setResult(isCorrect ? 'correct' : 'wrong')
        setAnswers((current) => ({ ...current, [round.question.id]: tool }))
        if (isCorrect) setMastered((current) => [...current, round.question.id])
    }

    const isInsideDropZone = (x: number, y: number) => {
        const bounds = dropBoundsRef.current
        return Boolean(bounds && x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom)
    }

    const startPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>, tool: string) => {
        if (result) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        activeDragRef.current = tool
        dragStartRef.current = { x: event.clientX, y: event.clientY }
        dragMovedRef.current = false
        dropBoundsRef.current = dropZoneRef.current?.getBoundingClientRect() || null
        setSelected(tool)
        setDraggingTool(tool)
        setDragPosition({ x: event.clientX, y: event.clientY })
    }

    const movePointerDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (!activeDragRef.current) return
        event.preventDefault()
        const distance = Math.hypot(event.clientX - dragStartRef.current.x, event.clientY - dragStartRef.current.y)
        if (distance > 5) dragMovedRef.current = true
        setDragPosition({ x: event.clientX, y: event.clientY })
        setIsDraggingOver(isInsideDropZone(event.clientX, event.clientY))
    }

    const finishPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
        const tool = activeDragRef.current
        if (!tool) return
        event.preventDefault()
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
        const droppedOnTable = !cancelled && dragMovedRef.current && isInsideDropZone(event.clientX, event.clientY)
        activeDragRef.current = null
        dropBoundsRef.current = null
        dragMovedRef.current = false
        setDraggingTool(null)
        setIsDraggingOver(false)
        if (droppedOnTable) submit(tool)
    }

    const next = () => {
        stopQuestionAudio()
        if (index === rounds.length - 1) {
            onFinish(answers, mastered)
            return
        }
        setIndex((current) => current + 1)
        setSelected(null)
        setIsDraggingOver(false)
        setDraggingTool(null)
        setResult(null)
        setIsQuestionVisible(false)
    }

    const toggleQuestionAudio = async () => {
        if (audioState === 'loading' || audioState === 'playing') {
            stopQuestionAudio()
            setIsQuestionVisible(true)
            return
        }

        stopQuestionAudio()
        const token = playbackTokenRef.current
        const storedUrl = round.question.question_audio_url || round.question.audio_url
        setAudioState('loading')

        const playFallback = () => {
            if (token !== playbackTokenRef.current) return
            speakText(
                round.question.question_text,
                0.95,
                () => token === playbackTokenRef.current && setAudioState('playing'),
                () => {
                    if (token !== playbackTokenRef.current) return
                    setAudioState('idle')
                    setIsQuestionVisible(true)
                },
                () => {
                    if (token !== playbackTokenRef.current) return
                    setAudioState('error')
                    setIsQuestionVisible(true)
                },
            )
        }

        if (!storedUrl || storedUrl.includes('translate.google.com')) {
            playFallback()
            return
        }

        const audio = new Audio(storedUrl)
        questionAudioRef.current = audio
        audio.preload = 'auto'
        audio.playbackRate = 0.95
        audio.setAttribute('playsinline', 'true')
        audio.onplaying = () => token === playbackTokenRef.current && setAudioState('playing')
        audio.onended = () => {
            if (token !== playbackTokenRef.current) return
            setAudioState('idle')
            setIsQuestionVisible(true)
        }
        audio.onerror = playFallback
        try {
            await audio.play()
        } catch {
            playFallback()
        }
    }

    useEffect(() => {
        autoPlayRef.current = () => {
            setIsQuestionVisible(false)
            void toggleQuestionAudio()
        }
    })

    if (!round) {
        return <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm">
            <PackageOpen className="mx-auto mb-3 size-10 text-orange-500" />
            <h2 className="text-xl font-bold">Chưa đủ dữ liệu kéo thả</h2>
            <p className="mt-2 text-sm text-slate-500">Các câu hỏi cần có cấu hình dụng cụ và phương án lựa chọn.</p>
            <Button className="mt-5" onClick={onBack}>Quay lại chế độ học</Button>
        </div>
    }

    return <div className="mx-auto w-full max-w-3xl px-3 py-2 md:px-6">
        <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-xl shadow-orange-100/40">
            <header className="flex items-center gap-3 border-b px-4 py-3 md:px-6">
                <button onClick={() => { stopQuestionAudio(); onBack() }} className="grid size-10 place-items-center rounded-full border bg-white text-slate-600 shadow-sm" aria-label="Quay lại">
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
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Yêu cầu thao tác</p>
                        <button
                            type="button"
                            onClick={toggleQuestionAudio}
                            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-bold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                            aria-label={audioState === 'playing' ? 'Dừng đọc câu hỏi' : 'Nghe câu hỏi'}
                        >
                            {audioState === 'loading' ? <Loader2 className="size-4 animate-spin" /> : audioState === 'playing' ? <Square className="size-3 fill-current" /> : <Volume2 className="size-4" />}
                            {audioState === 'loading' ? 'Đang tải' : audioState === 'playing' ? 'Dừng' : 'Nghe câu hỏi'}
                        </button>
                    </div>
                    {isQuestionVisible ? (
                        <p className="mt-3 text-base font-bold leading-relaxed md:text-lg">{round.question.question_text}</p>
                    ) : (
                        <div className="mt-3 flex min-h-14 items-center gap-3 rounded-xl bg-white/5 px-3 text-sm text-slate-300" aria-live="polite">
                            <span className="flex size-8 items-center justify-center rounded-full bg-orange-500/15 text-orange-300">
                                <Volume2 className="size-4" />
                            </span>
                            <span>Hãy nghe câu hỏi. Nội dung tiếng Hàn sẽ hiện sau khi đọc xong.</span>
                        </div>
                    )}
                    {audioState === 'error' ? <p className="mt-2 text-xs text-rose-300" role="status">Chưa thể phát âm thanh. Vui lòng thử lại.</p> : null}
                </section>

                <section
                    ref={dropZoneRef}
                    onClick={() => selected && !result && submit(selected)}
                    aria-label={selected ? `Đưa ${labelFor(selected)} vào bàn làm việc` : 'Bàn làm việc, hãy thả dụng cụ vào đây'}
                    className={`grid min-h-28 place-items-center rounded-2xl border-2 border-dashed p-4 text-center transition-[border-color,background-color,transform,box-shadow] ${result === 'correct' ? 'border-emerald-400 bg-emerald-50' : result === 'wrong' ? 'border-rose-300 bg-rose-50' : isDraggingOver ? 'scale-[1.01] border-orange-500 bg-orange-100 shadow-md motion-reduce:transform-none' : selected ? 'cursor-pointer border-orange-400 bg-orange-50' : 'border-orange-300 bg-orange-50/60'}`}
                >
                    {result ? <div>
                        {result === 'correct' ? <CheckCircle2 className="mx-auto size-8 text-emerald-500" /> : <RotateCcw className="mx-auto size-8 text-rose-500" />}
                        <p className="mt-2 font-bold text-slate-900">{result === 'correct' ? 'Chính xác!' : `Đáp án: ${labelFor(round.correct)}`}</p>
                    </div> : <div>
                        <PackageOpen className="mx-auto size-8 text-orange-500" />
                        <p className="mt-2 text-sm font-bold text-slate-800">{selected ? `Đưa ${labelFor(selected)} vào bàn` : 'Thả dụng cụ vào bàn làm việc'}</p>
                        <p className="text-xs text-slate-500">{selected ? 'Kéo và thả, hoặc chạm vào vùng này để xác nhận' : 'Nhấn giữ dụng cụ rồi kéo vào đây'}</p>
                    </div>}
                </section>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {round.choices.map((tool) => {
                        const asset = getGameV2ToolAsset(tool)
                        return <button
                            key={tool}
                            type="button"
                            onPointerDown={(event) => startPointerDrag(event, tool)}
                            onPointerMove={movePointerDrag}
                            onPointerUp={(event) => finishPointerDrag(event)}
                            onPointerCancel={(event) => finishPointerDrag(event, true)}
                            onClick={() => setSelected(tool)}
                            disabled={Boolean(result)}
                            aria-pressed={selected === tool}
                            className={`flex min-h-20 touch-none select-none items-center gap-3 rounded-xl border p-2.5 text-left transition-[border-color,background-color,transform,box-shadow,opacity] hover:-translate-y-0.5 hover:border-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 motion-reduce:transform-none ${selected === tool ? 'border-orange-500 bg-orange-50 shadow-sm ring-1 ring-orange-500' : 'border-slate-200 bg-white'} ${draggingTool === tool ? 'opacity-40' : ''} disabled:hover:translate-y-0`}
                        >
                            <span className="grid size-14 shrink-0 place-items-center text-slate-600">
                                {asset ? <Image src={asset.src} alt="" width={88} height={88} draggable={false} style={{ transform: `scale(${asset.scale ?? 1})` }} className="pointer-events-none size-14 object-contain" /> : <WorkshopToolIcon type={iconIdFor(tool)} className="size-11" />}
                            </span>
                            <span className="min-w-0 flex-1 text-xs font-bold text-slate-800 md:text-sm">{labelFor(tool)}</span>
                            <GripVertical className="size-4 shrink-0 text-slate-300" />
                        </button>
                    })}
                </div>

                {draggingTool ? (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none fixed z-[100] grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border-2 border-orange-400 bg-white shadow-2xl will-change-transform"
                        style={{ left: dragPosition.x, top: dragPosition.y }}
                    >
                        {getGameV2ToolAsset(draggingTool) ? (
                            <Image src={getGameV2ToolAsset(draggingTool)!.src} alt="" width={96} height={96} draggable={false} className="size-14 object-contain" />
                        ) : (
                            <WorkshopToolIcon type={iconIdFor(draggingTool)} className="size-12" />
                        )}
                    </div>
                ) : null}

                {result && <Button onClick={next} className="h-11 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 font-bold" aria-live="polite">
                    {index === rounds.length - 1 ? 'Hoàn thành' : 'Câu tiếp theo'}
                </Button>}
            </main>
        </div>
    </div>
}
