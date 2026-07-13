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
            if (f === 'node_modules' || f === '.git' || f === '.next') continue;
            const res = findFile(fullPath, targetName);
            if (res) return res;
        } else if (f === targetName) {
            return fullPath;
        }
    }
    return null;
}

const searchDirs = [
    'e:\\TOPIK-IBT\\topik-app',
    'C:\\Users\\MTC\\.gemini\\config',
    'C:\\Users\\MTC\\.gemini\\antigravity-ide'
];

searchDirs.forEach(d => {
    console.log(`Searching in ${d}...`);
    const res = findFile(d, 'vocab_5_0_0.png');
    if (res) {
        console.log(`FOUND in ${d}: ${res}`);
    } else {
        console.log(`Not found in ${d}`);
    }
});
