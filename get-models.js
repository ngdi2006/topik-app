const fs = require('fs');
const https = require('https');

// Read env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envFile.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.+)/);
if (!keyMatch) {
    console.error("No key found");
    process.exit(1);
}
const key = keyMatch[1].trim();

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('models.json', data);
        console.log("Wrote models.json");
    });
}).on('error', (e) => {
    console.error(e);
});
