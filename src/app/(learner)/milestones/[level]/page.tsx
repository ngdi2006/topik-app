"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, MicOff, Volume2, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Lightbulb, UserCircle, Send, PlayCircle, Wand2 } from "lucide-react"
import Link from "next/link"

import { createClient } from "@/lib/supabase/client"

// --- Component Đọc Tiếng Hàn (Web Speech API) ---
const speakText = (text: string, rate: number = 1.0) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = rate;
        const voices = window.speechSynthesis.getVoices();
        const koVoice = voices.find(v => v.lang === 'ko-KR' || v.lang === 'ko_KR');
        if (koVoice) utterance.voice = koVoice;
        window.speechSynthesis.speak(utterance);
    }
}

// --- Component Render Báo cáo (Report JSON UI) ---
const ReportCard = ({ report, isEvaluating }: { report: any, isEvaluating: boolean }) => {
    if (isEvaluating) {
        return (
            <div className="mt-4 p-8 border rounded-xl bg-muted/20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Giáo viên AI đang chấm bài, vui lòng đợi...</p>
            </div>
        )
    }

    if (!report) return null;

    if (report.error) {
        return (
            <div className="mt-4 p-4 text-red-500 bg-red-50 rounded-lg border border-red-100 flex flex-col gap-2">
                <strong>Lỗi Trả Về Từ Máy Chủ AI:</strong>
                <code>{typeof report.error === 'string' ? report.error : JSON.stringify(report.error)}</code>
                <p className="text-sm">Vui lòng chụp màn hình lỗi này gửi Developer.</p>
            </div>
        )
    }

    return (
        <div className="mt-6 space-y-4 p-5 bg-gradient-to-br from-white to-blue-50/40 rounded-xl border border-blue-100 shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-500">
            <h4 className="font-bold flex items-center gap-2 text-primary text-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500" /> Bảng Điểm Đánh Giá Mốc
            </h4>

            <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-gray-800 font-medium leading-relaxed">{report.evaluation}</p>
                {report.score !== undefined && (
                    <div className="shrink-0 bg-blue-100 text-blue-800 font-black text-2xl px-5 py-2 rounded-2xl border border-blue-200 text-center shadow-inner">
                        {report.score}<span className="text-sm font-medium text-blue-600">/100</span>
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
                {report.mistakes && report.mistakes.length > 0 ? (
                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                        <h5 className="font-semibold text-red-700 flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4" /> Lỗi Cần Khắc Phục
                        </h5>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                            {report.mistakes.map((m: string, i: number) => <li key={i} className="leading-relaxed">{m}</li>)}
                        </ul>
                    </div>
                ) : (
                    <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 flex items-center justify-center flex-col text-green-700">
                        <CheckCircle2 className="w-8 h-8 opacity-50 mb-2" />
                        <span className="font-medium">Tuyệt vời! Không phát hiện lỗi sai.</span>
                    </div>
                )}

                {report.suggested_answers && report.suggested_answers.length > 0 && (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <h5 className="font-semibold text-blue-700 flex items-center gap-2 mb-3">
                            <Lightbulb className="w-4 h-4" /> Gợi Ý Diễn Đạt Chuẩn
                        </h5>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                            {report.suggested_answers.map((s: string, i: number) => <li key={i} className="leading-relaxed font-medium">{s}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            {report.user_transcript && (
                <div className="mt-4 pt-4 border-t border-blue-100">
                    <p className="text-xs text-muted-foreground font-mono">
                        Giọng của bạn: "{report.user_transcript}"
                    </p>
                </div>
            )}
        </div>
    )
}

function MilestoneLevelContent() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const level = params.level as string
    const mode = searchParams.get('mode') || 'practice'
    const isTestMode = mode === 'test'

    const [milestoneData, setMilestoneData] = useState<any>(null)
    const [allMilestones, setAllMilestones] = useState<any[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const supabase = createClient()

    const [speechRate, setSpeechRate] = useState<number>(1.0) // Audio speed control

    // Test states
    const [readingText, setReadingText] = useState("")
    const [readingReport, setReadingReport] = useState<any>(null)
    const [isEvalReading, setIsEvalReading] = useState(false)

    // QA States (Multi-sections)
    const [qaSections, setQaSections] = useState<{ title: string, questions: string[], points?: number, time_limit?: number }[]>([])
    const [selectedQaQuestions, setSelectedQaQuestions] = useState<string[]>([])
    const [activeQaIndex, setActiveQaIndex] = useState(0)
    const [qaReports, setQaReports] = useState<Record<number, any>>({})
    const [isEvalQA, setIsEvalQA] = useState(false)

    // STT hook cho bài Test đang Active (1: Reading, 2: QA, 0: None)
    const [activeSection, setActiveSection] = useState<0 | 1 | 2>(0)
    const { isRecording, transcript, interimTranscript, startRecording, stopRecording, resetTranscript } = useSpeechRecognition("ko-KR")

    const [timeLeft, setTimeLeft] = useState<number | null>(null)

    const [isSavingScore, setIsSavingScore] = useState(false)
    const [savedScore, setSavedScore] = useState<number | null>(null)
    const [currentMilestoneId, setCurrentMilestoneId] = useState<string>("")

    useEffect(() => {
        const fetchLevelData = async () => {
            const { data, error } = await supabase.from('milestones').select('*').eq('level', level).eq('is_active', true).single()
            if (error || !data) {
                router.push('/milestones')
                return
            }

            setCurrentMilestoneId(data.id)

            // Parser để tương thích ngược với Data chữ thuần cũ và Array JSON mới
            const parseArray = (val: string) => {
                if (!val) return [""]
                try {
                    const parsed = JSON.parse(val)
                    return Array.isArray(parsed) ? parsed : [val]
                } catch {
                    return [val]
                }
            }

            const safeParseQaSections = (val: string) => {
                if (!val) return [{ title: "Câu 1", questions: [""] }]
                try {
                    const parsed = JSON.parse(val)
                    if (Array.isArray(parsed)) {
                        if (parsed.length === 0) return [{ title: "Câu 1", points: 20, time_limit: 60, questions: [""] }]
                        if (typeof parsed[0] === 'string') {
                            return [{ title: "Câu 1", points: 20, time_limit: 60, questions: parsed }] // Format cũ
                        }
                        return parsed.map((s: any) => ({
                            ...s,
                            points: s.points || 20,
                            time_limit: s.time_limit || 60
                        })) // Format N-Dạng mới
                    }
                    return [{ title: "Câu 1", points: 20, time_limit: 60, questions: [val] }]
                } catch {
                    return [{ title: "Câu 1", points: 20, time_limit: 60, questions: [val] }]
                }
            }

            const readArr = parseArray(data.reading_text)
            const randomRead = readArr.length > 0 ? readArr[Math.floor(Math.random() * readArr.length)] : ""

            // Xử lý Giao án QA Multi-sections
            const parsedSections = safeParseQaSections(data.qa_text)
            setQaSections(parsedSections)

            // Random 1 câu duy nhất cho từng Dạng
            const randomQaSelected = parsedSections.map(sec => {
                const qArr = sec.questions.filter((q: string) => q.trim() !== "")
                if (qArr.length === 0) return ""
                return qArr[Math.floor(Math.random() * qArr.length)]
            })
            setSelectedQaQuestions(randomQaSelected)

            setMilestoneData({
                title: data.title,
                desc: data.description,
                initialReadingText: randomRead,
                hasPersonalForm: data.has_personal_form,
                readingPoints: data.reading_points || 20,
                readingTimeLimit: data.reading_time_limit || 120
            })
            setReadingText(randomRead)
            setLoadingData(false)
        }
        fetchLevelData()
    }, [level, router])

    // ============================================================
    // ⚠️ TẤT CẢ HOOKS PHẢI Ở ĐÂY - TRƯỚC MỌI CONDITIONAL RETURN
    // (Rules of Hooks: không được gọi hook sau early return)
    // ============================================================

    // Ref để tránh stale closure trong timer callback
    const handleEvaluateRef = useRef<((taskType: 'reading' | 'qa') => Promise<void>) | null>(null)

    // --- Xử lý Đếm ngược Thời gian ---
    useEffect(() => {
        if (!isTestMode || activeSection === 0) {
            setTimeLeft(null)
            return
        }
        let initialTime = 0
        if (activeSection === 1) initialTime = milestoneData?.readingTimeLimit || 120
        else if (activeSection === 2) initialTime = qaSections[activeQaIndex]?.time_limit || 60

        setTimeLeft(initialTime)

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null) return null
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [activeSection, isTestMode, milestoneData, qaSections, activeQaIndex])

    // Lắng nghe hết giờ tự động nộp bài
    useEffect(() => {
        if (timeLeft === 0 && isRecording && handleEvaluateRef.current) {
            handleEvaluateRef.current(activeSection === 1 ? 'reading' : 'qa')
        }
    }, [timeLeft, isRecording, activeSection])

    // ============================================================
    // CONDITIONAL RETURNS (sau tất cả hooks)
    // ============================================================

    if (loadingData) {
        return (
            <div className="min-h-screen bg-muted/10 flex items-center justify-center flex-col gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground">Đang lấy dữ liệu Câu hỏi từ máy chủ...</p>
            </div>
        )
    }

    if (!milestoneData) return null

    // -- Handler functions (không phải hooks, được phép khai báo sau early returns) --
    const handleToggleRecord = (sectionId: 1 | 2) => {
        if (isRecording) {
            stopRecording()
            setActiveSection(0)
        } else {
            resetTranscript()
            setActiveSection(sectionId)
            startRecording()
        }
    }

    const handleEvaluate = async (taskType: 'reading' | 'qa') => {
        // TẮT MIC NGAY LẬP TỨC KHI BẤM NỘP BÀI
        if (isRecording) {
            stopRecording()
            setActiveSection(0)
        }

        const fullTranscript = (transcript + " " + interimTranscript).trim()
        if (!fullTranscript) {
            alert("Vui lòng Bật Mic và nói tiếng Hàn trước khi nộp bài Đánh giá!")
            return
        }

        const isReading = taskType === 'reading'
        if (isReading) {
            setIsEvalReading(true)
            setReadingReport(null)
        } else {
            setIsEvalQA(true)
            setQaReports(prev => ({ ...prev, [activeQaIndex]: null }))
        }

        try {
            const res = await fetch('/api/ai/milestones/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: fullTranscript,
                    taskType,
                    level,
                    expectedText: isReading ? readingText : selectedQaQuestions[activeQaIndex],
                    questionText: isReading ? null : selectedQaQuestions[activeQaIndex]
                })
            })

            const data = await res.json()
            if (isReading) setReadingReport(data)
            else setQaReports(prev => ({ ...prev, [activeQaIndex]: data }))

        } catch (error) {
            if (isReading) setReadingReport({ error: true })
            else setQaReports(prev => ({ ...prev, [activeQaIndex]: { error: true } }))
        } finally {
            if (isReading) setIsEvalReading(false)
            else setIsEvalQA(false)
            resetTranscript()
        }
    }
    // Cập nhật ref mỗi render để timer luôn gọi phiên bản mới nhất
    handleEvaluateRef.current = handleEvaluate

    // -- Live STT display logic --
    const getActiveTranscript = (sectionId: 1 | 2) => {
        return activeSection === sectionId ? (transcript + " " + interimTranscript).trim() : ""
    }

    return (
        <div className="min-h-screen bg-muted/10 pb-20">
            {/* Header */}
            <header className="border-b bg-white px-4 md:px-8 py-4 sticky top-0 z-50 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/milestones')} className="rounded-full bg-muted/30 hover:bg-muted/80">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg md:text-xl text-primary flex items-center gap-2">
                            {milestoneData.title}
                            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${isTestMode ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                Mode: {isTestMode ? 'KIỂM TRA' : 'LUYỆN TẬP'}
                            </span>
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground">{milestoneData.desc}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 mt-4">

                {/* Section 1: Bài kiểm tra Đọc */}
                <Card className="shadow-md border-blue-100/50 rounded-2xl">
                    <CardHeader className="bg-gradient-to-r from-blue-50/50 to-white border-b pb-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2 text-blue-800">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-blue-100 text-blue-700 text-sm font-black">1</span>
                                    Bài Tập Đọc Thành Tiếng
                                </CardTitle>
                                <CardDescription className="mt-1.5 text-blue-800/80 font-medium">아래 문장을 읽어보세요 (Hãy đọc đoạn văn dưới đây)</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                <select
                                    className="h-9 px-3 border border-blue-200 rounded-full text-sm text-blue-700 bg-white font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm outline-none"
                                    value={speechRate}
                                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                >
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1">1.0x</option>
                                    <option value="1.25">1.25x</option>
                                </select>
                                <Button variant="outline" size="sm" className="gap-2 text-blue-700 border-blue-200 hover:bg-blue-50 rounded-full shadow-sm" onClick={() => speakText(readingText, speechRate)}>
                                    <Volume2 className="w-4 h-4" /> Nghe AI đọc mẫu
                                </Button>
                            </div>
                        </div>

                        {isTestMode && activeSection === 1 && timeLeft !== null && (
                            <div className="flex items-center justify-center mt-3 bg-red-50 py-2 rounded-lg border border-red-100">
                                <span className={`font-mono text-xl md:text-2xl font-black flex items-center gap-2 ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-red-500'}`}>
                                    ⏱️ {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="pt-6 relative">
                        <div className="p-4 bg-muted/10 border rounded-xl text-lg md:text-xl font-medium leading-relaxed text-gray-800 italic relative overflow-hidden group">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>
                            "{readingText}"
                        </div>

                        <div className="mt-6">
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                <Button
                                    className={`flex-1 gap-2 rounded-xl h-12 shadow-md transition-all ${activeSection === 1 && isRecording ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-100' : 'bg-gray-800 hover:bg-gray-900'}`}
                                    onClick={() => handleToggleRecord(1)}
                                    disabled={activeSection === 2}
                                >
                                    {activeSection === 1 && isRecording ? (
                                        <><MicOff className="w-5 h-5 animate-pulse" /> Dừng Thu Âm & Bắt đầu tính điểm</>
                                    ) : (
                                        <><Mic className="w-5 h-5" /> Bắt Đầu Đọc (Record)</>
                                    )}
                                </Button>

                                <Button
                                    variant="secondary"
                                    className="sm:w-32 h-12 rounded-xl gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border-0"
                                    onClick={() => handleEvaluate('reading')}
                                    disabled={activeSection !== 1 || !transcript && !interimTranscript || isEvalReading}
                                >
                                    {isEvalReading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Gửi nộp</>}
                                </Button>
                            </div>

                            {/* Live STT Transcript Display */}
                            {activeSection === 1 && getActiveTranscript(1) && (
                                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 animate-in fade-in">
                                    <span className="font-bold">🎤 Đang nghe:</span> {getActiveTranscript(1)}
                                </div>
                            )}
                        </div>

                        {/* Rendering Report */}
                        <ReportCard report={readingReport} isEvaluating={isEvalReading} />

                    </CardContent>
                </Card>

                {/* Section 2: Bài kiểm tra Vấn đáp (Multi-sections UI) */}
                <Card className="shadow-md border-emerald-100/50 rounded-2xl relative overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-white border-b pb-4">
                        <div className="flex justify-between items-start">
                            <div className="w-full">
                                <CardTitle className="text-xl flex items-center gap-2 text-emerald-800">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-emerald-100 text-emerald-700 text-sm font-black">2</span>
                                    Bài Tập Vấn Đáp Phản Xạ
                                </CardTitle>
                                <CardDescription className="mt-1.5">Mỗi câu hỏi sẽ được máy hệ thống bốc thăm bí mật. Nghe và tự do trả lời.</CardDescription>

                                {/* Thanh điều hướng Câu hỏi */}
                                {qaSections.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2 items-center bg-white/50 p-2 rounded-xl">
                                        {qaSections.map((sec, idx) => {
                                            const isCompleted = !!qaReports[idx]
                                            const isActive = activeQaIndex === idx
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        if (isRecording) {
                                                            alert("Vui lòng Dừng máy ghi âm hiện tại trước khi chuyển câu khác.")
                                                            return
                                                        }
                                                        setActiveQaIndex(idx)
                                                        resetTranscript()
                                                    }}
                                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isActive
                                                        ? "border-emerald-500 bg-emerald-500 text-white shadow-sm scale-105"
                                                        : isCompleted
                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                            : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
                                                        }`}
                                                >
                                                    <Volume2 className={`w-4 h-4 ${isActive ? "text-emerald-100" : isCompleted ? "text-emerald-500" : "text-gray-400"}`} />
                                                    {sec.title}
                                                    {isCompleted && (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1 rounded-full bg-white" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    {qaSections.length > 0 && (
                        <CardContent className="pt-6 relative">
                            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex sm:items-center sm:justify-between flex-col sm:flex-row gap-4 mb-6 shadow-sm">
                                <div className="flex gap-3 items-start">
                                    <div className="p-2 bg-white rounded-full text-emerald-600 shadow-sm mt-0.5"><PlayCircle className="w-5 h-5" /></div>
                                    <div>
                                        <p className="text-sm font-bold text-emerald-800 mb-1">CÂU HỎI BÍ MẬT ({qaSections[activeQaIndex]?.title}):</p>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                                            <p className="font-medium text-lg text-emerald-950/20 blur-[5px] select-none pointer-events-none">
                                                질문이 여기에 숨겨져 있습니다. (Đã bị ẩn)
                                            </p>
                                            <div className="text-sm font-medium text-emerald-700 italic border-l-2 border-emerald-300 pl-3 py-0.5">
                                                👈 Hãy bóp <strong className="bg-emerald-100 px-1 rounded">Cái Loa</strong> để lắng nghe!
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        className="h-10 px-4 border border-emerald-300 rounded-full text-sm text-emerald-800 bg-white font-bold focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm outline-none"
                                        value={speechRate}
                                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                    >
                                        <option value="0.5">Rùa bò (0.5x)</option>
                                        <option value="0.75">Chậm (0.75x)</option>
                                        <option value="1">Bình thường (1.0x)</option>
                                        <option value="1.25">Nhanh (1.25x)</option>
                                    </select>
                                    <Button size="icon" variant="outline" className="rounded-full shadow-sm hover:bg-emerald-100 text-emerald-700 shrink-0 h-12 w-12 border-emerald-300" onClick={() => speakText(selectedQaQuestions[activeQaIndex], speechRate)}>
                                        <Volume2 className="w-6 h-6 fill-emerald-100" />
                                    </Button>
                                </div>
                            </div>

                            {isTestMode && activeSection === 2 && timeLeft !== null && (
                                <div className="flex items-center justify-center -mt-2 mb-4 bg-red-50 py-2 rounded-lg border border-red-100">
                                    <span className={`font-mono text-xl md:text-2xl font-black flex items-center gap-2 ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-red-500'}`}>
                                        ⏱️ {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            )}

                            <div className="mt-2">
                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                    <Button
                                        className={`flex-1 gap-2 rounded-xl h-12 shadow-md transition-all ${activeSection === 2 && isRecording ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-100' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                        onClick={() => handleToggleRecord(2)}
                                        disabled={activeSection === 1}
                                    >
                                        {activeSection === 2 && isRecording ? (
                                            <><MicOff className="w-5 h-5 animate-pulse" /> Tắt Máy Thu & Lên điểm</>
                                        ) : (
                                            <><Mic className="w-5 h-5" /> Trả lời {qaSections[activeQaIndex]?.title} (Record)</>
                                        )}
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        className="sm:w-32 h-12 rounded-xl gap-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0"
                                        onClick={() => handleEvaluate('qa')}
                                        disabled={activeSection !== 2 || (!transcript && !interimTranscript) || isEvalQA}
                                    >
                                        {isEvalQA ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Nộp câu này</>}
                                    </Button>
                                </div>

                                {/* Live STT Transcript Display */}
                                {activeSection === 2 && getActiveTranscript(2) && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 animate-in fade-in">
                                        <span className="font-bold">🎤 Đang nghe:</span> {getActiveTranscript(2)}
                                    </div>
                                )}
                            </div>

                            {/* Rendering Report */}
                            <ReportCard report={qaReports[activeQaIndex]} isEvaluating={isEvalQA} />

                        </CardContent>
                    )}
                </Card>

                {/* --- MÀN HÌNH TỔNG QUAN EVALUATOR --- */}
                {readingReport && qaSections.length > 0 && qaSections.every((_, i) => qaReports[i]) && (
                    <div className="mt-12 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-3xl p-6 md:p-10 shadow-xl text-center space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                        <div className="flex justify-center mb-2">
                            <div className="bg-white p-4 rounded-full shadow-md border-4 border-indigo-100 animate-bounce">
                                <CheckCircle2 className="w-10 h-10 text-indigo-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-indigo-900 drop-shadow-sm">Chúc Mừng Bạn Đã Hoàn Thành Bài Thi!</h2>
                        <p className="text-indigo-700 text-lg max-w-2xl mx-auto font-medium">Bạn đã trả lời xuất sắc 100% các câu hỏi của Mốc này. AI đã tổng hợp đầy đủ số điểm từng chặng để đưa ra báo cáo tổng kết cuối cùng.</p>

                        {!isTestMode ? (
                            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm inline-block max-w-lg mx-auto">
                                <h3 className="text-emerald-700 font-bold mb-2 flex items-center justify-center gap-2">
                                    <Lightbulb className="w-5 h-5" /> CHẾ ĐỘ LUYỆN TẬP
                                </h3>
                                <p className="text-gray-600 text-sm">Điểm số và Lịch sử không bị lưu lại. Bạn có thể làm lại thoải mái để cải thiện kỹ năng trước khi vào chế độ Kiểm tra chính thức nhé!</p>
                            </div>
                        ) : savedScore !== null ? (
                            <div className="bg-white rounded-2xl p-8 border-2 border-indigo-100 shadow-inner inline-block min-w-[280px]">
                                <h3 className="text-indigo-800 font-bold mb-2">ĐIỂM SỐ CHÍNH THỨC CỦA BẠN</h3>
                                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600">{savedScore}<span className="text-2xl text-indigo-400">/100</span></div>
                            </div>
                        ) : (
                            <Button
                                size="lg"
                                className="h-16 px-10 rounded-full text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                disabled={isSavingScore}
                                onClick={async () => {
                                    setIsSavingScore(true)
                                    try {
                                        const { data: { user } } = await supabase.auth.getUser()
                                        if (!user) {
                                            alert("Vui lòng đăng nhập để lưu kết quả!")
                                            return
                                        }

                                        // Tính Điểm Trọng Số
                                        const readPointsWeight = milestoneData?.readingPoints || 20
                                        const readScoreCalculated = (readingReport.score || 0) * (readPointsWeight / 100)

                                        let sumQaPointsWeight = 0
                                        let sumQaScoreCalculated = 0
                                        Object.values(qaReports).forEach((r: any, idx) => {
                                            const w = qaSections[idx]?.points || 20
                                            sumQaPointsWeight += w
                                            sumQaScoreCalculated += (r.score || 0) * (w / 100)
                                        })

                                        const maxPossibleScore = readPointsWeight + sumQaPointsWeight
                                        const rawTotal = readScoreCalculated + sumQaScoreCalculated
                                        // Quy đổi điểm Scale 100
                                        const finalTotalScore = maxPossibleScore > 0 ? Math.round((rawTotal / maxPossibleScore) * 100) : 0

                                        const { error } = await supabase.from('milestone_results').insert({
                                            user_id: user.id,
                                            milestone_id: currentMilestoneId,
                                            reading_score: Math.round((readingReport.score || 0)), // Lưu điểm thô AI chấm
                                            qa_score: qaSections.length > 0 ? Math.round(Object.values(qaReports).map((r: any) => r.score || 0).reduce((a, b) => a + b, 0) / qaSections.length) : 0,
                                            total_score: finalTotalScore, // Điểm đã nhân tỷ trọng
                                            reading_report: readingReport,
                                            qa_reports: qaReports
                                        })

                                        if (error) throw error
                                        setSavedScore(finalTotalScore)

                                    } catch (error: any) {
                                        console.error(error)
                                        alert("Lỗi khi lưu kết quả: " + error.message)
                                    } finally {
                                        setIsSavingScore(false)
                                    }
                                }}
                            >
                                {isSavingScore ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Wand2 className="w-6 h-6 mr-2" />}
                                {isSavingScore ? "Đang xử lý Bảng Điểm..." : "Chốt Sổ & Tra Cứu Điểm Số"}
                            </Button>
                        )}
                    </div>
                )}

            </main >
        </div >
    )
}

export default function MilestoneLevelPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-muted/10 flex items-center justify-center flex-col gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground">Đang chuẩn bị môi trường thi...</p>
            </div>
        }>
            <MilestoneLevelContent />
        </Suspense>
    )
}
