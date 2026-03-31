require('dotenv').config({ path: '.env.local' });
const { generateContent } = require('@google/genai');

async function check() {
    console.log("Testing models...");
    const modelsToTest = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];

    // We must use REST fetch because the SDK might have issues in Node depending on version
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    for (const model of modelsToTest) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
            });
            const data = await res.json();
            if (data.error) {
                console.log(`[❌] ${model}: ${data.error.message}`);
            } else {
                console.log(`[✅] ${model}: OK`);
            }
        } catch (e) {
            console.log(`[❌] ${model}: Request Failed: ${e.message}`);
        }
    }
}
check();
