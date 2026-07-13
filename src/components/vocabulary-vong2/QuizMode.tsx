'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, XCircle, Timer, Info, Volume2, AlertCircle, Zap, Bookmark, Calculator } from 'lucide-react'

interface VocabItem {
    id: string
    word_kr: string
    word_vi: string
    image_url?: string
    audio_url?: string
    description_vi?: string
    type?: string
}

function shuffleArray<T>(array: T[]): T[] {
    const a = [...array]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

type QuizVariant =
    | 'image_to_kr'      // See image → pick Korean word
    | 'kr_to_vi'         // See Korean word → pick Vietnamese meaning
    | 'vi_to_image'      // See Vietnamese name → pick correct image  
    | 'sign_meaning'     // See image → pick correct explanation (for SIGN with description_vi)

interface QuizQuestion {
    vocab: VocabItem
    variant: QuizVariant
    options: VocabItem[]
}

function buildQuestions(vocabList: VocabItem[]): QuizQuestion[] {
    const hasSignWithDesc = vocabList.some(v => v.type === 'SIGN' && v.description_vi)

    const questions: QuizQuestion[] = []
    const shuffled = shuffleArray(vocabList)

    for (const vocab of shuffled) {
        const others = vocabList.filter(v => v.id !== vocab.id)
        const pool = shuffleArray(others)

        if (vocab.type === 'MATH') {
            // For MATH type: display Korean question -> pick correct answer (description_vi)
            questions.push({
                vocab,
                variant: 'sign_meaning',
                options: shuffleArray([vocab, ...pool.slice(0, 3)])
            })
        } else {
            // Primary quiz: image → Korean word
            if (vocab.image_url) {
                questions.push({
                    vocab,
                    variant: 'image_to_kr',
                    options: shuffleArray([vocab, ...pool.slice(0, 3)])
                })
            }

            // Secondary quiz: Korean → Vietnamese
            questions.push({
                vocab,
                variant: 'kr_to_vi',
                options: shuffleArray([vocab, ...pool.slice(0, 3)])
            })

            // For SIGN with description: what does the sign mean?
            if (vocab.type === 'SIGN' && vocab.description_vi) {
                const othersWithDesc = vocabList.filter(v => v.type === 'SIGN' && v.description_vi && v.id !== vocab.id)
                if (othersWithDesc.length >= 3) {
                    questions.push({
                        vocab,
                        variant: 'sign_meaning',
                        options: shuffleArray([vocab, ...shuffleArray(othersWithDesc).slice(0, 3)])
                    })
                }
            }
        }
    }

    // Limit to reasonable number and shuffle
    return shuffleArray(questions).slice(0, Math.min(questions.length, vocabList.length * 2))
}

function playAudio(url?: string, wordKr?: string, onEnd?: () => void) {
    let played = false;
    const triggerEnd = () => {
        if (!played) {
            played = true;
            if (onEnd) onEnd();
        }
    }

    if ('speechSynthesis' in window && wordKr) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(wordKr)
        utterance.lang = 'ko-KR'
        utterance.rate = 0.8
        utterance.onend = () => {
            triggerEnd()
        }
        utterance.onerror = () => {
            triggerEnd()
        }
        window.speechSynthesis.speak(utterance)
        // Safety timeout of 4 seconds in case onend is not fired by the browser
        setTimeout(triggerEnd, 4000)
    } else if (url) {
        const audio = new Audio(url)
        audio.onended = () => {
            triggerEnd()
        }
        audio.onerror = () => {
            triggerEnd()
        }
        audio.play().catch(() => {
            triggerEnd()
        })
        // Safety timeout of 3 seconds
        setTimeout(triggerEnd, 3000)
    } else {
        triggerEnd()
    }
}

export default function QuizMode({ vocabList, onBack, hideHeader = false }: { vocabList: VocabItem[], onBack: () => void, hideHeader?: boolean }) {
    const [questions] = useState<QuizQuestion[]>(() => buildQuestions(vocabList))
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [timeLeft, setTimeLeft] = useState(12)
    const [score, setScore] = useState(0)
    const [streak, setStreak] = useState(0)
    const [maxStreak, setMaxStreak] = useState(0)
    const [isFinished, setIsFinished] = useState(false)
    const [wrongAnswers, setWrongAnswers] = useState<VocabItem[]>([])
    const [savedNotebook, setSavedNotebook] = useState(false)

    const saveToNotebook = () => {
        try {
            const stored = localStorage.getItem('saved_review_words')
            const parsed = stored ? JSON.parse(stored) : []
            
            // Deduplicate wrong answers
            const uniqueWrong = []
            const seenIds = new Set(parsed.map((item: any) => item.id))
            
            for (const item of wrongAnswers) {
                if (!seenIds.has(item.id)) {
                    seenIds.add(item.id)
                    uniqueWrong.push(item)
                }
            }
            
            const updated = [...parsed, ...uniqueWrong]
            localStorage.setItem('saved_review_words', JSON.stringify(updated))
            setSavedNotebook(true)
        } catch (e) {
            console.error(e)
        }
    }

    const current = questions[currentIndex]
    const isAnswered = selectedId !== null

    // Reset timer on new question
    useEffect(() => {
        setTimeLeft(12)
        setSelectedId(null)
    }, [currentIndex])

    // Countdown timer
    useEffect(() => {
        if (isAnswered || isFinished || !current) return
        if (timeLeft <= 0) {
            handleSelect('__timeout__')
            return
        }
        const t = setInterval(() => setTimeLeft(p => p - 1), 1000)
        return () => clearInterval(t)
    }, [timeLeft, isAnswered, isFinished, current])

    const handleSelect = useCallback((selectedVocabId: string) => {
        if (isAnswered) return
        setSelectedId(selectedVocabId)

        const isCorrect = selectedVocabId === current.vocab.id

        const goNext = () => {
            if (currentIndex + 1 >= questions.length) {
                setIsFinished(true)
            } else {
                setCurrentIndex(i => i + 1)
            }
        }

        if (isCorrect) {
            setScore(s => s + 1)
            setStreak(s => {
                const next = s + 1
                setMaxStreak(m => Math.max(m, next))
                return next
            })
            // Play audio, and only move to next question after it finishes speaking (plus a 600ms gap)
            playAudio(current.vocab.audio_url, current.vocab.word_kr, () => {
                setTimeout(goNext, 600)
            })
        } else {
            setStreak(0)
            if (selectedVocabId !== '__timeout__') {
                setWrongAnswers(p => [...p, current.vocab])
            }
            // For incorrect answers, wait 1.8 seconds so user can see correct answer highlighted
            setTimeout(goNext, 1800)
        }
    }, [isAnswered, current, currentIndex, questions.length])

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (isAnswered) return
            const numKey = parseInt(e.key)
            if (numKey >= 1 && numKey <= 4 && current) {
                const opt = current.options[numKey - 1]
                if (opt) handleSelect(opt.id)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isAnswered, current, handleSelect])

    if (isFinished) {
        const pct = Math.round((score / questions.length) * 100)
        return (
            <div className="min-h-[500px] flex items-center justify-center p-6">
                <div className="max-w-md w-full space-y-6 text-center">
                    <div className="relative mx-auto w-28 h-28">
                        <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-40" />
                        <div className="relative w-full h-full bg-gradient-to-br from-indigo-100 to-purple-50 rounded-full flex items-center justify-center shadow-inner border-4 border-white">
                            <Zap className="w-12 h-12 text-indigo-600" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-800">Kết quả</h2>
                        <p className="text-6xl font-black mt-2" style={{
                            background: pct >= 80 ? 'linear-gradient(135deg,#10b981,#059669)' :
                                pct >= 50 ? 'linear-gradient(135deg,#f59e0b,#d97706)' :
                                    'linear-gradient(135deg,#ef4444,#dc2626)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>{pct}%</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
                            <p className="text-2xl font-black text-emerald-600">{score}</p>
                            <p className="text-xs text-slate-500 font-medium">Đúng</p>
                        </div>
                        <div className="bg-red-50 rounded-2xl p-3 border border-red-100">
                            <p className="text-2xl font-black text-red-500">{questions.length - score}</p>
                            <p className="text-xs text-slate-500 font-medium">Sai</p>
                        </div>
                        <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
                            <p className="text-2xl font-black text-amber-600">🔥{maxStreak}</p>
                            <p className="text-xs text-slate-500 font-medium">Chuỗi dài</p>
                        </div>
                    </div>
                    {wrongAnswers.length > 0 && (
                        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100 text-left space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-extrabold text-rose-800">Từ cần ôn lại:</p>
                                <button
                                    onClick={saveToNotebook}
                                    disabled={savedNotebook}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-sm ${
                                        savedNotebook
                                            ? 'bg-emerald-600 text-white cursor-default'
                                            : 'bg-indigo-600 hover:bg-indigo-750 text-white'
                                    }`}
                                >
                                    {savedNotebook ? (
                                        <>
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            <span>Đã lưu vào sổ tay</span>
                                        </>
                                    ) : (
                                        <>
                                            <Bookmark className="w-3.5 h-3.5" />
                                            <span>Lưu vào sổ tay ôn tập</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(new Map(wrongAnswers.map(w => [w.id, w])).values()).map(w => (
                                    <span 
                                        key={w.id} 
                                        onClick={() => playAudio(w.audio_url, w.word_kr)}
                                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 cursor-pointer rounded-xl text-xs font-bold text-rose-750 border border-rose-100 shadow-sm transition-all duration-250 active:scale-95 flex items-center gap-1.5 select-none"
                                        title="Bấm để phát âm"
                                    >
                                        <span>{w.word_kr}</span>
                                        <span className="text-[10px] text-slate-400 font-normal">({w.word_vi})</span>
                                        <Volume2 className="w-3.5 h-3.5 text-rose-450" />
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col gap-3">
                        <Button variant="outline" onClick={onBack} className="h-12 rounded-xl font-semibold">
                            Chọn chế độ khác
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (!current) return null

    const timePercent = (timeLeft / 12) * 100
    const timeColor = timeLeft <= 3 ? 'bg-red-500' : timeLeft <= 6 ? 'bg-amber-500' : 'bg-indigo-500'

    const variantLabel: Record<QuizVariant, string> = {
        image_to_kr: '🖼️ Chọn đúng từ tiếng Hàn',
        kr_to_vi: '🇰🇷 Chọn đúng nghĩa tiếng Việt',
        vi_to_image: '🇻🇳 Chọn đúng hình ảnh',
        sign_meaning: '⚠️ Biển báo này có nghĩa là gì?'
    }

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                {!hideHeader ? (
                    <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-600 -ml-2">
                        <ArrowLeft className="w-4 h-4" /> Quay lại
                    </Button>
                ) : (
                    <div />
                )}
                <div className="flex items-center gap-3">
                    {streak >= 3 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-sm font-bold border border-amber-200 animate-pulse">
                            🔥 {streak} chuỗi
                        </div>
                    )}
                    <div className="text-sm font-bold">
                        <span className="text-emerald-600">{score}</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="text-slate-500">{questions.length}</span>
                    </div>
                </div>
            </div>

            {/* Timer bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ${timeColor}`}
                    style={{ width: `${timePercent}%` }}
                />
            </div>

            {/* Question progress */}
            <p className="text-xs text-center text-slate-400 font-medium">
                Câu {currentIndex + 1} / {questions.length}
            </p>

            {/* Question card */}
            <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-lg overflow-hidden">
                {/* Variant label */}
                <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100">
                    <p className="text-sm font-bold text-indigo-700">
                        {current.vocab.type === 'MATH' ? 'Giải toán tiếng Hàn' : variantLabel[current.variant]}
                    </p>
                </div>

                {/* Stimulus */}
                <div className="p-5 flex justify-center items-center bg-slate-50/50 min-h-[160px]">
                    {current.variant === 'image_to_kr' && current.vocab.image_url && (
                        <img src={current.vocab.image_url} alt="?" className="max-h-40 object-contain rounded-xl drop-shadow" />
                    )}
                    {current.variant === 'kr_to_vi' && (
                        <div className="text-center space-y-2 w-full px-4 flex flex-col items-center justify-center">
                            <div className="bg-indigo-50/50 px-7 py-4.5 rounded-2xl border border-indigo-100/80 shadow-sm inline-block max-w-full">
                                <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-indigo-850 to-purple-700 tracking-wide leading-normal">
                                    {current.vocab.word_kr}
                                </h2>
                            </div>
                            {current.vocab.image_url && current.vocab.type !== 'SIGN' && (
                                <img src={current.vocab.image_url} alt="" className="max-h-24 object-contain rounded-xl opacity-30 mx-auto mt-2" />
                            )}
                        </div>
                    )}
                    {current.variant === 'sign_meaning' && (
                        <div className="text-center space-y-3 w-full px-4 flex flex-col items-center justify-center">
                            {current.vocab.type === 'MATH' ? (
                                <div className="w-18 h-18 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto ring-4 ring-sky-50 shadow-sm transition-transform duration-300 hover:scale-105">
                                    <Calculator className="w-9 h-9" />
                                </div>
                            ) : current.vocab.image_url ? (
                                <img src={current.vocab.image_url} alt="?" className="max-h-36 object-contain rounded-xl drop-shadow mx-auto" />
                            ) : (
                                <div className="w-24 h-24 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                                    <AlertCircle className="w-12 h-12 text-amber-500" />
                                </div>
                            )}
                            <div className="bg-slate-100/60 px-4.5 py-2.5 rounded-2xl border border-slate-200/40 shadow-sm inline-block">
                                <p className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700 leading-normal">{current.vocab.word_kr}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Options */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {current.options.map((opt, i) => {
                        const isCorrectOpt = opt.id === current.vocab.id
                        const isSelectedOpt = selectedId === opt.id
                        const isTimeout = selectedId === '__timeout__'

                        let cls = 'relative min-h-[56px] rounded-2xl border-2 text-sm font-bold transition-all duration-200 px-4 py-3 text-left flex items-center gap-3 '

                        if (!isAnswered) {
                            cls += 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm cursor-pointer active:scale-95'
                        } else if (isCorrectOpt) {
                            cls += 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm'
                        } else if (isSelectedOpt && !isCorrectOpt) {
                            cls += 'border-red-400 bg-red-50 text-red-800'
                        } else {
                            cls += 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'
                        }

                        const label = String(i + 1)

                        // Display text per variant
                        let displayText = ''
                        let displayImg: string | undefined = undefined
                        if (current.variant === 'image_to_kr') {
                            displayText = opt.word_kr
                        } else if (current.variant === 'kr_to_vi') {
                            displayText = opt.word_vi
                        } else if (current.variant === 'sign_meaning') {
                            displayText = opt.description_vi || opt.word_vi
                        }

                        return (
                            <button
                                key={opt.id}
                                className={cls}
                                onClick={() => !isAnswered && handleSelect(opt.id)}
                                disabled={isAnswered}
                            >
                                <span className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-black flex items-center justify-center ${
                                    !isAnswered ? 'bg-slate-100 text-slate-500' :
                                    isCorrectOpt ? 'bg-emerald-400 text-white' :
                                    isSelectedOpt ? 'bg-red-400 text-white' :
                                    'bg-slate-100 text-slate-400'
                                }`}>{label}</span>
                                <span className="flex-1 leading-snug">{displayText}</span>
                                {isAnswered && isCorrectOpt && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                                {isAnswered && isSelectedOpt && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                            </button>
                        )
                    })}
                </div>

                {/* After-answer: show full info */}
                {isAnswered && (
                    <div className={`px-5 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`rounded-2xl p-4 flex items-start gap-3 ${
                            selectedId === current.vocab.id ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                        }`}>
                            {selectedId === current.vocab.id
                                ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            }
                            <div className="flex-1 min-w-0 space-y-1">
                                <p className="font-black text-slate-800 text-lg">{current.vocab.word_kr}</p>
                                <p className="text-slate-600 font-semibold">{current.vocab.word_vi}</p>
                                {current.vocab.description_vi && (
                                    <p className="text-sm text-slate-500 flex items-start gap-1.5">
                                        <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        {current.vocab.description_vi}
                                    </p>
                                )}
                                {selectedId === '__timeout__' && (
                                    <p className="text-xs text-red-500 font-bold">⏱ Hết giờ!</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-xs text-slate-400">
                Phím <kbd className="bg-slate-100 px-1 rounded">1</kbd>–<kbd className="bg-slate-100 px-1 rounded">4</kbd> để chọn đáp án
            </p>
        </div>
    )
}
