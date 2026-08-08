"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Volume2, ChevronLeft, ChevronRight, Shuffle, Eye, EyeOff, RotateCcw, CheckCircle2 } from 'lucide-react'
import { LessonVocabulary } from '@/lib/supabase/queries/lessons'

interface VocabularyLearningProps {
  vocabulary: LessonVocabulary[]
  onComplete?: () => void
}

export function VocabularyLearning({ vocabulary, onComplete }: VocabularyLearningProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showKorean, setShowKorean] = useState(true)
  const [showVietnamese, setShowVietnamese] = useState(true)
  const [showExample, setShowExample] = useState(true)
  const [masteredWords, setMasteredWords] = useState<Set<number>>(new Set())
  const [vocabList, setVocabList] = useState(vocabulary)
  const [mode, setMode] = useState<'list' | 'flashcard'>('list')

  const currentWord = vocabList[currentIndex]
  const progress = vocabList.length > 0 ? Math.round((masteredWords.size / vocabList.length) * 100) : 0

  const handleNext = () => {
    if (currentIndex < vocabList.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleShuffle = () => {
    const shuffled = [...vocabList].sort(() => Math.random() - 0.5)
    setVocabList(shuffled)
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  const handleReset = () => {
    setVocabList(vocabulary)
    setCurrentIndex(0)
    setIsFlipped(false)
    setMasteredWords(new Set())
  }

  const toggleMastered = (index: number) => {
    const newMastered = new Set(masteredWords)
    if (newMastered.has(index)) {
      newMastered.delete(index)
    } else {
      newMastered.add(index)
    }
    setMasteredWords(newMastered)
  }

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ko-KR'
      utterance.rate = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  // Flashcard Mode
  if (mode === 'flashcard') {
    // Guard: check if vocabulary list is empty or currentWord is undefined
    if (!vocabList.length || !currentWord) {
      return (
        <div className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode('list')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Chế độ danh sách
          </Button>
          <Card className="p-8 text-center text-muted-foreground">
            <p>Không có từ vựng để hiển thị</p>
          </Card>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode('list')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Chế độ danh sách
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShuffle}
              title="Xáo trộn"
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              title="Đặt lại"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tiến độ: {masteredWords.size}/{vocabList.length} từ đã thuộc</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="relative">
          <Card
            className={`min-h-[400px] cursor-pointer transition-all duration-300 ${
              isFlipped ? 'bg-emerald-50' : 'bg-blue-50'
            } ${masteredWords.has(currentIndex) ? 'border-emerald-500 border-2' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-6">
              <div className="text-center space-y-4 w-full">
                {!isFlipped ? (
                  // Front: Korean word
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <h3 className="text-4xl font-bold">{currentWord.word}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          speakWord(currentWord.word)
                        }}
                      >
                        <Volume2 className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-xl text-muted-foreground">{currentWord.romanization}</p>
                    <p className="text-sm text-muted-foreground mt-8">Nhấn để xem nghĩa</p>
                  </>
                ) : (
                  // Back: Meaning and example
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <h3 className="text-3xl font-bold text-emerald-700">{currentWord.meaning}</h3>
                    </div>
                    <div className="text-lg text-muted-foreground">{currentWord.romanization}</div>
                    <div className="border-t pt-4 mt-4 space-y-2">
                      <p className="text-base font-medium">{currentWord.example}</p>
                      <p className="text-sm text-muted-foreground">{currentWord.exampleMeaning}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card counter */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-medium">
            {currentIndex + 1} / {vocabList.length}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Trước
          </Button>

          <Button
            variant={masteredWords.has(currentIndex) ? "default" : "outline"}
            onClick={() => toggleMastered(currentIndex)}
            className={masteredWords.has(currentIndex) ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {masteredWords.has(currentIndex) ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
          </Button>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === vocabList.length - 1}
          >
            Sau
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Complete button */}
        {progress === 100 && onComplete && (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={onComplete}
          >
            Hoàn thành phần Từ vựng
          </Button>
        )}
      </div>
    )
  }

  // List Mode
  return (
    <div className="space-y-4">
      {/* Mode Toggle and Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="default"
          size="sm"
          onClick={() => setMode('flashcard')}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Chế độ Flashcard
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKorean(!showKorean)}
          >
            {showKorean ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            Tiếng Hàn
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVietnamese(!showVietnamese)}
          >
            {showVietnamese ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            Tiếng Việt
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExample(!showExample)}
          >
            {showExample ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            Ví dụ
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Đã thuộc: {masteredWords.size}/{vocabList.length} từ</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Vocabulary List */}
      <div className="grid gap-3">
        {vocabList.map((item, idx) => (
          <Card
            key={idx}
            className={`transition-all ${masteredWords.has(idx) ? 'border-emerald-500 bg-emerald-50/30' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {showKorean && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{item.word}</span>
                      <span className="text-sm text-muted-foreground">({item.romanization})</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => speakWord(item.word)}
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {showVietnamese && (
                    <p className="text-sm font-medium text-emerald-700">{item.meaning}</p>
                  )}
                  {showExample && (
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                      <p className="italic">{item.example}</p>
                      <p>{item.exampleMeaning}</p>
                    </div>
                  )}
                </div>
                <Button
                  variant={masteredWords.has(idx) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleMastered(idx)}
                  className={masteredWords.has(idx) ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Complete button */}
      {progress === 100 && onComplete && (
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          onClick={onComplete}
        >
          Hoàn thành phần Từ vựng
        </Button>
      )}
    </div>
  )
}
