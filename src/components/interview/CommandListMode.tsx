'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
    ArrowLeft,
    Check,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { speakText, stopTTS } from '@/lib/tts'

const GROUP_SIZE = 5
const STORAGE_VERSION = 1

export interface CommandListQuestion {
    id: string
    question_text?: string | null
    vietnamese_meaning?: string | null
    question_audio_url?: string | null
    audio_url?: string | null
}

interface CommandListModeProps {
    questions: CommandListQuestion[]
    topicId: string
    topicName: string
    onBack: () => void
}

interface StoredProgress {
    version: number
    groupIndex: number
    masteredIds: string[]
    showVietnamese: boolean
}

function getStorageKey(topicId: string) {
    return `interview_command_list_progress_v${STORAGE_VERSION}_${topicId}`
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

export function CommandListMode({ questions, topicId, topicName, onBack }: CommandListModeProps) {
    const totalGroups = Math.max(1, Math.ceil(questions.length / GROUP_SIZE))
    const [groupIndex, setGroupIndex] = useState(0)
    const [masteredIds, setMasteredIds] = useState<Set<string>>(() => new Set())
    const [showVietnamese, setShowVietnamese] = useState(true)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [isProgressLoaded, setIsProgressLoaded] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const playbackTokenRef = useRef(0)

    const currentQuestions = useMemo(() => {
        const start = groupIndex * GROUP_SIZE
        return questions.slice(start, start + GROUP_SIZE)
    }, [groupIndex, questions])

    const currentMasteredCount = currentQuestions.reduce(
        (count, question) => count + (masteredIds.has(question.id) ? 1 : 0),
        0,
    )
    const rangeStart = questions.length === 0 ? 0 : groupIndex * GROUP_SIZE + 1
    const rangeEnd = Math.min((groupIndex + 1) * GROUP_SIZE, questions.length)
    const progressPercent = questions.length === 0
        ? 0
        : Math.round((masteredIds.size / questions.length) * 100)

    useEffect(() => {
        try {
            const raw = localStorage.getItem(getStorageKey(topicId))
            if (!raw) return
            const stored = JSON.parse(raw) as StoredProgress
            if (stored.version !== STORAGE_VERSION) return
            const availableIds = new Set(questions.map(question => question.id))
            setGroupIndex(clamp(stored.groupIndex || 0, 0, totalGroups - 1))
            setMasteredIds(new Set((stored.masteredIds || []).filter(id => availableIds.has(id))))
            setShowVietnamese(stored.showVietnamese !== false)
        } catch {
            // Ignore malformed progress and start a fresh learning session.
        } finally {
            setIsProgressLoaded(true)
        }
    }, [questions, topicId, totalGroups])

    useEffect(() => {
        if (!isProgressLoaded) return
        const progress: StoredProgress = {
            version: STORAGE_VERSION,
            groupIndex,
            masteredIds: Array.from(masteredIds),
            showVietnamese,
        }
        try {
            localStorage.setItem(getStorageKey(topicId), JSON.stringify(progress))
        } catch {
            // Learning remains available when browser storage is unavailable.
        }
    }, [groupIndex, isProgressLoaded, masteredIds, showVietnamese, topicId])

    useEffect(() => {
        return () => {
            audioRef.current?.pause()
            stopTTS()
        }
    }, [])

    const stopAudio = () => {
        playbackTokenRef.current += 1
        audioRef.current?.pause()
        audioRef.current = null
        stopTTS()
        setPlayingId(null)
    }

    const changeGroup = (nextIndex: number) => {
        stopAudio()
        setGroupIndex(clamp(nextIndex, 0, totalGroups - 1))
        window.scrollTo({ top: 0 })
    }

    const playQuestion = (question: CommandListQuestion) => {
        stopAudio()
        const text = question.question_text?.trim()
        if (!text) return

        const playbackToken = playbackTokenRef.current
        setPlayingId(question.id)
        const finishPlayback = () => {
            if (playbackToken === playbackTokenRef.current) setPlayingId(null)
        }
        const audioUrl = question.question_audio_url || question.audio_url
        if (audioUrl && !audioUrl.includes('translate.google.com')) {
            const audio = new Audio(audioUrl)
            let hasFallenBack = false
            audioRef.current = audio
            audio.preload = 'auto'
            audio.setAttribute('playsinline', 'true')
            audio.onended = finishPlayback
            const useFallback = () => {
                if (hasFallenBack || playbackToken !== playbackTokenRef.current) return
                hasFallenBack = true
                audioRef.current = null
                speakText(text, 1, undefined, finishPlayback, finishPlayback)
            }
            audio.onerror = useFallback
            void audio.play().catch(useFallback)
            return
        }

        speakText(text, 1, undefined, finishPlayback, finishPlayback)
    }

    const toggleMastered = (questionId: string) => {
        setMasteredIds(previous => {
            const next = new Set(previous)
            if (next.has(questionId)) next.delete(questionId)
            else next.add(questionId)
            return next
        })
    }

    const masterCurrentGroupAndContinue = () => {
        setMasteredIds(previous => {
            const next = new Set(previous)
            currentQuestions.forEach(question => next.add(question.id))
            return next
        })
        if (groupIndex < totalGroups - 1) changeGroup(groupIndex + 1)
    }

    const reviewUnmastered = () => {
        const firstUnmasteredIndex = questions.findIndex(question => !masteredIds.has(question.id))
        if (firstUnmasteredIndex >= 0) changeGroup(Math.floor(firstUnmasteredIndex / GROUP_SIZE))
    }

    return (
        <div className="min-h-[calc(100dvh-1rem)] overflow-x-hidden bg-[#f4f6f8] md:min-h-[720px]">
            <div className="mx-auto flex w-full max-w-5xl flex-col">
                <header className="border-b border-slate-300/80 px-3 pb-3 pt-2 md:px-5 md:pb-4 md:pt-3">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={onBack} aria-label="Trở lại chọn chế độ" className="shrink-0 rounded-full border-slate-300 bg-white shadow-sm">
                            <ArrowLeft className="size-4" />
                        </Button>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 md:text-xs">Học theo danh sách</p>
                            <h1 className="text-balance text-lg font-black text-slate-900 md:text-2xl">{topicName}</h1>
                            <p className="text-xs tabular-nums text-slate-600 md:text-sm">Nhóm {groupIndex + 1}/{totalGroups} · Câu {rangeStart}–{rangeEnd}/{questions.length}</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowVietnamese(value => !value)}
                            aria-pressed={showVietnamese}
                            className="h-10 shrink-0 rounded-lg border-slate-300 bg-white px-2.5 text-xs shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600 md:px-4"
                        >
                            {showVietnamese ? <EyeOff className="mr-1.5 size-4" /> : <Eye className="mr-1.5 size-4" />}
                            <span className="hidden sm:inline">{showVietnamese ? 'Ẩn tiếng Việt' : 'Hiện tiếng Việt'}</span>
                            <span className="sm:hidden">Tiếng Việt</span>
                        </Button>
                    </div>

                    <div
                        className="mt-3 h-2.5 overflow-hidden rounded-full bg-blue-100 ring-1 ring-inset ring-blue-200"
                        role="progressbar"
                        aria-label="Tiến độ thuộc câu"
                        aria-valuemin={0}
                        aria-valuemax={questions.length}
                        aria-valuenow={masteredIds.size}
                    >
                        <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] font-bold tabular-nums text-slate-600 md:text-xs">
                        <span>Đã thuộc {masteredIds.size}/{questions.length} câu</span>
                        <span>{progressPercent}%</span>
                    </div>
                </header>

                <div className="flex items-center justify-between border-b border-slate-300/70 px-3 py-2.5 md:px-5">
                    <span className="text-xs font-semibold text-slate-600">Mỗi nhóm 5 câu</span>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        Chọn nhóm
                        <select
                            value={groupIndex}
                            onChange={event => changeGroup(Number(event.target.value))}
                            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            aria-label="Chọn nhóm câu hỏi"
                        >
                            {Array.from({ length: totalGroups }, (_, index) => {
                                const start = index * GROUP_SIZE
                                const group = questions.slice(start, start + GROUP_SIZE)
                                const isComplete = group.length > 0 && group.every(question => masteredIds.has(question.id))
                                return <option key={index} value={index}>Nhóm {index + 1}{isComplete ? ' · Đã thuộc' : ''}</option>
                            })}
                        </select>
                    </label>
                </div>

                <main className="px-3 md:px-5">
                    {currentQuestions.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="font-bold text-slate-700">Chưa có câu hỏi trong danh sách này.</p>
                            <Button variant="outline" onClick={onBack} className="mt-4 rounded-lg">Trở lại chọn chế độ</Button>
                        </div>
                    ) : currentQuestions.map((question, index) => {
                        const isMastered = masteredIds.has(question.id)
                        const isPlaying = playingId === question.id
                        return (
                            <article key={question.id} className={`grid min-h-[76px] grid-cols-[2rem_1fr_auto] items-center gap-2 border-b px-0 py-2.5 transition-colors md:min-h-[92px] md:grid-cols-[2.5rem_1fr_auto] md:gap-4 md:py-4 ${isMastered ? 'border-emerald-300/80' : 'border-slate-300/70'}`}>
                                <span className={`flex size-8 items-center justify-center rounded-lg text-xs font-black tabular-nums md:size-10 md:text-sm ${isMastered ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {groupIndex * GROUP_SIZE + index + 1}
                                </span>
                                <div className="min-w-0">
                                    <p lang="ko" className="text-[15px] font-black leading-snug text-slate-900 md:text-lg">{question.question_text || '—'}</p>
                                    {showVietnamese ? (
                                        <p lang="vi" className="mt-1 text-xs leading-snug text-slate-600 md:text-sm">{question.vietnamese_meaning || 'Chưa có nghĩa tiếng Việt'}</p>
                                    ) : (
                                        <p className="mt-1 text-[10px] font-semibold italic text-slate-300 md:text-xs">Nghĩa tiếng Việt đang được ẩn</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => isPlaying ? stopAudio() : playQuestion(question)}
                                        aria-label={isPlaying ? 'Dừng nghe' : `Nghe câu ${groupIndex * GROUP_SIZE + index + 1}`}
                                        className={`size-10 rounded-lg border-slate-300 bg-white shadow-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 ${isPlaying ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}`}
                                    >
                                        <Volume2 className={`size-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={isMastered ? 'default' : 'outline'}
                                        size="icon"
                                        onClick={() => toggleMastered(question.id)}
                                        aria-pressed={isMastered}
                                        aria-label={isMastered ? 'Bỏ đánh dấu đã thuộc' : 'Đánh dấu đã thuộc'}
                                        className={`size-10 rounded-lg border-slate-300 bg-white shadow-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-600 ${isMastered ? 'border-emerald-600 bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                    >
                                        <Check className="size-4" />
                                    </Button>
                                </div>
                            </article>
                        )
                    })}
                </main>

                {currentQuestions.length > 0 ? <footer className="sticky bottom-0 border-t border-slate-300/80 bg-[#f4f6f8]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-sm md:static md:px-5 md:py-4">
                    <div className="mb-2.5 flex min-w-0 items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-slate-600 md:text-xs">
                            <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${currentMasteredCount === currentQuestions.length ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                            <span className="truncate">Tiến độ nhóm</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 tabular-nums ${currentMasteredCount === currentQuestions.length ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {currentMasteredCount}/{currentQuestions.length} đã thuộc
                            </span>
                        </div>
                        {masteredIds.size < questions.length && groupIndex === totalGroups - 1 ? (
                            <button type="button" onClick={reviewUnmastered} className="shrink-0 text-[11px] font-bold text-blue-600 hover:text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:text-xs">Ôn câu chưa thuộc</button>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2">
                        <Button variant="outline" size="icon" disabled={groupIndex === 0} onClick={() => changeGroup(groupIndex - 1)} aria-label="Nhóm trước" className="size-11 rounded-xl border-slate-300 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600">
                            <ChevronLeft className="size-4" />
                        </Button>
                        <Button onClick={masterCurrentGroupAndContinue} className="min-h-11 min-w-0 rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 md:text-sm">
                            <span className="truncate">{groupIndex < totalGroups - 1 ? 'Đã thuộc · Sang nhóm tiếp theo' : 'Hoàn thành nhóm cuối'}</span>
                            {groupIndex < totalGroups - 1 ? <ChevronRight className="ml-1.5 size-4" /> : <Check className="ml-1.5 size-4" />}
                        </Button>
                    </div>
                </footer> : null}
            </div>
        </div>
    )
}
