import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGemini(prompt: string, retries = 3): Promise<any> {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) throw new Error("Chưa cấu hình GEMINI_API_KEY trong file .env");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });
    
    if (!res.ok) {
        if (res.status === 429 && retries > 0) {
            console.warn("Bị giới hạn API (429), đang chờ 5 giây để thử lại...");
            await sleep(5000);
            return callGemini(prompt, retries - 1);
        }
        const errorData = await res.text();
        throw new Error(`Gemini API Error: ${errorData}`);
    }

    const data = await res.json();
    try {
        const jsonText = data.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);
    } catch (e) {
        throw new Error("Gemini trả về kết quả không phải JSON hợp lệ.");
    }
}

export async function POST(request: Request) {
    try {
        const { batchSize = 5 } = await request.json().catch(() => ({ batchSize: 5 }));
        const adminClient = createAdminClient();

        // Lấy các câu hỏi chưa được đồng bộ AI
        const { data: questions, error: fetchError } = await adminClient
            .from('question_bank')
            .select('id, question_text, passage, options')
            .is('translated_text', null)
            .limit(batchSize);

        if (fetchError) throw fetchError;
        if (!questions || questions.length === 0) {
            return NextResponse.json({ success: true, message: "Tất cả câu hỏi đã được đồng bộ AI!", processed: 0 });
        }

        let processed = 0;
        const results = [];

        for (const q of questions) {
            // Chờ 4 giây trước mỗi câu để tránh vượt quá giới hạn API miễn phí của Gemini (15 request / phút)
            await sleep(4000);

            // Xử lý text để gửi cho AI
            const rawText = (q.question_text || '') + ' ' + (q.passage || '');
            const cleanText = rawText.replace(/<[^>]*>/g, ' ').trim();
            
            let optionsText = '';
            if (Array.isArray(q.options)) {
                optionsText = q.options.map((opt: any) => typeof opt === 'string' ? opt : (opt?.content || '')).join(' | ');
            }

            const prompt = `Bạn là một giáo viên dạy tiếng Hàn TOPIK chuyên nghiệp. Nhiệm vụ của bạn là phân tích câu hỏi sau.
Hãy dịch câu hỏi sang tiếng Việt. Sau đó rút trích tối đa 5 từ vựng/cụm từ quan trọng nhất (ưu tiên từ nguyên thể nếu có chia động từ) và tối đa 3 cấu trúc ngữ pháp.
Trọng tâm vào việc giúp người học ôn tập lỗi sai một cách ngắn gọn, súc tích.

TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU (không có format \`\`\`json):
{
  "translated_text": "Dịch nghĩa tiếng Việt của toàn bộ câu hỏi và đáp án nếu cần...",
  "vocab_list": [
    {
      "word": "Từ vựng (hoặc động từ nguyên thể)",
      "meaning": "Ý nghĩa tiếng Việt",
      "explanation": "Lưu ý ngắn gọn cách dùng hoặc dạng chia (nếu có)",
      "example": "Câu chứa từ đó (trích từ câu hỏi hoặc đáp án)",
      "example_translation": "Bản dịch tiếng Việt của câu ví dụ trên",
      "fillInBlankQuestion": "Câu ví dụ nhưng thay từ vựng đó bằng (   )",
      "fillInBlankAnswer": "Từ gốc nằm trong câu ví dụ"
    }
  ],
  "grammar_list": [
    {
      "structures": "Cấu trúc ngữ pháp",
      "usage": "Ý nghĩa cấu trúc",
      "explanation": "Lưu ý ngắn gọn cách dùng",
      "example": "Câu ví dụ chứa cấu trúc (trích từ đề)",
      "example_translation": "Bản dịch tiếng Việt của câu ví dụ",
      "fillInBlankQuestion": "Câu ví dụ thay cấu trúc bằng (   )",
      "fillInBlankAnswer": "Cấu trúc nằm trong câu"
    }
  ]
}

Câu hỏi tiếng Hàn: "${cleanText}"
Các đáp án: "${optionsText}"`;

            try {
                const aiResult = await callGemini(prompt);
                
                // Cập nhật vào Database
                const { error: updateError } = await adminClient
                    .from('question_bank')
                    .update({
                        translated_text: aiResult.translated_text || "Không có bản dịch",
                        ai_vocab_list: aiResult.vocab_list || [],
                        ai_grammar_list: aiResult.grammar_list || []
                    })
                    .eq('id', q.id);

                if (updateError) throw updateError;
                
                processed++;
                results.push({ id: q.id, status: 'success' });
            } catch (err: any) {
                console.error(`Lỗi khi xử lý câu ${q.id}:`, err);
                results.push({ id: q.id, status: 'error', error: err.message });
            }
        }

        if (processed === 0 && questions.length > 0) {
            throw new Error(`Đồng bộ thất bại: ${results[0]?.error}`);
        }

        return NextResponse.json({ 
            success: true, 
            processed, 
            results,
            message: `Đã xử lý xong ${processed} câu hỏi.`
        });
    } catch (error: any) {
        console.error("AI Sync Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
