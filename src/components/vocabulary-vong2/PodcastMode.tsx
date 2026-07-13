import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle, Volume2, Pause, Play, Info, SkipBack, SkipForward, RotateCcw, Bookmark } from 'lucide-react'

export default function PodcastMode({ vocabList, onBack, hideHeader = false }: { vocabList: any[], onBack: () => void, hideHeader?: boolean }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(true)
    const [showMeaning, setShowMeaning] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const [speed, setSpeed] = useState(0.8)
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

        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel() // Stop any ongoing speech
                const utterance = new SpeechSynthesisUtterance(currentVocab.word_kr)
                utterance.lang = 'ko-KR'
                utterance.rate = speed
                
                utterance.onend = () => {
                    handleSpeechEnd()
                }

                utterance.onerror = (err) => {
                    console.warn("SpeechSynthesis error:", err)
                    // Fallback to normal timers on error so the app doesn't get stuck
                    handleSpeechEnd()
                }

                window.speechSynthesis.speak(utterance)
            } catch (err) {
                console.error("SpeechSynthesis initiation failed:", err)
                handleSpeechEnd()
            }
        } else {
            // Fallback if speechSynthesis is not supported
            handleSpeechEnd()
        }

        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel()
            }
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
                                setCurrentIndex(0)
                                setIsFinished(false)
                                setIsPlaying(true)
                                setSpeechTrigger(prev => prev + 1)
                            }} 
                            size="lg" 
                            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm"
                        >
                            Nghe lại từ đầu
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
                                                    <p className="text-slate-800 font-semibold leading-relaxed text-xs md:text-sm border-b border-dashed pb-1.5 border-slate-200/60">
                                                        {descKr}
                                                    </p>
                                                    <p className="text-slate-500 font-medium leading-relaxed text-[11px] md:text-xs pt-1">
                                                        {currentVocab.description_vi}
                                                    </p>
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

function getKoreanDescription(descVi: string, wordKr: string): string {
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
        "Biển chỉ dẫn mở cửa bằng cách kéo/trượt cánh cửa sang bên trái hoặc bên hợp lý để mở rộng lối đi.": 
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
        return `안전 및 구조 장비 위치(${wordKr})를 안내하여 비상시 대처 teôi 돕는 표지판입니다.`;
    }
    if (descVi.startsWith("Biển báo này cung cấp chỉ dẫn và thông điệp an toàn tại nơi làm việc: ") && descVi.includes(" để bảo vệ bản thân và đồng nghiệp.")) {
        return `본인과 동료를 보호하기 위해 작업장 내 안전 수칙(${wordKr})을 알려주는 표지판입니다.`;
    }

    return `본인과 동료를 보호하기 위해 작업장 내 안전 수칙(${wordKr})을 알려주는 표지판입니다.`;
}
