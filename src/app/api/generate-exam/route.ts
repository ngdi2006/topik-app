import { GoogleGenAI } from '@google/genai';
import { createAdminClient } from '@/lib/supabase/admin';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });

export async function POST(req: Request) {
    try {
        const { topic, level } = await req.json();

        const prompt = `
Bạn là một chuyên gia ra đề thi năng lực tiếng Hàn (TOPIK).
Hãy sinh ra 1 đề thi trắc nghiệm phần Đọc (Reading) gồm 3 câu hỏi. Chủ đề tập trung: ${topic || 'Đời sống hàng ngày'}. Cấp độ: ${level || 'TOPIK II'}.
Yêu cầu:
- Có 1 đoạn văn (passage) tiếng Hàn dài khoảng 5-7 câu.
- Cả 3 câu hỏi đều sử dụng chung 1 đoạn văn đó.
- Mỗi câu hỏi có 4 đáp án (A, B, C, D). Chỉ có 1 đáp án đúng (vị trí từ 0 đến 3).
- Bắt buộc phản hồi CHỈ bằng định dạng JSON cực chuẩn theo cấu trúc sau (không chứa các thẻ markdown code block):
{
  "title": "Tên đề thi ngắn gọn phù hợp chủ đề",
  "passage": "Nội dung đoạn văn tiếng Hàn",
  "questions": [
    {
      "question": "Nội dung câu hỏi tiếng Hàn?",
      "options": ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"],
      "correctAnswer": 0
    }
  ]
}
`
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt
        });

        let text = response.text || "{}";
        // Clean up markdown payload if the model adds it anyway
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const examData = JSON.parse(text);

        // Save to Database using Admin Client
        const supabase = createAdminClient();

        // 1. Insert Exam into public.exams
        const { data: examRecord, error: examError } = await supabase.from('exams').insert({
            title: examData.title || `AI Generated Test: ${topic}`,
            level: level || "TOPIK II",
            part_type: "Reading",
            duration: 30,
            total_questions: examData.questions?.length || 0,
            is_ai_generated: true,
            status: "Draft"
        }).select().single();

        if (examError || !examRecord) {
            throw new Error(examError?.message || "Lỗi tạo Table Exam trên DB.");
        }

        // 2. Insert array of Questions into public.questions
        if (examData.questions && examData.questions.length > 0) {
            const questionsToInsert = examData.questions.map((q: any, index: number) => ({
                exam_id: examRecord.id,
                question_text: q.question,
                options: q.options,
                correct_answer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
                passage: examData.passage || null,
                order_index: index + 1
            }));

            const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
            if (qError) throw new Error("Lỗi khi tạo mảng câu hỏi trên DB: " + qError.message);
        }

        return Response.json({ success: true, exam: examRecord }, { status: 200 });

    } catch (error: any) {
        console.error("AI Exam Generation Error:", error);
        return Response.json({ error: error.message || "Failed to generate exam string" }, { status: 500 });
    }
}
