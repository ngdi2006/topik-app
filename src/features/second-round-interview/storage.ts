import type { IndustryId, TopicId } from "./model"

const PREFERENCE_KEY = "second_round_interview_preference_v1"
const RECENT_ACTIVITY_KEY = "second_round_interview_recent_activity_v1"
const EXAM_HISTORY_KEY = "second_round_interview_exam_history_v1"
const SELF_INTRODUCTION_DRAFT_KEY = "second_round_interview_self_introduction_v1"
const LEGACY_MASTERY_KEY = "interview_mastery_v1"

interface StoredPreference {
  version: 1
  industry: IndustryId
  updatedAt: string
}

export interface QuestionPracticeDetail {
  id: string
  lastSeen: number
  correctCount: number
  incorrectCount: number
}

export interface RecentLearningActivity {
  version: 1
  industry: IndustryId
  topicId: TopicId
  questionId?: string
  updatedAt: string
}

export interface StoredExamResult {
  id: string
  industry: string
  score: number
  totalScore: number
  passed: boolean
  sectionScores: Record<string, number>
  correctCount?: number
  incorrectCount?: number
  questionResults?: Array<{
    questionId: string
    section: string
    questionText: string
    userAnswer: string
    isCorrect: boolean
    score: number
    maxScore: number
  }>
  completedAt: string
}

export interface StoredSelfIntroductionDraft {
  version: 1
  mode: "experienced" | "beginner"
  profile: {
    hometown: string
    name: string
    age: string
    occupation: string
    familyCount: string
    height: string
    weight: string
    experienceYears: string
  }
  text: string
  updatedAt: string
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function readPreferredIndustry(): IndustryId | null {
  const stored = safeParse<StoredPreference | null>(
    localStorage.getItem(PREFERENCE_KEY),
    null,
  )
  return stored?.version === 1 ? stored.industry : null
}

export function savePreferredIndustry(industry: IndustryId): void {
  const value: StoredPreference = {
    version: 1,
    industry,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(PREFERENCE_KEY, JSON.stringify(value))
}

export function readMasteredQuestionIds(): Partial<Record<TopicId, string[]>> {
  return safeParse<Partial<Record<TopicId, string[]>>>(
    localStorage.getItem(LEGACY_MASTERY_KEY),
    {},
  )
}

export function readTopicDetails(
  topicId: TopicId,
): Record<string, QuestionPracticeDetail> {
  return safeParse<Record<string, QuestionPracticeDetail>>(
    localStorage.getItem(`interview_mastery_detail_${topicId}`),
    {},
  )
}

export function readRecentLearningActivity(): RecentLearningActivity | null {
  const stored = safeParse<RecentLearningActivity | null>(
    localStorage.getItem(RECENT_ACTIVITY_KEY),
    null,
  )
  return stored?.version === 1 ? stored : null
}

export function saveRecentLearningActivity(
  activity: Omit<RecentLearningActivity, "version" | "updatedAt">,
): void {
  const value: RecentLearningActivity = {
    version: 1,
    ...activity,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(RECENT_ACTIVITY_KEY, JSON.stringify(value))
}

export function saveSelfIntroductionCompletion(): void {
  const topicId: TopicId = "introduction"
  const questionId = "self-introduction-40-seconds"
  const now = Date.now()
  const mastery = readMasteredQuestionIds()
  mastery[topicId] = Array.from(new Set([...(mastery[topicId] ?? []), questionId]))
  localStorage.setItem(LEGACY_MASTERY_KEY, JSON.stringify(mastery))

  const details = readTopicDetails(topicId)
  const previous = details[questionId]
  details[questionId] = {
    id: questionId,
    lastSeen: now,
    correctCount: (previous?.correctCount ?? 0) + 1,
    incorrectCount: previous?.incorrectCount ?? 0,
  }
  localStorage.setItem(
    `interview_mastery_detail_${topicId}`,
    JSON.stringify(details),
  )
}

export function readSelfIntroductionDraft(): StoredSelfIntroductionDraft | null {
  const stored = safeParse<StoredSelfIntroductionDraft | null>(
    localStorage.getItem(SELF_INTRODUCTION_DRAFT_KEY),
    null,
  )
  return stored?.version === 1 ? stored : null
}

export function saveSelfIntroductionDraft(
  draft: Omit<StoredSelfIntroductionDraft, "version" | "updatedAt">,
): StoredSelfIntroductionDraft {
  const value: StoredSelfIntroductionDraft = {
    version: 1,
    ...draft,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(SELF_INTRODUCTION_DRAFT_KEY, JSON.stringify(value))
  return value
}

export function readExamHistory(industry?: string): StoredExamResult[] {
  const history = safeParse<StoredExamResult[]>(
    localStorage.getItem(EXAM_HISTORY_KEY),
    [],
  )
  return industry
    ? history.filter((result) => result.industry === industry)
    : history
}

export function saveExamResult(
  result: Omit<StoredExamResult, "id" | "completedAt">,
): void {
  const history = readExamHistory()
  const value: StoredExamResult = {
    ...result,
    id: crypto.randomUUID(),
    completedAt: new Date().toISOString(),
  }
  localStorage.setItem(
    EXAM_HISTORY_KEY,
    JSON.stringify([value, ...history].slice(0, 20)),
  )
}
