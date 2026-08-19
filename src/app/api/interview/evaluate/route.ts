import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { consumeInterviewAiQuota, getInterviewAccess } from '@/features/interview-access/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });

const UNKNOWN_ANSWER_PATTERN = /^(모릅니다|모르겠습니다|잘모릅니다|잘모르겠습니다|몰라요|모르겠어요)$/

function normalizeAnswer(value: string) {
    return value
        .normalize('NFC')
        .toLowerCase()
        .replace(/[\s.,!?~'"“”‘’…_-]/g, '')
}

function zeroScoreEvaluation(reason: string, meaning = 'Không biết hoặc không hiểu câu hỏi.') {
    return {
        is_correct: false,
        score: 0,
        pronunciation_score: 0,
        grammar_score: 0,
        fluency_score: 0,
        answer_status: 'unknown',
        is_relevant: false,
        is_intelligible: true,
        user_transcript_meaning: meaning,
        feedback_vi: reason,
    }
}

function clampScore(value: unknown) {
    const score = Number(value)
    return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0
}

export async function POST(request: Request) {
    const startedAt = Date.now()
    try {
        const body = await request.json()
        const { question_id, transcript } = body

        if (!question_id || !transcript) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập' }, { status: 401 })

        const access = await getInterviewAccess(supabase, user)
        if (!access.hasFullAccess) {
            return NextResponse.json({ success: false, code: 'INTERVIEW_SUBSCRIPTION_REQUIRED', error: 'Tính năng AI cần gói Vòng 2 đang hoạt động' }, { status: 403 })
        }
        // Fetch question details for context
        const { data: question } = await supabase
            .from('interview_questions')
            .select('*')
            .eq('id', question_id)
            .single()

        const normalizedTranscript = normalizeAnswer(String(transcript))
        if (UNKNOWN_ANSWER_PATTERN.test(normalizedTranscript)) {
            return NextResponse.json({
                success: true,
                data: {
                    ...zeroScoreEvaluation('Câu trả lời có nghĩa “Tôi không biết”, vì vậy câu này không có điểm.'),
                    user_transcript: transcript,
                    sample_answer: question?.suggested_answers?.[0] || 'Câu trả lời mẫu từ AI',
                },
                quota: null,
            })
        }

        const quota = await consumeInterviewAiQuota(supabase, user.id)
        if (!quota.allowed) {
            return NextResponse.json({ success: false, code: 'AI_DAILY_LIMIT_REACHED', error: `Bạn đã dùng hết ${quota.limit} lượt AI hôm nay`, quota }, { status: 429 })
        }

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
- Trước tiên phân loại answer_status là một trong: "valid", "unknown", "unintelligible", "off_topic".
- "모릅니다", "모르겠습니다", "몰라요" và mọi câu mang nghĩa không biết/không hiểu: answer_status="unknown", tất cả điểm bằng 0.
- Câu nhận diện không thành từ/câu tiếng Hàn có nghĩa hoặc phát âm quá mơ hồ: answer_status="unintelligible", tất cả điểm bằng 0.
- Câu không trả lời đúng chủ đề, chỉ chào hỏi hoặc nói nội dung khác: answer_status="off_topic", tất cả điểm bằng 0.
- Chỉ answer_status="valid" mới được chấm điểm thành phần. Câu trả lời sai một phần nhưng vẫn đúng chủ đề có thể nhận điểm một phần.
- Điểm tổng thể (score) là trung bình cộng của 3 tiêu chí trên.
- "is_correct" là true nếu điểm tổng thể >= 70.

Trả về kết quả chấm điểm dưới dạng JSON duy nhất với cấu trúc sau:
{
  "is_correct": true/false,
  "score": <điểm tổng thể từ 0 đến 100>,
  "pronunciation_score": <điểm từ 0 đến 100>,
  "grammar_score": <điểm từ 0 đến 100>,
  "fluency_score": <điểm từ 0 đến 100>,
  "answer_status": "valid|unknown|unintelligible|off_topic",
  "is_relevant": true/false,
  "is_intelligible": true/false,
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
            console.error('Gemini evaluation error:', err)
            return NextResponse.json({
                success: false,
                code: 'EVALUATION_UNAVAILABLE',
                error: 'Chưa thể chấm câu trả lời một cách tin cậy. Vui lòng thử lại.',
                quota,
            }, { status: 503 })
        }

        const answerStatus = String(evaluation.answer_status || 'valid')
        const rawScore = clampScore(evaluation.score)
        const mustScoreZero = ['unknown', 'unintelligible', 'off_topic'].includes(answerStatus)
            || evaluation.is_relevant === false
            || evaluation.is_intelligible === false
            || rawScore < 20

        if (mustScoreZero) {
            const originalFeedback = String(evaluation.feedback_vi || '').replace(/\*\*/g, '').trim()
            evaluation = {
                ...zeroScoreEvaluation(
                    originalFeedback || 'Câu trả lời không rõ nghĩa hoặc không đúng trọng tâm nên không có điểm.',
                    evaluation.user_transcript_meaning || 'Không xác định được ý nghĩa phù hợp.',
                ),
                answer_status: answerStatus,
            }
        }

        const responseData = {
            is_correct: mustScoreZero ? false : Boolean(evaluation.is_correct),
            score: mustScoreZero ? 0 : rawScore,
            pronunciation_score: mustScoreZero ? 0 : clampScore(evaluation.pronunciation_score),
            grammar_score: mustScoreZero ? 0 : clampScore(evaluation.grammar_score),
            fluency_score: mustScoreZero ? 0 : clampScore(evaluation.fluency_score),
            user_transcript: transcript,
            user_transcript_meaning: evaluation.user_transcript_meaning || 'Không rõ nghĩa',
            sample_answer: question?.suggested_answers?.[0] || 'Câu trả lời mẫu từ AI',
            feedback_vi: String(evaluation.feedback_vi || '').replace(/\*\*/g, '')
        };

        void createAdminClient().from('interview_api_usage_logs').insert({
            user_id: user.id,
            feature: 'interview_evaluation',
            provider: 'google_gemini',
            character_count: transcript.length,
            status: 'success',
            latency_ms: Date.now() - startedAt,
        }).then(({ error }) => {
            if (error) console.warn('Failed to log interview AI usage:', error.message)
        })

        return NextResponse.json({
            success: true,
            data: responseData,
            quota
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Không thể chấm điểm'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}
