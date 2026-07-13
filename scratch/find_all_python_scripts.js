const fs = require('fs');
const path = require('path');

function findPyFiles(dir, filesList = []) {
    if (!fs.existsSync(dir)) return filesList;
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
            findPyFiles(fullPath, filesList);
        } else if (f.endsWith('.py') || f.includes('crop') || f.includes('extract')) {
            filesList.push(fullPath);
        }
    }
    return filesList;
}

const res = findPyFiles('C:\\Users\\MTC\\.gemini\\antigravity-ide\\brain');
console.log('Found scripts in brains:', res);
