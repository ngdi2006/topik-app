import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });

export async function POST(req: Request) {
    try {
        const { name, age, job, hobbies, familySize } = await req.json()

        const prompt = `
Viết 1 đoạn giới thiệu bản thân bằng tiếng Hàn dựa trên các từ khóa (Tags) thông tin cá nhân sau:
- Tên: ${name || 'Ẩn danh'}
- Tuổi: ${age || 'Chưa rõ'}
- Nghề nghiệp: ${job || 'Học sinh'}
- Sở thích: ${hobbies || 'Không có'}
- Quy mô Gia đình: ${familySize || 3} người

YÊU CẦU CHUYÊN MÔN:
- Cấu trúc đầy đủ Mở - Thân - Kết hợp lý, tự nhiên.
- Sử dụng ngữ pháp trình độ Sơ Cấp 2 đến Trung Cấp (Tương đương TOPIK 2 ~ Mốc bài 20).
- Dùng đuôi câu -아/어요 hoặc -ㅂ/습니다 tùy hoàn cảnh lịch sự.
- Bạn CHỈ trả về đúng Đoạn Văn Tiếng Hàn, tuyệt đối KHÔNG viết thêm giải nghĩa tiếng Việt, KHÔNG viết note, KHÔNG xin chào ở đầu prompt. Tôi cần dùng String này nhúng thẳng vào màn hình.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return NextResponse.json({ script: response.text });
    } catch (error: any) {
        console.error("Generate Intro API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
