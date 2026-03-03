"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Volume2, ArrowLeft, Loader2, Sparkles, Wand2, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function IntroGeneratorPage() {
    const router = useRouter()
    const supabase = createClient()
    const [allMilestones, setAllMilestones] = useState<any[]>([])

    // Form data
    const [formData, setFormData] = useState({
        name: "",
        age: "",
        dob: "",
        job: "",
        hobbies: "",
        personality: "",
        familySize: "",
        family: "",
        targetMilestoneId: ""
    })
    const [isGeneratingIntro, setIsGeneratingIntro] = useState(false)
    const [readingText, setReadingText] = useState("")
    const [speechRate, setSpeechRate] = useState<number>(1.0)

    useEffect(() => {
        const fetchMilestones = async () => {
            const { data } = await supabase.from('milestones').select('id, level, title').eq('is_active', true).order('level', { ascending: true })
            if (data) setAllMilestones(data)
        }
        fetchMilestones()
    }, [])

    const handleGenerateIntro = async () => {
        if (!formData.targetMilestoneId) {
            alert("Vui lòng chọn Mốc mục tiêu (Hệ thống sẽ lấy cấu trúc Ngữ pháp tương ứng)!")
            return
        }
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

    const speakText = (text: string, rate: number = 1.0) => {
        if (!window.speechSynthesis) {
            alert("Trình duyệt không hỗ trợ đọc Text to Speech")
            return
        }
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'ko-KR'
        utterance.rate = rate
        window.speechSynthesis.speak(utterance)
    }

    return (
        <div className="min-h-screen bg-amber-50/20 pb-20">
            <header className="bg-white border-b sticky top-0 z-10 px-4 md:px-8 py-4 flex items-center shadow-sm">
                <Button variant="ghost" size="icon" asChild className="mr-4 hover:bg-amber-100/50">
                    <Link href="/milestones"><ArrowLeft className="w-5 h-5 text-gray-700" /></Link>
                </Button>
                <div>
                    <h1 className="font-bold text-lg md:text-xl text-amber-900 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" /> Trợ Lý AI: Tạo Đoạn Giới Thiệu Bản Thân
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground">Lấp đầy thông tin, AI sẽ viết đoạn giới thiệu hoàn hảo chuẩn Hàn Quốc 100%</p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 mt-4">
                {/* Form Khai Báo */}
                <Card className="border-amber-200 border-2 shadow-md rounded-2xl overflow-hidden bg-gradient-to-br from-white to-amber-50/50">
                    <CardHeader className="bg-amber-100/30 border-b border-amber-100 pb-4">
                        <CardTitle className="text-amber-800 flex items-center gap-2 text-lg">
                            Form Cung Cấp Dữ Liệu Đầu Vào
                        </CardTitle>
                        <CardDescription className="text-amber-700/80">
                            Bạn điền càng chi tiết (bằng Tiếng Việt), AI càng có nhiều ý văn hay để soạn bài cho bạn!
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 grid sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5"><Label className="text-gray-700">Tên của bạn</Label><Input className="bg-white" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Thu Hiền, Tuấn Hưng..." /></div>
                        <div className="space-y-1.5"><Label className="text-gray-700">Ngày tháng năm sinh</Label><Input className="bg-white" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} placeholder="VD: 15/08/1999" /></div>
                        <div className="space-y-1.5"><Label className="text-gray-700">Tuổi / Quê quán</Label><Input className="bg-white" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} placeholder="VD: 25 tuổi, Quê Hà Nội" /></div>
                        <div className="space-y-1.5"><Label className="text-gray-700">Nghề nghiệp hiện tại / Ngành học</Label><Input className="bg-white" value={formData.job} onChange={e => setFormData({ ...formData, job: e.target.value })} placeholder="VD: Sinh viên IT, Nhân viên VP..." /></div>
                        <div className="space-y-1.5"><Label className="text-gray-700">Sở thích riêng</Label><Input className="bg-white" value={formData.hobbies} onChange={e => setFormData({ ...formData, hobbies: e.target.value })} placeholder="VD: Đọc sách, Nghe nhạc K-pop, Du lịch" /></div>
                        <div className="space-y-1.5"><Label className="text-gray-700">Điểm mạnh tính cách</Label><Input className="bg-white" value={formData.personality} onChange={e => setFormData({ ...formData, personality: e.target.value })} placeholder="VD: Hòa đồng, Hướng ngoại, Thích kết bạn" /></div>
                        <div className="space-y-1.5"><Label className="text-gray-700">Gia đình có bao nhiêu người?</Label><Input className="bg-white" value={formData.familySize} onChange={e => setFormData({ ...formData, familySize: e.target.value })} placeholder="VD: Gia đình có 4 người" /></div>
                        <div className="space-y-1.5"><Label className="text-gray-700">Kể rõ các thành viên</Label><Input className="bg-white" value={formData.family} onChange={e => setFormData({ ...formData, family: e.target.value })} placeholder="VD: Bố, Mẹ, Chị Gái và Tôi" /></div>

                        <div className="col-span-1 sm:col-span-2 space-y-2 mt-4 p-4 border rounded-xl bg-amber-50">
                            <Label className="text-amber-900 font-bold flex items-center gap-2 text-base">🎯 Mục tiêu lộ trình đánh giá (BẮT BUỘC)</Label>
                            <Select value={formData.targetMilestoneId} onValueChange={v => setFormData({ ...formData, targetMilestoneId: v })}>
                                <SelectTrigger className="w-full border-amber-300 bg-white h-12 shadow-sm focus:ring-amber-500">
                                    <SelectValue placeholder="-- Nhấp để Chọn mốc giáo trình mục tiêu --" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allMilestones.map(m => (
                                        <SelectItem key={m.id} value={m.id.toString()} className="font-medium cursor-pointer">
                                            Mốc Level {m.level} - {m.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-amber-700 mt-2 font-medium">
                                * Lõi AI Gemini sẽ phân tích Cấu trúc ngữ pháp trọng điểm của Level bạn chọn để ép buộc rập khuôn viết đoạn Giới Thiệu, giúp bạn bám sát trình độ nhất.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-amber-100/40 p-6 border-t border-amber-100/50 flex justify-center">
                        <Button
                            size="lg"
                            onClick={handleGenerateIntro}
                            disabled={isGeneratingIntro}
                            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200 gap-2 rounded-xl text-lg h-14 px-8 transition-all"
                        >
                            {isGeneratingIntro ? <Loader2 className="w-6 h-6 animate-spin" /> : <Wand2 className="w-6 h-6" />}
                            {isGeneratingIntro ? "Hệ thống đang Soạn văn mẫu..." : "Phù Phép Đoạn Giới Thiệu Cá Nhân"}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Kết quả Sinh Thành Text */}
                {readingText && (
                    <Card className="shadow-xl border-emerald-200/60 rounded-2xl overflow-hidden mt-8 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
                        <CardHeader className="bg-gradient-to-r from-emerald-50/80 to-teal-50/30 border-b border-emerald-100 pb-5">
                            <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-2 text-emerald-800">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                        Thành phẩm Viết Tiếng Hàn
                                    </CardTitle>
                                    <CardDescription className="mt-1.5 text-emerald-700/80">Bạn có thể học thuộc ngay đoạn này để đi phỏng vấn hoặc thi Speaking.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2 bg-white p-1 rounded-full border border-emerald-100 shadow-sm">
                                    <select
                                        className="h-9 px-3 border-none rounded-full text-sm text-emerald-700 bg-transparent font-medium cursor-pointer outline-none"
                                        value={speechRate}
                                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                    >
                                        <option value="0.5">0.5x (Chậm dãi)</option>
                                        <option value="0.75">0.75x</option>
                                        <option value="1">1.0x (Chuẩn)</option>
                                    </select>
                                    <Button variant="default" size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md px-4" onClick={() => speakText(readingText, speechRate)}>
                                        <Volume2 className="w-4 h-4" /> Bấm Nghe Máy Đọc mẫu
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 bg-white">
                            <div className="p-6 bg-emerald-50/40 border border-emerald-100 rounded-xl text-lg md:text-xl font-medium leading-[2.2] text-gray-800 relative group shadow-inner">
                                {readingText.split('\n').map((para, i) => (
                                    <p key={i} className="mb-4 last:mb-0 break-words">{para}</p>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    )
}
