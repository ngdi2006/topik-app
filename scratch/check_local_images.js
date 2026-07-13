const fs = require('fs');
const path = require('path');

const dir = 'e:\\TOPIK-IBT\\topik-app\\public\\uploads\\vocab_vong2';

const files = [
    'vocab_5_0_0.png',
    'vocab_5_1_0.png',
    'vocab_5_2_0.png'
];

files.forEach(f => {
    const fullPath = path.join(dir, f);
    if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`${f}: exists, size: ${stats.size} bytes`);
    } else {
        console.log(`${f}: DOES NOT EXIST`);
    }
});
