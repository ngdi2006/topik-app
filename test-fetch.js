const fs = require('fs');

async function main() {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const key = envFile.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.+)/)[1].trim();

    const models = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
    for (const m of models) {
        console.log(`Testing ${m}...`);
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
            });
            const data = await res.json();
            if (data.error) {
                console.log(`[${m}] ERROR: ${data.error.message}`);
            } else {
                console.log(`[${m}] SUCCESS!`);
            }
        } catch (e) {
            console.error(`[${m}] FAIL:`, e.message);
        }
    }
}
main();
