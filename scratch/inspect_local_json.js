const fs = require('fs');
const path = require('path');

const jsonPath = 'C:\\Users\\MTC\\.gemini\\antigravity-ide\\brain\\94034162-edd3-48be-b83a-f9971c8e9481\\extracted_vocab_items.json';

if (!fs.existsSync(jsonPath)) {
    console.error('JSON file does not exist');
    process.exit(1);
}

const records = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const signs = records.filter(r => r.type === 'SIGN');

console.log('Total signs in JSON:', signs.length);
signs.slice(0, 15).forEach((s, idx) => {
    console.log(`${idx + 1}. KR: "${s.word_kr}" | VI: "${s.word_vi}" | Image: "${s.image_url}"`);
});
