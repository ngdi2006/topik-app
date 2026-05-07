// =====================================================================
// TOPIK-IBT: Exam Grading Logic
// =====================================================================

import type { QuestionSnapshot, GradingResult } from '@/types/exam'

export function gradeExam(
    questions: QuestionSnapshot[],
    answers: Record<string, number>
): GradingResult {
    let score = 0
    let totalPoints = 0
    let correctCount = 0
    let wrongCount = 0
    const details: GradingResult['details'] = []

    for (const question of questions) {
        const userAnswer = answers[question.id]
        const isCorrect = userAnswer === question.correct_answer

        // Tính điểm cho câu này (ưu tiên points_override từ rule)
        const pointsPossible = question.points_override ?? question.points
        const pointsEarned = isCorrect ? pointsPossible : 0

        totalPoints += pointsPossible
        score += pointsEarned

        if (isCorrect) {
            correctCount++
        } else {
            wrongCount++
        }

        details.push({
            question_id: question.id,
            is_correct: isCorrect,
            points_earned: pointsEarned,
            points_possible: pointsPossible,
        })
    }

    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0

    return {
        score,
        total_points: totalPoints,
        correct_count: correctCount,
        wrong_count: wrongCount,
        percentage,
        details,
    }
}
