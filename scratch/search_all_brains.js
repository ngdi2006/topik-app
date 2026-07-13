const fs = require('fs');
const path = require('path');

function findFile(dir, targetName) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fullPath = path.join(dir, f);
        let stat;
        try {
            stat = fs.statSync(fullPath);
        } catch (e) {
            continue;
        }
        if (stat.isDirectory()) {
            const res = findFile(fullPath, targetName);
            if (res) return res;
        } else if (f === targetName) {
            return fullPath;
        }
    }
    return null;
}

const dir = 'C:\\Users\\MTC\\.gemini\\antigravity-ide\\brain';
console.log(`Searching recursively in ${dir}...`);
const res = findFile(dir, 'vocab_5_0_0.png');
if (res) {
    console.log(`FOUND: ${res}`);
} else {
    console.log(`Not found`);
}
