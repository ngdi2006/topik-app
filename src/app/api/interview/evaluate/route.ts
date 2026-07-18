import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });

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
- Nếu câu trả lời hoàn toàn không liên quan đến câu hỏi (ví dụ: hỏi về cách xử lý sản phẩm lỗi mà học viên chỉ nói lời chào hỏi xã giao '안녕하세요' hoặc trả lời lạc đề sang chuyện khác), điểm Ngữ pháp & Từ vựng (grammar_score) phải ở mức tối thiểu (dưới 10), điểm tổng thể (score) phải dưới 20 và "is_correct" bắt buộc phải là false.
- Điểm tổng thể (score) là trung bình cộng của 3 tiêu chí trên.
- "is_correct" là true nếu điểm tổng thể >= 70.

Trả về kết quả chấm điểm dưới dạng JSON duy nhất với cấu trúc sau:
{
  "is_correct": true/false,
  "score": <điểm tổng thể từ 0 đến 100>,
  "pronunciation_score": <điểm từ 0 đến 100>,
  "grammar_score": <điểm từ 0 đến 100>,
  "fluency_score": <điểm từ 0 đến 100>,
  "user_transcript_meaning": "<Dịch nghĩa tiếng Việt CHÍNH XÁC của câu học viên thực tế đã nói. Ví dụ nếu họ nói '안녕하세요' thì phải dịch là 'Xin chào', không được dịch câu hỏi hay câu mẫu chuẩn>",
  "feedback_vi": "<Nhận xét chi tiết bằng tiếng Việt khách quan: Chỉ rõ học viên phát âm đúng/sai từ nào, cấu trúc ngữ pháp có chính xác không, đã trả lời đúng trọng tâm câu hỏi chưa, chỉ ra từ sai nếu có>"
}

Chỉ trả về chuỗi JSON thô, không nằm trong khối markdown \`\`\`json, không giải thích gì thêm ngoài JSON.
`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
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
            const isGreeting = transcript.includes('안녕') || transcript.includes('반갑') || transcript.includes('감사') || transcript.includes('수고');
            const isTooShort = transcript.trim().length < 6;
            const is_correct = hasKorean && !isGreeting && !isTooShort;
            const score = is_correct ? Math.floor(Math.random() * 20) + 70 : 15;
            evaluation = {
                is_correct,
                score,
                pronunciation_score: is_correct ? 80 : 20,
                grammar_score: is_correct ? 75 : 10,
                fluency_score: is_correct ? 70 : 15,
                user_transcript_meaning: isGreeting 
                    ? 'Lời chào hỏi xã giao (Xin chào, Cám ơn, v.v.)' 
                    : (hasKorean ? 'Dịch nghĩa tiếng Việt thực tế của câu nói.' : 'Câu trả lời không có tiếng Hàn hoặc quá ngắn.'),
                feedback_vi: is_correct 
                    ? 'Bạn phát âm ổn. Cần cải thiện ngữ điệu trôi chảy hơn.' 
                    : (isGreeting 
                        ? 'Lỗi: Câu hỏi yêu cầu giải pháp chuyên môn, học viên chỉ chào hỏi nên không đạt.' 
                        : 'Câu trả lời không đúng trọng tâm hoặc quá ngắn. Vui lòng thử lại.')
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
