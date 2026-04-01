import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });

export async function POST(req: Request) {
    try {
        const { level, reading, qaItems } = await req.json()

        if (!reading && (!qaItems || qaItems.length === 0)) {
            return NextResponse.json({ error: "No data provided for evaluation" }, { status: 400 })
        }

        // Build a single comprehensive prompt for all sections
        let sectionsDescription = ""
        let sectionCount = 0

        if (reading) {
            sectionCount++
            sectionsDescription += `
--- PHẦN ĐỌC THÀNH TIẾNG ---
Văn bản gốc cần đọc: "${reading.expectedText}"
Giọng đọc học viên (STT transcript): "${reading.transcript || '[Không có transcript - hết giờ]'}"
Nhiệm vụ: Tham chiếu độ lệch của giọng đọc học viên với văn bản gốc để tìm lỗi sai phát âm, sai nối âm.
`
        }

        if (qaItems && qaItems.length > 0) {
            qaItems.forEach((item: any, idx: number) => {
                sectionCount++
                sectionsDescription += `
--- PHẦN VẤN ĐÁP: Câu ${idx + 1} ---
Câu hỏi từ hệ thống: "${item.questionText}"
Câu trả lời học viên (STT transcript): "${item.transcript || '[Không có transcript - hết giờ]'}"
Nhiệm vụ: Chấm điểm câu trả lời. Bắt lỗi ngữ pháp, từ vựng không tự nhiên.
`
            })
        }

        const systemPrompt = `
Bạn là giáo viên bản xứ tiếng Hàn, tận tâm và nghiêm khắc trong phát âm, nhẹ nhàng khi sửa lỗi ngữ pháp. Thấu hiểu tâm lý học viên.
Học viên đang làm bài kiểm tra Mốc ${level}.

Bạn sẽ nhận được TOÀN BỘ bài kiểm tra gồm ${sectionCount} phần. Hãy chấm điểm TẤT CẢ các phần trong MỘT LẦN.

LUÔN giải thích lỗi sai và đưa ra nhận xét bằng TIẾNG VIỆT để học viên dễ hiểu.

BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON MẪU DƯỚI ĐÂY:
{
    "reading": ${reading ? `{
        "user_transcript": "chép lại đoạn văn nhận diện được",
        "score": 85,
        "evaluation": "Nhận xét ngắn gọn bằng tiếng Việt",
        "mistakes": ["Lỗi 1: Giải thích", "Lỗi 2: Giải thích"],
        "suggested_answers": ["Cách đọc chuẩn 1", "Cách đọc chuẩn 2"]
    }` : 'null'},
    "qa": [${qaItems && qaItems.length > 0 ? qaItems.map((_: any, i: number) => `
        {
            "user_transcript": "chép lại câu trả lời nhận diện được cho câu ${i + 1}",
            "score": 70,
            "evaluation": "Nhận xét ngắn gọn bằng tiếng Việt cho câu ${i + 1}",
            "mistakes": ["Lỗi 1: Giải thích"],
            "suggested_answers": ["Cách nói chuẩn 1"]
        }`).join(',') : ''}
    ]
}

Lưu ý quan trọng:
- "score" là số nguyên từ 0 đến 100 cho MỖI phần.
- Mảng "qa" phải có ĐÚNG ${qaItems?.length || 0} phần tử, theo đúng thứ tự câu hỏi.
- ${!reading ? '"reading" phải là null vì không có phần đọc.' : ''}
- Nếu transcript trống hoặc là "[Không có transcript - hết giờ]", cho điểm 0 và ghi nhận xét "Không có câu trả lời".
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: sectionsDescription,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                temperature: 0.1,
            }
        });

        const textResponse = response.text || "{}";
        let result;
        try {
            const cleanedJsonText = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
            result = JSON.parse(cleanedJsonText);
        } catch (parseError: any) {
            console.error("Batch JSON Parse Error. Raw Gemini Response:", textResponse);
            return NextResponse.json({ error: "Lỗi phản hồi AI batch. Vui lòng thử lại. Dữ liệu gốc: " + textResponse }, { status: 500 });
        }

        // Validate structure
        if (reading && !result.reading) {
            result.reading = { user_transcript: "", score: 0, evaluation: "Lỗi: AI không trả về kết quả phần đọc", mistakes: [], suggested_answers: [] }
        }
        if (!result.qa) result.qa = []

        // Ensure qa array matches expected length
        const expectedQaCount = qaItems?.length || 0
        while (result.qa.length < expectedQaCount) {
            result.qa.push({ user_transcript: "", score: 0, evaluation: "Lỗi: AI không trả về kết quả cho câu này", mistakes: [], suggested_answers: [] })
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Batch Evaluation API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
