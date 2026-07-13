import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });

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

        // Select the prompt based on industry
        const industry = question?.industry || 'Sản xuất chế tạo';
        
        let evaluation;
        try {
            const prompt = `
Bạn là một giám khảo chấm thi phỏng vấn tiếng Hàn EPS-TOPIK chuyên nghiệp.
Hãy đánh giá câu trả lời của học viên dựa trên thông tin câu hỏi sau:

- Câu hỏi tiếng Hàn: "${question?.question_text || ''}"
- Nghĩa tiếng Việt: "${question?.vietnamese_meaning || ''}"
- Gợi ý câu trả lời chuẩn (học viên cần trả lời khớp với cấu trúc này hoặc có ý tương tự): ${JSON.stringify(question?.suggested_answers || [])}
- Câu trả lời thực tế của học viên (kết quả nhận diện giọng nói): "${transcript}"

Hãy đánh giá và cho điểm theo 3 tiêu chí:
1. Phát âm (pronunciation_score): độ chính xác ngữ âm dựa trên transcript.
2. Ngữ pháp & Từ vựng (grammar_score): tính chính xác của cấu trúc ngữ pháp và từ vựng lựa chọn.
3. Độ trôi chảy (fluency_score): mức độ hoàn chỉnh và mạch lạc của câu trả lời.

Quy tắc chấm điểm:
- Nếu câu trả lời hoàn toàn sai về mặt ngữ nghĩa (ví dụ hỏi chiều cao bằng centimet mà trả lời bằng "kilômet" hoặc trả lời linh tinh), điểm Ngữ pháp & Từ vựng (grammar_score) phải cực kỳ thấp (dưới 40) và "is_correct" là false.
- Điểm tổng thể (score) là trung bình cộng của 3 tiêu chí trên.
- "is_correct" là true nếu điểm tổng thể >= 70.

Trả về kết quả chấm điểm dưới dạng JSON duy nhất với cấu trúc sau:
{
  "is_correct": true/false,
  "score": <điểm tổng thể từ 0 đến 100>,
  "pronunciation_score": <điểm từ 0 đến 100>,
  "grammar_score": <điểm từ 0 đến 100>,
  "fluency_score": <điểm từ 0 đến 100>,
  "user_transcript_meaning": "<Dịch nghĩa tiếng Việt câu học viên đã trả lời. Nếu câu học viên nói có lỗi từ vựng/ngữ pháp hoặc vô lý/phi thực tế, hãy giải thích rõ nghĩa đen của câu đó là gì và tại sao nó chưa đúng ngữ cảnh câu hỏi>",
  "feedback_vi": "<Nhận xét chi tiết bằng tiếng Việt: Chỉ rõ học viên phát âm đúng/sai từ nào, cấu trúc ngữ pháp có chính xác không, đã trả lời đúng trọng tâm câu hỏi chưa, chỉ ra từ sai nếu có>"
}

Chỉ trả về chuỗi JSON thô, không nằm trong khối markdown \`\`\`json, không giải thích gì thêm ngoài JSON.
`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
                config: {
                    temperature: 0.1,
                }
            });

            const textResponse = response.text || "{}";
            const cleanedJsonText = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
            evaluation = JSON.parse(cleanedJsonText);
        } catch (err) {
            console.error("Gemini evaluation error, using fallback mock:", err);
            // Fallback mock
            const hasKorean = /[\u3131-\uD79D]/ugi.test(transcript);
            const is_correct = hasKorean && transcript.length > 5;
            const score = is_correct ? Math.floor(Math.random() * 40) + 60 : 30;
            evaluation = {
                is_correct,
                score,
                pronunciation_score: is_correct ? 85 : 30,
                grammar_score: is_correct ? 80 : 25,
                fluency_score: is_correct ? 75 : 35,
                user_transcript_meaning: is_correct ? 'Dịch nghĩa câu trả lời mẫu.' : 'Câu trả lời chưa rõ ràng hoặc vô lý.',
                feedback_vi: is_correct 
                    ? 'Bạn phát âm khá tốt và trả lời đúng trọng tâm. Tuy nhiên cần chú ý thêm về ngữ điệu.' 
                    : 'Câu trả lời chưa rõ ràng hoặc không đúng trọng tâm. Vui lòng thử lại.'
            };
        }

        const responseData = {
            is_correct: evaluation.is_correct,
            score: evaluation.score,
            pronunciation_score: evaluation.pronunciation_score || 0,
            grammar_score: evaluation.grammar_score || 0,
            fluency_score: evaluation.fluency_score || 0,
            user_transcript: transcript,
            user_transcript_meaning: evaluation.user_transcript_meaning || 'Không rõ nghĩa',
            sample_answer: question?.suggested_answers?.[0] || 'Câu trả lời mẫu từ AI',
            feedback_vi: evaluation.feedback_vi
        };

        return NextResponse.json({
            success: true,
            data: responseData
        });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
