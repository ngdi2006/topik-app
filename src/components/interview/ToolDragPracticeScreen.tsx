'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, ArrowLeft, Volume2, CheckCircle2, AlertTriangle, Sparkles, HelpCircle, RotateCcw, Eye } from 'lucide-react'
import toolConfigMap from './tool_config_map.json'

interface ToolDragPracticeScreenProps {
    questions: any[]
    onFinish: (answers?: any, newlyMasteredIds?: string[]) => void
    onBack?: () => void
}

const ZONE_LABELS: Record<string, string> = {
    'shelf_top_left': 'Kệ trên (Trái)',
    'shelf_bottom_left': 'Kệ dưới (Trái)',
    'machine_panel': 'Bảng điều khiển / Máy móc',
    'work_area': 'Khu vực thi công',
    'toolbox_center': 'Hộp công cụ chung',
    'special_box': 'Hộp chuyên dụng',
    'shelf_top_right': 'Kệ trên (Phải)',
    'shelf_bottom_right': 'Kệ dưới (Phải)'
}

const TOOL_NAMES: Record<string, { ko: string; vi: string }> = {
    'allen_wrench': { ko: '육각 렌치', vi: 'Cờ lê lục giác' },
    'screwdriver': { ko: '드라이버', vi: 'Tua vít' },
    'hammer': { ko: '망치 / 장도리', vi: 'Búa nhổ đinh' },
    'pliers': { ko: '펜치 / 니퍼 / 플라이어', vi: 'Kìm mỏ nhọn / Kìm bấm' },
    'wrench': { ko: '스패너 / 멍키 스패너', vi: 'Cờ lê / Mỏ lết' },
    'saw': { ko: '쇠톱', vi: 'Cưa tay' },
    'welder': { ko: '용접기', vi: 'Máy hàn' },
    'ruler': { ko: '자 / 줄자', vi: 'Thước đo' }
}

const TARGET_NAMES: Record<string, string> = {
    'hex_bolt': 'Bu lông (Khu vực thi công)',
    'electric_wire': 'Dây dẫn (Khu vực thi công)',
    'gear': 'Bánh răng (Khu vực thi công)',
    'metal_pipe': 'Ống sắt (Khu vực thi công)',
    'switch_power': 'Cầu dao / Công tắc (Bảng điều khiển)',
    'emergency_button': 'Nút khẩn cấp (Bảng điều khiển)',
    'signal_light': 'Đèn báo (Bảng điều khiển)',
    'box': 'Hộp công cụ (Phía dưới)',
    'shelf': 'Ngăn kệ (Hai bên)'
}

const ACTION_NAMES: Record<string, string> = {
    'counter_clockwise': 'Tháo (Xoay ngược chiều kim đồng hồ)',
    'clockwise': 'Siết (Xoay cùng chiều kim đồng hồ)',
    'cut': 'Cắt đứt',
    'strip': 'Tước vỏ cách điện',
    'turn_on': 'Bật / Gạt lên',
    'turn_off': 'Tắt / Gạt xuống',
    'push': 'Đóng vào / Cất vào / Nhét vào',
    'pull': 'Nhổ ra / Lấy ra / Kéo ra / Kéo dài'
}

// Fallback config calculator with refined matching algorithms
function getFallbackToolConfig(ko: string, vi: string) {
    const koText = ko.toLowerCase()
    const viText = vi.toLowerCase()
    
    // 1. Tool Matching
    let correct_tool = 'screwdriver'
    if (koText.includes('육각 렌치') || koText.includes('육각렌치')) {
        correct_tool = 'allen_wrench'
    } else if (koText.includes('망치') || koText.includes('장도리') || koText.includes('못을') || koText.includes('못이') || koText.includes('박는')) {
        correct_tool = 'hammer'
    } else if (koText.includes('플라이어') || koText.includes('펜치') || koText.includes('니퍼') || koText.includes('롱노즈') || koText.includes('철사') || koText.includes('선재') || koText.includes('구리선') || koText.includes('철선') || koText.includes('전선') || koText.includes('부품') || koText.includes('레버') || koText.includes('스위치')) {
        correct_tool = 'pliers'
    } else if (koText.includes('스패너') || koText.includes('렌치') || koText.includes('몽키') || koText.includes('멍키') || koText.includes('토크') || koText.includes('볼트') || koText.includes('너트') || koText.includes('암나사') || koText.includes('수나사') || koText.includes('베어링') || koText.includes('기어') || koText.includes('코일')) {
        correct_tool = 'wrench'
    } else if (koText.includes('드라이버') || koText.includes('나사못') || koText.includes('나사')) {
        correct_tool = 'screwdriver'
    } else if (koText.includes('톱') || koText.includes('날물')) {
        correct_tool = 'saw'
    } else if (koText.includes('용접')) {
        correct_tool = 'welder'
    } else if (koText.includes('자') || koText.includes('줄자') || koText.includes('길이') || koText.includes('두께') || koText.includes('깊이') || koText.includes('선반 기계')) {
        correct_tool = 'ruler'
    }

    // 2. Target Object Matching
    let target_object = 'hex_bolt'
    if (koText.includes('전선') || koText.includes('철선') || koText.includes('철사') || koText.includes('선재') || koText.includes('구리선')) {
        target_object = 'electric_wire'
    } else if (koText.includes('조작반') || koText.includes('제어반') || koText.includes('스위치') || koText.includes('버튼') || koText.includes('레버') || koText.includes('신호등')) {
        target_object = 'switch_power'
    } else if (koText.includes('선반') || koText.includes('kệ') || koText.includes('위치에')) {
        target_object = 'shelf'
    } else if (koText.includes('상자') || koText.includes('함에') || koText.includes('상자에') || koText.includes('전용함') || koText.includes('공구함') || koText.includes('부품') || koText.includes('베어링') || koText.includes('기어') || koText.includes('코일 스프링') || koText.includes('날물')) {
        if (koText.includes('선반') || koText.includes('kệ') || koText.includes('위치에')) {
            target_object = 'shelf'
        } else {
            target_object = 'box'
        }
    }

    // 3. Action Matching
    let correct_action = 'clockwise'
    
    // Check pulling/removing actions
    if (koText.includes('푸는') || koText.includes('해체') || koText.includes('풀기') || koText.includes('빼') || koText.includes('뽑') || viText.includes('tháo') || viText.includes('nhổ') || viText.includes('lấy')) {
        if (target_object === 'switch_power') {
            correct_action = 'turn_off'
        } else if (target_object === 'electric_wire') {
            if (koText.includes('피복') || koText.includes('탈피')) {
                correct_action = 'strip'
            } else {
                correct_action = 'cut'
            }
        } else if (target_object === 'hex_bolt') {
            correct_action = 'counter_clockwise'
        } else {
            correct_action = 'pull'
        }
    } 
    // Check putting/inserting/tightening actions
    else if (koText.includes('조이') || koText.includes('체결') || koText.includes('박') || koText.includes('끼우') || koText.includes('넣') || koText.includes('장착') || viText.includes('siết') || viText.includes('đóng') || viText.includes('cất') || viText.includes('gắn') || viText.includes('lắp') || viText.includes('bỏ')) {
        if (target_object === 'switch_power') {
            correct_action = 'turn_on'
        } else if (target_object === 'electric_wire') {
            correct_action = 'cut'
        } else if (target_object === 'hex_bolt') {
            correct_action = 'clockwise'
        } else {
            correct_action = 'push'
        }
    }

    // Default adjust switches
    if (target_object === 'switch_power') {
        if (koText.includes('내리는') || koText.includes('끄는') || viText.includes('tắt') || viText.includes('hạ')) {
            correct_action = 'turn_off'
        } else {
            correct_action = 'turn_on'
        }
    }

    return {
        tools_on_desk: ["allen_wrench", "screwdriver", "hammer", "pliers", "wrench"],
        correct_tool,
        target_object,
        correct_action,
        vietnamese_instruction: vi
    }
}

// Visual tool SVGs
function SmallToolIcon({ type, className = "w-10 h-10" }: { type: string; className?: string }) {
    if (type === 'allen_wrench') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 12h32v8H24v32h-8V12z" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M20 16h24v2H20v14" fill="#94a3b8" />
            </svg>
        )
    }
    if (type === 'screwdriver') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="29" y="8" width="6" height="28" fill="#94a3b8" rx="1" />
                <path d="M26 8h12v2h-12z" fill="#cbd5e1" />
                <rect x="20" y="36" width="24" height="22" rx="4" fill="#f59e0b" />
                <rect x="25" y="36" width="3" height="22" fill="#1e293b" opacity="0.3" />
                <rect x="36" y="36" width="3" height="22" fill="#1e293b" opacity="0.3" />
            </svg>
        )
    }
    if (type === 'hammer') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="29" y="24" width="6" height="34" rx="1" fill="#b45309" />
                <path d="M16 14h28v8H16v-8z" fill="#475569" />
                <rect x="12" y="12" width="4" height="12" rx="1" fill="#94a3b8" />
                <path d="M44 14c3 1 6 5 8 9l-5-2-3-7z" fill="#475569" />
            </svg>
        )
    }
    if (type === 'pliers') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28 22c-2-6-3-12-1-16l5 12h-4z" fill="#94a3b8" />
                <path d="M36 22c2-6 3-12 1-16l-5 12h4z" fill="#94a3b8" />
                <circle cx="32" cy="22" r="4" fill="#475569" />
                <path d="M28 24c-2 6-8 22-8 32h6c2-8 4-18 4-22" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
                <path d="M36 24c2 6 8 22 8 32h-6c-2-8-4-18-4-22" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
            </svg>
        )
    }
    if (type === 'wrench') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="28" y="16" width="8" height="32" rx="2" fill="#cbd5e1" transform="rotate(-45 32 32)" />
                <circle cx="20" cy="20" r="9" fill="#cbd5e1" />
                <circle cx="20" cy="20" r="5" fill="#1e293b" />
                <rect x="17" y="11" width="6" height="10" fill="#1e293b" transform="rotate(-45 20 20)" />
                <circle cx="44" cy="44" r="9" fill="#cbd5e1" />
                <circle cx="44" cy="44" r="5" fill="#1e293b" />
                <rect x="41" y="35" width="6" height="10" fill="#1e293b" transform="rotate(-45 44 44)" />
            </svg>
        )
    }
    if (type === 'saw') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 20v24h8v-6l-8-12v-6z" fill="#ef4444" />
                <rect x="16" y="24" width="36" height="4" fill="#cbd5e1" />
                <path d="M16 28l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2" fill="none" stroke="#475569" strokeWidth="2.5" />
            </svg>
        )
    }
    if (type === 'welder') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="12" y="18" width="40" height="32" rx="4" fill="#0284c7" />
                <circle cx="20" cy="26" r="2.5" fill="#22c55e" />
                <rect x="36" y="24" width="10" height="20" fill="#0f172a" />
                <path d="M22 18v-4h20v4" stroke="#cbd5e1" strokeWidth="2.5" />
            </svg>
        )
    }
    if (type === 'ruler') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="24" width="48" height="16" rx="2" fill="#eab308" stroke="#ca8a04" strokeWidth="2" />
                <line x1="16" y1="24" x2="16" y2="30" stroke="#1e293b" strokeWidth="2" />
                <line x1="24" y1="24" x2="24" y2="30" stroke="#1e293b" strokeWidth="2" />
                <line x1="32" y1="24" x2="32" y2="30" stroke="#1e293b" strokeWidth="2" />
                <line x1="40" y1="24" x2="40" y2="30" stroke="#1e293b" strokeWidth="2" />
                <line x1="48" y1="24" x2="48" y2="30" stroke="#1e293b" strokeWidth="2" />
            </svg>
        )
    }
    return <HelpCircle className={className} />
}

export function ToolDragPracticeScreen({ questions, onFinish, onBack }: ToolDragPracticeScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const currentQ = questions[currentIndex]

    const config = currentQ
        ? ((toolConfigMap as Record<string, any>)[currentQ.question_text] || 
           currentQ.tool_config || 
           getFallbackToolConfig(currentQ.question_text, currentQ.vietnamese_meaning))
        : null

    // Audio & Speed States
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [audioState, setAudioState] = useState<'idle' | 'playing' | 'ended' | 'error'>('idle')
    const [speed, setSpeed] = useState<number>(1.0)

    // Timer States
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Game 3-Step Selection States
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [heldTool, setHeldTool] = useState<string | null>(null)
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
    const [selectedAction, setSelectedAction] = useState<string | null>(null)

    // Dynamic randomized tools list on desk
    const [currentToolsOnDesk, setCurrentToolsOnDesk] = useState<string[]>([])

    // Feedback States
    const [isShake, setIsShake] = useState(false)
    const [feedbackState, setFeedbackState] = useState<'idle' | 'success' | 'fail'>('idle')
    const [wrongStep, setWrongStep] = useState<number | null>(null)
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)

    const masteredIdsRef = useRef<Set<string>>(new Set())
    const failedIdsRef = useRef<Set<string>>(new Set())

    // Dynamically randomize the 5 workbench tools per question index
    useEffect(() => {
        if (!config) return
        
        const ALL_SYSTEM_TOOLS = ['allen_wrench', 'screwdriver', 'hammer', 'pliers', 'wrench', 'saw', 'welder', 'ruler']
        const correct = config.correct_tool || 'screwdriver'
        
        const remaining = ALL_SYSTEM_TOOLS.filter(t => t !== correct)
        const shuffled = [...remaining].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, 4)
        
        const finalDeskTools = [correct, ...selected].sort(() => Math.random() - 0.5)
        setCurrentToolsOnDesk(finalDeskTools)
    }, [currentIndex, currentQ])

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed
        }
    }, [speed])

    useEffect(() => {
        if (!currentQ) return

        setAudioState('idle')
        setTimeLeft(null)
        setStep(1)
        setHeldTool(null)
        setSelectedTarget(null)
        setSelectedAction(null)
        setFeedbackState('idle')
        setWrongStep(null)
        setShowCorrectAnswer(false)
        setIsShake(false)
        
        if (timerRef.current) clearInterval(timerRef.current)

        if (currentQ.question_audio_url && audioRef.current) {
            audioRef.current.src = currentQ.question_audio_url
            audioRef.current.playbackRate = speed
            audioRef.current.play().catch(err => {
                if (err.name !== 'AbortError') {
                    console.warn("Audio error:", err)
                    setAudioState('error')
                }
            })
        } else if (currentQ.question_text && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(currentQ.question_text)
            utterance.lang = 'ko-KR'
            utterance.rate = speed * 0.95
            
            utterance.onstart = () => setAudioState('playing')
            utterance.onend = () => handleAudioEnded()
            utterance.onerror = () => handleAudioEnded()
            
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(utterance)
        } else {
            handleAudioEnded()
        }

        return () => {
            if (audioRef.current) audioRef.current.pause()
            if ('speechSynthesis' in window) window.speechSynthesis.cancel()
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [currentIndex, currentQ])

    const handleAudioEnded = () => {
        setAudioState('ended')
        const countdownSeconds = currentQ.countdown_after_audio || 15
        setTimeLeft(countdownSeconds)

        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    const replayAudio = () => {
        if (currentQ.question_audio_url && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.playbackRate = speed
            audioRef.current.play().catch(err => {
                if (err.name !== 'AbortError') {
                    console.warn("Audio replay error:", err)
                }
            })
        } else if (currentQ.question_text && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(currentQ.question_text)
            utterance.lang = 'ko-KR'
            utterance.rate = speed * 0.95
            utterance.onstart = () => setAudioState('playing')
            utterance.onend = () => setAudioState('ended')
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(utterance)
        }
    }

    // Step 1: Select tool (allowing changing selection during Step 2 as well)
    const selectTool = (tool: string) => {
        if (audioState !== 'ended' || timeLeft === 0 || feedbackState === 'success') return
        setHeldTool(tool)
        if (step === 1) {
            setStep(2)
        }
    }

    // Step 2: Select target object
    const selectTarget = (target: string) => {
        if (step !== 2 || feedbackState === 'success') return
        setSelectedTarget(target)
        setStep(3)
    }

    // Step 3: Choose action and evaluate
    const executeAction = (action: string) => {
        if (step !== 3 || !config || feedbackState === 'success') return
        setSelectedAction(action)
        
        const isToolCorrect = heldTool === config.correct_tool
        const isTargetCorrect = selectedTarget === config.target_object
        const isActionCorrect = action === config.correct_action

        if (isToolCorrect && isTargetCorrect && isActionCorrect) {
            setFeedbackState('success')
            if (!failedIdsRef.current.has(currentQ.id)) {
                masteredIdsRef.current.add(currentQ.id)
            }
            if (timerRef.current) clearInterval(timerRef.current)
        } else {
            if (!isToolCorrect) setWrongStep(1)
            else if (!isTargetCorrect) setWrongStep(2)
            else setWrongStep(3)
            
            setFeedbackState('fail')
            failedIdsRef.current.add(currentQ.id)
            setIsShake(true)
            setTimeout(() => setIsShake(false), 500)
        }
    }

    const resetSteps = () => {
        setStep(1)
        setHeldTool(null)
        setSelectedTarget(null)
        setSelectedAction(null)
        setFeedbackState('idle')
        setWrongStep(null)
        setShowCorrectAnswer(false)
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            onFinish(undefined, Array.from(masteredIdsRef.current))
        }
    }

    if (!currentQ || !config) return null

    // Determine target classifications
    const isWorkbenchActive = config.target_object === 'hex_bolt' || config.target_object === 'electric_wire' || config.target_object === 'gear' || config.target_object === 'metal_pipe'
    const isPanelActive = config.target_object === 'switch_power' || config.target_object === 'emergency_button' || config.target_object === 'signal_light'
    const isShelvesActive = config.target_object === 'shelf'
    const isBoxesActive = config.target_object === 'box'

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-4 select-none touch-none bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] pointer-events-none" />

            <audio ref={audioRef} onPlay={() => setAudioState('playing')} onEnded={handleAudioEnded} onError={() => setAudioState('error')} className="hidden" />

            {/* Header Controls Dashboard */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 shadow-md gap-4 z-10 relative">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0 border border-slate-800 hover:bg-slate-800 text-slate-300">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap shadow-sm shadow-orange-500/10">
                            Thực hành Vòng 2
                        </span>
                        <div className="h-4 w-px bg-slate-800 hidden sm:block" />
                        <span className="text-slate-400 text-xs font-medium hidden sm:inline">Mô phỏng sử dụng công cụ</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
                        {([0.8, 1.0, 1.2] as const).map(rate => (
                            <button
                                key={rate}
                                onClick={() => setSpeed(rate)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    speed === rate 
                                        ? 'bg-orange-500 text-slate-950 shadow-md' 
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                {rate === 1.0 ? 'Chuẩn' : `${rate}x`}
                            </button>
                        ))}
                    </div>

                    <Button variant="outline" size="sm" onClick={replayAudio} className="border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800 text-xs font-semibold px-3 py-1">
                        <Play className="w-3.5 h-3.5 mr-1 text-orange-500 fill-orange-500" /> Nghe lại
                    </Button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-52 shrink-0">
                    <div className="text-xs font-mono font-bold text-slate-400 whitespace-nowrap">
                        {currentIndex + 1} / {questions.length}
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden shadow-inner border border-slate-800">
                        <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${Math.max(5, ((currentIndex + 1) / questions.length) * 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Workbench Simulator */}
            <div className={`bg-slate-900/40 rounded-2xl border border-slate-900/80 p-4 relative overflow-hidden min-h-[580px] flex flex-col items-center justify-between transition-transform duration-100 ${isShake ? 'animate-shake' : ''}`}>
                
                <div className="w-full flex flex-col items-center gap-2 z-10 mb-2">
                    {timeLeft !== null && timeLeft > 0 && feedbackState === 'idle' && (
                        <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-slate-900 border border-slate-850 shadow-lg animate-pulse">
                            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Khẩu lệnh kết thúc - Đang thao tác:</span>
                            <div className="font-mono text-xl font-black text-cyan-400 flex items-center">
                                {timeLeft}<span className="text-xs ml-0.5 text-cyan-600">s</span>
                            </div>
                        </div>
                    )}
                    {audioState === 'playing' && (
                        <div className="flex items-center gap-2 text-cyan-400 bg-cyan-950/20 px-4 py-2 rounded-full border border-cyan-800/30 text-sm animate-pulse">
                            <Volume2 className="w-4 h-4 text-cyan-400" />
                            <span>Hãy nghe kỹ khẩu lệnh của giám khảo trước khi chọn dụng cụ!</span>
                        </div>
                    )}

                    {audioState === 'ended' && feedbackState === 'idle' && (
                        <div className="text-sm font-bold text-center mt-1">
                            {step === 1 && <span className="text-amber-400">BƯỚC 1: Hãy bấm chọn 1 dụng cụ trên "BÀN LÀM VIỆC"</span>}
                            {step === 2 && <span className="text-cyan-400">BƯỚC 2: Click vào vật thể tác động thích hợp ở trung tâm</span>}
                            {step === 3 && <span className="text-purple-400 font-extrabold animate-pulse">BƯỚC 3: Chọn hướng thao tác / Hành động tương ứng</span>}
                        </div>
                    )}
                </div>

                {/* Main simulation grid */}
                <div className="relative w-full max-w-4xl h-[380px] bg-slate-950 rounded-3xl border-4 border-slate-900 mx-auto overflow-hidden shadow-2xl flex backdrop-blur-lg">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.08)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                    {/* Left Shelves Column (Fades out when inactive) */}
                    <div className={`w-20 md:w-36 shrink-0 h-full flex flex-col border-r-4 border-slate-900 bg-slate-900/10 relative transition-all duration-300 ${
                        !isShelvesActive ? 'opacity-20 pointer-events-none filter blur-[0.5px]' : ''
                    }`}>
                        <div className="absolute inset-y-0 left-2 w-1 bg-slate-800/40" />
                        <div className="absolute inset-y-0 right-2 w-1 bg-slate-800/40" />

                        {/* Top Shelf Left */}
                        <button 
                            disabled={step !== 2 || !isShelvesActive || feedbackState === 'success'}
                            onClick={() => selectTarget('shelf')}
                            className={`flex-1 border-b-4 border-slate-900 flex flex-col items-center justify-center p-2 relative transition-all duration-300 outline-none ${
                                step === 2 && isShelvesActive ? 'hover:bg-cyan-500/10 active:bg-cyan-500/20' : ''
                            } ${showCorrectAnswer && config.target_object === 'shelf' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                        >
                            <span className="text-slate-400 font-bold text-center text-[9px] md:text-xs tracking-wider uppercase bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-850">Kệ trên (Trái)</span>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-500 shadow" />
                        </button>

                        {/* Bottom Shelf Left */}
                        <button 
                            disabled={step !== 2 || !isShelvesActive || feedbackState === 'success'}
                            onClick={() => selectTarget('shelf')}
                            className={`flex-1 flex flex-col items-center justify-center p-2 relative transition-all duration-300 outline-none ${
                                step === 2 && isShelvesActive ? 'hover:bg-cyan-500/10 active:bg-cyan-500/20' : ''
                            } ${showCorrectAnswer && config.target_object === 'shelf' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                        >
                            <span className="text-slate-400 font-bold text-center text-[9px] md:text-xs tracking-wider uppercase bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-850">Kệ dưới (Trái)</span>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-500 shadow" />
                        </button>
                    </div>

                    {/* Central Interactive Workfloor */}
                    <div className="flex-1 h-full flex flex-col p-4 gap-4 relative min-w-0">
                        
                        {/* Control Panel with 3 items */}
                        <div className={`h-[115px] border-2 border-slate-850 bg-slate-900/20 rounded-2xl flex flex-col items-center justify-between p-2.5 relative transition-all duration-300 ${
                            !isPanelActive ? 'opacity-20 pointer-events-none filter blur-[0.5px]' : ''
                        } ${
                            showCorrectAnswer && isPanelActive ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-emerald-950/10' : ''
                        }`}>
                            <span className="text-slate-400 font-bold text-[9px] md:text-xs tracking-widest uppercase bg-slate-950/95 px-2 py-0.5 rounded border border-slate-850">Bảng điều khiển máy móc</span>
                            
                            <div className="flex justify-around items-center w-full flex-1 mt-1">
                                {/* Toggle switch target */}
                                <button
                                    disabled={step !== 2 || !isPanelActive || feedbackState === 'success'}
                                    onClick={() => selectTarget('switch_power')}
                                    className={`p-2 rounded-xl border-2 transition-all relative flex flex-col items-center justify-center bg-slate-950 outline-none ${
                                        step === 2 && isPanelActive
                                            ? 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer animate-pulse' 
                                            : 'border-slate-800'
                                    } ${selectedTarget === 'switch_power' ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''}`}
                                >
                                    <div className="w-5 h-7 bg-slate-800 rounded-md border border-slate-700 p-0.5 flex flex-col justify-between items-center relative">
                                        <div className={`w-3.5 h-3.5 rounded bg-orange-500 shadow-inner transition-transform ${
                                            selectedAction === 'turn_on' ? 'translate-y-0 bg-emerald-500' : 'translate-y-2 bg-rose-500'
                                        }`} />
                                    </div>
                                    <span className="text-[7px] md:text-[9px] text-slate-400 font-extrabold uppercase mt-1">Cầu dao / Công tắc</span>
                                </button>

                                {/* Emergency Button target */}
                                <button
                                    disabled={step !== 2 || !isPanelActive || feedbackState === 'success'}
                                    onClick={() => selectTarget('emergency_button')}
                                    className={`p-2 rounded-xl border-2 transition-all relative flex flex-col items-center justify-center bg-slate-950 outline-none ${
                                        step === 2 && isPanelActive
                                            ? 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer' 
                                            : 'border-slate-800'
                                    } ${selectedTarget === 'emergency_button' ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''}`}
                                >
                                    <svg className="w-7 h-7" viewBox="0 0 64 64" fill="none">
                                        <rect x="12" y="12" width="40" height="40" rx="6" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
                                        <circle cx="32" cy="32" r="12" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
                                    </svg>
                                    <span className="text-[7px] md:text-[9px] text-slate-400 font-extrabold uppercase mt-1">Nút khẩn cấp</span>
                                </button>

                                {/* Signal Light target */}
                                <button
                                    disabled={step !== 2 || !isPanelActive || feedbackState === 'success'}
                                    onClick={() => selectTarget('signal_light')}
                                    className={`p-2 rounded-xl border-2 transition-all relative flex flex-col items-center justify-center bg-slate-950 outline-none ${
                                        step === 2 && isPanelActive
                                            ? 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer' 
                                            : 'border-slate-800'
                                    } ${selectedTarget === 'signal_light' ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''}`}
                                >
                                    <svg className="w-7 h-7" viewBox="0 0 64 64" fill="none">
                                        <rect x="18" y="12" width="28" height="40" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                                        <circle cx="32" cy="22" r="6" fill="#ef4444" />
                                        <circle cx="32" cy="42" r="6" fill="#22c55e" />
                                    </svg>
                                    <span className="text-[7px] md:text-[9px] text-slate-400 font-extrabold uppercase mt-1">Đèn báo</span>
                                </button>
                            </div>
                        </div>

                        {/* Heavy Workbench with 4 items */}
                        <div className={`flex-1 border-2 border-slate-850 bg-slate-900/10 rounded-2xl flex flex-col items-center justify-between p-3 relative transition-all duration-300 ${
                            !isWorkbenchActive ? 'opacity-20 pointer-events-none filter blur-[0.5px]' : ''
                        } ${
                            showCorrectAnswer && isWorkbenchActive ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-emerald-950/10' : ''
                        }`}>
                            <span className="text-slate-400 font-bold text-[9px] md:text-xs tracking-wider uppercase bg-slate-950/95 px-2 py-0.5 rounded border border-slate-850">Khu vực thi công / Bàn làm việc</span>

                            <div className="flex justify-around items-center w-full flex-1 mt-1 gap-2">
                                {/* Hex Bolt target */}
                                <button
                                    disabled={step !== 2 || !isWorkbenchActive || feedbackState === 'success'}
                                    onClick={() => selectTarget('hex_bolt')}
                                    className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-slate-950 outline-none ${
                                        step === 2 && isWorkbenchActive
                                            ? 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer' 
                                            : 'border-slate-800'
                                    } ${selectedTarget === 'hex_bolt' ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''}`}
                                >
                                    <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
                                        <polygon points="32,8 52,20 52,44 32,56 12,44 12,20" fill="#cbd5e1" stroke="#475569" strokeWidth="3" />
                                        <circle cx="32" cy="32" r="10" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
                                    </svg>
                                    <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase mt-1">Bu lông</span>
                                </button>

                                {/* Electric Wire target */}
                                <button
                                    disabled={step !== 2 || !isWorkbenchActive || feedbackState === 'success'}
                                    onClick={() => selectTarget('electric_wire')}
                                    className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-slate-950 outline-none ${
                                        step === 2 && isWorkbenchActive
                                            ? 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer' 
                                            : 'border-slate-800'
                                    } ${selectedTarget === 'electric_wire' ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''}`}
                                >
                                    <svg className="w-10 h-5" viewBox="0 0 80 40" fill="none">
                                        <rect x="5" y="14" width="70" height="12" rx="6" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
                                    </svg>
                                    <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase mt-1">Dây dẫn</span>
                                </button>

                                {/* Gear target */}
                                <button
                                    disabled={step !== 2 || !isWorkbenchActive || feedbackState === 'success'}
                                    onClick={() => selectTarget('gear')}
                                    className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-slate-950 outline-none ${
                                        step === 2 && isWorkbenchActive
                                            ? 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer' 
                                            : 'border-slate-800'
                                    } ${selectedTarget === 'gear' ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''}`}
                                >
                                    <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
                                        <circle cx="32" cy="32" r="14" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
                                        <circle cx="32" cy="32" r="6" fill="#1e293b" />
                                    </svg>
                                    <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase mt-1">Bánh răng</span>
                                </button>

                                {/* Metal Pipe target */}
                                <button
                                    disabled={step !== 2 || !isWorkbenchActive || feedbackState === 'success'}
                                    onClick={() => selectTarget('metal_pipe')}
                                    className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-slate-950 outline-none ${
                                        step === 2 && isWorkbenchActive
                                            ? 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer' 
                                            : 'border-slate-800'
                                    } ${selectedTarget === 'metal_pipe' ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''}`}
                                >
                                    <svg className="w-10 h-5" viewBox="0 0 80 40" fill="none">
                                        <rect x="5" y="14" width="70" height="12" rx="2" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
                                    </svg>
                                    <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase mt-1">Ống sắt</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Shelves Column (Fades out when inactive) */}
                    <div className={`w-20 md:w-36 shrink-0 h-full flex flex-col border-l-4 border-slate-900 bg-slate-900/10 relative transition-all duration-300 ${
                        !isShelvesActive ? 'opacity-20 pointer-events-none filter blur-[0.5px]' : ''
                    }`}>
                        <div className="absolute inset-y-0 left-2 w-1 bg-slate-800/40" />
                        <div className="absolute inset-y-0 right-2 w-1 bg-slate-800/40" />

                        {/* Top Shelf Right */}
                        <button 
                            disabled={step !== 2 || !isShelvesActive || feedbackState === 'success'}
                            onClick={() => selectTarget('shelf')}
                            className={`flex-1 border-b-4 border-slate-900 flex flex-col items-center justify-center p-2 relative transition-all duration-300 outline-none ${
                                step === 2 && isShelvesActive ? 'hover:bg-cyan-500/10 active:bg-cyan-500/20' : ''
                            } ${showCorrectAnswer && config.target_object === 'shelf' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                        >
                            <span className="text-slate-400 font-bold text-center text-[9px] md:text-xs tracking-wider uppercase bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-850">Kệ trên (Phải)</span>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-500 shadow" />
                        </button>

                        {/* Bottom Shelf Right */}
                        <button 
                            disabled={step !== 2 || !isShelvesActive || feedbackState === 'success'}
                            onClick={() => selectTarget('shelf')}
                            className={`flex-1 flex flex-col items-center justify-center p-2 relative transition-all duration-300 outline-none ${
                                step === 2 && isShelvesActive ? 'hover:bg-cyan-500/10 active:bg-cyan-500/20' : ''
                            } ${showCorrectAnswer && config.target_object === 'shelf' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                        >
                            <span className="text-slate-400 font-bold text-center text-[9px] md:text-xs tracking-wider uppercase bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-850">Kệ dưới (Phải)</span>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-500 shadow" />
                        </button>
                    </div>

                    {/* Step 3 action modal popup overlay */}
                    {step === 3 && feedbackState === 'idle' && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
                                <div>
                                    <h5 className="text-slate-200 font-extrabold text-sm tracking-wider uppercase">Chọn hành động thao tác</h5>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {/* Action Choices - High-contrast white text */}
                                    {selectedTarget === 'hex_bolt' && (
                                        <>
                                            <Button type="button" onClick={() => executeAction('counter_clockwise')} className="py-5 bg-slate-950 border border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800 text-xs font-black tracking-wide">
                                                🔄 Xoay ngược chiều kim đồng hồ (Tháo)
                                            </Button>
                                            <Button type="button" onClick={() => executeAction('clockwise')} className="py-5 bg-slate-950 border border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800 text-xs font-black tracking-wide">
                                                🔄 Xoay cùng chiều kim đồng hồ (Siết)
                                            </Button>
                                        </>
                                    )}
                                    {selectedTarget === 'electric_wire' && (
                                        <>
                                            <Button type="button" onClick={() => executeAction('cut')} className="py-5 bg-slate-950 border border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800 text-xs font-black tracking-wide">
                                                ✂️ Cắt đứt
                                            </Button>
                                            <Button type="button" onClick={() => executeAction('strip')} className="py-5 bg-slate-950 border border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800 text-xs font-black tracking-wide">
                                                ⚡ Tước vỏ cách điện
                                            </Button>
                                            <Button type="button" onClick={() => executeAction('pull')} className="py-5 bg-slate-950 border border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800 text-xs font-black tracking-wide">
                                                📤 Kéo dài / Kéo ra / Nhổ ra
                                            </Button>
                                        </>
                                    )}
                                    {selectedTarget === 'switch_power' && (
                                        <>
                                            <Button type="button" onClick={() => executeAction('turn_on')} className="py-5 bg-slate-950 border border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800 text-xs font-black tracking-wide">
                                                ⬆️ Bật / Gạt lên
                                            </Button>
                                            <Button type="button" onClick={() => executeAction('turn_off')} className="py-5 bg-slate-950 border border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800 text-xs font-black tracking-wide">
                                                ⬇️ Tắt / Gạt xuống
                                            </Button>
                                        </>
                                    )}
                                    {(selectedTarget === 'shelf' || selectedTarget === 'box' || selectedTarget === 'gear' || selectedTarget === 'metal_pipe') && (
                                        <>
                                            <Button type="button" onClick={() => executeAction('push')} className="py-5 bg-slate-950 border border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800 text-xs font-black tracking-wide">
                                                📥 Đóng vào / Cất vào
                                            </Button>
                                            <Button type="button" onClick={() => executeAction('pull')} className="py-5 bg-slate-950 border border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800 text-xs font-black tracking-wide">
                                                📤 Nhổ ra / Lấy ra / Kéo ra
                                            </Button>
                                        </>
                                    )}
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-slate-200">
                                    Hủy / Quay lại Bước 2
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Handheld Selected Tool Indicator */}
                {heldTool && feedbackState === 'idle' && (
                    <div className="absolute top-20 right-6 flex items-center gap-2.5 bg-cyan-950/80 border border-cyan-800/40 px-3.5 py-2 rounded-xl shadow-lg animate-in slide-in-from-right duration-300">
                        <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase">Đang cầm:</span>
                        <div className="p-1.5 bg-slate-950 rounded-lg border border-cyan-800/30">
                            <SmallToolIcon type={heldTool} className="w-7 h-7" />
                        </div>
                    </div>
                )}

                {/* Boxes Row (Fades out when inactive) */}
                <div className={`w-full max-w-4xl grid grid-cols-2 gap-4 mt-2 transition-all duration-300 ${
                    !isBoxesActive ? 'opacity-20 pointer-events-none filter blur-[0.5px]' : ''
                }`}>
                    <button 
                        disabled={step !== 2 || !isBoxesActive || feedbackState === 'success'}
                        onClick={() => selectTarget('box')}
                        className={`py-3.5 rounded-2xl border-2 bg-slate-900/10 flex items-center justify-center outline-none transition-all ${
                            step === 2 && isBoxesActive ? 'border-cyan-800/30 hover:border-cyan-400 hover:bg-cyan-500/5' : 'border-slate-850'
                        } ${showCorrectAnswer && config.target_object === 'box' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                    >
                        <span className="text-[10px] md:text-xs text-slate-400 font-extrabold uppercase">Hộp công cụ chung</span>
                    </button>
                    <button 
                        disabled={step !== 2 || !isBoxesActive || feedbackState === 'success'}
                        onClick={() => selectTarget('box')}
                        className={`py-3.5 rounded-2xl border-2 bg-slate-900/10 flex items-center justify-center outline-none transition-all ${
                            step === 2 && isBoxesActive ? 'border-cyan-800/30 hover:border-cyan-400 hover:bg-cyan-500/5' : 'border-slate-850'
                        } ${showCorrectAnswer && config.target_object === 'box' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                    >
                        <span className="text-[10px] md:text-xs text-slate-400 font-extrabold uppercase">Hộp chuyên dụng</span>
                    </button>
                </div>

                {/* BÀN LÀM VIỆC Tool picker rack */}
                <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-850 p-4 rounded-2xl shadow-xl mt-4 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950 px-4 py-0.5 rounded-full border border-slate-850 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Bàn làm việc
                    </div>

                    <div className="grid grid-cols-5 gap-3 mt-1.5">
                        {currentToolsOnDesk.map((toolId: string) => {
                            const isSelected = heldTool === toolId
                            const isCorrect = config.correct_tool === toolId
                            return (
                                <button
                                    key={toolId}
                                    disabled={audioState !== 'ended' || timeLeft === 0 || feedbackState === 'success'}
                                    onClick={() => selectTool(toolId)}
                                    className={`p-5 bg-slate-950 rounded-xl border-2 flex flex-col items-center justify-center transition-all outline-none ${
                                        audioState !== 'ended' ? 'opacity-30 grayscale filter cursor-not-allowed' : 'hover:border-slate-700'
                                    } ${
                                        isSelected 
                                            ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] bg-orange-950/10' 
                                            : 'border-slate-850'
                                    } ${
                                        showCorrectAnswer && isCorrect 
                                            ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-950/10' 
                                            : ''
                                    }`}
                                >
                                    <SmallToolIcon type={toolId} className="w-12 h-12" />
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Diagnostics and overlays */}
                {feedbackState !== 'idle' && (
                    <div className="w-full max-w-4xl mt-5 z-20 animate-in fade-in slide-in-from-bottom-6 duration-500">
                        {feedbackState === 'success' ? (
                            <div className="bg-emerald-950/80 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-20">
                                    <Sparkles className="w-16 h-16 text-emerald-400" />
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-emerald-400 font-bold text-lg">정답입니다! (Chính xác)</h4>
                                        <p className="text-slate-200 font-bold text-base">{currentQ.question_text}</p>
                                        <p className="text-slate-400 text-sm italic">{currentQ.vietnamese_meaning}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-rose-950/85 backdrop-blur-md border-2 border-rose-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-20">
                                    <AlertTriangle className="w-16 h-16 text-rose-400" />
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                                        <AlertTriangle className="w-6 h-6 text-rose-400" />
                                    </div>
                                    <div className="space-y-2 w-full">
                                        <h4 className="text-rose-400 font-bold text-lg">틀렸습니다! (Sai rồi)</h4>
                                        <p className="text-slate-300 font-bold text-base">{currentQ.question_text}</p>
                                        <p className="text-slate-400 text-sm italic">{currentQ.vietnamese_meaning}</p>
                                        
                                        <div className="p-3 bg-slate-950/60 rounded-xl border border-rose-500/10 space-y-1 text-xs">
                                            <div className="font-bold text-slate-400 uppercase tracking-wide border-b border-slate-900 pb-1.5 mb-1.5">Kết quả từng bước:</div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400">Bước 1: Chọn dụng cụ</span>
                                                <span className={heldTool === config.correct_tool ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                    {heldTool === config.correct_tool ? "✓ Chính xác" : "✗ Sai"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400">Bước 2: Click vật thể tác động</span>
                                                <span className={selectedTarget === config.target_object ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                    {selectedTarget === config.target_object ? "✓ Chính xác" : "✗ Sai"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400">Bước 3: Chọn hướng/hành động</span>
                                                <span className={selectedAction === config.correct_action ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                    {selectedAction === config.correct_action ? "✓ Chính xác" : "✗ Sai"}
                                                </span>
                                            </div>

                                            {showCorrectAnswer && (
                                                <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1 animate-in fade-in duration-300 text-slate-200">
                                                    <div className="font-extrabold text-emerald-400 uppercase tracking-wider mb-1.5">Đáp án đúng của khẩu lệnh:</div>
                                                    <div>Bước 1: Chọn <span className="text-emerald-400 font-bold">{TOOL_NAMES[config.correct_tool]?.vi}</span></div>
                                                    <div>Bước 2: Click vào <span className="text-emerald-400 font-bold">{TARGET_NAMES[config.target_object] || config.target_object}</span></div>
                                                    <div>Bước 3: Thực hiện <span className="text-emerald-400 font-bold">{ACTION_NAMES[config.correct_action] || config.correct_action}</span></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-5 flex flex-col sm:flex-row justify-center items-center gap-3">
                            {feedbackState === 'fail' && (
                                <>
                                    <Button 
                                        type="button"
                                        size="lg" 
                                        onClick={(e) => { e.stopPropagation(); resetSteps(); }} 
                                        className="w-full sm:w-auto px-8 py-5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 hover:text-white text-sm font-bold rounded-xl shadow-md cursor-pointer"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-1.5" /> Thử lại
                                    </Button>
                                    <Button 
                                        type="button"
                                        size="lg" 
                                        onClick={(e) => { e.stopPropagation(); setShowCorrectAnswer(true); }} 
                                        className="w-full sm:w-auto px-8 py-5 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/40 text-cyan-400 text-sm font-bold rounded-xl shadow-md cursor-pointer"
                                    >
                                        <Eye className="w-4 h-4 mr-1.5" /> Xem đáp án đúng
                                    </Button>
                                </>
                            )}
                            {(feedbackState === 'success' || showCorrectAnswer) && (
                                <Button 
                                    size="lg" 
                                    onClick={handleNext} 
                                    className="w-full sm:w-auto px-12 py-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 text-base font-black tracking-wider uppercase rounded-xl shadow-lg shadow-orange-500/25 transition-transform hover:scale-[1.02]"
                                >
                                    {currentIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành bài tập'}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
