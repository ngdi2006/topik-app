'use client'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, CheckCircle, XCircle } from 'lucide-react'

// --- Types ---
export interface ListenModeProps {
    currentQ: any
    onKnown: () => void
    onNotKnown: () => void
    timeLeft?: number
}

// --- 1. Flashcard Mode ---
export function FlashcardMode({ currentQ, onKnown, onNotKnown, timeLeft = 0 }: ListenModeProps) {
    const [showAnswer, setShowAnswer] = useState(false)

    // Reset when question changes
    useEffect(() => setShowAnswer(false), [currentQ])

    return (
        <div className="space-y-4">
            {!showAnswer ? (
                <Button 
                    size="lg" 
                    className="w-full text-lg h-14 rounded-xl shadow-sm transition-transform hover:scale-[1.02]"
                    onClick={() => setShowAnswer(true)}
                    disabled={timeLeft > 0}
                >
                    <Eye className="w-5 h-5 mr-2" />
                    Xem nội dung & đáp án
                </Button>
            ) : (
                <div className="text-left space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-blue-50/80 p-5 md:p-6 rounded-2xl border border-blue-100 shadow-sm backdrop-blur-sm">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Lời thoại giám khảo:
                        </h4>
                        <p className="text-lg font-medium text-gray-900">{currentQ.question_text}</p>
                        {currentQ.vietnamese_meaning && (
                            <p className="text-gray-600 mt-3 text-sm md:text-base border-t border-blue-100/50 pt-3">{currentQ.vietnamese_meaning}</p>
                        )}
                    </div>
                    {currentQ.suggested_answers && currentQ.suggested_answers.length > 0 && (
                        <div className="bg-emerald-50/80 p-5 md:p-6 rounded-2xl border border-emerald-100 shadow-sm backdrop-blur-sm">
                            <h4 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Gợi ý trả lời:
                            </h4>
                            <ul className="list-disc pl-5 space-y-2">
                                {currentQ.suggested_answers.map((ans: string, i: number) => (
                                    <li key={i} className="text-gray-800">{ans}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-6 pt-4">
                        <Button 
                            variant="outline" 
                            className="flex-1 h-12 md:h-14 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-xl font-medium text-base transition-all hover:shadow-md" 
                            onClick={onNotKnown}
                        >
                            <XCircle className="w-5 h-5 mr-2" /> Chưa thuộc (Lặp lại sau)
                        </Button>
                        <Button 
                            className="flex-1 h-12 md:h-14 bg-green-600 hover:bg-green-700 rounded-xl font-medium text-base transition-all hover:shadow-md shadow-green-200" 
                            onClick={onKnown}
                        >
                            <CheckCircle className="w-5 h-5 mr-2" /> Đã thuộc (Bỏ qua)
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- 2. Fill Blank Mode ---
export function FillBlankMode({ currentQ, onKnown }: ListenModeProps) {
    const targetText = useMemo(() => {
        return (currentQ.suggested_answers?.[0] || "").trim()
    }, [currentQ])

    const [words, setWords] = useState<{ id: string, word: string, isBlank: boolean, isWord: boolean }[]>([])
    const [suggestions, setSuggestions] = useState<{ id: string, word: string, used: boolean }[]>([])
    const [filledAnswers, setFilledAnswers] = useState<Record<string, { sugId: string, word: string }>>({})
    
    useEffect(() => {
        if (!targetText) return
        const tokens = targetText.split(/(\s+)/)
        
        let wordCount = 0
        const parsedWords: {id: string, word: string, isWord: boolean}[] = tokens.map((token: string, i: number) => {
            const isWord = token.trim().length > 0 && !/^[\.,!?;:]+$/.test(token.trim())
            if (isWord) wordCount++
            return {
                id: `w_${i}`,
                word: token,
                isWord
            }
        })

        const wordsOnly = parsedWords.filter((w: any) => w.isWord)
        const numBlanks = Math.max(1, Math.floor(wordsOnly.length * 0.4)) // 40% blanks
        const blankIndices = new Set<string>()
        
        const shuffled = [...wordsOnly].sort(() => 0.5 - Math.random())
        shuffled.slice(0, numBlanks).forEach(w => blankIndices.add(w.id))

        const finalWords = parsedWords.map(w => ({
            ...w,
            isBlank: blankIndices.has(w.id)
        }))

        setWords(finalWords)
        setFilledAnswers({})

        const blanks = finalWords.filter(w => w.isBlank).map(w => w.word)
        const finalSuggestions = [...blanks].sort(() => 0.5 - Math.random()).map((word, i) => ({
            id: `sug_${i}`,
            word,
            used: false
        }))
        setSuggestions(finalSuggestions)
    }, [targetText])

    const handleSuggestionClick = (sug: typeof suggestions[0]) => {
        if (sug.used) return
        const firstEmptyBlank = words.find(w => w.isBlank && !filledAnswers[w.id])
        if (!firstEmptyBlank) return

        setFilledAnswers(prev => ({
            ...prev,
            [firstEmptyBlank.id]: { sugId: sug.id, word: sug.word }
        }))
        setSuggestions(prev => prev.map(s => s.id === sug.id ? { ...s, used: true } : s))
    }

    const handleBlankClick = (wordId: string) => {
        const filled = filledAnswers[wordId]
        if (!filled) return

        setSuggestions(prev => prev.map(s => s.id === filled.sugId ? { ...s, used: false } : s))
        setFilledAnswers(prev => {
            const next = { ...prev }
            delete next[wordId]
            return next
        })
    }

    if (!targetText) {
        return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">Câu hỏi này không có câu trả lời mẫu để luyện tập.</div>
    }

    const isComplete = words.filter(w => w.isBlank).every(w => filledAnswers[w.id])
    const isCorrect = isComplete && words.filter(w => w.isBlank).every(w => filledAnswers[w.id]?.word === w.word)

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm text-lg md:text-xl leading-relaxed flex flex-wrap items-center">
                {words.map((w) => {
                    if (!w.isWord) return <span key={w.id} className="whitespace-pre">{w.word}</span>
                    if (!w.isBlank) return <span key={w.id} className="font-medium text-gray-700">{w.word}</span>
                    
                    const filled = filledAnswers[w.id]
                    return (
                        <div 
                            key={w.id}
                            onClick={() => handleBlankClick(w.id)}
                            className={`inline-flex items-center justify-center min-w-[70px] h-10 md:h-12 px-3 mx-1 rounded-xl cursor-pointer transition-all border-b-2 font-medium shadow-sm
                                ${filled 
                                    ? (isComplete ? (filled.word === w.word ? 'bg-green-50 border-green-500 text-green-700 shadow-green-100' : 'bg-red-50 border-red-500 text-red-700 shadow-red-100') : 'bg-blue-50 border-blue-400 text-blue-700 shadow-blue-100')
                                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-gray-400'}`}
                        >
                            {filled ? filled.word : ''}
                        </div>
                    )
                })}
            </div>

            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <p className="text-sm text-gray-500 font-medium mb-4 text-center">Chọn từ thích hợp điền vào chỗ trống</p>
                <div className="flex flex-wrap justify-center gap-3">
                    {suggestions.map(sug => (
                        <Button
                            key={sug.id}
                            variant={sug.used ? "ghost" : "outline"}
                            className={`text-base h-12 px-6 rounded-xl transition-all ${sug.used ? 'opacity-30 cursor-not-allowed scale-95' : 'hover:-translate-y-1 hover:shadow-md bg-white border-gray-300 text-gray-700 hover:text-blue-600 hover:border-blue-300'}`}
                            onClick={() => handleSuggestionClick(sug)}
                            disabled={sug.used}
                        >
                            {sug.word}
                        </Button>
                    ))}
                </div>
            </div>

            {isComplete && isCorrect && (
                <div className="flex flex-col items-center animate-in zoom-in-95 fade-in duration-300 pt-2">
                    <div className="text-green-600 font-bold text-lg mb-4 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6" /> Chính xác! Bạn đã hoàn thành câu trả lời.
                    </div>
                    <Button onClick={onKnown} className="bg-green-600 hover:bg-green-700 px-8 rounded-xl h-14 text-base shadow-lg shadow-green-200 transition-all hover:scale-105">
                        Tiếp tục học <CheckCircle className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            )}
        </div>
    )
}

// --- 3. Word Sort Mode ---
export function WordSortMode({ currentQ, onKnown }: ListenModeProps) {
    const targetText = useMemo(() => {
        return (currentQ.suggested_answers?.[0] || "").trim()
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
            <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-300 shadow-sm flex flex-wrap content-start gap-2.5 min-h-[120px] transition-colors hover:border-blue-200">
                {selectedWords.map((w, i) => (
                    <Button
                        key={w.id}
                        variant="secondary"
                        onClick={() => handleDeselect(w)}
                        className={`text-base h-11 px-4 rounded-xl shadow-sm hover:scale-95 transition-all animate-in zoom-in-90
                            ${isComplete ? (isCorrect ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200') : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
                    >
                        {w.word}
                    </Button>
                ))}
                {selectedWords.length === 0 && (
                    <div className="text-gray-400 m-auto flex items-center gap-2">
                        Bấm vào các từ bên dưới để ghép thành câu
                    </div>
                )}
            </div>

            {/* Word Pool */}
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <div className="flex flex-wrap justify-center gap-3">
                    {words.map((w, i) => (
                        <Button
                            key={w.id}
                            variant="outline"
                            onClick={() => handleSelect(w)}
                            className="text-base h-12 px-5 rounded-xl border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:-translate-y-1 hover:shadow-md transition-all bg-white"
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
                            <div className="text-green-600 font-bold text-lg mb-4 flex items-center gap-2">
                                <CheckCircle className="w-6 h-6" /> Ghép câu chính xác!
                            </div>
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
