// =====================================================================
// TOPIK-IBT: AI Exam Analyzer - Phân tích kết quả thi và gợi ý học tập
// =====================================================================

import { GoogleGenAI } from '@google/genai'
import type {
    QuestionSnapshot,
    ExamAnalysis,
    WeakArea,
    Recommendation,
    VocabularyItem,
    GrammarPoint,
} from '@/types/exam'

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || 'placeholder',
})

/**
 * Phân tích câu sai và extract vocabulary + grammar
 */
export async function analyzeWrongQuestions(
    wrongQuestions: QuestionSnapshot[]
): Promise<{
    vocabulary: VocabularyItem[]
    grammar: GrammarPoint[]
    summary: string
}> {
    if (wrongQuestions.length === 0) {
        return {
            vocabulary: [],
            grammar: [],
            summary: 'Bạn đã làm đúng tất cả câu hỏi! Xuất sắc!',
        }
    }

    const questionsText = wrongQuestions
        .map((q, idx) => {
            let text = `Câu ${idx + 1}:\n`
            if (q.passage) text += `Đoạn văn: ${q.passage}\n`
            text += `Câu hỏi: ${q.question_text}\n`
            text += `Đáp án đúng: ${q.options[q.correct_answer]?.content}\n`
            return text
        })
        .join('\n---\n')

    const prompt = `
Phân tích các câu hỏi tiếng Hàn sau mà học viên đã làm SAI.
Trích xuất:
1. 10 từ vựng quan trọng nhất (từ tiếng Hàn, nghĩa tiếng Việt, ví dụ)
2. 5 điểm ngữ pháp chính (pattern, giải thích tiếng Việt, ví dụ)
3. Tóm tắt ngắn gọn điểm yếu của học viên (bằng tiếng Việt)

Câu hỏi:
${questionsText}

Trả về JSON format:
{
  "vocabulary": [
    {"word":"안녕하세요","meaning":"xin chào","example":"안녕하세요? 저는 학생입니다."},
    ...
  ],
  "grammar": [
    {"pattern":"V + 고 싶다","explanation":"muốn làm gì","example":"한국에 가고 싶어요."},
    ...
  ],
  "summary": "Học viên cần cải thiện về..."
}
`

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                temperature: 0.3,
            },
        })

        const text = response.text || '{}'
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
        const result = JSON.parse(cleaned)

        return {
            vocabulary: result.vocabulary || [],
            grammar: result.grammar || [],
            summary: result.summary || 'Phân tích không thành công',
        }
    } catch (error) {
        console.error('AI Analysis Error:', error)
        return {
            vocabulary: [],
            grammar: [],
            summary: 'Lỗi phân tích AI. Vui lòng thử lại sau.',
        }
    }
}

/**
 * Phân tích weak/strong areas theo type và tags
 */
export function analyzeAreas(
    questions: QuestionSnapshot[],
    answers: Record<string, number>
): { weakAreas: WeakArea[]; strongAreas: any[] } {
    const stats: Record<
        string,
        { total: number; wrong: number; correct: number }
    > = {}

    // Count by type
    questions.forEach((q) => {
        const key = q.question_type
        if (!stats[key]) stats[key] = { total: 0, wrong: 0, correct: 0 }
        stats[key].total++

        const userAnswer = answers[q.id]
        if (userAnswer !== q.correct_answer) {
            stats[key].wrong++
        } else {
            stats[key].correct++
        }
    })

    // Weak areas: error_rate > 40%
    const weakAreas: WeakArea[] = Object.entries(stats)
        .filter(([_, s]) => s.wrong / s.total > 0.4)
        .map(([type, s]) => ({
            type,
            error_rate: s.wrong / s.total,
            count: s.wrong,
        }))

    // Strong areas: success_rate > 80%
    const strongAreas = Object.entries(stats)
        .filter(([_, s]) => s.correct / s.total > 0.8)
        .map(([type, s]) => ({
            type,
            success_rate: s.correct / s.total,
            count: s.correct,
        }))

    return { weakAreas, strongAreas }
}

/**
 * Generate recommendations dựa trên weak areas
 */
export function generateRecommendations(
    wrongQuestions: QuestionSnapshot[],
    weakAreas: WeakArea[]
): Recommendation[] {
    const recommendations: Recommendation[] = []

    // 1. Làm lại câu sai (max 10)
    if (wrongQuestions.length > 0) {
        recommendations.push({
            type: 'retry',
            title: 'Làm lại câu sai',
            description: `Ôn lại ${Math.min(wrongQuestions.length, 10)} câu bạn đã làm sai`,
            question_ids: wrongQuestions.slice(0, 10).map((q) => q.id),
            count: Math.min(wrongQuestions.length, 10),
        })
    }

    // 2. Luyện tập câu tương tự cho weak areas
    weakAreas.forEach((area) => {
        const typeName = area.type === 'reading' ? 'Đọc hiểu' : 'Nghe hiểu'
        recommendations.push({
            type: 'similar',
            title: `Luyện tập ${typeName}`,
            description: `Làm thêm 10 câu ${typeName} để cải thiện (tỷ lệ sai: ${Math.round(area.error_rate * 100)}%)`,
            filters: { type: area.type as any },
            count: 10,
        })
    })

    // 3. Quiz từ vựng
    if (wrongQuestions.length > 0) {
        recommendations.push({
            type: 'vocabulary_quiz',
            title: 'Quiz từ vựng',
            description: 'Kiểm tra 10 từ vựng từ câu sai',
            count: 10,
        })
    }

    // 4. Quiz ngữ pháp
    if (wrongQuestions.length > 0) {
        recommendations.push({
            type: 'grammar_quiz',
            title: 'Quiz ngữ pháp',
            description: 'Luyện tập ngữ pháp liên quan',
            count: 10,
        })
    }

    return recommendations
}
