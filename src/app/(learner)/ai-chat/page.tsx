"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mic, MicOff, SendHorizontal, Bot, User, Award, CheckCircle2, AlertCircle, Lightbulb, Volume2 } from "lucide-react"
import { UserNav } from "@/components/shared/UserNav"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

const scenarios = [
    "Đặt món tại nhà hàng",
    "Mua sắm tại siêu thị",
    "Hỏi đường đi dạo phố",
    "Phỏng vấn xin việc",
    "Khám bệnh tại bệnh viện",
    "Giao tiếp cơ bản / Kết bạn"
]


interface Message {
    id: string
    role: "system" | "user" | "assistant"
    content: string
}

export default function AiChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "msg_1",
            role: "assistant",
            content: "안녕하세요! 저는 한국어 선생님 AI입니다. 오늘 식당에서 주문하는 상황을 연습해 볼까요?"
        }
    ])
    const [inputValue, setInputValue] = useState("")
    const [isAiTyping, setIsAiTyping] = useState(false)
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [evaluationReport, setEvaluationReport] = useState<any>(null)
    const [isReportOpen, setIsReportOpen] = useState(false)
    const [selectedScenario, setSelectedScenario] = useState(scenarios[0])
    const [userId, setUserId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const getUserId = async () => {
            const supabase = createClient()
            const { data } = await supabase.auth.getUser()
            if (data.user) setUserId(data.user.id)
        }
        getUserId()
    }, [])


    const {
        hasBrowserSupport,
        isRecording,
        transcript,
        interimTranscript,
        startRecording,
        stopRecording,
        resetTranscript
    } = useSpeechRecognition("ko-KR")

    // Use a ref to track the latest speech text without triggering re-renders in the effect
    const speechTextRef = useRef("")

    useEffect(() => {
        if (isRecording) {
            const newText = (transcript + " " + interimTranscript).trim()
            // Only update state if it actually changed to avoid tight render loops
            if (newText !== speechTextRef.current) {
                speechTextRef.current = newText
                // Use timeout to schedule state update outside of current render phase
                const timeoutId = setTimeout(() => {
                    setInputValue(newText)
                }, 0)
                return () => clearTimeout(timeoutId)
            }
        }
    }, [transcript, interimTranscript, isRecording])

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isAiTyping, interimTranscript])

    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            const voices = window.speechSynthesis.getVoices();
            const koVoice = voices.find(v => v.lang === 'ko-KR' || v.lang === 'ko_KR');
            if (koVoice) utterance.voice = koVoice;
            window.speechSynthesis.speak(utterance);
        }
    }

    const handleEvaluateChat = async () => {
        if (messages.length < 3) {
            alert("Hãy trò chuyện thêm một chút trước khi kết thúc và nhận xét nhé!");
            return;
        }

        setIsEvaluating(true)
        setIsReportOpen(true)
        setEvaluationReport(null)

        try {
            const res = await fetch('/api/chat/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, scenario: selectedScenario, userId })
            })

            if (!res.ok) throw new Error("Gặp lỗi khi tạo nhận xét")
            const data = await res.json()
            setEvaluationReport(data)
        } catch (error) {
            console.error(error)
            setEvaluationReport({ error: true })
        } finally {
            setIsEvaluating(false)
        }
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!inputValue.trim() && !isRecording) return

        // If was recording, stop it
        if (isRecording) {
            stopRecording()
        }

        const newUserMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: inputValue.trim()
        }

        // Temporary add user message
        const newMessages = [...messages, newUserMsg]
        setMessages(newMessages)
        setInputValue("")
        resetTranscript()
        setIsAiTyping(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, scenario: selectedScenario }),
            });

            if (!response.ok) throw new Error(response.statusText);

            // Read stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) return;

            let aiMessageContent = "";
            const aiMessageId = (Date.now() + 1).toString();

            // Add empty message placeholder
            setMessages(prev => [...prev, { id: aiMessageId, role: "assistant", content: "" }])
            setIsAiTyping(false) // Hide jumping dots, show streaming text

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunkText = decoder.decode(value, { stream: true });
                aiMessageContent += chunkText;

                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === aiMessageId ? { ...msg, content: aiMessageContent } : msg
                    )
                );
            }
        } catch (error) {
            console.error("AI Chat fetch error:", error);
            setIsAiTyping(false);
            // Handle error logic ideally with toast
        }
    }

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording()
        } else {
            setInputValue("")
            startRecording()
        }
    }

    return (
        <div className="flex flex-col h-screen max-h-screen bg-muted/20">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Bot size={24} />
                    </div>
                    <div>
                        <h1 className="font-bold">Luyện giao tiếp AI</h1>
                        <Select value={selectedScenario} onValueChange={setSelectedScenario} disabled={messages.length > 1}>
                            <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 w-auto font-medium text-muted-foreground focus:ring-0 shadow-none">
                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 flex-shrink-0"></span>
                                <SelectValue placeholder="Chọn bối cảnh" />
                            </SelectTrigger>
                            <SelectContent>
                                {scenarios.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {messages.length >= 3 && (
                        <Button
                            variant="secondary"
                            className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 font-semibold"
                            onClick={handleEvaluateChat}
                            disabled={isEvaluating || isAiTyping || isRecording}
                        >
                            Kết thúc & Nhận xét
                        </Button>
                    )}
                    <UserNav />
                </div>
            </header>

            {/* Chat Messages Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Introductory system notice */}
                    <div className="flex justify-center">
                        <span className="bg-muted px-3 py-1 rounded-full text-xs font-medium text-muted-foreground">
                            Mục tiêu: Dùng kính ngữ (존댓말) để đặt 2 món ăn
                        </span>
                    </div>

                    {messages.map((msg) => {
                        if (msg.role === 'system') return null;

                        const isUser = msg.role === 'user'

                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                {!isUser && (
                                    <Avatar className="mt-1 shadow-sm border">
                                        <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                                    </Avatar>
                                )}

                                <div className={`
                  relative group max-w-[80%] rounded-2xl p-4 shadow-sm
                  ${isUser
                                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                        : 'bg-white border rounded-tl-sm'
                                    }
                `}>
                                    <p className="whitespace-pre-wrap leading-relaxed">
                                        {msg.content}
                                    </p>
                                    {!isUser && msg.content && (
                                        <button
                                            onClick={() => speakText(msg.content)}
                                            className="absolute -right-8 bottom-0 p-1.5 text-muted-foreground hover:text-primary rounded-full hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Nghe AI đọc (TTS)"
                                        >
                                            <Volume2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {isUser && (
                                    <Avatar className="mt-1 shadow-sm">
                                        <AvatarFallback className="bg-muted">
                                            <User className="text-muted-foreground" size={18} />
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        )
                    })}

                    {/* AI Typing Indicator */}
                    {isAiTyping && (
                        <div className="flex gap-4 justify-start">
                            <Avatar className="mt-1 shadow-sm border">
                                <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                            </Avatar>
                            <div className="bg-white border rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-1 items-center h-12">
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    )}

                    {/* Dummy element to auto-scroll to */}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            {/* Input Area */}
            <footer className="bg-white border-t p-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="max-w-3xl mx-auto">
                    {/* Warning if no Web Speech support */}
                    {!hasBrowserSupport && (
                        <p className="text-xs text-orange-500 mb-2 text-center">
                            Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng gõ phím.
                        </p>
                    )}

                    {/* Recording Status */}
                    {isRecording && (
                        <div className="flex items-center gap-2 mb-3 text-sm text-primary animate-pulse justify-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Đang lắng nghe (Tiếng Hàn)...
                        </div>
                    )}

                    <form
                        onSubmit={handleSendMessage}
                        className={`
              flex items-end gap-2 p-2 rounded-2xl border-2 transition-colors duration-300
              ${isRecording ? 'border-red-400 bg-red-50/50' : 'border-muted focus-within:border-primary'}
            `}
                    >
                        <div className="flex-1 min-h-[50px] relative">
                            {/* Use text area intuitively for longer speech input, styled like shadcn input */}
                            <textarea
                                className="w-full bg-transparent border-0 focus-visible:ring-0 resize-none min-h-[50px] py-3 px-4 text-base focus:outline-none"
                                placeholder={isRecording ? "Hãy nói bằng tiếng Hàn..." : "Nhập tin nhắn tiếng Hàn..."}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSendMessage(e)
                                    }
                                }}
                                rows={1}
                            />
                        </div>

                        <div className="flex gap-2 pl-2 pb-1">
                            {hasBrowserSupport && (
                                <button
                                    type="button"
                                    onClick={toggleRecording}
                                    className={`
                    w-11 h-11 flex items-center justify-center rounded-full transition-all
                    ${isRecording
                                            ? 'bg-red-500 text-white shadow-md animate-pulse'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }
                  `}
                                >
                                    {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                                </button>
                            )}

                            <Button
                                type="submit"
                                size="icon"
                                className="w-11 h-11 rounded-full shadow-md"
                                disabled={!inputValue.trim() && !isRecording || isAiTyping}
                            >
                                <SendHorizontal size={20} className="translate-x-[-1px] translate-y-[1px]" />
                            </Button>
                        </div>
                    </form>
                </div>
            </footer>

            {/* Evaluation Report Dialog */}
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Award className="w-6 h-6 text-yellow-500" />
                            Phân tích đánh giá giao tiếp
                        </DialogTitle>
                        <DialogDescription>
                            AI Teacher phân tích dựa trên sự cấu trúc ngữ pháp và tính tự nhiên của đoạn hội thoại vừa rồi.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {isEvaluating ? (
                            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-muted-foreground">
                                <Bot className="w-12 h-12 text-primary/40 animate-bounce" />
                                <p className="animate-pulse">AI đang chấm điểm và phân tích hội thoại...</p>
                            </div>
                        ) : evaluationReport?.error ? (
                            <div className="text-center py-8 text-red-500 font-medium">
                                Đã có lỗi xảy ra trong quá trình đánh giá. Vui lòng trải nghiệm lại tính năng sau.
                            </div>
                        ) : evaluationReport ? (
                            <div className="space-y-6">
                                {/* Score */}
                                <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-sm">
                                    <span className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Điểm đánh giá</span>
                                    <div className="text-6xl font-black text-blue-600 drop-shadow-sm">
                                        {evaluationReport.score}
                                        <span className="text-2xl text-blue-300 font-bold ml-1">/100</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Strengths */}
                                    <div className="space-y-3 bg-green-50/50 p-4 rounded-xl border border-green-100">
                                        <h4 className="font-semibold flex items-center gap-2 text-green-700 text-sm">
                                            <CheckCircle2 className="w-4 h-4" /> Điểm mạnh
                                        </h4>
                                        <ul className="space-y-2 pl-4">
                                            {evaluationReport.strengths?.map((str: string, i: number) => (
                                                <li key={i} className="text-xs text-gray-700 list-disc marker:text-green-500 leading-relaxed">{str}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Weaknesses */}
                                    <div className="space-y-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
                                        <h4 className="font-semibold flex items-center gap-2 text-red-600 text-sm">
                                            <AlertCircle className="w-4 h-4" /> Cần cải thiện
                                        </h4>
                                        <ul className="space-y-2 pl-4">
                                            {evaluationReport.weaknesses?.map((wk: string, i: number) => (
                                                <li key={i} className="text-xs text-gray-700 list-disc marker:text-red-400 leading-relaxed">{wk}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Advice */}
                                <div className="space-y-2 bg-purple-50 p-4 rounded-xl border border-purple-100">
                                    <h4 className="font-semibold flex items-center gap-2 text-purple-700 text-sm mb-3">
                                        <Lightbulb className="w-4 h-4" /> Lời khuyên trọng tâm
                                    </h4>
                                    <p className="text-sm text-purple-900 leading-relaxed font-medium">
                                        {evaluationReport.advice}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    {!isEvaluating && (
                        <DialogFooter>
                            <Button onClick={() => setIsReportOpen(false)}>Đóng báo cáo</Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    )
}
