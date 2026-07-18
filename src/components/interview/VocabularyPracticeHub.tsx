'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, Layers, Type, Mic, Briefcase, AlertCircle, Volume2, LayoutGrid, Info, ChevronRight, CheckCircle, Eye, EyeOff, Bookmark, Trash2, Calculator } from 'lucide-react'
import FlashcardMode, { getKoreanDescription } from '@/components/vocabulary-vong2/FlashcardMode'
import QuizMode from '@/components/vocabulary-vong2/QuizMode'
import SpellingMode from '@/components/vocabulary-vong2/SpellingMode'
import PodcastMode from '@/components/vocabulary-vong2/PodcastMode'
import { speakText, stopTTS } from '@/lib/tts'

const INDUSTRIES = ['MANUFACTURING', 'FISHERY', 'AGRICULTURE', 'FORESTRY', 'SERVICE', 'CONSTRUCTION']
const INDUSTRY_LABELS: Record<string, string> = {
    'MANUFACTURING': 'Sản xuất chế tạo',
    'FISHERY': 'Ngư nghiệp',
    'AGRICULTURE': 'Nông nghiệp',
    'FORESTRY': 'Lâm nghiệp',
    'SERVICE': 'Dịch vụ',
    'CONSTRUCTION': 'Xây dựng'
}
const INDUSTRY_EMOJI: Record<string, string> = {
    'MANUFACTURING': '🏭', 'FISHERY': '🐟', 'AGRICULTURE': '🌾',
    'FORESTRY': '🌲', 'SERVICE': '☕', 'CONSTRUCTION': '🏗️'
}

const TOPICS = [
    {
        id: 'TOOL',
        label: 'Công cụ / Vật dụng',
        sublabel: 'Dụng cụ, máy móc, thiết bị trong ngành',
        icon: Briefcase,
        color: 'from-blue-500/20 to-indigo-500/10',
        iconBg: 'bg-blue-100 text-blue-600',
        iconBgHover: 'group-hover:bg-blue-500 group-hover:text-white',
        border: 'border-blue-100 hover:border-blue-300',
        badge: 'bg-blue-50 text-blue-600',
        modes: ['flashcard', 'quiz', 'spelling', 'podcast']
    },
    {
        id: 'SIGN',
        label: 'Hệ thống biển báo',
        sublabel: 'Biển báo an toàn lao động & ý nghĩa của biển',
        icon: AlertCircle,
        color: 'from-amber-500/20 to-orange-500/10',
        iconBg: 'bg-amber-100 text-amber-600',
        iconBgHover: 'group-hover:bg-amber-500 group-hover:text-white',
        border: 'border-amber-100 hover:border-amber-300',
        badge: 'bg-amber-50 text-amber-600',
        modes: ['flashcard', 'quiz', 'gallery', 'podcast']
    },
    {
        id: 'SAVED',
        label: 'Sổ tay ôn tập',
        sublabel: 'Các từ bạn đã trả lời sai hoặc tự lưu để học lại',
        icon: Bookmark,
        color: 'from-emerald-500/20 to-teal-500/10',
        iconBg: 'bg-emerald-100 text-emerald-600',
        iconBgHover: 'group-hover:bg-emerald-50 group-hover:text-white',
        border: 'border-emerald-100 hover:border-emerald-300',
        badge: 'bg-emerald-50 text-emerald-600',
        modes: ['flashcard', 'quiz', 'podcast']
    },
]

type Mode = 'flashcard' | 'quiz' | 'spelling' | 'podcast' | 'gallery'
type Step = 'select_industry' | 'select_topic' | 'select_mode' | 'practice' | 'saved_dashboard'

const LEARN_MODES = [
    {
        id: 'gallery' as Mode,
        label: 'Xem toàn bộ biển báo',
        sublabel: 'Duyệt danh sách + giải thích ý nghĩa',
        icon: LayoutGrid,
        iconBg: 'bg-amber-100 text-amber-600',
        border: 'hover:border-amber-300',
        tip: 'Ôn tổng quan trước khi quiz',
        signOnly: true,
        badge: '📚 Tổng quan',
        colorTheme: 'amber'
    },
    {
        id: 'flashcard' as Mode,
        label: 'Flashcard',
        sublabel: 'Lật thẻ, nhớ qua hình ảnh',
        icon: Layers,
        iconBg: 'bg-purple-100 text-purple-600',
        border: 'hover:border-purple-300',
        tip: 'Nhìn ảnh → đoán → xem đáp án',
        badge: '🔥 Học nhanh',
        colorTheme: 'purple'
    },
    {
        id: 'spelling' as Mode,
        label: 'Ghép chữ',
        sublabel: 'Kéo ký tự để ghép từ tiếng Hàn',
        icon: Type,
        iconBg: 'bg-orange-100 text-orange-600',
        border: 'hover:border-orange-300',
        tip: 'Luyện chính tả tiếng Hàn',
        hideForSign: true,
        badge: '✏️ Ghi nhớ sâu',
        colorTheme: 'orange'
    },
    {
        id: 'quiz' as Mode,
        label: 'Trắc nghiệm',
        sublabel: 'Chọn đáp án đúng có giới hạn giờ',
        icon: AlertCircle,
        iconBg: 'bg-pink-100 text-pink-600',
        border: 'hover:border-pink-300',
        tip: 'Kiểm tra độ nhớ nhanh',
        badge: '⏱️ Thử thách',
        colorTheme: 'rose'
    },
    {
        id: 'podcast' as Mode,
        label: 'Nghe thụ động',
        sublabel: 'Phát tự động, không cần thao tác',
        icon: Volume2,
        iconBg: 'bg-blue-100 text-blue-600',
        border: 'hover:border-blue-300',
        tip: 'Học khi làm việc khác',
        badge: '🎧 Rảnh tay',
        colorTheme: 'blue'
    },
]

const THEME_STYLES: Record<string, {
    hoverBg: string,
    borderColor: string,
    iconContainer: string,
    badgeBg: string,
    badgeText: string,
    chevronColor: string
}> = {
    purple: {
        hoverBg: 'hover:bg-purple-50/30',
        borderColor: 'hover:border-purple-200',
        iconContainer: 'bg-purple-100/80 text-purple-600 ring-4 ring-purple-50/60 group-hover:scale-105 transition-transform duration-300',
        badgeBg: 'bg-purple-50 border border-purple-100',
        badgeText: 'text-purple-700',
        chevronColor: 'text-purple-400'
    },
    orange: {
        hoverBg: 'hover:bg-orange-50/20',
        borderColor: 'hover:border-orange-200',
        iconContainer: 'bg-orange-100/80 text-orange-600 ring-4 ring-orange-50/60 group-hover:scale-105 transition-transform duration-300',
        badgeBg: 'bg-orange-50 border border-orange-100',
        badgeText: 'text-orange-700',
        chevronColor: 'text-orange-400'
    },
    rose: {
        hoverBg: 'hover:bg-rose-50/20',
        borderColor: 'hover:border-rose-200',
        iconContainer: 'bg-rose-100/80 text-rose-600 ring-4 ring-rose-50/60 group-hover:scale-105 transition-transform duration-300',
        badgeBg: 'bg-rose-50 border border-rose-100',
        badgeText: 'text-rose-700',
        chevronColor: 'text-rose-400'
    },
    blue: {
        hoverBg: 'hover:bg-blue-50/20',
        borderColor: 'hover:border-blue-200',
        iconContainer: 'bg-blue-100/80 text-blue-600 ring-4 ring-blue-50/60 group-hover:scale-105 transition-transform duration-300',
        badgeBg: 'bg-blue-50 border border-blue-100',
        badgeText: 'text-blue-700',
        chevronColor: 'text-blue-400'
    },
    amber: {
        hoverBg: 'hover:bg-amber-50/30',
        borderColor: 'hover:border-amber-200',
        iconContainer: 'bg-amber-100/80 text-amber-600 ring-4 ring-amber-50/60 group-hover:scale-105 transition-transform duration-300',
        badgeBg: 'bg-amber-50 border border-amber-100',
        badgeText: 'text-amber-700',
        chevronColor: 'text-amber-400'
    }
}

const TOPIC_THEME_STYLES: Record<string, {
    hoverBg: string,
    borderColor: string,
    iconContainer: string,
    badgeBg: string,
    chevronColor: string,
    badgeLabel: string
}> = {
    TOOL: {
        hoverBg: 'hover:bg-blue-50/20',
        borderColor: 'hover:border-blue-200',
        iconContainer: 'bg-blue-100/80 text-blue-600 ring-4 ring-blue-50/60 group-hover:scale-105 transition-transform duration-300',
        badgeBg: 'bg-blue-50 border border-blue-100 text-blue-700',
        chevronColor: 'text-blue-400',
        badgeLabel: '🔧 Từ vựng & Dụng cụ'
    },
    SIGN: {
        hoverBg: 'hover:bg-amber-50/30',
        borderColor: 'hover:border-amber-200',
        iconContainer: 'bg-amber-100/80 text-amber-600 ring-4 ring-amber-50/60 group-hover:scale-105 transition-transform duration-300',
        badgeBg: 'bg-amber-50 border border-amber-100 text-amber-700',
        chevronColor: 'text-amber-400',
        badgeLabel: '⚠️ Biển báo an toàn'
    },
    SAVED: {
        hoverBg: 'hover:bg-emerald-50/20',
        borderColor: 'hover:border-emerald-200',
        iconContainer: 'bg-emerald-100/80 text-emerald-600 ring-4 ring-emerald-50/60 group-hover:scale-105 transition-transform duration-300',
        badgeBg: 'bg-emerald-50 border border-emerald-100 text-emerald-700',
        chevronColor: 'text-emerald-400',
        badgeLabel: '📁 Sổ tay cá nhân'
    }
}

interface VocabularyPracticeHubProps {
    onBackToDashboard?: () => void
    presetIndustry?: string
}

// Gallery mode: read-only browsing of all signs with description
const SIGN_CATEGORIES = [
    { id: 'ALL', name: 'Tất cả' },
    { id: 'PROHIBITION', name: '🚫 Biển cấm' },
    { id: 'MANDATORY', name: '🔵 Biển bắt buộc' },
    { id: 'WARNING', name: '⚠️ Biển cảnh báo' },
    { id: 'RESCUE', name: '🟢 Biển chỉ dẫn' }
]

function getCategoryStyles(id: string, isActive: boolean) {
    if (!isActive) {
        return 'bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/50 shadow-sm';
    }
    switch (id) {
        case 'PROHIBITION':
            return 'bg-rose-500 text-white shadow-md shadow-rose-100 border border-rose-500';
        case 'MANDATORY':
            return 'bg-blue-600 text-white shadow-md shadow-blue-100 border border-blue-600';
        case 'WARNING':
            return 'bg-amber-500 text-white shadow-md shadow-amber-100 border border-amber-500';
        case 'RESCUE':
            return 'bg-emerald-600 text-white shadow-md shadow-emerald-100 border border-emerald-600';
        default: // 'ALL'
            return 'bg-indigo-600 text-white shadow-md shadow-indigo-100 border border-indigo-600';
    }
}

function getSignCategory(imageUrl?: string): string {
    if (!imageUrl) return 'ALL';
    const filename = imageUrl.split('/').pop() || '';
    if (filename.startsWith('vocab_5_') || filename.startsWith('vocab_6_')) {
        return 'MANDATORY';
    }
    if (filename.startsWith('vocab_7_')) {
        return 'WARNING';
    }
    if (filename.startsWith('vocab_8_') || filename.startsWith('vocab_9_')) {
        return 'PROHIBITION';
    }
    if (filename.startsWith('vocab_10_') || filename.startsWith('vocab_11_')) {
        return 'RESCUE';
    }
    return 'ALL';
}

function SignGallery({ vocabList, onBack }: { vocabList: any[], onBack: () => void }) {
    const [selected, setSelected] = useState<any | null>(null)
    const [showKr, setShowKr] = useState(true)
    const [showVi, setShowVi] = useState(true)
    const [activeCategory, setActiveCategory] = useState('ALL')

    const playAudio = (url?: string, wordKr?: string) => {
        if (wordKr) {
            speakText(wordKr, 0.8)
        } else if (url) {
            new Audio(url).play().catch(() => {})
        }
    }

    const filteredList = activeCategory === 'ALL'
        ? vocabList
        : vocabList.filter(item => getSignCategory(item.image_url) === activeCategory)

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-2.5">
                    <Button 
                        variant="ghost" 
                        onClick={onBack} 
                        className="h-9 w-9 p-0 text-slate-600 hover:bg-slate-100 flex-shrink-0 rounded-full flex items-center justify-center"
                        title="Quay lại"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="min-w-0">
                        <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-tight">Biển báo trong ngành</h2>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{filteredList.length} biển báo hiển thị • nhấn để xem giải thích</p>
                    </div>
                </div>
                
                {/* Premium pill toggles */}
                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 self-start sm:self-auto flex-shrink-0">
                    <button
                        onClick={() => setShowKr(!showKr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none active:scale-95 ${
                            showKr 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200/40 shadow-sm'
                        }`}
                    >
                        {showKr ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>Tiếng Hàn</span>
                    </button>
                    <button
                        onClick={() => setShowVi(!showVi)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none active:scale-95 ${
                            showVi 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200/40 shadow-sm'
                        }`}
                    >
                        {showVi ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>Tiếng Việt</span>
                    </button>
                </div>
            </div>

            {/* Category selection - Hidden Scrollbar */}
            <div 
                className="flex items-center gap-2 overflow-x-auto pb-1.5 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <style dangerouslySetInnerHTML={{__html: `
                    .scrollbar-none::-webkit-scrollbar {
                        display: none;
                    }
                `}} />
                {SIGN_CATEGORIES.map(cat => {
                    const isActive = activeCategory === cat.id;
                    const count = cat.id === 'ALL' 
                        ? vocabList.length 
                        : vocabList.filter(item => getSignCategory(item.image_url) === cat.id).length;

                    // Skip empty categories
                    if (count === 0) return null;

                    const labelText = cat.id === 'ALL' ? `${cat.name} (${count})` : `${cat.name} (${count})`;

                    return (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setActiveCategory(cat.id);
                                setSelected(null); // Clear selected item when switching categories
                            }}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none active:scale-95 ${
                                getCategoryStyles(cat.id, isActive)
                            }`}
                        >
                            {labelText}
                        </button>
                    );
                })}
            </div>
            {selected && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in cursor-pointer"
                    onClick={() => setSelected(null)}
                >
                    <div 
                        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300 scale-100 animate-in zoom-in-95 duration-300 cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header bar / Close button */}
                        <div className="absolute top-4 right-4 z-10">
                            <button 
                                onClick={() => setSelected(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors text-lg font-bold"
                            >
                                ×
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 md:p-8 space-y-6">
                            {/* Large Image View */}
                            <div className="flex justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100/80">
                                {selected.image_url ? (
                                    <img src={selected.image_url} alt="" className="w-32 h-32 md:w-36 md:h-36 object-contain rounded-xl bg-white shadow-sm border p-1" />
                                ) : (
                                    <div className="w-32 h-32 bg-amber-100 rounded-xl flex items-center justify-center text-amber-500">
                                        <AlertCircle className="w-16 h-16" />
                                    </div>
                                )}
                            </div>

                            {/* Text Info */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h3 className="text-2xl md:text-3xl font-black text-indigo-700 leading-normal tracking-tight">
                                            {showKr ? selected.word_kr : '••••••••'}
                                        </h3>
                                        <button 
                                            onClick={() => playAudio(selected.audio_url, selected.word_kr)}
                                            className="p-1.5 rounded-full bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors active:scale-95"
                                            title="Nghe phát âm"
                                        >
                                            <Volume2 className="w-4 h-4 text-indigo-600" />
                                        </button>
                                    </div>
                                    <p className="text-lg font-bold text-emerald-600">
                                        {showVi ? selected.word_vi : '••••••••'}
                                    </p>
                                </div>

                                {/* Explanation Section */}
                                {selected.description_vi ? (
                                    <div className="flex items-start gap-3 p-4 md:p-5 rounded-2xl bg-amber-50/50 border border-amber-100/60">
                                        <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                                        <div className="space-y-2 flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                                Ý nghĩa biển báo / 표지판 설명
                                            </p>
                                            <div className="space-y-1.5">
                                                {showKr && (
                                                    <p className="text-sm md:text-base font-semibold text-slate-800 border-b border-amber-100 pb-1.5 leading-relaxed">
                                                        {getKoreanDescription(selected.description_vi, selected.word_kr)}
                                                    </p>
                                                )}
                                                {showVi && (
                                                    <p className="text-xs md:text-sm text-slate-600 leading-relaxed pt-0.5">
                                                        {selected.description_vi}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Chưa có giải thích cho biển báo này.</p>
                                )}
                            </div>
                        </div>

                        {/* Footer action */}
                        <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
                            <Button 
                                onClick={() => setSelected(null)}
                                className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 text-xs font-bold"
                            >
                                Đã hiểu
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid of signs: 2 cols on mobile, 3 cols on sm, 4 cols on md+ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredList.map(item => {
                    const isActive = selected?.id === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => setSelected(isActive ? null : item)}
                            className={`group flex flex-col items-center gap-3 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 w-full text-center ${
                                isActive
                                    ? 'border-amber-400 bg-amber-50/70 shadow-lg scale-[1.02]'
                                    : 'border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/30 hover:shadow-md'
                            }`}
                        >
                            {item.image_url ? (
                                <img src={item.image_url} alt="" className="w-18 h-18 sm:w-20 sm:h-20 object-contain rounded-xl bg-white shadow-sm border p-1" />
                            ) : (
                                <div className="w-18 h-18 sm:w-20 sm:h-20 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <AlertCircle className="w-8 h-8 text-amber-400" />
                                </div>
                            )}
                            
                            <div className="text-center w-full min-h-[44px] flex flex-col justify-center gap-1">
                                {showKr ? (
                                    <p className="text-xs sm:text-sm font-extrabold text-indigo-700 line-clamp-2 leading-snug">
                                        {item.word_kr}
                                    </p>
                                ) : (
                                    <p className="text-xs sm:text-sm font-bold text-slate-300 line-clamp-2 leading-tight italic">
                                        •••
                                    </p>
                                )}
                                {showVi ? (
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 line-clamp-2 leading-snug">
                                        {item.word_vi}
                                    </p>
                                ) : (
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-300 line-clamp-2 leading-tight italic">
                                        •••
                                    </p>
                                )}
                            </div>
                            
                            {item.description_vi && (
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" title="Có giải thích" />
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="text-center pt-2 flex items-center justify-center gap-4 text-xs text-slate-400">
                <span>🟡 Chấm vàng = Có giải thích ý nghĩa</span>
                <span>•</span>
                <span>Tắt bớt chữ để tự kiểm tra ghi nhớ của bản thân</span>
            </div>
        </div>
    )
}

function VocabularyPracticeHubContent({ onBackToDashboard, presetIndustry }: VocabularyPracticeHubProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const industryParam = searchParams.get('industry')?.toLowerCase()

    const MAPPED_INDUSTRIES: Record<string, string> = {
        'manufacturing': 'MANUFACTURING', 'sản xuất chế tạo': 'MANUFACTURING',
        'fishery': 'FISHERY', 'ngư nghiệp': 'FISHERY',
        'agriculture': 'AGRICULTURE', 'nông nghiệp': 'AGRICULTURE',
        'forestry': 'FORESTRY', 'lâm nghiệp': 'FORESTRY',
        'service': 'SERVICE', 'dịch vụ': 'SERVICE',
        'construction': 'CONSTRUCTION', 'xây dựng': 'CONSTRUCTION'
    }

    const initialIndustry = presetIndustry || (industryParam && MAPPED_INDUSTRIES[industryParam]
        ? MAPPED_INDUSTRIES[industryParam]
        : 'MANUFACTURING')

    const hasPresetIndustry = !!presetIndustry || !!(industryParam && MAPPED_INDUSTRIES[industryParam])

    const [step, setStep] = useState<Step>('select_industry')
    const [selectedIndustry, setSelectedIndustry] = useState<string>('MANUFACTURING')
    const [selectedTopic, setSelectedTopic] = useState<string>('TOOL')
    const [selectedMode, setSelectedMode] = useState<Mode>('flashcard')
    const [loading, setLoading] = useState(false)
    const [vocabList, setVocabList] = useState<any[]>([])
    const [practiceCategory, setPracticeCategory] = useState<string>('ALL')
    const [savedWords, setSavedWords] = useState<any[]>([])

    const practiceList = useMemo(() => {
        let list = selectedTopic === 'SIGN' && practiceCategory !== 'ALL'
            ? vocabList.filter(item => getSignCategory(item.image_url) === practiceCategory)
            : vocabList;

        if (selectedMode !== 'gallery' && selectedTopic !== 'SAVED') {
            // Shuffle and limit to 20 for practice modes (quiz, flashcard, spelling, podcast)
            list = [...list].sort(() => Math.random() - 0.5).slice(0, 20);
        }
        return list;
    }, [vocabList, practiceCategory, selectedMode, selectedTopic]);

    const loadSavedWords = () => {
        try {
            const stored = localStorage.getItem('saved_review_words')
            const parsed = stored ? JSON.parse(stored) : []
            setSavedWords(parsed)
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        loadSavedWords()
    }, [step, selectedTopic])

    const handleRemoveSavedWord = (id: string) => {
        try {
            const stored = localStorage.getItem('saved_review_words')
            const parsed = stored ? JSON.parse(stored) : []
            const updated = parsed.filter((w: any) => w.id !== id)
            localStorage.setItem('saved_review_words', JSON.stringify(updated))
            setSavedWords(updated)
        } catch (e) {
            console.error(e)
        }
    }

    const playWordAudio = (wordKr: string) => {
        if (wordKr) {
            speakText(wordKr, 0.8)
        }
    }

    useEffect(() => {
        if (hasPresetIndustry) {
            setSelectedIndustry(initialIndustry)
            setStep('select_topic')
        } else {
            setStep('select_industry')
        }
    }, [hasPresetIndustry, initialIndustry])

    const handleStart = async (mode: Mode) => {
        setPracticeCategory('ALL')
        setSelectedMode(mode)
        setLoading(true)
        try {
            if (selectedTopic === 'SAVED') {
                const stored = localStorage.getItem('saved_review_words')
                const parsed = stored ? JSON.parse(stored) : []
                if (parsed.length === 0) {
                    alert('Sổ tay ôn tập của bạn hiện tại chưa có từ nào! Hãy làm bài trắc nghiệm và lưu lại các từ trả lời sai.')
                    setLoading(false)
                    return
                }
                const shuffled = [...parsed].sort(() => Math.random() - 0.5).slice(0, 20)
                setVocabList(shuffled)
                setStep('practice')
                setLoading(false)
                return
            }

            const url = new URL('/api/vocabulary-vong2', window.location.origin)
            if (selectedIndustry) url.searchParams.set('industry', selectedIndustry)
            if (selectedTopic) url.searchParams.set('type', selectedTopic)

            const res = await fetch(url.toString(), { cache: 'no-store' })
            const data = await res.json()

            if (data.success) {
                if (data.data.length === 0) {
                    alert('Chưa có dữ liệu từ vựng cho lựa chọn này!')
                } else {
                    const processed = [...data.data].map(item => {
                        let imgUrl = item.image_url
                        if (imgUrl) {
                            if (imgUrl.match(/^https?:\/\/[0-9a-fA-F]{6}/)) {
                                imgUrl = imgUrl.replace(/^https?:\/\//, 'https://placehold.co/150x150/')
                            } else if (imgUrl.match(/^[0-9a-fA-F]{6}/)) {
                                imgUrl = `https://placehold.co/150x150/${imgUrl}`
                            }
                        }
                        return { ...item, image_url: imgUrl }
                    })
                    
                    // Sort systematically by image filename/URL or word_kr to ensure stable, grouped order in gallery
                    processed.sort((a, b) => {
                        const fileA = (a.image_url || '').split('/').pop() || '';
                        const fileB = (b.image_url || '').split('/').pop() || '';
                        return fileA.localeCompare(fileB);
                    })

                    setVocabList(processed)

                    // Preload assets (images only, skip audio to avoid AbortError)
                    const imageLoads = processed
                        .filter(it => it.image_url)
                        .slice(0, 10) // Preload first 10 only
                        .map(it => new Promise(resolve => {
                            const img = new Image()
                            img.onload = img.onerror = resolve
                            img.src = it.image_url
                        }))
                    await Promise.race([Promise.all(imageLoads), new Promise(r => setTimeout(r, 2000))])

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

    const handleGoBack = () => {
        if (step === 'select_topic') {
            if (hasPresetIndustry) {
                onBackToDashboard ? onBackToDashboard() : router.back()
            } else {
                setStep('select_industry')
            }
        } else if (step === 'select_mode' || step === 'saved_dashboard') {
            setStep('select_topic')
        } else if (step === 'practice') {
            if (selectedTopic === 'SAVED') {
                setStep('saved_dashboard')
            } else {
                setStep('select_mode')
            }
        } else {
            onBackToDashboard ? onBackToDashboard() : router.back()
        }
    }

    const currentTopic = TOPICS.find(t => t.id === selectedTopic)

    if (step === 'practice') {
        const currentModeObj = LEARN_MODES.find(m => m.id === selectedMode);

        const handlePracticeBack = () => {
            if (selectedTopic === 'SAVED') {
                setStep('saved_dashboard')
            } else {
                setStep('select_mode')
            }
        }

        return (
            <div className="min-h-[500px] bg-[#f8fafc] rounded-2xl overflow-hidden border border-slate-100 flex flex-col">
                {selectedMode !== 'gallery' && (
                    <div className="bg-white px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Button 
                                variant="ghost" 
                                onClick={handlePracticeBack} 
                                className="h-9 w-9 p-0 text-slate-600 hover:bg-slate-100 flex-shrink-0 rounded-full flex items-center justify-center"
                                title="Quay lại"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div className="min-w-0">
                                <h2 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">
                                    {currentModeObj?.label || 'Luyện tập'}
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                    {practiceList.length} {selectedTopic === 'SIGN' ? 'biển báo' : 'từ vựng'} hiển thị • {currentTopic?.label}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {selectedTopic === 'SIGN' && selectedMode !== 'gallery' && (
                    <div className="bg-white border-b border-slate-100 p-4">
                        <div 
                            className="flex items-center gap-2 overflow-x-auto pb-1.5 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <style dangerouslySetInnerHTML={{__html: `
                                .scrollbar-none::-webkit-scrollbar {
                                    display: none;
                                }
                            `}} />
                            {SIGN_CATEGORIES.map(cat => {
                                const isActive = practiceCategory === cat.id;
                                const count = cat.id === 'ALL' 
                                    ? vocabList.length 
                                    : vocabList.filter(item => getSignCategory(item.image_url) === cat.id).length;

                                if (count === 0) return null;

                                const labelText = `${cat.name} (${count})`;

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setPracticeCategory(cat.id)}
                                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none active:scale-95 ${
                                            getCategoryStyles(cat.id, isActive)
                                        }`}
                                    >
                                        {labelText}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="flex-1 overflow-auto">
                    {selectedMode === 'flashcard' && <FlashcardMode key={`flashcard-${practiceCategory}`} vocabList={practiceList} onBack={handlePracticeBack} hideHeader={true} />}
                    {selectedMode === 'quiz' && <QuizMode key={`quiz-${practiceCategory}`} vocabList={practiceList} onBack={handlePracticeBack} hideHeader={true} />}
                    {selectedMode === 'spelling' && <SpellingMode key={`spelling-${practiceCategory}`} vocabList={practiceList} onBack={handlePracticeBack} hideHeader={true} />}
                    {selectedMode === 'podcast' && <PodcastMode key={`podcast-${practiceCategory}`} vocabList={practiceList} onBack={handlePracticeBack} hideHeader={true} />}
                    {selectedMode === 'gallery' && <SignGallery vocabList={vocabList} onBack={handlePracticeBack} />}
                </div>
            </div>
        )
    }

    return (
        <div className="relative overflow-hidden flex flex-col rounded-2xl bg-white shadow-sm border border-slate-100">
            {/* Background blobs */}
            <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-transparent -z-10" />
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl -z-10" />

            <div className="flex-1 w-full mx-auto p-4 md:p-8 space-y-6 relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={handleGoBack}
                        className="h-10 w-10 rounded-full bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700">
                            Từ vựng & Biển báo
                        </h1>
                    </div>
                </div>

                {/* Breadcrumb */}
                {step !== 'select_industry' && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 animate-in fade-in">
                        <span className="font-semibold text-indigo-600">{INDUSTRY_EMOJI[selectedIndustry]} {INDUSTRY_LABELS[selectedIndustry]}</span>
                        {(step === 'select_mode' || step === 'saved_dashboard') && (
                            <>
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                <span className="font-semibold text-purple-600">{currentTopic?.label}</span>
                            </>
                        )}
                    </div>
                )}

                {/* STEP: Select industry */}
                {step === 'select_industry' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">
                        <div className="text-center space-y-1.5 mb-6">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Chọn Ngành Nghề</h2>
                            <p className="text-slate-500 text-sm">Chọn ngành để học từ vựng và biển báo liên quan</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                            {INDUSTRIES.map(ind => (
                                <div
                                    key={ind}
                                    onClick={() => { setSelectedIndustry(ind); setStep('select_topic') }}
                                    className="group cursor-pointer rounded-2xl p-5 border-2 border-slate-100 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-250 transform hover:-translate-y-1 flex flex-col items-center text-center gap-3 min-h-[120px] justify-center"
                                >
                                    <span className="text-3xl">{INDUSTRY_EMOJI[ind]}</span>
                                    <h3 className="font-bold text-slate-700 group-hover:text-indigo-800 text-sm leading-tight transition-colors">
                                        {INDUSTRY_LABELS[ind]}
                                    </h3>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP: Select topic */}
                {step === 'select_topic' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
                        <div className="text-center space-y-1.5 mb-4">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Chọn Chủ Đề</h2>
                            <p className="text-slate-500 text-sm">Chọn nội dung bạn muốn luyện tập</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                             {TOPICS.map(topic => {
                                 const Icon = topic.icon
                                 const theme = TOPIC_THEME_STYLES[topic.id] || TOPIC_THEME_STYLES.TOOL
                                 const dynamicBadgeText = topic.id === 'SAVED' 
                                     ? `📁 Sổ tay cá nhân (${savedWords.length})` 
                                     : theme.badgeLabel
                                 return (
                                     <div
                                         key={topic.id}
                                         onClick={() => {
                                             setSelectedTopic(topic.id);
                                             if (topic.id === 'SAVED') {
                                                 setStep('saved_dashboard');
                                             } else {
                                                 setStep('select_mode');
                                             }
                                         }}
                                         className={`group relative cursor-pointer rounded-2xl p-5 border-2 border-slate-100 bg-white ${theme.hoverBg} ${theme.borderColor} hover:shadow-lg hover:shadow-slate-100/70 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-4 overflow-hidden active:scale-98`}
                                     >
                                         {/* Icon Container with ring & zoom effects */}
                                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${theme.iconContainer}`}>
                                             <Icon className="w-6.5 h-6.5 transition-transform duration-300 group-hover:scale-110" />
                                         </div>

                                         {/* Content */}
                                         <div className="flex-1 min-w-0 space-y-1">
                                             <div className="flex items-center gap-2.5">
                                                 <h3 className="text-lg font-black text-slate-800 group-hover:text-slate-900 transition-colors">
                                                     {topic.label}
                                                 </h3>
                                                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${theme.badgeBg} transition-all duration-300 group-hover:scale-105`}>
                                                     {dynamicBadgeText}
                                                 </span>
                                             </div>
                                             <p className="text-sm text-slate-500 font-medium leading-snug">
                                                 {topic.sublabel}
                                             </p>
                                         </div>

                                         {/* Right Chevron Arrow */}
                                         <div className="self-center flex-shrink-0 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 pr-1">
                                             <ChevronRight className={`w-5 h-5 ${theme.chevronColor}`} />
                                         </div>
                                     </div>
                                 )
                             })}
                        </div>
                    </div>
                )}

                {/* STEP: Select mode */}
                {step === 'select_mode' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400 relative">
                        <div className="text-center space-y-1.5 mb-4">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Chọn Chế Độ Học</h2>
                            <p className="text-slate-500 text-sm">Mỗi chế độ phù hợp cho một giai đoạn học tập khác nhau</p>
                        </div>

                        {/* Suggested learning order banner */}
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/40 text-[11px] font-semibold text-indigo-700 animate-in fade-in duration-300">
                            <Info className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500" />
                            <div className="flex flex-wrap items-center gap-1 leading-relaxed">
                                <span className="text-slate-400 font-normal">Lộ trình ôn tập gợi ý:</span>
                                {selectedTopic === 'SIGN' ? (
                                    <>
                                        <span className="text-indigo-800 font-bold">Xem biển báo</span>
                                        <span className="text-slate-300 font-normal">➔</span>
                                        <span className="text-indigo-800 font-bold">Flashcard</span>
                                        <span className="text-slate-300 font-normal">➔</span>
                                        <span className="text-indigo-800 font-bold">Trắc nghiệm</span>
                                        <span className="text-slate-300 font-normal">➔</span>
                                        <span className="text-indigo-800 font-bold">Nghe thụ động</span>
                                    </>
                                ) : selectedTopic === 'SAVED' ? (
                                    <>
                                        <span className="text-indigo-800 font-bold">Flashcard</span>
                                        <span className="text-slate-300 font-normal">➔</span>
                                        <span className="text-indigo-800 font-bold">Trắc nghiệm</span>
                                        <span className="text-slate-300 font-normal">➔</span>
                                        <span className="text-indigo-800 font-bold">Nghe thụ động</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-indigo-800 font-bold">Flashcard</span>
                                        <span className="text-slate-300 font-normal">➔</span>
                                        <span className="text-indigo-800 font-bold">Ghép chữ</span>
                                        <span className="text-slate-300 font-normal">➔</span>
                                        <span className="text-indigo-800 font-bold">Trắc nghiệm</span>
                                        <span className="text-slate-300 font-normal">➔</span>
                                        <span className="text-indigo-800 font-bold">Nghe thụ động</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {LEARN_MODES
                                .filter(m => {
                                    if (m.signOnly && selectedTopic !== 'SIGN') return false
                                    if (m.hideForSign && (selectedTopic === 'SIGN' || selectedTopic === 'SAVED')) return false
                                    return true
                                })
                                .map(mode => {
                                    const Icon = mode.icon
                                    const theme = THEME_STYLES[mode.colorTheme] || THEME_STYLES.purple
                                    return (
                                        <div
                                            key={mode.id}
                                            onClick={() => handleStart(mode.id)}
                                            className={`group relative cursor-pointer rounded-2xl p-5 border-2 border-slate-100 bg-white ${theme.hoverBg} ${theme.borderColor} hover:shadow-lg hover:shadow-slate-100/70 transition-all duration-300 transform hover:-translate-y-0.5 flex items-start gap-4 overflow-hidden active:scale-98`}
                                        >
                                            {/* Left Icon Container with ring & zoom effects */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${theme.iconContainer}`}>
                                                <Icon className="w-5.5 h-5.5 transition-transform duration-300 group-hover:scale-110" />
                                            </div>

                                            {/* Mid Content */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-slate-800 text-[15px] md:text-base group-hover:text-slate-900 transition-colors">
                                                        {mode.label}
                                                    </h4>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${theme.badgeBg} ${theme.badgeText} transition-all duration-300 group-hover:scale-105`}>
                                                        {mode.badge}
                                                    </span>
                                                </div>
                                                <p className="text-xs md:text-sm text-slate-500 font-medium leading-snug">
                                                    {mode.sublabel}
                                                </p>
                                                <p className="text-[11px] text-slate-400 font-medium italic pt-0.5 flex items-center gap-1.5 transition-colors group-hover:text-slate-500">
                                                    <span>💡</span> {mode.tip}
                                                </p>
                                            </div>

                                            {/* Right Chevron Arrow */}
                                            <div className="self-center flex-shrink-0 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 pr-1">
                                                <ChevronRight className={`w-5 h-5 ${theme.chevronColor}`} />
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>

                        {/* Loading overlay */}
                        {loading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl gap-3">
                                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <p className="font-semibold text-indigo-700">Đang chuẩn bị nội dung...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP: Saved Dashboard */}
                {step === 'saved_dashboard' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">
                        <div className="text-center space-y-1.5 mb-2">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Sổ tay ôn tập</h2>
                            <p className="text-slate-500 text-sm">Xem lại các từ đã trả lời sai hoặc bookmark để luyện tập nâng cao</p>
                        </div>

                        {savedWords.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center space-y-4 max-w-lg mx-auto shadow-sm">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 border">
                                    <Bookmark className="w-8 h-8 opacity-60" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="font-bold text-slate-800 text-lg">Sổ tay của bạn đang trống</h3>
                                    <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-sm mx-auto">
                                        Khi làm bài trắc nghiệm trả lời sai hoặc bấm biểu tượng Bookmark trên thẻ Flashcard/Nghe thụ động, từ vựng sẽ tự động xuất hiện ở đây để ôn tập lại!
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => setStep('select_topic')}
                                    className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6"
                                >
                                    Khám phá chủ đề khác
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                {/* Left column: Saved Words List */}
                                <div className="md:col-span-7 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b">
                                        <h3 className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-2">
                                            Danh sách từ vựng đã lưu
                                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs rounded-full font-bold">
                                                {savedWords.length}
                                            </span>
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm("Bạn có chắc chắn muốn xóa toàn bộ từ đã lưu trong sổ tay?")) {
                                                    localStorage.removeItem('saved_review_words');
                                                    setSavedWords([]);
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 text-[11px] font-bold h-8"
                                        >
                                            Xóa tất cả
                                        </Button>
                                    </div>

                                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                                        {savedWords.map((item) => (
                                            <div 
                                                key={item.id} 
                                                className="flex items-center gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all"
                                            >
                                                {item.image_url ? (
                                                    <img 
                                                        src={item.image_url} 
                                                        alt="" 
                                                        className="w-12 h-12 object-contain bg-white border rounded-lg p-0.5 flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-indigo-50 border rounded-lg flex items-center justify-center flex-shrink-0 text-indigo-400">
                                                        <BookOpen className="w-5 h-5" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm md:text-base truncate">
                                                        {item.word_kr}
                                                    </p>
                                                    <p className="font-medium text-emerald-600 text-xs md:text-sm truncate">
                                                        {item.word_vi}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Nghe phát âm"
                                                        onClick={() => playWordAudio(item.word_kr)}
                                                        className="w-8 h-8 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                                    >
                                                        <Volume2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Xóa khỏi sổ tay"
                                                        onClick={() => handleRemoveSavedWord(item.id)}
                                                        className="w-8 h-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right column: Launch Study Sessions */}
                                <div className="md:col-span-5 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                                    <h3 className="font-extrabold text-slate-800 text-sm md:text-base pb-2 border-b">
                                        Bắt đầu ôn tập luyện tập
                                    </h3>
                                    <div className="space-y-3">
                                        {/* Flashcard Option */}
                                        <div 
                                            onClick={() => handleStart('flashcard')}
                                            className="group cursor-pointer p-4 rounded-xl border-2 border-slate-100 hover:border-purple-300 hover:bg-purple-50/20 transition-all flex items-center gap-3"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                                <Layers className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 text-sm">⚡ Luyện tập Flashcard</h4>
                                                <p className="text-[11px] text-slate-500 leading-snug">Gợi nhớ qua hình ảnh và tự lật thẻ xác nhận</p>
                                            </div>
                                        </div>

                                        {/* Quiz Option */}
                                        <div 
                                            onClick={() => handleStart('quiz')}
                                            className="group cursor-pointer p-4 rounded-xl border-2 border-slate-100 hover:border-pink-300 hover:bg-pink-50/20 transition-all flex items-center gap-3"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 text-sm">✍️ Làm bài Trắc nghiệm</h4>
                                                <p className="text-[11px] text-slate-500 leading-snug">Câu hỏi tính giờ để rèn phản xạ nhớ nhanh</p>
                                            </div>
                                        </div>

                                        {/* Podcast Option */}
                                        <div 
                                            onClick={() => handleStart('podcast')}
                                            className="group cursor-pointer p-4 rounded-xl border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex items-center gap-3"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                                <Volume2 className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 text-sm">🔊 Nghe thụ động rèn luyện</h4>
                                                <p className="text-[11px] text-slate-500 leading-snug">Tự động phát âm thanh tiếng Hàn/Việt tự động</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

import { Suspense } from 'react'

export function VocabularyPracticeHub(props: VocabularyPracticeHubProps) {
    return (
        <Suspense fallback={
            <div className="relative overflow-hidden flex flex-col rounded-2xl bg-white shadow-sm border border-slate-100 p-8 items-center justify-center min-h-[300px]">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-semibold text-indigo-700 text-sm">Đang tải...</p>
            </div>
        }>
            <VocabularyPracticeHubContent {...props} />
        </Suspense>
    )
}
