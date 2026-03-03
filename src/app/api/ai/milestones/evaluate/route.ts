import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });

export async function POST(req: Request) {
    try {
        const { transcript, taskType, level, expectedText, questionText } = await req.json()

        if (!transcript) {
            return NextResponse.json({ error: "No transcript provided" }, { status: 400 })
        }

        const systemPrompt = `
Bạn là giáo viên bản xứ tiếng Hàn, tận tâm và nghiêm khắc trong phát âm, nhẹ nhàng khi sửa lỗi ngữ pháp. Thấu hiểu tâm lý học viên.
Học viên đang làm bài kiểm tra Mốc ${level}.
Loại bài tập hôm nay: ${taskType === 'reading' ? 'Đọc thành tiếng' : 'Vấn đáp'}
${taskType === 'reading' ? `Văn bản gốc cần đọc: "${expectedText}"\nNhiệm vụ: Tham chiếu độ lệch của giọng đọc học viên (transcript) với văn bản gốc để tìm lỗi sai phát âm, sai nối âm.` : ''}
${taskType === 'qa' ? `Câu hỏi từ hệ thống: "${questionText}"\nNhiệm vụ: Chấm điểm câu trả lời của học viên. Bắt lỗi ngữ pháp, từ vựng không tự nhiên.` : ''}

LUÔN giải thích lỗi sai và đưa ra nhận xét bằng TIẾNG VIỆT để học viên dễ hiểu.
BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU (Dùng ngoặc kép chuẩn):
{
    "user_transcript": "<chép lại đoạn văn nhận diện được>",
    "score": <số nguyên từ 0 đến 100 đánh giá mức độ hoàn thiện của câu trả lời trên thang điểm 100>,
    "evaluation": "Nhận xét ngắn gọn bằng tiếng Việt, đánh giá mức độ Đạt/Không đạt, khích lệ",
    "mistakes": ["<Trích dẫn Lỗi 1> - <Giải thích chi tiết lý do sai bằng tiếng Việt>", "<Trích dẫn Lỗi 2> - <Giải thích chi tiết lý do sai bằng tiếng Việt>"],
    "suggested_answers": ["Cách nói 1 tự nhiên, chuẩn xác", "Cách nói 2 mượt mà hơn người bản xứ"]
}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Giọng đọc học viên nhận diện STT (Speech-to-text input): "${transcript}"`,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                temperature: 0.1,
            }
        });

        const textResponse = response.text || "{}";
        // Clean JSON formatting if Gemini included markdown
        const cleanedJsonText = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanedJsonText);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Evaluation API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
