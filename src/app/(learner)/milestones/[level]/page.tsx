"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Mic, MicOff, Volume2, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Lightbulb, Send, PlayCircle, Wand2, Clock, Trophy } from "lucide-react"
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
const ReportCard = ({ report, isEvaluating, hideScore = false }: { report: any, isEvaluating: boolean, hideScore?: boolean }) => {
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
                {!hideScore && report.score !== undefined && (
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

// --- Result Modal (Test Mode Only) ---
const ResultModal = ({ open, onClose, onSave, readingReport, qaReports, qaSections, milestoneData, isSaving, savedScore }: {
    open: boolean, onClose: () => void, onSave: () => void
    readingReport: any, qaReports: Record<number, any>
    qaSections: { title: string, points?: number }[], milestoneData: any
    isSaving: boolean, savedScore: number | null
}) => {
    const rPts = milestoneData?.readingPoints || 20
    const rScore = readingReport?.score || 0
    let qaPtsTotal = 0, qaWeightedTotal = 0
    qaSections.forEach((sec, i) => {
        const pt = sec.points || 20
        qaPtsTotal += pt
        qaWeightedTotal += (qaReports[i]?.score || 0) * (pt / 100)
    })
    const maxPts = rPts + qaPtsTotal
    const finalScore = savedScore !== null ? savedScore : (maxPts > 0 ? Math.round(((rScore * (rPts / 100)) + qaWeightedTotal) / maxPts * 100) : 0)
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Trophy className="w-6 h-6 text-amber-500" /> Kết Quả Bài Kiểm Tra
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="text-center py-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-100">
                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Điểm Tổng Kết</p>
                        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600">
                            {finalScore}<span className="text-2xl text-indigo-400">/100</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase">Chi tiết từng phần</p>
                        <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center border border-blue-100">
                            <div><p className="font-semibold text-blue-800">📖 Đọc Thành Tiếng</p><p className="text-xs text-blue-500">Tỷ trọng: {rPts} điểm</p></div>
                            <div className="text-right"><p className="font-black text-xl text-blue-700">{rScore}<span className="text-sm">/100</span></p></div>
                        </div>
                        {qaSections.map((sec, i) => (
                            <div key={i} className="bg-emerald-50 rounded-lg p-3 flex justify-between items-center border border-emerald-100">
                                <div><p className="font-semibold text-emerald-800">🎤 {sec.title}</p><p className="text-xs text-emerald-500">Tỷ trọng: {sec.points || 20} điểm</p></div>
                                <div className="text-right"><p className="font-black text-xl text-emerald-700">{qaReports[i]?.score || 0}<span className="text-sm">/100</span></p></div>
                            </div>
                        ))}
                    </div>
                    {savedScore === null ? (
                        <button onClick={onSave} disabled={isSaving} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70">
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                            {isSaving ? "Đang lưu..." : "Lưu Kết Quả vào Lịch Sử"}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200 text-green-700 font-medium">
                            <CheckCircle2 className="w-5 h-5" /> Đã lưu thành công! Điểm: {savedScore}/100
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
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
    const [totalTimeLeft, setTotalTimeLeft] = useState<number | null>(null)
    const [showResultModal, setShowResultModal] = useState(false)
    const [isAutoSubmitting, setIsAutoSubmitting] = useState(false)
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

    // (timeLeft removed - replaced by totalTimeLeft global timer)

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
                if (!val) return [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: [""] }]
                try {
                    const parsed = JSON.parse(val)
                    if (Array.isArray(parsed)) {
                        if (parsed.length === 0) return [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: [""] }]
                        if (typeof parsed[0] === 'string') {
                            return [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: parsed }] // Format cũ
                        }
                        return parsed.map((s: any) => ({
                            ...s,
                            points: s.points || 20,
                            time_limit: s.time_limit || 60,
                            question_count: s.question_count || 1
                        })) // Format N-Dạng mới
                    }
                    return [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: [val] }]
                } catch {
                    return [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: [val] }]
                }
            }

            const readArr = parseArray(data.reading_text)
            const randomRead = readArr.length > 0 ? readArr[Math.floor(Math.random() * readArr.length)] : ""

            // Xử lý Giao án QA Multi-sections & Phân rã mảng nếu question_count > 1
            const parsedSections = safeParseQaSections(data.qa_text)

            const expandedSections: any[] = []
            const expandedQuestions: string[] = []

            parsedSections.forEach((sec: any) => {
                const qArr = sec.questions.filter((q: string) => q.trim() !== "")
                if (qArr.length === 0) return

                // Thuật toán Fisher-Yates shuffle
                const shuffled = [...qArr]
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                }

                const count = Math.min(sec.question_count || 1, shuffled.length)

                for (let i = 0; i < count; i++) {
                    expandedSections.push({
                        title: count > 1 ? `${sec.title} (${i + 1}/${count})` : sec.title,
                        points: sec.points,
                        time_limit: sec.time_limit,
                        questions: sec.questions // Lấy mảng gốc để giữ type, câu chốt nằm ở expandedQuestions
                    })
                    expandedQuestions.push(shuffled[i])
                }
            })

            setQaSections(expandedSections)
            setSelectedQaQuestions(expandedQuestions)

            setMilestoneData({
                title: data.title,
                desc: data.description,
                initialReadingText: randomRead,
                hasPersonalForm: data.has_personal_form,
                readingPoints: data.reading_points || 20,
                readingTimeLimit: data.reading_time_limit || 120
            })
            setReadingText(randomRead)
            // Tính tổng thời gian cho chế độ Kiểm Tra dựa trên mảng MỚI
            if (isTestMode) {
                const totalSecs = (data.reading_time_limit || 120) +
                    expandedSections.reduce((sum: number, s: any) => sum + (s.time_limit || 60), 0)
                setTotalTimeLeft(totalSecs)
            }
            setLoadingData(false)
        }
        fetchLevelData()
    }, [level, router])

    // ============================================================
    // ⚠️ TẤT CẢ HOOKS PHẢI Ở ĐÂY - TRƯỚC MỌI CONDITIONAL RETURN
    // (Rules of Hooks: không được gọi hook sau early return)
    // ============================================================

    // Refs to avoid stale closures
    const handleEvaluateRef = useRef<Function | null>(null)
    const autoSubmitAllRef = useRef<Function | null>(null)

    // Global test timer countdown
    useEffect(() => {
        if (!isTestMode || totalTimeLeft === null || totalTimeLeft <= 0) return
        const t = setTimeout(() => setTotalTimeLeft(p => (p !== null && p > 0) ? p - 1 : 0), 1000)
        return () => clearTimeout(t)
    }, [totalTimeLeft, isTestMode])

    // When timer hits 0 → auto-submit all sections
    useEffect(() => {
        if (isTestMode && totalTimeLeft === 0 && !isAutoSubmitting && autoSubmitAllRef.current) {
            setIsAutoSubmitting(true)
            autoSubmitAllRef.current()
        }
    }, [totalTimeLeft, isTestMode, isAutoSubmitting])

    // When all sections done in test mode → show result modal
    useEffect(() => {
        if (isTestMode && readingReport && qaSections.length > 0 && qaSections.every((_, i) => qaReports[i])) {
            setShowResultModal(true)
            setIsAutoSubmitting(false)
        }
    }, [isTestMode, readingReport, qaReports, qaSections])

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

    const handleEvaluate = async (taskType: 'reading' | 'qa', qaIdx?: number, forcedTranscript?: string) => {
        if (forcedTranscript === undefined && isRecording) { stopRecording(); setActiveSection(0) }
        const idx = qaIdx !== undefined ? qaIdx : activeQaIndex
        const fullTranscript = forcedTranscript !== undefined
            ? forcedTranscript
            : (transcript + " " + interimTranscript).trim()
        if (!fullTranscript && forcedTranscript === undefined) {
            alert("Vui lòng Bật Mic và nói tiếng Hàn trước khi nộp bài Đánh giá!"); return
        }
        const isReading = taskType === 'reading'
        if (isReading) { setIsEvalReading(true); setReadingReport(null) }
        else { setIsEvalQA(true); setQaReports(prev => ({ ...prev, [idx]: null })) }
        try {
            const res = await fetch('/api/ai/milestones/evaluate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: fullTranscript || "[Hết giờ - không có transcript]",
                    taskType, level,
                    expectedText: isReading ? readingText : selectedQaQuestions[idx],
                    questionText: isReading ? null : selectedQaQuestions[idx]
                })
            })
            const data = await res.json()
            if (isReading) setReadingReport(data)
            else setQaReports(prev => ({ ...prev, [idx]: data }))
        } catch {
            if (isReading) setReadingReport({ error: true })
            else setQaReports(prev => ({ ...prev, [idx]: { error: true } }))
        } finally {
            if (isReading) setIsEvalReading(false)
            else setIsEvalQA(false)
            if (forcedTranscript === undefined) resetTranscript()
        }
    }
    handleEvaluateRef.current = handleEvaluate

    const handleAutoSubmitAll = async () => {
        if (isRecording) { stopRecording(); setActiveSection(0) }
        const cur = (transcript + " " + interimTranscript).trim()
        const tasks: Promise<void>[] = []
        if (!readingReport && !isEvalReading) tasks.push(handleEvaluate('reading', undefined, cur))
        for (let i = 0; i < qaSections.length; i++) {
            if (!qaReports[i] && !isEvalQA) tasks.push(handleEvaluate('qa', i, ""))
        }
        await Promise.allSettled(tasks)
        setIsAutoSubmitting(false)
        setShowResultModal(true)
    }
    autoSubmitAllRef.current = handleAutoSubmitAll

    // -- Live STT display logic --
    const getActiveTranscript = (sectionId: 1 | 2) => {
        return activeSection === sectionId ? (transcript + " " + interimTranscript).trim() : ""
    }

    return (
        <div className="min-h-screen bg-muted/10 pb-20">
            <header className="border-b bg-white px-3 md:px-8 py-3 sticky top-0 z-50 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 w-full">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/milestones')} className="rounded-full bg-muted/30 hover:bg-muted/80 shrink-0 mt-0.5">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </Button>
                    <div className="flex-1 min-w-0 pr-2">
                        <h1 className="font-bold text-base md:text-xl text-primary leading-tight line-clamp-2 md:line-clamp-1 mb-1.5">
                            {milestoneData.title}
                        </h1>
                        <span className={`inline-block text-[10px] md:text-xs px-2.5 py-0.5 rounded-full text-white font-medium tracking-wide ${isTestMode ? 'bg-red-500 shadow-sm shadow-red-200' : 'bg-emerald-500 shadow-sm shadow-emerald-200'}`}>
                            {isTestMode ? '🏆 KIỂM TRA' : '🏓 LUYỆN TẬP'}
                        </span>
                    </div>
                </div>

                {/* Global Timer - chỉ hiển thị khi Kiểm Tra, luôn neo ở góc phải */}
                {isTestMode && totalTimeLeft !== null && (
                    <div className="shrink-0 flex items-center justify-end">
                        <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-mono text-base font-black transition-all ${totalTimeLeft <= 30 ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
                            : totalTimeLeft <= 60 ? 'bg-orange-50 border-orange-200 text-orange-600'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>
                            <Clock className="w-4 h-4 md:w-5 md:h-5" />
                            {String(Math.floor(totalTimeLeft / 60)).padStart(2, '0')}:{String(totalTimeLeft % 60).padStart(2, '0')}
                        </div>
                    </div>
                )}
                {isAutoSubmitting && (
                    <div className="mt-2 p-2 bg-red-100 text-red-700 text-sm font-bold rounded-lg flex items-center gap-2 animate-pulse w-full">
                        <Loader2 className="w-4 h-4 animate-spin" /> Hết giờ! Đang tự động thu bài và chấm điểm...
                    </div>
                )}
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

                        {readingReport && <div className="mt-2 flex items-center gap-1.5 text-sm text-green-600 font-medium"><CheckCircle2 className="w-4 h-4" /> Đã nộp bài đọc</div>}
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

                        {/* Feedback: Luyện Tập = full report không điểm, Kiểm Tra = chỉ xác nhận gọi ý */}
                        {isTestMode ? (
                            readingReport && !readingReport.error && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Đã ghi nhận bài đọc. Điểm sẽ hiển thị sau khi hoàn thành toàn bộ bài thi.
                                </div>
                            )
                        ) : (
                            <ReportCard report={readingReport} isEvaluating={isEvalReading} hideScore={true} />
                        )}

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

                            {/* Timer bị xóa - này đã chuyển thành đồng hồ toàn cục trên Header */}

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

                            {/* Feedback: Luyện Tập = full report không điểm, Kiểm Tra = chỉ xác nhận */}
                            {isTestMode ? (
                                qaReports[activeQaIndex] && !qaReports[activeQaIndex]?.error && (
                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Đã ghi nhận {qaSections[activeQaIndex]?.title}. Điểm sẽ hiển thị sau khi hoàn thành toàn bộ.
                                    </div>
                                )
                            ) : (
                                <ReportCard report={qaReports[activeQaIndex]} isEvaluating={isEvalQA} hideScore={true} />
                            )}

                        </CardContent>
                    )}
                </Card>

                {/* Result Modal (Test Mode) */}
                {isTestMode && (
                    <ResultModal
                        open={showResultModal}
                        onClose={() => setShowResultModal(false)}
                        readingReport={readingReport}
                        qaReports={qaReports}
                        qaSections={qaSections}
                        milestoneData={milestoneData}
                        isSaving={isSavingScore}
                        savedScore={savedScore}
                        onSave={async () => {
                            setIsSavingScore(true)
                            try {
                                const { data: { user } } = await supabase.auth.getUser()
                                if (!user) { alert("Vui lòng đăng nhập!"); return }
                                const rPts = milestoneData?.readingPoints || 20
                                const rW = (readingReport?.score || 0) * (rPts / 100)
                                let qPts = 0, qW = 0
                                qaSections.forEach((sec, i) => { const p = sec.points || 20; qPts += p; qW += (qaReports[i]?.score || 0) * (p / 100) })
                                const max = rPts + qPts
                                const total = max > 0 ? Math.round(((rW + qW) / max) * 100) : 0
                                const { error } = await supabase.from('milestone_results').insert({
                                    user_id: user.id, milestone_id: currentMilestoneId,
                                    reading_score: Math.round(readingReport?.score || 0),
                                    qa_score: qaSections.length > 0 ? Math.round(qaSections.reduce((s, _, i) => s + (qaReports[i]?.score || 0), 0) / qaSections.length) : 0,
                                    total_score: total, reading_report: readingReport, qa_reports: qaReports
                                })
                                if (error) throw error
                                setSavedScore(total)
                            } catch (e: any) { alert("Lỗi: " + e.message) }
                            finally { setIsSavingScore(false) }
                        }}
                    />
                )}

                {/* Practice mode complete message (no score) */}
                {!isTestMode && readingReport && qaSections.length > 0 && qaSections.every((_, i) => qaReports[i]) && (
                    <div className="mt-8 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-3xl p-6 text-center space-y-3 animate-in slide-in-from-bottom-8 duration-700">
                        <div className="flex justify-center"><div className="bg-white p-4 rounded-full shadow-md border-4 border-emerald-100"><CheckCircle2 className="w-10 h-10 text-emerald-500" /></div></div>
                        <h2 className="text-2xl font-black text-emerald-900">Buổi Luyện Tập Hoàn Thành!</h2>
                        <p className="text-emerald-700 max-w-lg mx-auto">Bạn đã hoàn thành toàn bộ câu hỏi luyện tập. Hãy xem nhận xét của AI ở từng phần để cải thiện kỹ năng. Điểm số không được lưu trong chế độ Luyện Tập.</p>
                        <button onClick={() => router.push('/milestones')} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold transition-all">
                            ← Quay Lại Danh Sách Mốc
                        </button>
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
