export const LEARNING_CLUSTER_LOCKED = true

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
