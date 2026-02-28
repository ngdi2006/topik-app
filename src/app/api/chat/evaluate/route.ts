import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai';
import { createAdminClient } from '@/lib/supabase/admin'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });

export async function POST(req: Request) {
    try {
        const { messages, scenario = "Giao tiếp cơ bản", userId } = await req.json();

        // Ensure we have messages to evaluate
        if (!messages || messages.length < 2) {
            return NextResponse.json({ error: "Không đủ dữ liệu hội thoại để phân tích." }, { status: 400 })
        }

        const prompt = `
Bạn là một chuyên gia đánh giá ngôn ngữ tiếng Hàn (TOPIK Examiner).
Hãy phân tích đoạn hội thoại sau giữa người học (user) và AI (assistant).
Chú ý đến từ vựng, ngữ pháp, và cách sử dụng kính ngữ của "user".

Trả về KẾT QUẢ PHÂN TÍCH DƯỚI DẠNG JSON với cấu trúc chính xác sau (CHÚ Ý CHỈ TRẢ VỀ JSON, TUYỆT ĐỐI KHÔNG GIẢI THÍCH THÊM):
{
  "score": <số nguyên từ 0 đến 100 đánh giá mức độ hoàn thành>,
  "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>"],
  "weaknesses": ["<điểm yếu/lỗi sai 1>", "<điểm yếu/lỗi sai 2>"],
  "advice": "<lời khuyên tổng thể để cải thiện kèm giải thích chi tiết>"
}
        `

        // Format messages for context
        const chatHistory = messages
            .filter((m: any) => m.role !== 'system')
            .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');

        const finalPrompt = prompt + "\n\nĐOẠN HỘI THOẠI:\n" + chatHistory;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: finalPrompt,
            config: {
                temperature: 0.1, // Low temperature for consistent JSON structure
            }
        });

        const textResponse = response.text || "{}";
        // Clean JSON formatting if Gemini included markdown
        const cleanedJsonText = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();

        const evaluation = JSON.parse(cleanedJsonText);

        // Lưu Điểm Report Card về Supabase (Database)
        if (userId) {
            const adminSupabase = createAdminClient();
            const { error: insertError } = await adminSupabase
                .from('chat_evaluations')
                .insert({
                    user_id: userId,
                    scenario: scenario,
                    score: evaluation.score,
                    strengths: evaluation.strengths,
                    weaknesses: evaluation.weaknesses,
                    advice: evaluation.advice
                });

            if (insertError) {
                console.error("Failed to save evaluation to DB:", insertError);
            }
        }

        return NextResponse.json(evaluation);

    } catch (error: any) {
        console.error("AI Evaluation Error:", error);
        return NextResponse.json({ error: "Lỗi phân tích hội thoại." }, { status: 500 });
    }
}
