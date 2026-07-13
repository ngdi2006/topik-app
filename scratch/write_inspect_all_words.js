const fs = require('fs');

const pyCode = `
import sys
import io
import fitz

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

doc = fitz.open(r"e:\\TOPIK-IBT\\topik-app\\DATA-EPS\\TU-VUNG-BIEN-BAO.pdf")
page = doc[4]
words = page.get_text("words")
# Group by line using ymid
words = sorted(words, key=lambda w: w[1])
lines = []
current_line = []
current_y_mid = None
for w in words:
    x0, y0, x1, y1, word, b, l, w_no = w
    if y1 < 90 or y0 > 810: continue
    y_mid = (y0 + y1) / 2
    if current_y_mid is None:
        current_line = [w]
        current_y_mid = y_mid
    elif abs(y_mid - current_y_mid) < 8:
        current_line.append(w)
    else:
        lines.append(current_line)
        current_line = [w]
        current_y_mid = y_mid
if current_line:
    lines.append(current_line)

for idx, line in enumerate(lines):
    line = sorted(line, key=lambda w: w[0])
    text = " ".join([w[4] for w in line])
    xs = ", ".join([f"{w[4]}:{w[0]:.1f}" for w in line])
    print(f"Line {idx + 1} (y={line[0][1]:.1f}): '{text}'")
    print(f"  Coordinates: {xs}")
`;

fs.writeFileSync('e:\\TOPIK-IBT\\topik-app\\scratch\\inspect_p5_all_words.py', pyCode);
console.log('inspect_p5_all_words.py written');
