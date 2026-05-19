import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LessonSection, PracticeMode } from '@/types/lesson'

interface PracticeScore {
  total: number
  correct: number
  lastDate: string
}

interface LessonStoreState {
  completedSections: Record<string, LessonSection[]>
  practiceScores: Record<PracticeMode, PracticeScore>
  markSectionComplete: (lessonId: string, section: LessonSection) => void
  getLessonProgress: (lessonId: string) => number
  updatePracticeScore: (mode: PracticeMode, correct: number, total: number) => void
  resetProgress: () => void
}

const initialPracticeScores: Record<PracticeMode, PracticeScore> = {
  flashcard: { total: 0, correct: 0, lastDate: '' },
  'grammar-drill': { total: 0, correct: 0, lastDate: '' },
  'quick-quiz': { total: 0, correct: 0, lastDate: '' },
  listening: { total: 0, correct: 0, lastDate: '' },
}

export const useLessonStore = create<LessonStoreState>()(
  persist(
    (set, get) => ({
      completedSections: {},
      practiceScores: initialPracticeScores,

      markSectionComplete: (lessonId, section) =>
        set((state) => {
          const current = state.completedSections[lessonId] || []
          if (current.includes(section)) return state
          return {
            completedSections: {
              ...state.completedSections,
              [lessonId]: [...current, section],
            },
          }
        }),

      getLessonProgress: (lessonId) => {
        const sections = get().completedSections[lessonId] || []
        return Math.round((sections.length / 4) * 100)
      },

      updatePracticeScore: (mode, correct, total) =>
        set((state) => {
          const prev = state.practiceScores[mode]
          return {
            practiceScores: {
              ...state.practiceScores,
              [mode]: {
                total: prev.total + total,
                correct: prev.correct + correct,
                lastDate: new Date().toISOString(),
              },
            },
          }
        }),

      resetProgress: () =>
        set({ completedSections: {}, practiceScores: initialPracticeScores }),
    }),
    { name: 'lesson-progress' }
  )
)
