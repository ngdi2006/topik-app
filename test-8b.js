const fs = require('fs');
const https = require('https');

const envFile = fs.readFileSync('.env.local', 'utf8');
const key = envFile.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.+)/)[1].trim();
const model = "gemini-1.5-flash-8b";

const body = JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] });
const req = https.request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, (res) => {
    let acc = '';
    res.on('data', chunk => acc += chunk);
    res.on('end', () => console.log(`RESPONSE:`, JSON.parse(acc)));
});
req.on('error', e => console.error(e));
req.write(body);
req.end();
