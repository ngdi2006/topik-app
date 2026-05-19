"use client"

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { QuickQuizItem } from '@/types/lesson'
import { useLessonStore } from '@/store/lessonStore'

interface QuickQuizProps {
  onBack: () => void
}

function generateQuiz(): QuickQuizItem[] {
  return [
    {
      question: '"이름"의 뜻은 무엇입니까?',
      options: ['tên', 'quốc gia', 'công ty', 'bạn bè'],
      correctIndex: 0,
      type: 'vocabulary',
    },
    {
      question: '"저는 학생___." 빈칸에 알맞은 것은?',
      options: ['합니다', '입니다', '갑니다', '먹습니다'],
      correctIndex: 1,
      type: 'grammar',
    },
    {
      question: '"회사"의 뜻은 무엇입니까?',
      options: ['học sinh', 'công ty', 'giáo viên', 'bạn bè'],
      correctIndex: 1,
      type: 'vocabulary',
    },
    {
      question: '"회사___ 일합니다." 빈칸에 알맞은 것은?',
      options: ['을', '에서', '는', '이'],
      correctIndex: 1,
      type: 'grammar',
    },
    {
      question: '"아침"의 뜻은 무엇입니까?',
      options: ['buổi tối', 'bữa trưa', 'buổi sáng', 'bữa tối'],
      correctIndex: 2,
      type: 'vocabulary',
    },
    {
      question: '"이것은 얼마___?" 빈칸에 알맞은 것은?',
      options: ['입니다', '입니까', '합니다', '합니까'],
      correctIndex: 1,
      type: 'grammar',
    },
    {
      question: '"비싸다"의 뜻은 무엇입니까?',
      options: ['rẻ', 'đắt', 'đẹp', 'xấu'],
      correctIndex: 1,
      type: 'vocabulary',
    },
    {
      question: '"한국어___ 공부합니다." 빈칸에 알맞은 것은?',
      options: ['은', '를', '에서', '에'],
      correctIndex: 1,
      type: 'grammar',
    },
    {
      question: '"친구"의 뜻은 무엇입니까?',
      options: ['giáo viên', 'học sinh', 'bạn bè', 'công ty'],
      correctIndex: 2,
      type: 'vocabulary',
    },
    {
      question: '"저는 베트남 사람___." 빈칸에 알맞은 것은?',
      options: ['합니다', '입니다', '있습니다', '갑니다'],
      correctIndex: 1,
      type: 'grammar',
    },
    {
      question: '"가게"의 뜻은 무엇입니까?',
      options: ['cửa hàng', 'nhà hàng', 'trường học', 'bệnh viện'],
      correctIndex: 0,
      type: 'vocabulary',
    },
    {
      question: '"아침___ 운동합니다." 빈칸에 알맞은 것은?',
      options: ['을', '에서', '에', '는'],
      correctIndex: 2,
      type: 'grammar',
    },
  ]
}

export function QuickQuiz({ onBack }: QuickQuizProps) {
  const { updatePracticeScore } = useLessonStore()

  const questions = useMemo(() => generateQuiz().slice(0, 12), [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const currentQuestion = questions[currentIndex]
  const isAnswered = selectedOption !== null
  const isCorrect = selectedOption === currentQuestion.correctIndex

  const handleSelect = (index: number) => {
    if (isAnswered) return
    setSelectedOption(index)
    if (index === currentQuestion.correctIndex) {
      setCorrectCount((prev) => prev + 1)
    }
  }

  const handleNext = () => {
    if (currentIndex >= questions.length - 1) {
      updatePracticeScore('quick-quiz', correctCount, questions.length)
      setIsFinished(true)
    } else {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOption(null)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setCorrectCount(0)
    setIsFinished(false)
  }

  if (isFinished) {
    const percentage = Math.round((correctCount / questions.length) * 100)
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại
        </Button>
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <h3 className="text-2xl font-bold">Kết quả</h3>
            <div className={`text-5xl font-bold ${percentage >= 70 ? 'text-purple-600' : 'text-orange-600'}`}>
              {percentage}%
            </div>
            <p className="text-lg font-medium">
              {correctCount}/{questions.length} câu đúng
            </p>
            <p className="text-sm text-muted-foreground">
              {percentage >= 80 ? 'Xuất sắc! 🎉' : percentage >= 70 ? 'Tốt lắm! 👍' : 'Cần cố gắng thêm! 💪'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Làm lại
              </Button>
              <Button onClick={onBack}>Quay lại</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại
        </Button>
        <span className="text-sm text-muted-foreground">
          Câu {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-purple-600 h-2 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                currentQuestion.type === 'vocabulary'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {currentQuestion.type === 'vocabulary' ? 'Từ vựng' : 'Ngữ pháp'}
              </span>
            </div>
            <p className="text-xl font-medium">{currentQuestion.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.options.map((option, idx) => {
              let className = 'w-full justify-start h-auto py-3 px-4 text-left'

              if (isAnswered) {
                if (idx === currentQuestion.correctIndex) {
                  className += ' border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                } else if (idx === selectedOption && !isCorrect) {
                  className += ' border-red-500 bg-red-50 text-red-700 hover:bg-red-50'
                } else {
                  className += ' opacity-50'
                }
              }

              return (
                <Button
                  key={idx}
                  variant="outline"
                  className={className}
                  onClick={() => handleSelect(idx)}
                  disabled={isAnswered}
                >
                  <span className="flex-1">{option}</span>
                  {isAnswered && idx === currentQuestion.correctIndex && (
                    <CheckCircle2 className="w-5 h-5 ml-2" />
                  )}
                  {isAnswered && idx === selectedOption && !isCorrect && (
                    <XCircle className="w-5 h-5 ml-2" />
                  )}
                </Button>
              )
            })}
          </div>

          {/* Feedback */}
          {isAnswered && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              isCorrect
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-red-50 text-red-800'
            }`}>
              {isCorrect ? '✓ Chính xác!' : '✗ Sai rồi. Đáp án đúng: ' + currentQuestion.options[currentQuestion.correctIndex]}
            </div>
          )}

          {/* Next button */}
          {isAnswered && (
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleNext}>
              {currentIndex >= questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
