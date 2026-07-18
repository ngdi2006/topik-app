'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, ArrowLeft, Volume2, ShieldAlert, Sparkles, Play, ShieldCheck, AlertTriangle } from 'lucide-react'
import { speakText, stopTTS } from '@/lib/tts'

interface ActionConfig {
    text: string        // Short action label
    emoji: string       // Giant visual graphic
    color: string       // Theme color
    bgColor: string     // Panel background
    borderColor: string // Glowing borders
    ledColor: string    // Machine status LED color
    actionState: string // Avatar movement code
}

function getActionConfig(q: any): ActionConfig {
    const meaning = (q.vietnamese_meaning || '').toLowerCase()
    
    // Default fallback
    let text = q.vietnamese_meaning || 'THAO TÁC KHÁC'
    let emoji = '⚙️'
    let color = 'text-blue-500'
    let bgColor = 'from-slate-800 to-slate-900 border-slate-700/80 hover:border-blue-500/80 hover:shadow-blue-500/10'
    let borderColor = 'group-hover:border-blue-500'
    let ledColor = 'bg-blue-400'
    let actionState = 'idle'

    if (meaning.includes('trái')) {
        text = 'TRÁNH SANG TRÁI'
        emoji = '⬅️'
        color = 'text-blue-400'
        bgColor = 'from-slate-800 via-slate-900 to-blue-950/40 border-blue-900/60 hover:border-blue-500 hover:shadow-blue-500/20'
        borderColor = 'border-blue-800'
        ledColor = 'bg-blue-500 shadow-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
        actionState = 'left'
    } else if (meaning.includes('phải')) {
        text = 'TRÁNH SANG PHẢI'
        emoji = '➡️'
        color = 'text-indigo-400'
        bgColor = 'from-slate-800 via-slate-900 to-indigo-950/40 border-indigo-900/60 hover:border-indigo-500 hover:shadow-indigo-500/20'
        borderColor = 'border-indigo-800'
        ledColor = 'bg-indigo-500 shadow-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.8)]'
        actionState = 'right'
    } else if (meaning.includes('trước')) {
        text = 'TIẾN LÊN PHÍA TRƯỚC'
        emoji = '⬆️'
        color = 'text-sky-400'
        bgColor = 'from-slate-800 via-slate-900 to-sky-950/40 border-sky-900/60 hover:border-sky-500 hover:shadow-sky-500/20'
        borderColor = 'border-sky-800'
        ledColor = 'bg-sky-500 shadow-sky-500/80 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
        actionState = 'up'
    } else if (meaning.includes('sau') || meaning.includes('lùi')) {
        text = 'LÙI LẠI PHÍA SAU'
        emoji = '⬇️'
        color = 'text-slate-400'
        bgColor = 'from-slate-800 via-slate-900 to-slate-950 border-slate-800 hover:border-slate-400 hover:shadow-slate-400/20'
        borderColor = 'border-slate-700'
        ledColor = 'bg-slate-400 shadow-slate-400/80 shadow-[0_0_8px_rgba(148,163,184,0.8)]'
        actionState = 'down'
    } else if (meaning.includes('giơ') || meaning.includes('nhấc') || meaning.includes('nâng')) {
        text = 'GIƠ TAY / NHẤC CHÂN'
        emoji = '🙋‍♂️'
        color = 'text-emerald-400'
        bgColor = 'from-slate-800 via-slate-900 to-emerald-950/40 border-emerald-900/60 hover:border-emerald-500 hover:shadow-emerald-500/20'
        borderColor = 'border-emerald-800'
        ledColor = 'bg-emerald-500 shadow-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
        actionState = 'raise'
    } else if (meaning.includes('hạ') || meaning.includes('cúi')) {
        text = 'HẠ TAY / CÚI NGƯỜI'
        emoji = '🙇‍♂️'
        color = 'text-amber-400'
        bgColor = 'from-slate-800 via-slate-900 to-amber-950/40 border-amber-900/60 hover:border-amber-500 hover:shadow-amber-500/20'
        borderColor = 'border-amber-800'
        ledColor = 'bg-amber-500 shadow-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
        actionState = 'bend'
    } else if (meaning.includes('đứng') || meaning.includes('dậy')) {
        text = 'ĐỨNG DẬY THẲNG'
        emoji = '🧍‍♂️'
        color = 'text-teal-400'
        bgColor = 'from-slate-800 via-slate-900 to-teal-950/40 border-teal-900/60 hover:border-teal-500 hover:shadow-teal-500/20'
        borderColor = 'border-teal-800'
        ledColor = 'bg-teal-500 shadow-teal-500/80 shadow-[0_0_8px_rgba(20,184,166,0.8)]'
        actionState = 'stand'
    } else if (meaning.includes('ngồi')) {
        text = 'NGỒI XUỐNG ĐẤT/GHẾ'
        emoji = '🧎‍♂️'
        color = 'text-cyan-400'
        bgColor = 'from-slate-800 via-slate-900 to-cyan-950/40 border-cyan-900/60 hover:border-cyan-500 hover:shadow-cyan-500/20'
        borderColor = 'border-cyan-800'
        ledColor = 'bg-cyan-500 shadow-cyan-500/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
        actionState = 'sit'
    } else if (meaning.includes('dừng') || meaning.includes('tắt máy') || meaning.includes('dừng ngay') || meaning.includes('멈춰')) {
        text = 'NÚT DỪNG KHẨN CẤP (STOP)'
        emoji = '🚨'
        color = 'text-rose-400'
        bgColor = 'from-slate-800 via-slate-900 to-rose-950/50 border-rose-900/60 hover:border-rose-500 hover:shadow-rose-500/30'
        borderColor = 'border-rose-800'
        ledColor = 'bg-rose-500 shadow-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,1)] animate-pulse'
        actionState = 'stop'
    } else if (meaning.includes('bật') || meaning.includes('chạy') || meaning.includes('khởi động')) {
        text = 'KHỞI ĐỘNG THIẾT BỊ (ON)'
        emoji = '⚡'
        color = 'text-yellow-400'
        bgColor = 'from-slate-800 via-slate-900 to-yellow-950/40 border-yellow-900/60 hover:border-yellow-500 hover:shadow-yellow-500/20'
        borderColor = 'border-yellow-800'
        ledColor = 'bg-yellow-500 shadow-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.8)]'
        actionState = 'press'
    } else if (meaning.includes('nhìn') || meaning.includes('quan sát')) {
        text = 'QUAN SÁT BẢNG BÁO'
        emoji = '👀'
        color = 'text-purple-400'
        bgColor = 'from-slate-800 via-slate-900 to-purple-950/40 border-purple-900/60 hover:border-purple-500 hover:shadow-purple-500/20'
        borderColor = 'border-purple-800'
        ledColor = 'bg-purple-500 shadow-purple-500/80 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
        actionState = 'look'
    } else if (meaning.includes('mang') || meaning.includes('đeo') || meaning.includes('mặc')) {
        text = 'TRANG BỊ BẢO HỘ (PPE)'
        emoji = '🦺'
        color = 'text-orange-400'
        bgColor = 'from-slate-800 via-slate-900 to-orange-950/40 border-orange-900/60 hover:border-orange-500 hover:shadow-orange-500/20'
        borderColor = 'border-orange-800'
        ledColor = 'bg-orange-500 shadow-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
        actionState = 'ppe'
    } else if (meaning.includes('xoay') || meaning.includes('quay')) {
        text = 'XOAY VÒNG / QUAY NGƯỜI'
        emoji = '🔄'
        color = 'text-teal-400'
        bgColor = 'from-slate-800 via-slate-900 to-teal-950/40 border-teal-900/60 hover:border-teal-500 hover:shadow-teal-500/20'
        borderColor = 'border-teal-800'
        ledColor = 'bg-teal-500 shadow-teal-500/80 shadow-[0_0_8px_rgba(20,184,166,0.8)]'
        actionState = 'look'
    } else if (meaning.includes('mở') || meaning.includes('nắm') || meaning.includes('xòe')) {
        text = 'THAO TÁC BÀN TAY'
        emoji = '👋'
        color = 'text-sky-400'
        bgColor = 'from-slate-800 via-slate-900 to-sky-950/40 border-sky-900/60 hover:border-sky-500 hover:shadow-sky-500/20'
        borderColor = 'border-sky-800'
        ledColor = 'bg-sky-500 shadow-sky-500/80 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
        actionState = 'raise'
    }

    return { text, emoji, color, bgColor, borderColor, ledColor, actionState }
}

interface ScenarioQuestion {
    q: any
    correctConfig: ActionConfig
    options: ActionConfig[]
}

interface ScenarioResult {
    q: any
    isCorrect: boolean
    userAnswer: string
    correctAnswer: string
}

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function WorkerAvatar({ state, hasPPE }: { state: string; hasPPE: boolean }) {
    let characterStyle = 'transition-all duration-500 transform origin-bottom'
    let armLeftStyle = 'transition-transform duration-500 origin-[top_right]'
    let armRightStyle = 'transition-transform duration-500 origin-[top_left]'
    let legsStyle = 'transition-transform duration-500'
    let alertOverlay = false

    if (state === 'left') {
        characterStyle += ' -translate-x-14 scale-95'
    } else if (state === 'right') {
        characterStyle += ' translate-x-14 scale-95'
    } else if (state === 'up') {
        characterStyle += ' scale-110 -translate-y-2'
    } else if (state === 'down') {
        characterStyle += ' scale-85 translate-y-2'
    } else if (state === 'raise') {
        armLeftStyle += ' -rotate-[150deg]'
        armRightStyle += ' rotate-[150deg]'
    } else if (state === 'bend') {
        characterStyle += ' scale-y-75 translate-y-3 skew-x-3'
    } else if (state === 'stand') {
        characterStyle += ' scale-y-105'
    } else if (state === 'sit') {
        characterStyle += ' scale-y-60 translate-y-8'
    } else if (state === 'stop') {
        characterStyle += ' scale-95 animate-bounce'
        alertOverlay = true
    } else if (state === 'press') {
        armRightStyle += ' rotate-[90deg] translate-x-1'
    } else if (state === 'look') {
        characterStyle += ' rotate-6'
    } else if (state === 'error') {
        characterStyle += ' animate-wiggle bg-red-100/20'
    }

    return (
        <div className="relative w-full h-52 flex items-end justify-center bg-slate-950 overflow-hidden border-2 border-slate-800 rounded-3xl shadow-2xl">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_6px] pointer-events-none z-10 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-950 pointer-events-none" />

            {/* Glowing neon ceiling indicator */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 rounded-full bg-indigo-500/30 blur-[4px]"></div>

            {/* Industrial background element */}
            <div className="absolute inset-0 flex items-center justify-around opacity-5 pointer-events-none z-0">
                <div className="w-12 h-24 bg-slate-600 rounded-t-lg border-2 border-slate-500"></div>
                <div className="w-24 h-32 bg-slate-700 rounded-t-lg border-2 border-slate-600"></div>
                <div className="w-16 h-28 bg-slate-600 rounded-t-lg border-2 border-slate-500"></div>
            </div>

            {/* Alert Flasher */}
            {state === 'error' && (
                <div className="absolute inset-0 bg-red-600/30 animate-flash z-10 flex items-center justify-center">
                    <AlertTriangle className="w-14 h-14 text-red-500 animate-bounce" />
                </div>
            )}
            {alertOverlay && (
                <div className="absolute inset-0 bg-rose-600/10 animate-pulse z-10 flex items-center justify-center">
                    <div className="px-4 py-1.5 bg-red-600 text-white font-black text-xs rounded-full border border-red-500 shadow-xl animate-bounce tracking-widest uppercase">STOP TRIGGERED</div>
                </div>
            )}

            {/* Main Character Body Group */}
            <div className={`relative z-10 flex flex-col items-center pb-3 ${characterStyle}`}>
                {/* Safety Helmet / Head */}
                <div className="relative flex flex-col items-center">
                    {/* Helmet */}
                    <div className={`w-8.5 h-5 rounded-t-full relative -mb-1 shadow-md transition-all duration-500
                        ${hasPPE || state === 'ppe' ? 'bg-yellow-400 border border-yellow-500 visible' : 'bg-transparent invisible'}`}>
                        <div className="absolute bottom-0 -left-1.5 -right-1.5 h-1 bg-yellow-500 rounded-full" />
                    </div>
                    {/* Head */}
                    <div className="w-7 h-7 bg-amber-100 rounded-full border border-amber-200 shadow-sm flex items-center justify-center relative">
                        <div className="absolute top-2.5 w-1.5 h-1.5 bg-slate-700 rounded-full left-1.5"></div>
                        <div className="absolute top-2.5 w-1.5 h-1.5 bg-slate-700 rounded-full right-1.5"></div>
                        <div className="absolute bottom-1 w-3 h-1 bg-amber-300 rounded-full"></div>
                    </div>
                </div>

                {/* Neck */}
                <div className="w-2.5 h-2.5 bg-amber-100 border-x border-amber-200"></div>

                {/* Torso / Clothes */}
                <div className="w-11.5 h-14 bg-blue-600 border border-blue-700 rounded-t-lg relative flex justify-center items-stretch shadow-md overflow-hidden">
                    {/* Safety High-Vis Vest */}
                    {(hasPPE || state === 'ppe') && (
                        <div className="absolute inset-0 bg-orange-500 flex justify-between px-1">
                            <div className="w-2 bg-yellow-300"></div>
                            <div className="w-2 bg-yellow-300"></div>
                            <div className="absolute top-6 left-0 right-0 h-1.5 bg-slate-200 shadow-inner"></div>
                        </div>
                    )}
                </div>

                {/* Left Arm */}
                <div className={`absolute left-[-11px] top-[28px] w-3.5 h-12 bg-blue-500 border border-blue-600 rounded-full ${armLeftStyle}`}>
                    <div className="absolute bottom-[-2px] left-0.5 w-2.5 h-2.5 bg-amber-100 rounded-full border border-amber-200"></div>
                </div>

                {/* Right Arm */}
                <div className={`absolute right-[-11px] top-[28px] w-3.5 h-12 bg-blue-500 border border-blue-600 rounded-full ${armRightStyle}`}>
                    <div className="absolute bottom-[-2px] left-0.5 w-2.5 h-2.5 bg-amber-100 rounded-full border border-amber-200"></div>
                </div>

                {/* Legs */}
                <div className={`flex gap-2.5 mt-[-1px] ${legsStyle}`}>
                    <div className="w-3.5 h-12 bg-slate-800 border border-slate-900 rounded-b-md shadow-sm"></div>
                    <div className="w-3.5 h-12 bg-slate-800 border border-slate-900 rounded-b-md shadow-sm"></div>
                </div>
            </div>
        </div>
    )
}

interface Props {
    questions: any[]
    onFinish: (newlyMasteredIds: string[]) => void
    onBack: () => void
}

export function FactoryScenarioScreen({ questions, onFinish, onBack }: Props) {
    const [scenarios] = useState<ScenarioQuestion[]>(() => {
        return shuffleArray(questions.slice(0, 10)).map(q => {
            const correctConfig = getActionConfig(q)
            
            // Build unique distractors list
            const distractors = shuffleArray(
                Array.from(
                    new Set(
                        questions
                            .filter(other => other.id !== q.id)
                            .map(other => getActionConfig(other).text)
                    )
                )
            ).slice(0, 3).map(text => {
                const matchedQ = questions.find(other => getActionConfig(other).text === text)
                return matchedQ ? getActionConfig(matchedQ) : {
                    text,
                    emoji: '⚙️',
                    color: 'text-slate-600',
                    bgColor: 'from-slate-800 to-slate-900 border-slate-800',
                    borderColor: 'border-slate-700',
                    ledColor: 'bg-slate-600',
                    actionState: 'idle'
                }
            })

            return {
                q,
                correctConfig,
                options: shuffleArray([correctConfig, ...distractors])
            }
        })
    })

    const [idx, setIdx] = useState(0)
    const [results, setResults] = useState<ScenarioResult[]>([])
    const [answered, setAnswered] = useState<string | null>(null)
    const [audioState, setAudioState] = useState<'idle' | 'playing' | 'done'>('idle')
    const [phase, setPhase] = useState<'playing' | 'result'>('playing')
    const [actionState, setActionState] = useState<string>('idle')
    const [hasPPE, setHasPPE] = useState(false)

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const current = scenarios[idx] ?? null

    const handleSelectAction = (choice: ActionConfig) => {
        if (answered !== null) return
        const isCorrect = choice.text === current.correctConfig.text
        setAnswered(choice.text)

        if (isCorrect) {
            setActionState(choice.actionState)
            if (choice.actionState === 'ppe') {
                setHasPPE(true)
            }
        } else {
            setActionState('error')
        }

        const newResult: ScenarioResult = {
            q: current.q,
            isCorrect,
            userAnswer: choice.text,
            correctAnswer: current.correctConfig.text
        }

        setResults(prev => [...prev, newResult])

        setTimeout(() => {
            if (idx + 1 >= scenarios.length) {
                setPhase('result')
            } else {
                setIdx(prev => prev + 1)
                setAnswered(null)
                setActionState('idle')
                setAudioState('idle')
            }
        }, 1600)
    }

    const playTTS = useCallback(() => {
        if (current?.q?.question_text) {
            speakText(current.q.question_text, 0.85,
                () => setAudioState('playing'),
                () => setAudioState('done')
            )
        } else {
            setAudioState('done')
        }
    }, [current])

    const playAudio = useCallback(() => {
        if (!current?.q) return
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.src = ''
        }
        stopTTS()

        const audioUrl = current.q.question_audio_url
        if (audioUrl) {
            const audio = new Audio(audioUrl)
            audioRef.current = audio
            audio.onplaying = () => setAudioState('playing')
            audio.onended = () => setAudioState('done')
            audio.onerror = () => playTTS()
            audio.play()
                .then(() => setAudioState('playing'))
                .catch(() => playTTS())
        } else {
            playTTS()
        }
    }, [current, playTTS])

    useEffect(() => {
        if (phase === 'playing') {
            playAudio()
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.src = ''
            }
            stopTTS()
        }
    }, [idx, phase, playAudio])

    if (phase === 'result') {
        const correctCount = results.filter(r => r.isCorrect).length
        const score = Math.round((correctCount / scenarios.length) * 100)
        const masteredIds = results.filter(r => r.isCorrect).map(r => r.q.id)

        return (
            <div className="min-h-screen bg-slate-900 py-8 px-4 flex items-center justify-center text-white">
                <div className="w-full max-w-xl space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 text-center space-y-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse"></div>
                        <div className="w-24 h-24 rounded-full mx-auto bg-indigo-950/50 border-4 border-indigo-900/60 flex items-center justify-center shadow-inner relative">
                            <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black tracking-wide">KẾT QUẢ MÔ PHỎNG</h2>
                        <p className="text-slate-400 text-sm">
                            Phản xạ đúng <strong className="text-indigo-400 text-lg font-black">{correctCount}/{scenarios.length}</strong> tình huống vận hành.
                        </p>
                        
                        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-left space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                                <span>Kiểm tra năng lực</span>
                                <span className={score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-blue-400' : 'text-rose-400'}>
                                    {score >= 80 ? 'ĐẠT (CHUYÊN NGHIỆP)' : score >= 50 ? 'ĐẠT (YÊU CẦU CƠ BẢN)' : 'CẦN LUYỆN TẬP THÊM'}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${score >= 80 ? 'from-emerald-400 to-teal-500' : score >= 50 ? 'from-blue-400 to-indigo-500' : 'from-rose-400 to-red-500'}`} 
                                    style={{ width: `${score}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button variant="outline" className="flex-1 rounded-2xl h-13 font-semibold border-slate-700 bg-slate-850 text-white hover:bg-slate-800" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
                        </Button>
                        <Button 
                            className="flex-1 rounded-2xl h-13 font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-200"
                            onClick={() => onFinish(masteredIds)}
                        >
                            Xác Nhận Kết Quả
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (!current) return null

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col pb-8">
            {/* Header top navigation */}
            <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-slate-950 border-b border-slate-850 shadow-md">
                <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:bg-slate-800 hover:text-white rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2 bg-indigo-950/40 border border-indigo-900/60 rounded-full px-4.5 py-1.5 text-indigo-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase tracking-wider">Bảng Vận Hành Nhà Xưởng</span>
                    <span className="opacity-40">|</span>
                    <span className="font-bold text-xs">{idx + 1}/{scenarios.length}</span>
                </div>
                <div className="w-9" />
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-slate-800">
                <div 
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${((idx + 1) / scenarios.length) * 100}%` }}
                ></div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 max-w-4xl mx-auto w-full gap-6">
                
                {/* 3D-like Interactive CSS Worker Simulator */}
                <div className="w-full flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" /> Trình giả lập phản xạ thực tế
                    </p>
                    <WorkerAvatar state={actionState} hasPPE={hasPPE} />
                </div>

                {/* Speaker voice box */}
                <div className="w-full bg-slate-950 rounded-[2rem] border border-slate-850 shadow-2xl p-5 text-center flex items-center justify-between gap-4 relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={playAudio}
                            className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-md transition-all duration-300 active:scale-95 shrink-0
                                ${audioState === 'playing' 
                                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'}`}
                        >
                            {audioState === 'playing' ? (
                                <div className="flex gap-1 items-end h-4">
                                    <div className="w-1 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1 h-4 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            ) : (
                                <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                            )}
                        </button>
                        <div className="text-left">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Quản đốc nhà xưởng</span>
                            <span className="text-sm font-bold text-slate-200">
                                {audioState === 'playing' ? 'Đang phát lệnh bằng tiếng Hàn...' : 'Bấm để nghe khẩu lệnh'}
                            </span>
                        </div>
                    </div>

                    {/* Small wave animation */}
                    {audioState === 'playing' && (
                        <div className="hidden md:flex gap-1.5 items-center mr-2">
                            {[...Array(6)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="w-1 h-6 bg-gradient-to-t from-indigo-500 to-sky-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]"
                                    style={{ animationDelay: `${i * 150}ms` }}
                                ></div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Visual Control Panel options grid */}
                <div className="w-full space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Bàn điều khiển phản xạ thiết bị</p>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                        {current.options.map((opt, i) => {
                            const isAnswered = answered !== null
                            const isCorrect = opt.text === current.correctConfig.text
                            const isChosen = opt.text === answered
                            
                            let cardStyle = 'border-slate-800 text-white'
                            let textStyle = 'text-slate-300'
                            
                            if (isAnswered) {
                                if (isCorrect) {
                                    cardStyle = 'bg-emerald-500/20 border-emerald-500/80 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.03] z-10'
                                    textStyle = 'text-emerald-300 font-bold'
                                } else if (isChosen) {
                                    cardStyle = 'bg-rose-500/20 border-rose-500/85 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                                    textStyle = 'text-rose-300'
                                } else {
                                    cardStyle = 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-20'
                                    textStyle = 'text-slate-600'
                                }
                            }

                            return (
                                <button
                                    key={i}
                                    disabled={isAnswered}
                                    onClick={() => handleSelectAction(opt)}
                                    className={`relative group flex flex-col items-center justify-center p-6 rounded-3xl border-2 bg-gradient-to-b transition-all duration-300 ${opt.bgColor} ${cardStyle} ${!isAnswered ? 'cursor-pointer active:scale-95' : ''}`}
                                >
                                    {/* Machine status LED indicator */}
                                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                                        <div className={`w-2.5 h-2.5 rounded-full ${isAnswered ? (isCorrect ? 'bg-emerald-400' : isChosen ? 'bg-rose-500' : 'bg-slate-800') : opt.ledColor}`}></div>
                                    </div>

                                    {/* Giant Action Emoji */}
                                    <div className={`w-18 h-18 rounded-2xl flex items-center justify-center text-4xl mb-4 bg-slate-900/60 border border-slate-800/80 shadow-inner group-hover:scale-110 transition-transform duration-300
                                        ${isAnswered && !isCorrect && !isChosen ? 'opacity-30' : ''}`}>
                                        {opt.emoji}
                                    </div>

                                    {/* Short command style description */}
                                    <p className={`text-xs md:text-sm font-black tracking-wide text-center leading-snug uppercase ${textStyle}`}>
                                        {opt.text}
                                    </p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Quick Feedback Notification */}
                {answered !== null && (
                    <div className={`flex items-center gap-2 px-6 py-3 rounded-full border text-sm font-bold shadow-lg animate-in zoom-in-95 duration-200
                        ${answered === current.correctConfig.text 
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                            : 'bg-rose-500/10 border-rose-500/40 text-rose-400'}`}>
                        {answered === current.correctConfig.text ? (
                            <><CheckCircle className="w-4 h-4 animate-bounce" /> PHẢN XẠ CHÍNH XÁC • THAO TÁC ĐẠT CHUẨN</>
                        ) : (
                            <><XCircle className="w-4 h-4 animate-bounce" /> THAO TÁC SAI • HÃY CHÚ Ý AN TOÀN LAO ĐỘNG</>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
