'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Play, Eye, RefreshCw, CheckCircle, XCircle, ArrowLeft, Menu } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { toast } from 'sonner'
import { FlashcardMode, MeaningQuizMode, WordSortMode } from './ListenOnlyModes'

interface InterviewPracticeScreenProps {
    questions: any[]
    mode: 'flashcard' | 'meaning_quiz' | 'word_sort' | 'ai_mock'
    onFinish: (answers?: Record<string, string>, newlyMasteredIds?: string[]) => void
    onBack?: () => void
    initialAutoPlay?: boolean
}

export function InterviewPracticeScreen({ questions, mode, onFinish, onBack, initialAutoPlay = false }: InterviewPracticeScreenProps) {
    const [queue, setQueue] = useState<number[]>(questions.map((_, i) => i))
    const currentQIndex = queue.length > 0 ? queue[0] : null
    const currentQ = currentQIndex !== null ? questions[currentQIndex] : null

    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    const isListenOnly = mode !== 'ai_mock'
    const [playbackRate, setPlaybackRate] = useState<number>(1.0)
    const [isAutoPlay, setIsAutoPlay] = useState<boolean>(initialAutoPlay)

    // Audio states
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [audioState, setAudioState] = useState<'idle' | 'playing' | 'ended' | 'error'>('idle')

    // Timer states
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // UI states
    const [answers, setAnswers] = useState<Record<string, string>>({})

    // Speech Recognition
    const recognitionLang = currentQ?.category === 'Khẩu lệnh' ? 'vi-VN' : 'ko-KR'
    const { 
        hasBrowserSupport, 
        isRecording, 
        transcript, 
        interimTranscript,
        startRecording, 
        stopRecording, 
        resetTranscript 
    } = useSpeechRecognition(recognitionLang)

    const reviewModesRef = useRef<Record<number, 'meaning_quiz' | 'word_sort'>>({})
    const failedIdsRef = useRef<Set<string>>(new Set())
    const masteredIdsRef = useRef<Set<string>>(new Set())

    const jumpToQuestion = (index: number) => {
        const newQueue = [...queue];
        const currentIndex = newQueue.indexOf(index);
        if (currentIndex > -1) {
            newQueue.splice(currentIndex, 1);
        }
        setQueue([index, ...newQueue]);
        setIsDrawerOpen(false);
    }

    // Reset everything when question changes
    useEffect(() => {
        if (!currentQ) return

        setAudioState('idle')
        setTimeLeft(null)
        resetTranscript()
        if (isRecording) stopRecording()
        
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }

        if (currentQ.question_audio_url && audioRef.current) {
            audioRef.current.src = currentQ.question_audio_url
            audioRef.current.playbackRate = playbackRate
            // Do NOT call load() to avoid race conditions
            audioRef.current.play().catch(err => {
                if (err.name === 'AbortError') {
                    console.warn('Audio play interrupted (Strict Mode/Cleanup):', err)
                } else {
                    console.error("Audio play error:", err)
                    setAudioState('error')
                }
            })
        } else if (currentQ.question_text && 'speechSynthesis' in window) {
            // Fallback to Browser's Built-in TTS AI (Text-to-Speech)
            const utterance = new SpeechSynthesisUtterance(currentQ.question_text)
            utterance.lang = 'ko-KR'
            utterance.rate = 0.9 * playbackRate // Read slightly slower for clarity
            
            utterance.onstart = () => setAudioState('playing')
            utterance.onend = () => handleAudioEnded()
            utterance.onerror = (err: any) => {
                if (err.error === 'interrupted' || err.error === 'canceled') {
                    console.warn("TTS interrupted (Strict Mode/Cleanup):", err.error)
                } else {
                    console.error("TTS Error:", err.error)
                    // Bỏ qua lỗi TTS (ví dụ máy ko có giọng Hàn), cho phép chuyển luôn sang bước đếm ngược
                    handleAudioEnded()
                }
            }
            
            window.speechSynthesis.cancel() // Stop any previous speech
            window.speechSynthesis.speak(utterance)
        } else {
            // No audio and no TTS support, just trigger ended immediately
            handleAudioEnded()
        }

        return () => {
            if (audioRef.current) audioRef.current.pause()
            if ('speechSynthesis' in window) window.speechSynthesis.cancel()
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [currentQIndex, currentQ, playbackRate])

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate
        }
    }, [playbackRate])

    const handleAudioPlay = () => setAudioState('playing')
    
    const handleAudioEnded = () => {
        setAudioState('ended')
        let countdownSeconds = currentQ.countdown_after_audio || 5
        if (isAutoPlay) countdownSeconds = 1 // Flip faster in auto-play mode

        setTimeLeft(countdownSeconds)

        // Start countdown timer
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

    const handleAudioError = () => {
        setAudioState('error')
        toast.error('Lỗi khi tải file nghe')
    }

    const replayAudio = () => {
        if (currentQ.question_audio_url && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.playbackRate = playbackRate
            audioRef.current.play().catch(console.error)
        } else if (currentQ.question_text && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(currentQ.question_text)
            utterance.lang = 'ko-KR'
            utterance.rate = 0.9 * playbackRate
            utterance.onstart = () => setAudioState('playing')
            utterance.onend = () => handleAudioEnded()
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(utterance)
        }
    }

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording()
        } else {
            startRecording()
        }
    }

    const handleKnown = () => {
        if (!failedIdsRef.current.has(currentQ.id)) {
            masteredIdsRef.current.add(currentQ.id)
        }

        if (queue.length <= 1) {
            onFinish(answers, Array.from(masteredIdsRef.current))
        } else {
            setQueue(prev => prev.slice(1))
        }
    }

    const handleNotKnown = () => {
        failedIdsRef.current.add(currentQ.id)

        if (queue.length <= 1) {
            onFinish(answers, Array.from(masteredIdsRef.current))
        } else {
            setQueue(prev => {
                const newQ = [...prev.slice(1)]
                newQ.push(prev[0])
                return newQ
            })
            // Reset for the next question
            setAudioState('idle')
            setTimeLeft(null)
            resetTranscript()
            replayAudio()
        }
    }

    const handleSaveAnswer = () => {
        if (!transcript.trim()) {
            toast.error('Chưa ghi nhận được giọng nói. Vui lòng thử lại.')
            return
        }

        const newAnswers = { ...answers, [currentQ.id]: transcript }
        setAnswers(newAnswers)
        
        handleKnown()
    }

    const handleNext = () => {
        handleKnown()
    }

    if (!currentQ) return null

    return (
        <div className="max-w-4xl mx-auto p-3 md:p-8 space-y-4 md:space-y-8">
            <audio
                ref={audioRef}
                onPlay={handleAudioPlay}
                onEnded={handleAudioEnded}
                onError={handleAudioError}
                className="hidden"
            />

            {/* Header / Progress */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0 mr-1" title="Quay lại thiết lập">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Button>
                    )}
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs md:text-sm font-semibold hidden md:inline-block">
                        {currentQ.category}
                    </span>
                    <span className="text-xs md:text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {isListenOnly ? 'Chỉ luyện nghe' : 'Thi thử với AI'}
                    </span>
                    {isListenOnly && (
                        <div className="flex flex-wrap items-center gap-2 ml-auto md:ml-2">
                            <div className="flex items-center bg-gray-50/80 rounded-full border border-gray-200 p-0.5 shadow-sm">
                                <span className="text-[11px] uppercase tracking-wider text-gray-500 pl-2 pr-1 font-bold">Tốc độ</span>
                                <div className="flex items-center gap-0.5">
                                    {[0.8, 1.0, 1.2].map(rate => (
                                        <button 
                                            key={rate}
                                            onClick={() => setPlaybackRate(rate)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 ${playbackRate === rate ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-600 hover:bg-gray-200'}`}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {mode === 'flashcard' && (
                                <button
                                    onClick={() => setIsAutoPlay(!isAutoPlay)}
                                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm font-bold transition-all duration-300 shadow-sm ${isAutoPlay ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-indigo-200 shadow-lg scale-105' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
                                    title="Tự động lật và chuyển câu"
                                >
                                    {isAutoPlay ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                                    <span className="hidden sm:inline">Tự động phát</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 w-full md:w-56 shrink-0 bg-gray-50/50 px-3 py-2 rounded-full border border-gray-100">
                    <div className="text-xs font-bold text-gray-500 whitespace-nowrap min-w-[3rem] text-right">
                        {questions.length - queue.length + 1} / {questions.length}
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out relative" 
                            style={{ width: `${Math.max(5, ((questions.length - queue.length + 1) / questions.length) * 100)}%` }}
                        >
                            <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Question Area */}
            <div className="bg-white rounded-2xl border shadow-sm p-5 md:p-8 text-center space-y-6 md:space-y-8 relative overflow-hidden">
                {/* Timer and Replay (Non-Autoplay) */}
                {mode !== 'word_sort' && !isAutoPlay && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 min-h-[4rem]">
                        {/* Status / Visualizer */}
                        {audioState === 'playing' && (
                            <div className="flex items-center gap-2 bg-blue-50/50 px-5 py-2.5 rounded-full border border-blue-100">
                                <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-6 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
                                <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                                <span className="ml-2 text-sm text-blue-600 font-medium">Giám khảo đang đọc câu hỏi...</span>
                            </div>
                        )}

                        {/* Timer */}
                        {audioState === 'ended' && timeLeft !== null && (
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full border-4 shadow-sm animate-in zoom-in duration-300 ${timeLeft > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                    <span className="text-xl md:text-2xl font-black">
                                        {timeLeft.toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="text-left">
                                    {timeLeft > 0 ? (
                                        <p className="text-blue-600/80 text-sm font-semibold uppercase tracking-wider">Thời gian suy nghĩ</p>
                                    ) : (
                                        <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Đã hết thời gian!</p>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {audioState === 'error' && (
                            <div className="text-red-500 text-sm font-medium">Lỗi tải âm thanh. Bạn có thể thử lại.</div>
                        )}

                        {/* Replay Button */}
                        {(audioState === 'ended' || audioState === 'error') && (
                            <Button variant="outline" size="sm" onClick={replayAudio} className="rounded-full h-10 md:h-12 px-5 text-sm md:text-base hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
                                <Play className="w-4 h-4 mr-2" />
                                Nghe lại câu hỏi
                            </Button>
                        )}
                    </div>
                )}

                {/* Mode Specific UI */}
                {(isAutoPlay || (isListenOnly && audioState === 'playing') || (audioState === 'ended' && (timeLeft !== null || mode === 'word_sort'))) && (
                    <div className={`w-full max-w-2xl mx-auto transition-all duration-500 ${isAutoPlay ? 'mt-0' : 'mt-2'}`}>
                            {isListenOnly ? (
                                <div className="space-y-4">
                                    {mode === 'flashcard' && (
                                        <FlashcardMode 
                                            currentQ={currentQ} 
                                            onKnown={handleKnown} 
                                            onNotKnown={handleNotKnown} 
                                            timeLeft={timeLeft} 
                                            isAutoPlay={isAutoPlay}
                                            questions={questions}
                                        />
                                    )}
                                    {mode === 'meaning_quiz' && (
                                        <MeaningQuizMode 
                                            currentQ={currentQ} 
                                            onKnown={handleKnown} 
                                            onNotKnown={handleNotKnown} 
                                            timeLeft={timeLeft}
                                            questions={questions}
                                        />
                                    )}
                                    {mode === 'word_sort' && (
                                        <WordSortMode 
                                            currentQ={currentQ} 
                                            onKnown={handleKnown} 
                                            onNotKnown={handleNotKnown} 
                                            timeLeft={timeLeft} 
                                        />
                                    )}
                                </div>
                            ) : (
                                // AI MOCK MODE
                                <div className="space-y-6">
                                    {!hasBrowserSupport && (
                                        <div className="text-red-500 text-sm">
                                            Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng sử dụng Chrome/Edge.
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-col items-center gap-4">
                                        <Button
                                            size="lg"
                                            variant={isRecording ? "destructive" : "default"}
                                            className={`w-16 h-16 md:w-20 md:h-20 rounded-full shadow-lg transition-all ${isRecording ? 'scale-110 shadow-red-200 shadow-2xl' : 'hover:scale-105'}`}
                                            onClick={toggleRecording}
                                            disabled={!hasBrowserSupport || (timeLeft || 0) > 0}
                                        >
                                            {isRecording ? <Square className="w-6 h-6 md:w-8 md:h-8" /> : <Mic className="w-6 h-6 md:w-8 md:h-8" />}
                                        </Button>

                                        {isRecording && (
                                            <div className="flex items-center justify-center gap-1.5 h-8 mt-2">
                                                <div className="w-1.5 h-full bg-red-500 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-1.5 h-2/3 bg-red-400 rounded-full animate-[bounce_0.8s_infinite]" style={{ animationDelay: '100ms' }}></div>
                                                <div className="w-1.5 h-full bg-red-500 rounded-full animate-[bounce_1.2s_infinite]" style={{ animationDelay: '200ms' }}></div>
                                                <div className="w-1.5 h-1/2 bg-red-400 rounded-full animate-[bounce_0.9s_infinite]" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-1.5 h-4/5 bg-red-500 rounded-full animate-[bounce_1.1s_infinite]" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        )}
                                        
                                        <div className="text-sm text-gray-500 font-medium flex flex-col items-center gap-2">
                                            <span>
                                                {(timeLeft || 0) > 0 
                                                    ? 'Vui lòng chờ hết thời gian suy nghĩ' 
                                                    : isRecording ? 'Đang ghi âm... Chạm để kết thúc' : 'Chạm 1 lần để bắt đầu trả lời'}
                                            </span>
                                            {currentQ?.category === 'Khẩu lệnh' && (timeLeft || 0) <= 0 && !isRecording && (
                                                <span className="text-blue-700 bg-blue-100 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                                    💡 Yêu cầu: Trả lời bằng Tiếng Việt
                                                </span>
                                            )}
                                        </div>

                                        {(transcript || interimTranscript) && (
                                            <div className="w-full bg-gray-50 p-3 md:p-4 rounded-lg border text-left mt-2">
                                                <p className="text-sm font-semibold text-gray-600 mb-1">Bạn đang nói:</p>
                                                <p className="text-sm md:text-base text-gray-900">{transcript} <span className="text-gray-400">{interimTranscript}</span></p>
                                                {!isRecording && transcript && (
                                                    <div className="flex gap-2 mt-4">
                                                        <Button variant="outline" size="sm" onClick={resetTranscript} className="flex-1">
                                                            <RefreshCw className="w-4 h-4 mr-2" /> Nói lại
                                                        </Button>
                                                        <Button size="sm" onClick={handleSaveAnswer} className="flex-1">
                                                            {queue.length > 1 ? 'Ghi nhận & Tiếp tục' : 'Nộp bài & Chấm điểm'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
            </div>

            {/* Footer Nav & FAB */}
            <div className="flex justify-between items-center pt-4">
                <Button variant="outline" size="lg" onClick={() => setIsDrawerOpen(true)} className="rounded-full font-semibold text-gray-700 bg-white hover:text-blue-600 hover:bg-blue-50 border-gray-200 shadow-sm">
                    <Menu className="w-5 h-5 mr-2" /> Danh sách câu
                </Button>
                <Button size="lg" onClick={handleNext} className="rounded-xl px-8 shadow-sm">
                    {queue.length > 1 ? 'Câu tiếp theo' : 'Hoàn thành'}
                </Button>
            </div>

            {/* Side Drawer for Questions List */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)}>
                    <div className="w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50/80 backdrop-blur-md">
                            <h3 className="font-bold text-lg text-gray-800">Danh sách câu hỏi</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(false)} className="rounded-full hover:bg-gray-200 transition-colors">
                                <XCircle className="w-6 h-6 text-gray-500" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {questions.map((q, idx) => {
                                const isActive = idx === currentQIndex;
                                const isDone = !queue.includes(idx) && idx !== currentQIndex;
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => jumpToQuestion(idx)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200
                                            ${isActive ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm scale-[1.02]' : 
                                              isDone ? 'bg-gray-50/50 border-gray-200 text-gray-400' : 
                                              'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:-translate-y-0.5'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className={isActive ? 'font-bold' : ''}>Câu {idx + 1}</span>
                                            {isActive && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm animate-pulse"></div>}
                                            {isDone && <CheckCircle className="w-4 h-4 text-green-500 opacity-80" />}
                                        </div>
                                        <div className={`mt-1 text-xs line-clamp-1 ${isActive ? 'text-blue-500/80' : 'text-gray-400'}`}>
                                            {q.question_text}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
