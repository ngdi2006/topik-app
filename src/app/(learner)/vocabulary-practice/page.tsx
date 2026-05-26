'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, BookOpen, Layers, Type, Mic, Briefcase, Sparkles, AlertCircle } from 'lucide-react'
import FlashcardMode from '@/components/vocabulary-vong2/FlashcardMode'
import QuizMode from '@/components/vocabulary-vong2/QuizMode'
import SpellingMode from '@/components/vocabulary-vong2/SpellingMode'
import VoiceAiMode from '@/components/vocabulary-vong2/VoiceAiMode'

const INDUSTRIES = ['COMMON', 'MANUFACTURING', 'FISHERY', 'AGRICULTURE', 'FORESTRY', 'SERVICE', 'CONSTRUCTION']
const INDUSTRY_LABELS: Record<string, string> = {
    'COMMON': 'Chung (Tất cả ngành)',
    'MANUFACTURING': 'Sản xuất chế tạo',
    'FISHERY': 'Ngư nghiệp',
    'AGRICULTURE': 'Nông nghiệp',
    'FORESTRY': 'Lâm nghiệp',
    'SERVICE': 'Dịch vụ',
    'CONSTRUCTION': 'Xây dựng'
}
const TYPES = ['ALL', 'TOOL', 'SIGN']

type Mode = 'flashcard' | 'quiz' | 'spelling' | 'voice'
type Step = 'setup' | 'practice'

export default function VocabularyPracticePage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>('setup')
    const [selectedIndustry, setSelectedIndustry] = useState<string>('COMMON')
    const [selectedType, setSelectedType] = useState<string>('ALL')
    const [selectedMode, setSelectedMode] = useState<Mode>('flashcard')
    const [loading, setLoading] = useState(false)
    const [vocabList, setVocabList] = useState<any[]>([])

    const handleStart = async () => {
        setLoading(true)
        try {
            const url = new URL('/api/vocabulary-vong2', window.location.origin)
            if (selectedIndustry !== 'COMMON') {
                url.searchParams.set('industry', selectedIndustry)
            }
            if (selectedType !== 'ALL') {
                url.searchParams.set('type', selectedType)
            }

            const res = await fetch(url.toString(), { cache: 'no-store' })
            const data = await res.json()

            if (data.success) {
                if (data.data.length === 0) {
                    alert('Chưa có dữ liệu từ vựng cho lựa chọn này!')
                } else {
                    // Shuffle
                    const shuffled = [...data.data].sort(() => Math.random() - 0.5)
                    setVocabList(shuffled)
                    setStep('practice')
                }
            } else {
                alert('Lỗi tải dữ liệu: ' + data.error)
            }
        } catch (error) {
            console.error(error)
            alert('Lỗi hệ thống')
        } finally {
            setLoading(false)
        }
    }

    if (step === 'practice') {
        return (
            <div className="min-h-screen bg-[#f8fafc]">
                {selectedMode === 'flashcard' && <FlashcardMode vocabList={vocabList} onBack={() => setStep('setup')} />}
                {selectedMode === 'quiz' && <QuizMode vocabList={vocabList} onBack={() => setStep('setup')} />}
                {selectedMode === 'spelling' && <SpellingMode vocabList={vocabList} onBack={() => setStep('setup')} />}
                {selectedMode === 'voice' && <VoiceAiMode vocabList={vocabList} onBack={() => setStep('setup')} />}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden flex flex-col">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-50 via-purple-50/50 to-pink-50/50 -z-10" />
            
            <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6 md:space-y-8 relative z-10">
                <div className="flex items-center gap-3 md:gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="hover:bg-white/60 text-slate-600 rounded-full h-10 w-10 md:h-12 md:w-12 shrink-0 bg-white/40 shadow-sm border border-white/50">
                        <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </Button>
                    
                    <div className="flex items-center gap-3">
                        <div className="inline-flex items-center justify-center p-2.5 md:p-3 bg-white rounded-xl shadow-sm border border-slate-100 ring-2 ring-white/50">
                            <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                        </div>
                        <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700">
                            Từ vựng & Biển báo
                        </h1>
                    </div>
                </div>

                <Card className="p-4 md:p-8 space-y-6 md:space-y-8 border border-white/60 shadow-2xl bg-white/70 backdrop-blur-xl rounded-2xl md:rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                        <div className="space-y-2 md:space-y-3">
                            <h3 className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
                                1. Ngành nghề
                            </h3>
                            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                                <SelectTrigger className="h-12 md:h-14 text-sm md:text-base bg-white/80 rounded-xl">
                                    <SelectValue placeholder="Chọn ngành nghề" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {INDUSTRIES.map(ind => (
                                        <SelectItem key={ind} value={ind} className="text-sm md:text-base py-2">{INDUSTRY_LABELS[ind]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:space-y-3">
                            <h3 className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-pink-500" />
                                2. Phân loại
                            </h3>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger className="h-12 md:h-14 text-sm md:text-base bg-white/80 rounded-xl">
                                    <SelectValue placeholder="Chọn phân loại" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="ALL">Tất cả</SelectItem>
                                    <SelectItem value="TOOL">Công cụ / Vật dụng</SelectItem>
                                    <SelectItem value="SIGN">Biển báo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2 md:space-y-3 pt-2 border-t border-slate-200/50">
                        <h3 className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                            3. Chọn chế độ luyện tập
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
                            
                            {/* Mode 1 */}
                            <div className={`relative group cursor-pointer transition-all duration-300 ${selectedMode === 'flashcard' ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`} onClick={() => setSelectedMode('flashcard')}>
                                <div className={`relative h-full rounded-2xl p-4 md:p-6 transition-all duration-300 backdrop-blur-sm border-2 ${selectedMode === 'flashcard' ? 'border-purple-500 bg-purple-50/90 shadow-lg' : 'border-slate-200/60 bg-white/60 hover:bg-white hover:border-purple-300'}`}>
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 ${selectedMode === 'flashcard' ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-500'} transition-colors`}>
                                        <Layers className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <h4 className="text-base md:text-lg font-bold text-slate-900 mb-1">Flashcard</h4>
                                    <p className="text-slate-500 text-xs md:text-sm leading-relaxed">Lật thẻ học từ vựng, tự động lặp lại từ chưa thuộc.</p>
                                </div>
                            </div>

                            {/* Mode 2 */}
                            <div className={`relative group cursor-pointer transition-all duration-300 ${selectedMode === 'quiz' ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`} onClick={() => setSelectedMode('quiz')}>
                                <div className={`relative h-full rounded-2xl p-4 md:p-6 transition-all duration-300 backdrop-blur-sm border-2 ${selectedMode === 'quiz' ? 'border-pink-500 bg-pink-50/90 shadow-lg' : 'border-slate-200/60 bg-white/60 hover:bg-white hover:border-pink-300'}`}>
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 ${selectedMode === 'quiz' ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-pink-100 group-hover:text-pink-500'} transition-colors`}>
                                        <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <h4 className="text-base md:text-lg font-bold text-slate-900 mb-1">Trắc nghiệm hình ảnh</h4>
                                    <p className="text-slate-500 text-xs md:text-sm leading-relaxed">Chọn 1 trong 4 đáp án đúng với áp lực thời gian (10s).</p>
                                </div>
                            </div>

                            {/* Mode 3 */}
                            <div className={`relative group cursor-pointer transition-all duration-300 ${selectedMode === 'spelling' ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`} onClick={() => setSelectedMode('spelling')}>
                                <div className={`relative h-full rounded-2xl p-4 md:p-6 transition-all duration-300 backdrop-blur-sm border-2 ${selectedMode === 'spelling' ? 'border-orange-500 bg-orange-50/90 shadow-lg' : 'border-slate-200/60 bg-white/60 hover:bg-white hover:border-orange-300'}`}>
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 ${selectedMode === 'spelling' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-orange-100 group-hover:text-orange-500'} transition-colors`}>
                                        <Type className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <h4 className="text-base md:text-lg font-bold text-slate-900 mb-1">Ghép chữ</h4>
                                    <p className="text-slate-500 text-xs md:text-sm leading-relaxed">Sắp xếp các ký tự bị xáo trộn thành từ vựng hoàn chỉnh.</p>
                                </div>
                            </div>

                            {/* Mode 4 */}
                            <div className={`relative group cursor-pointer transition-all duration-300 ${selectedMode === 'voice' ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`} onClick={() => setSelectedMode('voice')}>
                                <div className={`relative h-full rounded-2xl p-4 md:p-6 transition-all duration-300 backdrop-blur-sm border-2 ${selectedMode === 'voice' ? 'border-blue-500 bg-blue-50/90 shadow-lg' : 'border-slate-200/60 bg-white/60 hover:bg-white hover:border-blue-300'}`}>
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 ${selectedMode === 'voice' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-500'} transition-colors`}>
                                        <Mic className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <h4 className="text-base md:text-lg font-bold text-slate-900 mb-1">Thực chiến với AI</h4>
                                    <p className="text-slate-500 text-xs md:text-sm leading-relaxed">Đọc to tên sự vật vào Micro, AI sẽ kiểm tra phát âm của bạn.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 md:pt-4">
                        <Button 
                            size="lg" 
                            className="w-full h-12 md:h-14 text-base md:text-lg rounded-xl md:rounded-2xl shadow-xl transition-all hover:-translate-y-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold"
                            onClick={handleStart}
                            disabled={loading}
                        >
                            {loading ? 'Đang chuẩn bị dữ liệu...' : 'Bắt đầu luyện tập'}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    )
}
