import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Volume2, Repeat, CheckCircle } from 'lucide-react'

export default function FlashcardMode({ vocabList, onBack }: { vocabList: any[], onBack: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [queue, setQueue] = useState<any[]>([...vocabList])
    const [timeLeft, setTimeLeft] = useState(5)

    useEffect(() => {
        if (flipped || queue.length === 0) return
        
        if (timeLeft <= 0) {
            handleFlip()
            return
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1)
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLeft, flipped, queue.length])

    if (queue.length === 0) {
        return (
            <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
                <Card className="max-w-md w-full p-8 text-center space-y-6 rounded-3xl shadow-xl">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                    <h2 className="text-2xl font-bold">Hoàn thành!</h2>
                    <p className="text-slate-600">Bạn đã ôn tập xong danh sách từ vựng.</p>
                    <Button onClick={onBack} size="lg" className="w-full h-12 rounded-xl">Trở về thiết lập</Button>
                </Card>
            </div>
        )
    }

    const currentVocab = queue[currentIndex]

    const handleFlip = () => {
        setFlipped(true)
        if (currentVocab.audio_url) {
            new Audio(currentVocab.audio_url).play().catch(() => {})
        }
    }

    const handleKnown = () => {
        setFlipped(false)
        setTimeLeft(5)
        const newQueue = queue.filter((_, i) => i !== currentIndex)
        setQueue(newQueue)
        if (currentIndex >= newQueue.length) setCurrentIndex(0)
    }

    const handleUnknown = () => {
        setFlipped(false)
        setTimeLeft(5)
        // Move to back of queue
        const newQueue = [...queue]
        const item = newQueue.splice(currentIndex, 1)[0]
        newQueue.push(item)
        setQueue(newQueue)
        if (currentIndex >= newQueue.length) setCurrentIndex(0)
    }

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
            <Button variant="ghost" onClick={onBack} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
            </Button>

            <div className="text-center font-medium text-slate-500">
                Từ vựng còn lại: {queue.length}
            </div>

            <div 
                className="relative w-full aspect-[4/3] md:aspect-video cursor-pointer perspective-1000"
                onClick={!flipped ? handleFlip : undefined}
            >
                <div className={`w-full h-full transition-all duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
                    {/* Front */}
                    <Card className="absolute inset-0 backface-hidden w-full h-full flex flex-col items-center justify-center p-6 rounded-3xl shadow-lg border-2 border-slate-100 hover:border-indigo-200 transition-colors bg-white">
                        {currentVocab.image_url ? (
                            <img src={currentVocab.image_url} alt="Vocab" className="max-h-[60%] object-contain rounded-xl mb-4" />
                        ) : (
                            <div className="h-32 w-32 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">No Image</div>
                        )}
                        <p className="text-slate-400 font-medium animate-pulse mt-4">Tự động lật sau {timeLeft}s</p>
                    </Card>

                    {/* Back */}
                    <Card className="absolute inset-0 backface-hidden w-full h-full flex flex-col items-center justify-center p-6 rounded-3xl shadow-xl border-2 border-indigo-200 bg-indigo-50/50 rotate-y-180">
                        <h2 className="text-4xl md:text-5xl font-black text-indigo-700 mb-2">{currentVocab.word_kr}</h2>
                        <h3 className="text-2xl md:text-3xl font-semibold text-slate-700 mb-6">{currentVocab.word_vi}</h3>
                        
                        {currentVocab.audio_url && (
                            <Button variant="outline" size="icon" className="rounded-full w-12 h-12 bg-white" onClick={(e) => {
                                e.stopPropagation();
                                new Audio(currentVocab.audio_url).play().catch(() => {})
                            }}>
                                <Volume2 className="w-6 h-6 text-indigo-600" />
                            </Button>
                        )}
                    </Card>
                </div>
            </div>

            {flipped && (
                <div className="grid grid-cols-2 gap-4 pt-4 animate-in fade-in slide-in-from-bottom-4">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        className="h-16 text-lg rounded-2xl border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                        onClick={handleUnknown}
                    >
                        <Repeat className="w-5 h-5 mr-2" /> Chưa thuộc
                    </Button>
                    <Button 
                        size="lg" 
                        className="h-16 text-lg rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={handleKnown}
                    >
                        <CheckCircle className="w-5 h-5 mr-2" /> Đã thuộc
                    </Button>
                </div>
            )}
        </div>
    )
}
