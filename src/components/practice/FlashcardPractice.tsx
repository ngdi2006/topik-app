"use client"

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { LESSONS } from '@/data/lessons'
import { FlashcardItem } from '@/types/lesson'
import { useLessonStore } from '@/store/lessonStore'

interface FlashcardPracticeProps {
  onBack: () => void
}

export function FlashcardPractice({ onBack }: FlashcardPracticeProps) {
  const { updatePracticeScore } = useLessonStore()

  const cards: FlashcardItem[] = useMemo(() => {
    return LESSONS.flatMap((lesson) =>
      lesson.vocabulary.map((v) => ({
        front: v.word,
        back: v.meaning,
        example: v.example,
        exampleMeaning: v.exampleMeaning,
      }))
    )
  }, [])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [knownCount, setKnownCount] = useState(0)
  const [totalReviewed, setTotalReviewed] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const currentCard = cards[currentIndex]

  const handleFlip = () => setIsFlipped(!isFlipped)

  const handleNext = (known: boolean) => {
    if (known) setKnownCount((prev) => prev + 1)
    setTotalReviewed((prev) => prev + 1)
    setIsFlipped(false)

    if (currentIndex >= cards.length - 1) {
      const finalKnown = known ? knownCount + 1 : knownCount
      const finalTotal = totalReviewed + 1
      updatePracticeScore('flashcard', finalKnown, finalTotal)
      setIsFinished(true)
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setKnownCount(0)
    setTotalReviewed(0)
    setIsFinished(false)
  }

  if (isFinished) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại
        </Button>
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <h3 className="text-2xl font-bold">Hoàn thành!</h3>
            <div className="text-4xl font-bold text-blue-600">
              {knownCount}/{totalReviewed}
            </div>
            <p className="text-muted-foreground">
              Bạn đã thuộc {knownCount} trên {totalReviewed} từ vựng
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
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      <div className="flex justify-center">
        <div
          className="w-full max-w-sm cursor-pointer perspective-1000"
          onClick={handleFlip}
        >
          <div
            className={`relative w-full h-64 transition-transform duration-500 transform-style-3d ${
              isFlipped ? '[transform:rotateY(180deg)]' : ''
            }`}
          >
            {/* Front */}
            <Card className="absolute inset-0 backface-hidden flex items-center justify-center border-2 border-blue-200">
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold mb-2">{currentCard.front}</p>
                <p className="text-sm text-muted-foreground">Nhấn để lật thẻ</p>
              </CardContent>
            </Card>

            {/* Back */}
            <Card className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] flex items-center justify-center border-2 border-emerald-200 bg-emerald-50/30">
              <CardContent className="p-6 text-center space-y-3">
                <p className="text-2xl font-bold text-emerald-700">{currentCard.back}</p>
                {currentCard.example && (
                  <div className="text-sm space-y-1">
                    <p className="italic text-muted-foreground">{currentCard.example}</p>
                    <p className="text-muted-foreground">{currentCard.exampleMeaning}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => handleNext(false)}
        >
          Chưa thuộc
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => handleNext(true)}
        >
          Đã thuộc
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm mx-auto">
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
