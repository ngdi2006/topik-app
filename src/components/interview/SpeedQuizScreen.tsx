'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, CheckCircle, XCircle, Trophy, RotateCcw, ArrowLeft, Volume2, Timer } from 'lucide-react'
import { speakText, stopTTS } from '@/lib/tts'

interface SpeedQuizQuestion {
    q: any
    options: string[]
    correct: string
}

interface SpeedQuizResult {
    q: any
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

function buildOptions(questions: any[], currentQ: any): string[] {
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
    questions: any[]
    maxQuestions?: number
    timeLimitSeconds?: number
    onFinish: (results: SpeedQuizResult[], masteredIds: string[]) => void
    onBack: () => void
}

export function SpeedQuizScreen({ questions, maxQuestions = 10, timeLimitSeconds = DEFAULT_TIME_LIMIT_SECONDS, onFinish, onBack }: Props) {
    const timeLimitMs = timeLimitSeconds * 1000
    const [quizItems] = useState<SpeedQuizQuestion[]>(() =>
        shuffleArray(questions.slice(0, maxQuestions)).map(q => ({
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
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const advanceRef = useRef<NodeJS.Timeout | null>(null)
    const startTimeRef = useRef<number>(0)

    // Use refs so callbacks always have latest values (avoid stale closure)
    const idxRef = useRef(0)
    const resultsRef = useRef<SpeedQuizResult[]>([])
    const answeredRef = useRef<string | null>(null)

    const current = quizItems[idx] ?? null // guard against undefined

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

    // Play audio on each new question
    const playTTS = useCallback(() => {
        if (current?.q?.question_text) {
            speakText(
                current.q.question_text,
                0.9,
                () => setAudioState('playing'),
                () => setAudioState('done'),
                () => setAudioState('done')
            )
        } else {
            setAudioState('done')
        }
    }, [current])

    useEffect(() => {
        if (!current?.q) return
        answeredRef.current = null
        setAnswered(null)
        setTimeLeft(timeLimitMs)
        setAudioState('loading')
        if (timerRef.current) clearInterval(timerRef.current)
        if (advanceRef.current) clearTimeout(advanceRef.current)

        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.src = ''
        }

        stopTTS()

        const forceElevenLabs = true;
        const audioUrl = forceElevenLabs ? null : current.q.question_audio_url
        if (audioUrl) {
            const audio = new Audio(audioUrl)
            audioRef.current = audio
            audio.onended = () => setAudioState('done')
            audio.onerror = () => playTTS()
            audio.play()
                .then(() => setAudioState('playing'))
                .catch(() => playTTS())
        } else {
            playTTS()
        }
        
        return () => {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.src = ''
            }
            stopTTS()
        }
    }, [idx]) // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (advanceRef.current) clearTimeout(advanceRef.current)
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.src = ''
            }
            stopTTS()
        }
    }, [])

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
                        <span className="text-white/50 text-xs animate-pulse">Đang phát âm thanh...</span>
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
