import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const slug = new URL(request.url).searchParams.get('slug') || 'giao-trinh-quyen-1'
  const admin = createAdminClient()
  const { data: course, error } = await admin.from('elearning_courses')
    .select('id,slug,title,description,sequential_learning,elearning_lessons(id,lesson_number,title,description,estimated_minutes,pass_percent,sort_order,textbook_unit_id,elearning_steps(id,step_type,title,instructions,content,youtube_url,required_watch_percent,sort_order,is_required))')
    .eq('slug', slug).eq('is_published', true).eq('elearning_lessons.is_published', true).eq('elearning_lessons.elearning_steps.is_published', true).single()
  if (error || !course) return NextResponse.json({ error: error?.message || 'Không tìm thấy khóa học' }, { status: 404 })

  const lessons = [...(course.elearning_lessons || [])].sort((a, b) => a.sort_order - b.sort_order)
  const stepIds = lessons.flatMap(lesson => lesson.elearning_steps.map(step => step.id))
  const { data: progress } = stepIds.length ? await admin.from('elearning_step_progress').select('step_id,status,progress_percent,score,watched_seconds').eq('user_id', user.id).in('step_id', stepIds) : { data: [] }
  const progressByStep = new Map((progress || []).map(item => [item.step_id, item]))
  let previousLessonCompleted = true
  const mappedLessons = lessons.map(lesson => {
    let previousStepCompleted = true
    const lessonUnlocked = !course.sequential_learning || previousLessonCompleted
    const steps = [...lesson.elearning_steps].sort((a, b) => a.sort_order - b.sort_order).map(step => {
      const stepProgress = progressByStep.get(step.id) || null
      const unlocked = lessonUnlocked && (!course.sequential_learning || previousStepCompleted)
      if (step.is_required && stepProgress?.status !== 'completed') previousStepCompleted = false
      return { ...step, progress: stepProgress, unlocked }
    })
    const required = steps.filter(step => step.is_required)
    const completed = required.filter(step => step.progress?.status === 'completed').length
    const progressPercent = required.length ? Math.round(completed / required.length * 100) : 0
    const status = progressPercent === 100 ? 'completed' : steps.some(step => step.progress) ? 'in_progress' : 'not_started'
    previousLessonCompleted = status === 'completed'
    return { ...lesson, elearning_steps: undefined, steps, progressPercent, status, unlocked: lessonUnlocked }
  })
  const courseProgress = mappedLessons.length ? Math.round(mappedLessons.filter(item => item.status === 'completed').length / mappedLessons.length * 100) : 0
  return NextResponse.json({ course: { id: course.id, slug: course.slug, title: course.title, description: course.description, sequential_learning: course.sequential_learning, lessons: mappedLessons, progressPercent: courseProgress } })
}
