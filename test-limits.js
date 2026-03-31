const fs = require('fs');
const https = require('https');

const envFile = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envFile.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.+)/);
if (!keyMatch) {
    console.error("No key found");
    process.exit(1);
}
const key = keyMatch[1].trim();

const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-pro-latest'
];

async function testModes() {
    for (const model of modelsToTest) {
        const body = JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] });
        try {
            const data = await new Promise((resolve, reject) => {
                const req = https.request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
                }, (res) => {
                    let acc = '';
                    res.on('data', chunk => acc += chunk);
                    res.on('end', () => resolve(JSON.parse(acc)));
                });
                req.on('error', reject);
                req.write(body);
                req.end();
            });
            if (data.error) {
                console.log(`[${model}] ERROR: ${data.error.code} - ${data.error.status} (limit might be ${data.error.details?.[1]?.violations?.[0]?.quotaValue || 'unknown'})`);
            } else {
                console.log(`[${model}] SUCCESS! Response: OK`);
            }
        } catch (e) {
            console.log(`[${model}] CATCH: ${e.message}`);
        }
    }
}

testModes();
