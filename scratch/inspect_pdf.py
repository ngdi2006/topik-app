import sys
import io
import fitz

pdf_path = r"E:\TOPIK-IBT\topik-app\DATA-EPS\TU-VUNG-SXCT.pdf"
doc = fitz.open(pdf_path)

with open(r"e:\TOPIK-IBT\topik-app\scratch\all_blocks_utf8.txt", "w", encoding="utf-8") as f:
    for page_idx in range(len(doc)):
        page_num = page_idx + 1
        page = doc[page_idx]
        f.write(f"\n--- PAGE {page_num} ---\n")
        blocks = page.get_text("blocks")
        # Sort blocks by y0, then x0
        blocks = sorted(blocks, key=lambda b: (b[1], b[0]))
        for b in blocks:
            x0, y0, x1, y1, text, block_no, block_type = b
            cleaned_text = text.strip().replace('\n', ' ')
            if cleaned_text:
                f.write(f"coord=({x0:.1f}, {y0:.1f}, {x1:.1f}, {y1:.1f}) -> {cleaned_text}\n")
print("Done!")
