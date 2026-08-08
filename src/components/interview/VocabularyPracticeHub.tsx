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
import { InterviewFreePreviewBanner } from '@/components/interview/InterviewFreePreviewBanner'

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
            speakText(wordKr, 1.0)
        } else if (url) {
            new Audio(url).play().catch(() => {})
        }
    }

    const filteredList = activeCategory === 'ALL'
        ? vocabList
        : vocabList.filter(item => getSignCategory(item.image_url) === activeCategory)

    return (
        <div className="mx-auto max-w-4xl space-y-3 p-3 md:space-y-5 md:p-6">
            <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 pb-3 md:gap-4 md:pb-4">
                <div className="flex min-w-0 items-center gap-2">
                    <Button 
                        variant="ghost" 
                        onClick={onBack} 
                        className="flex size-8 flex-shrink-0 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 md:size-9"
                        title="Quay lại"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-extrabold leading-tight tracking-tight text-slate-800 md:text-lg">Biển báo</h2>
                        <p className="mt-0.5 truncate text-[11px] leading-snug text-slate-500 md:text-xs">{filteredList.length} mục · Chạm để xem</p>
                    </div>
                </div>
                
                {/* Premium pill toggles */}
                <div className="flex flex-shrink-0 items-center gap-1 rounded-xl border border-slate-200/50 bg-slate-100/80 p-1 md:gap-1.5 md:rounded-2xl md:p-1.5">
                    <button
                        onClick={() => setShowKr(!showKr)}
                        className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all duration-200 select-none active:scale-95 md:gap-1.5 md:rounded-xl md:px-3 md:text-xs ${
                            showKr 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200/40 shadow-sm'
                        }`}
                    >
                        {showKr ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="md:hidden">Hàn</span><span className="hidden md:inline">Tiếng Hàn</span>
                    </button>
                    <button
                        onClick={() => setShowVi(!showVi)}
                        className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all duration-200 select-none active:scale-95 md:gap-1.5 md:rounded-xl md:px-3 md:text-xs ${
                            showVi 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200/40 shadow-sm'
                        }`}
                    >
                        {showVi ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="md:hidden">Việt</span><span className="hidden md:inline">Tiếng Việt</span>
                    </button>
                </div>
            </div>

            <InterviewFreePreviewBanner kind="sign" compact />

            {/* Category selection - Hidden Scrollbar */}
            <div 
                className="scrollbar-none -mx-3 flex items-center gap-1.5 overflow-x-auto px-3 md:mx-0 md:gap-2 md:px-0"
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
                            className={`flex-shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 select-none active:scale-95 md:px-3 md:text-xs ${
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
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 md:gap-4">
                {filteredList.map(item => {
                    const isActive = selected?.id === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => setSelected(isActive ? null : item)}
                            className={`group relative flex w-full flex-col items-center gap-2 rounded-2xl border-2 p-2.5 text-center transition-all duration-200 sm:gap-3 sm:p-4 md:p-5 ${
                                isActive
                                    ? 'border-amber-400 bg-amber-50/70 shadow-lg scale-[1.02]'
                                    : 'border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/30 hover:shadow-md'
                            }`}
                        >
                            {item.image_url ? (
                                <img src={item.image_url} alt="" className="size-16 rounded-xl border bg-white object-contain p-1 shadow-sm sm:size-18 md:size-20" />
                            ) : (
                                <div className="flex size-16 items-center justify-center rounded-xl bg-amber-100 sm:size-18 md:size-20">
                                    <AlertCircle className="w-8 h-8 text-amber-400" />
                                </div>
                            )}
                            
                            <div className="flex min-h-9 w-full flex-col justify-center gap-0.5 text-center sm:min-h-11 sm:gap-1">
                                {showKr ? (
                                    <p className="line-clamp-1 text-xs font-extrabold leading-snug text-indigo-700 sm:line-clamp-2 sm:text-sm">
                                        {item.word_kr}
                                    </p>
                                ) : (
                                    <p className="text-xs sm:text-sm font-bold text-slate-300 line-clamp-2 leading-tight italic">
                                        •••
                                    </p>
                                )}
                                {showVi ? (
                                    <p className="line-clamp-1 text-[10px] font-bold leading-snug text-slate-500 sm:line-clamp-2 sm:text-xs">
                                        {item.word_vi}
                                    </p>
                                ) : (
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-300 line-clamp-2 leading-tight italic">
                                        •••
                                    </p>
                                )}
                            </div>
                            
                            {item.description_vi && (
                                <div className="absolute right-2 top-2 size-2 rounded-full bg-amber-400" title="Có giải thích" />
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="hidden items-center justify-center gap-4 pt-2 text-center text-xs text-slate-400 sm:flex">
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
            speakText(wordKr, 1.0)
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
                    <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2.5 sm:px-4 sm:pb-3 sm:pt-4">
                        <div className="flex items-center gap-2.5">
                            <Button 
                                variant="ghost" 
                                onClick={handlePracticeBack} 
                                    className="flex size-8 flex-shrink-0 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 sm:size-9"
                                title="Quay lại"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div className="min-w-0">
                                <h2 className="text-sm font-extrabold leading-tight tracking-tight text-slate-800 sm:text-base">
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
                    <div className="border-b border-slate-100 bg-white px-3 py-2.5 sm:p-4">
                        <div 
                            className="scrollbar-none -mx-3 flex items-center gap-1.5 overflow-x-auto px-3 sm:-mx-4 sm:gap-2 sm:px-4 md:mx-0 md:px-0"
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
                                        className={`flex-shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 select-none active:scale-95 sm:px-3 sm:text-xs ${
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

            <div className="relative z-10 mx-auto w-full flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
                {/* Header */}
                <div className="flex items-center gap-2.5 md:gap-3">
                    <Button variant="ghost" size="icon" onClick={handleGoBack}
                        className="size-9 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 md:size-10">
                        <ArrowLeft className="size-4.5 md:size-5" />
                    </Button>
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md md:size-10">
                            <BookOpen className="size-4.5 text-white md:size-5" />
                        </div>
                        <h1 className="truncate bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-lg font-extrabold text-transparent md:text-2xl">
                            Từ vựng & Biển báo
                        </h1>
                    </div>
                </div>

                {/* Breadcrumb */}
                {step !== 'select_industry' && (
                    <div className="animate-in flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs text-slate-500 fade-in md:bg-transparent md:px-0 md:py-0 md:text-sm">
                        <span className="truncate font-semibold text-indigo-600">{INDUSTRY_EMOJI[selectedIndustry]} {INDUSTRY_LABELS[selectedIndustry]}</span>
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
                    <div className="animate-in space-y-3 fade-in slide-in-from-bottom-3 duration-400 md:space-y-5">
                        <div className="mb-3 text-left md:mb-4 md:text-center">
                            <h2 className="text-xl font-bold text-slate-800 md:text-3xl">Chọn nội dung</h2>
                            <p className="mt-0.5 text-xs text-slate-500 md:mt-1.5 md:text-sm">Bạn muốn luyện phần nào?</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 md:gap-4">
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
                                         className={`group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border-2 border-slate-100 bg-white p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-100/70 active:scale-98 md:gap-4 md:p-5 ${theme.hoverBg} ${theme.borderColor}`}
                                     >
                                         {/* Icon Container with ring & zoom effects */}
                                         <div className={`flex size-11 flex-shrink-0 items-center justify-center rounded-xl shadow-sm md:size-14 md:rounded-2xl ${theme.iconContainer}`}>
                                             <Icon className="size-5 transition-transform duration-300 group-hover:scale-110 md:size-6.5" />
                                         </div>

                                         {/* Content */}
                                         <div className="min-w-0 flex-1">
                                             <div className="flex items-center justify-between gap-2.5">
                                                 <h3 className="truncate text-[15px] font-black text-slate-800 transition-colors group-hover:text-slate-900 md:text-lg">
                                                     {topic.label}
                                                 </h3>
                                                 <span className={`${topic.id === 'SAVED' ? 'inline-flex' : 'hidden sm:inline-flex'} shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide transition-all duration-300 group-hover:scale-105 md:text-[10px] ${theme.badgeBg}`}>
                                                     {dynamicBadgeText}
                                                 </span>
                                             </div>
                                             <p className="mt-0.5 truncate text-xs font-medium text-slate-500 md:mt-1 md:text-sm">
                                                 {topic.sublabel}
                                             </p>
                                         </div>

                                         {/* Right Chevron Arrow */}
                                         <div className="self-center flex-shrink-0 pr-0.5 opacity-60 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:translate-x-2 md:opacity-0">
                                             <ChevronRight className={`size-4.5 md:size-5 ${theme.chevronColor}`} />
                                         </div>
                                     </div>
                                 )
                             })}
                        </div>
                    </div>
                )}

                {/* STEP: Select mode */}
                {step === 'select_mode' && (
                    <div className="relative animate-in space-y-3 fade-in slide-in-from-bottom-3 duration-400 md:space-y-5">
                        <div className="mb-3 text-left md:mb-4 md:text-center">
                            <h2 className="text-xl font-bold text-slate-800 md:text-3xl">Chọn chế độ</h2>
                            <p className="mt-0.5 text-xs text-slate-500 md:mt-1.5 md:text-sm">Chọn cách học phù hợp với bạn.</p>
                        </div>

                        <InterviewFreePreviewBanner kind={selectedTopic === 'SIGN' ? 'sign' : 'vocabulary'} />

                        {/* Suggested learning order banner */}
                        <div className="hidden items-center gap-2.5 rounded-xl border border-indigo-100/40 bg-indigo-50/50 px-3.5 py-2.5 text-[11px] font-semibold text-indigo-700 animate-in fade-in duration-300 sm:flex">
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

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3.5">
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
                                            className={`group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border-2 border-slate-100 bg-white p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-100/70 active:scale-98 sm:items-start sm:gap-4 sm:p-5 ${theme.hoverBg} ${theme.borderColor}`}
                                        >
                                            {/* Left Icon Container with ring & zoom effects */}
                                            <div className={`flex size-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm sm:size-12 ${theme.iconContainer}`}>
                                                <Icon className="size-5 transition-transform duration-300 group-hover:scale-110 sm:size-5.5" />
                                            </div>

                                            {/* Mid Content */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="truncate text-[15px] font-black text-slate-800 transition-colors group-hover:text-slate-900 md:text-base">
                                                        {mode.label}
                                                    </h4>
                                                    <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide transition-all duration-300 group-hover:scale-105 sm:inline-flex ${theme.badgeBg} ${theme.badgeText}`}>
                                                        {mode.badge}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 truncate text-xs font-medium text-slate-500 md:text-sm">
                                                    {mode.sublabel}
                                                </p>
                                                <p className="hidden items-center gap-1.5 pt-0.5 text-[11px] font-medium italic text-slate-400 transition-colors group-hover:text-slate-500 sm:flex">
                                                    <span>💡</span> {mode.tip}
                                                </p>
                                            </div>

                                            {/* Right Chevron Arrow */}
                                            <div className="self-center flex-shrink-0 opacity-60 transition-all duration-300 group-hover:opacity-100 sm:translate-x-2 sm:opacity-0 sm:group-hover:translate-x-0">
                                                <ChevronRight className={`size-4.5 sm:size-5 ${theme.chevronColor}`} />
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
                    <div className="animate-in space-y-4 fade-in slide-in-from-bottom-3 duration-400 md:space-y-6">
                        <div className="mb-1 text-left md:mb-2 md:text-center">
                            <h2 className="text-xl font-bold text-slate-800 md:text-3xl">Sổ tay ôn tập</h2>
                            <p className="mt-0.5 text-xs text-slate-500 md:mt-1.5 md:text-sm">Ôn lại những từ đã lưu.</p>
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
                            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
                                {/* Left column: Saved Words List */}
                                <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm md:col-span-7 md:space-y-4 md:p-5">
                                    <div className="flex justify-between items-center pb-2 border-b">
                                        <h3 className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-2">
                                            Từ đã lưu
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

                                    <div className="max-h-[400px] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin md:space-y-2">
                                        {savedWords.map((item) => (
                                            <div 
                                                key={item.id} 
                                                className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 transition-all hover:bg-slate-50 md:gap-3 md:p-3"
                                            >
                                                {item.image_url ? (
                                                    <img 
                                                        src={item.image_url} 
                                                        alt="" 
                                                        className="size-10 flex-shrink-0 rounded-lg border bg-white object-contain p-0.5 md:size-12"
                                                    />
                                                ) : (
                                                    <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg border bg-indigo-50 text-indigo-400 md:size-12">
                                                        <BookOpen className="w-5 h-5" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate text-sm font-bold text-slate-800 md:text-base">
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
                                <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm md:col-span-5 md:space-y-4 md:p-5">
                                    <h3 className="font-extrabold text-slate-800 text-sm md:text-base pb-2 border-b">
                                        Chọn cách ôn tập
                                    </h3>
                                    <div className="space-y-3">
                                        {/* Flashcard Option */}
                                        <div 
                                            onClick={() => handleStart('flashcard')}
                                            className="group flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-100 p-3 transition-all hover:border-purple-300 hover:bg-purple-50/20 md:p-4"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                                <Layers className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-800">Flashcard</h4>
                                                <p className="truncate text-[11px] text-slate-500">Ôn bằng hình ảnh và lật thẻ.</p>
                                            </div>
                                        </div>

                                        {/* Quiz Option */}
                                        <div 
                                            onClick={() => handleStart('quiz')}
                                            className="group flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-100 p-3 transition-all hover:border-pink-300 hover:bg-pink-50/20 md:p-4"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-800">Trắc nghiệm</h4>
                                                <p className="truncate text-[11px] text-slate-500">Kiểm tra khả năng ghi nhớ.</p>
                                            </div>
                                        </div>

                                        {/* Podcast Option */}
                                        <div 
                                            onClick={() => handleStart('podcast')}
                                            className="group flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-100 p-3 transition-all hover:border-blue-300 hover:bg-blue-50/20 md:p-4"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                                <Volume2 className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-800">Nghe thụ động</h4>
                                                <p className="truncate text-[11px] text-slate-500">Nghe từ vựng tự động.</p>
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
