'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { InterviewPracticeScreen } from '@/components/interview/InterviewPracticeScreen'
import { ToolDragPracticeScreen } from '@/components/interview/ToolDragPracticeScreen'
import { toast } from 'sonner'
import { Headphones, Bot, ArrowLeft, Wrench, Mic, CheckCircle, Calculator, MessageSquare, Presentation, Factory, Fish, Trees, Tractor, Home, Coffee } from 'lucide-react'

const INDUSTRIES = [
    { 
        id: 'Sản xuất chế tạo', name: 'Sản xuất chế tạo', 
        desc: 'Công xưởng, gia công, lắp ráp',
        icon: Factory, 
        color: 'text-blue-600', 
        gradient: 'from-blue-50 to-blue-100/50',
        hoverGradient: 'hover:from-blue-100 hover:to-blue-200/50',
        borderColor: 'border-blue-100 hover:border-blue-300',
        shadow: 'hover:shadow-blue-200/50'
    },
    { 
        id: 'Ngư nghiệp', name: 'Ngư nghiệp', 
        desc: 'Đánh bắt, nuôi trồng thủy sản',
        icon: Fish, 
        color: 'text-cyan-600', 
        gradient: 'from-cyan-50 to-cyan-100/50',
        hoverGradient: 'hover:from-cyan-100 hover:to-cyan-200/50',
        borderColor: 'border-cyan-100 hover:border-cyan-300',
        shadow: 'hover:shadow-cyan-200/50'
    },
    { 
        id: 'Nông nghiệp', name: 'Nông nghiệp', 
        desc: 'Trồng trọt, chăn nuôi, thu hoạch',
        icon: Tractor, 
        color: 'text-emerald-600', 
        gradient: 'from-emerald-50 to-emerald-100/50',
        hoverGradient: 'hover:from-emerald-100 hover:to-emerald-200/50',
        borderColor: 'border-emerald-100 hover:border-emerald-300',
        shadow: 'hover:shadow-emerald-200/50'
    },
    { 
        id: 'Lâm nghiệp', name: 'Lâm nghiệp', 
        desc: 'Trồng rừng, khai thác gỗ',
        icon: Trees, 
        color: 'text-green-600', 
        gradient: 'from-green-50 to-green-100/50',
        hoverGradient: 'hover:from-green-100 hover:to-green-200/50',
        borderColor: 'border-green-100 hover:border-green-300',
        shadow: 'hover:shadow-green-200/50'
    },
    { 
        id: 'Xây dựng', name: 'Xây dựng', 
        desc: 'Công trình, mộc, cốt thép',
        icon: Home, 
        color: 'text-orange-600', 
        gradient: 'from-orange-50 to-orange-100/50',
        hoverGradient: 'hover:from-orange-100 hover:to-orange-200/50',
        borderColor: 'border-orange-100 hover:border-orange-300',
        shadow: 'hover:shadow-orange-200/50'
    },
    { 
        id: 'Dịch vụ', name: 'Dịch vụ', 
        desc: 'Nhà hàng, khách sạn, bán hàng',
        icon: Coffee, 
        color: 'text-purple-600', 
        gradient: 'from-purple-50 to-purple-100/50',
        hoverGradient: 'hover:from-purple-100 hover:to-purple-200/50',
        borderColor: 'border-purple-100 hover:border-purple-300',
        shadow: 'hover:shadow-purple-200/50'
    },
]

const TOPICS = [
    { 
        id: 'command', 
        name: 'Khẩu lệnh phản xạ', 
        description: 'Chỉ áp dụng chế độ nghe và tự hành động.',
        icon: Headphones,
        color: 'text-indigo-600', 
        gradient: 'from-indigo-50 to-indigo-100/50',
        hoverGradient: 'hover:from-indigo-100 hover:to-indigo-200/50',
        borderColor: 'border-indigo-100 hover:border-indigo-300',
        shadow: 'hover:shadow-indigo-200/50',
        apiCategory: 'Khẩu lệnh',
        mode: 'listen_only'
    },
    { 
        id: 'vocabulary', 
        name: 'Từ vựng & Biển báo', 
        description: 'Flashcard, Trắc nghiệm, Ghép chữ, AI chấm điểm.',
        icon: Presentation,
        color: 'text-pink-600',
        gradient: 'from-pink-50 to-pink-100/50',
        hoverGradient: 'hover:from-pink-100 hover:to-pink-200/50',
        borderColor: 'border-pink-100 hover:border-pink-300',
        shadow: 'hover:shadow-pink-200/50',
        action: 'navigate',
        href: '/vocabulary-practice'
    },
    { 
        id: 'tools', 
        name: 'Sử dụng công cụ', 
        description: 'Chạy game kéo thả vật phẩm vào đúng vị trí.',
        icon: Wrench,
        color: 'text-orange-600',
        gradient: 'from-orange-50 to-orange-100/50',
        hoverGradient: 'hover:from-orange-100 hover:to-orange-200/50',
        borderColor: 'border-orange-100 hover:border-orange-300',
        shadow: 'hover:shadow-orange-200/50',
        apiCategory: 'Sử dụng công cụ',
        mode: 'tools'
    },
    { 
        id: 'math', 
        name: 'Toán học & Tính toán', 
        description: 'Hỏi đáp tính toán, AI chấm điểm tự động.',
        icon: Calculator,
        color: 'text-rose-600',
        gradient: 'from-rose-50 to-rose-100/50',
        hoverGradient: 'hover:from-rose-100 hover:to-rose-200/50',
        borderColor: 'border-rose-100 hover:border-rose-300',
        shadow: 'hover:shadow-rose-200/50',
        apiCategory: 'Toán học',
        mode: 'ai_mock'
    },
    { 
        id: 'communication', 
        name: 'Giao tiếp & Tình huống', 
        description: 'Hội thoại thực tế, AI đóng vai giám khảo.',
        icon: MessageSquare,
        color: 'text-emerald-600',
        gradient: 'from-emerald-50 to-emerald-100/50',
        hoverGradient: 'hover:from-emerald-100 hover:to-emerald-200/50',
        borderColor: 'border-emerald-100 hover:border-emerald-300',
        shadow: 'hover:shadow-emerald-200/50',
        apiCategory: 'Giao tiếp,Xử lý tình huống',
        mode: 'ai_mock'
    },
]

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
    const [step, setStep] = useState<'industry' | 'topic' | 'practice' | 'evaluating' | 'finished'>('industry')
    const [selectedIndustry, setSelectedIndustry] = useState<string>('')
    const [selectedTopicObj, setSelectedTopicObj] = useState<any>(null)
    
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [evaluationResults, setEvaluationResults] = useState<any[]>([])

    const handleSelectIndustry = (indId: string) => {
        setSelectedIndustry(indId)
        setStep('topic')
    }

    const handleSelectTopic = async (topic: any) => {
        if (topic.action === 'navigate') {
            router.push(`${topic.href}?industry=${encodeURIComponent(selectedIndustry)}`)
            return
        }

        setSelectedTopicObj(topic)
        setLoading(true)
        try {
            const url = `/api/interview-questions?category=${encodeURIComponent(topic.apiCategory)}&industry=${encodeURIComponent(selectedIndustry)}`
            
            const res = await fetch(url, { cache: 'no-store' })
            const data = await res.json()
            
            if (!data.success) throw new Error(data.error)
            
            let finalQuestions = shuffleArray(data.data)

            // Random limit based on mode
            if (topic.mode === 'listen_only') {
                finalQuestions = finalQuestions.slice(0, 10)
            } else if (topic.mode === 'ai_mock') {
                finalQuestions = finalQuestions.slice(0, 5) // Mock 5 questions
            } else if (topic.mode === 'tools') {
                finalQuestions = finalQuestions.slice(0, 5)
            }

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
        if (selectedTopicObj?.mode !== 'ai_mock' || !submittedAnswers || Object.keys(submittedAnswers).length === 0) {
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
                {selectedTopicObj?.mode === 'tools' ? (
                    <ToolDragPracticeScreen
                        questions={questions}
                        onFinish={handleFinishPractice}
                        onBack={() => setStep('topic')}
                    />
                ) : (
                    <InterviewPracticeScreen 
                        questions={questions} 
                        mode={selectedTopicObj?.mode as 'listen_only' | 'ai_mock'} 
                        onFinish={handleFinishPractice} 
                        onBack={() => setStep('topic')}
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
        if (selectedTopicObj?.mode === 'ai_mock' && evaluationResults.length > 0) {
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
                                setStep('topic')
                                setEvaluationResults([])
                                setAnswers({})
                            }}>Luyện tiếp chủ đề này</Button>
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-6 border-none shadow-xl">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Hoàn thành bài luyện tập!</h2>
                    <p className="text-gray-600">Bạn đã hoàn thành xong danh sách câu hỏi phỏng vấn.</p>
                    <div className="flex gap-4 justify-center pt-4">
                        <Button variant="outline" onClick={() => router.push('/dashboard')}>Dashboard</Button>
                        <Button onClick={() => setStep('topic')}>Luyện tập tiếp</Button>
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

            <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6 md:space-y-8 relative z-10">
                <div className="flex items-center gap-3 md:gap-4 mb-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                            if (step === 'topic') setStep('industry')
                            else router.push('/dashboard')
                        }} 
                        className="hover:bg-white/60 text-slate-600 rounded-full h-10 w-10 md:h-12 md:w-12 shrink-0 bg-white/40 shadow-sm border border-white/50"
                    >
                        <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </Button>
                    
                    <div className="flex items-center gap-3">
                        <div className="inline-flex items-center justify-center p-2.5 md:p-3 bg-white rounded-xl shadow-sm border border-slate-100 ring-2 ring-white/50">
                            <Mic className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                        </div>
                        <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                            Luyện Phỏng Vấn Vòng 2
                        </h1>
                    </div>
                </div>

                {step === 'industry' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Chọn Ngành Nghề Dự Thi</h2>
                            <p className="text-slate-500">Vui lòng chọn đúng ngành nghề bạn đã đăng ký thi EPS-TOPIK</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                            {INDUSTRIES.map((ind) => {
                                const Icon = ind.icon
                                return (
                                    <div 
                                        key={ind.id}
                                        onClick={() => handleSelectIndustry(ind.id)}
                                        className={`group cursor-pointer rounded-3xl p-6 border-2 transition-all duration-300 transform hover:-translate-y-1.5 shadow-sm hover:shadow-xl bg-gradient-to-br ${ind.gradient} ${ind.hoverGradient} ${ind.borderColor} ${ind.shadow} relative overflow-hidden`}
                                    >
                                        <div className="absolute -right-6 -bottom-6 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500 transform group-hover:scale-110 group-hover:rotate-12">
                                            <Icon className="w-40 h-40" />
                                        </div>
                                        <div className="relative z-10">
                                            <div className={`w-14 h-14 rounded-2xl bg-white/60 shadow-sm border border-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 ${ind.color}`}>
                                                <Icon className="w-7 h-7" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800 mb-1.5 group-hover:text-slate-900 transition-colors">{ind.name}</h3>
                                            <p className="text-sm font-medium text-slate-500 line-clamp-2">{ind.desc}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {step === 'topic' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Chọn Chủ Đề Luyện Tập</h2>
                            <p className="text-slate-500">Ngành nghề đã chọn: <strong className="text-blue-600">{selectedIndustry}</strong></p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {TOPICS.map((topic) => {
                                const Icon = topic.icon
                                return (
                                    <div 
                                        key={topic.id}
                                        onClick={() => handleSelectTopic(topic)}
                                        className={`group cursor-pointer rounded-3xl p-6 md:p-8 border-2 transition-all duration-300 transform hover:-translate-y-1.5 shadow-sm hover:shadow-xl bg-gradient-to-br ${topic.gradient} ${topic.hoverGradient} ${topic.borderColor} ${topic.shadow} relative overflow-hidden flex items-center gap-5 md:gap-6`}
                                    >
                                        <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 transform group-hover:scale-110 group-hover:-rotate-12">
                                            <Icon className="w-48 h-48" />
                                        </div>
                                        <div className={`relative z-10 w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl bg-white/70 shadow-sm border border-white flex items-center justify-center group-hover:scale-105 transition-transform duration-300 ${topic.color}`}>
                                            <Icon className="w-8 h-8 md:w-10 md:h-10" />
                                        </div>
                                        <div className="relative z-10 flex-1">
                                            <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">{topic.name}</h3>
                                            <p className="text-sm md:text-base font-medium text-slate-600 leading-relaxed">{topic.description}</p>
                                        </div>
                                        {loading && selectedTopicObj?.id === topic.id && (
                                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-sm font-bold text-blue-700 bg-white px-3 py-1 rounded-full shadow-sm">Đang tải...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
