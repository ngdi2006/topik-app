// =====================================================================
// API: Submit Exam - Grade & AI Analysis
// =====================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gradeExam } from '@/lib/exam/grader'
import {
    analyzeWrongQuestions,
    analyzeAreas,
    generateRecommendations,
} from '@/lib/ai/exam-analyzer'

export async function POST(request: Request) {
    try {
        const { attempt_id, answers } = await request.json()

        if (!attempt_id || !answers) {
            return NextResponse.json(
                { success: false, error: 'Thiếu attempt_id hoặc answers' },
                { status: 400 }
            )
        }

        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const adminClient = createAdminClient()

        // 1. Lấy attempt
        const { data: attempt, error: attemptError } = await adminClient
            .from('exam_attempts')
            .select('*')
            .eq('id', attempt_id)
            .eq('user_id', user.id)
            .single()

        if (attemptError || !attempt) {
            return NextResponse.json(
                { success: false, error: 'Phiên thi không tồn tại' },
                { status: 404 }
            )
        }

        if (attempt.status === 'completed') {
            return NextResponse.json(
                { success: false, error: 'Phiên thi đã được nộp' },
                { status: 400 }
            )
        }

        const questions = attempt.questions_snapshot

        // 2. Chấm điểm
        const result = gradeExam(questions, answers)

        // 3. Update attempt
        await adminClient
            .from('exam_attempts')
            .update({
                answers,
                score: result.score,
                total_points: result.total_points,
                correct_count: result.correct_count,
                wrong_count: result.wrong_count,
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', attempt_id)

        // 4. Phân tích AI (synchronous - learner thấy ngay)
        const wrongQuestions = questions.filter(
            (q: any) => answers[q.id] !== q.correct_answer
        )
        const { weakAreas, strongAreas } = analyzeAreas(questions, answers)
        const recommendations = generateRecommendations(wrongQuestions, weakAreas)

        // AI extract vocabulary & grammar (có thể chậm do API call)
        let aiResult: {
            vocabulary: any[]
            grammar: any[]
            summary: string
        } = {
            vocabulary: [],
            grammar: [],
            summary: '',
        }

        try {
            aiResult = await analyzeWrongQuestions(wrongQuestions)
        } catch (aiError) {
            console.error('AI analysis failed:', aiError)
            // Vẫn tiếp tục, không block result
        }

        // 5. Lưu analysis
        const { data: analysis, error: analysisError } = await adminClient
            .from('exam_analysis')
            .insert({
                attempt_id,
                user_id: user.id,
                weak_areas: weakAreas,
                strong_areas: strongAreas,
                recommendations,
                vocabulary_list: aiResult.vocabulary,
                grammar_points: aiResult.grammar,
                ai_summary: aiResult.summary,
            })
            .select()
            .single()

        if (analysisError) {
            console.error('Analysis insert error:', analysisError)
        }

        return NextResponse.json({
            success: true,
            result: {
                score: result.score,
                total_points: result.total_points,
                correct_count: result.correct_count,
                wrong_count: result.wrong_count,
                percentage: Math.round(result.percentage * 100) / 100,
            },
            attempt_id,
            analysis_id: analysis?.id,
        })
    } catch (error: any) {
        console.error('Submit exam error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
