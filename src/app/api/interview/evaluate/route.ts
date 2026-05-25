import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { question_id, transcript } = body

        if (!question_id || !transcript) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin' }, { status: 400 })
        }

        // Fetch question details for context
        const supabase = await createClient()
        const { data: question } = await supabase
            .from('interview_questions')
            .select('*')
            .eq('id', question_id)
            .single()

        // Fetch global prompt and industry prompts
        const { data: settings } = await supabase
            .from('system_settings')
            .select('ai_global_prompt, industry_prompts')
            .eq('id', 1)
            .single()

        // HERE: Integration with OpenAI / AI Engine goes here
        // Select the prompt based on industry
        const industry = question?.industry || 'Sản xuất chế tạo';
        const aiPrompt = settings?.industry_prompts?.[industry] || settings?.ai_global_prompt || 'Bạn là giám khảo...';
        
        // For now, we simulate an AI evaluation with a mock response
        
        // --- MOCK AI PROCESSING ---
        await new Promise(resolve => setTimeout(resolve, 2000)) // Fake latency
        
        // Simple mock logic: if transcript contains korean characters, we give it a random score
        const hasKorean = /[\u3131-\uD79D]/ugi.test(transcript)
        const is_correct = hasKorean && transcript.length > 5
        const score = is_correct ? Math.floor(Math.random() * 40) + 60 : 30
        
        const mockResponse = {
            is_correct,
            score,
            user_transcript: transcript,
            sample_answer: question?.suggested_answers?.[0] || 'Câu trả lời mẫu từ AI',
            feedback_vi: is_correct 
                ? 'Bạn phát âm khá tốt và trả lời đúng trọng tâm. Tuy nhiên cần chú ý thêm về ngữ điệu.' 
                : 'Câu trả lời chưa rõ ràng hoặc không đúng trọng tâm. Vui lòng thử lại.'
        }
        // --------------------------

        return NextResponse.json({
            success: true,
            data: mockResponse
        })

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
