'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Ear,
  Eye,
  Lightbulb,
  Loader2,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { speakText, stopTTS } from '@/lib/tts'
import {
  readTopicDetails,
  saveReinforcementResult,
} from '@/features/second-round-interview/storage'
import type { TopicId } from '@/features/second-round-interview/model'

const SESSION_SIZE = 5

interface ReinforcementQuestion {
  id: string
  question_text?: string | null
  vietnamese_meaning?: string | null
  question_audio_url?: string | null
  audio_url?: string | null
  suggested_answers?: string[] | null
  correct_answer?: string | null
  answer?: string | null
}

interface ReinforcementSessionProps {
  topicId: TopicId
  topicName: string
  apiCategory: string
  industry: string
  questionIds: string[]
  onBack: () => void
  onComplete: () => void
}

type LearningStep = 'listen' | 'understand' | 'practice' | 'verify'

const STEPS: Array<{ id: LearningStep; label: string; icon: typeof Ear }> = [
  { id: 'listen', label: 'Nghe lại', icon: Ear },
  { id: 'understand', label: 'Hiểu lỗi', icon: Eye },
  { id: 'practice', label: 'Ghi nhớ', icon: Lightbulb },
  { id: 'verify', label: 'Kiểm tra', icon: CheckCircle2 },
]

const TOPIC_GUIDANCE: Partial<Record<TopicId, { focus: string; method: string }>> = {
  command: {
    focus: 'Tập trung vào động từ, phương hướng, số lần và bộ phận cơ thể.',
    method: 'Nghe cụm quyết định trước, sau đó ghép lại toàn bộ khẩu lệnh.',
  },
  math: {
    focus: 'Tách số, đơn vị và từ khóa xác định phép tính.',
    method: 'Nhắc lại từng dữ kiện trước khi thực hiện phép tính.',
  },
  tools: {
    focus: 'Nhận diện đúng dụng cụ, vị trí và thao tác được yêu cầu.',
    method: 'Ghi nhớ theo bộ ba: dụng cụ → vị trí → hành động.',
  },
  communication: {
    focus: 'Xác định ý định câu hỏi và từ khóa hội thoại.',
    method: 'Chọn phản hồi phù hợp với ngữ cảnh, không chỉ dịch từng từ.',
  },
  situation: {
    focus: 'Xác định vấn đề và thứ tự hành động hợp lý.',
    method: 'Ưu tiên hành động giải quyết trực tiếp và an toàn.',
  },
  safety: {
    focus: 'Phân biệt nguy cơ, hành động cấm và hành động bắt buộc.',
    method: 'Liên kết từ khóa với hậu quả an toàn tương ứng.',
  },
}

function answerFor(question: ReinforcementQuestion): string {
  return (
    question.vietnamese_meaning
    || question.correct_answer
    || question.answer
    || question.suggested_answers?.find((answer) => !answer.startsWith('__topic__:'))
    || 'Chưa có đáp án giải thích'
  )
}

export function ReinforcementSession({
  topicId,
  topicName,
  apiCategory,
  industry,
  questionIds,
  onBack,
  onComplete,
}: ReinforcementSessionProps) {
  const [questions, setQuestions] = useState<ReinforcementQuestion[]>([])
  const [answerPool, setAnswerPool] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [step, setStep] = useState<LearningStep>('listen')
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [playingRate, setPlayingRate] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [isSessionComplete, setIsSessionComplete] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackTokenRef = useRef(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadReviewQuestions() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/interview-questions?category=${encodeURIComponent(apiCategory)}&industry=${encodeURIComponent(industry)}`,
          { cache: 'no-store', signal: controller.signal },
        )
        const payload = await response.json() as { success: boolean; data?: ReinforcementQuestion[]; error?: string }
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Không thể tải câu cần củng cố')

        const allQuestions = payload.data ?? []
        const questionMap = new Map(allQuestions.map((question) => [question.id, question]))
        const queue = questionIds
          .map((id) => questionMap.get(id))
          .filter((question): question is ReinforcementQuestion => Boolean(question))
          .slice(0, SESSION_SIZE)

        setQuestions(queue)
        setAnswerPool(Array.from(new Set(allQuestions.map(answerFor).filter(Boolean))))
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError(loadError instanceof Error ? loadError.message : 'Không thể tải câu cần củng cố')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadReviewQuestions()
    return () => controller.abort()
  }, [apiCategory, industry, questionIds])

  useEffect(() => {
    return () => {
      playbackTokenRef.current += 1
      audioRef.current?.pause()
      stopTTS()
    }
  }, [])

  const currentQuestion = questions[questionIndex]
  const correctAnswer = currentQuestion ? answerFor(currentQuestion) : ''
  const previousDetail = currentQuestion ? readTopicDetails(topicId)[currentQuestion.id] : undefined
  const guidance = TOPIC_GUIDANCE[topicId] ?? {
    focus: 'Tập trung vào từ khóa làm thay đổi ý nghĩa của câu.',
    method: 'Nghe, hiểu ý chính rồi kiểm tra lại không có gợi ý.',
  }

  const options = useMemo(() => {
    if (!correctAnswer) return []
    const distractors = answerPool.filter((answer) => answer !== correctAnswer).slice(0, 3)
    const insertionIndex = currentQuestion
      ? currentQuestion.id.split('').reduce((total, character) => total + character.charCodeAt(0), 0) % (distractors.length + 1)
      : 0
    const next = [...distractors]
    next.splice(insertionIndex, 0, correctAnswer)
    return next
  }, [answerPool, correctAnswer, currentQuestion])

  const stopAudio = () => {
    playbackTokenRef.current += 1
    audioRef.current?.pause()
    audioRef.current = null
    stopTTS()
    setPlayingRate(null)
  }

  const playQuestion = (rate: number) => {
    if (!currentQuestion?.question_text) return
    stopAudio()
    const token = playbackTokenRef.current
    const finish = () => {
      if (token === playbackTokenRef.current) setPlayingRate(null)
    }
    setPlayingRate(rate)

    const audioUrl = currentQuestion.question_audio_url || currentQuestion.audio_url
    if (audioUrl && !audioUrl.includes('translate.google.com')) {
      const audio = new Audio(audioUrl)
      let hasFallenBack = false
      audioRef.current = audio
      audio.playbackRate = rate
      audio.setAttribute('playsinline', 'true')
      audio.onended = finish
      const useFallback = () => {
        if (hasFallenBack || token !== playbackTokenRef.current) return
        hasFallenBack = true
        speakText(currentQuestion.question_text!, rate, undefined, finish, finish)
      }
      audio.onerror = useFallback
      void audio.play().catch(useFallback)
      return
    }
    speakText(currentQuestion.question_text, rate, undefined, finish, finish)
  }

  const chooseAnswer = (answer: string) => {
    if (selectedAnswer !== null || !currentQuestion) return
    const correct = answer === correctAnswer
    setSelectedAnswer(answer)
    setIsCorrect(correct)
    setResults((previous) => [...previous, correct])
    saveReinforcementResult({
      topicId,
      questionId: currentQuestion.id,
      isCorrect: correct,
      userAnswer: answer,
      correctAnswer,
    })
  }

  const nextQuestion = () => {
    stopAudio()
    if (questionIndex >= questions.length - 1) {
      setIsSessionComplete(true)
      return
    }
    setQuestionIndex((index) => index + 1)
    setStep('listen')
    setSelectedAnswer(null)
    setIsCorrect(null)
  }

  if (isLoading) {
    return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-7 animate-spin text-blue-600 motion-reduce:animate-none" aria-label="Đang tải phiên củng cố" /></div>
  }

  if (error || questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="font-bold text-slate-900">{error || 'Không tìm thấy dữ liệu cho các câu cần củng cố.'}</p>
        <p className="mt-2 text-sm text-slate-600">Dữ liệu lỗi cũ có thể không còn khớp với ngân hàng câu hỏi hiện tại.</p>
        <Button variant="outline" onClick={onBack} className="mt-5">Trở lại Củng cố</Button>
      </div>
    )
  }

  if (isSessionComplete) {
    const correctCount = results.filter(Boolean).length
    return (
      <section className="mx-auto max-w-xl px-3 py-12 text-center sm:py-16">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 className="size-8" />
        </span>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Hoàn thành phiên củng cố</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Bạn đã xử lý {questions.length} câu điểm yếu</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Các câu đúng một lần sẽ được giữ lại để xác nhận ở phiên sau. Câu đúng ổn định 2 phiên mới được đánh dấu đã khắc phục.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><strong className="text-2xl font-black tabular-nums text-emerald-800">{correctCount}</strong><span className="mt-1 block text-xs font-semibold text-emerald-800">Đã hiểu đúng</span></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><strong className="text-2xl font-black tabular-nums text-amber-800">{results.length - correctCount}</strong><span className="mt-1 block text-xs font-semibold text-amber-800">Cần gặp lại</span></div>
        </div>
        <Button onClick={onComplete} className="mt-6 min-h-11 w-full bg-blue-600 font-black hover:bg-blue-700">Trở lại lộ trình Củng cố</Button>
      </section>
    )
  }

  const activeStepIndex = STEPS.findIndex((item) => item.id === step)
  const correctResultCount = results.filter(Boolean).length

  return (
    <section className="mx-auto max-w-4xl pb-8">
      <header className="border-b border-slate-200 px-3 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack} aria-label="Trở lại Củng cố" className="shrink-0 rounded-full">
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Phiên củng cố điểm yếu</p>
            <h1 className="truncate text-lg font-black text-slate-950 sm:text-2xl">{topicName}</h1>
            <p className="text-xs tabular-nums text-slate-600">Câu {questionIndex + 1}/{questions.length} · Đúng {correctResultCount}/{results.length}</p>
          </div>
        </div>

        <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Các bước củng cố">
          {STEPS.map((item, index) => {
            const Icon = item.icon
            const isActive = item.id === step
            const isPassed = index < activeStepIndex
            return (
              <li key={item.id} className={`rounded-lg border px-1.5 py-2 text-center ${isActive ? 'border-blue-300 bg-blue-50 text-blue-700' : isPassed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400'}`}>
                <Icon aria-hidden="true" className="mx-auto size-4" />
                <span className="mt-1 block text-[9px] font-bold sm:text-xs">{item.label}</span>
              </li>
            )
          })}
        </ol>
      </header>

      <div className="px-3 py-5 sm:px-5 sm:py-7">
        {step === 'listen' ? (
          <div className="mx-auto max-w-xl text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100"><Ear className="size-7" /></span>
            <h2 className="mt-4 text-xl font-black text-slate-950">Nghe lại trước khi xem chữ</h2>
            <p className="mt-2 text-sm text-slate-600">Thử nhận ra ý chính, động từ và từ khóa quyết định.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => playQuestion(0.8)} className="min-h-12"><Volume2 className="mr-2 size-4" />Nghe chậm 0.8×</Button>
              <Button onClick={() => playQuestion(1)} className="min-h-12 bg-blue-600 hover:bg-blue-700"><Volume2 className="mr-2 size-4" />Nghe tốc độ thường</Button>
            </div>
            {playingRate ? <p className="mt-3 text-xs font-semibold text-blue-700" aria-live="polite">Đang phát ở tốc độ {playingRate}×…</p> : null}
            <Button variant="ghost" onClick={() => setStep('understand')} className="mt-5">Xem câu & hiểu lỗi <ChevronRight className="ml-1 size-4" /></Button>
          </div>
        ) : null}

        {step === 'understand' ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="border-b border-slate-200 pb-4">
              <p lang="ko" className="break-words text-xl font-black leading-relaxed text-slate-950 sm:text-2xl">{currentQuestion.question_text}</p>
              <p lang="vi" className="mt-2 text-sm leading-6 text-slate-700 sm:text-base">{correctAnswer}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Dấu hiệu cần chú ý</p>
                <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-800">{guidance.focus}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-800">Cách nghe hiệu quả</p>
                <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-800">{guidance.method}</p>
              </div>
            </div>
            {previousDetail?.lastUserAnswer ? (
              <div className="text-sm text-slate-600">Lần trước bạn chọn: <strong className="text-rose-700">{previousDetail.lastUserAnswer}</strong></div>
            ) : (
              <div className="text-xs italic text-slate-500">Đây là lỗi từ dữ liệu cũ nên chưa có đáp án sai chi tiết.</div>
            )}
            <div className="flex justify-end"><Button onClick={() => setStep('practice')} className="bg-blue-600 hover:bg-blue-700">Đã hiểu điểm cần chú ý <ChevronRight className="ml-1 size-4" /></Button></div>
          </div>
        ) : null}

        {step === 'practice' ? (
          <div className="mx-auto max-w-xl text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"><Lightbulb className="size-6" /></span>
            <h2 className="mt-4 text-xl font-black text-slate-950">Ghi nhớ theo cấu trúc</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{guidance.method}</p>
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Tự nhắc lại</p>
              <p className="mt-2 text-sm leading-6 text-slate-800">Nghe lại một lần, nói thầm ý nghĩa, sau đó kiểm tra mà không nhìn câu tiếng Hàn.</p>
              <Button variant="outline" onClick={() => playQuestion(0.9)} className="mt-3 w-full"><RotateCcw className="mr-2 size-4" />Nghe & tự nhắc lại</Button>
            </div>
            <Button onClick={() => setStep('verify')} className="mt-5 bg-blue-600 hover:bg-blue-700">Kiểm tra không gợi ý <ChevronRight className="ml-1 size-4" /></Button>
          </div>
        ) : null}

        {step === 'verify' ? (
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-wider text-blue-700">Kiểm tra xác nhận</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Nghe và chọn đúng ý nghĩa</h2>
              <Button variant="outline" onClick={() => playQuestion(1)} className="mt-4"><Volume2 className="mr-2 size-4" />Nghe lại câu hỏi</Button>
            </div>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {options.map((option) => {
                const isChosen = selectedAnswer === option
                const showCorrect = selectedAnswer !== null && option === correctAnswer
                const showWrong = isChosen && isCorrect === false
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={selectedAnswer !== null}
                    onClick={() => chooseAnswer(option)}
                    className={`min-h-14 rounded-xl border p-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${showCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : showWrong ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-100'}`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
            {selectedAnswer !== null ? (
              <div className={`mt-4 rounded-xl border p-3 ${isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`} aria-live="polite">
                <div className="flex items-start gap-2">
                  {isCorrect ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-rose-700" />}
                  <div><strong className={isCorrect ? 'text-emerald-800' : 'text-rose-800'}>{isCorrect ? 'Đã hiểu đúng' : 'Cần củng cố thêm'}</strong><p className="mt-1 text-sm text-slate-700">Đáp án đúng: {correctAnswer}</p></div>
                </div>
                <Button onClick={nextQuestion} className="mt-3 w-full bg-blue-600 hover:bg-blue-700">{questionIndex < questions.length - 1 ? 'Câu củng cố tiếp theo' : 'Hoàn thành phiên'}<ChevronRight className="ml-1 size-4" /></Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
