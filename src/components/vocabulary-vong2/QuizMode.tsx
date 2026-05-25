import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle, XCircle, Timer, AlertCircle } from 'lucide-react'

function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array]
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]]
    }
    return newArr
}

export default function QuizMode({ vocabList, onBack }: { vocabList: any[], onBack: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [options, setOptions] = useState<any[]>([])
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
    const [timeLeft, setTimeLeft] = useState(10)
    const [isFinished, setIsFinished] = useState(false)
    const [score, setScore] = useState(0)

    useEffect(() => {
        if (currentIndex < vocabList.length) {
            generateOptions(vocabList[currentIndex])
            setTimeLeft(10)
            setSelectedAnswer(null)
        } else if (vocabList.length > 0) {
            setIsFinished(true)
        }
    }, [currentIndex, vocabList])

    useEffect(() => {
        if (isFinished || selectedAnswer !== null) return
        if (timeLeft <= 0) {
            handleSelect('TIMEOUT')
            return
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
        return () => clearInterval(timer)
    }, [timeLeft, isFinished, selectedAnswer])

    const generateOptions = (current: any) => {
        const others = vocabList.filter(v => v.id !== current.id)
        const shuffledOthers = shuffleArray(others).slice(0, 3)
        const allOptions = shuffleArray([current, ...shuffledOthers])
        setOptions(allOptions)
    }

    const handleSelect = (word_kr: string) => {
        if (selectedAnswer !== null) return
        setSelectedAnswer(word_kr)
        if (word_kr === vocabList[currentIndex].word_kr) {
            setScore(s => s + 1)
        }
        setTimeout(() => {
            setCurrentIndex(prev => prev + 1)
        }, 1500)
    }

    if (isFinished) {
        return (
            <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
                <Card className="max-w-md w-full p-8 text-center space-y-6 rounded-3xl shadow-xl">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                    <h2 className="text-3xl font-bold">Hoàn thành!</h2>
                    <p className="text-slate-600 text-lg">Bạn đã trả lời đúng {score} / {vocabList.length} câu hỏi.</p>
                    <Button onClick={onBack} size="lg" className="w-full h-12 rounded-xl">Trở về thiết lập</Button>
                </Card>
            </div>
        )
    }

    if (vocabList.length === 0) return null

    const currentVocab = vocabList[currentIndex]

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
                </Button>
                <div className="flex items-center gap-2 font-bold text-lg bg-white px-4 py-2 rounded-xl shadow-sm">
                    <Timer className={`w-5 h-5 ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`} />
                    <span className={timeLeft <= 3 ? 'text-red-500' : 'text-slate-700'}>
                        {timeLeft}s
                    </span>
                </div>
            </div>

            <div className="text-center font-medium text-slate-500">
                Câu hỏi {currentIndex + 1} / {vocabList.length}
            </div>

            <Card className="p-6 md:p-8 rounded-3xl shadow-lg border-2 border-slate-100 bg-white">
                <div className="flex justify-center mb-8 h-48 md:h-64">
                    {currentVocab.image_url ? (
                        <img src={currentVocab.image_url} alt="Question" className="h-full object-contain rounded-xl" />
                    ) : (
                        <div className="h-full aspect-square bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                            No Image
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {options.map((opt, i) => {
                        let btnClass = "h-16 text-lg rounded-2xl transition-all"
                        let icon = null
                        if (selectedAnswer !== null) {
                            if (opt.word_kr === currentVocab.word_kr) {
                                btnClass += " bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                                icon = <CheckCircle className="w-5 h-5 ml-2" />
                            } else if (selectedAnswer === opt.word_kr) {
                                btnClass += " bg-red-500 hover:bg-red-600 text-white border-transparent"
                                icon = <XCircle className="w-5 h-5 ml-2" />
                            } else {
                                btnClass += " opacity-50 border-slate-200"
                            }
                        } else {
                            btnClass += " bg-white border-2 border-slate-200 hover:border-pink-300 hover:bg-pink-50 text-slate-700 shadow-sm"
                        }

                        return (
                            <Button 
                                key={i} 
                                variant={selectedAnswer !== null ? "default" : "outline"} 
                                className={btnClass}
                                onClick={() => handleSelect(opt.word_kr)}
                                disabled={selectedAnswer !== null}
                            >
                                {opt.word_kr}
                                {icon}
                            </Button>
                        )
                    })}
                </div>
                {selectedAnswer === 'TIMEOUT' && (
                    <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center justify-center gap-2 font-medium animate-in zoom-in">
                        <AlertCircle className="w-5 h-5" /> Đã hết thời gian!
                    </div>
                )}
            </Card>
        </div>
    )
}
