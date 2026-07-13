'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Volume2, Repeat, CheckCircle, Eye, ChevronRight, BookOpen, Zap, Info, Bookmark } from 'lucide-react'

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
        if ('speechSynthesis' in window && current.word_kr) {
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(current.word_kr)
            utterance.lang = 'ko-KR'
            utterance.rate = 0.8
            window.speechSynthesis.speak(utterance)
        } else if (current.audio_url) {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.currentTime = 0
            }
            const audio = new Audio(current.audio_url)
            audioRef.current = audio
            audio.play().catch(() => {})
        }
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
                                                <p className="text-slate-800 font-semibold text-xs leading-relaxed border-b border-amber-100/60 pb-1">{descKr}</p>
                                                <p className="text-slate-650 font-medium text-xs leading-relaxed pt-0.5">{current.description_vi}</p>
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

export function getKoreanDescription(descVi: string, wordKr: string): string {
    if (!descVi) return '';
    
    const staticMap: Record<string, string> = {
        "Biển báo này dùng để nghiêm cấm hành vi hút thuốc lá trong khu vực này nhằm đề phòng hỏa hoạn, cháy nổ và bảo vệ sức khỏe mọi người xung quanh.": 
            "이 구역에서 화재 및 폭발을 예방하고 주변 사람들의 건강을 보호하기 위해 흡연 행위를 엄격히 금지하는 표지판입니다.",
        "Biển báo này dùng để cấm quay phim, chụp ảnh tại khu vực này để bảo vệ thông tin nội bộ hoặc đảm bảo an toàn an ninh.": 
            "내부 정보 보호 및 보안 유지를 위해 이 구역에서 비디오 촬영 및 사진 촬영을 금지하는 표지판입니다.",
        "Biển báo này cấm chạy nhảy trong khu vực làm việc để tránh va chạm, vấp ngã hoặc xảy ra tai nạn lao động.": 
            "작업 공간 내에서 충돌, 미끄러짐 또는 산업 재해를 방지하기 위해 뛰는 행위를 금지하는 표지판입니다.",
        "Biển báo này cấm dựa vào vật thể, vách ngăn hoặc cửa kính này nhằm tránh nguy cơ đổ vỡ, té ngã gây tai nạn nguy hiểm.": 
            "물체, 칸막이 또는 유리문에 기댈 경우 파손 및 낙하로 인한 위험한 사고가 발생할 수 있으므로 기댐을 금지하는 표지판입니다.",
        "Biển báo này cấm chạm tay vào máy móc, thiết bị hoặc các bộ phận có điện/nóng để tránh bị thương hoặc điện giật.": 
            "부상이나 감전을 예방하기 위해 기계, 장비 또는 전기/열이 발생하는 부품을 손으로 만지는 것을 금지하는 표지판입니다.",
        "Biển báo này cấm ngồi xuống khu vực này để giữ lối đi thông thoáng hoặc phòng ngừa tai nạn do xe nâng, máy móc va quệt.": 
            "통행로를 확보하고 지게차나 기계류와의 충돌 사고를 예방하기 위해 이 구역에 앉는 것을 금지하는 표지판입니다.",
        "Biển báo này nghiêm cấm mang vật nuôi hoặc thú cưng vào khu vực làm việc để đảm bảo vệ sinh và an toàn lao động.": 
            "위생 및 산업 안전을 보장하기 위해 작업 구역 내에 반려동물이나 애완동물을 동반하는 것을 엄격히 금지하는 표지판입니다.",
        "Biển báo cấm đeo găng tay khi vận hành một số loại máy móc có trục xoay (như máy tiện, máy khoan) để tránh bị cuốn tay vào máy.": 
            "회전축이 있는 일부 기계(선반, 드릴 등)를 작동할 때 손이 끼이는 사고를 방지하기 위해 장갑 착용을 금지하는 표지판입니다.",
        "Biển báo cấm lắc lư hoặc đùa nghịch tại khu vực này để tránh nguy cơ mất an toàn.": 
            "안전사고 위험을 방지하기 위해 이 구역에서 몸을 흔들거나 장난치는 행위를 금지하는 표지판입니다.",
        "Biển báo cấm xe nâng và các phương tiện vận chuyển tự động qua lại lối đi này để đảm bảo an toàn cho người đi bộ.": 
            "보행자의 안전을 확보하기 위해 이 통로에서 지게차 및 자동 운반 장비의 통행을 금지하는 표지판입니다.",
        "Biển báo yêu cầu người lao động bắt buộc phải mặc áo phản quang khi làm việc giúp dễ dàng nhận biết vị trí, tránh tai nạn va chạm xe cộ.": 
            "근로자가 작업할 때 위치 식별을 쉽게 하고 차량 충돌 사고를 방지하기 위해 반사조끼를 의무적으로 착용하도록 요구하는 표지판입니다.",
        "Biển báo yêu cầu bắt buộc đội mũ bảo hộ lao động để bảo vệ đầu khỏi nguy cơ chấn thương do vật rơi từ trên cao xuống.": 
            "낙하물로 인한 두부 부상 위험으로부터 머리를 보호하기 위해 산업용 안전모를 의무적으로 착용하도록 요구하는 표지판입니다.",
        "Biển báo yêu cầu bấm còi cảnh báo khi đi qua các khúc cua khuất hoặc cửa ra vào để báo hiệu cho người khác tránh xe.": 
            "시야가 가려진 모퉁이나 출입구를 통과할 때 다른 이들에게 알리고 사고를 예방하기 위해 경적을 울리도록 요구하는 표지판입니다.",
        "Biển báo yêu cầu đeo chụp tai hoặc nút bịt tai chống ồn để bảo vệ màng nhĩ tại những khu vực có máy móc phát ra tiếng ồn lớn.": 
            "기계 소음이 심한 구역에서 청각을 보호하기 위해 귀덮개나 귀마개를 의무적으로 착용하도록 요구하는 표지판입니다.",
        "Biển báo yêu cầu đeo kính bảo hộ để bảo vệ mắt khỏi bụi bẩn, hóa chất độc hại hoặc các mảnh vụn bắn ra khi gia công.": 
            "가공 시 비산하는 먼지, 유해 화학물질 또는 파편으로부터 눈을 보호하기 위해 보안경을 의무적으로 착용하도록 요구하는 표지판입니다.",
        "Biển báo yêu cầu đeo khẩu trang để tránh hít phải bụi mịn, khí độc hại hoặc ngăn ngừa lây nhiễm bệnh dịch tại nơi làm việc.": 
            "미세먼지, 유해 가스 흡입을 방지하고 작업장 내 감염병 전파를 예방하기 위해 마스크를 의무적으로 착용하도록 요구하는 표지판입니다.",
        "Biển báo yêu cầu mặc tạp dề bảo hộ chống thấm nước hoặc chống hóa chất để bảo vệ cơ thể khỏi bị bám bẩn hoặc bỏng hóa chất.": 
            "물이나 화학물질로 인한 오염 및 화학 화상으로부터 신체를 보호하기 위해 방수 또는 방화학 앞치마를 의무적으로 착용하도록 요구하는 표지판입니다.",
        "Biển báo yêu cầu đeo găng tay bảo hộ để bảo vệ tay khỏi trầy xước, bỏng, hoặc tiếp xúc trực tiếp với chất nguy hiểm.": 
            "긁힘, 화상 또는 위험 물질과의 직접적인 접촉으로부터 손을 보호하기 위해 안전장갑을 의무적으로 착용하도록 요구하는 표지판입니다.",
        "Biển báo yêu cầu thắt dây đai an toàn và móc cáp treo bảo hộ khi làm việc ở các vị trí trên cao để phòng tránh tai nạn rơi ngã.": 
            "고소 작업 시 추락 사고를 예방하기 위해 안전대(안전벨트)를 착용하고 안전고리를 체결하도록 요구하는 표지판입니다.",
        "Biển chỉ dẫn yêu cầu mọi người đi đúng làn đường hoặc lối đi dành riêng cho người đi bộ để tránh va chạm với xe cộ.": 
            "차량과의 충돌을 방지하기 위해 보행자 전용 도로나 통로로 통행하도록 안내하는 표지판입니다.",
        "Biển báo nhắc nhở mọi người rửa tay sạch sẽ bằng xà phòng để giữ vệ sinh cá nhân, phòng tránh lây nhiễm các bệnh truyền nhiễm.": 
            "개인위생을 유지하고 감염병 전파를 예방하기 위해 비누로 손을 깨끗이 씻도록 안내하는 표지판입니다.",
        "Biển báo yêu cầu bám tay vào lan can, tay vịn khi di chuyển trên cầu thang bộ để giữ thăng bằng, tránh trượt chân ngã.": 
            "계단 이동 시 중심을 잡고 미끄러짐 사고를 예방하기 위해 난간이나 손잡이를 잡도록 요구하는 표지판입니다.",
        "Biển cảnh báo mặt sàn trơn trượt nguy hiểm, yêu cầu đi lại cẩn thận, mặc giày chống trượt để phòng tránh té ngã.": 
            "바닥이 미끄러워 위험하므로 주의해서 걷고 미끄럼 방지화를 착용하여 넘어짐 사고를 예방하도록 경고하는 표지판입니다.",
        "Biển cảnh báo khu vực có chứa chất độc hại hoặc khí độc, tuyệt đối không vào nếu không có trang thiết bị bảo hộ chuyên dụng.": 
            "유해 물질 또는 독성 가스가 있는 구역이므로 전용 보호구를 착용하지 않은 경우 절대 출입을 금지하도록 경고하는 표지판입니다.",
        "Biển cảnh báo chất dễ bắt lửa, dễ cháy nổ, yêu cầu tránh xa nguồn nhiệt, cấm mang lửa hoặc các vật dụng dễ phát tia lửa vào.": 
            "인화성 및 폭발 위험 물질이 있으므로 열원으로부터 멀리하고 인화 물질이나 화기 반입을 금지하도록 경고하는 표지판입니다.",
        "Biển cảnh báo nguy hiểm có thể bị rơi ngã từ trên cao hoặc có vật liệu rơi xuống, yêu cầu thắt dây an toàn và đội mũ bảo hộ.": 
            "낙하물 또는 추락 위험이 있으므로 안전모를 착용하고 안전대를 매도록 경고하는 표지판입니다.",
        "Biển chỉ dẫn lối thoát hiểm khẩn cấp hoặc đường đi an toàn khi xảy ra hỏa hoạn, sự cố khẩn cấp trong tòa nhà.": 
            "건물 내 화재나 비상사태 발생 시 안전한 대피 경로 또는 비상구 위치를 알려주는 안내판입니다.",
        "Biển chỉ dẫn nơi để hộp dụng cụ y tế sơ cứu khẩn cấp khi người lao động bị thương nhẹ tại nơi làm việc.": 
            "근로자가 가벼운 부상을 입었을 때 응급 처치를 할 수 있는 구급함 보관 장소를 알려주는 안내판입니다.",
        "Biển chỉ dẫn mở cửa bằng cách kéo/trượt cánh cửa sang bên trái hoặc bên phải để mở rộng lối đi.": 
            "통로 확보를 위해 문을 좌측 또는 우측으로 밀어서 열도록 알려주는 안내판 (미닫이문) 입니다.",
        "Biển chỉ dẫn đẩy cửa về phía trước để ra hoặc vào phòng một cách thuận tiện.": 
            "방에 드나들 때 문을 앞으로 밀어서 열도록 알려주는 안내판 (미는 문) 입니다.",
        "Biển chỉ dẫn dùng tay kéo cánh cửa về phía mình để mở cửa.": 
            "문을 열기 위해 문고리를 몸쪽으로 당기도록 알려주는 안내판 (당기는 문) 입니다."
    };

    if (staticMap[descVi]) {
        return staticMap[descVi];
    }

    // Dynamic fallbacks
    if (descVi.startsWith("Biển báo này nghiêm cấm hành vi ") && descVi.includes(" tại khu vực này để giữ an toàn tuyệt đối cho người lao động.")) {
        return `근로자의 절대적인 안전을 위해 이 구역에서 ${wordKr} 행위를 엄격히 금지하는 표지판입니다.`;
    }
    if (descVi.startsWith("Biển báo này yêu cầu người lao động thực hiện đúng chỉ dẫn: ") && descVi.includes(" để bảo vệ sức khỏe và tính mạng của bản thân.")) {
        return `근로자 자신의 건강과 생명을 보호하기 위해 지시사항(${wordKr})을 올바르게 이행하도록 요구하는 표지판입니다.`;
    }
    if (descVi.startsWith("Biển cảnh báo nguy hiểm hoặc nguy cơ mất an toàn liên quan đến: ") && descVi.includes(". Cần nâng cao chú ý khi làm việc.")) {
        return `${wordKr}와(과) 관련된 위험 또는 안전사고 우려를 알리는 경고판입니다. 작업 시 각별히 주의하시기 바랍니다.`;
    }
    if (descVi.startsWith("Biển chỉ dẫn vị trí hoặc thiết bị an toàn, cứu hộ: ") && descVi.includes(". Giúp mọi người xử lý nhanh khi có sự cố.")) {
        return `안전 및 구조 장비 위치(${wordKr})를 안내하여 비상시 대처를 돕는 표지판입니다.`;
    }
    if (descVi.startsWith("Biển báo này cung cấp chỉ dẫn và thông điệp an toàn tại nơi làm việc: ") && descVi.includes(" để bảo vệ bản thân và đồng nghiệp.")) {
        return `본인과 동료를 보호하기 위해 작업장 내 안전 수칙(${wordKr})을 알려주는 표지판입니다.`;
    }

    return `본인과 동료를 보호하기 위해 작업장 내 안전 수칙(${wordKr})을 알려주는 표지판입니다.`;
}
