import { useState, useEffect, useRef } from 'react'
import { renderDescriptionKr, renderDescriptionVi, getKoreanDescription } from './signUtils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle, Volume2, Pause, Play, Info, SkipBack, SkipForward, RotateCcw, Bookmark } from 'lucide-react'
import { speakText, stopTTS } from '@/lib/tts'

export default function PodcastMode({ vocabList, onBack, hideHeader = false, onNextRound }: { vocabList: any[], onBack: () => void, hideHeader?: boolean, onNextRound?: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(true)
    const [showMeaning, setShowMeaning] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const [speed, setSpeed] = useState(1.0)
    const [speechTrigger, setSpeechTrigger] = useState(0)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const currentVocab = vocabList[currentIndex] || {}

    const [isBookmarked, setIsBookmarked] = useState(false)

    useEffect(() => {
        if (!currentVocab || !currentVocab.id) return
        try {
            const stored = localStorage.getItem('saved_review_words')
            const parsed = stored ? JSON.parse(stored) : []
            const exists = parsed.some((item: any) => item.id === currentVocab.id)
            setIsBookmarked(exists)
        } catch (e) {
            console.error(e)
        }
    }, [currentVocab?.id])

    const toggleBookmark = () => {
        if (!currentVocab || !currentVocab.id) return
        try {
            const stored = localStorage.getItem('saved_review_words')
            const parsed = stored ? JSON.parse(stored) : []
            let updated = []
            if (isBookmarked) {
                updated = parsed.filter((item: any) => item.id !== currentVocab.id)
                setIsBookmarked(false)
            } else {
                updated = [...parsed, currentVocab]
                setIsBookmarked(true)
            }
            localStorage.setItem('saved_review_words', JSON.stringify(updated))
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        if (!isPlaying || isFinished || vocabList.length === 0) return

        if (currentIndex >= vocabList.length) {
            setIsFinished(true)
            return
        }

        const currentVocab = vocabList[currentIndex]
        setShowMeaning(false)

        const handleSpeechEnd = () => {
            // Wait 2 seconds, show meaning, then go to next
            timerRef.current = setTimeout(() => {
                setShowMeaning(true)
                timerRef.current = setTimeout(() => {
                    setCurrentIndex(prev => prev + 1)
                }, 2500) // Show meaning for 2.5 seconds before moving to next
            }, 2000)
        }

        speakText(currentVocab.word_kr, speed, undefined, handleSpeechEnd)

        return () => {
            stopTTS()
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
        }
    }, [currentIndex, isPlaying, isFinished, vocabList, speed, speechTrigger])

    const togglePlay = () => setIsPlaying(!isPlaying)

    const handleNext = () => {
        if (currentIndex < vocabList.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            setIsFinished(true)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
            setIsFinished(false)
        }
    }

    const replayCurrentWord = () => {
        setShowMeaning(false)
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }
        setSpeechTrigger(prev => prev + 1)
    }

    const cycleSpeed = () => {
        setSpeed(prev => {
            if (prev === 0.6) return 0.8
            if (prev === 0.8) return 1.0
            if (prev === 1.0) return 1.2
            return 0.6
        })
    }

    if (isFinished) {
        return (
            <div className="min-h-[50vh] p-4 flex items-center justify-center">
                <Card className="max-w-md w-full p-6 text-center space-y-5 rounded-2xl shadow-lg border border-slate-100 bg-white">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-100">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-800">Hoàn thành!</h2>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Bạn đã nghe xong toàn bộ {vocabList.length} từ vựng trong danh sách này.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                        <Button 
                            onClick={() => {
                                if (onNextRound) {
                                    onNextRound()
                                    return
                                }
                                setCurrentIndex(0)
                                setIsFinished(false)
                                setIsPlaying(true)
                                setSpeed(1.0)
                                setSpeechTrigger(prev => prev + 1)
                            }} 
                            size="lg" 
                            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm"
                        >
                            {onNextRound ? 'Nghe 20 câu mới' : 'Nghe lại từ đầu'}
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={onBack} 
                            size="lg" 
                            className="w-full h-11 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm"
                        >
                            Trở về thiết lập
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    if (vocabList.length === 0) return null

    return (
        <div className="max-w-xl mx-auto p-4 md:p-6 space-y-4">
            {!hideHeader && (
                <div className="flex justify-between items-center mb-1">
                    <Button 
                        variant="ghost" 
                        onClick={onBack}
                        className="text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all duration-200 h-9 px-3"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" /> 
                        <span className="text-xs font-semibold">Quay lại</span>
                    </Button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/60 border border-indigo-100/50 rounded-full text-indigo-600 font-semibold text-xs shadow-sm shadow-indigo-100/10">
                        <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                        <span>Nghe thụ động</span>
                    </div>
                </div>
            )}

            {/* Progress indicator */}
            <div className="w-full space-y-1.5 px-1">
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
                    <span>Tiến trình</span>
                    <span>Từ {currentIndex + 1} / {vocabList.length}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${((currentIndex + 1) / vocabList.length) * 100}%` }}
                    />
                </div>
            </div>

            <Card className="p-8 md:p-10 rounded-3xl shadow-[0_10px_35px_rgb(0,0,0,0.03)] border border-slate-100 bg-white flex flex-col items-center w-full relative">
                {/* Floating Bookmark button if no image frame */}
                {!currentVocab.image_url && (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                        className="absolute top-6 left-6 w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 hover:text-indigo-600 active:scale-95 transition-all duration-200 z-10 cursor-pointer"
                        title={isBookmarked ? "Xóa khỏi sổ tay" : "Lưu vào sổ tay"}
                    >
                        <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                    </button>
                )}

                {currentVocab.image_url && (
                    <div className="relative w-full aspect-[4/3] max-h-48 md:max-h-56 bg-slate-50 rounded-2xl flex items-center justify-center p-4 border border-slate-100/50 overflow-hidden mb-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                            className="absolute top-3 left-3 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md border border-slate-200/50 text-slate-500 hover:text-indigo-600 active:scale-95 transition-all duration-200 z-10 cursor-pointer"
                            title={isBookmarked ? "Xóa khỏi sổ tay" : "Lưu vào sổ tay"}
                        >
                            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                        </button>
                        <img 
                            src={currentVocab.image_url} 
                            alt={currentVocab.word_kr} 
                            className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-500 hover:scale-105" 
                        />
                    </div>
                )}

                <div className={`text-center space-y-4 w-full flex flex-col justify-center items-center ${
                    currentVocab.image_url ? 'min-h-[120px]' : 'min-h-[180px]'
                }`}>
                    <h2 className={`font-extrabold text-slate-800 tracking-wide select-all leading-relaxed text-center ${
                        currentVocab.image_url ? 'text-lg md:text-xl' : 'text-xl sm:text-2xl md:text-3xl'
                    }`}>
                        {currentVocab.word_kr}
                    </h2>
                    {showMeaning ? (
                        <div className="animate-in fade-in zoom-in-95 duration-300 space-y-3.5 w-full flex flex-col items-center">
                            <h3 className={`font-bold text-emerald-600 tracking-wide text-center ${
                                currentVocab.image_url ? 'text-sm md:text-base' : 'text-base md:text-xl'
                            }`}>
                                {currentVocab.word_vi}
                            </h3>
                            {currentVocab.description_vi && (() => {
                                const isSignType = currentVocab.type === 'SIGN';
                                const descKr = getKoreanDescription(currentVocab.description_vi, currentVocab.word_kr);
                                return (
                                    <div className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 ${
                                        isSignType 
                                            ? 'bg-amber-50/40 border-amber-100/70 text-slate-700' 
                                            : 'bg-blue-50/30 border-blue-100/70 text-slate-700'
                                    } animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className="flex items-start gap-2">
                                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                                                isSignType ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                <Info className="w-3 h-3" />
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <p className={`text-[9px] font-bold uppercase tracking-wider ${
                                                    isSignType ? 'text-amber-800' : 'text-blue-800'
                                                }`}>
                                                    {isSignType ? 'Ý nghĩa biển báo' : 'Ghi chú'}
                                                </p>
                                                <div className="space-y-1">
                                                    <div className="text-slate-800 font-semibold leading-relaxed text-xs md:text-sm border-b border-dashed pb-1.5 border-slate-200/60">{renderDescriptionKr(currentVocab.description_vi, currentVocab.word_kr)}</div>
                                                    <div className="text-slate-500 font-medium leading-relaxed text-[11px] md:text-xs pt-1">{renderDescriptionVi(currentVocab.description_vi, currentVocab.word_vi, currentVocab.word_kr)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="h-8 flex items-center justify-center gap-1.5">
                            <span className="w-1 h-3 bg-indigo-400/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-5 bg-indigo-500/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-4 bg-indigo-500/90 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            <span className="w-1 h-5 bg-indigo-500/80 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                            <span className="w-1 h-3 bg-indigo-400/80 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
                        </div>
                    )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100/80 w-full flex flex-col items-center gap-3">
                    <div className="flex items-center justify-center gap-5 w-full">
                        {/* Speed Toggle */}
                        <Button 
                            size="sm" 
                            variant="outline"
                            title="Tốc độ đọc"
                            className="w-9 h-9 rounded-full p-0 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold text-xs"
                            onClick={cycleSpeed}
                        >
                            {speed}x
                        </Button>

                        {/* Previous Button */}
                        <Button 
                            size="sm" 
                            variant="ghost"
                            title="Từ trước"
                            disabled={currentIndex === 0}
                            className="w-10 h-10 rounded-full p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                            onClick={handlePrev}
                        >
                            <SkipBack className="w-4 h-4" />
                        </Button>

                        {/* Play/Pause Button */}
                        <Button 
                            size="lg" 
                            title={isPlaying ? "Tạm dừng" : "Tiếp tục phát"}
                            className={`w-12 h-12 rounded-full shadow-md transition-all duration-300 p-0 flex items-center justify-center ${
                                isPlaying 
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100' 
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                            }`}
                            onClick={togglePlay}
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </Button>

                        {/* Next Button */}
                        <Button 
                            size="sm" 
                            variant="ghost"
                            title="Từ tiếp theo"
                            disabled={currentIndex === vocabList.length - 1}
                            className="w-10 h-10 rounded-full p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                            onClick={handleNext}
                        >
                            <SkipForward className="w-4 h-4" />
                        </Button>

                        {/* Replay pronunciation Button */}
                        <Button 
                            size="sm" 
                            variant="outline"
                            title="Nghe lại phát âm"
                            className="w-9 h-9 rounded-full p-0 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                            onClick={replayCurrentWord}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
