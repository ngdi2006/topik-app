const fs = require('fs');

const path = 'C:\\Users\\MTC\\.gemini\\antigravity-ide\\brain\\94034162-edd3-48be-b83a-f9971c8e9481\\extracted_vocab_items.json';
const items = JSON.parse(fs.readFileSync(path, 'utf8'));

console.log('Searching for digits in word_kr...');
const matched = items.filter(item => /\d$/.test(item.word_kr));
matched.forEach(m => {
    console.log(`KR: "${m.word_kr}" | VI: "${m.word_vi}"`);
});
