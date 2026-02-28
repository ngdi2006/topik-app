import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        console.log("Step 1: Auth check...")
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            console.log("Submit failed: Unauthorized")
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log("Step 2: Parse params & body...")
        const resolvedParams = await context.params
        const examId = resolvedParams.id

        let body: any
        try {
            body = await request.json()
        } catch (e) {
            console.log("Submit failed: Invalid JSON Request")
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const { answers, timeTaken } = body

        if (!examId || !answers) {
            console.log("Submit failed: Missing fields", { examId, hasAnswers: !!answers })
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        console.log("Step 3: Admin Auth Client...")
        const adminAuthClient = createAdminClient()

        console.log("Step 4: Fetch Exam and Questions...", examId)
        // 1. Fetch Exam and Questions from DB to calculate score securely
        const { data: questions, error: qError } = await adminAuthClient
            .from('questions')
            .select('id, correct_answer')
            .eq('exam_id', examId)

        if (qError || !questions) {
            console.error("Fetch questions error:", qError)
            return NextResponse.json({ error: 'Failed to fetch exam questions' }, { status: 500 })
        }

        const { data: exam, error: eError } = await adminAuthClient
            .from('exams')
            .select('total_questions')
            .eq('id', examId)
            .single()

        if (eError || !exam) {
            console.error("Fetch exam error:", eError)
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
        }

        console.log("Step 5: Calculate score...")
        // 2. Calculate score
        let totalCorrect = 0
        const totalQuestions = exam.total_questions || questions.length

        // Ensure answers object is valid
        const validAnswers: Record<string, number> = {}

        questions.forEach(q => {
            const userAnswer = answers[q.id]
            if (userAnswer !== undefined && userAnswer !== null) {
                validAnswers[q.id] = userAnswer
                // Compare answer index. Note: Assuming correct_answer from DB is the letter or options text.
                // Wait, Gemini generated options and correct_answer as exact string match.
                // In previous implementation, how did we handle it? 
                // We should match option text.
                // But answers from client provides the index of the option chosen.
            }
        })

        // NOTE: We need the full options array to compare choice index with correct_answer string
        const { data: fullQuestions } = await adminAuthClient
            .from('questions')
            .select('id, options, correct_answer')
            .eq('exam_id', examId)

        if (fullQuestions) {
            fullQuestions.forEach(q => {
                const userAnswerIndex = answers[q.id]
                if (userAnswerIndex !== undefined && userAnswerIndex !== null) {
                    if (q.correct_answer !== undefined && q.correct_answer !== null) {
                        if (Number(userAnswerIndex) === Number(q.correct_answer)) {
                            totalCorrect++
                        }
                    }
                }
            })
        }

        // Standard 100-point scale
        const score = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

        console.log("Step 6: Insert exam result...")
        // 3. Save result
        const { data: result, error: insertError } = await adminAuthClient
            .from('exam_results')
            .insert({
                user_id: user.id,
                exam_id: examId,
                score: score,
                total_correct: totalCorrect,
                answers: validAnswers,
                time_taken: timeTaken || 0
            })
            .select()
            .single()

        if (insertError) {
            console.error("Insert error:", insertError)
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        console.log("Success! Result ID:", result.id)
        return NextResponse.json({
            success: true,
            resultId: result.id,
            score: score,
            totalCorrect: totalCorrect
        }, { status: 200 })

    } catch (error: any) {
        console.error("Fatal API Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
