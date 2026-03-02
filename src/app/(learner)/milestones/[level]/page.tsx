"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mic, MicOff, Volume2, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Lightbulb, UserCircle, Send, PlayCircle, Wand2 } from "lucide-react"
import Link from "next/link"

import { createClient } from "@/lib/supabase/client"

// --- Component Đọc Tiếng Hàn (Web Speech API) ---
const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
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

            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-gray-800 font-medium leading-relaxed">{report.evaluation}</p>
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

export default function MilestoneLevelPage() {
    const params = useParams()
    const router = useRouter()
    const level = params.level as string

    const [milestoneData, setMilestoneData] = useState<any>(null)
    const [loadingData, setLoadingData] = useState(true)
    const supabase = createClient()

    // Form data (For milestone 3)
    const [formData, setFormData] = useState({ name: "", age: "", job: "", hobbies: "", familySize: "" })
    const [isGeneratingIntro, setIsGeneratingIntro] = useState(false)

    // Test states
    const [readingText, setReadingText] = useState("")
    const [readingReport, setReadingReport] = useState<any>(null)
    const [isEvalReading, setIsEvalReading] = useState(false)

    const [qaReport, setQaReport] = useState<any>(null)
    const [isEvalQA, setIsEvalQA] = useState(false)

    // STT hook cho bài Test đang Active (1: Reading, 2: QA, 0: None)
    const [activeSection, setActiveSection] = useState<0 | 1 | 2>(0)
    const { isRecording, transcript, interimTranscript, startRecording, stopRecording, resetTranscript } = useSpeechRecognition("ko-KR")

    useEffect(() => {
        const fetchLevelData = async () => {
            const { data, error } = await supabase.from('milestones').select('*').eq('level', level).eq('is_active', true).single()
            if (error || !data) {
                router.push('/milestones')
                return
            }
            setMilestoneData({
                title: data.title,
                desc: data.description,
                initialReadingText: data.reading_text,
                questionText: data.qa_text,
                hasPersonalForm: data.has_personal_form
            })
            setReadingText(data.reading_text || "")
            setLoadingData(false)
        }
        fetchLevelData()
    }, [level, router])

    if (loadingData) {
        return (
            <div className="min-h-screen bg-muted/10 flex items-center justify-center flex-col gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground">Đang lấy dữ liệu Câu hỏi từ máy chủ...</p>
            </div>
        )
    }

    if (!milestoneData) return null

    // -- Handler functions --
    const handleGenerateIntro = async () => {
        setIsGeneratingIntro(true)
        try {
            const res = await fetch('/api/ai/milestones/generate-intro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (data.script) {
                setReadingText(data.script)
                alert("✨ AI đã biên soạn xong! Vui lòng cuộn xuống phần Bài Tập Đọc Thành Tiếng bên dưới để xem văn bản.")
            } else if (data.error) {
                alert("Lỗi từ AI: " + data.error)
            }
        } catch (e) {
            console.error(e)
            alert("Lỗi tạo bài, vui lòng thử lại.")
        } finally {
            setIsGeneratingIntro(false)
        }
    }

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
            setQaReport(null)
        }

        try {
            const res = await fetch('/api/ai/milestones/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: fullTranscript,
                    taskType,
                    level,
                    expectedText: isReading ? readingText : null,
                    questionText: isReading ? null : milestoneData.questionText
                })
            })

            const data = await res.json()
            if (isReading) setReadingReport(data)
            else setQaReport(data)

        } catch (error) {
            if (isReading) setReadingReport({ error: true })
            else setQaReport({ error: true })
        } finally {
            if (isReading) setIsEvalReading(false)
            else setIsEvalQA(false)
            resetTranscript()
        }
    }

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
                        <h1 className="font-bold text-lg md:text-xl text-primary">{milestoneData.title}</h1>
                        <p className="text-xs md:text-sm text-muted-foreground">{milestoneData.desc}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 mt-4">

                {/* Form Sinh Info (Chỉ xuất hiện nếu Mốc 3) */}
                {milestoneData.hasPersonalForm && (
                    <Card className="border-amber-200 border-2 shadow-sm rounded-2xl overflow-hidden bg-gradient-to-r from-amber-50/30 to-white">
                        <CardHeader className="bg-amber-100/30 border-b border-amber-100 pb-4">
                            <CardTitle className="text-amber-800 flex items-center gap-2 text-lg">
                                <UserCircle className="w-5 h-5" /> Form Khai Báo Dữ Liệu Cá Nhân
                            </CardTitle>
                            <CardDescription className="text-amber-700/80">
                                AI sẽ sử dụng những thông tin cá nhân dưới đây để tự biên soạn Bản Giới Thiệu dành riêng cho bạn.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5"><Label>Tên (Tùy chọn)</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Nam" /></div>
                            <div className="space-y-1.5"><Label>Tuổi (Tùy chọn)</Label><Input value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} placeholder="VD: 25" type="number" /></div>
                            <div className="space-y-1.5"><Label>Nghề nghiệp</Label><Input value={formData.job} onChange={e => setFormData({ ...formData, job: e.target.value })} placeholder="VD: Sinh viên, Nhân viên VP" /></div>
                            <div className="space-y-1.5"><Label>Sở thích cá nhân</Label><Input value={formData.hobbies} onChange={e => setFormData({ ...formData, hobbies: e.target.value })} placeholder="VD: Nghe nhạc Hàn, Chơi game" /></div>
                        </CardContent>
                        <CardFooter className="bg-amber-50/50 pt-4 border-t border-amber-50">
                            <Button
                                onClick={handleGenerateIntro}
                                disabled={isGeneratingIntro}
                                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white shadow-md gap-2 rounded-xl"
                            >
                                {isGeneratingIntro ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                {isGeneratingIntro ? "Đang đúc kết bản văn..." : "AI Soạn Bản Giới Thiệu (Reading Text)"}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Section 1: Bài kiểm tra Đọc */}
                <Card className="shadow-md border-blue-100/50 rounded-2xl">
                    <CardHeader className="bg-gradient-to-r from-blue-50/50 to-white border-b pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2 text-blue-800">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-blue-100 text-blue-700 text-sm font-black">1</span>
                                    Bài Tập Đọc Thành Tiếng
                                </CardTitle>
                                <CardDescription className="mt-1.5">Bấm nút Nghe để AI đọc mẫu, sau đó thu âm lại để kiểm tra độ trôi chảy.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2 text-blue-700 border-blue-200 hover:bg-blue-50 rounded-full shadow-sm" onClick={() => speakText(readingText)}>
                                <Volume2 className="w-4 h-4" /> Nghe AI đọc mẫu
                            </Button>
                        </div>
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

                {/* Section 2: Bài kiểm tra Vấn đáp */}
                <Card className="shadow-md border-emerald-100/50 rounded-2xl relative overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-white border-b pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2 text-emerald-800">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-emerald-100 text-emerald-700 text-sm font-black">2</span>
                                    Bài Tập Vấn Đáp Phản Xạ
                                </CardTitle>
                                <CardDescription className="mt-1.5">Nghe và tự do trả lời câu hỏi bằng tiếng Hàn để vượt Mốc xuất sắc.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex sm:items-center sm:justify-between flex-col sm:flex-row gap-4 mb-6 shadow-sm">
                            <div className="flex gap-3 items-start">
                                <div className="p-2 bg-white rounded-full text-emerald-600 shadow-sm mt-0.5"><PlayCircle className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-800 mb-1">CÂU HỎI HỆ THỐNG:</p>
                                    <p className="font-medium text-lg text-emerald-950">{milestoneData.questionText}</p>
                                </div>
                            </div>
                            <Button size="icon" variant="outline" className="rounded-full shadow-sm hover:bg-emerald-100 text-emerald-700 shrink-0" onClick={() => speakText(milestoneData.questionText)}>
                                <Volume2 className="w-5 h-5" />
                            </Button>
                        </div>

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
                                        <><Mic className="w-5 h-5" /> Bật Mic Trả Lời</>
                                    )}
                                </Button>

                                <Button
                                    variant="secondary"
                                    className="sm:w-32 h-12 rounded-xl gap-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0"
                                    onClick={() => handleEvaluate('qa')}
                                    disabled={activeSection !== 2 || !transcript && !interimTranscript || isEvalQA}
                                >
                                    {isEvalQA ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Gửi nộp</>}
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
                        <ReportCard report={qaReport} isEvaluating={isEvalQA} />

                    </CardContent>
                </Card>

            </main>
        </div>
    )
}
