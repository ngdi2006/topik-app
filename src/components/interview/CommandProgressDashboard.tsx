'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Flame, Target, TrendingUp, Clock, Zap, RotateCcw, ChevronRight, Star } from 'lucide-react'

interface MasteryEntry {
    id: string
    lastSeen: number        // timestamp ms
    correctCount: number
    incorrectCount: number
}

interface CommandStats {
    total: number
    mastered: number        // ≥3 correct, 0 recent wrong
    learning: number        // seen but not mastered
    unseen: number
    dueToday: string[]      // question IDs that need review today
    streakDays: number
    todayCount: number
}

function getMasteryData(topicId: string): Record<string, MasteryEntry> {
    try {
        const raw = localStorage.getItem(`interview_mastery_detail_${topicId}`)
        return raw ? JSON.parse(raw) : {}
    } catch { return {} }
}

function getStreakData(): { streak: number; todayCount: number } {
    try {
        const raw = localStorage.getItem('interview_streak_v1')
        if (!raw) return { streak: 0, todayCount: 0 }
        const data = JSON.parse(raw)
        const today = new Date().toDateString()
        const yesterday = new Date(Date.now() - 86400000).toDateString()
        const streak = data.lastDate === today ? data.streak
            : data.lastDate === yesterday ? data.streak
            : 0
        const todayCount = data.lastDate === today ? (data.todayCount || 0) : 0
        return { streak, todayCount }
    } catch { return { streak: 0, todayCount: 0 } }
}

function computeStats(questions: any[], topicId: string): CommandStats {
    const masteryData = getMasteryData(topicId)
    const { streak, todayCount } = getStreakData()
    const now = Date.now()
    const threeDays = 3 * 24 * 60 * 60 * 1000

    let mastered = 0, learning = 0, unseen = 0
    const dueToday: string[] = []

    for (const q of questions) {
        const entry = masteryData[q.id]
        if (!entry) {
            unseen++
            dueToday.push(q.id)
        } else {
            const isMastered = entry.correctCount >= 3 && entry.incorrectCount === 0
            if (isMastered) {
                mastered++
                // Spaced repetition: review again if > 3 days
                if (now - entry.lastSeen > threeDays) {
                    dueToday.push(q.id)
                }
            } else {
                learning++
                dueToday.push(q.id)
            }
        }
    }

    return {
        total: questions.length,
        mastered,
        learning,
        unseen,
        dueToday: dueToday.slice(0, 10), // max 10 per day
        streakDays: streak,
        todayCount,
    }
}

type SubCategory = 'all' | 'direction' | 'posture' | 'machine' | 'safety'

interface CategoryInfo {
    id: SubCategory
    name: string
    desc: string
    color: string
    bgColor: string
    borderColor: string
}

const SUB_CATEGORIES: CategoryInfo[] = [
    { id: 'all', name: 'Tất cả', desc: 'Toàn bộ khẩu lệnh', color: 'text-indigo-600', bgColor: 'bg-indigo-50/50', borderColor: 'border-indigo-200' },
    { id: 'direction', name: 'Di chuyển', desc: 'Hướng & di chuyển', color: 'text-blue-600', bgColor: 'bg-blue-50/50', borderColor: 'border-blue-200' },
    { id: 'posture', name: 'Tư thế', desc: 'Tư thế cơ thể', color: 'text-emerald-600', bgColor: 'bg-emerald-50/50', borderColor: 'border-emerald-200' },
    { id: 'machine', name: 'Vận hành', desc: 'Bấm nút & thiết bị', color: 'text-amber-600', bgColor: 'bg-amber-50/50', borderColor: 'border-amber-200' },
    { id: 'safety', name: 'An toàn', desc: 'Nguy hiểm & dừng máy', color: 'text-rose-600', bgColor: 'bg-rose-50/50', borderColor: 'border-rose-200' }
]

function categorizeQuestion(q: any): SubCategory {
    const text = (q.question_text || '').toLowerCase()
    const meaning = (q.vietnamese_meaning || '').toLowerCase()

    // 1. Safety
    if (
        text.includes('정지') || text.includes('멈춰') || text.includes('대피') || 
        text.includes('위험') || text.includes('조심') || text.includes('안전') || 
        text.includes('비상') ||
        meaning.includes('dừng') || meaning.includes('thoát') || meaning.includes('an toàn') || 
        meaning.includes('nguy hiểm') || meaning.includes('cẩn thận') || meaning.includes('chú ý')
    ) {
        return 'safety'
    }

    // 2. Machine operation
    if (
        text.includes('버튼') || text.includes('누르') || text.includes('스위치') || 
        text.includes('작동') || text.includes('기계') || text.includes('전원') ||
        text.includes('켜') || text.includes('끄') ||
        meaning.includes('bấm') || meaning.includes('nhấn') || meaning.includes('máy') || 
        meaning.includes('bật') || meaning.includes('tắt') || meaning.includes('thiết bị')
    ) {
        return 'machine'
    }

    // 3. Body Posture
    if (
        text.includes('손') || text.includes('팔') || text.includes('발') || 
        text.includes('다리') || text.includes('머리') || text.includes('허리') || 
        text.includes('눈') || text.includes('올려') || text.includes('내려') || 
        text.includes('굽혀') || text.includes('앉') || text.includes('일어서') ||
        meaning.includes('hạ') || meaning.includes('giơ') || meaning.includes('nâng') || 
        meaning.includes('cúi') || meaning.includes('ngồi') || meaning.includes('đứng') || 
        meaning.includes('tay') || meaning.includes('chân') || meaning.includes('đầu') || 
        meaning.includes('lưng') || meaning.includes('nhắm') || meaning.includes('mở')
    ) {
        return 'posture'
    }

    // 4. Directions / Movement (or default)
    return 'direction'
}

interface Props {
    questions: any[]
    topicId: string
    topicName: string
    onStartPractice: (filtered: any[]) => void
    onStartReview: (ids: string[]) => void
}

export function CommandProgressDashboard({ questions, topicId, topicName, onStartPractice, onStartReview }: Props) {
    const [selectedSubCat, setSelectedSubCat] = useState<SubCategory>('all')
    const [stats, setStats] = useState<CommandStats | null>(null)

    // Filter questions based on current subcategory selection
    const filteredQuestions = useEffect !== undefined ? questions.filter(q => {
        if (selectedSubCat === 'all') return true
        return categorizeQuestion(q) === selectedSubCat
    }) : []

    useEffect(() => {
        if (questions.length > 0) {
            setStats(computeStats(filteredQuestions, topicId))
        }
    }, [questions, topicId, selectedSubCat]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!stats) return null

    const masteredPct = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0
    const circumference = 2 * Math.PI * 40 // r=40
    const dashOffset = circumference * (1 - masteredPct / 100)

    const stageLabel =
        masteredPct >= 80 ? { label: 'Xuất Sắc', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' } :
        masteredPct >= 50 ? { label: 'Tiến Bộ Tốt', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' } :
        masteredPct >= 20 ? { label: 'Đang Học', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' } :
        { label: 'Mới Bắt Đầu', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' }

    // Count questions per subcategory
    const getCounts = (subId: SubCategory) => {
        if (subId === 'all') return questions.length
        return questions.filter(q => categorizeQuestion(q) === subId).length
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center space-y-1">
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">Tiến Độ Luyện Tập</h2>
                <p className="text-slate-500 text-sm">Chuyên đề: <strong className="text-indigo-600">{topicName}</strong></p>
            </div>

            {/* Sub-category Tabs */}
            <div className="bg-slate-100/80 p-1.5 rounded-2xl grid grid-cols-5 gap-1.5 border border-slate-200/50 shadow-inner">
                {SUB_CATEGORIES.map(sub => {
                    const isSelected = selectedSubCat === sub.id
                    const count = getCounts(sub.id)
                    return (
                        <button
                            key={sub.id}
                            disabled={count === 0 && sub.id !== 'all'}
                            onClick={() => setSelectedSubCat(sub.id)}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 border text-center ${count === 0 && sub.id !== 'all' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                                ${isSelected 
                                    ? `bg-white ${sub.color} ${sub.borderColor} shadow-sm font-bold scale-[1.02]` 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
                        >
                            <span className="text-xs md:text-sm font-black tracking-tight">{sub.name}</span>
                            <span className="text-[10px] opacity-70 font-semibold mt-0.5">{count} câu</span>
                        </button>
                    )
                })}
            </div>

            {/* Description banner */}
            <div className="text-center">
                <p className="text-slate-500 text-xs font-medium italic">
                    {SUB_CATEGORIES.find(s => s.id === selectedSubCat)?.desc}
                </p>
            </div>

            {/* Main stats row */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                {/* Progress ring */}
                <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center gap-3">
                    <div className="relative w-28 h-28">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                            <circle
                                cx="50" cy="50" r="40" fill="none"
                                stroke={masteredPct >= 80 ? '#10b981' : masteredPct >= 50 ? '#3b82f6' : masteredPct >= 20 ? '#f59e0b' : '#94a3b8'}
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-slate-800">{masteredPct}%</span>
                            <span className="text-[10px] text-slate-400 font-medium">đã thuộc</span>
                        </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${stageLabel.color} ${stageLabel.bg} ${stageLabel.border}`}>
                        {stageLabel.label}
                    </span>
                </div>

                {/* Stats grid */}
                <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-[1.5rem] p-4 flex flex-col gap-1">
                        <Star className="w-4 h-4 text-emerald-500" />
                        <span className="text-xl font-black text-emerald-700">{stats.mastered}</span>
                        <span className="text-[11px] text-emerald-600 font-medium">Đã thuộc vững</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-[1.5rem] p-4 flex flex-col gap-1">
                        <TrendingUp className="w-4 h-4 text-amber-500" />
                        <span className="text-xl font-black text-amber-700">{stats.learning}</span>
                        <span className="text-[11px] text-amber-600 font-medium">Đang học</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-4 flex flex-col gap-1">
                        <Target className="w-4 h-4 text-slate-400" />
                        <span className="text-xl font-black text-slate-600">{stats.unseen}</span>
                        <span className="text-[11px] text-slate-500 font-medium">Chưa học</span>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 rounded-[1.5rem] p-4 flex flex-col gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-xl font-black text-orange-700">{stats.streakDays}</span>
                        <span className="text-[11px] text-orange-600 font-medium">Ngày liên tiếp</span>
                    </div>
                </div>
            </div>

            {/* Today section */}
            {stats.dueToday.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Clock className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-indigo-900">Ôn tập hôm nay</p>
                                <p className="text-xs text-indigo-500">{stats.dueToday.length} câu cần ôn • ~{Math.ceil(stats.dueToday.length * 0.5)} phút</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => onStartReview(stats.dueToday)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-8 px-3 font-bold shadow-sm shadow-indigo-200"
                        >
                            Ôn Ngay <Zap className="w-3 h-3 ml-1" />
                        </Button>
                    </div>
                    {stats.todayCount > 0 && (
                        <p className="text-xs text-indigo-500 text-center">✅ Hôm nay bạn đã học <strong>{stats.todayCount}</strong> câu rồi, tiếp tục nào!</p>
                    )}
                </div>
            )}

            {stats.dueToday.length === 0 && stats.mastered > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 text-center space-y-1">
                    <p className="text-emerald-700 font-bold">🎉 Hoàn thành mục tiêu hôm nay!</p>
                    <p className="text-emerald-500 text-xs">Không có câu nào cần ôn lúc này. Bạn đang học rất tốt!</p>
                </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 text-slate-300">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs font-medium text-slate-400">hoặc chọn chế độ luyện</span>
                <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* CTA */}
            <Button
                onClick={() => onStartPractice(filteredQuestions)}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all"
            >
                <RotateCcw className="w-4 h-4 mr-2" />
                Chọn Chế Độ Luyện Tập
                <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
        </div>
    )
}
