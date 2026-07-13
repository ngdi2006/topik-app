const fs = require('fs');

const pyCode = `
import sys
import io
import fitz

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

doc = fitz.open(r"e:\\TOPIK-IBT\\topik-app\\DATA-EPS\\TU-VUNG-BIEN-BAO.pdf")
page = doc[4]
words = page.get_text("words")
for w in words:
    x0, y0, x1, y1, word, b, l, w_no = w
    if 760 <= y0 <= 810:
        print(f"word: '{word}' | x0: {x0:.1f}, y0: {y0:.1f}, x1: {x1:.1f}, y1: {y1:.1f}")
`;

fs.writeFileSync('e:\\TOPIK-IBT\\topik-app\\scratch\\inspect_p5_words.py', pyCode);
console.log('inspect_p5_words.py written');
