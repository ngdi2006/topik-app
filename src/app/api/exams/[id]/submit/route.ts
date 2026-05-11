// =====================================================================
// API: Submit Exam - Grade from saved answers in exam_answers table
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

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const body = await request.json()
        const { attemptId } = body

        if (!attemptId) {
            return NextResponse.json(
                { success: false, error: 'Thiếu attemptId' },
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

        // 1. Get attempt
        const { data: attempt, error: attemptError } = await adminClient
            .from('exam_attempts')
            .select('*')
            .eq('id', attemptId)
            .eq('user_id', user.id)
            .eq('exam_id', params.id)
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

        // 2. Get saved answers from exam_answers table
        const { data: savedAnswers, error: answersError } = await adminClient
            .from('exam_answers')
            .select('*')
            .eq('attempt_id', attemptId)

        if (answersError) {
            console.error('Error fetching answers:', answersError)
        }

        // 3. Convert saved answers to format for grader
        // grader expects: { questionId: optionIndex }
        const answersMap: Record<string, number> = {}
        if (savedAnswers && savedAnswers.length > 0) {
            savedAnswers.forEach((ans: any) => {
                if (ans.selected_option !== null && ans.selected_option !== undefined) {
                    answersMap[ans.question_id] = ans.selected_option
                }
            })
        }

        // 4. Grade exam
        const result = gradeExam(questions, answersMap)

        // 5. Update attempt
        await adminClient
            .from('exam_attempts')
            .update({
                score: result.score,
                total_points: result.total_points,
                correct_count: result.correct_count,
                wrong_count: result.wrong_count,
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', attemptId)

        // 6. AI Analysis (synchronous)
        const wrongQuestions = questions.filter(
            (q: any) => answersMap[q.id] !== q.correct_answer
        )
        const { weakAreas, strongAreas } = analyzeAreas(questions, answersMap)
        const recommendations = generateRecommendations(wrongQuestions, weakAreas)

        // AI extract vocabulary & grammar (may be slow due to API call)
        let aiResult: {
            vocabulary: any[]
            grammar: any[]
            summary: string
        } = {
            vocabulary: [],
            grammar: [],
            summary: '',
        }

        // try {
        //     aiResult = await analyzeWrongQuestions(wrongQuestions)
        // } catch (aiError) {
        //     console.error('AI analysis failed:', aiError)
        //     // Continue without blocking
        // }

        // 7. Save analysis
        const { data: analysis, error: analysisError } = await adminClient
            .from('exam_analysis')
            .insert({
                attempt_id: attemptId,
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
                percentage: Math.round((result.score / result.total_points) * 10000) / 100,
            },
            attempt_id: attemptId,
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
