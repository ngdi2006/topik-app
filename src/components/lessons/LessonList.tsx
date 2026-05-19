"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, CheckCircle2, Loader2 } from 'lucide-react'
import { fetchLessonsWithProgress, type LessonWithProgress } from '@/lib/supabase/queries/lessons'
import { LessonDetail } from './LessonDetail'

export function LessonList() {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [lessons, setLessons] = useState<LessonWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadLessons() {
      try {
        setLoading(true)
        const data = await fetchLessonsWithProgress()
        setLessons(data)
      } catch (err: any) {
        setError(err.message || 'Không thể tải danh sách bài học')
        console.error('Error loading lessons:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLessons()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-medium">Lỗi tải dữ liệu</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (selectedLessonId) {
    const lesson = lessons.find((l) => l.id === selectedLessonId)
    if (lesson) {
      return <LessonDetail lesson={lesson} onBack={() => setSelectedLessonId(null)} />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Danh sách bài học</h2>
        <div className="text-sm text-muted-foreground">
          {lessons.length} bài học
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Chưa có bài học nào. Vui lòng liên hệ quản trị viên.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => {
            const progress = lesson.progress?.progressPercent || 0
            const isComplete = lesson.progress?.isCompleted || false

            return (
              <Card
                key={lesson.id}
                className={`hover:border-emerald-500/50 transition-colors cursor-pointer ${
                  isComplete ? 'border-emerald-500/50 bg-emerald-50/30' : ''
                }`}
                onClick={() => setSelectedLessonId(lesson.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Bài {lesson.lessonNumber}
                      </span>
                    </div>
                    {isComplete && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {lesson.titleKorean}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {lesson.titleVietnamese}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {lesson.description || 'Học từ vựng, ngữ pháp và hội thoại'}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tiến độ</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    {progress > 0 ? 'Tiếp tục học' : 'Bắt đầu'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
