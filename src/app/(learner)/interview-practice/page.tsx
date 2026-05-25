'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InterviewPracticeScreen } from '@/components/interview/InterviewPracticeScreen'
import { ToolDragPracticeScreen } from '@/components/interview/ToolDragPracticeScreen'
import { toast } from 'sonner'
import { Headphones, Bot, ArrowLeft, Wrench, Mic, Briefcase, BookOpen, Sparkles } from 'lucide-react'

const CATEGORIES = ['Tất cả', 'Khẩu lệnh', 'Giao tiếp', 'Toán học', 'Xử lý tình huống', 'Sử dụng công cụ']
const INDUSTRIES = ['Sản xuất chế tạo', 'Ngư nghiệp', 'Nông nghiệp', 'Lâm nghiệp', 'Xây dựng', 'Dịch vụ']

function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array]
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]]
    }
    return newArr
}

export default function InterviewPracticePage() {
    const router = useRouter()
    const [step, setStep] = useState<'setup' | 'practice' | 'evaluating' | 'finished'>('setup')
    const [selectedCategory, setSelectedCategory] = useState('Tất cả')
    const [selectedIndustry, setSelectedIndustry] = useState('Sản xuất chế tạo')
    const [selectedMode, setSelectedMode] = useState<'listen_only' | 'ai_mock'>('listen_only')
    
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [evaluationResults, setEvaluationResults] = useState<any[]>([])

    const handleStart = async () => {
        setLoading(true)
        try {
            // Lấy danh sách câu hỏi
            const url = selectedCategory === 'Tất cả' 
                ? `/api/interview-questions?industry=${encodeURIComponent(selectedIndustry)}` 
                : `/api/interview-questions?category=${encodeURIComponent(selectedCategory)}&industry=${encodeURIComponent(selectedIndustry)}`
            
            const res = await fetch(url, { cache: 'no-store' })
            const data = await res.json()
            
            if (!data.success) throw new Error(data.error)
            
            // Lọc bỏ "Sử dụng công cụ" nếu chọn tất cả, vì nó dùng UI khác
            let filteredQuestions = data.data
            if (selectedCategory === 'Tất cả') {
                filteredQuestions = filteredQuestions.filter((q: any) => q.category !== 'Sử dụng công cụ')
            }

            // Tính năng ngẫu nhiên: Group theo category, trộn và lấy ra tối đa 2 câu mỗi phần
            const QUESTIONS_PER_CATEGORY = 2
            
            const grouped = filteredQuestions.reduce((acc: any, q: any) => {
                if (!acc[q.category]) acc[q.category] = []
                acc[q.category].push(q)
                return acc
            }, {})

            let finalQuestions: any[] = []
            
            Object.keys(grouped).forEach(cat => {
                const shuffled = shuffleArray(grouped[cat])
                finalQuestions.push(...shuffled.slice(0, QUESTIONS_PER_CATEGORY))
            })

            // Xáo trộn lại danh sách cuối cùng
            finalQuestions = shuffleArray(finalQuestions)

            if (finalQuestions.length === 0) {
                toast.error('Chưa có câu hỏi nào trong danh mục này')
                return
            }

            setQuestions(finalQuestions)
            setStep('practice')
        } catch (error) {
            toast.error('Lỗi khi tải câu hỏi')
        } finally {
            setLoading(false)
        }
    }

    const handleFinishPractice = async (submittedAnswers?: Record<string, string>) => {
        if (selectedMode !== 'ai_mock' || !submittedAnswers || Object.keys(submittedAnswers).length === 0) {
            setStep('finished')
            return
        }

        setAnswers(submittedAnswers)
        setStep('evaluating')

        try {
            const results = await Promise.all(
                Object.entries(submittedAnswers).map(async ([qId, transcript]) => {
                    const res = await fetch('/api/interview/evaluate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question_id: qId, transcript })
                    })
                    const data = await res.json()
                    const qInfo = questions.find(q => q.id === qId)
                    return { question_id: qId, transcript, question: qInfo, ...data.data }
                })
            )
            setEvaluationResults(results)
            setStep('finished')
        } catch (error) {
            toast.error('Lỗi khi chấm điểm. Vui lòng thử lại.')
            setStep('finished')
        }
    }

    if (step === 'practice') {
        return (
            <div className="min-h-screen bg-slate-50 pt-6">
                {selectedCategory === 'Sử dụng công cụ' ? (
                    <ToolDragPracticeScreen
                        questions={questions}
                        onFinish={handleFinishPractice}
                        onBack={() => setStep('setup')}
                    />
                ) : (
                    <InterviewPracticeScreen 
                        questions={questions} 
                        mode={selectedMode} 
                        onFinish={handleFinishPractice} 
                        onBack={() => setStep('setup')}
                    />
                )}
            </div>
        )
    }

    if (step === 'evaluating') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-none">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                        <Bot className="w-12 h-12 text-blue-500 animate-bounce relative z-10" />
                        <div className="absolute inset-0 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">AI đang chấm điểm...</h2>
                    <p className="text-gray-600">Vui lòng đợi trong giây lát, hệ thống đang phân tích toàn bộ câu trả lời của bạn.</p>
                </Card>
            </div>
        )
    }

    if (step === 'finished') {
        if (selectedMode === 'ai_mock' && evaluationResults.length > 0) {
            const totalScore = Math.round(evaluationResults.reduce((sum, r) => sum + (r.score || 0), 0) / evaluationResults.length)
            return (
                <div className="min-h-screen bg-slate-50 p-4 md:p-8">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="text-center space-y-4">
                            <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                                <span className="text-4xl font-black">{totalScore}</span>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900">Kết quả thi thử</h2>
                            <p className="text-gray-600">Đã chấm điểm xong {evaluationResults.length} câu hỏi</p>
                        </div>
                        
                        <div className="space-y-6">
                            {evaluationResults.map((result, idx) => (
                                <Card key={result.question_id} className="p-6 overflow-hidden relative shadow-sm border-gray-200">
                                    <div className={`absolute top-0 left-0 w-2 h-full ${result.is_correct ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <div className="pl-4 space-y-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <h4 className="font-semibold text-gray-800">Câu {idx + 1}: {result.question?.question_text}</h4>
                                                <p className="text-sm text-gray-500 mt-1">{result.question?.vietnamese_meaning}</p>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full font-bold text-sm shrink-0 ${result.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                {result.score}/100 điểm
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 pt-2">
                                            <div className="bg-gray-50 p-4 rounded-xl border">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bạn đã trả lời:</p>
                                                <p className="text-gray-900 font-medium">{result.transcript}</p>
                                            </div>
                                            <div className={`${result.is_correct ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} p-4 rounded-xl border`}>
                                                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${result.is_correct ? 'text-emerald-700' : 'text-red-700'}`}>Nhận xét của AI:</p>
                                                <p className="text-gray-800 text-sm">{result.feedback_vi}</p>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
                                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Gợi ý trả lời chuẩn:</p>
                                            <p className="text-gray-800 text-sm">{result.sample_answer}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 pb-12">
                            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-xl" onClick={() => router.push('/dashboard')}>Trở về Dashboard</Button>
                            <Button size="lg" className="h-14 px-8 text-lg rounded-xl shadow-lg" onClick={() => {
                                setStep('setup')
                                setEvaluationResults([])
                                setAnswers({})
                            }}>Thi thử lại</Button>
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircleIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Hoàn thành bài luyện tập!</h2>
                    <p className="text-gray-600">Bạn đã hoàn thành xong danh sách câu hỏi phỏng vấn.</p>
                    <div className="flex gap-4 justify-center pt-4">
                        <Button variant="outline" onClick={() => router.push('/dashboard')}>Trở về Dashboard</Button>
                        <Button onClick={() => setStep('setup')}>Luyện tập tiếp</Button>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden flex flex-col">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-emerald-50/50 -z-10" />
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] -z-10" />
            <div className="absolute top-40 -left-32 w-80 h-80 bg-emerald-400/20 rounded-full blur-[100px] -z-10" />

            <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-8 md:space-y-10 relative z-10">
                <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-2 -ml-4 hover:bg-white/60 transition-colors text-slate-600">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Trở về Dashboard
                </Button>

                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center p-3 md:p-4 bg-white rounded-2xl shadow-sm mb-1 border border-slate-100 ring-4 ring-white/50">
                        <Mic className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                    </div>
                    <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 pb-1 px-2">
                        Luyện Phỏng Vấn Vòng 2
                    </h1>
                    <p className="text-slate-600 text-sm md:text-base font-medium max-w-lg mx-auto px-4">
                        Hệ thống mô phỏng bài thi phỏng vấn thực tế với Giám khảo AI chuyên nghiệp
                    </p>
                </div>

                <Card className="p-4 md:p-8 space-y-6 md:space-y-8 border border-white/60 shadow-2xl bg-white/70 backdrop-blur-xl rounded-2xl md:rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                        <div className="space-y-2 md:space-y-3">
                            <h3 className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
                                1. Chọn ngành nghề thi
                            </h3>
                            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                                <SelectTrigger className="h-12 md:h-14 text-sm md:text-base bg-white/80 border-slate-200 hover:border-indigo-300 transition-colors rounded-xl shadow-sm focus:ring-indigo-500/20">
                                    <SelectValue placeholder="Chọn ngành nghề" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {INDUSTRIES.map(ind => (
                                        <SelectItem key={ind} value={ind} className="text-sm md:text-base py-2 md:py-3 cursor-pointer">{ind}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:space-y-3">
                            <h3 className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                                2. Chọn chủ đề luyện tập
                            </h3>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="h-12 md:h-14 text-sm md:text-base bg-white/80 border-slate-200 hover:border-emerald-300 transition-colors rounded-xl shadow-sm focus:ring-emerald-500/20">
                                    <SelectValue placeholder="Chọn chủ đề" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat} className="text-sm md:text-base py-2 md:py-3 cursor-pointer">{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>


                    {selectedCategory === 'Sử dụng công cụ' ? (
                        <div className="space-y-2 md:space-y-3 pt-2 border-t border-slate-200/50">
                            <h3 className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                                3. Chế độ luyện tập
                            </h3>
                            <div className="relative group cursor-default">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                                <div className="relative border-2 border-orange-400 bg-orange-50/80 rounded-2xl p-4 md:p-6 backdrop-blur-sm">
                                    <Wrench className="w-8 h-8 md:w-10 md:h-10 mb-3 text-orange-500" />
                                    <h4 className="text-base md:text-lg font-bold text-slate-900 mb-1">Thực hành kéo thả công cụ</h4>
                                    <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                                        Nghe khẩu lệnh từ giám khảo và thực hiện thao tác kéo thả vật phẩm vào đúng vị trí được yêu cầu. Hệ thống sẽ chấm điểm tự động chính xác.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 md:space-y-3 pt-2 border-t border-slate-200/50">
                            <h3 className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                                3. Chọn chế độ luyện tập
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
                                <div 
                                    className={`relative group cursor-pointer transition-all duration-300 ${selectedMode === 'listen_only' ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                                    onClick={() => setSelectedMode('listen_only')}
                                >
                                    {selectedMode === 'listen_only' && <div className="absolute inset-0 bg-blue-400 rounded-2xl blur opacity-25"></div>}
                                    <div className={`relative h-full rounded-2xl p-4 md:p-6 transition-all duration-300 backdrop-blur-sm border-2 ${
                                        selectedMode === 'listen_only' 
                                        ? 'border-blue-500 bg-blue-50/90 shadow-lg shadow-blue-500/10' 
                                        : 'border-slate-200/60 bg-white/60 hover:bg-white hover:border-blue-300 hover:shadow-md'
                                    }`}>
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 ${selectedMode === 'listen_only' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-500'} transition-colors`}>
                                            <Headphones className="w-5 h-5 md:w-6 md:h-6" />
                                        </div>
                                        <h4 className="text-base md:text-lg font-bold text-slate-900 mb-1">Chỉ luyện nghe</h4>
                                        <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                                            Nghe câu hỏi từ giám khảo, suy nghĩ và xem đáp án chuẩn. Phù hợp để làm quen với ngữ điệu.
                                        </p>
                                    </div>
                                </div>

                                <div 
                                    className={`relative group cursor-pointer transition-all duration-300 ${selectedMode === 'ai_mock' ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                                    onClick={() => setSelectedMode('ai_mock')}
                                >
                                    {selectedMode === 'ai_mock' && <div className="absolute inset-0 bg-emerald-400 rounded-2xl blur opacity-25"></div>}
                                    <div className={`relative h-full rounded-2xl p-4 md:p-6 transition-all duration-300 backdrop-blur-sm border-2 ${
                                        selectedMode === 'ai_mock' 
                                        ? 'border-emerald-500 bg-emerald-50/90 shadow-lg shadow-emerald-500/10' 
                                        : 'border-slate-200/60 bg-white/60 hover:bg-white hover:border-emerald-300 hover:shadow-md'
                                    }`}>
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 ${selectedMode === 'ai_mock' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-500'} transition-colors`}>
                                            <Bot className="w-5 h-5 md:w-6 md:h-6" />
                                        </div>
                                        <h4 className="text-base md:text-lg font-bold text-slate-900 mb-1">Thi thử với AI</h4>
                                        <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                                            Trả lời trực tiếp qua Micro. AI sẽ phân tích giọng nói, chấm điểm và chỉ ra lỗi sai của bạn.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-2 md:pt-4">
                        <Button 
                            size="lg" 
                            className="w-full h-12 md:h-14 text-base md:text-lg rounded-xl md:rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                            onClick={handleStart}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Đang chuẩn bị dữ liệu...
                                </span>
                            ) : (
                                selectedCategory === 'Sử dụng công cụ' 
                                    ? 'Bắt đầu thực hành' 
                                    : (selectedMode === 'ai_mock' ? 'Bắt đầu thi thử ngay' : 'Bắt đầu luyện tập')
                            )}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    )
}

function CheckCircleIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}
