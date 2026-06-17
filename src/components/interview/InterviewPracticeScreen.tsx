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
    onFinish: (answers?: Record<string, string>) => void
    onBack?: () => void
}

export function InterviewPracticeScreen({ questions, mode, onFinish, onBack }: InterviewPracticeScreenProps) {
    const [queue, setQueue] = useState<number[]>(questions.map((_, i) => i))
    const currentQIndex = queue.length > 0 ? queue[0] : null
    const currentQ = currentQIndex !== null ? questions[currentQIndex] : null

    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    const isListenOnly = mode !== 'ai_mock'
    const [playbackRate, setPlaybackRate] = useState<number>(1.0)

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
        const countdownSeconds = currentQ.countdown_after_audio || 5
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
        if (queue.length <= 1) {
            onFinish(answers)
        } else {
            setQueue(prev => prev.slice(1))
        }
    }

    const handleNotKnown = () => {
        if (queue.length <= 1) {
            onFinish(answers)
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
                        <div className="flex items-center gap-1 ml-2 bg-gray-50 rounded-full border p-0.5">
                            <span className="text-xs text-gray-500 pl-2 pr-1 font-medium">Tốc độ:</span>
                            {[0.8, 1.0, 1.2].map(rate => (
                                <button 
                                    key={rate}
                                    onClick={() => setPlaybackRate(rate)}
                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${playbackRate === rate ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {rate}x
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="text-xs md:text-sm font-semibold text-gray-600 bg-gray-50 border px-4 py-1.5 rounded-full w-full md:w-auto text-center">
                    Còn {queue.length} câu (Tổng: {questions.length})
                </div>
            </div>

            {/* Main Question Area */}
            <div className="bg-white rounded-2xl border shadow-sm p-5 md:p-8 text-center space-y-6 md:space-y-8 relative overflow-hidden">
                {/* Visualizer / Timer */}
                {mode !== 'word_sort' && (
                    <div className="h-32 flex flex-col items-center justify-center">
                        {audioState === 'playing' && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-8 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-12 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
                                <div className="w-2 h-8 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                                <span className="ml-4 text-blue-600 font-medium">Giám khảo đang đọc câu hỏi...</span>
                            </div>
                        )}

                        {audioState === 'ended' && timeLeft !== null && (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                <div className={`text-5xl md:text-6xl font-black ${timeLeft > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {timeLeft}s
                                </div>
                                {timeLeft > 0 ? (
                                    <p className="text-gray-500 mt-2 font-medium">Thời gian suy nghĩ...</p>
                                ) : (
                                    <p className="text-gray-500 mt-2 font-medium">Hết thời gian suy nghĩ!</p>
                                )}
                            </div>
                        )}
                        
                        {audioState === 'error' && (
                            <div className="text-red-500 font-medium">Lỗi tải âm thanh. Bạn có thể bỏ qua hoặc thử lại.</div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col items-center justify-center gap-6">
                    {/* Replay audio button (always available after playing once) */}
                    {(audioState === 'ended' || audioState === 'error') && (
                        <Button variant="outline" onClick={replayAudio} className="rounded-full">
                            <Play className="w-4 h-4 mr-2" />
                            Nghe lại câu hỏi
                        </Button>
                    )}

                    {/* Mode Specific UI */}
                    {audioState === 'ended' && (timeLeft !== null || mode === 'word_sort') && (
                        <div className="w-full max-w-2xl mt-4 transition-all duration-500">
                            {isListenOnly ? (
                                <div className="space-y-4">
                                    {mode === 'flashcard' && (
                                        <FlashcardMode 
                                            currentQ={currentQ} 
                                            onKnown={handleKnown} 
                                            onNotKnown={handleNotKnown} 
                                            timeLeft={timeLeft || 0} 
                                        />
                                    )}
                                    {mode === 'meaning_quiz' && (
                                        <MeaningQuizMode 
                                            currentQ={currentQ} 
                                            onKnown={handleKnown} 
                                            onNotKnown={handleNotKnown} 
                                            timeLeft={timeLeft || 0}
                                            questions={questions}
                                        />
                                    )}
                                    {mode === 'word_sort' && (
                                        <WordSortMode 
                                            currentQ={currentQ} 
                                            onKnown={handleKnown} 
                                            onNotKnown={handleNotKnown} 
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
