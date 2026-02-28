import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "placeholder-api-key" });

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages, scenario = "Giao tiếp cơ bản" } = await req.json();

        // Vercel AI SDK Core with standard fetch adapter
        // Notice: Due to changes in Vercel AI SDK vs @google/genai direct use
        // We will use standard Google GenAI createStream call and adapt it if needed,
        // or directly use standard Response streaming.

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: messages.map((m: { role: string, content: string }) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            })),
            config: {
                systemInstruction: `Bạn là một trợ lý ảo tiếng Hàn (AI Tutor) đóng vai trò người bản xứ trong ngữ cảnh giao tiếp: "${scenario}". Hãy đóng vai một cách tự nhiên, phản hồi ngắn gọn (1-3 câu) để học viên dễ dàng theo dõi và luyện tập đáp lời.`
            }
        });

        // Create a ReadableStream from the generator
        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of responseStream) {
                    if (chunk.text) {
                        const encoded = new TextEncoder().encode(chunk.text);
                        controller.enqueue(encoded);
                    }
                }
                controller.close();
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked'
            }
        });

    } catch (error) {
        console.error("AI Chat Error:", error);
        return new Response(JSON.stringify({ error: "Failed to process chat" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
