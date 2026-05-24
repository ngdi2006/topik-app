'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Play, Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { toast } from 'sonner'

interface InterviewPracticeScreenProps {
    questions: any[]
    mode: 'listen_only' | 'ai_mock'
    onFinish: (answers?: Record<string, string>) => void
}

export function InterviewPracticeScreen({ questions, mode, onFinish }: InterviewPracticeScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const currentQ = questions[currentIndex]

    // Audio states
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [audioState, setAudioState] = useState<'idle' | 'playing' | 'ended' | 'error'>('idle')

    // Timer states
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // UI states
    const [showAnswer, setShowAnswer] = useState(false)
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

    // Reset everything when question changes
    useEffect(() => {
        if (!currentQ) return

        setAudioState('idle')
        setTimeLeft(null)
        setShowAnswer(false)
        resetTranscript()
        if (isRecording) stopRecording()
        
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }

        if (currentQ.question_audio_url && audioRef.current) {
            audioRef.current.src = currentQ.question_audio_url
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
            utterance.rate = 0.9 // Read slightly slower for clarity
            
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
    }, [currentIndex, currentQ])

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

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording()
        } else {
            startRecording()
        }
    }

    const handleSaveAnswer = () => {
        if (!transcript.trim()) {
            toast.error('Chưa ghi nhận được giọng nói. Vui lòng thử lại.')
            return
        }

        const newAnswers = { ...answers, [currentQ.id]: transcript }
        setAnswers(newAnswers)
        
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            onFinish(newAnswers)
        }
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            onFinish(answers)
        }
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
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs md:text-sm font-semibold">
                        {currentQ.category}
                    </span>
                    <span className="text-xs md:text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {mode === 'listen_only' ? 'Chỉ luyện nghe' : 'Thi thử với AI'}
                    </span>
                </div>
                <div className="text-xs md:text-sm font-semibold text-gray-600 bg-gray-50 border px-4 py-1.5 rounded-full w-full md:w-auto text-center">
                    Câu {currentIndex + 1} / {questions.length}
                </div>
            </div>

            {/* Main Question Area */}
            <div className="bg-white rounded-2xl border shadow-sm p-5 md:p-8 text-center space-y-6 md:space-y-8 relative overflow-hidden">
                {/* Visualizer / Timer */}
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
                    {audioState === 'ended' && timeLeft !== null && (
                        <div className="w-full max-w-lg mt-4 transition-all duration-500">
                            {mode === 'listen_only' ? (
                                <div className="space-y-4">
                                    {!showAnswer ? (
                                        <Button 
                                            size="lg" 
                                            className="w-full text-lg h-14 rounded-xl"
                                            onClick={() => setShowAnswer(true)}
                                            disabled={timeLeft > 0} // Có thể block không cho xem đáp án nếu chưa hết giờ suy nghĩ
                                        >
                                            <Eye className="w-5 h-5 mr-2" />
                                            Xem nội dung & đáp án
                                        </Button>
                                    ) : (
                                        <div className="text-left space-y-4 animate-in slide-in-from-bottom-4">
                                            <div className="bg-blue-50 p-4 md:p-6 rounded-xl border border-blue-100">
                                                <h4 className="font-semibold text-blue-900 mb-2">Lời thoại giám khảo:</h4>
                                                <p className="text-lg font-medium text-gray-900">{currentQ.question_text}</p>
                                                {currentQ.vietnamese_meaning && (
                                                    <p className="text-gray-600 mt-2">{currentQ.vietnamese_meaning}</p>
                                                )}
                                            </div>
                                            {currentQ.suggested_answers && currentQ.suggested_answers.length > 0 && (
                                                <div className="bg-emerald-50 p-4 md:p-6 rounded-xl border border-emerald-100">
                                                    <h4 className="font-semibold text-emerald-900 mb-2">Gợi ý trả lời:</h4>
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        {currentQ.suggested_answers.map((ans: string, i: number) => (
                                                            <li key={i} className="text-gray-800">{ans}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
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
                                            disabled={!hasBrowserSupport || timeLeft > 0}
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
                                                {timeLeft > 0 
                                                    ? 'Vui lòng chờ hết thời gian suy nghĩ' 
                                                    : isRecording ? 'Đang ghi âm... Chạm để kết thúc' : 'Chạm 1 lần để bắt đầu trả lời'}
                                            </span>
                                            {currentQ?.category === 'Khẩu lệnh' && timeLeft <= 0 && !isRecording && (
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
                                                            {currentIndex < questions.length - 1 ? 'Ghi nhận & Tiếp tục' : 'Nộp bài & Chấm điểm'}
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

            {/* Footer Nav */}
            <div className="flex justify-end pt-4">
                <Button size="lg" onClick={handleNext} className="rounded-xl px-8">
                    {currentIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành'}
                </Button>
            </div>
        </div>
    )
}
