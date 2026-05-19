"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, PenTool, Zap, Headphones, ArrowRight } from 'lucide-react'
import { useLessonStore } from '@/store/lessonStore'
import { PracticeMode } from '@/types/lesson'
import { FlashcardPractice } from './FlashcardPractice'
import { GrammarDrill } from './GrammarDrill'
import { QuickQuiz } from './QuickQuiz'

export function PracticeHub() {
  const [activeMode, setActiveMode] = useState<PracticeMode | null>(null)
  const { practiceScores } = useLessonStore()

  if (activeMode === 'flashcard') {
    return <FlashcardPractice onBack={() => setActiveMode(null)} />
  }

  if (activeMode === 'grammar-drill') {
    return <GrammarDrill onBack={() => setActiveMode(null)} />
  }

  if (activeMode === 'quick-quiz') {
    return <QuickQuiz onBack={() => setActiveMode(null)} />
  }

  const practiceTypes = [
    {
      mode: 'flashcard' as PracticeMode,
      icon: Layers,
      title: 'Flashcard từ vựng',
      description: 'Luyện ghi nhớ từ vựng theo chủ đề',
      color: 'blue',
      bgColor: 'bg-blue-50/50',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-600',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      mode: 'grammar-drill' as PracticeMode,
      icon: PenTool,
      title: 'Luyện ngữ pháp',
      description: 'Điền vào chỗ trống với ngữ pháp đúng',
      color: 'green',
      bgColor: 'bg-emerald-50/50',
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-600',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
    },
    {
      mode: 'quick-quiz' as PracticeMode,
      icon: Zap,
      title: 'Trắc nghiệm nhanh',
      description: 'Kiểm tra nhanh 10-15 câu hỏi',
      color: 'purple',
      bgColor: 'bg-purple-50/50',
      borderColor: 'border-purple-500/20',
      textColor: 'text-purple-600',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      mode: 'listening' as PracticeMode,
      icon: Headphones,
      title: 'Luyện nghe',
      description: 'Nghe và trả lời câu hỏi',
      color: 'orange',
      bgColor: 'bg-orange-50/50',
      borderColor: 'border-orange-500/20',
      textColor: 'text-orange-600',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Luyện Tập</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Chọn loại luyện tập phù hợp với bạn
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {practiceTypes.map((type) => {
          const Icon = type.icon
          const score = practiceScores[type.mode]
          const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0

          return (
            <Card
              key={type.mode}
              className={`${type.borderColor} ${type.bgColor} hover:border-${type.color}-500/50 transition-colors`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${type.bgColor}`}>
                    <Icon className={`w-6 h-6 ${type.textColor}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className={`text-lg ${type.textColor}`}>{type.title}</CardTitle>
                  </div>
                </div>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {score.total > 0 && (
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Độ chính xác</span>
                      <span className="font-medium">{accuracy}%</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Đã làm</span>
                      <span className="font-medium">{score.total} câu</span>
                    </div>
                  </div>
                )}
                <Button
                  className={`w-full ${type.buttonColor} text-white`}
                  onClick={() => setActiveMode(type.mode)}
                  disabled={type.mode === 'listening'}
                >
                  {type.mode === 'listening' ? 'Sắp ra mắt' : 'Bắt đầu'}
                  {type.mode !== 'listening' && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
