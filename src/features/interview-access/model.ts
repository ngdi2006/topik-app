export type InterviewTopicId = 'introduction' | 'command' | 'vocabulary' | 'math' | 'tools' | 'communication' | 'situation' | 'safety'

export interface InterviewAccessSnapshot {
    authenticated: boolean
    hasFullAccess: boolean
    source: 'free' | 'sepay' | 'admin_internal' | 'promotion'
    expiresAt: string | null
    daysRemaining: number
    deviceLimit: 1 | 2
    ai: { used: number; limit: number; remaining: number }
    freeLimits: { command: number; vocabulary: number; sign: number }
}

export const INTERVIEW_FREE_LIMITS = Object.freeze({ command: 5, vocabulary: 5, sign: 5 })

export function canAccessInterviewTopic(access: InterviewAccessSnapshot, topicId: InterviewTopicId) {
    if (topicId === 'introduction') return true
    if (topicId === 'command' || topicId === 'vocabulary') return true
    return access.hasFullAccess
}
