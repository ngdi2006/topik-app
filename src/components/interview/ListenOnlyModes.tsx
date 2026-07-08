'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, CheckCircle, XCircle } from 'lucide-react'

// --- Types ---
export interface ListenModeProps {
    currentQ: any
    onKnown: () => void
    onNotKnown: () => void
    timeLeft?: number | null
    questions?: any[]
    isAutoPlay?: boolean
}

// --- 1. Flashcard Mode ---
export function FlashcardMode({ currentQ, onKnown, onNotKnown, timeLeft = 0, isAutoPlay = false, questions }: ListenModeProps) {
    const [isFlipped, setIsFlipped] = useState(false)
    const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Reset when question changes
    useEffect(() => {
        setIsFlipped(false)
        if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current)
    }, [currentQ])
    
    // Auto flip when timer reaches 0
    useEffect(() => {
        if (timeLeft !== null && timeLeft !== undefined && timeLeft <= 0) {
            setIsFlipped(true)
            
            // If autoplay is enabled, auto advance after 4 seconds (but not on the very last question)
            const currentIndex = questions?.findIndex(x => x.id === currentQ.id) ?? -1
            const isLastQuestion = questions && currentIndex !== -1 && currentIndex === questions.length - 1

            if (isAutoPlay && !isLastQuestion) {
                if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current)
                autoPlayTimerRef.current = setTimeout(() => {
                    onKnown()
                }, 4000)
            }
        }
    }, [timeLeft, isAutoPlay, onKnown, currentQ, questions])

    useEffect(() => {
        return () => {
            if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current)
        }
    }, [])

    if (isAutoPlay && questions) {
        return (
            <div className="space-y-4 text-left max-h-[60vh] overflow-y-auto p-2 scroll-smooth">
                {questions
                    .map((q, index) => ({ q, index }))
                    .filter(({ index }) => {
                        const currentIndexInList = questions.findIndex(x => x.id === currentQ.id)
                        return currentIndexInList >= index
                    })
                    .reverse()
                    .map(({ q, index }) => {
                        const isCurrent = q.id === currentQ.id
                        const showText = !isCurrent || isFlipped

                        return (
                            <div 
                                key={q.id} 
                                ref={isCurrent ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) : null}
                                className={`p-3 md:p-4 rounded-xl border transition-all duration-500 ${isCurrent ? 'bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-200 ring-opacity-50' : 'bg-gray-50 border-gray-100 opacity-70'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold shadow-sm mt-0.5 ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                        {index + 1}
                                    </span>
                                    <div className="flex-1">
                                        {isCurrent && !isFlipped && (
                                            <div className="text-indigo-600 text-xs font-semibold animate-pulse flex items-center gap-1.5 mb-2">
                                                <span className="flex gap-0.5">
                                                    <span className="w-1 h-1 rounded-full bg-indigo-600"></span>
                                                    <span className="w-1 h-1 rounded-full bg-indigo-600 animation-delay-200"></span>
                                                    <span className="w-1 h-1 rounded-full bg-indigo-600 animation-delay-400"></span>
                                                </span>
                                                Đang đọc...
                                            </div>
                                        )}
                                        {showText ? (
                                            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <p className="text-base font-semibold text-gray-900">{q.question_text}</p>
                                                {q.vietnamese_meaning && <p className="text-gray-500 text-sm">{q.vietnamese_meaning}</p>}
                                            </div>
                                        ) : (
                                            <div className="space-y-2 py-1">
                                                <div className="h-4 bg-indigo-200/40 rounded w-3/4 animate-pulse"></div>
                                                <div className="h-4 bg-indigo-200/40 rounded w-1/2 animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
            </div>
        )
    }

    return (
        <div className="space-y-6 perspective-1000">
            <div 
                className={`relative w-full transition-transform duration-700 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                onClick={() => { if (!isFlipped && timeLeft !== null && timeLeft <= 0) setIsFlipped(true) }}
                style={{ minHeight: '280px' }}
            >
                {/* Front (Question hint / Hidden state) */}
                <div className="absolute inset-0 backface-hidden bg-white p-6 md:p-8 rounded-2xl border-2 border-dashed border-gray-300 shadow-sm flex flex-col items-center justify-center text-center hover:border-blue-300 transition-colors">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl">{timeLeft === null ? '🎧' : '⏳'}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700">{timeLeft === null ? 'Đang nghe câu hỏi...' : 'Đang suy nghĩ...'}</h3>
                    <p className="text-gray-500 mt-2">{timeLeft === null ? 'Vui lòng tập trung lắng nghe giám khảo.' : 'Thẻ sẽ tự động lật khi hết thời gian đếm ngược.'}</p>
                </div>

                {/* Back (Answer state) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-blue-50/90 p-4 md:p-5 rounded-2xl border border-blue-200 shadow-lg backdrop-blur-sm flex flex-col justify-center text-left">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Nội dung câu hỏi
                    </h4>
                    <p className="text-lg font-bold text-gray-900 mb-3">{currentQ.question_text}</p>
                    
                    {currentQ.vietnamese_meaning && (
                        <div className="mt-1 pt-3 border-t border-blue-200/50">
                            <h4 className="font-semibold text-gray-700 mb-1 text-xs uppercase tracking-wider opacity-80">Nghĩa Tiếng Việt</h4>
                            <p className="text-base text-gray-800 font-medium">{currentQ.vietnamese_meaning}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className={`flex flex-col sm:flex-row gap-2.5 md:gap-3 transition-all duration-700 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <Button 
                    variant="outline" 
                    className="flex-1 h-11 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-xl font-semibold text-sm transition-all hover:shadow-sm hover:-translate-y-0.5" 
                    onClick={onNotKnown}
                >
                    <XCircle className="w-4 h-4 mr-1.5" /> [Chưa thuộc] Lặp lại sau
                </Button>
                <Button 
                    className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-all hover:shadow-md shadow-green-200 hover:-translate-y-0.5" 
                    onClick={onKnown}
                >
                    <CheckCircle className="w-4 h-4 mr-1.5" /> [Đã thuộc] Hoàn thành
                </Button>
            </div>
        </div>
    )
}

// --- 2. Fill Blank Mode ---
export function MeaningQuizMode({ currentQ, onKnown, onNotKnown, timeLeft = 0, questions = [] }: ListenModeProps) {
    const [options, setOptions] = useState<string[]>([])
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

    useEffect(() => {
        const correct = currentQ.vietnamese_meaning || "Không có dữ liệu nghĩa"
        let wrongOptions = questions
            .filter(q => q.id !== currentQ.id && q.vietnamese_meaning)
            .map(q => q.vietnamese_meaning)
            .filter((v, i, a) => a.indexOf(v) === i) // unique
        
        // Shuffle wrong options and pick up to 3
        wrongOptions = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 3)
        
        // If not enough wrong options from questions, add fallbacks
        const fallbacks = [
            "Mời bạn ngồi xuống", 
            "Hãy nhìn vào camera", 
            "Bắt đầu làm bài thi", 
            "Vui lòng đọc to rõ ràng",
            "Xin mời trả lời câu hỏi"
        ]
        while (wrongOptions.length < 3) {
            const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)]
            if (!wrongOptions.includes(fb) && fb !== correct) {
                wrongOptions.push(fb)
            }
        }

        const allOptions = [correct, ...wrongOptions].sort(() => 0.5 - Math.random())
        setOptions(allOptions)
        setSelectedAnswer(null)
        setIsCorrect(null)
    }, [currentQ, questions])

    const handleSelect = (opt: string) => {
        if (selectedAnswer !== null) return // Already answered
        setSelectedAnswer(opt)
        const correct = opt === (currentQ.vietnamese_meaning || "Không có dữ liệu nghĩa")
        setIsCorrect(correct)
    }

    const correctMeaning = currentQ.vietnamese_meaning || "Không có dữ liệu nghĩa"

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm text-center relative overflow-hidden">
                <p className="text-gray-500 font-medium mb-6">Chọn nghĩa Tiếng Việt chính xác nhất với câu vừa nghe</p>
                
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {options.map((opt, idx) => {
                        let btnStyle = "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:shadow-md"
                        
                        if (selectedAnswer !== null) {
                            if (opt === correctMeaning) {
                                btnStyle = "bg-green-50 border-green-500 text-green-700 shadow-sm font-bold z-10 scale-105"
                            } else if (opt === selectedAnswer) {
                                btnStyle = "bg-red-50 border-red-500 text-red-700 shadow-sm"
                            } else {
                                btnStyle = "bg-gray-50 border-gray-200 text-gray-400 opacity-50"
                            }
                        }

                        return (
                            <Button
                                key={idx}
                                variant="outline"
                                className={`h-auto min-h-[70px] p-4 text-left justify-start text-base whitespace-normal transition-all duration-300 ${btnStyle}`}
                                onClick={() => handleSelect(opt)}
                                disabled={selectedAnswer !== null || timeLeft > 0}
                            >
                                {opt}
                            </Button>
                        )
                    })}
                </div>
                
                {timeLeft > 0 && selectedAnswer === null && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100">
                        <div className="h-full bg-blue-500 animate-pulse" style={{ width: '100%' }}></div>
                    </div>
                )}
            </div>

            {selectedAnswer !== null && (
                <div className="flex flex-col items-center animate-in zoom-in-95 fade-in duration-300 pt-2">
                    {isCorrect ? (
                        <>
                            <div className="text-green-600 font-bold text-xl mb-4 flex items-center gap-2 bg-green-50 px-6 py-2 rounded-full border border-green-200">
                                <CheckCircle className="w-6 h-6" /> Tốt lắm! Trả lời chính xác.
                            </div>
                            <Button onClick={onKnown} className="bg-green-600 hover:bg-green-700 px-8 rounded-xl h-14 text-base font-bold shadow-lg shadow-green-200 transition-all hover:-translate-y-1">
                                Tiếp tục học <CheckCircle className="w-5 h-5 ml-2" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="text-red-500 font-bold text-lg md:text-xl mb-4 flex items-center gap-2 bg-red-50 px-6 py-3 rounded-2xl border border-red-200 text-center flex-col sm:flex-row">
                                <div className="flex items-center gap-2"><XCircle className="w-6 h-6" /> Sai rồi!</div>
                                <span className="text-gray-700 font-medium text-base">Nghĩa đúng: <span className="font-bold text-green-700">{correctMeaning}</span></span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
                                <Button onClick={onNotKnown} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 px-8 rounded-xl h-14 text-base font-bold">
                                    <XCircle className="w-5 h-5 mr-2" /> [Chưa thuộc] Lặp lại sau
                                </Button>
                                <Button onClick={onKnown} className="bg-gray-800 hover:bg-gray-900 text-white px-8 rounded-xl h-14 text-base font-bold shadow-lg transition-all">
                                    [Đã thuộc] Bỏ qua <CheckCircle className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// --- 3. Word Sort Mode ---
export function WordSortMode({ currentQ, onKnown }: ListenModeProps) {
    const targetText = useMemo(() => {
        const text = currentQ.suggested_answers?.[0] || currentQ.question_text || ""
        return text.trim()
    }, [currentQ])

    const [words, setWords] = useState<{ id: string, word: string }[]>([])
    const [selectedWords, setSelectedWords] = useState<{ id: string, word: string }[]>([])

    useEffect(() => {
        if (!targetText) return
        const tokens: string[] = targetText.split(/\s+/).filter(Boolean) as string[]
        const initialWords = tokens.map((w: string, i: number) => ({ id: `w_${i}`, word: w }))
        setWords([...initialWords].sort(() => 0.5 - Math.random()))
        setSelectedWords([])
    }, [targetText])

    const handleSelect = (word: typeof words[0]) => {
        setWords(prev => prev.filter(w => w.id !== word.id))
        setSelectedWords(prev => [...prev, word])
    }

    const handleDeselect = (word: typeof words[0]) => {
        setSelectedWords(prev => prev.filter(w => w.id !== word.id))
        setWords(prev => [...prev, word])
    }

    if (!targetText) {
        return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">Câu hỏi này không có câu trả lời mẫu để luyện tập.</div>
    }

    const isComplete = words.length === 0
    const currentSentence = selectedWords.map(w => w.word).join(' ')
    const targetClean = targetText.replace(/\s+/g, ' ')
    const isCorrect = isComplete && currentSentence === targetClean

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            {/* Answer Area */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-dashed border-gray-300 shadow-sm flex flex-wrap content-start gap-3 min-h-[140px] transition-colors hover:border-blue-300">
                {selectedWords.map((w, i) => (
                    <Button
                        key={w.id}
                        variant="secondary"
                        onClick={() => handleDeselect(w)}
                        className={`text-base md:text-lg h-12 md:h-14 px-5 rounded-2xl shadow-sm hover:scale-95 transition-all animate-in zoom-in-90 font-medium
                            ${isComplete ? (isCorrect ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200') : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
                    >
                        {w.word}
                    </Button>
                ))}
                {selectedWords.length === 0 && (
                    <div className="text-gray-400 m-auto flex items-center gap-2 text-sm md:text-base">
                        Bấm vào các từ bên dưới để ghép thành câu
                    </div>
                )}
            </div>

            {/* Word Pool */}
            <div className="bg-gray-50/70 p-6 md:p-8 rounded-[2rem] border border-gray-100">
                <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                    {words.map((w, i) => (
                        <Button
                            key={w.id}
                            variant="outline"
                            onClick={() => handleSelect(w)}
                            className="text-base md:text-lg h-12 md:h-14 px-5 md:px-6 rounded-2xl border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:-translate-y-1 hover:shadow-md transition-all bg-white font-medium"
                        >
                            {w.word}
                        </Button>
                    ))}
                </div>
            </div>

            {isComplete && (
                <div className="flex flex-col items-center animate-in zoom-in-95 fade-in duration-300 pt-2">
                    {isCorrect ? (
                        <>
                            <div className="text-green-600 font-bold text-lg mb-3 flex items-center gap-2">
                                <CheckCircle className="w-6 h-6" /> Ghép câu chính xác!
                            </div>
                            {currentQ.vietnamese_meaning && (
                                <div className="text-gray-700 bg-gray-50 px-6 py-3 rounded-xl border border-gray-200 mb-5 font-medium text-center max-w-md w-full shadow-sm">
                                    <span className="text-xs uppercase text-gray-500 font-bold block mb-1 tracking-wide">Nghĩa Tiếng Việt</span>
                                    {currentQ.vietnamese_meaning}
                                </div>
                            )}
                            <Button onClick={onKnown} className="bg-green-600 hover:bg-green-700 px-8 rounded-xl h-14 text-base shadow-lg shadow-green-200 transition-all hover:scale-105">
                                Tiếp tục học <CheckCircle className="w-5 h-5 ml-2" />
                            </Button>
                        </>
                    ) : (
                        <div className="text-red-500 font-medium text-base md:text-lg mb-4 flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg">
                            <XCircle className="w-5 h-5" /> Câu chưa chính xác. Bấm vào các từ trên để sửa lại.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
