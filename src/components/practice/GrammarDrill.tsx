"use client"

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { LESSONS } from '@/data/lessons'
import { GrammarDrillItem } from '@/types/lesson'
import { useLessonStore } from '@/store/lessonStore'

interface GrammarDrillProps {
  onBack: () => void
}

function generateDrills(): GrammarDrillItem[] {
  const drills: GrammarDrillItem[] = [
    {
      sentence: '저___ 학생입니다.',
      options: ['은', '를', '에서', '도'],
      correctIndex: 0,
      explanation: '"는" dùng sau nguyên âm, "은" dùng sau phụ âm. "저" kết thúc bằng nguyên âm nhưng trong trường hợp này dùng "는" → Đáp án: 는. Tuy nhiên "저" thường đi với "는".',
    },
    {
      sentence: '회사___ 일합니다.',
      options: ['을', '에서', '는', '이'],
      correctIndex: 1,
      explanation: '"에서" là trợ từ chỉ nơi diễn ra hành động. "회사에서 일합니다" = Làm việc ở công ty.',
    },
    {
      sentence: '빵___ 삽니다.',
      options: ['는', '에', '을', '에서'],
      correctIndex: 2,
      explanation: '"을" là trợ từ tân ngữ dùng sau phụ âm. "빵" kết thúc bằng phụ âm ㅇ nên dùng "을".',
    },
    {
      sentence: '이것은 얼마___?',
      options: ['입니다', '입니까', '합니다', '합니까'],
      correctIndex: 1,
      explanation: '"입니까?" là dạng nghi vấn của "입니다" (vị ngữ danh từ). Dùng khi hỏi.',
    },
    {
      sentence: '저는 베트남 사람___.',
      options: ['합니다', '입니다', '있습니다', '갑니다'],
      correctIndex: 1,
      explanation: '"입니다" dùng sau danh từ để khẳng định. "사람입니다" = là người.',
    },
    {
      sentence: '한국어___ 공부합니다.',
      options: ['은', '를', '에서', '에'],
      correctIndex: 1,
      explanation: '"를" là trợ từ tân ngữ dùng sau nguyên âm. "한국어" kết thúc bằng nguyên âm nên dùng "를".',
    },
    {
      sentence: '아침___ 운동합니다.',
      options: ['을', '에서', '에', '는'],
      correctIndex: 2,
      explanation: '"에" dùng để chỉ thời gian. "아침에" = vào buổi sáng.',
    },
    {
      sentence: '이 옷은 너무 비___.',
      options: ['쌉니다', '삽니다', '씁니다', '습니다'],
      correctIndex: 0,
      explanation: '"비싸다" → "비쌉니다" (thể trang trọng). Gốc "비싸" + ㅂ니다 → 비쌉니다.',
    },
    {
      sentence: '김 선생님___ 한국어를 가르칩니다.',
      options: ['를', '에서', '은', '에'],
      correctIndex: 2,
      explanation: '"은" là trợ từ chủ đề dùng sau phụ âm. "님" kết thúc bằng phụ âm ㅁ nên dùng "은".',
    },
    {
      sentence: '주말에 집___ 쉽니다.',
      options: ['을', '에', '에서', '는'],
      correctIndex: 2,
      explanation: '"에서" chỉ nơi diễn ra hành động. "집에서 쉽니다" = nghỉ ngơi ở nhà.',
    },
  ]
  return drills
}

export function GrammarDrill({ onBack }: GrammarDrillProps) {
  const { updatePracticeScore } = useLessonStore()

  const drills = useMemo(() => generateDrills(), [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const currentDrill = drills[currentIndex]
  const isAnswered = selectedOption !== null
  const isCorrect = selectedOption === currentDrill.correctIndex

  const handleSelect = (index: number) => {
    if (isAnswered) return
    setSelectedOption(index)
    if (index === currentDrill.correctIndex) {
      setCorrectCount((prev) => prev + 1)
    }
  }

  const handleNext = () => {
    if (currentIndex >= drills.length - 1) {
      updatePracticeScore('grammar-drill', correctCount, drills.length)
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
    const percentage = Math.round((correctCount / drills.length) * 100)
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại
        </Button>
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <h3 className="text-2xl font-bold">Kết quả</h3>
            <div className={`text-4xl font-bold ${percentage >= 70 ? 'text-emerald-600' : 'text-orange-600'}`}>
              {correctCount}/{drills.length}
            </div>
            <p className="text-muted-foreground">
              Độ chính xác: {percentage}%
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

  const parts = currentDrill.sentence.split('___')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {drills.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-emerald-600 h-2 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / drills.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2 uppercase">Điền vào chỗ trống</p>
            <p className="text-2xl font-medium">
              {parts[0]}
              <span className="inline-block min-w-[3rem] border-b-2 border-emerald-500 mx-1 text-emerald-600">
                {isAnswered ? currentDrill.options[currentDrill.correctIndex] : '___'}
              </span>
              {parts[1]}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {currentDrill.options.map((option, idx) => {
              let variant = 'outline' as 'outline' | 'default'
              let className = 'h-12 text-base'

              if (isAnswered) {
                if (idx === currentDrill.correctIndex) {
                  className += ' border-emerald-500 bg-emerald-50 text-emerald-700'
                } else if (idx === selectedOption && !isCorrect) {
                  className += ' border-red-500 bg-red-50 text-red-700'
                }
              } else if (idx === selectedOption) {
                variant = 'default'
              }

              return (
                <Button
                  key={idx}
                  variant={variant}
                  className={className}
                  onClick={() => handleSelect(idx)}
                  disabled={isAnswered}
                >
                  {option}
                  {isAnswered && idx === currentDrill.correctIndex && (
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                  )}
                  {isAnswered && idx === selectedOption && !isCorrect && (
                    <XCircle className="w-4 h-4 ml-1" />
                  )}
                </Button>
              )
            })}
          </div>

          {/* Explanation */}
          {isAnswered && (
            <div className={`p-3 rounded-lg text-sm ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-orange-50 text-orange-800'}`}>
              {currentDrill.explanation}
            </div>
          )}

          {/* Next button */}
          {isAnswered && (
            <Button className="w-full" onClick={handleNext}>
              {currentIndex >= drills.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
