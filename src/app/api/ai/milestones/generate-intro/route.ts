import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });

export async function POST(req: Request) {
    try {
        const { name, age, dob, job, hobbies, personality, familySize, family, extraDoc } = await req.json()

        const prompt = `
Viết 1 đoạn giới thiệu bản thân bằng tiếng Hàn dựa trên các thông tin cá nhân và tài liệu sau đây:
- Tên: ${name || 'Bỏ qua'}
- Tuổi: ${age || 'Bỏ qua'}
- Ngày tháng năm sinh: ${dob || 'Bỏ qua'}
- Nghề nghiệp / Chuyên ngành: ${job || 'Bỏ qua'}
- Sở thích: ${hobbies || 'Bỏ qua'}
- Tính cách: ${personality || 'Bỏ qua'}
- Gia đình: Gồm ${familySize || 'vài'} người (${family || 'Bỏ qua'})
${extraDoc ? `\n- TÀI LIỆU THAM KHẢO TỪ HỌC VIÊN:\n"""\n${extraDoc}\n"""\n` : ''}

YÊU CẦU CHUYÊN MÔN:
- Cấu trúc đầy đủ Mở - Thân - Kết hợp lý, trôi chảy tự nhiên, bám sát các thông tin học viên cung cấp.
- Nếu có TÀI LIỆU THAM KHẢO, hãy kết hợp và chọn lọc ý chính yếu nhất để bài giới thiệu sâu sắc mang đậm dấu ấn cá nhân.
- Sử dụng ngữ pháp trình độ Sơ Cấp 2 đến Trung Cấp (Tương đương TOPIK 2 ~ TOPIK 3).
- Dùng đuôi câu -아/어요 hoặc -ㅂ/습니다 sao cho lịch sự chuyên nghiệp nhất.
- Bạn CHỈ trả về đúng Đoạn Văn Tiếng Hàn, tuyệt đối KHÔNG viết thêm giải nghĩa tiếng Việt, KHÔNG viết note, KHÔNG xin chào ở đầu lời thoại AI. (Text Render trực tiếp lên màn hình).
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
