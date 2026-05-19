"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLessonStore } from '@/store/lessonStore'
import { Lesson, LessonSection } from '@/types/lesson'
import { ArrowLeft, CheckCircle2, Volume2 } from 'lucide-react'

interface LessonDetailProps {
  lesson: Lesson
  onBack: () => void
}

export function LessonDetail({ lesson, onBack }: LessonDetailProps) {
  const { completedSections, markSectionComplete } = useLessonStore()
  const completed = completedSections[lesson.id] || []

  const handleComplete = (section: LessonSection) => {
    markSectionComplete(lesson.id, section)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            Bài {lesson.lessonNumber}: {lesson.titleKorean}
          </h2>
          <p className="text-sm text-muted-foreground">{lesson.titleVietnamese}</p>
        </div>
      </div>

      <Tabs defaultValue="vocabulary">
        <TabsList className="w-full">
          <TabsTrigger value="vocabulary" className="flex-1 gap-1">
            Từ vựng
            {completed.includes('vocabulary') && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          </TabsTrigger>
          <TabsTrigger value="grammar" className="flex-1 gap-1">
            Ngữ pháp
            {completed.includes('grammar') && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          </TabsTrigger>
          <TabsTrigger value="conversation" className="flex-1 gap-1">
            Hội thoại
            {completed.includes('conversation') && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          </TabsTrigger>
          <TabsTrigger value="culture" className="flex-1 gap-1">
            Văn hóa
            {completed.includes('culture') && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          </TabsTrigger>
        </TabsList>

        {/* Từ vựng */}
        <TabsContent value="vocabulary" className="space-y-4 mt-4">
          <div className="grid gap-3">
            {lesson.vocabulary.map((item, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{item.word}</span>
                        <span className="text-sm text-muted-foreground">({item.romanization})</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Volume2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-medium text-emerald-700">{item.meaning}</p>
                      <div className="text-sm text-muted-foreground mt-2">
                        <p className="italic">{item.example}</p>
                        <p>{item.exampleMeaning}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!completed.includes('vocabulary') && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleComplete('vocabulary')}
            >
              Hoàn thành phần Từ vựng
            </Button>
          )}
        </TabsContent>

        {/* Ngữ pháp */}
        <TabsContent value="grammar" className="space-y-4 mt-4">
          {lesson.grammar.map((item, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-primary">{item.pattern}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{item.explanation}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Cách dùng:</span> {item.usage}
                </p>
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Ví dụ:</p>
                  {item.examples.map((ex, i) => (
                    <div key={i} className="text-sm space-y-0.5">
                      <p className="font-medium">{ex.korean}</p>
                      <p className="text-muted-foreground">{ex.vietnamese}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {!completed.includes('grammar') && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleComplete('grammar')}
            >
              Hoàn thành phần Ngữ pháp
            </Button>
          )}
        </TabsContent>

        {/* Hội thoại */}
        <TabsContent value="conversation" className="space-y-4 mt-4">
          {lesson.conversations.map((conv, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{conv.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{conv.context}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {conv.lines.map((line, i) => (
                  <div
                    key={i}
                    className={`flex flex-col p-3 rounded-lg ${
                      i % 2 === 0 ? 'bg-blue-50 ml-0 mr-12' : 'bg-gray-50 ml-12 mr-0'
                    }`}
                  >
                    <span className="text-xs font-medium text-muted-foreground mb-1">
                      {line.speaker}
                    </span>
                    <p className="font-medium">{line.korean}</p>
                    <p className="text-sm text-muted-foreground">{line.vietnamese}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {!completed.includes('conversation') && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleComplete('conversation')}
            >
              Hoàn thành phần Hội thoại
            </Button>
          )}
        </TabsContent>

        {/* Văn hóa */}
        <TabsContent value="culture" className="space-y-4 mt-4">
          {lesson.culture.map((item, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{item.content}</p>
              </CardContent>
            </Card>
          ))}
          {!completed.includes('culture') && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleComplete('culture')}
            >
              Hoàn thành phần Văn hóa
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
