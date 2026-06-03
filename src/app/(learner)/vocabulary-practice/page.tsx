'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, BookOpen, Layers, Type, Mic, Briefcase, Sparkles, AlertCircle, Volume2 } from 'lucide-react'
import FlashcardMode from '@/components/vocabulary-vong2/FlashcardMode'
import QuizMode from '@/components/vocabulary-vong2/QuizMode'
import SpellingMode from '@/components/vocabulary-vong2/SpellingMode'
import PodcastMode from '@/components/vocabulary-vong2/PodcastMode'

const INDUSTRIES = ['MANUFACTURING', 'FISHERY', 'AGRICULTURE', 'FORESTRY', 'SERVICE', 'CONSTRUCTION']
const INDUSTRY_LABELS: Record<string, string> = {
    'MANUFACTURING': 'Sản xuất chế tạo',
    'FISHERY': 'Ngư nghiệp',
    'AGRICULTURE': 'Nông nghiệp',
    'FORESTRY': 'Lâm nghiệp',
    'SERVICE': 'Dịch vụ',
    'CONSTRUCTION': 'Xây dựng'
}

const TOPICS = [
    { id: 'TOOL', label: 'Công cụ / Vật dụng', icon: Briefcase },
    { id: 'SIGN', label: 'Hệ thống biển báo', icon: AlertCircle },
    { id: 'COMMAND', label: 'Khẩu lệnh / Chỉ thị', icon: Mic },
]

type Mode = 'flashcard' | 'quiz' | 'spelling' | 'podcast'
type Step = 'select_industry' | 'select_topic' | 'select_mode' | 'practice'

export default function VocabularyPracticePage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>('select_industry')
    const [selectedIndustry, setSelectedIndustry] = useState<string>('MANUFACTURING')
    const [selectedTopic, setSelectedTopic] = useState<string>('TOOL')
    const [selectedMode, setSelectedMode] = useState<Mode>('flashcard')
    const [loading, setLoading] = useState(false)
    const [vocabList, setVocabList] = useState<any[]>([])

    const handleStart = async (mode: Mode) => {
        setSelectedMode(mode)
        setLoading(true)
        try {
            const url = new URL('/api/vocabulary-vong2', window.location.origin)
            if (selectedIndustry) {
                url.searchParams.set('industry', selectedIndustry)
            }
            if (selectedTopic) {
                url.searchParams.set('type', selectedTopic)
            }

            const res = await fetch(url.toString(), { cache: 'no-store' })
            const data = await res.json()

            if (data.success) {
                if (data.data.length === 0) {
                    alert('Chưa có dữ liệu từ vựng cho lựa chọn này!')
                } else {
                    const shuffled = [...data.data].sort(() => Math.random() - 0.5).map(item => {
                        let imgUrl = item.image_url;
                        if (imgUrl) {
                            if (imgUrl.match(/^https?:\/\/[0-9a-fA-F]{6}/)) {
                                imgUrl = imgUrl.replace(/^https?:\/\//, 'https://placehold.co/150x150/');
                            } else if (imgUrl.match(/^[0-9a-fA-F]{6}/)) {
                                imgUrl = `https://placehold.co/150x150/${imgUrl}`;
                            }
                        }
                        return { ...item, image_url: imgUrl };
                    })
                    setVocabList(shuffled)
                    
                    // PRELOAD / PREFETCH assets
                    const preloadPromises: Promise<any>[] = []
                    shuffled.forEach(item => {
                        if (item.image_url) {
                            preloadPromises.push(new Promise((resolve) => {
                                const img = new Image()
                                img.onload = resolve
                                img.onerror = resolve
                                img.src = item.image_url
                            }))
                        }
                        if (item.audio_url) {
                            preloadPromises.push(new Promise((resolve) => {
                                const audio = new Audio()
                                audio.addEventListener('canplaythrough', resolve, { once: true })
                                audio.onerror = resolve
                                audio.src = item.audio_url
                            }))
                        }
                    })
                    // Wait up to 3 seconds for preloading to avoid freezing
                    await Promise.race([
                        Promise.all(preloadPromises),
                        new Promise(resolve => setTimeout(resolve, 3000))
                    ])

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
                {selectedMode === 'flashcard' && <FlashcardMode vocabList={vocabList} onBack={() => setStep('select_mode')} />}
                {selectedMode === 'quiz' && <QuizMode vocabList={vocabList} onBack={() => setStep('select_mode')} />}
                {selectedMode === 'spelling' && <SpellingMode vocabList={vocabList} onBack={() => setStep('select_mode')} />}
                {selectedMode === 'podcast' && <PodcastMode vocabList={vocabList} onBack={() => setStep('select_mode')} />}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-50 via-purple-50/50 to-pink-50/50 -z-10" />
            
            <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6 md:space-y-8 relative z-10">
                <div className="flex items-center gap-3 md:gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                            if (step === 'select_topic') setStep('select_industry')
                            else if (step === 'select_mode') setStep('select_topic')
                            else router.push('/dashboard')
                        }} 
                        className="hover:bg-white/60 text-slate-600 rounded-full h-10 w-10 md:h-12 md:w-12 shrink-0 bg-white/40 shadow-sm border border-white/50"
                    >
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

                {step === 'select_industry' && (
                    <Card className="p-6 md:p-10 space-y-8 border border-white/60 shadow-xl bg-white/70 backdrop-blur-xl rounded-2xl md:rounded-[2rem] animate-in slide-in-from-right duration-300">
                        <h2 className="text-2xl font-bold text-center text-slate-800">1. Chọn Ngành Nghề</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {INDUSTRIES.map(ind => (
                                <div 
                                    key={ind}
                                    onClick={() => { setSelectedIndustry(ind); setStep('select_topic'); }}
                                    className="p-6 rounded-2xl border-2 border-indigo-100 bg-white hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer text-center group"
                                >
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                        <Briefcase className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-slate-700 group-hover:text-indigo-700">{INDUSTRY_LABELS[ind]}</h3>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {step === 'select_topic' && (
                    <Card className="p-6 md:p-10 space-y-8 border border-white/60 shadow-xl bg-white/70 backdrop-blur-xl rounded-2xl md:rounded-[2rem] animate-in slide-in-from-right duration-300">
                        <h2 className="text-2xl font-bold text-center text-slate-800">2. Chọn Chủ Đề</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {TOPICS.map(topic => {
                                const Icon = topic.icon
                                return (
                                    <div 
                                        key={topic.id}
                                        onClick={() => { setSelectedTopic(topic.id); setStep('select_mode'); }}
                                        className="p-6 rounded-2xl border-2 border-purple-100 bg-white hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer text-center group flex flex-col items-center justify-center"
                                    >
                                        <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-slate-700 group-hover:text-purple-700">{topic.label}</h3>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                )}

                {step === 'select_mode' && (
                    <Card className="p-6 md:p-10 space-y-8 border border-white/60 shadow-xl bg-white/70 backdrop-blur-xl rounded-2xl md:rounded-[2rem] relative overflow-hidden animate-in slide-in-from-right duration-300">
                        <h2 className="text-2xl font-bold text-center text-slate-800">3. Chọn Chế Độ Học</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            
                            <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-1" onClick={() => handleStart('flashcard')}>
                                <div className="h-full rounded-2xl p-6 transition-all duration-300 border-2 border-slate-200/60 bg-white hover:border-purple-400 shadow-sm hover:shadow-xl">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-purple-100 text-purple-600 transition-colors">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 mb-2">Flashcard tự động lật</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">Lật thẻ 3D tự động sau đếm ngược, hiển thị nghĩa và âm thanh.</p>
                                </div>
                            </div>

                            <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-1" onClick={() => handleStart('quiz')}>
                                <div className="h-full rounded-2xl p-6 transition-all duration-300 border-2 border-slate-200/60 bg-white hover:border-pink-400 shadow-sm hover:shadow-xl">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-pink-100 text-pink-600 transition-colors">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 mb-2">Trắc nghiệm hình ảnh</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">Chọn đáp án đúng từ 4 gợi ý trong thời gian giới hạn.</p>
                                </div>
                            </div>

                            <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-1" onClick={() => handleStart('spelling')}>
                                <div className="h-full rounded-2xl p-6 transition-all duration-300 border-2 border-slate-200/60 bg-white hover:border-orange-400 shadow-sm hover:shadow-xl">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-orange-100 text-orange-600 transition-colors">
                                        <Type className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 mb-2">Ghép chữ (Word Puzzle)</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">Ghép các ký tự bị xáo trộn để tạo thành từ vựng chính xác.</p>
                                </div>
                            </div>

                            <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-1" onClick={() => handleStart('podcast')}>
                                <div className="h-full rounded-2xl p-6 transition-all duration-300 border-2 border-slate-200/60 bg-white hover:border-blue-400 shadow-sm hover:shadow-xl">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-blue-100 text-blue-600 transition-colors">
                                        <Volume2 className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 mb-2">Nghe thụ động (Podcast)</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">Phát tự động liên tục âm thanh và nghĩa, không cần thao tác tay.</p>
                                </div>
                            </div>
                        </div>

                        {loading && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl md:rounded-[2rem]">
                                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-semibold text-indigo-700">Đang chuẩn bị nội dung...</p>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    )
}
