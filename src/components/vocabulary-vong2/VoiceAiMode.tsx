import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Mic, CheckCircle, XCircle, Loader2, Volume2 } from 'lucide-react'
import { speakText, stopTTS } from '@/lib/tts'

// Simple normalize for comparison
const normalizeKorean = (text: string) => {
    return text.replace(/\s+/g, '').replace(/입니다$/, '').replace(/입니까$/, '').replace(/요$/, '').replace(/이에요$/, '').replace(/예요$/, '').replace(/[.?!]/g, '')
}

export default function VoiceAiMode({ vocabList, onBack }: { vocabList: any[], onBack: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFinished, setIsFinished] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition()
                recognition.continuous = false
                recognition.interimResults = false
                recognition.lang = 'ko-KR'

                recognition.onresult = (event: any) => {
                    const text = event.results[0][0].transcript
                    setTranscript(text)
                    checkAnswer(text)
                }

                recognition.onend = () => {
                    setIsRecording(false)
                }

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error)
                    setIsRecording(false)
                    alert('Lỗi nhận diện giọng nói: ' + event.error)
                }

                recognitionRef.current = recognition
            }
        }
    }, [currentIndex])

    useEffect(() => {
        if (currentIndex < vocabList.length) {
            setTranscript('')
            setResult(null)
            // Play question "이것이 무엇입니까?" (simulated with TTS for now or just generic if no audio)
            // Ideally we'd have a static audio file, but we can use browser TTS
            playQuestion()
        } else if (vocabList.length > 0) {
            setIsFinished(true)
        }
    }, [currentIndex, vocabList])

    const playQuestion = () => {
        speakText("이것이 무엇입니까?", 1.0)
    }

    const startRecording = () => {
        if (recognitionRef.current) {
            setIsRecording(true)
            setTranscript('')
            setResult(null)
            try {
                recognitionRef.current.start()
            } catch (e) {
                console.error(e)
            }
        } else {
            alert('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (Vui lòng dùng Chrome)')
        }
    }

    const stopRecording = () => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop()
        }
    }

    const checkAnswer = (spokenText: string) => {
        const correctWord = vocabList[currentIndex].word_kr
        const normalizedSpoken = normalizeKorean(spokenText)
        const normalizedCorrect = normalizeKorean(correctWord)

        if (normalizedSpoken.includes(normalizedCorrect)) {
            setResult('correct')
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1)
            }, 2000)
        } else {
            setResult('incorrect')
        }
    }

    if (isFinished) {
        return (
            <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
                <Card className="max-w-md w-full p-8 text-center space-y-6 rounded-3xl shadow-xl">
                    <CheckCircle className="w-16 h-16 text-blue-500 mx-auto" />
                    <h2 className="text-3xl font-bold">Hoàn thành!</h2>
                    <p className="text-slate-600">Bạn đã hoàn thành bài kiểm tra phát âm.</p>
                    <Button onClick={onBack} size="lg" className="w-full h-12 rounded-xl">Trở về thiết lập</Button>
                </Card>
            </div>
        )
    }

    if (vocabList.length === 0) return null
    const currentVocab = vocabList[currentIndex]

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
            <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
            </Button>

            <div className="text-center font-medium text-slate-500">
                Câu hỏi {currentIndex + 1} / {vocabList.length}
            </div>

            <Card className="p-6 md:p-8 rounded-3xl shadow-lg border-2 border-slate-100 bg-white">
                <div className="flex justify-center mb-8 h-48 md:h-64">
                    {currentVocab.image_url ? (
                        <img src={currentVocab.image_url} alt="Vocab" className="h-full object-contain rounded-xl" />
                    ) : (
                        <div className="h-full aspect-square bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                            No Image
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center space-y-6">
                    <Button variant="outline" className="rounded-full shadow-sm text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100" onClick={playQuestion}>
                        <Volume2 className="w-4 h-4 mr-2" /> Nghe lại câu hỏi
                    </Button>

                    <div className="text-center space-y-2 h-16">
                        {isRecording ? (
                            <p className="text-slate-500 animate-pulse flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Đang nghe...
                            </p>
                        ) : (
                            transcript && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Bạn nói:</p>
                                    <p className={`text-xl font-bold ${result === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {transcript}
                                    </p>
                                </div>
                            )
                        )}
                    </div>

                    <div className="h-16">
                        {result === 'correct' && (
                            <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full font-medium flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" /> Phát âm chuẩn! (+1)
                            </div>
                        )}
                        {result === 'incorrect' && (
                            <div className="flex flex-col items-center">
                                <div className="px-4 py-2 bg-red-100 text-red-700 rounded-full font-medium flex items-center gap-2 mb-2">
                                    <XCircle className="w-5 h-5" /> Chưa chính xác, hãy thử lại!
                                </div>
                                <p className="text-sm text-slate-500">Gợi ý: {currentVocab.word_kr}</p>
                            </div>
                        )}
                    </div>

                    <Button 
                        size="lg" 
                        className={`w-24 h-24 rounded-full shadow-xl transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'}`}
                        onClick={isRecording ? stopRecording : startRecording}
                    >
                        <Mic className="w-10 h-10 text-white" />
                    </Button>
                    <p className="text-sm text-slate-400 font-medium">{isRecording ? 'Chạm để dừng' : 'Chạm để nói'}</p>
                </div>
            </Card>
        </div>
    )
}
