/**
 * Text sent to TTS can differ from the learner-facing spelling.
 * Keep this list narrow and reviewed: it is a pronunciation dictionary,
 * not a general Korean spelling normalizer.
 */
const KOREAN_TTS_OVERRIDES = new Map<string, string>([
    ['테이블톱과 날물', '테이블 톱과 날물'],
    ['암나사(너트)', '암나사, 너트'],
    ['수나사(볼트)', '수나사, 볼트'],
    ['누전차단기', '누전 차단, 기'],
    ['파렛트', '팔레트'],
    ['리머', '리모'],
    ['마대', '마, 테'],
    ['줄', '줄.'],
    ['자', '자.'],
] as const)

export const KOREAN_PRONUNCIATION_VERSION = 'ko-vocab-v3'

export function toKoreanPronunciationText(text: string) {
    const normalized = text.trim()
    const override = KOREAN_TTS_OVERRIDES.get(normalized)
    if (override) return override

    return normalized
}
