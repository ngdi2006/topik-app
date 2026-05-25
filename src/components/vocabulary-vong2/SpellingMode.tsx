import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react'

// Utilities for Hangul
// For simplicity in spelling mode, we might just scramble the characters of the string directly.
// A more advanced version would decompose Hangul into Jamo, but character-level scramble is safer to start.

function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array]
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]]
    }
    return newArr
}

export default function SpellingMode({ vocabList, onBack }: { vocabList: any[], onBack: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [scrambled, setScrambled] = useState<string[]>([])
    const [selected, setSelected] = useState<number[]>([]) // indexes of selected characters
    const [isFinished, setIsFinished] = useState(false)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

    useEffect(() => {
        if (currentIndex < vocabList.length) {
            setupWord(vocabList[currentIndex].word_kr)
        } else if (vocabList.length > 0) {
            setIsFinished(true)
        }
    }, [currentIndex, vocabList])

    const setupWord = (word: string) => {
        const chars = word.split('')
        setScrambled(shuffleArray(chars))
        setSelected([])
        setIsCorrect(null)
    }

    const handleSelectChar = (index: number) => {
        if (selected.includes(index) || isCorrect) return
        const newSelected = [...selected, index]
        setSelected(newSelected)
        checkAnswer(newSelected)
    }

    const handleUndo = () => {
        if (selected.length === 0 || isCorrect) return
        setSelected(selected.slice(0, -1))
    }

    const checkAnswer = (currentSelected: number[]) => {
        const word = vocabList[currentIndex].word_kr
        if (currentSelected.length === word.length) {
            const formedWord = currentSelected.map(i => scrambled[i]).join('')
            if (formedWord === word) {
                setIsCorrect(true)
                setTimeout(() => {
                    setCurrentIndex(prev => prev + 1)
                }, 1500)
            } else {
                setIsCorrect(false)
                setTimeout(() => {
                    setSelected([])
                    setIsCorrect(null)
                }, 1000)
            }
        }
    }

    if (isFinished) {
        return (
            <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
                <Card className="max-w-md w-full p-8 text-center space-y-6 rounded-3xl shadow-xl">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                    <h2 className="text-3xl font-bold">Hoàn thành!</h2>
                    <p className="text-slate-600">Bạn đã ghép xong tất cả từ vựng.</p>
                    <Button onClick={onBack} size="lg" className="w-full h-12 rounded-xl">Trở về thiết lập</Button>
                </Card>
            </div>
        )
    }

    if (vocabList.length === 0) return null
    const currentVocab = vocabList[currentIndex]
    const wordLength = currentVocab.word_kr.length

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
            <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
            </Button>

            <div className="text-center font-medium text-slate-500">
                Từ vựng {currentIndex + 1} / {vocabList.length}
            </div>

            <Card className="p-6 md:p-8 rounded-3xl shadow-lg border-2 border-slate-100 bg-white">
                <div className="flex justify-center mb-8 h-48 md:h-64">
                    {currentVocab.image_url ? (
                        <img src={currentVocab.image_url} alt="Vocab" className="h-full object-contain rounded-xl" />
                    ) : (
                        <div className="h-full aspect-square bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                            No Image
                        </div>
                    )}
                </div>

                <div className="space-y-12">
                    {/* Slots */}
                    <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
                        {Array.from({ length: wordLength }).map((_, i) => {
                            const isFilled = i < selected.length
                            const char = isFilled ? scrambled[selected[i]] : ''
                            
                            let boxClass = "w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-2xl md:text-3xl font-bold rounded-xl border-2 transition-all "
                            if (isCorrect === true) {
                                boxClass += "border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm"
                            } else if (isCorrect === false) {
                                boxClass += "border-red-500 bg-red-50 text-red-600 shadow-sm animate-shake"
                            } else if (isFilled) {
                                boxClass += "border-indigo-500 text-indigo-900 bg-white shadow-sm"
                            } else {
                                boxClass += "border-slate-200 border-dashed bg-slate-50 text-transparent"
                            }

                            return (
                                <div key={i} className={boxClass}>
                                    {char}
                                </div>
                            )
                        })}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-14 h-14 md:w-16 md:h-16 rounded-xl hover:bg-slate-100 disabled:opacity-30"
                            onClick={handleUndo}
                            disabled={selected.length === 0 || isCorrect === true}
                        >
                            <RotateCcw className="w-6 h-6 text-slate-500" />
                        </Button>
                    </div>

                    {/* Scrambled Characters */}
                    <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
                        {scrambled.map((char, i) => {
                            const isUsed = selected.includes(i)
                            return (
                                <Button
                                    key={i}
                                    variant="outline"
                                    className={`w-14 h-14 md:w-16 md:h-16 text-2xl md:text-3xl font-bold rounded-xl border-2 shadow-sm transition-all ${
                                        isUsed 
                                        ? 'opacity-0 scale-90 pointer-events-none' 
                                        : 'hover:border-orange-400 hover:bg-orange-50 hover:-translate-y-1'
                                    }`}
                                    onClick={() => handleSelectChar(i)}
                                    disabled={isUsed || isCorrect === true}
                                >
                                    {char}
                                </Button>
                            )
                        })}
                    </div>
                </div>
            </Card>
        </div>
    )
}
