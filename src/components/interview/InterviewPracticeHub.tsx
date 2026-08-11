'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { InterviewPracticeScreen } from '@/components/interview/InterviewPracticeScreen'
import { ToolDragPracticeScreen } from '@/components/interview/ToolDragPracticeScreen'
import { ToolDropGame } from '@/components/interview/ToolDropGame'
import { CommandProgressDashboard } from '@/components/interview/CommandProgressDashboard'
import { SpeedQuizScreen } from '@/components/interview/SpeedQuizScreen'
import { FactoryScenarioScreen } from '@/components/interview/FactoryScenarioScreen'
import { VocabularyPracticeHub } from '@/components/interview/VocabularyPracticeHub'
import { MathPracticeScreen } from '@/components/interview/MathPracticeScreen'
import { MockExamScreen } from '@/components/interview/MockExamScreen'
import { SelfIntroductionPractice } from '@/components/interview/SelfIntroductionPractice'
import { InterviewFreePreviewBanner } from '@/components/interview/InterviewFreePreviewBanner'
import { saveSelfIntroductionCompletion } from '@/features/second-round-interview/storage'
import PodcastMode from '@/components/vocabulary-vong2/PodcastMode'
import { toast } from 'sonner'
import { Headphones, Bot, ArrowLeft, Wrench, Mic, CheckCircle, Calculator, MessageSquare, Presentation, Factory, Fish, Trees, Tractor, Home, Coffee, Layers, RefreshCw, Play, MousePointer2, Zap, ShieldAlert, BookOpen, Award, ChevronRight, FileText, UserRound } from 'lucide-react'

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

const MOCK_EXAM_SECTIONS = [
    { label: '1.A Hội thoại giao tiếp', detail: '2 câu', points: 4 },
    { label: '1.B Mệnh lệnh hành động', detail: '2 câu', points: 4 },
    { label: '2. Nhận diện dụng cụ', detail: '5 câu', points: 5 },
    { label: '3. Thực hành thao tác', detail: '5 câu · giả lập 3 bước', points: 15 },
    { label: '4. Năng lực nghề nghiệp', detail: '2 câu · toán & tình huống', points: 6 },
    { label: '5. Hệ thống biển báo', detail: '2 câu', points: 6 },
    { label: '6. An toàn chuyên sâu', detail: '2 câu', points: 10 },
] as const

const TOPICS = [
    {
        id: 'introduction',
        name: 'Giới thiệu bản thân',
        description: 'Cá nhân hoá bài mẫu và luyện nói theo tốc độ phù hợp.',
        icon: UserRound,
        color: 'text-blue-600',
        gradient: 'from-blue-50 to-violet-100/50',
        hoverGradient: 'hover:from-blue-100 hover:to-violet-200/50',
        borderColor: 'border-blue-100 hover:border-blue-300',
        shadow: 'hover:shadow-blue-200/50',
        mode: 'self_introduction',
        usesAI: false,
    },
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
        mode: 'listen_only',
        usesAI: false
    },
    { 
        id: 'vocabulary', 
        name: 'Từ vựng & Biển báo', 
        description: 'Học từ vựng qua Flashcard, Trắc nghiệm và Ghép chữ.',
        icon: Presentation,
        color: 'text-pink-600',
        gradient: 'from-pink-50 to-pink-100/50',
        hoverGradient: 'hover:from-pink-100 hover:to-pink-200/50',
        borderColor: 'border-pink-100 hover:border-pink-300',
        shadow: 'hover:shadow-pink-200/50',
        action: 'navigate',
        href: '/vocabulary-practice',
        usesAI: false
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
        mode: 'listen_only',
        usesAI: true
    },
    { 
        id: 'tools', 
        name: 'Sử dụng công cụ', 
        description: 'Mô phỏng thực hành sử dụng công cụ 3 bước thực tế.',
        icon: Wrench,
        color: 'text-orange-600',
        gradient: 'from-orange-50 to-orange-100/50',
        hoverGradient: 'hover:from-orange-100 hover:to-orange-200/50',
        borderColor: 'border-orange-100 hover:border-orange-300',
        shadow: 'hover:shadow-orange-200/50',
        apiCategory: 'Sử dụng công cụ',
        mode: 'tools',
        usesAI: false
    },
    { 
        id: 'communication', 
        name: 'Kỹ năng giao tiếp', 
        description: 'Luyện hội thoại với giám khảo AI, nhận phản hồi và chấm điểm phát âm tự động.',
        icon: MessageSquare,
        color: 'text-emerald-600',
        gradient: 'from-emerald-50 to-emerald-100/50',
        hoverGradient: 'hover:from-emerald-100 hover:to-emerald-200/50',
        borderColor: 'border-emerald-100 hover:border-emerald-300',
        shadow: 'hover:shadow-emerald-200/50',
        apiCategory: 'Giao tiếp',
        mode: 'ai_mock',
        usesAI: true
    },
    { 
        id: 'situation', 
        name: 'Xử lý tình huống', 
        description: 'Giải quyết các vấn đề, sự cố tại công xưởng, AI đánh giá cách xử lý chi tiết.',
        icon: Bot,
        color: 'text-violet-600',
        gradient: 'from-violet-50 to-violet-100/50',
        hoverGradient: 'hover:from-violet-100 hover:to-violet-200/50',
        borderColor: 'border-violet-100 hover:border-violet-300',
        shadow: 'hover:shadow-violet-200/50',
        apiCategory: 'Xử lý tình huống',
        mode: 'ai_mock',
        usesAI: true
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

function filterDuplicateTypes(array: any[]): any[] {
    const seen = new Set<string>()
    const result: any[] = []
    for (const q of array) {
        const cleanMeaning = (q.vietnamese_meaning || '').trim().toLowerCase()
        if (!cleanMeaning || !seen.has(cleanMeaning)) {
            if (cleanMeaning) {
                seen.add(cleanMeaning)
            }
            result.push(q)
        }
    }
    return result
}

const GIAO_TIEP_GROUPS = [
    { id: 'personal', label: '1. Bản thân & Lai lịch', emoji: '👤', desc: 'Tên, tuổi, ngày sinh, quê quán, địa chỉ, chiều cao, cân nặng, hôn nhân', color: 'from-blue-500 to-indigo-655', bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200 hover:border-blue-400', keywords: ['tên', 'tuổi', 'sinh nhật', '생일', '생신', '생년월일', '태어났', 'quê', 'đến từ', '주소', '결혼', '키가', '몸무게', '체중'] },
    { id: 'family', label: '2. Gia đình & Người thân', emoji: '👨‍👩‍👧‍👦', desc: 'Thành viên gia đình, thông tin người thân (bố, mẹ, vợ, chồng)', color: 'from-emerald-500 to-teal-655', bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200 hover:border-emerald-400', keywords: ['가족', '형제자매', '남매', '아버지', '어머니', '남편', '아내'] },
    { id: 'life', label: '3. Đời sống cá nhân', emoji: '🎨', desc: 'Sở thích, lý do thích, ước mơ, thể thao, màu sắc yêu thích', color: 'from-pink-500 to-rose-655', bg: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', keywords: ['취미', '좋아하', '꿈은', '운동', '색깔'] },
    { id: 'korea', label: '4. Mục tiêu sang Hàn Quốc', emoji: '🇰🇷', desc: 'Lý do sang Hàn Quốc, động lực làm việc, học tiếng Hàn bao lâu, ở đâu', color: 'from-cyan-500 to-sky-655', bg: 'from-cyan-50 to-sky-50', border: 'border-cyan-200 hover:border-cyan-400', keywords: ['한국', '배웠', '배우셨'] },
    { id: 'skills', label: '5. Kiến thức Giao tiếp', emoji: '💬', desc: 'Tầm quan trọng của giao tiếp, yếu tố cản trở giao tiếp trong công xưởng', color: 'from-violet-500 to-purple-655', bg: 'from-violet-50 to-purple-50', border: 'border-violet-200 hover:border-violet-400', keywords: ['의사소통', '방해'] },
    { id: 'time_weather', label: '6. Thời gian & Thời tiết', emoji: '🌤️', desc: 'Hỏi giờ, thứ/ngày/tháng/năm, thời tiết hiện tại', color: 'from-amber-500 to-orange-655', bg: 'from-amber-50 to-orange-50', border: 'border-amber-200 hover:border-amber-400', keywords: ['몇 시', '요일', '며칠', '몇월', '몇 년', '날씨'] },
    { id: 'daily', label: '7. Sinh hoạt hàng ngày', emoji: '🚗', desc: 'Phương tiện di chuyển, món ăn sáng', color: 'from-fuchsia-500 to-purple-755', bg: 'from-fuchsia-50 to-purple-50', border: 'border-fuchsia-200 hover:border-fuchsia-400', keywords: ['어떻게 오', '아침을'] },
    { id: 'all', label: 'Ôn tập tổng hợp & Thi thử với AI', emoji: '🎯', desc: 'Trộn tất cả các chủ đề', color: 'from-slate-500 to-slate-700', bg: 'from-slate-50 to-slate-100', border: 'border-slate-200 hover:border-slate-400', keywords: [] }
];

const XU_LY_TINH_HUONG_GROUPS = [
    { id: 'skills_cert', label: '1. Kỹ năng & Bằng cấp', emoji: '🎓', desc: 'Trình độ kỹ thuật, chứng chỉ, kinh nghiệm làm việc', color: 'from-blue-500 to-indigo-655', bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200 hover:border-blue-400', keywords: ['기술', '자격증', 'kỹ thuật', 'bằng cấp', 'trình độ'] },
    { id: 'errors', label: '2. Sai sót & Sự cố', emoji: '⚠️', desc: 'Sai lầm, sản phẩm lỗi, sự cố khi làm việc', color: 'from-red-500 to-rose-655', bg: 'from-red-50 to-rose-50', border: 'border-red-200 hover:border-red-400', keywords: ['실수', '불량품', '사고', 'sai lầm', 'sự cố', 'lỗi', 'phạm phải'] },
    { id: 'health_safety', label: '3. Sức khỏe & An toàn', emoji: '🚨', desc: 'Đau ốm, hỏa hoạn, an toàn lao động', color: 'from-rose-500 to-red-655', bg: 'from-rose-50 to-red-50', border: 'border-rose-200 hover:border-rose-400', keywords: ['아프', '불이 나', '병원', 'đau ốm', 'hỏa hoạn', 'sức khỏe'] },
    { id: 'salary', label: '4. Lương & Nợ lương', emoji: '💰', desc: 'Nợ lương, không trả tiền, chậm lương', color: 'from-amber-500 to-yellow-655', bg: 'from-amber-50 to-yellow-50', border: 'border-amber-200 hover:border-amber-400', keywords: ['월급', '급여', '체불', '돈을 주지 않', 'lương', 'nợ lương'] },
    { id: 'boss', label: '5. Quan hệ với cấp trên', emoji: '👔', desc: 'Bạo hành, bất đồng ý kiến với cấp trên', color: 'from-slate-500 to-gray-655', bg: 'from-slate-50 to-gray-50', border: 'border-slate-200 hover:border-slate-400', keywords: ['상사가 폭행', '상사가 때리', '상사가 당신', 'cấp trên', '반대'] },
    { id: 'coworker', label: '6. Quan hệ đồng nghiệp', emoji: '🤝', desc: 'Giúp đỡ đồng nghiệp, mâu thuẫn, hòa hợp với mọi người', color: 'from-teal-500 to-emerald-655', bg: 'from-teal-50 to-emerald-50', border: 'border-teal-200 hover:border-teal-400', keywords: ['동료', '갈등', '싸우', '잘 지내', 'đồng nghiệp', '바쁘'] },
    { id: 'workload', label: '7. Khối lượng công việc', emoji: '📊', desc: 'Nhiều việc, ít việc, công ty khó khăn', color: 'from-orange-500 to-amber-655', bg: 'from-orange-50 to-amber-50', border: 'border-orange-200 hover:border-orange-400', keywords: ['일이 많', '일이 적', '어려울', 'nhiều việc', 'ít việc'] },
    { id: 'lost', label: '8. Mất mát tài sản', emoji: '🔍', desc: 'Mất tiền, mất đồ vật tại công ty', color: 'from-cyan-500 to-sky-655', bg: 'from-cyan-50 to-sky-50', border: 'border-cyan-200 hover:border-cyan-400', keywords: ['잃어버리', 'mất tiền', 'mất đồ'] },
    { id: 'etiquette', label: '9. Phép tắc & Đúng giờ', emoji: '⏰', desc: 'Phép tắc giữa mọi người, tuân thủ thời gian', color: 'from-fuchsia-500 to-purple-755', bg: 'from-fuchsia-50 to-purple-50', border: 'border-fuchsia-200 hover:border-fuchsia-400', keywords: ['예절', '정해진 시간', 'phép tắc', 'đúng giờ', 'tuân thủ'] },
    { id: 'all', label: 'Ôn tập tổng hợp & Thi thử với AI', emoji: '🎯', desc: 'Trộn tất cả các chủ đề', color: 'from-slate-500 to-slate-700', bg: 'from-slate-50 to-slate-100', border: 'border-slate-200 hover:border-slate-400', keywords: [] }
];

function filterQuestionsByGroup(questionsList: any[], groupId: string, groupsList: any[]): any[] {
    if (groupId === 'all') return questionsList;
    const group = groupsList.find(g => g.id === groupId);
    if (!group || !group.keywords) return questionsList;
    
    return questionsList.filter(q => {
        const text = (q.vietnamese_meaning || '').toLowerCase();
        const textKo = (q.question_text || '').toLowerCase();
        return group.keywords.some((kw: string) => text.includes(kw.toLowerCase()) || textKo.includes(kw.toLowerCase()));
    });
}

const VN_TO_EN_INDUSTRY: Record<string, string> = {
    'Sản xuất chế tạo': 'MANUFACTURING',
    'Ngư nghiệp': 'FISHERY',
    'Nông nghiệp': 'AGRICULTURE',
    'Lâm nghiệp': 'FORESTRY',
    'Xây dựng': 'CONSTRUCTION',
    'Dịch vụ': 'SERVICE'
}

export function InterviewPracticeHub({
    onBackToDashboard,
    initialMode = 'practice',
    initialIndustry = '',
    initialTopicId,
}: {
    onBackToDashboard?: () => void
    initialMode?: 'practice' | 'mock'
    initialIndustry?: string
    initialTopicId?: string
}) {
    const router = useRouter()
    const hasOpenedInitialTopic = useRef(false)
    const [step, setStep] = useState<'industry' | 'topic' | 'loading_topic' | 'self_introduction' | 'select_mode' | 'communication_topic' | 'situation_topic' | 'podcast' | 'math_topic' | 'math_practice' | 'flashcard_options' | 'command_dashboard' | 'speed_quiz' | 'tool_drop_game' | 'scenario_simulation' | 'practice' | 'evaluating' | 'finished' | 'vocabulary_practice' | 'mock_intro' | 'mock_exam'>(
        initialIndustry
            ? (initialMode === 'mock' ? 'mock_intro' : initialTopicId ? 'loading_topic' : 'topic')
            : 'industry'
    )
    const [allQuestions, setAllQuestions] = useState<any[]>([])
    const [selectedMathTopic, setSelectedMathTopic] = useState<string>('all')
    const [selectedCommunicationGroup, setSelectedCommunicationGroup] = useState<string>('all')
    const [selectedSituationGroup, setSelectedSituationGroup] = useState<string>('all')
    const [mathMode, setMathMode] = useState<'listen_card' | 'number_quiz' | 'speak_answer'>('listen_card')
    const [selectedIndustry, setSelectedIndustry] = useState<string>(initialIndustry)
    const [selectedTopicObj, setSelectedTopicObj] = useState<any>(null)
    const [selectedListenMode, setSelectedListenMode] = useState<'flashcard' | 'meaning_quiz' | 'word_sort' | 'ai_mock'>('flashcard')
    const [podcastQuestions, setPodcastQuestions] = useState<any[]>([])
    const [podcastRound, setPodcastRound] = useState(0)
    const [initialAutoPlay, setInitialAutoPlay] = useState<boolean>(false)
    const [reviewQuestions, setReviewQuestions] = useState<any[]>([])
    
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [evaluationResults, setEvaluationResults] = useState<any[]>([])
    const [sessionStats, setSessionStats] = useState({ mastered: 0, total: 0 })
    const [sessionMasteredIds, setSessionMasteredIds] = useState<string[]>([])

    const handleSelectIndustry = (indId: string) => {
        setSelectedIndustry(indId)
        if (initialMode === 'mock') {
            setStep('mock_intro')
        } else {
            setStep('topic')
        }
    }

    const handleSelectTopic = async (topic: any) => {
        if (topic.id === 'introduction') {
            setSelectedTopicObj(topic)
            setStep('self_introduction')
            return
        }

        if (topic.id === 'vocabulary') {
            setStep('vocabulary_practice')
            return
        }

        if (topic.action === 'navigate') {
            router.push(`${topic.href}?industry=${encodeURIComponent(selectedIndustry)}`)
            return
        }

        setSelectedTopicObj(topic)

        if (topic.mode === 'listen_only' || topic.id === 'communication' || topic.id === 'situation' || topic.id === 'tools') {
            // Load questions first, then show dashboard
            loadQuestionsForDashboard(topic)
            return
        }

        startPractice(topic, null)
    }

    useEffect(() => {
        if (!initialTopicId || !initialIndustry || hasOpenedInitialTopic.current) return

        const topic = TOPICS.find((item) => item.id === initialTopicId)
        if (!topic) return

        hasOpenedInitialTopic.current = true
        void handleSelectTopic(topic)
        // The initial deep link is intentionally handled once per mounted learning flow.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialIndustry, initialTopicId])

    const loadQuestionsForDashboard = async (topic: any) => {
        setLoading(true)
        try {
            const url = `/api/interview-questions?category=${encodeURIComponent(topic.apiCategory)}&industry=${encodeURIComponent(selectedIndustry)}`
            const res = await fetch(url, { cache: 'no-store' })
            const data = await res.json()
            if (!data.success) throw new Error(data.error)
            setAllQuestions(data.data)
            setQuestions(data.data) // store ALL questions for dashboard stats
            
            if (topic.id === 'math') {
                setStep('math_topic')
            } else if (topic.id === 'communication') {
                setStep('communication_topic')
            } else if (topic.id === 'situation') {
                setSelectedSituationGroup('all')
                setStep('select_mode')
            } else {
                setStep('select_mode')
            }
        } catch (error) {
            toast.error('Lỗi khi tải câu hỏi')
            if (initialTopicId) setStep('topic')
        } finally {
            setLoading(false)
        }
    }

    const startPractice = async (topic: any, listenMode: string | null, customQuestions?: any[]) => {
        if (listenMode) {
            setSelectedListenMode(listenMode as any)
        } else {
            setSelectedListenMode('ai_mock')
        }
        if (customQuestions) {
            const masteryData = JSON.parse(localStorage.getItem('interview_mastery_v1') || '{}')
            const masteredIds = masteryData[topic.id] || []

            let unmastered = customQuestions.filter((q: any) => !masteredIds.includes(q.id))
            let mastered = customQuestions.filter((q: any) => masteredIds.includes(q.id))

            unmastered = shuffleArray(unmastered)
            mastered = shuffleArray(mastered)
            
            let finalQuestions = [...unmastered, ...mastered]
            
            finalQuestions = filterDuplicateTypes(finalQuestions)

            // Xác định chế độ ôn tổng hợp (all groups) để tăng số lượng câu hỏi
            const isAllGroups = (topic.id === 'communication' && selectedCommunicationGroup === 'all')
                || (topic.id === 'situation' && selectedSituationGroup === 'all');
            const isAiMockConversation = (topic.mode === 'ai_mock' && !listenMode);

            if (topic.id === 'situation' && listenMode) {
                // P7 has a compact bank: keep every listening mode to 10 questions.
                finalQuestions = finalQuestions.slice(0, 10)
            } else if (topic.mode === 'listen_only') {
                finalQuestions = finalQuestions.slice(0, 10)
            } else if (isAiMockConversation) {
                // AI mock conversation: luôn 5 câu (không tăng)
                finalQuestions = finalQuestions.slice(0, 5)
            } else if (topic.mode === 'tools') {
                finalQuestions = finalQuestions.slice(0, 5)
            } else if (isAllGroups) {
                // Ôn tổng hợp: tăng số câu để đa dạng chủ đề
                finalQuestions = finalQuestions.slice(0, 20)
            } else {
                finalQuestions = finalQuestions.slice(0, 10)
            }

            if (finalQuestions.length === 0) {
                toast.error('Chưa có câu hỏi nào trong danh mục này')
                return
            }

            setQuestions(finalQuestions)
            setStep('practice')
            return
        }
        setLoading(true)
        try {
            const url = `/api/interview-questions?category=${encodeURIComponent(topic.apiCategory)}&industry=${encodeURIComponent(selectedIndustry)}`

            const res = await fetch(url, { cache: 'no-store' })
            const data = await res.json()

            if (!data.success) throw new Error(data.error)

            // Lấy dữ liệu thống kê từ localStorage
            const masteryData = JSON.parse(localStorage.getItem('interview_mastery_v1') || '{}')
            const masteredIds = masteryData[topic.id] || []

            // Phân tách câu đã thuộc và chưa thuộc, ưu tiên câu chưa thuộc
            let unmastered = data.data.filter((q: any) => !masteredIds.includes(q.id))
            let mastered = data.data.filter((q: any) => masteredIds.includes(q.id))

            unmastered = shuffleArray(unmastered)
            mastered = shuffleArray(mastered)

            let finalQuestions = [...unmastered, ...mastered]

            finalQuestions = filterDuplicateTypes(finalQuestions)

            // Random limit based on mode
            if (topic.mode === 'listen_only') {
                finalQuestions = finalQuestions.slice(0, 10)
            } else if (topic.mode === 'ai_mock') {
                finalQuestions = finalQuestions.slice(0, 5)
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
            if (initialTopicId) setStep('topic')
        } finally {
            setLoading(false)
        }
    }

    const handleStartListenMode = (mode: 'flashcard' | 'meaning_quiz' | 'word_sort') => {
        setSelectedListenMode(mode)
        if (mode === 'flashcard') {
            setStep('flashcard_options')
            return
        }
        startPractice(selectedTopicObj, mode, questions)
    }

    const startFlashcardPractice = (autoPlay: boolean) => {
        setInitialAutoPlay(autoPlay)
        startPractice(selectedTopicObj, 'flashcard', questions)
    }

    const handleFinishPractice = async (submittedAnswers?: Record<string, string>, newlyMasteredIds: string[] = []) => {
        // Lưu thống kê vào localStorage (simple mastery list)
        if (selectedTopicObj) {
            const masteryData = JSON.parse(localStorage.getItem('interview_mastery_v1') || '{}')
            const prevMastered = new Set<string>(masteryData[selectedTopicObj.id] || [])
            for (const q of questions) {
                if (newlyMasteredIds.includes(q.id)) {
                    prevMastered.add(q.id)
                } else {
                    prevMastered.delete(q.id) // Remove if they got it wrong or did not master it in this session!
                }
            }
            masteryData[selectedTopicObj.id] = Array.from(prevMastered)
            localStorage.setItem('interview_mastery_v1', JSON.stringify(masteryData))

            // Lưu thống kê chi tiết từng câu (spaced repetition)
            const detailKey = `interview_mastery_detail_${selectedTopicObj.id}`
            const detailData: Record<string, any> = JSON.parse(localStorage.getItem(detailKey) || '{}')
            const now = Date.now()
            for (const q of questions) {
                if (!detailData[q.id]) detailData[q.id] = { id: q.id, lastSeen: now, correctCount: 0, incorrectCount: 0 }
                else detailData[q.id].lastSeen = now
                if (newlyMasteredIds.includes(q.id)) {
                    detailData[q.id].correctCount = (detailData[q.id].correctCount || 0) + 1
                } else {
                    detailData[q.id].incorrectCount = (detailData[q.id].incorrectCount || 0) + 1
                }
            }
            localStorage.setItem(detailKey, JSON.stringify(detailData))

            // Cập nhật streak
            const streakRaw = localStorage.getItem('interview_streak_v1')
            const streakData = streakRaw ? JSON.parse(streakRaw) : { streak: 0, lastDate: '', todayCount: 0 }
            const todayStr = new Date().toDateString()
            const yesterdayStr = new Date(Date.now() - 86400000).toDateString()
            if (streakData.lastDate === todayStr) {
                streakData.todayCount = (streakData.todayCount || 0) + questions.length
            } else if (streakData.lastDate === yesterdayStr) {
                streakData.streak = (streakData.streak || 0) + 1
                streakData.todayCount = questions.length
                streakData.lastDate = todayStr
            } else {
                streakData.streak = 1
                streakData.todayCount = questions.length
                streakData.lastDate = todayStr
            }
            localStorage.setItem('interview_streak_v1', JSON.stringify(streakData))
        }

        setSessionStats({ mastered: newlyMasteredIds.length, total: questions.length })
        setSessionMasteredIds(newlyMasteredIds)

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

            // Lưu các câu trả lời có điểm >= 80 vào danh sách đã thuộc, xóa nếu điểm < 80
            if (selectedTopicObj) {
                const masteryData = JSON.parse(localStorage.getItem('interview_mastery_v1') || '{}')
                const prevMastered = new Set<string>(masteryData[selectedTopicObj.id] || [])
                for (const r of results) {
                    if (r.score >= 80) {
                        prevMastered.add(r.question_id)
                    } else {
                        prevMastered.delete(r.question_id) // Remove if they failed
                    }
                }
                masteryData[selectedTopicObj.id] = Array.from(prevMastered)
                localStorage.setItem('interview_mastery_v1', JSON.stringify(masteryData))
            }

            setStep('finished')
        } catch (error) {
            toast.error('Lỗi khi chấm điểm. Vui lòng thử lại.')
            setStep('finished')
        }
    }

    const handleStartReview = (dueIds: string[]) => {
        const dueQ = questions.filter(q => dueIds.includes(q.id))
        if (dueQ.length === 0) return
        // Set these as the questions to practice then go to select_mode
        setQuestions(dueQ)
        setStep('select_mode')
    }

    const returnToOuterDashboard = () => {
        if (!initialTopicId || !onBackToDashboard) return false
        onBackToDashboard()
        return true
    }

    const handleReturnToTopicList = () => {
        setSessionStats({ mastered: 0, total: 0 })
        setSessionMasteredIds([])
        setEvaluationResults([])
        setAnswers({})

        if (!returnToOuterDashboard()) {
            setStep('topic')
        }
    }

    const handleExitActivePractice = () => {
        if (selectedTopicObj?.id === 'tools' && allQuestions.length > 0) {
            setQuestions(allQuestions)
        }
        if (
            selectedTopicObj?.mode === 'listen_only'
            || selectedTopicObj?.id === 'math'
            || selectedTopicObj?.id === 'communication'
            || selectedTopicObj?.id === 'situation'
            || selectedTopicObj?.id === 'tools'
        ) {
            setStep('select_mode')
        } else if (returnToOuterDashboard()) {
            return
        } else {
            setStep('topic')
        }
    }

    const handleGoBack = () => {
        if (initialTopicId && onBackToDashboard) {
            if (step === 'select_mode' && selectedTopicObj?.id === 'communication') {
                setStep('communication_topic')
                return
            }
            if (step === 'flashcard_options') {
                setStep('select_mode')
                return
            }
            onBackToDashboard()
            return
        }

        if (step === 'topic' || step === 'loading_topic') {
            if (initialIndustry && onBackToDashboard) {
                onBackToDashboard()
            } else {
                setStep('industry')
            }
        } else if (step === 'mock_intro' || step === 'mock_exam') {
            if (initialMode === 'mock' && onBackToDashboard) {
                onBackToDashboard()
                return
            }
            setStep('topic')
        } else if (step === 'self_introduction') {
            if (!returnToOuterDashboard()) setStep('topic')
        } else if (step === 'command_dashboard') {
            setStep('topic')
        } else if (step === 'math_topic') {
            setStep('topic')
        } else if (step === 'math_practice') {
            setStep('math_topic')
        } else if (step === 'select_mode') {
            if (selectedTopicObj?.id === 'communication') {
                setStep('communication_topic')
            } else if (selectedTopicObj?.id === 'situation') {
                if (!returnToOuterDashboard()) setStep('topic')
            } else {
                setStep('topic')
            }
        } else if (step === 'communication_topic') {
            setStep('topic')
        } else if (step === 'situation_topic') {
            setStep('topic')
        } else if (step === 'flashcard_options' || step === 'scenario_simulation' || step === 'tool_drop_game') {
            setStep('select_mode')
        } else {
            if (onBackToDashboard) {
                onBackToDashboard()
            } else {
                router.push('/dashboard')
            }
        }
    }

    const handleStartSpeedQuiz = () => {
        if (questions.length === 0) {
            toast.error('Chưa có câu hỏi')
            return
        }
        if (selectedTopicObj?.id === 'situation') {
            setQuestions(shuffleArray(questions).slice(0, 10))
        }
        setStep('speed_quiz')
    }

    const handleStartToolDropGame = () => {
        // ToolDropGame supports both the canonical workshop schema and legacy
        // rows inferred from their Korean/Vietnamese content. Filtering here by
        // the old `correct_tool` field made the game appear unavailable.
        const gameQuestions = shuffleArray(questions)
            .filter((question) => Boolean(question.question_text?.trim()))
            .slice(0, 10)

        if (gameQuestions.length === 0) {
            toast.error('Chưa có câu hỏi được cấu hình dụng cụ cho trò chơi')
            return
        }

        setQuestions(gameQuestions)
        setStep('tool_drop_game')
    }

    const handleStartPodcast = () => {
        const pool = filterDuplicateTypes(allQuestions.length > 0 ? allQuestions : questions)
        if (selectedTopicObj?.id !== 'tools') {
            setPodcastQuestions(pool)
            setStep('podcast')
            return
        }

        const previousIds = new Set(podcastQuestions.map((question) => question.id))
        const unseen = pool.filter((question) => !previousIds.has(question.id))
        const source = unseen.length >= 20 ? unseen : pool
        setPodcastQuestions(shuffleArray(source).slice(0, 20))
        setPodcastRound((current) => current + 1)
        setStep('podcast')
    }

    const handleStartScenarioSimulation = () => {
        if (questions.length === 0) {
            toast.error('Chưa có câu hỏi')
            return
        }
        setStep('scenario_simulation')
    }

    if (step === 'vocabulary_practice') {
        return (
            <VocabularyPracticeHub 
                presetIndustry={VN_TO_EN_INDUSTRY[selectedIndustry] || 'MANUFACTURING'} 
                onBackToDashboard={() => {
                    if (!returnToOuterDashboard()) {
                        setStep('topic')
                    }
                }}
            />
        )
    }

    if (step === 'communication_topic') {
        return (
            <div className="w-full py-2">
                {/* Header */}
                <div className="mx-auto mb-4 max-w-4xl md:mb-8">
                    <div className="relative text-center">
                        <button aria-label="Quay lại" onClick={handleGoBack} className="absolute left-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-slate-800 md:static md:mb-6 md:h-auto md:w-auto md:translate-y-0 md:justify-start md:border-0 md:bg-transparent md:shadow-none">
                            <ArrowLeft className="size-4.5 md:size-5" />
                        </button>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm md:gap-2 md:px-4 md:py-2 md:text-sm">
                            <MessageSquare className="size-3.5 md:size-4" /> Kỹ năng giao tiếp
                        </div>
                    </div>
                    <div className="mt-2 text-center md:mt-0">
                        <h1 className="text-xl font-black text-slate-900 md:text-3xl">Chọn chủ đề</h1>
                        <p className="mt-1 text-xs font-medium text-slate-500 md:mt-2 md:text-base">Luyện theo nhóm câu hỏi trọng tâm</p>
                    </div>
                </div>

                <div className="mx-auto max-w-4xl">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
                        {GIAO_TIEP_GROUPS.map(t => {
                            const groupQs = filterQuestionsByGroup(allQuestions, t.id, GIAO_TIEP_GROUPS);
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setQuestions(groupQs);
                                        setSelectedCommunicationGroup(t.id);
                                        setStep('select_mode');
                                    }}
                                    className={`group relative flex items-center gap-2.5 overflow-hidden rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md md:items-start md:gap-4 md:rounded-2xl md:p-5 ${t.id === 'all' ? 'border-violet-500 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-3 text-white shadow-lg shadow-violet-200/70 md:hover:border-violet-400' : 'border-slate-200/80 bg-white p-2.5 hover:border-emerald-400 md:border-2'}`}
                                >
                                    {t.id === 'all' && <div className="pointer-events-none absolute -right-5 -top-8 size-24 rounded-full bg-white/10" />}
                                    <div className={`relative flex size-10 shrink-0 items-center justify-center rounded-xl text-xl transition-colors md:size-auto md:p-3 md:text-3xl ${t.id === 'all' ? 'bg-white/15 ring-1 ring-white/20' : 'bg-slate-50 group-hover:bg-emerald-50'}`}>
                                        {t.emoji}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-0.5 md:space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`min-w-0 truncate text-sm font-black leading-snug md:text-base ${t.id === 'all' ? 'text-white' : 'text-slate-800'}`}>{t.label}</div>
                                            {t.id === 'all' && <span className="shrink-0 rounded-full bg-amber-300 px-1.5 py-0.5 text-[8px] font-black uppercase text-violet-950">AI</span>}
                                        </div>
                                        <div className={`truncate text-[10px] font-medium leading-snug md:line-clamp-2 md:whitespace-normal md:text-xs md:leading-relaxed ${t.id === 'all' ? 'text-violet-100' : 'text-slate-500'}`}>{t.desc}</div>
                                        <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold transition-colors md:px-2.5 md:py-1 md:text-[10px] ${t.id === 'all' ? 'border-white/15 bg-white/10 text-white' : 'border-slate-100 bg-slate-50 text-slate-600 group-hover:border-emerald-100 group-hover:bg-emerald-50 group-hover:text-emerald-700'}`}>
                                            📊 {groupQs.length} câu hỏi
                                        </div>
                                    </div>
                                    {t.id === 'all' && <ChevronRight className="relative size-4 shrink-0 text-white" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'situation_topic') {
        return (
            <div className="w-full py-2">
                {/* Header */}
                <div className="max-w-4xl mx-auto mb-8">
                    <button onClick={handleGoBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold mb-6 transition-colors">
                        <ArrowLeft className="w-5 h-5" /> Quay lại
                    </button>
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-sm font-black px-4 py-2 rounded-full mb-3 shadow-sm">
                            <Bot className="w-4 h-4" /> Xử lý tình huống
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Chọn Chủ Đề Luyện Tập</h1>
                        <p className="text-slate-500 font-medium text-sm md:text-base">Luyện theo nhóm tình huống giúp bạn làm quen với các sự cố trong thực tế</p>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {XU_LY_TINH_HUONG_GROUPS.map(t => {
                            const groupQs = filterQuestionsByGroup(allQuestions, t.id, XU_LY_TINH_HUONG_GROUPS);
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setQuestions(groupQs);
                                        setSelectedSituationGroup(t.id);
                                        setStep('select_mode');
                                    }}
                                    className="p-5 rounded-2xl border-2 text-left bg-white border-slate-200/80 hover:border-violet-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative group flex items-start gap-4"
                                >
                                    <div className="text-3xl p-3 rounded-xl bg-slate-50 group-hover:bg-violet-50 transition-colors">
                                        {t.emoji}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="font-black text-slate-800 text-base">{t.label}</div>
                                        <div className="text-xs text-slate-500 leading-relaxed font-medium">{t.desc}</div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-[10px] font-bold text-slate-600 border border-slate-100 group-hover:bg-violet-50 group-hover:text-violet-700 group-hover:border-violet-100 transition-colors">
                                            📊 {groupQs.length} câu hỏi
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'math_topic') {
        const MATH_TOPICS = [
            { id: 'arithmetic', label: 'Phép tính cơ bản', emoji: '➕', desc: 'Cộng · Trừ · Nhân · Chia', color: 'from-rose-500 to-red-600', bg: 'from-rose-50 to-red-50', border: 'border-rose-200 hover:border-rose-400' },
            { id: 'length', label: 'Đơn vị Độ dài', emoji: '📏', desc: 'km ↔ m ↔ cm ↔ mm', color: 'from-blue-500 to-cyan-600', bg: 'from-blue-50 to-cyan-50', border: 'border-blue-200 hover:border-blue-400' },
            { id: 'weight', label: 'Đơn vị Khối lượng', emoji: '⚖️', desc: 'tấn ↔ kg ↔ g', color: 'from-emerald-500 to-teal-600', bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200 hover:border-emerald-400' },
            { id: 'time', label: 'Thời gian & Nhiệt độ', emoji: '🕐', desc: 'giờ · phút · độ C', color: 'from-violet-500 to-purple-600', bg: 'from-violet-50 to-purple-50', border: 'border-violet-200 hover:border-violet-400' },
            { id: 'all', label: 'Ôn tập tổng hợp & Thi thử với AI', emoji: '🎯', desc: 'Trộn tất cả 4 chủ đề', color: 'from-slate-500 to-slate-700', bg: 'from-slate-50 to-slate-100', border: 'border-slate-200 hover:border-slate-400' },
        ]

        const MATH_MODES = [
            {
                id: 'listen_card' as const,
                label: 'Nghe & Nhớ',
                emoji: '🎧',
                desc: 'Nghe câu hỏi · Tính nhẩm · Lật thẻ xem đáp án',
                color: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
            },
            {
                id: 'number_quiz' as const,
                label: 'Chọn số',
                emoji: '🔢',
                desc: 'Nghe và chọn 1 trong 4 đáp án',
                color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
            },
            ...(selectedMathTopic === 'all' ? [{
                id: 'speak_answer' as const,
                label: 'Nói đáp án với AI',
                emoji: 'AI',
                desc: 'Tính nhẩm · Trả lời bằng tiếng Hàn',
                color: 'bg-violet-600 hover:bg-violet-700 shadow-violet-200',
            }] : [])
        ]

        const filteredQs = selectedMathTopic === 'all'
            ? questions
            : questions.filter((q: any) => {
                const topicTag = q.suggested_answers?.find((s: string) => s.startsWith('__topic__:'))
                return topicTag === `__topic__:${selectedMathTopic}`
            })

        return (
            <div className="w-full py-2">
                {/* Header */}
                <div className="mx-auto mb-4 max-w-3xl md:mb-8">
                    <div className="relative text-center">
                        <button aria-label="Quay lại" onClick={handleGoBack} className="absolute left-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-slate-800 md:static md:mb-6 md:h-auto md:w-auto md:translate-y-0 md:justify-start md:gap-2 md:border-0 md:bg-transparent md:shadow-none">
                            <ArrowLeft className="size-4.5 md:size-5" /><span className="hidden md:inline">Quay lại</span>
                        </button>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-black text-indigo-700 md:gap-2 md:px-4 md:py-2 md:text-sm">
                            <Calculator className="size-3.5 md:size-4" /> Toán & Tính toán
                        </div>
                    </div>
                    <div className="mt-2 text-center md:mt-0">
                        <h1 className="text-xl font-black text-slate-900 md:text-3xl">Chọn nội dung học</h1>
                        <p className="mt-1 text-xs font-medium text-slate-500 md:mt-2 md:text-base">Nghe số · Tính toán · Phát âm</p>
                    </div>
                </div>

                <div className="mx-auto max-w-3xl space-y-5 md:space-y-8">
                    {/* Topic selector */}
                    <div>
                        <h2 className="mb-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 md:mb-4 md:text-sm md:tracking-widest">
                            <span className="flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white md:size-6 md:text-xs">1</span>
                            Chọn chủ đề <span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold normal-case tracking-normal text-slate-500">{filteredQs.length} câu</span>
                        </h2>
                        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
                            {MATH_TOPICS.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setSelectedMathTopic(t.id)
                                        if (t.id !== 'all' && mathMode === 'speak_answer') {
                                            setMathMode('listen_card')
                                        }
                                    }}
                                    className={`flex min-h-[72px] items-center gap-2.5 rounded-2xl border-2 bg-gradient-to-br p-3 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg md:block md:min-h-0 md:p-4 ${t.id === 'all' ? 'col-span-2 md:col-span-1' : ''} ${t.bg} ${t.border} ${selectedMathTopic === t.id ? 'ring-2 ring-indigo-500 ring-offset-1 shadow-md md:ring-offset-2 md:scale-[1.02]' : ''}`}
                                >
                                    <div className="shrink-0 text-xl md:mb-2 md:text-2xl">{t.emoji}</div>
                                    <div className="min-w-0"><div className="text-xs font-black leading-snug text-slate-800 md:mb-0.5 md:text-sm">{t.label}</div>
                                    <div className="mt-0.5 truncate text-[10px] text-slate-500 md:text-xs">{t.desc}</div></div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mode selector */}
                    <div>
                        <h2 className="mb-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 md:mb-4 md:text-sm md:tracking-widest">
                            <span className="flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white md:size-6 md:text-xs">2</span>
                            Chọn chế độ học
                        </h2>
                        <div className="space-y-2.5 md:space-y-3">
                            {MATH_MODES.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setMathMode(m.id)}
                                    className={`w-full rounded-2xl border-2 p-3 text-left transition-all duration-200 hover:shadow-md md:p-4 ${mathMode === m.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-400 ring-offset-1' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                                >
                                    <div className="flex items-center gap-3 md:gap-4">
                                        {m.id === 'speak_answer' ? (
                                            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 shadow-lg shadow-purple-200">
                                                <Bot className="h-7 w-7 text-white" strokeWidth={2.4} />
                                                <span className="absolute -right-2 -top-2 rounded-full border-2 border-white bg-amber-400 px-1.5 py-0.5 text-[9px] font-black leading-none text-slate-900 shadow-sm">
                                                    AI
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="text-2xl md:text-3xl">{m.emoji}</div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex min-w-0 flex-wrap items-center gap-1.5 md:gap-2">
                                                <div className="min-w-0 text-sm font-black leading-tight text-slate-800 md:text-base">{m.label}</div>
                                                {m.id === 'speak_answer' ? (
                                                    <span className="shrink-0 rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-700 md:px-2 md:text-[10px]">
                                                        AI
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 md:text-sm">{m.desc}</div>
                                        </div>
                                        {mathMode === m.id && (
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600">
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button
                        onClick={() => {
                            if (filteredQs.length === 0) {
                                toast.error('Không có câu hỏi cho chủ đề này')
                                return
                            }
                            
                            // Phân tách câu đã thuộc và chưa thuộc cho toán học
                            const masteryData = JSON.parse(localStorage.getItem('interview_mastery_v1') || '{}')
                            const masteredIds = masteryData[selectedTopicObj?.id || 'math'] || []
                            
                            let unmastered = filteredQs.filter((q: any) => !masteredIds.includes(q.id))
                            let mastered = filteredQs.filter((q: any) => masteredIds.includes(q.id))
                            
                            unmastered = shuffleArray(unmastered)
                            mastered = shuffleArray(mastered)
                            
                            const finalQs = [...unmastered, ...mastered].slice(0, 10)
                            setQuestions(finalQs)
                            setStep('math_practice')
                        }}
                        className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-base font-black text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 hover:from-indigo-700 hover:to-purple-700 md:h-16 md:rounded-2xl md:text-lg md:shadow-xl"
                    >
                        🚀 Bắt đầu luyện tập
                    </Button>
                </div>
            </div>
        )
    }

    if (step === 'math_practice') {
        return (
            <MathPracticeScreen
                questions={questions}
                mathMode={mathMode}
                onFinish={(masteredIds) => handleFinishPractice(undefined, masteredIds)}
                onBack={() => void loadQuestionsForDashboard(selectedTopicObj)}
            />
        )
    }

    if (step === 'speed_quiz') {
        const filteredSpeedQs = filterDuplicateTypes(questions)
        const isAllGroups = (selectedTopicObj?.id === 'communication' && selectedCommunicationGroup === 'all')
            || (selectedTopicObj?.id === 'situation' && selectedSituationGroup === 'all');
        return (
            <SpeedQuizScreen
                questions={filteredSpeedQs}
                maxQuestions={isAllGroups ? 20 : 10}
                timeLimitSeconds={selectedTopicObj?.id === 'tools' ? 10 : 8}
                onFinish={(results, masteredIds) => {
                    handleFinishPractice(undefined, masteredIds)
                }}
                onBack={handleExitActivePractice}
            />
        )
    }

    if (step === 'podcast') {
        const filteredPodcastQs = podcastQuestions.length > 0 ? podcastQuestions : filterDuplicateTypes(questions)
        return (
            <div className="min-h-[500px] bg-[#f8fafc] rounded-2xl overflow-hidden border border-slate-100 flex flex-col max-w-4xl mx-auto">
                <div className="bg-white px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Button 
                            variant="ghost" 
                            onClick={handleExitActivePractice}
                            className="h-9 w-9 p-0 text-slate-600 hover:bg-slate-100 flex-shrink-0 rounded-full flex items-center justify-center"
                            title="Quay lại"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="min-w-0">
                            <h2 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">
                                Nghe thụ động
                            </h2>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                {filteredPodcastQs.length} câu hỏi hiển thị • {selectedTopicObj?.name}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto py-6">
                    <PodcastMode
                        key={podcastRound}
                        vocabList={filteredPodcastQs.map(q => ({
                            id: q.id,
                            word_kr: q.question_text,
                            word_vi: q.vietnamese_meaning,
                            type: 'COMMAND',
                            description_vi: null
                        }))}
                        onBack={handleExitActivePractice}
                        hideHeader={true}
                        onNextRound={selectedTopicObj?.id === 'tools' ? handleStartPodcast : undefined}
                    />
                </div>
            </div>
        )
    }

    if (step === 'tool_drop_game') {
        return (
            <div className="w-full pt-2">
                <ToolDropGame
                    questions={questions}
                    onBack={() => {
                        if (allQuestions.length > 0) setQuestions(allQuestions)
                        setStep('select_mode')
                    }}
                    onFinish={handleFinishPractice}
                />
            </div>
        )
    }

    if (step === 'practice') {
        return (
            <div className="w-full pt-2">
                {selectedTopicObj?.mode === 'tools' && selectedListenMode === 'ai_mock' ? (
                    <ToolDragPracticeScreen
                        questions={questions}
                        onFinish={handleFinishPractice}
                        onBack={handleExitActivePractice}
                    />
                ) : (
                    <InterviewPracticeScreen
                        questions={questions}
                        mode={selectedListenMode}
                        onFinish={handleFinishPractice}
                        onBack={handleExitActivePractice}
                        initialAutoPlay={initialAutoPlay}
                    />
                )}
            </div>
        )
    }

    if (step === 'evaluating') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-10 text-center space-y-8 shadow-2xl border-none bg-white/90 backdrop-blur-xl relative overflow-hidden rounded-[2.5rem]">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500"></div>
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                    
                    <div className="w-28 h-28 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mx-auto relative shadow-inner">
                        <Bot className="w-14 h-14 text-blue-600 animate-bounce relative z-10" />
                        <div className="absolute inset-0 border-[5px] border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-[3px] border-indigo-100 border-b-indigo-400 rounded-full animate-[spin_1.5s_reverse_infinite]"></div>
                    </div>
                    
                    <div className="space-y-3 relative z-10">
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">AI đang chấm điểm...</h2>
                        <p className="text-slate-500 text-sm leading-relaxed px-4">
                            Hệ thống đang phân tích ngữ âm và từ vựng trong câu trả lời của bạn. Vui lòng đợi trong giây lát.
                        </p>
                    </div>
                </Card>
            </div>
        )
    }

    if (step === 'finished') {
        if (selectedTopicObj?.mode === 'ai_mock' && evaluationResults.length > 0) {
            const totalScore = Math.round(evaluationResults.reduce((sum, r) => sum + (r.score || 0), 0) / evaluationResults.length)
            return (
                <div className="min-h-[80vh] p-4 md:p-8">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="text-center space-y-4">
                            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                                <div className="absolute inset-0 bg-indigo-50 rounded-full scale-105 border border-indigo-100/60 shadow-inner animate-pulse"></div>
                                <div className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center bg-white shadow-md border-[5px] ${
                                    totalScore >= 80 ? 'border-emerald-500' : totalScore >= 60 ? 'border-amber-500' : 'border-rose-500'
                                }`}>
                                    <span className="text-4xl font-black text-slate-800 leading-none">{totalScore}</span>
                                    <span className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Điểm</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                                    Kết quả đánh giá AI
                                </h2>
                                <p className="text-slate-500 text-sm font-semibold">
                                    Đã hoàn thành đánh giá chi tiết {evaluationResults.length} câu hỏi phỏng vấn
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            {evaluationResults.map((result, idx) => {
                                const showMetrics = result.pronunciation_score !== undefined;
                                return (
                                    <Card key={result.question_id} className="p-6 md:p-8 overflow-hidden relative shadow-md border border-slate-100 rounded-3xl bg-white hover:shadow-lg transition-shadow duration-300">
                                        <div className={`absolute top-0 left-0 w-2.5 h-full ${result.score >= 80 ? 'bg-emerald-500' : result.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                        <div className="pl-4 space-y-6">
                                            {/* Header row */}
                                            <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
                                                <div className="space-y-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                                        result.score >= 80 
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                            : result.score >= 60 
                                                                ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                                                    }`}>
                                                        {result.score >= 80 ? 'Hoàn hảo' : result.score >= 60 ? 'Đạt' : 'Cần cố gắng'}
                                                    </span>
                                                    <h4 className="font-extrabold text-slate-800 text-lg leading-snug">Câu {idx + 1}: {result.question?.question_text}</h4>
                                                    <p className="text-sm text-slate-500 font-medium">{result.question?.vietnamese_meaning}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Điểm số</span>
                                                    <div className={`px-4 py-2 rounded-2xl font-black text-lg ${
                                                        result.score >= 80 
                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                            : result.score >= 60 
                                                                ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                                                : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    }`}>
                                                        {result.score}/100
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Metrics breakdown (Phát âm, Ngữ pháp, Trôi chảy) */}
                                            {showMetrics && (
                                                <div className="grid grid-cols-3 gap-3 md:gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                                    <div className="space-y-1.5 text-center">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Phát âm</span>
                                                        <div className="relative pt-1 px-1">
                                                            <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-200">
                                                                <div style={{ width: `${result.pronunciation_score}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${result.pronunciation_score >= 80 ? 'bg-emerald-500' : result.pronunciation_score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                                                            </div>
                                                            <span className="text-[11px] font-bold text-slate-700 block mt-1">{result.pronunciation_score}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 text-center border-x border-slate-200/60 px-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ngữ pháp</span>
                                                        <div className="relative pt-1 px-1">
                                                            <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-200">
                                                                <div style={{ width: `${result.grammar_score}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${result.grammar_score >= 80 ? 'bg-emerald-500' : result.grammar_score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                                                            </div>
                                                            <span className="text-[11px] font-bold text-slate-700 block mt-1">{result.grammar_score}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 text-center">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Trôi chảy</span>
                                                        <div className="relative pt-1 px-1">
                                                            <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-200">
                                                                <div style={{ width: `${result.fluency_score}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${result.fluency_score >= 80 ? 'bg-emerald-500' : result.fluency_score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                                                            </div>
                                                            <span className="text-[11px] font-bold text-slate-700 block mt-1">{result.fluency_score}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Details layout */}
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Bạn đã trả lời:</span>
                                                        <p className="text-slate-800 font-bold text-base leading-relaxed select-all">{result.transcript || 'Không nghe thấy câu trả lời.'}</p>
                                                    </div>
                                                    {result.user_transcript_meaning && (
                                                        <div className="border-t border-slate-200/60 pt-2.5">
                                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-1 block">Ý nghĩa câu trả lời thực tế:</span>
                                                            <p className="text-slate-600 font-semibold text-xs leading-relaxed italic">{result.user_transcript_meaning}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`${result.score >= 80 ? 'bg-emerald-50/20 border-emerald-100/50' : result.score >= 60 ? 'bg-amber-50/20 border-amber-100/50' : 'bg-rose-50/20 border-rose-100/50'} p-5 rounded-2xl border flex flex-col`}>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider mb-2 block ${
                                                        result.score >= 80 ? 'text-emerald-700' : result.score >= 60 ? 'text-amber-700' : 'text-rose-700'
                                                    }`}>Nhận xét của AI:</span>
                                                    <p className="text-slate-700 text-sm font-medium leading-relaxed grow">{result.feedback_vi}</p>
                                                </div>
                                            </div>

                                            {/* Reference answer */}
                                            <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50 flex flex-col gap-1.5">
                                                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Gợi ý trả lời chuẩn:</span>
                                                <p className="text-indigo-900 font-bold text-sm select-all">{result.sample_answer}</p>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 pb-12">
                            <Button size="lg" className="h-14 px-10 text-lg rounded-2xl shadow-xl shadow-blue-200 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" onClick={() => {
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
            <div className="min-h-[80vh] max-w-5xl mx-auto p-4 md:p-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Left Column: Summary Card */}
                    <Card className="lg:col-span-1 p-8 text-center space-y-6 border-none shadow-xl bg-white/95 backdrop-blur-xl rounded-[2rem] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                        <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none"></div>

                        <div className="relative mx-auto w-20 h-20 mt-2">
                            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-75"></div>
                            <div className="relative w-full h-full bg-gradient-to-tr from-emerald-100 to-teal-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner border-[4px] border-white z-10">
                                <CheckCircle className="w-10 h-10 drop-shadow-sm" />
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Tuyệt vời!</h2>
                            <p className="text-slate-500 font-medium text-sm">Bạn đã hoàn thành phiên luyện tập.</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200/60 shadow-inner space-y-3">
                             <p className="font-bold text-slate-700 text-xs uppercase tracking-widest border-b border-slate-200 pb-2">Thống kê phiên học</p>
                             <div className="space-y-2">
                                 <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-100">
                                     <span className="text-slate-600 font-medium text-xs">Đã thuộc / Đúng:</span> 
                                     <strong className="text-emerald-600 text-base">{sessionStats.mastered} câu</strong>
                                 </div>
                                 <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-100">
                                     <span className="text-slate-600 font-medium text-xs">Chưa thuộc / Sai:</span> 
                                     <strong className="text-rose-500 text-base">{sessionStats.total - sessionStats.mastered} câu</strong>
                                 </div>
                             </div>
                        </div>
                        
                        <p className="text-slate-400 text-[10px] leading-relaxed px-2 font-medium">
                            * Những câu chưa thuộc sẽ được ưu tiên nhắc lại vào những lần luyện tập sau.
                        </p>
                        
                        <div className="flex flex-col gap-2 pt-2">
                            <Button 
                                variant="outline"
                                className="w-full h-11 text-xs font-bold rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 transition-all duration-300 shadow-sm" 
                                onClick={() => {
                                    setSessionStats({ mastered: 0, total: 0 })
                                    setSessionMasteredIds([])
                                    if (selectedTopicObj?.id === 'math') {
                                        setStep('math_practice')
                                    } else {
                                        setStep('practice')
                                    }
                                }}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" /> Luyện tập lại
                            </Button>
                            <Button 
                                className="w-full h-11 text-xs font-bold rounded-xl shadow-md shadow-blue-200 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" 
                                onClick={() => {
                                    setSessionStats({ mastered: 0, total: 0 })
                                    setSessionMasteredIds([])
                                    if (selectedTopicObj?.id === 'math') {
                                        loadQuestionsForDashboard(selectedTopicObj)
                                    } else {
                                        startPractice(selectedTopicObj, selectedListenMode)
                                    }
                                }}
                            >
                                Luyện tập câu mới <CheckCircle className="w-4 h-4 ml-2" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleReturnToTopicList} className="text-slate-500 hover:text-slate-700 text-xs">
                                ← Trở về danh sách chủ đề
                            </Button>
                        </div>
                    </Card>

                    {/* Right Column: Question List Review */}
                    <Card className="lg:col-span-2 p-6 md:p-8 space-y-6 border-none shadow-xl bg-white/95 backdrop-blur-xl rounded-[2rem] h-[600px] flex flex-col">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 shrink-0">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-lg">Chi tiết kết quả câu hỏi</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Xem lại các câu trả lời đúng và sai trong lượt học vừa qua</p>
                            </div>
                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                                {questions.length} câu hỏi
                            </span>
                        </div>

                        {/* List container */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                            {questions.map((q, idx) => {
                                const isCorrect = sessionMasteredIds.includes(q.id)
                                const ans = q.suggested_answers?.find((s: string) => !s.startsWith('__topic__:')) || ''
                                
                                return (
                                    <div 
                                        key={q.id}
                                        className={`p-4 rounded-2xl border transition-all ${
                                            isCorrect 
                                                ? 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/50' 
                                                : 'bg-rose-50/30 border-rose-100 hover:bg-rose-50/50'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-400">Câu {idx + 1}:</span>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                    }`}>
                                                        {isCorrect ? '✓ ĐÚNG' : '✗ SAI'}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-slate-850 text-sm leading-relaxed">{q.question_text}</h4>
                                                <p className="text-slate-500 text-xs font-medium">{q.vietnamese_meaning}</p>
                                                
                                                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                                                    <span className="text-slate-400 font-medium">Đáp án đầy đủ:</span>
                                                    <span className="text-slate-700 font-extrabold">{ans}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>

                </div>
            </div>
        )
    }

    const selectedPracticeGroup = selectedTopicObj?.id === 'communication'
        ? GIAO_TIEP_GROUPS.find(group => group.id === selectedCommunicationGroup)
        : selectedTopicObj?.id === 'situation'
            ? { id: 'all', label: 'Toàn bộ tình huống', emoji: '🤖' }
            : undefined

    return (
        <div className="relative flex w-full flex-col">
            <div className={`relative w-full flex-1 ${step === 'self_introduction' ? 'space-y-0' : 'space-y-6 md:space-y-8'}`}>
                <div className={step === 'mock_intro' || step === 'mock_exam' ? 'hidden' : step === 'self_introduction' ? 'absolute left-6 top-6 z-30 md:left-11 md:top-11' : step === 'select_mode' ? 'absolute left-4 top-4 z-30 md:static md:mb-2 md:flex md:items-center' : 'mb-2 flex items-center gap-3 md:gap-4'}>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleGoBack} 
                        className={`rounded-full h-10 w-10 md:h-12 md:w-12 shrink-0 shadow-sm border ${step === 'self_introduction' ? 'border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white backdrop-blur' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </Button>
                </div>

                {step === 'loading_topic' && (
                    <div
                        aria-live="polite"
                        className="flex min-h-[52vh] flex-col items-center justify-center px-4 text-center"
                    >
                        <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <RefreshCw
                                aria-hidden="true"
                                className="size-7 animate-spin motion-reduce:animate-none"
                            />
                        </div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">
                            Phỏng vấn vòng 2
                        </p>
                        <h2 className="mt-2 text-balance text-2xl font-black text-slate-900">
                            Đang mở {selectedTopicObj?.name ?? TOPICS.find((topic) => topic.id === initialTopicId)?.name ?? 'bài học'}…
                        </h2>
                        <p className="mt-2 max-w-md text-sm text-slate-500">
                            Hệ thống đang chuẩn bị nội dung phù hợp với ngành {selectedIndustry}.
                        </p>
                    </div>
                )}

                {step === 'industry' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Ngành Nghề Dự Thi</h2>
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

                        {/* Banner Thi thử Vòng 2 */}
                        {initialMode !== 'practice' && (
                            <div
                                onClick={() => setStep('mock_intro')}
                                className="group cursor-pointer rounded-3xl p-6 md:p-8 border-2 border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 text-white shadow-md hover:shadow-2xl hover:shadow-indigo-300/40 transition-all duration-300 transform hover:-translate-y-1.5 relative overflow-hidden flex flex-col md:flex-row items-center gap-6"
                            >
                                <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-12 translate-y-12 pointer-events-none">
                                    <Award className="w-80 h-80 text-white animate-[spin_60s_linear_infinite]" />
                                </div>
                                <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform duration-300 shadow-lg">
                                    <Award className="w-10 h-10 text-yellow-400" />
                                </div>
                                <div className="flex-1 space-y-2 text-center md:text-left relative z-10">
                                    <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                        <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">Thi Thử Phỏng Vấn Tổng Hợp (50 Điểm)</h3>
                                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-slate-950 rounded-full shadow-md animate-pulse">
                                            Chuẩn kỳ thi thực tế ⚡
                                        </span>
                                    </div>
                                    <p className="text-sm md:text-base text-slate-200 leading-relaxed font-medium">
                                        Bao gồm đầy đủ 6 phần thi chính thức: Giao tiếp, Mệnh lệnh, Dụng cụ, Thao tác thực tế, NCS Năng lực nghề nghiệp, Biển báo & Hỏi sâu an toàn.
                                    </p>
                                </div>
                                <div className="shrink-0 relative z-10">
                                    <Button className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black px-6 py-4 rounded-xl shadow-lg transition-transform group-hover:scale-105">
                                        Thi Ngay <ChevronRight className="w-5 h-5 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}

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
                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                <h3 className="text-xl md:text-2xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{topic.name}</h3>
                                                {topic.usesAI ? (
                                                    <span className="px-2 py-0.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white rounded-full shadow-sm animate-pulse shrink-0">
                                                        Có sử dụng AI
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white rounded-full shadow-sm shrink-0">
                                                        Không sử dụng AI
                                                    </span>
                                                )}
                                            </div>
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

                {step === 'self_introduction' && (
                    <SelfIntroductionPractice
                        onComplete={(practiceSeconds) => {
                            saveSelfIntroductionCompletion()
                            toast.success(`Đã ghi nhận một lượt giới thiệu bản thân ${practiceSeconds} giây`)
                        }}
                    />
                )}

                {step === 'command_dashboard' && (
                    <CommandProgressDashboard
                        questions={questions}
                        topicId={selectedTopicObj?.id || ''}
                        topicName={selectedTopicObj?.name || ''}
                        onStartPractice={(filtered) => {
                            setQuestions(filtered)
                            setStep('select_mode')
                        }}
                        onStartReview={handleStartReview}
                    />
                )}

                {step === 'select_mode' && (
                    <div className="animate-in space-y-3 pt-14 fade-in slide-in-from-bottom-4 duration-500 md:space-y-6 md:pt-0">
                        <div className="mb-4 space-y-1 text-center md:mb-8 md:space-y-2">
                            <h2 className="text-xl font-bold text-slate-800 md:text-3xl">Chọn chế độ</h2>
                            <p className="text-sm text-slate-500">Chủ đề: <strong className="text-blue-600">{selectedTopicObj?.name}</strong></p>
                            {selectedPracticeGroup && (
                                <div className="mx-auto mt-2 flex w-fit max-w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left shadow-sm md:mt-3 md:px-4">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm md:size-8 md:text-lg">
                                        {selectedPracticeGroup.emoji}
                                    </span>
                                    <div className="min-w-0">
                                        <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-600 md:text-[10px]">Nhóm đã chọn</span>
                                        <strong className="block truncate text-xs text-slate-800 md:text-sm">{selectedPracticeGroup.label}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                        {selectedTopicObj?.id === 'command' && (
                            <InterviewFreePreviewBanner kind="command" />
                        )}
                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-5">
                            
                            <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-1" onClick={() => startFlashcardPractice(false)}>
                                <div className="flex h-full items-center gap-3 rounded-2xl border-2 border-slate-200/60 bg-white p-3.5 shadow-sm transition-all duration-300 hover:border-blue-400 hover:shadow-xl md:block md:p-6">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-colors md:mb-4 md:size-12">
                                        <Presentation className="size-5 md:size-6" />
                                    </div>
                                    <div className="min-w-0"><h4 className="font-bold text-slate-900 md:mb-2 md:text-lg">Lật thẻ</h4>
                                    <p className="truncate text-xs text-slate-500 md:whitespace-normal md:text-sm md:leading-relaxed">Nghe tiếng Hàn và xem nghĩa.</p></div>
                                </div>
                            </div>

                            <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-1" onClick={() => handleStartListenMode('meaning_quiz')}>
                                <div className="flex h-full items-center gap-3 rounded-2xl border-2 border-slate-200/60 bg-white p-3.5 shadow-sm transition-all duration-300 hover:border-pink-400 hover:shadow-xl md:block md:p-6">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-pink-600 transition-colors md:mb-4 md:size-12">
                                        <CheckCircle className="size-5 md:size-6" />
                                    </div>
                                    <div className="min-w-0"><h4 className="font-bold text-slate-900 md:mb-2 md:text-lg">Trắc nghiệm</h4>
                                    <p className="truncate text-xs text-slate-500 md:whitespace-normal md:text-sm md:leading-relaxed">Nghe và chọn nghĩa đúng.</p></div>
                                </div>
                            </div>

                            <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-1" onClick={handleStartSpeedQuiz}>
                                <div className="flex h-full items-center gap-3 rounded-2xl border-2 border-slate-200/60 bg-gradient-to-br from-slate-800 to-indigo-900 p-3.5 shadow-sm transition-all duration-300 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-200 md:block md:p-6">
                                    <div className="flex shrink-0 items-center justify-between md:mb-4">
                                        <div className="flex size-10 items-center justify-center rounded-xl bg-yellow-400/20 text-yellow-400 transition-colors md:size-12">
                                            <Zap className="size-5 md:size-6" fill="currentColor" />
                                        </div>
                                        <span className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-lg md:static md:px-2.5 md:py-1 md:text-[10px]">
                                            Mới
                                        </span>
                                    </div>
                                    <div className="min-w-0 pr-8 md:pr-0"><h4 className="font-bold text-white md:mb-2 md:text-lg">Siêu tốc</h4>
                                    <p className="truncate text-xs text-slate-300 md:whitespace-normal md:text-sm md:leading-relaxed">Chọn nghĩa trong {selectedTopicObj?.id === 'tools' ? 10 : 8} giây.</p></div>
                                </div>
                            </div>

                            <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-1" onClick={handleStartPodcast}>
                                <div className="flex h-full items-center gap-3 rounded-2xl border-2 border-slate-200/60 bg-white p-3.5 shadow-sm transition-all duration-300 hover:border-violet-400 hover:shadow-xl md:block md:p-6">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition-colors md:mb-4 md:size-12">
                                        <Headphones className="size-5 md:size-6" />
                                    </div>
                                    <div className="min-w-0"><h4 className="font-bold text-slate-900 md:mb-2 md:text-lg">Nghe thụ động</h4>
                                    <p className="truncate text-xs text-slate-500 md:whitespace-normal md:text-sm md:leading-relaxed">Nghe liên tục để ghi nhớ.</p></div>
                                </div>
                            </div>
                            {selectedTopicObj?.id === 'tools' && (
                                <>
                                    <div className="group relative cursor-pointer transition-all duration-300 hover:-translate-y-1" onClick={handleStartToolDropGame}>
                                        <div className="flex h-full items-center gap-3 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-3.5 shadow-sm transition hover:border-orange-400 hover:shadow-xl md:block md:p-6">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-200 md:mb-4 md:size-12">
                                                <MousePointer2 className="size-5 md:size-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2"><h4 className="font-bold text-slate-900 md:mb-2 md:text-lg">Kéo thả dụng cụ</h4><span className="rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-black uppercase text-white">Game</span></div>
                                                <p className="truncate text-xs text-slate-500 md:whitespace-normal md:text-sm">Nghe yêu cầu, đưa đúng dụng cụ vào bàn.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="group relative cursor-pointer transition-all duration-300 hover:-translate-y-1" onClick={() => startPractice(selectedTopicObj, null, questions)}>
                                        <div className="flex h-full items-center gap-3 rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-slate-900 to-slate-800 p-3.5 shadow-lg transition hover:border-orange-400 hover:shadow-xl md:block md:p-6">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md md:mb-4 md:size-12">
                                                <Wrench className="size-5 md:size-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2"><h4 className="font-bold text-white md:mb-2 md:text-lg">Thực hành 3 bước</h4><span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase text-white">Nâng cao</span></div>
                                                <p className="truncate text-xs text-slate-300 md:whitespace-normal md:text-sm">Chọn dụng cụ, vị trí và thao tác đúng.</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                                    {((selectedTopicObj?.id === 'communication' && selectedCommunicationGroup === 'all') ||
                                      (selectedTopicObj?.id === 'situation' && selectedSituationGroup === 'all')) && (
                                        <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-1 md:col-span-2" onClick={() => startPractice(selectedTopicObj, null, questions)}>
                                            <div className="h-full rounded-2xl p-6 transition-all duration-300 border-2 border-emerald-300/60 bg-gradient-to-br from-emerald-800 to-indigo-900 hover:border-emerald-400 shadow-lg hover:shadow-xl hover:shadow-emerald-200 ring-2 ring-emerald-400/30">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-emerald-400/30 text-emerald-200 transition-colors ring-2 ring-emerald-300/50">
                                                        <Mic className="w-7 h-7" />
                                                    </div>
                                                    <span className="bg-gradient-to-r from-orange-500 to-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider animate-pulse">
                                                        Luyện Nói · AI Chấm
                                                    </span>
                                                </div>
                                                <h4 className="text-xl font-bold text-white mb-2.5">Ôn tổng hợp & Thi thử với AI 🎙️</h4>
                                                <p className="text-slate-200 text-sm leading-relaxed font-medium">Đóng vai hội thoại với Giám khảo AI · Thu âm câu trả lời · AI nhận xét và chấm điểm phát âm tự động.</p>
                                            </div>
                                        </div>
                                    )}
                        </div>
                        {loading && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl md:rounded-[2rem]">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-semibold text-blue-700">Đang chuẩn bị nội dung...</p>
                            </div>
                        )}
                    </div>
                )}

                {step === 'flashcard_options' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
                        <div className="text-center space-y-3">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Phương thức luyện tập</h2>
                            <p className="text-slate-500 font-medium">Bạn muốn luyện tập thẻ ghi nhớ theo cách nào?</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                            <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-2" onClick={() => startFlashcardPractice(false)}>
                                <div className="h-full rounded-[2rem] p-8 transition-all duration-300 border-2 border-slate-200/60 bg-white hover:border-blue-400 shadow-sm hover:shadow-2xl hover:shadow-blue-200/50 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-blue-50 text-blue-600 transition-colors group-hover:scale-110 duration-300">
                                        <MousePointer2 className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">Luyện từng câu</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-4">Bạn sẽ tự bấm chuyển sang câu tiếp theo sau khi đã suy nghĩ xong.</p>
                                    <div className="mt-auto pt-4 flex w-full justify-center">
                                        <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            Bắt đầu
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative group cursor-pointer transition-all duration-300 hover:-translate-y-2" onClick={() => startFlashcardPractice(true)}>
                                <div className="h-full rounded-[2rem] p-8 transition-all duration-300 border-2 border-slate-200/60 bg-white hover:border-indigo-400 shadow-sm hover:shadow-2xl hover:shadow-indigo-200/50 flex flex-col items-center text-center">
                                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-400 to-rose-400 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider animate-bounce">Rảnh tay</div>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-indigo-50 text-indigo-600 transition-colors group-hover:scale-110 duration-300">
                                        <Play className="w-8 h-8" fill="currentColor" />
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-700 transition-colors">Phát tự động danh sách</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-4">Hệ thống sẽ tự động đọc câu hỏi, chờ bạn suy nghĩ và chuyển câu liên tục.</p>
                                    <div className="mt-auto pt-4 flex w-full justify-center">
                                        <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            Bắt đầu ngay
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-center pt-4">
                            <Button variant="ghost" className="text-slate-500 hover:text-slate-700" onClick={() => setStep('select_mode')}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
                            </Button>
                        </div>

                        {loading && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-[2rem]">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-semibold text-blue-700">Đang chuẩn bị nội dung...</p>
                            </div>
                        )}
                    </div>
                )}

                {step === 'mock_intro' && (
                    <div className="mx-auto w-full max-w-4xl space-y-3 px-0 pb-4 animate-in fade-in duration-300 sm:space-y-5 sm:px-3 md:space-y-6">
                        <div className="mx-auto max-w-2xl space-y-1.5 text-center">
                            <div className="relative flex items-center justify-center">
                                <button aria-label="Quay lại" className="absolute left-0 flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900" onClick={handleGoBack} type="button">
                                    <ArrowLeft className="size-4.5" />
                                </button>
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1.5 text-[10px] font-black tracking-wide text-indigo-700 sm:px-3 sm:text-xs">
                                    <Award className="size-3.5 text-amber-500 sm:size-4" /> THI THỬ VÒNG 2
                                </div>
                            </div>
                            <h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                THI THỬ PHỎNG VẤN VÒNG 2 <span className="whitespace-nowrap text-indigo-700">· 50 điểm</span>
                            </h1>
                            <p className="mx-auto max-w-xl text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                                20 câu ngẫu nhiên · <strong className="whitespace-nowrap font-extrabold text-blue-700">{selectedIndustry}</strong>
                            </p>
                        </div>

                        <Card className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/60 sm:rounded-3xl sm:p-6">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

                            <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:mb-4 sm:gap-3 sm:pb-3">
                                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 sm:text-lg">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 sm:size-8 sm:rounded-xl">
                                        <FileText className="size-4" />
                                    </span>
                                    Cấu trúc điểm Vòng 2
                                </h2>
                                <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700 sm:px-3 sm:text-xs">
                                    20 câu
                                </span>
                            </div>

                            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                                {MOCK_EXAM_SECTIONS.map((section) => (
                                    <div
                                        key={section.label}
                                        className="flex min-h-10 items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-1.5 sm:min-h-14 sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-2.5"
                                    >
                                        <div className="flex min-w-0 items-baseline gap-1.5 sm:block">
                                            <p className="truncate text-xs font-bold leading-5 text-slate-700 sm:text-sm">{section.label}</p>
                                            <p className="shrink-0 text-[9px] font-medium text-slate-500 sm:text-[11px]">{section.detail}</p>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-800 shadow-sm ring-1 ring-slate-200 sm:px-2.5 sm:py-1 sm:text-xs">
                                            {section.points}đ
                                        </span>
                                    </div>
                                ))}
                                <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-white sm:col-span-2 sm:min-h-14 sm:rounded-2xl sm:px-4 sm:py-3">
                                    <div>
                                        <p className="text-sm font-black">Tổng điểm bài thi</p>
                                        <p className="text-[11px] text-indigo-100">Đạt từ 30 điểm</p>
                                    </div>
                                    <span className="text-xl font-black">50đ</span>
                                </div>
                            </div>

                            <div className="mt-4 hidden gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900 sm:flex">
                                <span aria-hidden="true" className="text-base">💡</span>
                                <p>
                                    Hãy cấp quyền micro để trả lời phần nói. Kết quả nhận diện được lưu riêng theo từng câu trước khi chuyển tiếp.
                                </p>
                            </div>

                            <Button
                                onClick={() => setStep('mock_exam')}
                                size="lg"
                                className="mt-3 h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-200 transition-transform hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 sm:mx-auto sm:mt-4 sm:flex sm:h-12 sm:w-auto sm:min-w-72 sm:rounded-2xl"
                            >
                                Bắt đầu bài thi thử
                                <ChevronRight className="ml-1 size-4" />
                            </Button>
                        </Card>
                    </div>
                )}

                {step === 'mock_exam' && (
                    <MockExamScreen
                        industry={selectedIndustry}
                        onBack={handleGoBack}
                    />
                )}
            </div>
        </div>
    )
}
