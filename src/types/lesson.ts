export interface LessonVocabulary {
  word: string
  romanization: string
  meaning: string
  example: string
  exampleMeaning: string
  audioUrl?: string
}

export interface LessonGrammar {
  pattern: string
  explanation: string
  usage: string
  examples: {
    korean: string
    vietnamese: string
  }[]
}

export interface LessonConversation {
  title: string
  context: string
  lines: {
    speaker: string
    korean: string
    vietnamese: string
    audioUrl?: string
  }[]
}

export interface LessonCulture {
  title: string
  content: string
  imageUrl?: string
}

export interface Lesson {
  id: string
  chapter: number
  lessonNumber: number
  titleKorean: string
  titleVietnamese: string
  description: string
  vocabulary: LessonVocabulary[]
  grammar: LessonGrammar[]
  conversations: LessonConversation[]
  culture: LessonCulture[]
}

export type LessonSection = 'vocabulary' | 'grammar' | 'conversation' | 'culture'

export interface LessonProgress {
  lessonId: string
  completedSections: LessonSection[]
  lastAccessedAt: string
}

export type PracticeMode = 'flashcard' | 'grammar-drill' | 'quick-quiz' | 'listening'

export interface FlashcardItem {
  front: string
  back: string
  example?: string
  exampleMeaning?: string
}

export interface GrammarDrillItem {
  sentence: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface QuickQuizItem {
  question: string
  options: string[]
  correctIndex: number
  type: 'vocabulary' | 'grammar'
}
