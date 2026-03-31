import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
    try {
        const { name, age, dob, job, hobbies, personality, familySize, family, targetMilestoneId } = await req.json()

        let grammarContext = ""
        if (targetMilestoneId) {
            const { data } = await supabase.from('milestones').select('grammar_context').eq('id', targetMilestoneId).single()
            if (data && data.grammar_context) {
                grammarContext = data.grammar_context
            }
        }

        const prompt = `
Viết 1 đoạn giới thiệu bản thân bằng tiếng Hàn dựa trên các thông tin cá nhân và tài liệu sau đây:
- Tên: ${name || 'Bỏ qua'}
- Tuổi: ${age || 'Bỏ qua'}
- Ngày tháng năm sinh: ${dob || 'Bỏ qua'}
- Nghề nghiệp / Chuyên ngành: ${job || 'Bỏ qua'}
- Sở thích: ${hobbies || 'Bỏ qua'}
- Tính cách: ${personality || 'Bỏ qua'}
- Gia đình: Gồm ${familySize || 'vài'} người (${family || 'Bỏ qua'})
${grammarContext ? `\n- BỘ TỪ VỰNG VÀ NGỮ PHÁP PHẢI ÁP DỤNG TRONG BÀI:\n"""\n${grammarContext}\n"""\n` : ''}

YÊU CẦU CHUYÊN MÔN:
- Cấu trúc đầy đủ Mở - Thân - Kết hợp lý, trôi chảy tự nhiên, bám sát các thông tin học viên cung cấp.
- Nếu có "BỘ TỪ VỰNG VÀ NGỮ PHÁP PHẢI ÁP DỤNG", bạn BẮT BUỘC PHẢI ƯU TIÊN SỬ DỤNG NHỮNG NGỮ PHÁP/TỪ VỰNG NÀY ĐỂ KẾT NỐI CÁC CÂU. Đây là bài tập kiểm tra xem học viên có nắm được kiến thức của Mốc học này không.
- Sử dụng ngữ pháp trình độ Sơ Cấp 2 đến Trung Cấp (Tương đương TOPIK 2 ~ TOPIK 3).
- Dùng đuôi câu -아/어요 hoặc -ㅂ/습니다 sao cho lịch sự chuyên nghiệp nhất.
- Bạn CHỈ trả về đúng Đoạn Văn Tiếng Hàn, tuyệt đối KHÔNG viết thêm giải nghĩa tiếng Việt, KHÔNG viết note, KHÔNG xin chào ở đầu lời thoại AI. (Text Render trực tiếp lên màn hình).
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        return NextResponse.json({ script: response.text });
    } catch (error: any) {
        console.error("Generate Intro API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
