import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle, Volume2, Pause, Play } from 'lucide-react'

export default function PodcastMode({ vocabList, onBack }: { vocabList: any[], onBack: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(true)
    const [showMeaning, setShowMeaning] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!isPlaying || isFinished || vocabList.length === 0) return

        if (currentIndex >= vocabList.length) {
            setIsFinished(true)
            return
        }

        const currentVocab = vocabList[currentIndex]
        setShowMeaning(false)

        if (currentVocab.audio_url) {
            const audio = new Audio(currentVocab.audio_url)
            audioRef.current = audio
            audio.play().catch(console.error)

            audio.onended = () => {
                // Wait 2 seconds, show meaning, then go to next
                timerRef.current = setTimeout(() => {
                    setShowMeaning(true)
                    timerRef.current = setTimeout(() => {
                        setCurrentIndex(prev => prev + 1)
                    }, 2500) // Show meaning for 2.5 seconds before moving to next
                }, 2000)
            }
        } else {
            // If no audio, just use a fixed timer
            timerRef.current = setTimeout(() => {
                setShowMeaning(true)
                timerRef.current = setTimeout(() => {
                    setCurrentIndex(prev => prev + 1)
                }, 2500)
            }, 2000)
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
        }
    }, [currentIndex, isPlaying, isFinished, vocabList])

    const togglePlay = () => setIsPlaying(!isPlaying)

    if (isFinished) {
        return (
            <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
                <Card className="max-w-md w-full p-8 text-center space-y-6 rounded-3xl shadow-xl">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                    <h2 className="text-3xl font-bold">Hoàn thành!</h2>
                    <p className="text-slate-600 text-lg">Bạn đã nghe xong toàn bộ danh sách từ vựng.</p>
                    <Button onClick={onBack} size="lg" className="w-full h-12 rounded-xl">Trở về thiết lập</Button>
                </Card>
            </div>
        )
    }

    if (vocabList.length === 0) return null

    const currentVocab = vocabList[currentIndex]

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
                </Button>
                <div className="flex items-center gap-2 font-bold text-lg bg-white px-4 py-2 rounded-xl shadow-sm text-blue-600">
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    Nghe thụ động
                </div>
            </div>

            <div className="text-center font-medium text-slate-500">
                Từ vựng {currentIndex + 1} / {vocabList.length}
            </div>

            <Card className="p-6 md:p-10 rounded-3xl shadow-lg border-2 border-slate-100 bg-white flex flex-col items-center">
                <div className="flex justify-center mb-8 h-48 md:h-64 w-full">
                    {currentVocab.image_url ? (
                        <img src={currentVocab.image_url} alt="Vocab" className="h-full object-contain rounded-xl" />
                    ) : (
                        <div className="h-full w-full aspect-square bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 max-w-sm mx-auto">
                            No Image
                        </div>
                    )}
                </div>

                <div className="text-center space-y-4 h-32 flex flex-col justify-center">
                    <h2 className="text-4xl md:text-5xl font-black text-indigo-700">{currentVocab.word_kr}</h2>
                    {showMeaning ? (
                        <h3 className="text-2xl md:text-3xl font-semibold text-emerald-600 animate-in fade-in zoom-in duration-300">
                            {currentVocab.word_vi}
                        </h3>
                    ) : (
                        <div className="h-8 md:h-10 flex items-center justify-center">
                            <span className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <Button 
                        size="lg" 
                        variant={isPlaying ? "outline" : "default"}
                        className={`w-16 h-16 rounded-full shadow-lg ${!isPlaying ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-slate-600'}`}
                        onClick={togglePlay}
                    >
                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
