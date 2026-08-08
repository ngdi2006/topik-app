'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Volume2, CheckCircle, XCircle, Mic, Square, RefreshCw, ChevronRight, Calculator, Eye, EyeOff } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { speakText, stopTTS } from '@/lib/tts'

// ─── Types ───────────────────────────────────────────────────────────────────
interface MathQuestion {
    id: string
    question_text: string
    vietnamese_meaning: string
    suggested_answers: string[]
    question_audio_url?: string
    countdown_after_audio?: number
}

interface MathPracticeScreenProps {
    questions: MathQuestion[]
    mathMode: 'listen_card' | 'number_quiz' | 'speak_answer'
    onFinish: (masteredIds: string[], total: number) => void
    onBack: () => void
}

function shuffleArr<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function getAnswer(q: MathQuestion): string {
    const ans = q.suggested_answers?.find(s => !s.startsWith('__topic__:')) || ''
    return ans
}

function getSpeakingGivenValue(q: MathQuestion): string {
    const combinedText = `${getAnswer(q)} ${q.vietnamese_meaning || ''}`
    const parentheticalValues = [...combinedText.matchAll(/\(([^)]+)\)/g)]
        .map(match => match[1].trim())
    const readableParenthetical = parentheticalValues.find(value =>
        /\d/.test(value) && /(kg|g|킬로그램|그램|cm|m|mm|l|ml|원|개|명|시간|분|초)/i.test(value)
    )
    if (readableParenthetical) return readableParenthetical

    const numericValue = combinedText.match(
        /\d+(?:[.,]\d+)?\s*(?:kg|g|킬로그램|그램|cm|mm|m|km|l|ml|원|개|명|시간|분|초)/i
    )
    return numericValue?.[0]?.trim() || ''
}

function getSpeakingGivenLabel(q: MathQuestion): string {
    const text = `${q.question_text} ${q.vietnamese_meaning}`.toLowerCase()
    if (/무게|trọng lượng|cân nặng/.test(text)) return 'Trọng lượng'
    if (/길이|chiều dài/.test(text)) return 'Chiều dài'
    if (/가격|얼마|giá tiền/.test(text)) return 'Giá trị'
    if (/시간|thời gian/.test(text)) return 'Thời gian'
    return 'Giá trị cần đọc'
}

function shouldShowSpeakingGivenValue(q: MathQuestion): boolean {
    const korean = q.question_text.toLowerCase()
    const vietnamese = (q.vietnamese_meaning || '').toLowerCase()
    const isDirectWeightQuestion =
        /(?:이거|이것|물건).*(?:무게|몇\s*(?:킬로|kg)).*(?:얼마|입니까|예요)/i.test(korean) ||
        /(?:trọng lượng|cân nặng).*(?:vật này|cái này).*(?:bao nhiêu)/i.test(vietnamese)
    const containsCalculationOrConversion =
        /\d/.test(`${korean} ${vietnamese}`) ||
        /더하|빼|곱하|나누|합|차|계산|바꾸|변환|환산|cộng|trừ|nhân|chia|tính|đổi|quy đổi|chuyển đổi/i.test(`${korean} ${vietnamese}`)

    return isDirectWeightQuestion && !containsCalculationOrConversion
}

// ─── Mode 1: Nghe & Nhớ (Flashcard toán) ────────────────────────────────────
function MathFlashcard({ questions, onFinish }: { questions: MathQuestion[], onFinish: (masteredIds: string[]) => void }) {
    const [idx, setIdx] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [correct, setCorrect] = useState(0)
    const [wrong, setWrong] = useState(0)
    const [hideKorean, setHideKorean] = useState(true)
    const [hideVietnamese, setHideVietnamese] = useState(true)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

    const q = questions[idx]
    const answer = getAnswer(q)

    const speak = (text: string) => {
        speakText(text, 1.0, undefined, undefined, undefined, {
            profile: 'math-paced-v1',
        })
    }

    useEffect(() => {
        setFlipped(false)
        speak(q.question_text)
        return () => { stopTTS() }
    }, [idx, q])

    const masteredIdsRef = useRef<string[]>([])

    const handleKnown = () => {
        masteredIdsRef.current.push(q.id)
        setCorrect(c => c + 1)
        if (idx >= questions.length - 1) {
            onFinish(masteredIdsRef.current)
        } else {
            setIdx(i => i + 1)
        }
    }
    const handleUnknown = () => {
        setWrong(w => w + 1)
        if (idx >= questions.length - 1) {
            onFinish(masteredIdsRef.current)
        } else {
            setIdx(i => i + 1)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <audio ref={audioRef} className="hidden" />

            {/* Stats / Progress */}
            <div className="flex items-center justify-between px-1">
                <div className="text-sm font-semibold text-slate-500">
                    Câu hỏi: <span className="text-indigo-600 font-extrabold">{idx + 1}</span>/{questions.length}
                </div>
                <div className="flex gap-2">
                    <span className="text-xs bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full">✓ Thuộc: {correct}</span>
                    <span className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-full">✗ Chưa thuộc: {wrong}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-rose-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
                />
            </div>

            {/* Toggle controls */}
            <div className="flex justify-center gap-3">
                <button
                    onClick={() => setHideKorean(!hideKorean)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm border ${hideKorean ? 'bg-rose-600 border-transparent text-white shadow-rose-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    {hideKorean ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {hideKorean ? 'Hiện tiếng Hàn' : 'Ẩn tiếng Hàn'}
                </button>
                <button
                    onClick={() => setHideVietnamese(!hideVietnamese)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm border ${hideVietnamese ? 'bg-rose-600 border-transparent text-white shadow-rose-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    {hideVietnamese ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {hideVietnamese ? 'Hiện tiếng Việt' : 'Ẩn tiếng Việt'}
                </button>
            </div>

            {/* Custom 3D Flip Styles */}
            <style>{`
                .math-perspective {
                    perspective: 1200px;
                }
                .math-card-inner {
                    position: relative;
                    width: 100%;
                    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                    transform-style: preserve-3d;
                }
                .math-card-inner.is-flipped {
                    transform: rotateY(180deg);
                }
                .math-card-face {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .math-card-face-back {
                    transform: rotateY(180deg);
                }
            `}</style>

            {/* Card wrapper */}
            <div className="math-perspective max-w-2xl mx-auto">
                <div 
                    className={`math-card-inner ${flipped ? 'is-flipped' : ''}`}
                >
                    {/* Front */}
                    <div 
                        onClick={() => setFlipped(!flipped)}
                        className={`math-card-face rounded-3xl border-2 border-rose-100 bg-white shadow-xl overflow-hidden cursor-pointer select-none ${
                            !flipped ? 'relative' : 'absolute inset-0'
                        }`}
                    >
                        <div className="h-full bg-white p-8 md:p-12 flex flex-col items-center justify-center text-center gap-6 min-h-[300px]">
                            <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center">
                                <span className="text-4xl">🧮</span>
                            </div>
                            <div className="w-full">
                                <p className="text-slate-500 text-sm font-semibold mb-3 uppercase tracking-wider">Câu hỏi tiếng Hàn</p>
                                {hideKorean ? (
                                    <div className="py-2 text-slate-300 text-lg font-bold flex items-center justify-center gap-1.5 select-none animate-in fade-in duration-300">
                                        <EyeOff className="w-5 h-5" /> Tiếng Hàn đã ẩn
                                    </div>
                                ) : (
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-relaxed animate-in fade-in duration-300">{q.question_text}</h2>
                                )}

                                {hideVietnamese ? (
                                    <div className="py-1 mt-2 text-slate-300 text-sm font-semibold flex items-center justify-center gap-1 select-none animate-in fade-in duration-300">
                                        <EyeOff className="w-4 h-4" /> Tiếng Việt đã ẩn
                                    </div>
                                ) : (
                                    <p className="text-slate-500 mt-3 text-base font-medium animate-in fade-in duration-300">{q.vietnamese_meaning}</p>
                                )}
                            </div>
                            <button
                                onClick={e => { e.stopPropagation(); speak(q.question_text) }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-full border border-rose-200 transition-colors text-sm"
                            >
                                <Volume2 className="w-4 h-4" /> Nghe lại
                            </button>
                            <p className="text-slate-400 text-sm animate-pulse">👆 Nhấn để xem đáp án</p>
                        </div>
                    </div>

                    {/* Back */}
                    <div 
                        onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('button') || target.closest('a')) return;
                            setFlipped(!flipped);
                        }}
                        className={`math-card-face math-card-face-back rounded-3xl border-2 border-indigo-200 bg-white shadow-xl overflow-hidden cursor-pointer select-none ${
                            flipped ? 'relative' : 'absolute inset-0'
                        }`}
                    >
                        <div className="h-full bg-gradient-to-br from-indigo-50 to-purple-50 p-8 md:p-12 flex flex-col items-center justify-center text-center gap-5 min-h-[300px]">
                            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                <span className="text-3xl">💡</span>
                            </div>
                            <div className="bg-white rounded-2xl p-5 w-full shadow-sm border border-indigo-100">
                                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3">Đáp án tiếng Hàn</p>
                                <p className="text-xl md:text-2xl font-black text-indigo-900 leading-relaxed">{answer}</p>
                            </div>
                            <button
                                onClick={e => { e.stopPropagation(); speak(answer.split('(')[0]) }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-full border border-indigo-200 transition-colors text-sm"
                            >
                                <Volume2 className="w-4 h-4" /> Nghe đáp án
                            </button>

                            <div className="flex gap-3 w-full mt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 h-12 text-red-600 border-red-200 hover:bg-red-50 rounded-xl font-bold"
                                    onClick={e => { e.stopPropagation(); handleUnknown() }}
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Chưa thuộc
                                </Button>
                                <Button
                                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200"
                                    onClick={e => { e.stopPropagation(); handleKnown() }}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" /> Đã thuộc
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Mode 2: Nghe & Chọn số (Multiple Choice với số) ────────────────────────
function MathNumberQuiz({ questions, onFinish }: { questions: MathQuestion[], onFinish: (masteredIds: string[]) => void }) {
    const [idx, setIdx] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [score, setScore] = useState(0)
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

    const q = questions[idx]
    const correctAns = getAnswer(q)

    function extractShortAnswer(fullAns: string): string {
        const match = fullAns.match(/\(([^)]+)\)/)
        return match ? match[1] : fullAns.split('.')[0]
    }

    const correctShort = extractShortAnswer(correctAns)

    const options = useMemo(() => {
        const wrongPool = questions
            .filter((_, i) => i !== idx)
            .map(qq => extractShortAnswer(getAnswer(qq)))
            .filter((v, i, a) => a.indexOf(v) === i && v !== correctShort)
        const wrongs = shuffleArr(wrongPool).slice(0, 3)
        return shuffleArr([correctShort, ...wrongs])
    }, [idx, questions, correctShort])

    const speak = (text: string) => {
        speakText(text, 1.0, undefined, undefined, undefined, {
            profile: 'math-paced-v1',
        })
    }

    useEffect(() => {
        setSelected(null)
        speak(q.question_text)
        return () => { stopTTS() }
    }, [idx])

    const masteredIdsRef = useRef<string[]>([])

    const handleSelect = (opt: string) => {
        if (selected) return
        setSelected(opt)
        if (opt === correctShort) {
            setScore(s => s + 1)
            masteredIdsRef.current.push(q.id)
        }
    }

    const handleNext = () => {
        if (idx >= questions.length - 1) onFinish(masteredIdsRef.current)
        else setIdx(i => i + 1)
    }

    const isCorrect = selected === correctShort

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Stats / Progress */}
            <div className="flex items-center justify-between px-1">
                <div className="text-sm font-semibold text-slate-500">
                    Câu hỏi: <span className="text-indigo-600 font-extrabold">{idx + 1}</span>/{questions.length}
                </div>
                <span className="text-sm font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    🏆 {score} điểm
                </span>
            </div>

            {/* Progress */}
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
            </div>

            {/* Main card */}
            <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-blue-100 shadow-lg p-8 text-center">
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Nghe câu hỏi → Chọn đáp án đúng</p>
                    
                    {selected ? (
                        <div className="animate-in fade-in duration-500">
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-relaxed mb-3">
                                {q.question_text}
                            </h2>
                            <p className="text-slate-500 font-medium mb-5">
                                {q.vietnamese_meaning}
                            </p>
                        </div>
                    ) : (
                        <div className="py-6 flex flex-col items-center justify-center gap-2 mb-3 animate-in fade-in duration-300">
                            <Volume2 className="w-12 h-12 text-blue-500 animate-pulse" />
                            <p className="text-slate-400 text-sm font-medium">Hãy nghe kỹ câu hỏi và chọn đáp án bên dưới</p>
                        </div>
                    )}

                    <button
                        onClick={() => speak(q.question_text)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-full border border-blue-200 transition-colors text-sm"
                    >
                        <Volume2 className="w-4 h-4" /> Nghe lại câu hỏi
                    </button>
                </div>

                {/* Options grid */}
                <div className="grid grid-cols-2 gap-3">
                    {options.map((opt, i) => {
                        let cls = 'bg-white border-2 border-slate-200 text-slate-800 hover:border-blue-400 hover:shadow-md'
                        if (selected) {
                            if (opt === correctShort) cls = 'bg-green-50 border-2 border-green-500 text-green-800 font-black scale-105 shadow-lg shadow-green-100'
                            else if (opt === selected) cls = 'bg-red-50 border-2 border-red-400 text-red-700 opacity-80'
                            else cls = 'bg-slate-50 border-2 border-slate-200 text-slate-400 opacity-50'
                        }
                        return (
                            <button
                                key={i}
                                onClick={() => handleSelect(opt)}
                                disabled={!!selected}
                                className={`${cls} rounded-2xl p-5 text-center font-bold text-xl transition-all duration-300 cursor-pointer hover:-translate-y-0.5`}
                            >
                                {opt}
                            </button>
                        )
                    })}
                </div>

                {/* Result + Full answer */}
                {selected && (
                    <div className={`animate-in fade-in slide-in-from-bottom-3 duration-400 p-5 rounded-2xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {isCorrect
                                ? <><CheckCircle className="w-5 h-5 text-green-600" /><span className="font-black text-green-700">Chính xác! 🎉</span></>
                                : <><XCircle className="w-5 h-5 text-red-600" /><span className="font-black text-red-700">Sai rồi!</span></>
                            }
                        </div>
                        <p className="text-slate-700 text-sm font-semibold">
                            Đáp án đầy đủ: <span className="text-indigo-700 font-black">{correctAns}</span>
                        </p>
                        <div className="flex justify-end mt-4">
                            <Button
                                onClick={handleNext}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 font-bold"
                            >
                                {idx >= questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'} <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Mode 3: Luyện phát âm số (Speaking practice) ───────────────────────────
function MathSpeakingPractice({ questions, onFinish }: { questions: MathQuestion[], onFinish: (masteredIds: string[]) => void }) {
    const [idx, setIdx] = useState(0)
    const [showAnswer, setShowAnswer] = useState(false)
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
    const [hideKorean, setHideKorean] = useState(true)
    const [hideVietnamese, setHideVietnamese] = useState(true)
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

    const q = questions[idx]
    const answer = getAnswer(q)
    const answerKorean = answer.split('(')[0].replace(/입니다\./g, '').trim()
    const givenValue = shouldShowSpeakingGivenValue(q) ? getSpeakingGivenValue(q) : ''
    const givenValueLabel = getSpeakingGivenLabel(q)

    const { hasBrowserSupport, isRecording, transcript, interimTranscript, startRecording, stopRecording, resetTranscript } = useSpeechRecognition('ko-KR')

    const speak = (text: string) => {
        speakText(text, 1.0, undefined, undefined, undefined, {
            profile: 'math-paced-v1',
        })
    }

    useEffect(() => {
        setShowAnswer(false)
        setAwaitingConfirmation(false)
        resetTranscript()
        if (isRecording) stopRecording()
        speak(q.question_text)
        return () => { stopTTS() }
    }, [idx])

    const handleToggleRecord = () => {
        if (isRecording) {
            stopRecording()
            setAwaitingConfirmation(true)
        } else {
            setShowAnswer(false)
            setAwaitingConfirmation(false)
            resetTranscript()
            startRecording()
        }
    }

    const handleAcceptAnswer = () => {
        setAwaitingConfirmation(false)
        setShowAnswer(true)
    }

    const handleRetryRecording = () => {
        setShowAnswer(false)
        setAwaitingConfirmation(false)
        resetTranscript()
    }

    const masteredIdsRef = useRef<string[]>([])

    const handleNext = () => {
        if (isCorrect) {
            masteredIdsRef.current.push(q.id)
        }
        if (idx >= questions.length - 1) onFinish(masteredIdsRef.current)
        else setIdx(i => i + 1)
    }

    const userSaid = (transcript || interimTranscript).trim()
    const isCorrect = userSaid && answerKorean && userSaid.includes(answerKorean.trim())

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Stats / Progress */}
            <div className="flex items-center justify-between px-1">
                <div className="text-sm font-semibold text-slate-500">
                    Câu hỏi: <span className="text-indigo-600 font-extrabold">{idx + 1}</span>/{questions.length}
                </div>
            </div>

            {/* Progress */}
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                    style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
            </div>

            {/* Toggle controls */}
            <div className="flex justify-center gap-3">
                <button
                    onClick={() => setHideKorean(!hideKorean)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm border ${hideKorean ? 'bg-violet-600 border-transparent text-white shadow-violet-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    {hideKorean ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {hideKorean ? 'Hiện tiếng Hàn' : 'Ẩn tiếng Hàn'}
                </button>
                <button
                    onClick={() => setHideVietnamese(!hideVietnamese)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm border ${hideVietnamese ? 'bg-violet-600 border-transparent text-white shadow-violet-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    {hideVietnamese ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {hideVietnamese ? 'Hiện tiếng Việt' : 'Ẩn tiếng Việt'}
                </button>
            </div>

            <div className="space-y-5">
                {/* Question card */}
                <div className="bg-white rounded-3xl border border-violet-100 shadow-lg p-8 text-center">
                    <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-4">Nghe → Tính nhẩm → Nói đáp án bằng tiếng Hàn</p>
                    <div className="w-full">
                        {hideKorean && !showAnswer ? (
                            <div className="py-2 text-slate-300 text-lg font-bold flex items-center justify-center gap-1.5 select-none animate-in fade-in duration-300">
                                <EyeOff className="w-5 h-5" /> Tiếng Hàn đã ẩn
                            </div>
                        ) : (
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-relaxed mb-3 animate-in fade-in duration-300">{q.question_text}</h2>
                        )}

                        {hideVietnamese && !showAnswer ? (
                            <div className="py-1 mt-2 text-slate-300 text-sm font-semibold flex items-center justify-center gap-1 select-none animate-in fade-in duration-300">
                                <EyeOff className="w-4 h-4" /> Tiếng Việt đã ẩn
                            </div>
                        ) : (
                            <p className="text-slate-500 font-medium mb-6 animate-in fade-in duration-300">{q.vietnamese_meaning}</p>
                        )}

                        {givenValue ? (
                            <div className="mx-auto mt-5 mb-6 w-fit min-w-36 rounded-2xl border-2 border-violet-200 bg-violet-50 px-7 py-4 shadow-sm">
                                <p className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-violet-500">
                                    {givenValueLabel}
                                </p>
                                <p className="text-3xl font-black tabular-nums text-slate-900">
                                    {givenValue}
                                </p>
                            </div>
                        ) : null}
                    </div>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => speak(q.question_text)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-600 font-bold rounded-full border border-violet-200 transition-colors text-sm"
                        >
                            <Volume2 className="w-4 h-4" /> Nghe câu hỏi
                        </button>
                        <button
                            onClick={() => speak(answer.split('(')[0])}
                            className="flex items-center gap-2 px-5 py-2.5 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-600 font-bold rounded-full border border-fuchsia-200 transition-colors text-sm"
                        >
                            <Volume2 className="w-4 h-4" /> Nghe mẫu
                        </button>
                    </div>
                </div>

                {/* Mic area */}
                {!hasBrowserSupport ? (
                    <div className="bg-red-50 rounded-2xl p-5 text-center text-red-600 font-semibold border border-red-200">
                        Trình duyệt không hỗ trợ ghi âm. Vui lòng dùng Chrome hoặc Edge.
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-8 flex flex-col items-center gap-5">
                        <p className="text-slate-500 text-sm font-semibold">
                            {isRecording
                                ? '🎙️ Đang ghi âm — Nhấn nút để kết thúc'
                                : awaitingConfirmation
                                    ? 'Hãy kiểm tra phần đã đọc, sau đó chấp nhận đáp án'
                                    : 'Nhấn nút micro bên dưới và nói đáp án bằng tiếng Hàn'}
                        </p>

                        {/* Beautiful audio visualizer soundwave */}
                        <div className="flex items-center gap-1.5 h-12 justify-center px-4 my-1">
                            <style>{`
                                @keyframes soundWave {
                                    0%, 100% { transform: scaleY(0.15); }
                                    50% { transform: scaleY(1.0); }
                                }
                                .wave-bar-active {
                                    animation: soundWave 1s ease-in-out infinite;
                                    transform-origin: center;
                                }
                            `}</style>
                            {[...Array(19)].map((_, i) => {
                                const delay = (i * 0.05).toFixed(2);
                                const duration = (0.5 + Math.random() * 0.5).toFixed(2);
                                
                                return (
                                    <div
                                        key={i}
                                        className={`w-1 rounded-full transition-all duration-500 h-10 ${
                                            isRecording 
                                                ? 'bg-gradient-to-t from-red-400 to-red-600 scale-y-100 wave-bar-active' 
                                                : 'bg-slate-200 scale-y-[0.15]'
                                        }`}
                                        style={{
                                            animationDelay: isRecording ? `${delay}s` : undefined,
                                            animationDuration: isRecording ? `${duration}s` : undefined,
                                            transformOrigin: 'center'
                                        }}
                                    />
                                );
                            })}
                        </div>

                        {!awaitingConfirmation ? (
                            <button
                                onClick={handleToggleRecord}
                                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${isRecording
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-300 scale-110 animate-pulse'
                                    : 'bg-violet-600 hover:bg-violet-700 shadow-violet-300 hover:scale-105'}`}
                            >
                                {isRecording
                                    ? <Square className="w-8 h-8 text-white fill-white" />
                                    : <Mic className="w-8 h-8 text-white" />}
                            </button>
                        ) : null}

                        {(transcript || interimTranscript) && (
                            <div className="w-full bg-slate-50 rounded-2xl p-4 text-center border border-slate-200">
                                <p className="text-xs text-slate-500 font-semibold mb-1">Bạn đã nói:</p>
                                <p className="text-lg font-black text-slate-800">{transcript}<span className="text-slate-400">{interimTranscript}</span></p>
                            </div>
                        )}

                        {awaitingConfirmation ? (
                            <div className="grid w-full grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handleToggleRecord}
                                    className="h-12 rounded-xl font-bold"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" /> Đọc lại
                                </Button>
                                <Button
                                    onClick={handleAcceptAnswer}
                                    disabled={!(transcript || interimTranscript).trim()}
                                    className="h-12 rounded-xl bg-violet-600 font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" /> Chấp nhận đáp án
                                </Button>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Show answer + result */}
                {showAnswer && (
                    <div className="animate-in fade-in slide-in-from-bottom-3 duration-400 bg-white rounded-3xl border border-indigo-100 shadow-md p-6 space-y-4">
                        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">Đáp án chuẩn</p>
                            <p className="text-xl font-black text-indigo-900">{answer}</p>
                            <button
                                onClick={() => speak(answer.split('(')[0])}
                                className="mt-3 inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-sm font-bold"
                            >
                                <Volume2 className="w-4 h-4" /> Nghe lại mẫu
                            </button>
                        </div>

                        {userSaid && (
                            <div className={`p-4 rounded-2xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                {isCorrect
                                    ? <p className="font-black text-green-700 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Phát âm đúng! Xuất sắc 🎉</p>
                                    : <p className="font-bold text-amber-700 flex items-center gap-2">⚠️ Hãy luyện tập thêm và đối chiếu với mẫu</p>
                                }
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleRetryRecording} className="flex-1 rounded-xl font-bold h-12">
                                <RefreshCw className="w-4 h-4 mr-2" /> Thử lại
                            </Button>
                            <Button onClick={handleNext} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold h-12 shadow-lg shadow-violet-200">
                                {idx >= questions.length - 1 ? 'Hoàn thành' : 'Câu tiếp'} <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Main exported component ─────────────────────────────────────────────────
export function MathPracticeScreen({ questions, mathMode, onFinish, onBack }: MathPracticeScreenProps) {
    const filtered = useMemo(() => {
        return shuffleArr(questions).slice(0, 10) // max 10 per session
    }, [questions])

    const firstQ = filtered[0]
    const topicTag = firstQ?.suggested_answers?.find(s => s.startsWith('__topic__:'))
    const topicId = topicTag ? topicTag.replace('__topic__:', '') : 'all'

    const TOPIC_LABELS: Record<string, string> = {
        all: 'Ôn tập tổng hợp & Thi thử với AI',
        arithmetic: 'Phép tính cơ bản',
        length: 'Đơn vị Độ dài',
        weight: 'Đơn vị Khối lượng',
        time: 'Thời gian & Nhiệt độ'
    }
    const topicLabel = TOPIC_LABELS[topicId] || 'Toán học & Tính toán'

    const MODE_LABELS: Record<string, string> = {
        listen_card: 'Nghe & Nhớ (Flashcard)',
        number_quiz: 'Nghe & Chọn số',
        speak_answer: 'Luyện phát âm với AI'
    }
    const modeLabel = MODE_LABELS[mathMode] || 'Luyện tập'

    return (
        <div className="min-h-[500px] flex flex-col max-w-4xl mx-auto">
            {/* Header synced with Vocabulary section */}
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Button 
                        variant="ghost" 
                        onClick={onBack} 
                        className="h-9 w-9 p-0 text-slate-600 hover:bg-slate-100 flex-shrink-0 rounded-full flex items-center justify-center"
                        title="Quay lại"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="min-w-0">
                        <h2 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">
                            {modeLabel}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {filtered.length} câu hỏi hiển thị • {topicLabel}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content view matching the layout */}
            <div className="flex-1 overflow-auto py-6">
                {mathMode === 'listen_card' && <MathFlashcard questions={filtered} onFinish={(ids) => onFinish(ids, filtered.length)} />}
                {mathMode === 'number_quiz' && <MathNumberQuiz questions={filtered} onFinish={(ids) => onFinish(ids, filtered.length)} />}
                {mathMode === 'speak_answer' && <MathSpeakingPractice questions={filtered} onFinish={(ids) => onFinish(ids, filtered.length)} />}
            </div>
        </div>
    )
}
