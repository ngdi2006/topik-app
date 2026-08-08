'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Play, Eye, EyeOff, RefreshCw, CheckCircle, XCircle, ArrowLeft, Menu } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { toast } from 'sonner'
import { FlashcardMode, MeaningQuizMode, WordSortMode } from './ListenOnlyModes'
import { speakText, stopTTS } from '@/lib/tts'

interface InterviewPracticeScreenProps {
    questions: any[]
    mode: 'flashcard' | 'meaning_quiz' | 'word_sort' | 'ai_mock'
    onFinish: (answers?: Record<string, string>, newlyMasteredIds?: string[]) => void
    onBack?: () => void
    initialAutoPlay?: boolean
}

const CHUNK_DICTIONARY: Record<string, string> = {
    '성함이': 'Tên (kính ngữ)',
    '어떻게': 'như thế nào / làm sao',
    '되세요': 'là / trở thành',
    '되십니까': 'là / trở thành',
    '이름이': 'Tên (thông thường)',
    '무엇인가요': 'là cái gì?',
    '무엇입니까': 'là cái gì?',
    '뭐예요': 'là gì?',
    '올해': 'Năm nay',
    '연세가': 'Tuổi (kính ngữ)',
    '나이가': 'Tuổi (thường)',
    '몇': 'mấy',
    '살인가요': 'tuổi?',
    '살입니까': 'tuổi?',
    '살이에요': 'tuổi?',
    '생일이': 'Sinh nhật',
    '언제인가요': 'khi nào?',
    '언제입니까': 'khi nào?',
    '언제예요': 'khi nào?',
    '생신이': 'Sinh nhật (kính ngữ)',
    '생년월일이': 'Ngày sinh',
    '태어났나요': 'sinh ra?',
    '태어났습니까': 'sinh ra?',
    '태어났어요': 'sinh ra?',
    '고향이': 'Quê hương',
    '어디인가요': 'ở đâu?',
    '어디입니까': 'ở đâu?',
    '어디예요': 'ở đâu?',
    '어디에서': 'ở đâu / từ đâu',
    '왔나요': 'đã đến?',
    '왔습니까': 'đã đến?',
    '왔어요': 'đã đến?',
    '주소가': 'Địa chỉ',
    '결혼했나요': 'đã kết hôn?',
    '결혼했습니까': 'đã kết hôn?',
    '결혼했어요': 'đã kết hôn?',
    '키가': 'Chiều cao',
    '센티미터예요': 'cm?',
    '센티미터입니까': 'cm?',
    '센티미터인가요': 'cm?',
    '몸무게가': 'Cân nặng',
    '체중이': 'Thể trọng (cân nặng)',
    '얼마예요': 'bao nhiêu?',
    '얼마입니까': 'bao nhiêu?',
    '얼마인가요': 'bao nhiêu?',
    '가족이': 'Gia đình',
    '명인가요': 'người?',
    '명입니까': 'người?',
    '명이에요': 'người?',
    '형제자매가': 'Anh chị em',
    '남매가': 'Anh chị em (trai gái)',
    '아버지': 'Bố',
    '어머니': 'Mẹ',
    '남편': 'Chồng',
    '아내': 'Vợ',
    '직업이': 'Nghề nghiệp',
    '무슨': 'gì / nào',
    '일을': 'việc (tân ngữ)',
    '하세요': 'làm?',
    '하십니까': 'làm?',
    '하나요': 'làm?',
    '합니까': 'làm?',
    '해요': 'làm?',
    '부모님은': 'Bố mẹ',
    '남편은': 'Chồng',
    '아내는': 'Vợ',
    '지금': 'bây giờ',
    '어디에': 'ở đâu',
    '살고': 'sống',
    '계세요': 'đang (kính ngữ)',
    '계십니까': 'đang (kính ngữ)',
    '사나요': 'sống?',
    '사세요': 'sống?',
    '사십니까': 'sống?',
    '삽니까': 'sống?',
    '사요': 'sống?',
    '취미가': 'Sở thích',
    '왜': 'Tại sao',
    '좋아하세요': 'thích?',
    '좋아하십니까': 'thích?',
    '좋아하나요': 'thích?',
    '좋아합니까': 'thích?',
    '좋아해요': 'thích?',
    '꿈은': 'Ước mơ',
    '운동을': 'thể thao (tân ngữ)',
    '제일': 'nhất',
    '색깔을': 'màu sắc (tân ngữ)',
    '한국에': 'đến Hàn Quốc',
    '가고': 'đi',
    '싶어요': 'muốn',
    '싶습니까': 'muốn',
    '가는': 'đi / việc đi',
    '이유가': 'lý do',
    '목적이': 'mục đích',
    '한국에서': 'tại Hàn Quốc',
    '일하고': 'làm việc',
    '먼저': 'trước / đầu tiên',
    '하고': 'làm',
    '싶은': 'muốn',
    '일이': 'việc (chủ ngữ)',
    '중요한': 'quan trọng',
    '한국어를': 'tiếng Hàn',
    '얼마나': 'bao lâu / bao nhiêu',
    '얼마': 'bao nhiêu',
    '동안': 'khoảng / trong',
    '배웠어요': 'đã học?',
    '배웠나요': 'đã học?',
    '배웠습니까': 'đã học?',
    '배우셨어요': 'đã học? (kính ngữ)',
    '배우셨습니까': 'đã học? (kính ngữ)',
    '한국어는': 'tiếng Hàn',
    '어떻습니까': 'như thế nào?',
    '어떠세요': 'như thế nào?',
    '어떤가요': 'như thế nào?',
    '어려워요': 'khó?',
    '어려운가요': 'khó?',
    '쉬워요': 'dễ?',
    '쉬운가요': 'dễ?',
    '의사소통이': 'giao tiếp',
    '설명할': 'giải thích',
    '수': 'có thể',
    '있나요': 'không?',
    '방해하는': 'cản trở',
    '요소들은': 'các yếu tố',
    '시예요': 'giờ?',
    '인가요': 'không? / là?',
    '어제는': 'Hôm qua',
    '요일이었어요': 'là thứ mấy?',
    '오늘은': 'Hôm nay',
    '요일이에요': 'là thứ mấy?',
    '내일은': 'Ngày mai',
    '며칠이었어요': 'ngày mấy?',
    '며칠이에요': 'ngày mấy?',
    '지난': 'trước / vừa qua',
    '달은': 'tháng',
    '몇월이었어요': 'tháng mấy?',
    '몇월이에요': 'tháng mấy?',
    '작년은': 'Năm ngoái',
    '년이었어요': 'năm mấy?',
    '올해는': 'Năm nay',
    '년이에요': 'năm mấy?',
    '내년은': 'Năm sau',
    '날씨가': 'thời tiết',
    '어때요': 'thế nào?',
    '여기에': 'đến đây',
    '오셨습니까': 'đã đến?',
    '오나요': 'đến?',
    '아침을': 'bữa sáng',
    '드셨습니까': 'đã ăn?'
}

export function InterviewPracticeScreen({ questions, mode, onFinish, onBack, initialAutoPlay = false }: InterviewPracticeScreenProps) {
    const [queue, setQueue] = useState<number[]>(questions.map((_, i) => i))
    const currentQIndex = queue.length > 0 ? queue[0] : null
    const currentQ = currentQIndex !== null ? questions[currentQIndex] : null

    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [showQuestionText, setShowQuestionText] = useState(false)

    useEffect(() => {
        if (currentQ) {
            setShowQuestionText(mode === 'ai_mock' && currentQ.category === 'Toán học')
        }
    }, [currentQIndex, currentQ, mode])

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

        const isGoogleTTS = currentQ.question_audio_url && currentQ.question_audio_url.includes('translate.google.com')
        const hasRealAudio = currentQ.question_audio_url && !isGoogleTTS
        const forceElevenLabs = true;

        if (hasRealAudio && audioRef.current && !forceElevenLabs) {
            audioRef.current.src = currentQ.question_audio_url
            audioRef.current.playbackRate = playbackRate
            // Do NOT call load() to avoid race conditions
            audioRef.current.play().catch(err => {
                if (err.name === 'AbortError') {
                    console.warn('Audio play interrupted (Strict Mode/Cleanup):', err)
                } else {
                    console.warn("Audio play error:", err)
                    setAudioState('error')
                }
            })
        } else if (currentQ.question_text) {
            // Fallback to ElevenLabs TTS stream
            speakText(
                currentQ.question_text,
                playbackRate,
                () => setAudioState('playing'),
                () => handleAudioEnded(),
                () => handleAudioEnded()
            )
        } else {
            // No audio and no TTS support, just trigger ended immediately
            handleAudioEnded()
        }

        return () => {
            if (audioRef.current) audioRef.current.pause()
            stopTTS()
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
        let countdownSeconds = 3
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
        handleAudioEnded()
    }

    const replayAudio = () => {
        const isGoogleTTS = currentQ.question_audio_url && currentQ.question_audio_url.includes('translate.google.com')
        const hasRealAudio = currentQ.question_audio_url && !isGoogleTTS
        const forceElevenLabs = true;

        if (hasRealAudio && audioRef.current && !forceElevenLabs) {
            audioRef.current.currentTime = 0
            audioRef.current.playbackRate = playbackRate
            audioRef.current.play().catch(err => {
                if (err.name !== 'AbortError') {
                    console.warn("Audio replay error:", err)
                }
            })
        } else if (currentQ.question_text) {
            speakText(
                currentQ.question_text,
                playbackRate,
                () => setAudioState('playing'),
                () => handleAudioEnded(),
                () => handleAudioEnded()
            )
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
            setQueue(prev => prev.slice(1))
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
        handleNotKnown()
    }

    if (!currentQ) return null

    return (
        <div className="min-h-[500px] flex flex-col max-w-4xl mx-auto">
            <audio
                ref={audioRef}
                onPlay={handleAudioPlay}
                onEnded={handleAudioEnded}
                onError={handleAudioError}
                className="hidden"
            />

            {/* Header synced with Math/Vocabulary sections */}
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    {onBack && (
                        <Button 
                            variant="ghost" 
                            onClick={onBack} 
                            className="h-9 w-9 p-0 text-slate-600 hover:bg-slate-100 flex-shrink-0 rounded-full flex items-center justify-center"
                            title="Quay lại"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">
                            {currentQ?.category || "Khẩu lệnh"}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {questions.length} câu hỏi hiển thị • {currentQ?.category || "Chủ đề"}
                        </p>
                    </div>
                </div>

                {/* Speed selector (no text, simplified Segmented control) */}
                {isListenOnly && (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/50 rounded-xl p-0.5 shadow-sm">
                        {[0.8, 1.0, 1.2].map(rate => (
                            <button 
                                key={rate}
                                onClick={() => setPlaybackRate(rate)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all duration-200 cursor-pointer ${
                                    playbackRate === rate 
                                        ? 'bg-blue-600 text-white shadow-sm scale-105' 
                                        : 'text-slate-650 hover:bg-slate-100'
                                }`}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content view matching vocabulary/math layout */}
            <div className={`flex-1 overflow-auto ${mode === 'meaning_quiz' ? 'space-y-3 py-3 md:space-y-6 md:py-6' : 'space-y-6 py-6'}`}>

            {/* Stats & Progress section (placed below header) */}
            {/* Stats & Progress section (placed below header) */}
            {mode !== 'flashcard' && mode !== 'meaning_quiz' && (
                <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="text-sm font-bold text-slate-550">
                            Câu hỏi: <span className="text-blue-600 font-black">{questions.length - queue.length + 1}</span>/{questions.length}
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out relative" 
                            style={{ width: `${Math.max(5, ((questions.length - queue.length + 1) / questions.length) * 100)}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Question Area */}
            {mode === 'meaning_quiz' ? (
                <MeaningQuizMode 
                    currentQ={currentQ} 
                    onKnown={handleKnown} 
                    onNotKnown={handleNotKnown} 
                    timeLeft={timeLeft}
                    questions={questions}
                    playbackRate={playbackRate}
                />
            ) : mode === 'flashcard' ? (
                <FlashcardMode
                    currentQ={currentQ}
                    onKnown={handleKnown}
                    onNotKnown={handleNotKnown}
                    questions={questions}
                />
            ) : (
                <div className={`bg-white rounded-2xl border shadow-sm text-center relative ${
                    isListenOnly ? 'p-4 md:p-6 space-y-4 md:space-y-5' : 'p-5 md:p-8 space-y-6 md:space-y-8'
                }`}>
                    {/* Timer and Replay (Non-Autoplay) */}
                    {mode !== 'word_sort' && !isAutoPlay && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                            {/* Status / Visualizer */}
                            {audioState === 'playing' && (
                                <div className="flex items-center gap-2 bg-blue-50/50 px-4 py-1.5 rounded-full border border-blue-100 mx-auto">
                                    <div className="w-1 h-3.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1 h-5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
                                    <div className="w-1 h-3.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                                    <span className="ml-1 text-xs text-blue-650 font-bold">Giám khảo đang đọc câu hỏi...</span>
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

                    {/* Reveal Question Button for AI Mock Mode */}
                    {!isListenOnly && (
                        <div className="flex flex-col items-center gap-3 pt-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowQuestionText(!showQuestionText)}
                                className="rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors cursor-pointer"
                            >
                                {showQuestionText ? (
                                    <>
                                        <EyeOff className="w-4 h-4 mr-2" />
                                        Ẩn câu hỏi
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Xem câu hỏi & Nghĩa
                                    </>
                                )}
                            </Button>

                            {showQuestionText && (
                                <div className="w-full max-w-2xl mx-auto p-6 md:p-8 bg-indigo-50/20 backdrop-blur-sm rounded-3xl border border-indigo-100/60 text-center space-y-4 animate-in fade-in slide-in-from-top-3 duration-300 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-300 via-indigo-500 to-purple-400"></div>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100/70 border border-indigo-200/50 text-indigo-800 text-[10px] font-black tracking-wider uppercase rounded-full">
                                        <span>📝</span> Đề bài câu hỏi
                                    </div>
                                    <div className="space-y-2.5">
                                        <h3 className="text-xl md:text-2xl font-black text-indigo-950 tracking-wide leading-relaxed">
                                            {currentQ.question_text}
                                        </h3>
                                        <p className="text-sm md:text-base font-bold text-slate-500 max-w-lg mx-auto">
                                            {currentQ.vietnamese_meaning}
                                        </p>
                                    </div>

                                    {/* Chunk breakdown */}
                                    {currentQ.category === 'Giao tiếp' && (
                                        <div className="pt-4 border-t border-indigo-100/40 text-left space-y-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">🔍 Phân tích cụm từ (Nghe ngắt nghỉ):</span>
                                            <div className="flex flex-wrap gap-2">
                                                {currentQ.question_text.split(/\s+/).map((word: string, i: number) => {
                                                    const cleanWord = word.replace(/[?,.!?]/g, '');
                                                    let translation = CHUNK_DICTIONARY[cleanWord] || CHUNK_DICTIONARY[word];
                                                    if (!translation) {
                                                        const foundKey = Object.keys(CHUNK_DICTIONARY).find(k => cleanWord.includes(k) || k.includes(cleanWord));
                                                        if (foundKey) translation = CHUNK_DICTIONARY[foundKey];
                                                    }
                                                    return (
                                                        <div key={i} className="px-3 py-1.5 bg-white/80 rounded-xl border border-indigo-100 shadow-sm flex flex-col items-center min-w-[60px] text-center hover:border-indigo-300 transition-colors">
                                                            <span className="text-sm font-black text-slate-800">{word}</span>
                                                            <span className="text-[10px] text-slate-500 font-bold">{translation || '...'}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mode Specific UI */}
                    {(isAutoPlay || 
                      (isListenOnly && audioState === 'playing') || 
                      ((audioState === 'ended' || audioState === 'error') && (timeLeft !== null || mode === 'word_sort' || mode === 'ai_mock'))
                     ) && (
                        <div className={`w-full max-w-2xl mx-auto transition-all duration-500 ${isAutoPlay ? 'mt-0' : 'mt-2'}`}>
                                {isListenOnly ? (
                                    <div className="space-y-4">
                                        {(mode as string) === 'flashcard' && (
                                            <FlashcardMode 
                                                currentQ={currentQ} 
                                                onKnown={handleKnown} 
                                                onNotKnown={handleNotKnown} 
                                                timeLeft={timeLeft} 
                                                isAutoPlay={isAutoPlay}
                                                questions={questions}
                                            />
                                        )}
                                        {(mode as string) === 'meaning_quiz' && (
                                            <MeaningQuizMode 
                                                currentQ={currentQ} 
                                                onKnown={handleKnown} 
                                                onNotKnown={handleNotKnown} 
                                                timeLeft={timeLeft}
                                                questions={questions}
                                            />
                                        )}
                                        {(mode as string) === 'word_sort' && (
                                            <WordSortMode 
                                                currentQ={currentQ} 
                                                onKnown={handleKnown} 
                                                onNotKnown={handleNotKnown} 
                                                timeLeft={timeLeft} 
                                                questions={questions}
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

                                            {/* Beautiful audio visualizer soundwave */}
                                            <div className="flex items-center gap-1.5 h-10 justify-center px-4 mt-2">
                                                <style>{`
                                                    @keyframes soundWaveInterview {
                                                        0%, 100% { transform: scaleY(0.15); }
                                                        50% { transform: scaleY(1.0); }
                                                    }
                                                    .wave-bar-interview-active {
                                                        animation: soundWaveInterview 1s ease-in-out infinite;
                                                        transform-origin: center;
                                                    }
                                                `}</style>
                                                {[...Array(19)].map((_, i) => {
                                                    const delay = (i * 0.05).toFixed(2);
                                                    const duration = (0.5 + Math.random() * 0.5).toFixed(2);
                                                    
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`w-1 rounded-full transition-all duration-500 h-8 ${
                                                                isRecording 
                                                                    ? 'bg-gradient-to-t from-red-400 to-red-600 scale-y-100 wave-bar-interview-active' 
                                                                    : 'bg-slate-200 scale-y-[0.15]'
                                                            }`}
                                                            style={{
                                                                animationDelay: isRecording ? `${delay}s` : undefined,
                                                                animationDuration: isRecording ? `${duration}s` : undefined,
                                                                transformOrigin: 'center'
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            
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
            )}

            {/* Footer Nav & FAB */}
            <div className={`flex items-center justify-between ${mode === 'meaning_quiz' ? 'pt-1 md:pt-4' : 'pt-4'}`}>
                <Button variant="outline" size="lg" onClick={() => setIsDrawerOpen(true)} className={`rounded-full border-gray-200 bg-white font-semibold text-gray-700 shadow-sm hover:bg-blue-50 hover:text-blue-600 ${mode === 'meaning_quiz' ? 'h-9 px-3 text-xs md:h-11 md:px-5 md:text-sm' : ''}`}>
                    <Menu className={`${mode === 'meaning_quiz' ? 'mr-1.5 size-4 md:mr-2 md:size-5' : 'mr-2 size-5'}`} /> Danh sách câu
                </Button>
                {mode !== 'meaning_quiz' && (
                    <Button size="lg" onClick={handleNext} className="rounded-xl px-8 shadow-sm">
                        {queue.length > 1 ? 'Câu tiếp theo' : 'Hoàn thành'}
                    </Button>
                )}
            </div>
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
