'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Mic, ArrowLeft, RefreshCw, CheckCircle, Volume2, Award, FileText, Loader2 } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { speakText, stopTTS } from '@/lib/tts'
import { toast } from 'sonner'
import { ToolDragPracticeScreen } from './ToolDragPracticeScreen'
import { saveExamResult } from '@/features/second-round-interview/storage'

interface ExamQuestion {
    id: string
    type: 'speech' | 'choice' | 'tool_practice'
    section: '1.A' | '1.B' | '2' | '3' | '4.A' | '4.B' | '5' | '6'
    sectionTitle: string
    points: number
    question_text: string
    vietnamese_meaning: string
    suggested_answers?: string[]
    image_url?: string
    options?: string[]
    correctOption?: string
    tool_config?: any
}

interface MockExamScreenProps {
    industry: string
    onBack: () => void
}

interface ExamAnswer {
    choice?: string
    transcript?: string
    toolCorrect?: boolean
    toolAttempt?: Record<string, string>
}

function checkSpeechAnswer(userTranscript: string, correctOption: string): boolean {
    const cleanUser = userTranscript.replace(/[\s\.\,\?\!\~\-\_]/g, '').toLowerCase()
    const cleanCorrect = correctOption.replace(/[\s\.\,\?\!\~\-\_]/g, '').toLowerCase()
    if (cleanUser.includes(cleanCorrect)) return true
    
    // Math number mappings
    if (correctOption === '100' || correctOption.includes('백')) {
        return cleanUser.includes('100') || cleanUser.includes('백')
    }
    if (correctOption === '20' || correctOption.includes('이십')) {
        return cleanUser.includes('20') || cleanUser.includes('이십')
    }
    if (correctOption === '0.5' || correctOption.includes('영점오') || correctOption.includes('영점 오')) {
        return cleanUser.includes('0.5') || cleanUser.includes('영점오')
    }
    if (correctOption === '5.7' || correctOption.includes('오점칠') || correctOption.includes('오점 칠')) {
        return cleanUser.includes('5.7') || cleanUser.includes('오점칠')
    }
    if (correctOption === '12' || correctOption.includes('십이')) {
        return cleanUser.includes('12') || cleanUser.includes('십이')
    }
    if (correctOption === '15' || correctOption.includes('십오')) {
        return cleanUser.includes('15') || cleanUser.includes('십오')
    }
    if (correctOption === '7' || correctOption.includes('칠')) {
        return cleanUser.includes('7') || cleanUser.includes('칠')
    }
    
    // Standard digits to Sino-Korean check
    const num = parseInt(correctOption)
    if (!isNaN(num)) {
        const sinoNums = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구', '십']
        if (num >= 0 && num <= 10) {
            return cleanUser.includes(String(num)) || cleanUser.includes(sinoNums[num])
        }
    }
    
    return false
}

function roundToHalfPoint(value: number) {
    return Math.round(value * 2) / 2
}

function formatExamScore(value: number) {
    const normalized = roundToHalfPoint(Number(value) || 0)
    return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1)
}

export function MockExamScreen({ industry, onBack }: MockExamScreenProps) {
    const [loading, setLoading] = useState(true)
    const [questions, setQuestions] = useState<ExamQuestion[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [vocabTranslationMap, setVocabTranslationMap] = useState<Record<string, string>>({})
    const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({})
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [resultsData, setResultsData] = useState<{
        totalScore: number
        sectionScores: Record<string, number>
        gradedQuestions: any[]
    } | null>(null)

    // Audio State
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [audioState, setAudioState] = useState<'idle' | 'playing' | 'ended' | 'error'>('idle')
    const [speed, setSpeed] = useState(1.0)

    // Speech Recognition
    const {
        isRecording,
        transcript,
        interimTranscript,
        startRecording,
        stopRecording,
        resetTranscript,
    } = useSpeechRecognition('ko-KR')
    const recordingQuestionIdRef = useRef<string | null>(null)

    const currentQuestion = questions[currentIndex]
    const isToolQuestion = currentQuestion?.type === 'tool_practice'
    const liveSpeechText = currentQuestion && recordingQuestionIdRef.current === currentQuestion.id
        ? (transcript || interimTranscript).trim()
        : ''
    const currentSpeechText = currentQuestion
        ? liveSpeechText || answers[currentQuestion.id]?.transcript || ''
        : ''
    const hasCurrentSpeechAnswer = Boolean(currentSpeechText.trim())

    // Fetch questions and generate mock exam
    useEffect(() => {
        const generateExam = async () => {
            setLoading(true)
            try {
                // Fetch the industry pool, vocabulary and the dedicated safety bank in parallel.
                const url = `/api/interview-questions?industry=${encodeURIComponent(industry)}`
                const envIndustry = industry === 'Sản xuất chế tạo' ? 'MANUFACTURING' : 'COMMON'
                const vocabUrl = `/api/vocabulary-vong2?industry=${envIndustry}`
                const safetyUrl = `/api/interview-questions?category=${encodeURIComponent('An toàn lao động')}`
                const [res, resVocab, resSafety] = await Promise.all([
                    fetch(url, { cache: 'no-store' }),
                    fetch(vocabUrl, { cache: 'no-store' }),
                    fetch(safetyUrl, { cache: 'no-store' }),
                ])
                const [qData, vData, safetyData] = await Promise.all([
                    res.json(),
                    resVocab.json(),
                    resSafety.json(),
                ])

                if (!res.ok || !qData.success) throw new Error(qData.error || 'Không thể tải kho câu hỏi phỏng vấn')
                if (!resVocab.ok || !vData.success) throw new Error(vData.error || 'Không thể tải kho từ vựng và biển báo')
                if (!resSafety.ok || !safetyData.success) throw new Error(safetyData.error || 'Không thể tải kho An toàn lao động')

                const rawQuestions = qData.data || []
                const rawVocab = vData.data || []
                const rawSafetyQuestions = (safetyData.data || []).filter((q: any) => q.category === 'An toàn lao động')

                const translationMap: Record<string, string> = {}
                rawVocab.forEach((v: any) => {
                    translationMap[v.word_kr] = v.word_vi + (v.description_vi ? ` (${v.description_vi})` : '')
                })
                setVocabTranslationMap(translationMap)

                // 3. Assemble sections
                const examList: ExamQuestion[] = []

                // Section 1.A: Giao tiếp (2 questions, 2 pts each)
                const commQs = rawQuestions.filter((q: any) => q.category === 'Giao tiếp')
                const selectedComm = shuffle(commQs).slice(0, 2)
                selectedComm.forEach((q: any, i: number) => {
                    examList.push({
                        id: q.id || `1a-${i}`,
                        type: 'speech',
                        section: '1.A',
                        sectionTitle: '기초 대화 (Hội thoại giao tiếp)',
                        points: 2,
                        question_text: q.question_text,
                        vietnamese_meaning: q.vietnamese_meaning,
                        suggested_answers: q.suggested_answers || []
                    })
                })

                // Section 1.B: Mệnh lệnh hành động (2 questions, 2 pts each)
                const cmdQs = rawQuestions.filter((q: any) => q.category === 'Khẩu lệnh')
                const selectedCmd = shuffle(cmdQs).slice(0, 2)
                selectedCmd.forEach((q: any, i: number) => {
                    const correctMeaning = String(q.vietnamese_meaning || '').trim()
                    const normalizeMeaning = (value: unknown) => String(value || '')
                        .normalize('NFC')
                        .trim()
                        .replace(/\s+/g, ' ')
                        .replace(/[.!?…]+$/g, '')
                        .toLocaleLowerCase('vi')
                    const correctKey = normalizeMeaning(correctMeaning)
                    const uniqueDistractors = new Map<string, string>()

                    shuffle(cmdQs).forEach((candidate: any) => {
                        const meaning = String(candidate.vietnamese_meaning || '').trim()
                        const key = normalizeMeaning(meaning)
                        if (key && key !== correctKey && !uniqueDistractors.has(key)) {
                            uniqueDistractors.set(key, meaning)
                        }
                    })

                    const distractors = Array.from(uniqueDistractors.values()).slice(0, 3)
                    const options = shuffle([correctMeaning, ...distractors])

                    examList.push({
                        id: q.id || `1b-${i}`,
                        type: 'choice',
                        section: '1.B',
                        sectionTitle: '행동지시 (Mệnh lệnh hành động)',
                        points: 2,
                        question_text: q.question_text,
                        vietnamese_meaning: q.vietnamese_meaning,
                        options,
                        correctOption: correctMeaning
                    })
                })

                // Section 2: Nhận diện dụng cụ (5 questions, 1 pt each)
                const toolVocab = rawVocab.filter((v: any) => v.type === 'TOOL')
                const selectedTools = shuffle(toolVocab).slice(0, 5)
                selectedTools.forEach((v: any, i: number) => {
                    const correctMeaning = v.word_kr
                    examList.push({
                        id: v.id || `2-${i}`,
                        type: 'speech',
                        section: '2',
                        sectionTitle: '작업 도구 (Nhận diện dụng cụ)',
                        points: 1,
                        question_text: '이것은 무엇입니까?',
                        vietnamese_meaning: 'Đây là cái gì?',
                        image_url: v.image_url,
                        correctOption: correctMeaning
                    })
                })

                // Section 3: Thực hành thao tác (5 questions, 3 pts each)
                const toolPracticeQs = rawQuestions.filter((q: any) => q.category === 'Sử dụng công cụ')
                const selectedToolPractice = shuffle(toolPracticeQs).slice(0, 5)
                selectedToolPractice.forEach((q: any, i: number) => {
                    examList.push({
                        id: q.id || `3-${i}`,
                        type: 'tool_practice',
                        section: '3',
                        sectionTitle: '작업지시 (Thực hành thao tác)',
                        points: 3,
                        question_text: q.question_text,
                        vietnamese_meaning: q.vietnamese_meaning,
                        tool_config: q.tool_config
                    })
                })

                // Section 4: Năng lực nghề nghiệp (2 questions, 3 pts each)
                // 4.A: Math
                const mathQs = rawQuestions.filter((q: any) => q.category === 'Toán học')
                const selectedMath = shuffle(mathQs).slice(0, 1)
                selectedMath.forEach((q: any, i: number) => {
                    const correctAns = q.suggested_answers?.find((s: string) => !s.startsWith('__topic__:')) || '10'
                    examList.push({
                        id: q.id || `4a-${i}`,
                        type: 'speech',
                        section: '4.A',
                        sectionTitle: '수리능력 (Năng lực tính toán)',
                        points: 3,
                        question_text: q.question_text,
                        vietnamese_meaning: q.vietnamese_meaning,
                        correctOption: correctAns
                    })
                })

                // 4.B: Situation
                const sitQs = rawQuestions.filter((q: any) => q.category === 'Xử lý tình huống')
                const selectedSit = shuffle(sitQs).slice(0, 1)
                selectedSit.forEach((q: any, i: number) => {
                    examList.push({
                        id: q.id || `4b-${i}`,
                        type: 'speech',
                        section: '4.B',
                        sectionTitle: '문제해결능력 (Giải quyết vấn đề)',
                        points: 3,
                        question_text: q.question_text,
                        vietnamese_meaning: q.vietnamese_meaning,
                        suggested_answers: q.suggested_answers || []
                    })
                })

                // Section 5: Biển báo (6 questions, 1 pt each)
                const signVocab = rawVocab.filter((v: any) => v.type === 'SIGN')
                const selectedSigns = shuffle(signVocab).slice(0, 6)
                selectedSigns.forEach((v: any, i: number) => {
                    const correctMeaning = v.word_kr
                    examList.push({
                        id: v.id || `5-${i}`,
                        type: 'speech',
                        section: '5',
                        sectionTitle: '픽토그램 biển báo (Hệ thống biển báo)',
                        points: 1,
                        question_text: '이 표지는 무슨 뜻입니까?',
                        vietnamese_meaning: 'Biển báo này có nghĩa là gì?',
                        image_url: v.image_url,
                        correctOption: correctMeaning
                    })
                })

                // Section 6: only use the dedicated "An toàn lao động" bank.
                if (rawSafetyQuestions.length < 2) {
                    throw new Error(`Kho An toàn lao động chỉ có ${rawSafetyQuestions.length} câu, cần tối thiểu 2 câu để tạo đề`)
                }
                const selectedSafety = shuffle(rawSafetyQuestions).slice(0, 2)
                selectedSafety.forEach((q: any, i: number) => {
                    examList.push({
                        id: q.id || `6-${i}`,
                        type: 'speech',
                        section: '6',
                        sectionTitle: '안전십층질문 (Câu hỏi chuyên sâu an toàn)',
                        points: 5,
                        question_text: q.question_text,
                        vietnamese_meaning: q.vietnamese_meaning,
                        suggested_answers: q.suggested_answers || []
                    })
                })

                setQuestions(examList)
            } catch (err) {
                console.error(err)
                toast.error(err instanceof Error ? err.message : 'Lỗi khi thiết lập đề thi')
            } finally {
                setLoading(false)
            }
        }

        generateExam()
    }, [industry])

    // Save recognition results against the question where recording started.
    // Changing question must never copy a stale transcript into the next answer.
    useEffect(() => {
        const questionId = recordingQuestionIdRef.current
        if (transcript && questionId) {
            setAnswers(prev => ({
                ...prev,
                [questionId]: {
                    ...prev[questionId],
                    transcript: transcript.trim()
                }
            }))
        }
    }, [transcript])

    const getAnswersWithCurrentSpeech = () => {
        if (!currentQuestion || currentQuestion.type !== 'speech') return answers

        const recognizedText = (transcript || interimTranscript).trim()
        if (!recognizedText || recordingQuestionIdRef.current !== currentQuestion.id) return answers

        return {
            ...answers,
            [currentQuestion.id]: {
                ...answers[currentQuestion.id],
                transcript: recognizedText,
            },
        }
    }

    const saveCurrentSpeechAnswer = () => {
        const nextAnswers = getAnswersWithCurrentSpeech()
        if (nextAnswers !== answers) setAnswers(nextAnswers)
        return nextAnswers
    }

    const startCurrentQuestionRecording = () => {
        if (!currentQuestion || currentQuestion.type !== 'speech') return
        resetTranscript()
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: {
                ...prev[currentQuestion.id],
                transcript: undefined,
            },
        }))
        recordingQuestionIdRef.current = currentQuestion.id
        startRecording()
    }

    const stopCurrentQuestionRecording = () => {
        stopRecording()
        saveCurrentSpeechAnswer()
    }

    const toggleCurrentQuestionRecording = () => {
        if (isRecording) stopCurrentQuestionRecording()
        else startCurrentQuestionRecording()
    }

    // Auto play audio when question index changes
    useEffect(() => {
        resetTranscript()
        recordingQuestionIdRef.current = null
        if (currentQuestion) {
            stopTTS()
            speakCurrentQuestion()
        }
        return () => stopTTS()
    }, [currentIndex, currentQuestion])

    const speakCurrentQuestion = () => {
        if (!currentQuestion) return
        setAudioState('playing')
        speakText(
            currentQuestion.question_text,
            speed,
            () => setAudioState('playing'),
            () => setAudioState('ended'),
            () => { setAudioState('error') },
            {
                profile: currentQuestion.section === '4.A'
                    ? 'math-paced-v1'
                    : 'default',
            },
        )
    }

    const replayAudio = () => {
        speakCurrentQuestion()
    }

    const handleNext = () => {
        stopRecording()
        const submittedAnswers = getAnswersWithCurrentSpeech()
        if (submittedAnswers !== answers) setAnswers(submittedAnswers)
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            evaluateExam(submittedAnswers)
        }
    }

    const handleBackQuestion = () => {
        stopCurrentQuestionRecording()
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        }
    }

    // Submit and evaluate exam
    const evaluateExam = async (submittedAnswers = answers) => {
        setIsEvaluating(true)
        try {
            const sectionScores: Record<string, number> = {
                '1.A': 0, '1.B': 0, '2': 0, '3': 0, '4.A': 0, '4.B': 0, '5': 0, '6': 0
            }
            let totalScore = 0

            const gradedQuestions = await Promise.all(
                questions.map(async (q) => {
                    const ans = submittedAnswers[q.id] || {}
                    let isCorrect = false
                    let score = 0
                    let feedback = ''
                    let transcriptMeaning = ''

                    if (q.type === 'choice') {
                        isCorrect = ans.choice === q.correctOption
                        score = isCorrect ? q.points : 0
                        feedback = isCorrect ? 'Đáp án đúng' : `Đáp án sai. Đáp án chính xác là: ${q.correctOption}`
                    } else if (q.type === 'tool_practice') {
                        isCorrect = !!ans.toolCorrect
                        score = isCorrect ? q.points : 0
                        feedback = isCorrect ? 'Hoàn thành thao tác chính xác' : 'Thao tác không chính xác hoặc chưa hoàn thành'
                    } else if (q.type === 'speech') {
                        if (ans.transcript) {
                            if (q.section === '2' || q.section === '4.A' || q.section === '5') {
                                isCorrect = checkSpeechAnswer(ans.transcript, q.correctOption || '')
                                score = isCorrect ? q.points : 0
                                feedback = isCorrect 
                                    ? `Trả lời chính xác: ${q.correctOption}` 
                                    : `Chưa chính xác. Đáp án đúng là: ${q.correctOption}`
                                transcriptMeaning = ans.transcript
                            } else {
                                try {
                                    const response = await fetch('/api/interview/evaluate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ question_id: q.id, transcript: ans.transcript })
                                    })
                                    const evaluation = await response.json()
                                    if (evaluation.success) {
                                        const percentScore = evaluation.data.score || 0
                                        isCorrect = percentScore >= 70
                                        score = roundToHalfPoint((percentScore / 100) * q.points)
                                        feedback = evaluation.data.feedback_vi
                                        transcriptMeaning = evaluation.data.user_transcript_meaning
                                    } else {
                                        feedback = evaluation.error || 'Không thể chấm câu trả lời một cách tin cậy.'
                                    }
                                } catch (e) {
                                    console.error('Grading error:', e)
                                }
                            }
                        } else {
                            feedback = 'Không ghi nhận âm thanh trả lời.'
                        }
                    }

                    // Tally scores
                    sectionScores[q.section] = roundToHalfPoint((sectionScores[q.section] || 0) + score)
                    totalScore = roundToHalfPoint(totalScore + score)

                    return {
                        ...q,
                        userAnswer: ans.choice
                            || ans.transcript
                            || (ans.toolAttempt ? 'Đã thực hiện thao tác' : 'Chưa hoàn thành'),
                        isCorrect,
                        score,
                        feedback,
                        transcriptMeaning,
                        toolAttempt: ans.toolAttempt,
                    }
                })
            )

            const finalScore = roundToHalfPoint(totalScore)
            const correctCount = gradedQuestions.filter((question) => question.isCorrect).length
            const incorrectCount = gradedQuestions.length - correctCount

            setResultsData({
                totalScore: finalScore,
                sectionScores,
                gradedQuestions
            })
            saveExamResult({
                industry,
                score: finalScore,
                totalScore: 50,
                passed: finalScore >= 30,
                sectionScores,
                correctCount,
                incorrectCount,
                questionResults: gradedQuestions.map((question) => ({
                    questionId: question.id,
                    section: question.section,
                    questionText: question.question_text,
                    userAnswer: question.userAnswer,
                    isCorrect: question.isCorrect,
                    score: question.score,
                    maxScore: question.points,
                })),
            })
            setShowResults(true)
        } catch (err) {
            console.error(err)
            toast.error('Lỗi khi chấm điểm bài thi')
        } finally {
            setIsEvaluating(false)
        }
    }

    function shuffle<T>(array: T[]): T[] {
        return [...array].sort(() => Math.random() - 0.5)
    }

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-slate-600 font-semibold">Đang chuẩn bị đề thi thử và tải dữ liệu câu hỏi...</p>
            </div>
        )
    }

    if (isEvaluating) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6 text-center px-4">
                <div className="relative w-28 h-28 flex items-center justify-center">
                    <Award className="w-14 h-14 text-indigo-600 animate-bounce relative z-10" />
                    <div className="absolute inset-0 border-[5px] border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-800">AI đang đánh giá bài thi thử của bạn...</h2>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                        Chúng tôi đang phân tích các câu trả lời nói tiếng Hàn bằng công nghệ Gemini AI và chấm điểm theo Bareme chuẩn của kỳ thi EPS-TOPIK.
                    </p>
                </div>
            </div>
        )
    }

    if (showResults && resultsData) {
        const correctCount = resultsData.gradedQuestions.filter((question) => question.isCorrect).length
        const incorrectCount = resultsData.gradedQuestions.length - correctCount
        return (
            <div className="mx-auto max-w-4xl space-y-4 p-0 animate-in fade-in duration-300 md:space-y-8 md:p-6">
                <div className="space-y-2.5 text-center md:space-y-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 shadow-sm md:px-4 md:py-1.5 md:text-sm md:tracking-wider">
                        <CheckCircle className="size-3.5 md:size-4" /> Đã hoàn thành
                    </div>
                    <div className="relative mx-auto flex size-28 items-center justify-center md:size-40">
                        <div className="absolute inset-0 scale-105 animate-pulse rounded-full bg-blue-500 opacity-15 motion-reduce:animate-none"></div>
                        <div className="flex size-24 flex-col items-center justify-center rounded-full border-[6px] border-blue-600 bg-white shadow-xl md:size-36 md:border-8">
                            <span className="text-4xl font-black leading-none text-slate-850 md:text-5xl">{formatExamScore(resultsData.totalScore)}</span>
                            <span className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400 md:text-[11px] md:tracking-widest">/ 50 điểm</span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 md:text-3xl">Kết quả Thi thử Phỏng vấn Vòng 2</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500 md:text-sm">
                            Ngành: <span className="whitespace-nowrap">{industry}</span>
                        </p>
                        <div className="mx-auto mt-2 grid max-w-xs grid-cols-2 gap-2">
                            <div className="rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100"><strong className="text-base font-black text-emerald-700">{correctCount}</strong><span className="ml-1 text-[10px] font-bold text-emerald-700">câu đúng</span></div>
                            <div className="rounded-xl bg-rose-50 px-3 py-2 ring-1 ring-rose-100"><strong className="text-base font-black text-rose-700">{incorrectCount}</strong><span className="ml-1 text-[10px] font-bold text-rose-700">câu sai</span></div>
                        </div>
                    </div>
                </div>

                <Card className="rounded-2xl border border-slate-100 bg-white p-3 shadow-lg md:rounded-3xl md:p-8">
                    <h3 className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2.5 text-sm font-extrabold text-slate-800 md:mb-4 md:pb-3 md:text-lg">
                        <FileText className="w-5 h-5 text-blue-600" /> Bảng điểm chi tiết
                    </h3>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
                        <div className="space-y-2 max-md:[&>div]:p-2.5 max-md:[&_span]:text-[10px] md:space-y-3">
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-slate-600 font-bold text-xs uppercase">1.A Hội thoại giao tiếp (4đ)</span>
                                <strong className="text-slate-800 font-black text-sm">{formatExamScore(resultsData.sectionScores['1.A'])} / 4</strong>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-slate-600 font-bold text-xs uppercase">1.B Mệnh lệnh hành động (4đ)</span>
                                <strong className="text-slate-800 font-black text-sm">{formatExamScore(resultsData.sectionScores['1.B'])} / 4</strong>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-slate-600 font-bold text-xs uppercase">2. Nhận diện dụng cụ (5đ)</span>
                                <strong className="text-slate-800 font-black text-sm">{formatExamScore(resultsData.sectionScores['2'])} / 5</strong>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-slate-600 font-bold text-xs uppercase">3. Thực hành thao tác (15đ)</span>
                                <strong className="text-slate-800 font-black text-sm">{formatExamScore(resultsData.sectionScores['3'])} / 15</strong>
                            </div>
                        </div>
                        <div className="space-y-2 max-md:[&>div]:p-2.5 max-md:[&_span]:text-[10px] md:space-y-3">
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-slate-600 font-bold text-xs uppercase">4. NCS Năng lực nghề nghiệp (6đ)</span>
                                <strong className="text-slate-800 font-black text-sm">
                                    {formatExamScore((resultsData.sectionScores['4.A'] || 0) + (resultsData.sectionScores['4.B'] || 0))} / 6
                                </strong>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-slate-600 font-bold text-xs uppercase">5. Hệ thống biển báo (6đ)</span>
                                <strong className="text-slate-800 font-black text-sm">{formatExamScore(resultsData.sectionScores['5'])} / 6</strong>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-slate-600 font-bold text-xs uppercase">6. Câu hỏi an toàn (10đ)</span>
                                <strong className="text-slate-800 font-black text-sm">{formatExamScore(resultsData.sectionScores['6'])} / 10</strong>
                            </div>
                            <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                <span className="text-blue-700 font-black text-xs uppercase">TỔNG ĐIỂM BÀI THI (50đ)</span>
                                <strong className="text-blue-700 font-black text-base">{formatExamScore(resultsData.totalScore)} / 50</strong>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="space-y-2.5 md:space-y-4">
                    <h3 className="text-base font-black text-slate-800 md:text-lg">Chi tiết từng câu</h3>
                    {resultsData.gradedQuestions.map((q, idx) => (
                        <Card key={q.id} className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md md:rounded-3xl md:p-6">
                            <div className={`absolute left-0 top-0 h-full w-1.5 md:w-2.5 ${q.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <div className="space-y-2.5 pl-2 md:space-y-4 md:pl-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Phần {q.section} • {q.sectionTitle}
                                        </span>
                                        <h4 className="font-extrabold text-slate-800 text-base">{idx + 1}. {q.question_text}</h4>
                                        <p className="text-xs text-slate-500 font-medium">{q.vietnamese_meaning}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                                        q.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                    }`}>
                                        {formatExamScore(q.score)} / {q.points} Điểm
                                    </span>
                                </div>

                                {q.type === 'speech' && (
                                    <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                                            <span className="font-black text-slate-400 uppercase block mb-1">Học viên nói:</span>
                                            <p className="font-extrabold text-slate-850 leading-relaxed italic">"{q.userAnswer || 'Không ghi âm'}"</p>
                                            {q.transcriptMeaning && (
                                                <p className="text-indigo-600 font-bold mt-1">Ý nghĩa: {q.transcriptMeaning}</p>
                                            )}
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                                            <span className="font-black text-slate-400 uppercase block mb-1">Gợi ý trả lời & Đánh giá:</span>
                                            <p className="font-extrabold text-slate-700 mb-1 leading-relaxed">
                                                Đáp án chuẩn: {q.correctOption || q.suggested_answers?.[0]}
                                                {q.correctOption && vocabTranslationMap[q.correctOption] ? ` (${vocabTranslationMap[q.correctOption]})` : ''}
                                            </p>
                                            <p className="text-slate-500 font-medium italic">{q.feedback}</p>
                                        </div>
                                    </div>
                                )}

                                {q.type === 'choice' && (
                                    <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <div className="flex gap-2">
                                            <span className="font-black text-slate-400">Bạn chọn:</span>
                                            <span className={`font-extrabold ${q.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {q.userAnswer}
                                                {vocabTranslationMap[q.userAnswer] ? ` (${vocabTranslationMap[q.userAnswer]})` : ''}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-black text-slate-400">Đáp án đúng:</span>
                                            <span className="font-extrabold text-slate-750">
                                                {q.correctOption}
                                                {vocabTranslationMap[q.correctOption] ? ` (${vocabTranslationMap[q.correctOption]})` : ''}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {q.type === 'tool_practice' && (
                                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                                        <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <span className="font-black uppercase tracking-wide text-slate-400">Thao tác đã chọn</span>
                                            <p><strong>Dụng cụ:</strong> {q.toolAttempt?.selected_tool || 'Chưa chọn'}</p>
                                            <p><strong>Vật thể:</strong> {q.toolAttempt?.selected_target || 'Chưa chọn'}</p>
                                            <p><strong>Hành động:</strong> {q.toolAttempt?.selected_action || 'Chưa chọn'}</p>
                                        </div>
                                        <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                                            <span className="font-black uppercase tracking-wide text-emerald-700">Đáp án chuẩn</span>
                                            <p><strong>Dụng cụ:</strong> {q.toolAttempt?.correct_tool || 'Không có dữ liệu'}</p>
                                            <p><strong>Vật thể:</strong> {q.toolAttempt?.correct_target || 'Không có dữ liệu'}</p>
                                            <p><strong>Hành động:</strong> {q.toolAttempt?.correct_action || 'Không có dữ liệu'}</p>
                                        </div>
                                        <div className="flex gap-2 sm:col-span-2">
                                            <span className="font-black text-slate-400">Kết quả thực hiện thao tác:</span>
                                            <span className={`font-extrabold ${q.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {q.isCorrect ? 'Thành công (✓)' : 'Thao tác sai/Chưa hoàn tất (✗)'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-center pt-4 pb-12">
                    <Button
                        onClick={onBack}
                        size="lg"
                        className="h-14 px-10 rounded-2xl shadow-xl transition-transform hover:-translate-y-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                    >
                        Quay về Trang chủ
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className={`${isToolQuestion ? 'max-w-6xl' : 'max-w-3xl'} mx-auto space-y-3 p-0 animate-in fade-in duration-300 md:space-y-6 md:p-6`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 md:pb-4">
                <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800 md:text-sm">
                    <ArrowLeft className="size-4 md:size-5" /> Thoát bài thi
                </button>
                <div className="text-right">
                    <span className="block max-w-40 truncate rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-700 shadow-sm md:max-w-none md:px-3 md:text-xs md:tracking-wider">
                        {industry}
                    </span>
                </div>
            </div>

            <div className="space-y-1.5 md:space-y-2">
                <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400">Tiến độ</span>
                    <strong className="text-xs font-black text-blue-600 md:text-sm">Câu {currentIndex + 1}/{questions.length}</strong>
                </div>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full border border-slate-200/50 bg-slate-100 md:h-2.5">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            <Card className={`${isToolQuestion ? 'p-3 md:p-5' : 'p-4 md:p-8'} relative overflow-hidden rounded-2xl border-none bg-white shadow-lg md:rounded-[2rem] md:shadow-xl`}>
                <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-400" />

                <div className="space-y-3 md:space-y-6">
                    <div className="flex items-center justify-between gap-2 md:gap-4">
                        <span className="inline-flex min-w-0 items-center gap-1.5 truncate rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700 md:px-3 md:text-[10px] md:tracking-wider">
                            Phần {currentQuestion.section}: {currentQuestion.sectionTitle}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-slate-400 md:text-xs">
                            {currentQuestion.points} điểm
                        </span>
                    </div>

                    {!isToolQuestion && (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 md:gap-4 md:rounded-2xl md:p-4">
                        <div className="flex min-w-0 items-center gap-2 md:gap-3">
                            <Button
                                variant="outline"
                                onClick={replayAudio}
                                className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 shadow-sm transition-colors md:size-12 md:rounded-2xl ${
                                    audioState === 'playing' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 animate-pulse' : 'bg-white hover:bg-slate-100'
                                }`}
                            >
                                <Volume2 className="w-5 h-5" />
                            </Button>
                            <div>
                                <h3 className="truncate text-xs font-extrabold text-slate-800 md:text-sm">Nghe câu hỏi</h3>
                                <p className="truncate text-[10px] font-medium text-slate-500 md:text-xs">Chạm loa để nghe lại</p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm md:p-1">
                            {[0.8, 1.0, 1.2].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSpeed(s)}
                                    className={`rounded-lg px-2 py-1 text-[10px] font-black transition-colors md:px-3 md:text-xs ${
                                        speed === s ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {s === 1.0 ? 'Chuẩn' : `${s}x`}
                                </button>
                            ))}
                        </div>
                    </div>
                    )}

                    {currentQuestion.image_url && (
                        <div className="flex justify-center py-2">
                            <div className="w-48 h-48 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden flex items-center justify-center shadow-inner">
                                <img
                                    src={currentQuestion.image_url}
                                    alt="Question Illustration"
                                    className="max-h-full max-w-full object-contain p-2"
                                />
                            </div>
                        </div>
                    )}

                    {currentQuestion.type === 'speech' && (
                        <div className="space-y-3 pt-1 md:space-y-6 md:pt-2">
                            <div className="text-center">
                                <p className="mb-1 text-xs font-bold text-slate-500 md:mb-2 md:text-sm">
                                    {hasCurrentSpeechAnswer && !isRecording ? 'Câu trả lời đã được ghi nhận' : 'Chạm mic để bắt đầu trả lời bằng tiếng Hàn'}
                                </p>
                                <div className="flex justify-center py-2 md:py-4">
                                    <button
                                        type="button"
                                        onClick={toggleCurrentQuestionRecording}
                                        aria-pressed={isRecording}
                                        aria-label={isRecording ? 'Dừng ghi câu trả lời' : hasCurrentSpeechAnswer ? 'Ghi lại câu trả lời' : 'Bắt đầu ghi câu trả lời'}
                                        className={`flex size-16 touch-manipulation items-center justify-center rounded-full shadow-lg transition-[background-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-4 md:size-20 ${
                                            isRecording
                                                ? 'bg-red-500 text-white animate-pulse scale-105 ring-4 ring-red-100'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-102 shadow-indigo-200'
                                        }`}
                                    >
                                        <Mic className="size-7 md:size-8" />
                                    </button>
                                </div>
                                <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-black md:px-4 md:py-1.5 md:text-xs ${
                                    isRecording ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' : 'bg-slate-50 text-slate-500 border border-slate-200/60'
                                }`}>
                                    {isRecording ? 'Đang nghe · Chạm để dừng' : hasCurrentSpeechAnswer ? 'Đã ghi nhận' : 'Chạm để nói'}
                                </span>
                            </div>

                            <div className="relative flex min-h-16 flex-col justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 p-3 shadow-inner md:min-h-20 md:rounded-2xl md:p-5">
                                <div className="absolute top-0 left-0 w-[3px] h-full bg-slate-300" />
                                <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
                                    {hasCurrentSpeechAnswer && !isRecording ? (
                                        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-black text-emerald-700 md:text-xs">
                                            <CheckCircle aria-hidden="true" className="size-3.5 shrink-0" />
                                            <span className="truncate">Đã lưu câu trả lời này</span>
                                        </span>
                                    ) : (
                                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 md:text-[10px] md:tracking-widest">Nội dung đã nhận diện</span>
                                    )}
                                    {hasCurrentSpeechAnswer && !isRecording ? (
                                        <Button type="button" variant="outline" onClick={startCurrentQuestionRecording} className="h-7 shrink-0 rounded-lg border-emerald-300 bg-white px-2 text-[10px] font-black text-emerald-800 hover:bg-emerald-100 md:h-8 md:px-2.5 md:text-[11px]">
                                            <RefreshCw aria-hidden="true" className="size-3" /> Nói lại
                                        </Button>
                                    ) : null}
                                </div>
                                <p className="text-sm font-extrabold italic leading-relaxed text-slate-800 md:text-base" aria-live="polite">
                                    {currentSpeechText || 'Chưa có câu trả lời'}
                                </p>
                            </div>
                        </div>
                    )}

                    {currentQuestion.type === 'choice' && currentQuestion.options && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {currentQuestion.options.map((opt, idx) => {
                                const isSelected = answers[currentQuestion.id]?.choice === opt
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setAnswers(prev => ({
                                            ...prev,
                                            [currentQuestion.id]: { ...prev[currentQuestion.id], choice: opt }
                                        }))}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all font-medium text-sm flex gap-3 items-center group relative overflow-hidden ${
                                            isSelected
                                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-extrabold ring-2 ring-indigo-400/40 shadow-sm'
                                                : 'border-slate-200 hover:border-indigo-200 bg-white text-slate-700 hover:text-slate-900'
                                        }`}
                                    >
                                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-colors ${
                                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <span className="flex-1 leading-relaxed">{opt}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {currentQuestion.type === 'tool_practice' && (
                        <div className="pt-2 border-t border-slate-50">
                            <ToolDragPracticeScreen
                                key={currentQuestion.id}
                                questions={[currentQuestion]}
                                onBack={() => {}}
                                mode="exam"
                                onFinish={(submittedAnswers, newlyMasteredIds) => {
                                    const isCorrect = newlyMasteredIds?.includes(currentQuestion.id) || false
                                    setAnswers(prev => ({
                                        ...prev,
                                        [currentQuestion.id]: {
                                            ...prev[currentQuestion.id],
                                            toolCorrect: isCorrect,
                                            toolAttempt: submittedAnswers,
                                        }
                                    }))
                                }}
                            />
                        </div>
                    )}
                </div>
            </Card>

            <div className="flex items-center justify-between gap-2 md:gap-4">
                <Button
                    variant="outline"
                    onClick={handleBackQuestion}
                    disabled={currentIndex === 0}
                    className="h-10 rounded-xl border-slate-200 px-4 text-xs font-bold text-slate-600 transition-all disabled:opacity-50 md:h-12 md:px-6 md:text-sm"
                >
                    Trước
                </Button>
                <Button
                    onClick={handleNext}
                    className="h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-xs font-bold text-white shadow-md shadow-blue-200 transition-transform hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 md:h-12 md:px-8 md:text-sm"
                >
                    {currentIndex < questions.length - 1 ? 'Tiếp theo' : 'Nộp bài'}
                </Button>
            </div>
        </div>
    )
}
