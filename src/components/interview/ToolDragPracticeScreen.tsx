'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, ArrowRight, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

interface ToolDragPracticeScreenProps {
    questions: any[]
    onFinish: () => void
    onBack?: () => void
}

const ZONE_LABELS: Record<string, string> = {
    'shelf_top_left': 'Kệ trên (Trái)',
    'shelf_bottom_left': 'Kệ dưới (Trái)',
    'machine_panel': 'Bảng điều khiển / Máy móc',
    'work_area': 'Khu vực thi công',
    'toolbox_center': 'Hộp công cụ chung',
    'special_box': 'Hộp chuyên dụng',
    'shelf_top_right': 'Kệ trên (Phải)',
    'shelf_bottom_right': 'Kệ dưới (Phải)'
}

export function ToolDragPracticeScreen({ questions, onFinish, onBack }: ToolDragPracticeScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const currentQ = questions[currentIndex]

    // Audio states
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [audioState, setAudioState] = useState<'idle' | 'playing' | 'ended' | 'error'>('idle')

    // Timer states
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Result
    const [result, setResult] = useState<'idle' | 'correct' | 'incorrect'>('idle')
    const [droppedZone, setDroppedZone] = useState<string | null>(null)

    // Drag states
    const [isDragging, setIsDragging] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const startPos = useRef({ x: 0, y: 0 })
    const toolRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!currentQ) return

        setAudioState('idle')
        setTimeLeft(null)
        setResult('idle')
        setDroppedZone(null)
        setPosition({ x: 0, y: 0 })
        
        if (timerRef.current) clearInterval(timerRef.current)

        if (currentQ.question_audio_url && audioRef.current) {
            audioRef.current.src = currentQ.question_audio_url
            audioRef.current.play().catch(err => {
                if (err.name === 'AbortError') {
                    console.warn('Audio play interrupted (Strict Mode/Cleanup):', err)
                } else {
                    console.error("Audio error:", err)
                    setAudioState('error')
                }
            })
        } else if (currentQ.question_text && 'speechSynthesis' in window) {
            // Fallback to Browser's Built-in TTS AI (Text-to-Speech)
            const utterance = new SpeechSynthesisUtterance(currentQ.question_text)
            utterance.lang = 'ko-KR'
            utterance.rate = 0.9 // Read slightly slower for clarity
            
            utterance.onstart = () => setAudioState('playing')
            utterance.onend = () => handleAudioEnded()
            utterance.onerror = (err: any) => {
                if (err.error === 'interrupted' || err.error === 'canceled') {
                    console.warn("TTS interrupted (Strict Mode/Cleanup):", err.error)
                } else {
                    console.error("TTS Error:", err.error)
                    // Bỏ qua lỗi TTS, cho phép chuyển luôn sang bước đếm ngược
                    handleAudioEnded()
                }
            }
            
            window.speechSynthesis.cancel() // Stop any previous speech
            window.speechSynthesis.speak(utterance)
        } else {
            // No audio and no TTS support
            handleAudioEnded()
        }

        return () => {
            if (audioRef.current) audioRef.current.pause()
            if ('speechSynthesis' in window) window.speechSynthesis.cancel()
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [currentIndex, currentQ])

    const handleAudioEnded = () => {
        setAudioState('ended')
        const countdownSeconds = currentQ.countdown_after_audio || 10
        setTimeLeft(countdownSeconds)

        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    const replayAudio = () => {
        if (currentQ.question_audio_url && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(console.error)
        } else if (currentQ.question_text && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(currentQ.question_text)
            utterance.lang = 'ko-KR'
            utterance.rate = 0.9
            utterance.onstart = () => setAudioState('playing')
            utterance.onend = () => setAudioState('ended')
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(utterance)
        }
    }

    // Drag Logic (Supports Mouse & Touch)
    const handlePointerDown = (e: React.PointerEvent) => {
        if (audioState !== 'ended' || timeLeft === 0 || result !== 'idle') return
        
        e.preventDefault()
        setIsDragging(true)
        startPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        }
        
        // Cần gắn sự kiện vào document để khi di chuột ra khỏi item vẫn nhận
        document.addEventListener('pointermove', handlePointerMove)
        document.addEventListener('pointerup', handlePointerUp)
    }

    const handlePointerMove = (e: PointerEvent) => {
        e.preventDefault()
        setPosition({
            x: e.clientX - startPos.current.x,
            y: e.clientY - startPos.current.y
        })
    }

    const handlePointerUp = (e: PointerEvent) => {
        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('pointerup', handlePointerUp)
        setIsDragging(false)

        // Reset display to point for elementFromPoint
        if (toolRef.current) {
            toolRef.current.style.visibility = 'hidden'
        }

        const dropTarget = document.elementFromPoint(e.clientX, e.clientY)
        
        if (toolRef.current) {
            toolRef.current.style.visibility = 'visible'
        }

        const zone = dropTarget?.closest('[data-zone-id]')
        
        if (zone) {
            const zoneId = zone.getAttribute('data-zone-id')
            setDroppedZone(zoneId)
            
            // Chấm điểm
            if (zoneId === currentQ.target_zone_id) {
                setResult('correct')
            } else {
                setResult('incorrect')
            }
            if (timerRef.current) clearInterval(timerRef.current)
        } else {
            // Drop outside -> reset position
            setPosition({ x: 0, y: 0 })
        }
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            onFinish()
        }
    }

    if (!currentQ) return null

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6 select-none touch-none">
            <audio ref={audioRef} onPlay={() => setAudioState('playing')} onEnded={handleAudioEnded} onError={() => setAudioState('error')} className="hidden" />

            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm gap-2">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" title="Quay lại thiết lập">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Button>
                    )}
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold whitespace-nowrap">
                        Sử dụng công cụ
                    </span>
                </div>
                <div className="text-sm font-semibold text-gray-600">
                    Câu {currentIndex + 1} / {questions.length}
                </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-4 relative overflow-hidden min-h-[600px] flex flex-col">
                
                <div className="text-center space-y-2 mb-6 z-10">
                    {audioState === 'playing' ? (
                        <div className="text-blue-600 font-medium animate-pulse">Giám khảo đang ra lệnh...</div>
                    ) : (
                        <div className="flex justify-center items-center gap-4">
                            <Button variant="outline" size="sm" onClick={replayAudio}>
                                <Play className="w-4 h-4 mr-2" /> Nghe lại
                            </Button>
                            <div className={`text-3xl font-black ${timeLeft && timeLeft > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                {timeLeft}s
                            </div>
                        </div>
                    )}
                </div>

                {/* Kết quả */}
                {result !== 'idle' && (
                    <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-50 px-6 md:px-8 py-3 md:py-4 rounded-full shadow-2xl font-bold text-lg md:text-2xl animate-in zoom-in bounce text-center whitespace-nowrap ${result === 'correct' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {result === 'correct' ? '정답입니다! (Chính xác)' : '틀렸습니다! (Sai rồi)'}
                    </div>
                )}
                
                {/* Background Factory / Workspace */}
                <div className="relative w-full max-w-4xl h-[450px] md:h-[500px] bg-slate-50 rounded-2xl border-4 border-slate-200 mx-auto overflow-hidden shadow-inner flex">
                    
                    {/* Kệ Trái */}
                    <div className="w-20 md:w-48 shrink-0 h-full flex flex-col border-r-4 border-slate-200 bg-slate-100">
                        <div className={`flex-1 border-b-4 border-slate-200 flex items-center justify-center p-1 md:p-2 relative transition-colors ${droppedZone === 'shelf_top_left' ? 'bg-blue-200' : ''}`} data-zone-id="shelf_top_left">
                            <span className="text-slate-500 font-bold text-center text-[10px] md:text-base select-none leading-tight">KỆ TRÊN<br/>(TRÁI)</span>
                        </div>
                        <div className={`flex-1 flex items-center justify-center p-1 md:p-2 relative transition-colors ${droppedZone === 'shelf_bottom_left' ? 'bg-blue-200' : ''}`} data-zone-id="shelf_bottom_left">
                            <span className="text-slate-500 font-bold text-center text-[10px] md:text-base select-none leading-tight">KỆ DƯỚI<br/>(TRÁI)</span>
                        </div>
                    </div>

                    {/* Khu vực trung tâm (Máy móc & Bàn làm việc) */}
                    <div className="flex-1 h-full flex flex-col p-2 md:p-6 gap-2 md:gap-6 relative min-w-0">
                        {/* Bảng điều khiển / Máy móc */}
                        <div className={`h-24 md:h-32 border-4 border-dashed rounded-xl flex items-center justify-center relative transition-colors ${droppedZone === 'machine_panel' ? 'bg-blue-200 border-blue-400' : 'bg-blue-50 border-blue-200'}`} data-zone-id="machine_panel">
                            <span className="text-blue-500 font-bold text-[10px] md:text-xl select-none text-center leading-tight">MÁY MÓC<br/>BẢNG ĐIỀU KHIỂN</span>
                        </div>

                        {/* Khu vực thi công */}
                        <div className={`flex-1 border-4 border-dashed rounded-xl flex items-center justify-center relative transition-colors ${droppedZone === 'work_area' ? 'bg-amber-200 border-amber-400' : 'bg-amber-50 border-amber-200'}`} data-zone-id="work_area">
                            <span className="text-amber-500 font-bold text-xs md:text-xl select-none text-center">KHU VỰC THI CÔNG</span>
                        </div>

                        {/* Các hộp chứa */}
                        <div className="h-20 md:h-28 flex gap-2 md:gap-6">
                            <div className={`flex-1 border-4 rounded-xl flex items-center justify-center relative shadow-sm transition-colors ${droppedZone === 'toolbox_center' ? 'bg-orange-200 border-orange-400' : 'bg-orange-50 border-orange-200'}`} data-zone-id="toolbox_center">
                                <span className="text-orange-500 font-bold select-none text-center text-[10px] md:text-base leading-tight">HỘP CÔNG CỤ<br/>CHUNG</span>
                            </div>
                            <div className={`flex-1 border-4 rounded-xl flex items-center justify-center relative shadow-sm transition-colors ${droppedZone === 'special_box' ? 'bg-purple-200 border-purple-400' : 'bg-purple-50 border-purple-200'}`} data-zone-id="special_box">
                                <span className="text-purple-500 font-bold select-none text-center text-[10px] md:text-base leading-tight">HỘP<br/>CHUYÊN DỤNG</span>
                            </div>
                        </div>
                    </div>

                    {/* Kệ Phải */}
                    <div className="w-20 md:w-48 shrink-0 h-full flex flex-col border-l-4 border-slate-200 bg-slate-100">
                        <div className={`flex-1 border-b-4 border-slate-200 flex items-center justify-center p-1 md:p-2 relative transition-colors ${droppedZone === 'shelf_top_right' ? 'bg-blue-200' : ''}`} data-zone-id="shelf_top_right">
                            <span className="text-slate-500 font-bold text-center text-[10px] md:text-base select-none leading-tight">KỆ TRÊN<br/>(PHẢI)</span>
                        </div>
                        <div className={`flex-1 flex items-center justify-center p-1 md:p-2 relative transition-colors ${droppedZone === 'shelf_bottom_right' ? 'bg-blue-200' : ''}`} data-zone-id="shelf_bottom_right">
                            <span className="text-slate-500 font-bold text-center text-[10px] md:text-base select-none leading-tight">KỆ DƯỚI<br/>(PHẢI)</span>
                        </div>
                    </div>

                    {/* Tool Item (Draggable) */}
                    {currentQ.tool_image_url && (
                        <div 
                            ref={toolRef}
                            onPointerDown={handlePointerDown}
                            style={{ 
                                transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${isDragging ? 1.1 : 1})`,
                                cursor: (audioState !== 'ended' || timeLeft === 0) ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
                                zIndex: isDragging ? 100 : 10,
                                touchAction: 'none'
                            }}
                            className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-xl shadow-lg border-2 flex items-center justify-center transition-transform ${isDragging ? 'border-blue-500 shadow-2xl' : 'border-gray-300'} ${audioState !== 'ended' ? 'opacity-50 grayscale' : ''}`}
                        >
                            <img src={currentQ.tool_image_url} alt="Tool" className="w-16 h-16 object-contain pointer-events-none" />
                        </div>
                    )}
                </div>

                {result !== 'idle' && (
                    <div className="mt-6 flex flex-col gap-4 items-center">
                        <div className="p-4 bg-gray-50 border rounded-xl w-full">
                            <p className="font-semibold text-gray-700">Lời thoại gốc:</p>
                            <p className="text-lg text-gray-900 font-medium">{currentQ.question_text}</p>
                            <p className="text-gray-600 mt-1">{currentQ.vietnamese_meaning}</p>
                            <p className="mt-3 text-sm md:text-base font-semibold text-blue-700 flex items-center gap-2">
                                💡 Vị trí cần thả đúng là: <span className="px-3 py-1 bg-blue-100 rounded-lg">{ZONE_LABELS[currentQ.target_zone_id] || currentQ.target_zone_id}</span>
                            </p>
                        </div>
                        <Button size="lg" onClick={handleNext} className="w-full md:w-auto px-10">
                            {currentIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành bài tập'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
