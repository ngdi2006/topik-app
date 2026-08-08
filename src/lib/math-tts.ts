export const MATH_TTS_PROFILE = 'math-paced-v1' as const

const BREAK_SHORT = '<break time="0.35s" />'
const BREAK_MEDIUM = '<break time="0.55s" />'
const BREAK_OPERATOR = '<break time="0.7s" />'

const UNIT_BOUNDARY_PATTERN =
    /(킬로미터|센티미터|밀리미터|킬로그램|미터|그램|시간|분|초|톤|리터|밀리리터)(?=\s+[가-힣])/g
const RANGE_PATTERN = /(부터|까지)(?=\s|몇)/g
const QUESTION_PATTERN = /\s+(?=(몇|얼마)(?:\s|입|나|예))/g
const BREAK_PATTERN = /<break time="[\d.]+s" \/>/g
const ADJACENT_BREAK_PATTERN =
    /<break time="[\d.]+s" \/>\s*<break time="[\d.]+s" \/>/g

export function toMathPacedText(text: string) {
    const normalized = text.replace(/\s+/g, ' ').trim()
    if (!normalized) return normalized

    return normalized
        .replace(
            /\s*(더하기|빼기|곱하기|나누기)\s*/g,
            ` ${BREAK_MEDIUM} $1 ${BREAK_OPERATOR} `,
        )
        .replace(UNIT_BOUNDARY_PATTERN, `$1 ${BREAK_SHORT}`)
        .replace(RANGE_PATTERN, `$1 ${BREAK_MEDIUM}`)
        .replace(QUESTION_PATTERN, ` ${BREAK_MEDIUM} `)
        .replace(ADJACENT_BREAK_PATTERN, BREAK_MEDIUM)
        .replace(/\s+/g, ' ')
        .trim()
}

export function hasMathPacing(text: string) {
    return toMathPacedText(text) !== text.replace(/\s+/g, ' ').trim()
}

export function stripSpeechBreaks(text: string) {
    return text.replace(BREAK_PATTERN, ' ').replace(/\s+/g, ' ').trim()
}

export function countSpeechBreaks(text: string) {
    return toMathPacedText(text).match(BREAK_PATTERN)?.length ?? 0
}
