export const LEARNING_CLUSTER_RELEASE_STATE =
    process.env.NEXT_PUBLIC_LEARNING_CLUSTER_RELEASE_STATE === 'released'
        ? 'released'
        : 'development'

// Fail closed: the learner-facing learning cluster stays unavailable unless
// production is explicitly configured with the released state.
export const LEARNING_CLUSTER_LOCKED = LEARNING_CLUSTER_RELEASE_STATE !== 'released'

export const LOCKED_LEARNING_PATH_PREFIXES = [
    '/elearning',
    '/textbooks',
    '/api/elearning',
    '/api/textbooks',
] as const

export function isLockedLearningPath(pathname: string) {
    return LEARNING_CLUSTER_LOCKED && LOCKED_LEARNING_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
}
