'use client'
import { renderDescriptionKr, renderDescriptionVi } from './signUtils';
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Volume2, Repeat, CheckCircle, Eye, ChevronRight, BookOpen, Zap, Info, Bookmark } from 'lucide-react'
import { speakText, stopTTS } from '@/lib/tts'

interface VocabItem {
    id: string
    word_kr: string
    word_vi: string
    image_url?: string
    audio_url?: string
    description_vi?: string
    type?: string
}

// Phase: front (hình ảnh) → reveal (lật thẻ, nghe âm) → known/unknown
type CardPhase = 'front' | 'reveal'

export default function FlashcardMode({ vocabList, onBack, hideHeader = false }: { vocabList: VocabItem[], onBack: () => void, hideHeader?: boolean }) {
    // Queue: items not yet mastered
    const [queue, setQueue] = useState<VocabItem[]>([...vocabList])
    const [mastered, setMastered] = useState<VocabItem[]>([])
    const [phase, setPhase] = useState<CardPhase>('front')
    const [countdown, setCountdown] = useState(4)
    const [isAnimatingOut, setIsAnimatingOut] = useState(false)
    const countdownRef = useRef<NodeJS.Timeout | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const current = queue[0]
    const isSignType = current?.type === 'SIGN'

    const [isBookmarked, setIsBookmarked] = useState(false)

    useEffect(() => {
        if (!current) return
        try {
            const stored = localStorage.getItem('saved_review_words')
            const parsed = stored ? JSON.parse(stored) : []
            const exists = parsed.some((item: any) => item.id === current.id)
            setIsBookmarked(exists)
        } catch (e) {
            console.error(e)
        }
    }, [current?.id])

    const toggleBookmark = () => {
        if (!current) return
        try {
            const stored = localStorage.getItem('saved_review_words')
            const parsed = stored ? JSON.parse(stored) : []
            let updated = []
            if (isBookmarked) {
                updated = parsed.filter((item: any) => item.id !== current.id)
                setIsBookmarked(false)
            } else {
                updated = [...parsed, current]
                setIsBookmarked(true)
            }
            localStorage.setItem('saved_review_words', JSON.stringify(updated))
        } catch (e) {
            console.error(e)
        }
    }

    // Start countdown on front phase
    useEffect(() => {
        if (phase !== 'front' || queue.length === 0) return
        setCountdown(4)
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current!)
                    handleReveal()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
    }, [phase, queue[0]?.id])

    const playAudio = useCallback(() => {
        if (!current) return
        speakText(current.word_kr, 1.0)
    }, [current])


    const handleReveal = useCallback(() => {
        if (countdownRef.current) clearInterval(countdownRef.current)
        setPhase('reveal')
        // Auto-play audio on reveal
        setTimeout(() => playAudio(), 200)
    }, [playAudio])

    const toggleFlip = () => {
        if (phase === 'front') {
            handleReveal()
        } else {
            setPhase('front')
        }
    }

    const nextCard = useCallback((known: boolean) => {
        if (isAnimatingOut) return
        setIsAnimatingOut(true)
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }

        setTimeout(() => {
            setIsAnimatingOut(false)
            if (known) {
                setMastered(prev => [...prev, current])
                setQueue(prev => prev.slice(1))
            } else {
                // Move to end of queue
                setQueue(prev => [...prev.slice(1), prev[0]])
            }
            setPhase('front')
        }, 300)
    }, [current, isAnimatingOut])

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === ' ' && phase === 'front') { e.preventDefault(); handleReveal() }
            if (e.key === 'ArrowRight' && phase === 'reveal') nextCard(true)
            if (e.key === 'ArrowLeft' && phase === 'reveal') nextCard(false)
            if (e.key === 'r' || e.key === 'R') playAudio()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [phase, handleReveal, nextCard, playAudio])

    if (queue.length === 0) {
        return (
            <div className="min-h-[500px] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="relative mx-auto w-28 h-28">
                        <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50" />
                        <div className="relative w-full h-full bg-gradient-to-br from-emerald-100 to-teal-50 rounded-full flex items-center justify-center shadow-inner border-4 border-white">
                            <CheckCircle className="w-14 h-14 text-emerald-500" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Xuất sắc! 🎉</h2>
                        <p className="text-slate-500 text-lg">Bạn đã học thuộc <strong className="text-emerald-600">{mastered.length}</strong> từ vựng.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-4 px-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
                        <div className="text-center">
                            <p className="text-3xl font-black text-emerald-600">{mastered.length}</p>
                            <p className="text-sm text-slate-500 font-medium">Đã thuộc</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-black text-slate-400">{vocabList.length}</p>
                            <p className="text-sm text-slate-500 font-medium">Tổng cộng</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Button onClick={() => { setQueue([...vocabList]); setMastered([]); setPhase('front') }}
                            variant="outline" className="h-12 rounded-xl font-semibold gap-2">
                            <Repeat className="w-4 h-4" /> Luyện lại từ đầu
                        </Button>
                        <Button onClick={onBack} className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                            Chọn chế độ khác
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const progress = mastered.length / vocabList.length

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                {!hideHeader ? (
                    <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-600 hover:text-slate-900 -ml-2">
                        <ArrowLeft className="w-4 h-4" /> Quay lại
                    </Button>
                ) : (
                    <div />
                )}
                <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-slate-500">
                        <span className="text-indigo-600 font-bold">{mastered.length}</span>/{vocabList.length} thuộc
                    </div>
                    <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                        Còn lại: {queue.length}
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>

            {/* Custom 3D Flip Styles */}
            <style>{`
                .flip-perspective {
                    perspective: 1200px;
                }
                .flip-card-inner {
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    width: 100%;
                    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                    transform-style: preserve-3d;
                }
                .flip-card-inner.is-flipped {
                    transform: rotateY(180deg);
                }
                .flip-card-face {
                    grid-column: 1 / 2;
                    grid-row: 1 / 2;
                    width: 100%;
                    height: 100%;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .flip-card-face-back {
                    transform: rotateY(180deg);
                }
            `}</style>

            {/* Card */}
            <div
                className={`relative transition-all duration-300 ${isAnimatingOut ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'} flip-perspective`}
            >
                <div className={`flip-card-inner ${phase === 'reveal' ? 'is-flipped' : ''}`}>
                    {/* FRONT: show image only, with countdown */}
                    <div
                        className="flip-card-face rounded-3xl border-2 border-slate-100 bg-white shadow-xl overflow-hidden cursor-pointer select-none flex flex-col"
                        onClick={toggleFlip}
                    >
                        {/* Image area */}
                        <div className="relative flex-1 flex justify-center items-center bg-gradient-to-br from-slate-50 to-indigo-50/30 p-8 min-h-[280px] md:min-h-[360px]">
                            {/* Bookmark button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                                className="absolute top-4 left-4 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md border border-slate-200/50 text-slate-500 hover:text-indigo-650 active:scale-95 transition-all duration-200 z-10"
                                title={isBookmarked ? "Xóa khỏi sổ tay" : "Lưu vào sổ tay"}
                            >
                                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                            </button>
                            {current.image_url ? (
                                <img
                                    src={current.image_url}
                                    alt="Từ vựng"
                                    className="max-h-[220px] md:max-h-[300px] max-w-full object-contain rounded-2xl drop-shadow-md"
                                />
                            ) : (
                                <div className="w-40 h-40 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-300">
                                    <BookOpen className="w-16 h-16" />
                                </div>
                            )}
                            {/* Countdown badge */}
                            <div className="absolute top-4 right-4 w-12 h-12 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md border border-white">
                                <span className="text-xl font-black text-indigo-600">{countdown}</span>
                            </div>
                        </div>
                        {/* Hint */}
                        <div className="py-4 px-6 text-center bg-white border-t border-slate-100 flex-shrink-0">
                            <p className="text-slate-400 text-sm font-medium animate-pulse flex items-center justify-center gap-2">
                                <Eye className="w-4 h-4" />
                                Nhớ thử xem đây là gì? Nhấn để xem đáp án
                            </p>
                        </div>
                    </div>

                    {/* REVEAL: show full info */}
                    <div 
                        className="flip-card-face flip-card-face-back rounded-3xl border-2 border-indigo-100 bg-white shadow-xl overflow-hidden cursor-pointer select-none flex flex-col justify-between"
                        onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('button') || target.closest('a')) return;
                            toggleFlip();
                        }}
                    >
                        <div className="flex-1 flex flex-col justify-center p-6 relative">
                            {/* Bookmark button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                                className="absolute top-4 right-4 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md border border-slate-200/50 text-slate-500 hover:text-indigo-650 active:scale-95 transition-all duration-200 z-10"
                                title={isBookmarked ? "Xóa khỏi sổ tay" : "Lưu vào sổ tay"}
                            >
                                <Bookmark className={`w-4.5 h-4.5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                            </button>

                            {/* Centered content stack */}
                            <div className="my-auto flex flex-col items-center text-center gap-4 py-4 w-full">
                                {current.image_url ? (
                                    <img
                                        src={current.image_url}
                                        alt="Từ vựng"
                                        className="max-h-[140px] md:max-h-[180px] w-auto object-contain rounded-2xl drop-shadow-md bg-white border border-slate-100 p-2"
                                    />
                                ) : (
                                    <div className="w-24 h-24 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-355 border border-slate-100">
                                        <BookOpen className="w-8 h-8" />
                                    </div>
                                )}
                                
                                <div className="space-y-1">
                                    <div className="flex items-center justify-center gap-2">
                                        <h2 className="text-2xl md:text-3xl font-extrabold text-indigo-800 tracking-tight leading-none">
                                            {current.word_kr}
                                        </h2>
                                        {current.audio_url && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); playAudio() }}
                                                className="p-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex-shrink-0 shadow-sm active:scale-95"
                                                title="Nghe lại"
                                            >
                                                <Volume2 className="w-4 h-4 text-indigo-600" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-lg md:text-xl font-bold text-emerald-600">{current.word_vi}</p>
                                </div>

                                {/* Description (for SIGN type) */}
                                {isSignType && current.description_vi && (() => {
                                    const descKr = getKoreanDescription(current.description_vi, current.word_kr);
                                    return (
                                        <div className="w-full max-w-md bg-amber-50/60 rounded-xl p-3 border border-amber-100 text-left flex items-start gap-2.5 mt-2">
                                            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Ý nghĩa biển báo / 표지판 설명</p>
                                                <div className="text-slate-800 font-semibold text-xs leading-relaxed border-b border-amber-100/60 pb-1">{renderDescriptionKr(current.description_vi, current.word_kr)}</div>
                                                <div className="text-slate-650 font-medium text-xs leading-relaxed pt-0.5">{renderDescriptionVi(current.description_vi, current.word_vi, current.word_kr)}</div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* For TOOL type with description */}
                                {!isSignType && current.description_vi && (
                                    <div className="w-full max-w-md bg-blue-50/50 rounded-xl p-3 border border-blue-100 text-left flex items-start gap-2.5 mt-2">
                                        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider mb-0.5">Ghi chú / 참고 사항</p>
                                            <p className="text-slate-700 font-medium text-xs leading-relaxed">{current.description_vi}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons pinned at bottom */}
                        <div className="p-5 space-y-3 bg-white border-t border-slate-100 flex-shrink-0">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); nextCard(false); }}
                                    className="flex items-center justify-center gap-2 h-14 rounded-2xl font-bold text-base border-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:border-orange-300 active:scale-95 transition-all"
                                >
                                    <Repeat className="w-5 h-5" /> Chưa thuộc
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); nextCard(true); }}
                                    className="flex items-center justify-center gap-2 h-14 rounded-2xl font-bold text-base bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 transition-all shadow-md shadow-emerald-200"
                                >
                                    <CheckCircle className="w-5 h-5" /> Đã thuộc
                                </button>
                            </div>
                            <p className="text-center text-xs text-slate-400">
                                ← Chưa thuộc &nbsp;|&nbsp; Đã thuộc → &nbsp;|&nbsp; <kbd className="bg-slate-100 px-1 rounded">R</kbd> Nghe lại
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mini progress dots */}
            {vocabList.length <= 20 && (
                <div className="flex justify-center gap-1.5 pt-1 flex-wrap">
                    {vocabList.map((item) => {
                        const isMastered = mastered.some(m => m.id === item.id)
                        const isCurrent = current?.id === item.id
                        return (
                            <div
                                key={item.id}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                    isMastered ? 'bg-emerald-400 scale-110' :
                                    isCurrent ? 'bg-indigo-500 scale-125' :
                                    'bg-slate-200'
                                }`}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}

import { getKoreanDescription as getKoreanDescriptionFromUtils } from './signUtils';

export function getKoreanDescription(descVi: string, wordKr: string): string {
    return getKoreanDescriptionFromUtils(descVi, wordKr);
}
