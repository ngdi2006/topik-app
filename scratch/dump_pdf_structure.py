import sys
import io
import json
import fitz

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = r"E:\TOPIK-IBT\topik-app\DATA-EPS\TU-VUNG-SXCT.pdf"
doc = fitz.open(pdf_path)

data = []
for page_idx in range(len(doc)):
    page_num = page_idx + 1
    page = doc[page_idx]
    
    # Text blocks
    blocks = page.get_text("blocks")
    # Sort blocks primarily by y0, secondarily by x0
    blocks = sorted(blocks, key=lambda b: (round(b[1] / 10) * 10, b[0]))
    
    page_data = {
        'page': page_num,
        'blocks': []
    }
    for b in blocks:
        x0, y0, x1, y1, text, block_no, block_type = b
        page_data['blocks'].append({
            'x0': round(x0, 1),
            'y0': round(y0, 1),
            'x1': round(x1, 1),
            'y1': round(y1, 1),
            'text': text.strip().replace('\n', ' ')
        })
    data.append(page_data)

# Print page 1 blocks
for b in data[0]['blocks']:
    print(f"coord=({b['x0']}, {b['y0']}, {b['x1']}, {b['y1']}) -> {b['text']}")

with open(r"e:\TOPIK-IBT\topik-app\scratch\pdf_blocks_sxct.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
