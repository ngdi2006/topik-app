'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Eye, CheckCircle, XCircle, Volume2, ChevronRight, Repeat, Bookmark, Info } from 'lucide-react'
import { speakText, stopTTS } from '@/lib/tts'

// --- Types ---
export interface ListenModeProps {
    currentQ: any
    onKnown: () => void
    onNotKnown: () => void
    timeLeft?: number | null
    questions?: any[]
    isAutoPlay?: boolean
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
    '얼ما예요': 'bao nhiêu?',
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

// --- 1. Flashcard Mode ---
export function FlashcardMode({ currentQ, onKnown, onNotKnown, questions }: ListenModeProps) {
    const [phase, setPhase] = useState<'front' | 'reveal'>('front')
    const [correctCount, setCorrectCount] = useState(0)
    const [wrongCount, setWrongCount] = useState(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isBookmarked, setIsBookmarked] = useState(false)

    // Reset phase when question changes
    useEffect(() => {
        setPhase('front')
    }, [currentQ?.id])

    // Load bookmark status
    useEffect(() => {
        if (!currentQ) return
        try {
            const stored = localStorage.getItem('saved_interview_review_questions')
            const parsed = stored ? JSON.parse(stored) : []
            const exists = parsed.some((item: any) => item.id === currentQ.id)
            setIsBookmarked(exists)
        } catch (e) {
            console.error(e)
        }
    }, [currentQ?.id])

    const toggleBookmark = () => {
        if (!currentQ) return
        try {
            const stored = localStorage.getItem('saved_interview_review_questions')
            const parsed = stored ? JSON.parse(stored) : []
            let updated = []
            if (isBookmarked) {
                updated = parsed.filter((item: any) => item.id !== currentQ.id)
                setIsBookmarked(false)
                toast.success('Đã xóa khỏi sổ tay ôn tập')
            } else {
                updated = [...parsed, currentQ]
                setIsBookmarked(true)
                toast.success('Đã lưu vào sổ tay ôn tập')
            }
            localStorage.setItem('saved_interview_review_questions', JSON.stringify(updated))
        } catch (e) {
            console.error(e)
        }
    }

    const playAudio = useCallback(() => {
        if (!currentQ) return
        const forceElevenLabs = true;
        if (currentQ.question_audio_url && !currentQ.question_audio_url.includes('translate.google.com') && !forceElevenLabs) {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.currentTime = 0
            }
            const audio = new Audio(currentQ.question_audio_url)
            audioRef.current = audio
            audio.play().catch(e => console.warn(e))
        } else if (currentQ.question_text) {
            speakText(currentQ.question_text, 0.8)
        }
    }, [currentQ])

    const handleReveal = useCallback(() => {
        setPhase('reveal')
        setTimeout(() => playAudio(), 200)
    }, [playAudio])

    const toggleFlip = () => {
        if (phase === 'front') {
            handleReveal()
        } else {
            setPhase('front')
        }
    }

    // Cleanup audio/TTS on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause()
            if ('speechSynthesis' in window) window.speechSynthesis.cancel()
        }
    }, [])

    const handleActionKnown = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCorrectCount(c => c + 1)
        onKnown()
    }

    const handleActionNotKnown = (e: React.MouseEvent) => {
        e.stopPropagation()
        setWrongCount(w => w + 1)
        onNotKnown()
    }

    const currentIndex = questions ? questions.findIndex(q => q.id === currentQ.id) : 0
    const totalCount = questions ? questions.length : 1

    return (
        <div className="space-y-4 max-w-2xl mx-auto">
            {/* Stats / Progress Row */}
            <div className="flex items-center justify-between px-1">
                <div className="text-sm font-semibold text-slate-500">
                    Câu hỏi: <span className="text-indigo-600 font-extrabold">{currentIndex + 1}</span>/{totalCount}
                </div>
                <div className="flex gap-2">
                    <span className="text-xs bg-green-100 text-green-750 font-bold px-2.5 py-1 rounded-full">✓ Thuộc: {correctCount}</span>
                    <span className="text-xs bg-red-100 text-red-750 font-bold px-2.5 py-1 rounded-full">✗ Chưa thuộc: {wrongCount}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${((currentIndex) / totalCount) * 100}%` }}
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
            <div className="relative flip-perspective w-full animate-in fade-in zoom-in duration-300">
                <div className={`flip-card-inner ${phase === 'reveal' ? 'is-flipped' : ''}`}>
                    {/* FRONT CARD */}
                    <div
                        className="flip-card-face rounded-3xl border-2 border-slate-100 bg-white shadow-xl overflow-hidden cursor-pointer select-none flex flex-col justify-between min-h-[350px] md:min-h-[420px]"
                        onClick={toggleFlip}
                    >
                        {/* Body area */}
                        <div className="relative flex-1 flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 to-indigo-50/30 p-8">
                            {/* Bookmark button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                                className="absolute top-4 left-4 w-10 h-10 bg-white/85 backdrop-blur rounded-full flex items-center justify-center shadow-md border border-slate-200/50 text-slate-400 hover:text-indigo-650 active:scale-95 transition-all duration-200 z-10"
                                title={isBookmarked ? "Xóa khỏi sổ tay" : "Lưu vào sổ tay"}
                            >
                                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                            </button>

                            <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-rose-100 mb-6">
                                <Volume2 className="w-10 h-10 animate-pulse" />
                            </div>

                            <p className="text-slate-500 text-sm font-semibold mb-2 uppercase tracking-wider">Hội thoại Giao tiếp</p>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800 text-center leading-relaxed">
                                Nghe câu hỏi & đoán nghĩa tiếng Việt
                            </h2>

                        </div>

                        {/* Hint footer */}
                        <div className="py-4 px-6 text-center bg-white border-t border-slate-100 flex-shrink-0">
                            <p className="text-slate-400 text-sm font-medium animate-pulse flex items-center justify-center gap-2">
                                <Eye className="w-4 h-4" />
                                Nhấn để lật thẻ và nghe đáp án ngay lập tức
                            </p>
                        </div>
                    </div>

                    {/* REVEAL CARD (BACK) */}
                    <div
                        className="flip-card-face flip-card-face-back rounded-3xl border-2 border-indigo-100 bg-white shadow-xl overflow-hidden cursor-pointer select-none flex flex-col justify-between min-h-[350px] md:min-h-[420px]"
                        onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('button') || target.closest('a')) return;
                            toggleFlip();
                        }}
                    >
                        <div className="flex-1 flex flex-col justify-start p-6 relative overflow-y-auto space-y-4">
                            {/* Bookmark button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                                className="absolute top-4 right-4 w-9 h-9 bg-white/85 backdrop-blur rounded-full flex items-center justify-center shadow-md border border-slate-200/50 text-slate-500 hover:text-indigo-650 active:scale-95 transition-all duration-200 z-10"
                                title={isBookmarked ? "Xóa khỏi sổ tay" : "Lưu vào sổ tay"}
                            >
                                <Bookmark className={`w-4.5 h-4.5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                            </button>

                            {/* Card Content Stack */}
                            <div className="flex flex-col items-center text-center gap-3 pt-4 w-full">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-center gap-2">
                                        <h2 className="text-xl md:text-2xl font-extrabold text-indigo-850 tracking-tight leading-normal">
                                            {currentQ.question_text}
                                        </h2>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); playAudio() }}
                                            className="p-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex-shrink-0 shadow-sm active:scale-95 cursor-pointer"
                                            title="Nghe lại"
                                        >
                                            <Volume2 className="w-4 h-4 text-indigo-600" />
                                        </button>
                                    </div>
                                    <p className="text-base md:text-lg font-bold text-emerald-600">{currentQ.vietnamese_meaning}</p>
                                </div>

                                {/* Sample Answers */}
                                {currentQ.suggested_answers && currentQ.suggested_answers.length > 0 && (
                                    <div className="w-full max-w-md bg-emerald-50/50 rounded-xl p-4.5 border border-emerald-100 text-left flex items-start gap-2.5 mt-2">
                                        <Info className="w-4.5 h-4.5 text-emerald-700 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-1">Câu trả lời mẫu / 모범 답안</p>
                                            <div className="space-y-1.5">
                                                {currentQ.suggested_answers.map((ans: string, i: number) => (
                                                    <p key={i} className="text-slate-700 font-bold text-sm leading-relaxed">
                                                        • {ans}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Chunk breakdown */}
                                {currentQ.category === 'Giao tiếp' && (
                                    <div className="w-full max-w-md bg-indigo-50/20 rounded-xl p-4 border border-indigo-100/50 text-left space-y-2 mt-2">
                                        <span className="text-xs font-black text-indigo-800 uppercase tracking-wider block">🔍 Phân tích cụm từ (Nghe ngắt nghỉ):</span>
                                        <div className="flex flex-wrap gap-2">
                                            {currentQ.question_text.split(/\s+/).map((word: string, i: number) => {
                                                const cleanWord = word.replace(/[?,.!?]/g, '');
                                                let translation = CHUNK_DICTIONARY[cleanWord] || CHUNK_DICTIONARY[word];
                                                if (!translation) {
                                                    const foundKey = Object.keys(CHUNK_DICTIONARY).find(k => cleanWord.includes(k) || k.includes(cleanWord));
                                                    if (foundKey) translation = CHUNK_DICTIONARY[foundKey];
                                                }
                                                return (
                                                    <div key={i} className="px-2.5 py-1.5 bg-white rounded-lg border border-slate-100 flex flex-col items-center min-w-[55px] text-center shadow-sm">
                                                        <span className="text-xs font-black text-slate-800">{word}</span>
                                                        <span className="text-[10px] text-slate-500 font-bold">{translation || '...'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-4 space-y-2 bg-white border-t border-slate-100 flex-shrink-0">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleActionNotKnown}
                                    className="flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm border-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:border-orange-300 active:scale-95 transition-all cursor-pointer"
                                >
                                    <Repeat className="w-4 h-4" /> Chưa thuộc
                                </button>
                                <button
                                    onClick={handleActionKnown}
                                    className="flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 transition-all shadow-md shadow-emerald-100 cursor-pointer"
                                >
                                    <CheckCircle className="w-4 h-4" /> Đã thuộc
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- 2. Meaning Quiz Mode ---
export function MeaningQuizMode({ currentQ, onKnown, onNotKnown, timeLeft = 0, questions = [], playbackRate = 1.0 }: ListenModeProps & { playbackRate?: number }) {
    const [options, setOptions] = useState<string[]>([])
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
    const [score, setScore] = useState(0)

    const speak = (text: string) => {
        const forceElevenLabs = true;
        if (currentQ?.question_audio_url && !currentQ.question_audio_url.includes('translate.google.com') && !forceElevenLabs) {
            const a = new Audio(currentQ.question_audio_url)
            a.playbackRate = playbackRate
            a.play().catch(e => console.warn(e))
        } else {
            speakText(text, 0.9 * playbackRate)
        }
    }



    useEffect(() => {
        const correct = (currentQ.vietnamese_meaning || "Không có dữ liệu nghĩa").trim()
        let wrongOptions = questions
            .filter(q => q.id !== currentQ.id && q.vietnamese_meaning)
            .map(q => q.vietnamese_meaning.trim())
            .filter(vi => vi !== correct) // Exclude same meaning
            .filter((v, i, a) => a.indexOf(v) === i) // unique
        
        // Shuffle wrong options and pick up to 3
        wrongOptions = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 3)
        
        // Fallbacks if not enough options
        const fallbacks = [
            "Mời bạn ngồi xuống", 
            "Hãy nhìn vào camera", 
            "Bắt đầu làm bài thi", 
            "Vui lòng đọc to rõ ràng",
            "Xin mời trả lời câu hỏi"
        ]
        while (wrongOptions.length < 3) {
            const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)]
            if (!wrongOptions.includes(fb) && fb !== correct) {
                wrongOptions.push(fb)
            }
        }

        const allOptions = [correct, ...wrongOptions].sort(() => 0.5 - Math.random())
        setOptions(allOptions)
        setSelectedAnswer(null)
        setIsCorrect(null)
    }, [currentQ, questions])

    const handleSelect = (opt: string) => {
        if (selectedAnswer !== null) return // Already answered
        setSelectedAnswer(opt)
        const correct = opt === (currentQ.vietnamese_meaning || "Không có dữ liệu nghĩa")
        setIsCorrect(correct)
        if (correct) {
            setScore(s => s + 1)
        }
    }

    const handleNext = () => {
        if (isCorrect) {
            onKnown()
        } else {
            onNotKnown()
        }
    }

    const currentIndex = questions.findIndex(x => x.id === currentQ.id)

    return (
        <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-400">
            {/* Stats / Score row */}
            <div className="flex items-center justify-between px-1">
                <div className="text-sm font-semibold text-slate-550">
                    Câu hỏi: <span className="text-blue-600 font-extrabold">{currentIndex + 1}</span>/{questions.length}
                </div>
                <span className="text-sm font-black bg-blue-100 text-blue-750 px-3 py-1 rounded-full shadow-sm">
                    🏆 {score} điểm
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} 
                />
            </div>

            {/* Main Question Card */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-blue-150 shadow-md p-5 md:p-8 text-center relative overflow-hidden">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Nghe câu hỏi → Chọn đáp án đúng</p>
                
                {selectedAnswer ? (
                    <div className="animate-in fade-in duration-500 my-4">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-relaxed mb-3">
                            {currentQ.question_text}
                        </h2>
                        <p className="text-slate-500 font-semibold text-sm">
                            {currentQ.vietnamese_meaning}
                        </p>
                    </div>
                ) : (
                    <div className="py-6 flex flex-col items-center justify-center gap-2 mb-3 animate-in fade-in duration-300">
                        <Volume2 className="w-12 h-12 text-blue-500 animate-pulse" />
                        <p className="text-slate-400 text-sm font-medium">Hãy nghe kỹ câu hỏi và chọn đáp án bên dưới</p>
                    </div>
                )}

                <button
                    onClick={() => speak(currentQ.question_text)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-full border border-blue-200 transition-colors text-sm shadow-sm"
                >
                    <Volume2 className="w-4 h-4" /> Nghe lại câu hỏi
                </button>
            </div>

            {/* Options 2x2 grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                {options.map((opt, i) => {
                    const correctVal = currentQ.vietnamese_meaning || "Không có dữ liệu nghĩa"
                    const isCorrectOpt = opt === correctVal
                    const isSelectedOpt = selectedAnswer === opt
                    const isAnswered = selectedAnswer !== null
 
                    let cls = 'bg-white border-2 border-slate-200 text-slate-800 hover:border-blue-400 hover:shadow-md'
                    if (isAnswered) {
                        if (isCorrectOpt) {
                            cls = 'bg-green-50 border-2 border-green-500 text-green-800 font-black scale-105 shadow-lg shadow-green-100'
                        } else if (isSelectedOpt) {
                            cls = 'bg-red-50 border-2 border-red-400 text-red-700 opacity-80'
                        } else {
                            cls = 'bg-slate-50 border-2 border-slate-200 text-slate-400 opacity-50'
                        }
                    }

                    return (
                        <button
                            key={i}
                            onClick={() => handleSelect(opt)}
                            disabled={isAnswered}
                            className={`${cls} rounded-xl py-3 px-4 md:p-5 text-center font-bold text-sm md:text-base transition-all duration-300 cursor-pointer hover:-translate-y-0.5 min-h-[48px] md:min-h-[64px] flex items-center justify-center`}
                        >
                            {opt}
                        </button>
                    )
                })}
            </div>

            {/* Result block */}
            {selectedAnswer && (
                <div className={`animate-in fade-in slide-in-from-bottom-3 duration-400 p-5 rounded-2xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                    <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                            {isCorrect
                                ? <><CheckCircle className="w-5 h-5 text-green-600" /><span className="font-black text-green-700">Chính xác! 🎉</span></>
                                : <><XCircle className="w-5 h-5 text-red-600" /><span className="font-black text-red-700">Sai rồi!</span></>
                            }
                        </div>
                        <p className="text-slate-700 text-xs font-semibold">
                            Đáp án đầy đủ: <span className="text-indigo-700 font-bold">{currentQ.vietnamese_meaning}</span>
                        </p>
                    </div>
                    <Button
                        onClick={handleNext}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 font-bold flex-shrink-0 w-full sm:w-auto shadow-md"
                    >
                        {currentIndex >= questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    )
}

// --- 3. Word Sort Mode ---
export function WordSortMode({ currentQ, onKnown, onNotKnown, timeLeft, questions = [] }: ListenModeProps) {
    const targetText = useMemo(() => {
        const text = currentQ.suggested_answers?.[0] || currentQ.question_text || ""
        return text.trim()
    }, [currentQ])

    const [words, setWords] = useState<{ id: string, word: string }[]>([])
    const [selectedWords, setSelectedWords] = useState<{ id: string, word: string }[]>([])
    const [isFinished, setIsFinished] = useState(false)
    const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null)

    const speak = (text: string) => {
        speakText(text, 0.8)
    }

    // Auto play question speech on load
    useEffect(() => {
        if (currentQ?.question_text) {
            speak(currentQ.question_text)
        }
    }, [currentQ])

    useEffect(() => {
        if (!targetText) return
        const tokens: string[] = targetText.split(/\s+/).filter(Boolean) as string[]
        const initialWords = tokens.map((w: string, i: number) => ({ id: `w_${i}`, word: w }))
        setWords([...initialWords].sort(() => 0.5 - Math.random()))
        setSelectedWords([])
        setIsFinished(false)
        setIsAnswerCorrect(null)
    }, [targetText])

    const handleSelect = (word: typeof words[0]) => {
        if (isFinished) return
        const newSelected = [...selectedWords, word]
        setSelectedWords(newSelected)
        const newRemaining = words.filter(w => w.id !== word.id)
        setWords(newRemaining)
        
        // Auto check if all words are selected
        if (newRemaining.length === 0) {
            const currentSentence = newSelected.map(w => w.word).join(' ')
            const targetClean = targetText.replace(/\s+/g, ' ')
            const correct = currentSentence === targetClean
            setIsFinished(true)
            setIsAnswerCorrect(correct)
            
            // Wait 1.8 seconds then proceed
            setTimeout(() => {
                if (correct) {
                    onKnown()
                } else {
                    onNotKnown()
                }
            }, 1800)
        }
    }

    const handleDeselect = (word: typeof words[0]) => {
        if (isFinished) return
        setSelectedWords(prev => prev.filter(w => w.id !== word.id))
        setWords(prev => [...prev, word])
    }

    if (!targetText) {
        return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">Câu hỏi này không có câu trả lời mẫu để luyện tập.</div>
    }

    const targetClean = targetText.replace(/\s+/g, ' ')

    return (
        <div className="max-w-xl mx-auto space-y-3 animate-in fade-in duration-400">
            {/* Stimulus header text */}
            <div className="flex flex-col items-center gap-1.5 bg-slate-50/50 rounded-xl p-3 border border-slate-100/60 shadow-inner">
                <button 
                    onClick={() => speak(currentQ.question_text)}
                    className="w-10 h-10 rounded-full bg-indigo-100 hover:bg-indigo-200 border-2 border-white flex items-center justify-center text-indigo-650 transition-all hover:scale-105 active:scale-95 shadow"
                    title="Nghe lại câu mẫu"
                >
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                </button>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center">
                    Nghe và sắp xếp các từ thành câu hoàn chỉnh
                </p>
            </div>

            {/* Answer board (Dashed box) */}
            <div className={`relative min-h-[100px] bg-white rounded-2xl p-4 border-2 border-dashed transition-all duration-300 ${
                isFinished 
                    ? isAnswerCorrect 
                        ? 'border-emerald-300 bg-emerald-50/20' 
                        : 'border-rose-300 bg-rose-50/20'
                    : 'border-slate-200 shadow-sm'
            } flex flex-wrap gap-2 content-start`}>
                
                {selectedWords.map((w, i) => (
                    <button
                        key={w.id}
                        disabled={isFinished}
                        onClick={() => handleDeselect(w)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-sm transition-all duration-200 ${
                            isFinished
                                ? isAnswerCorrect
                                    ? 'border-emerald-350 bg-emerald-55 text-emerald-800'
                                    : 'border-rose-350 bg-rose-55 text-red-800 animate-shake'
                                : 'border-indigo-150 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-200 cursor-pointer active:scale-95'
                        }`}
                    >
                        {w.word}
                    </button>
                ))}

                {selectedWords.length === 0 && (
                    <div className="m-auto text-slate-400 font-bold text-[10px] text-center select-none flex flex-col items-center gap-1">
                        <span>🧩 Ghép các từ bên dưới</span>
                    </div>
                )}
            </div>

            {/* Word Pool */}
            <div className="bg-slate-50 border border-slate-100/80 p-3 rounded-2xl">
                <div className="flex flex-wrap justify-center gap-2">
                    {words.map((w, i) => (
                        <button
                            key={w.id}
                            disabled={isFinished}
                            onClick={() => handleSelect(w)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            {w.word}
                        </button>
                    ))}
                </div>
            </div>

            {/* Result notification */}
            {isFinished && (
                <div className="flex flex-col items-center animate-in zoom-in-95 duration-200 pt-1 text-center">
                    {isAnswerCorrect ? (
                        <div className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Ghép câu chính xác!
                        </div>
                    ) : (
                        <div className="space-y-1.5 w-full max-w-sm">
                            <div className="text-rose-500 font-bold text-xs flex items-center justify-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Ghép chưa chính xác!
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-left text-[10px] font-semibold text-slate-750 shadow-inner">
                                <span className="text-[8px] text-slate-400 block mb-0.5 font-bold">Đáp án đúng:</span>
                                {targetClean}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
