'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, CheckCircle, XCircle, Trophy, RotateCcw, ArrowLeft, Volume2, Timer } from 'lucide-react'
import { speakText, stopTTS } from '@/lib/tts'

interface InterviewQuestion {
    id: string
    question_text: string
    vietnamese_meaning?: string | null
    question_audio_url?: string | null
    audio_url?: string | null
    [key: string]: unknown
}

interface SpeedQuizQuestion {
    q: InterviewQuestion
    options: string[]
    correct: string
}

interface SpeedQuizResult {
    q: InterviewQuestion
    userAnswer: string | null
    correct: string
    isCorrect: boolean
    timeUsed: number // ms
}

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function buildOptions(questions: InterviewQuestion[], currentQ: InterviewQuestion): string[] {
    const correct = (currentQ.vietnamese_meaning || '').trim()
    const uniqueMeanings = Array.from(
        new Set(
            questions
                .map(q => (q.vietnamese_meaning || '').trim())
                .filter(meaning => meaning && meaning !== correct)
        )
    )
    const distractors = shuffleArray(uniqueMeanings).slice(0, 3)
    return shuffleArray([correct, ...distractors])
}

const DEFAULT_TIME_LIMIT_SECONDS = 8

interface Props {
    questions: InterviewQuestion[]
    maxQuestions?: number
    timeLimitSeconds?: number
    onFinish: (results: SpeedQuizResult[], masteredIds: string[]) => void
    onBack: () => void
}

export function SpeedQuizScreen({ questions, maxQuestions = 10, timeLimitSeconds = DEFAULT_TIME_LIMIT_SECONDS, onFinish, onBack }: Props) {
    const timeLimitMs = timeLimitSeconds * 1000
    const [quizItems] = useState<SpeedQuizQuestion[]>(() =>
        shuffleArray(questions).slice(0, maxQuestions).map(q => ({
            q,
            options: buildOptions(questions, q),
            correct: q.vietnamese_meaning || '',
        }))
    )
    const [idx, setIdx] = useState(0)
    const [results, setResults] = useState<SpeedQuizResult[]>([])
    const [timeLeft, setTimeLeft] = useState(timeLimitMs)
    const [answered, setAnswered] = useState<string | null>(null)
    const [phase, setPhase] = useState<'playing' | 'result'>('playing')
    const [audioState, setAudioState] = useState<'loading' | 'playing' | 'done'>('loading')
    const [audioStalled, setAudioStalled] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const preloadRef = useRef<HTMLAudioElement | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const advanceRef = useRef<NodeJS.Timeout | null>(null)
    const audioWatchdogRef = useRef<NodeJS.Timeout | null>(null)
    const audioFallbackRef = useRef<NodeJS.Timeout | null>(null)
    const playbackTokenRef = useRef(0)
    const startTimeRef = useRef<number>(0)

    // Use refs so callbacks always have latest values (avoid stale closure)
    const idxRef = useRef(0)
    const resultsRef = useRef<SpeedQuizResult[]>([])
    const answeredRef = useRef<string | null>(null)

    const current = quizItems[idx] ?? null // guard against undefined

    const clearAudioWatchdogs = useCallback(() => {
        if (audioWatchdogRef.current) clearTimeout(audioWatchdogRef.current)
        if (audioFallbackRef.current) clearTimeout(audioFallbackRef.current)
        audioWatchdogRef.current = null
        audioFallbackRef.current = null
    }, [])

    const advanceQuestion = useCallback(() => {
        const nextIdx = idxRef.current + 1
        if (nextIdx >= quizItems.length) {
            setPhase('result')
        } else {
            idxRef.current = nextIdx
            answeredRef.current = null
            setIdx(nextIdx)
            setAnswered(null)
            setTimeLeft(timeLimitMs)
            setAudioState('loading')
        }
    }, [quizItems.length, timeLimitMs])

    const handleAnswer = useCallback((choice: string | null) => {
        if (answeredRef.current !== null) return
        if (timerRef.current) clearInterval(timerRef.current)
        if (advanceRef.current) clearTimeout(advanceRef.current)

        const timeUsed = Date.now() - startTimeRef.current
        const currentItem = quizItems[idxRef.current]
        if (!currentItem) return

        const isCorrect = choice === currentItem.correct
        const displayChoice = choice ?? '__timeout__'
        answeredRef.current = displayChoice
        setAnswered(displayChoice)

        const newResult: SpeedQuizResult = {
            q: currentItem.q,
            userAnswer: choice,
            correct: currentItem.correct,
            isCorrect,
            timeUsed,
        }
        resultsRef.current = [...resultsRef.current, newResult]
        setResults(r => [...r, newResult])

        // Auto-advance after brief pause
        advanceRef.current = setTimeout(() => {
            advanceQuestion()
        }, 900)
    }, [quizItems, advanceQuestion])

    // Countdown timer - starts after audio plays
    useEffect(() => {
        if (audioState !== 'done') return
        startTimeRef.current = Date.now()
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 100) {
                    clearInterval(timerRef.current!)
                    handleAnswer(null) // timeout → auto advance
                    return 0
                }
                return prev - 100
            })
        }, 100)
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [audioState, handleAnswer])

    const cancelAudioPlayback = useCallback((releasePreload = false) => {
        playbackTokenRef.current += 1
        clearAudioWatchdogs()
        stopTTS()

        const audio = audioRef.current
        if (!audio) return

        audio.onplaying = null
        audio.onended = null
        audio.onerror = null
        audio.onstalled = null
        audio.onwaiting = null
        audio.pause()
        try {
            audio.currentTime = 0
        } catch {
            // Safari can reject currentTime changes while metadata is unavailable.
        }
        // Always detach the previous question source. On iOS, a paused media
        // element can still dispatch `waiting`/`error` later and wake the old
        // fallback pipeline if its source is retained.
        audio.removeAttribute('src')
        audio.load()

        if (releasePreload && preloadRef.current) {
            preloadRef.current.removeAttribute('src')
            preloadRef.current.load()
            preloadRef.current = null
        }
    }, [clearAudioWatchdogs])

    // One playback pipeline per question. Stored MP3 is preferred; generated TTS
    // is the only fallback and already owns its browser-voice fallback internally.
    const playQuestionAudio = useCallback((item: SpeedQuizQuestion) => {
        cancelAudioPlayback()

        const token = playbackTokenRef.current
        const text = item.q?.question_text?.trim()
        const audioUrl = item.q?.question_audio_url || item.q?.audio_url || null
        let completed = false
        let fallbackStarted = false
        let storedAudioStarted = false

        setAudioStalled(false)
        setAudioState('loading')

        const isCurrentPlayback = () => playbackTokenRef.current === token && !completed
        const maxPlaybackMs = Math.max(15000, Math.min(45000, (text?.length ?? 0) * 500 + 8000))

        const markDone = () => {
            if (!isCurrentPlayback()) return
            completed = true
            clearAudioWatchdogs()
            setAudioStalled(false)
            setAudioState('done')
        }

        const markPlaying = () => {
            if (!isCurrentPlayback()) return
            if (audioWatchdogRef.current) clearTimeout(audioWatchdogRef.current)
            audioWatchdogRef.current = null
            setAudioStalled(false)
            setAudioState('playing')
            if (audioFallbackRef.current) clearTimeout(audioFallbackRef.current)
            // iOS occasionally omits `ended`; never start a second sound here.
            audioFallbackRef.current = setTimeout(markDone, maxPlaybackMs)
        }

        const fallbackToGeneratedTTS = () => {
            if (!isCurrentPlayback() || fallbackStarted) return
            fallbackStarted = true
            clearAudioWatchdogs()

            const storedAudio = audioRef.current
            if (storedAudio) {
                storedAudio.onplaying = null
                storedAudio.onended = null
                storedAudio.onerror = null
                storedAudio.onstalled = null
                storedAudio.onwaiting = null
                storedAudio.pause()
                storedAudio.removeAttribute('src')
                storedAudio.load()
            }

            setAudioStalled(true)
            setAudioState('loading')
            if (!text) {
                markDone()
                return
            }

            // iOS can occasionally accept SpeechSynthesis without ever firing
            // start/end. Keep the quiz recoverable instead of leaving it frozen.
            audioFallbackRef.current = setTimeout(markDone, maxPlaybackMs)
            // `speakText` provides exactly one internal browser-voice fallback.
            speakText(text, 1, markPlaying, markDone, markDone)
        }

        if (!audioUrl) {
            fallbackToGeneratedTTS()
            return
        }

        // A fresh element per question prevents late Safari media events and
        // listeners from the previous question leaking into the next one.
        const audio = new Audio()
        audioRef.current = audio
        audio.setAttribute('preload', 'auto')
        audio.setAttribute('playsinline', 'true')

        const scheduleStallFallback = () => {
            if (!isCurrentPlayback()) return
            if (audioWatchdogRef.current) clearTimeout(audioWatchdogRef.current)
            audioWatchdogRef.current = setTimeout(() => {
                if (!isCurrentPlayback() || audio.ended) return
                // A short network interruption after playback started gets a grace
                // period; a source that never starts falls back immediately after it.
                fallbackToGeneratedTTS()
            }, storedAudioStarted ? 3500 : 6500)
        }

        const handlePlaying = () => {
            if (!isCurrentPlayback()) return
            storedAudioStarted = true
            markPlaying()
        }
        audio.addEventListener('playing', handlePlaying, { once: true })
        audio.addEventListener('ended', markDone, { once: true })
        audio.addEventListener('error', fallbackToGeneratedTTS, { once: true })
        audio.addEventListener('stalled', scheduleStallFallback)
        audio.addEventListener('waiting', scheduleStallFallback)

        audio.src = audioUrl
        audio.load()
        scheduleStallFallback()
        void audio.play().catch(fallbackToGeneratedTTS)

        // Warm the next stored MP3 in a separate, muted element. Reusing the
        // playing element here interrupts Safari and is the source of skipped
        // or duplicated speech during rapid question transitions.
        const nextItem = quizItems[idxRef.current + 1]
        const nextUrl = nextItem?.q?.question_audio_url || nextItem?.q?.audio_url
        if (nextUrl) {
            const preload = preloadRef.current ?? new Audio()
            preloadRef.current = preload
            preload.setAttribute('preload', 'auto')
            preload.setAttribute('playsinline', 'true')
            if (preload.getAttribute('src') !== nextUrl) {
                preload.setAttribute('src', nextUrl)
                preload.load()
            }
        }
    }, [cancelAudioPlayback, clearAudioWatchdogs, quizItems])

    useEffect(() => {
        if (!current?.q) return
        answeredRef.current = null
        if (timerRef.current) clearInterval(timerRef.current)
        if (advanceRef.current) clearTimeout(advanceRef.current)
        // Start after the committed render so React state updates from the
        // playback callbacks do not cascade synchronously inside this effect.
        const startPlayback = window.setTimeout(() => playQuestionAudio(current), 0)
        
        return () => {
            window.clearTimeout(startPlayback)
            // Stop the current sound but keep the next MP3 warm in the browser
            // cache. Releasing it here defeats preloading on every transition.
            cancelAudioPlayback(false)
        }
    }, [cancelAudioPlayback, current, playQuestionAudio, timeLimitMs])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (advanceRef.current) clearTimeout(advanceRef.current)
            cancelAudioPlayback(true)
        }
    }, [cancelAudioPlayback])

    // --- RESULT SCREEN ---
    if (phase === 'result') {
        const allResults = results
        const correct = allResults.filter(r => r.isCorrect).length
        const score = Math.round((correct / allResults.length) * 100)
        const avgTime = allResults.filter(r => r.isCorrect && r.timeUsed).reduce((acc, r) => acc + r.timeUsed, 0) / (allResults.filter(r => r.isCorrect).length || 1)
        const masteredIds = allResults.filter(r => r.isCorrect).map(r => r.q.id)

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 flex flex-col items-center justify-center">
                <div className="w-full max-w-lg space-y-5 animate-in fade-in zoom-in-95 duration-500">
                    {/* Score card */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 text-center space-y-4">
                        <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black shadow-inner
                            ${score >= 80 ? 'bg-emerald-50 text-emerald-600 border-4 border-emerald-200' :
                            score >= 60 ? 'bg-amber-50 text-amber-600 border-4 border-amber-200' :
                            'bg-red-50 text-red-500 border-4 border-red-200'}`}>
                            {score}%
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-800">
                            {score >= 80 ? '🏆 Xuất Sắc!' : score >= 60 ? '⚡ Khá Tốt!' : '💪 Cần Luyện Thêm!'}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            Trả lời đúng <strong className="text-slate-800">{correct}/{allResults.length}</strong> câu
                            {avgTime > 0 && <> · Thời gian trung bình <strong className="text-blue-600">{(avgTime / 1000).toFixed(1)}s</strong></>}
                        </p>
                    </div>

                    {/* Wrong answers review */}
                    {allResults.filter(r => !r.isCorrect).length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                            <h3 className="text-sm font-bold text-red-600 flex items-center gap-1.5">
                                <XCircle className="w-4 h-4" /> Câu cần ôn lại ({allResults.filter(r => !r.isCorrect).length})
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {allResults.filter(r => !r.isCorrect).map((r, i) => (
                                    <div key={i} className="bg-red-50 rounded-xl px-3 py-2 text-xs space-y-0.5">
                                        <p className="font-bold text-slate-800">{r.q.question_text}</p>
                                        <p className="text-emerald-700">✓ {r.correct}</p>
                                        {r.userAnswer && r.userAnswer !== '__timeout__' && (
                                            <p className="text-red-500">✗ {r.userAnswer}</p>
                                        )}
                                        {(!r.userAnswer || r.userAnswer === '__timeout__') && (
                                            <p className="text-slate-400 italic">⏱ Hết giờ</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 rounded-2xl h-12 font-semibold" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
                        </Button>
                        <Button
                            className="flex-1 rounded-2xl h-12 font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-200"
                            onClick={() => onFinish(allResults, masteredIds)}
                        >
                            <Trophy className="w-4 h-4 mr-2" /> Lưu Kết Quả
                        </Button>
                    </div>
                    <Button variant="ghost" className="w-full text-slate-500 text-sm" onClick={() => {
                        idxRef.current = 0
                        resultsRef.current = []
                        answeredRef.current = null
                        setIdx(0)
                        setResults([])
                        setAnswered(null)
                        setTimeLeft(timeLimitMs)
                        setAudioState('loading')
                        setPhase('playing')
                    }}>
                        <RotateCcw className="w-4 h-4 mr-1.5" /> Chơi lại
                    </Button>
                </div>
            </div>
        )
    }

    // --- QUIZ SCREEN ---
    if (!current) return null // guard during phase transition

    const progressPct = (timeLeft / timeLimitMs) * 100
    const timerColor = progressPct > 50 ? '#3b82f6' : progressPct > 25 ? '#f59e0b' : '#ef4444'
    const circumference = 2 * Math.PI * 22

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 pt-5 pb-3">
                <Button variant="ghost" size="icon" onClick={onBack} className="text-white/60 hover:text-white hover:bg-white/10 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-white font-bold text-sm">Kiểm tra siêu tốc</span>
                    <span className="text-white/50 text-sm">·</span>
                    <span className="text-white/70 text-sm">{idx + 1}/{quizItems.length}</span>
                </div>
                <div className="w-9" />
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/10 mx-4 rounded-full">
                <div
                    className="h-full bg-gradient-to-r from-indigo-400 to-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${((idx + 1) / quizItems.length) * 100}%` }}
                />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
                {/* Timer ring + audio indicator */}
                <div className="flex flex-col items-center gap-3">
                    <div className="relative w-16 h-16">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 50 50">
                            <circle cx="25" cy="25" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                            <circle
                                cx="25" cy="25" r="22" fill="none"
                                stroke={answered !== null ? (answered === '__timeout__' || answered !== current.correct ? '#ef4444' : '#10b981') : timerColor}
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference * (1 - progressPct / 100)}
                                strokeLinecap="round"
                                className="transition-all duration-100"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            {audioState !== 'done' ? (
                                <Volume2 className="w-5 h-5 text-blue-300 animate-pulse" />
                            ) : (
                                <span className="text-white font-black text-lg">{Math.ceil(timeLeft / 1000)}</span>
                            )}
                        </div>
                    </div>
                    {audioState !== 'done' && (
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-white/50 text-xs animate-pulse">
                                {audioStalled ? 'Âm thanh tải chậm' : 'Đang phát âm thanh...'}
                            </span>
                            {audioStalled && (
                                <button
                                    type="button"
                                    onClick={() => playQuestionAudio(current)}
                                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95"
                                >
                                    Phát lại
                                </button>
                            )}
                        </div>
                    )}
                    {audioState === 'done' && answered === null && (
                        <span className="text-white/60 text-xs">Chọn nghĩa đúng!</span>
                    )}
                </div>

                {/* Korean question */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-5 text-center max-w-sm w-full border border-white/10">
                    <p className="text-2xl md:text-3xl font-black text-white tracking-wide leading-snug">
                        {current.q.question_text}
                    </p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                    {current.options.map((opt, i) => {
                        let style = 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40'
                        if (answered !== null) {
                            if (opt === current.correct) {
                                style = 'bg-emerald-500/30 border-emerald-400 text-emerald-100 scale-105'
                            } else if (opt === answered) {
                                style = 'bg-red-500/30 border-red-400 text-red-100'
                            } else {
                                style = 'bg-white/5 border-white/10 text-white/30'
                            }
                        }
                        return (
                            <button
                                key={i}
                                disabled={answered !== null || audioState !== 'done'}
                                onClick={() => handleAnswer(opt)}
                                className={`rounded-xl border-2 px-3 py-4 text-sm font-semibold text-left whitespace-normal leading-snug transition-all duration-200 ${style} ${audioState !== 'done' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                            >
                                <span className="text-white/40 text-xs font-bold mr-1">{String.fromCharCode(65 + i)}.</span>
                                {opt}
                            </button>
                        )
                    })}
                </div>

                {/* Feedback */}
                {answered !== null && (
                    <div className={`flex items-center gap-2 text-sm font-bold animate-in zoom-in-95 duration-200 px-5 py-2 rounded-full
                        ${answered === current.correct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                        {answered === current.correct
                            ? <><CheckCircle className="w-4 h-4" /> Chính xác! 🎉</>
                            : answered === '__timeout__'
                            ? <><Timer className="w-4 h-4" /> Hết giờ! ⏱</>
                            : <><XCircle className="w-4 h-4" /> Sai rồi, ôn lại nhé!</>
                        }
                    </div>
                )}
            </div>
        </div>
    )
}
