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
  lastResult?: "correct" | "incorrect"
  consecutiveCorrect?: number
  consecutiveIncorrect?: number
  lastMode?: string
  lastUserAnswer?: string | null
  correctAnswer?: string | null
  nextReviewAt?: number
  resolvedAt?: number | null
}

export interface ReinforcementResult {
  topicId: TopicId
  questionId: string
  isCorrect: boolean
  userAnswer?: string | null
  correctAnswer?: string | null
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

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Safari may deny access to storage (private mode, quota/privacy settings,
    // or a temporarily corrupted website-data store). Learning must still work.
    return null
  }
}

function writeStorage(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Progress persistence is best-effort. Never crash the learning UI because
    // Safari cannot write website data.
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export function readPreferredIndustry(): IndustryId | null {
  const stored = safeParse<unknown>(
    readStorage(PREFERENCE_KEY),
    null,
  )
  return isRecord(stored) && stored.version === 1 && typeof stored.industry === "string"
    ? stored.industry as IndustryId
    : null
}

export function savePreferredIndustry(industry: IndustryId): void {
  const value: StoredPreference = {
    version: 1,
    industry,
    updatedAt: new Date().toISOString(),
  }
  writeStorage(PREFERENCE_KEY, value)
}

export function readMasteredQuestionIds(): Partial<Record<TopicId, string[]>> {
  const parsed = safeParse<unknown>(readStorage(LEGACY_MASTERY_KEY), {})
  if (!isRecord(parsed)) return {}

  return Object.fromEntries(
    Object.entries(parsed).flatMap(([topicId, questionIds]) =>
      Array.isArray(questionIds)
        ? [[topicId, questionIds.filter((id): id is string => typeof id === "string")]]
        : [],
    ),
  ) as Partial<Record<TopicId, string[]>>
}

export function readTopicDetails(
  topicId: TopicId,
): Record<string, QuestionPracticeDetail> {
  const parsed = safeParse<unknown>(
    readStorage(`interview_mastery_detail_${topicId}`),
    {},
  )
  if (!isRecord(parsed)) return {}

  return Object.fromEntries(
    Object.entries(parsed).flatMap(([key, value]) => {
      if (!isRecord(value) || typeof value.id !== "string") return []
      return [[key, {
        ...value,
        id: value.id,
        lastSeen: asFiniteNumber(value.lastSeen),
        correctCount: asFiniteNumber(value.correctCount),
        incorrectCount: asFiniteNumber(value.incorrectCount),
      } as QuestionPracticeDetail]]
    }),
  )
}

export function needsReinforcement(detail: QuestionPracticeDetail): boolean {
  if (detail.incorrectCount <= 0) return false
  if (detail.lastResult) return detail.lastResult === "incorrect" || !detail.resolvedAt
  return detail.incorrectCount > detail.correctCount
}

export function readReinforcementQuestionIds(topicId: TopicId): string[] {
  return Object.values(readTopicDetails(topicId))
    .filter(needsReinforcement)
    .sort((a, b) => {
      const aRepeated = a.consecutiveIncorrect ?? Math.max(0, a.incorrectCount - a.correctCount)
      const bRepeated = b.consecutiveIncorrect ?? Math.max(0, b.incorrectCount - b.correctCount)
      return bRepeated - aRepeated || b.lastSeen - a.lastSeen
    })
    .map((detail) => detail.id)
}

export function saveReinforcementResult(result: ReinforcementResult): void {
  const details = readTopicDetails(result.topicId)
  const previous = details[result.questionId] ?? {
    id: result.questionId,
    lastSeen: Date.now(),
    correctCount: 0,
    incorrectCount: 0,
  }
  const now = Date.now()
  const consecutiveCorrect = result.isCorrect ? (previous.consecutiveCorrect ?? 0) + 1 : 0

  details[result.questionId] = {
    ...previous,
    lastSeen: now,
    correctCount: previous.correctCount + Number(result.isCorrect),
    incorrectCount: previous.incorrectCount + Number(!result.isCorrect),
    lastResult: result.isCorrect ? "correct" : "incorrect",
    consecutiveCorrect,
    consecutiveIncorrect: result.isCorrect ? 0 : (previous.consecutiveIncorrect ?? 0) + 1,
    lastMode: "reinforcement",
    lastUserAnswer: result.userAnswer ?? null,
    correctAnswer: result.correctAnswer ?? null,
    nextReviewAt: result.isCorrect && consecutiveCorrect >= 2
      ? now + 24 * 60 * 60 * 1000
      : now,
    resolvedAt: result.isCorrect && consecutiveCorrect >= 2 ? now : null,
  }

  writeStorage(`interview_mastery_detail_${result.topicId}`, details)
}

export function readRecentLearningActivity(): RecentLearningActivity | null {
  const stored = safeParse<unknown>(
    readStorage(RECENT_ACTIVITY_KEY),
    null,
  )
  return isRecord(stored)
    && stored.version === 1
    && typeof stored.industry === "string"
    && typeof stored.topicId === "string"
    && typeof stored.updatedAt === "string"
    ? stored as unknown as RecentLearningActivity
    : null
}

export function saveRecentLearningActivity(
  activity: Omit<RecentLearningActivity, "version" | "updatedAt">,
): void {
  const value: RecentLearningActivity = {
    version: 1,
    ...activity,
    updatedAt: new Date().toISOString(),
  }
  writeStorage(RECENT_ACTIVITY_KEY, value)
}

export function saveSelfIntroductionCompletion(): void {
  const topicId: TopicId = "introduction"
  const questionId = "self-introduction-40-seconds"
  const now = Date.now()
  const mastery = readMasteredQuestionIds()
  mastery[topicId] = Array.from(new Set([...(mastery[topicId] ?? []), questionId]))
  writeStorage(LEGACY_MASTERY_KEY, mastery)

  const details = readTopicDetails(topicId)
  const previous = details[questionId]
  details[questionId] = {
    id: questionId,
    lastSeen: now,
    correctCount: (previous?.correctCount ?? 0) + 1,
    incorrectCount: previous?.incorrectCount ?? 0,
  }
  writeStorage(`interview_mastery_detail_${topicId}`, details)
}

export function readSelfIntroductionDraft(): StoredSelfIntroductionDraft | null {
  const stored = safeParse<unknown>(
    readStorage(SELF_INTRODUCTION_DRAFT_KEY),
    null,
  )
  return isRecord(stored)
    && stored.version === 1
    && (stored.mode === "experienced" || stored.mode === "beginner")
    && isRecord(stored.profile)
    && typeof stored.text === "string"
    && typeof stored.updatedAt === "string"
    ? stored as unknown as StoredSelfIntroductionDraft
    : null
}

export function saveSelfIntroductionDraft(
  draft: Omit<StoredSelfIntroductionDraft, "version" | "updatedAt">,
): StoredSelfIntroductionDraft {
  const value: StoredSelfIntroductionDraft = {
    version: 1,
    ...draft,
    updatedAt: new Date().toISOString(),
  }
  writeStorage(SELF_INTRODUCTION_DRAFT_KEY, value)
  return value
}

export function readExamHistory(industry?: string): StoredExamResult[] {
  const parsed = safeParse<unknown>(
    readStorage(EXAM_HISTORY_KEY),
    [],
  )
  const history = Array.isArray(parsed)
    ? parsed.filter((item): item is StoredExamResult =>
      isRecord(item)
      && typeof item.id === "string"
      && typeof item.industry === "string"
      && typeof item.score === "number"
      && typeof item.totalScore === "number"
      && typeof item.completedAt === "string",
    )
    : []
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
    id: typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    completedAt: new Date().toISOString(),
  }
  writeStorage(EXAM_HISTORY_KEY, [value, ...history].slice(0, 20))
}
