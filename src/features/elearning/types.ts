export type ElearningStepType = 'overview' | 'video' | 'document' | 'vocabulary' | 'grammar' | 'practice' | 'culture_video' | 'quiz' | 'complete'
export type ElearningProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'needs_review'
export type ElearningVideoInteraction = { id: string; timestamp_seconds: number; interaction_type: 'single_choice' | 'true_false' | 'info'; title: string; prompt: string; options: string[]; explanation: string | null; is_required: boolean; points: number; progress: { answer: string | null; is_correct: boolean | null; completed_at: string } | null }

export type ElearningStep = {
  id: string; step_type: ElearningStepType; title: string; instructions: string | null
  content: Record<string, unknown>; youtube_url: string | null; required_watch_percent: number
  sort_order: number; is_required: boolean; progress: { status: ElearningProgressStatus; progress_percent: number; score: number | null; watched_seconds: number; metadata?: { video_duration_seconds?: number } } | null
  unlocked: boolean
  interactions?: ElearningVideoInteraction[]
}

export type ElearningLesson = {
  id: string; lesson_number: number; title: string; description: string | null; estimated_minutes: number
  pass_percent: number; sort_order: number; textbook_unit_id: string | null; steps: ElearningStep[]
  progressPercent: number; status: ElearningProgressStatus; unlocked: boolean
}

export type ElearningCourse = { id: string; slug: string; title: string; description: string | null; sequential_learning: boolean; lessons: ElearningLesson[]; progressPercent: number }
