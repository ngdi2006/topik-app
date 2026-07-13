import docx
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

docx_path = r"E:\TOPIK-IBT\topik-app\DATA-EPS\KY-NANG-GIAO-TIEP.docx"
doc = docx.Document(docx_path)
table = doc.tables[0]

with open(r"e:\TOPIK-IBT\topik-app\scratch\full_giao_tiep_cells.txt", "w", encoding="utf-8") as f:
    for row_idx, row in enumerate(table.rows):
        cells_text = []
        for cell_idx, cell in enumerate(row.cells):
            cells_text.append(f"Col {cell_idx}: {cell.text.strip()}")
        f.write(f"--- Row {row_idx} ---\n" + "\n".join(cells_text) + "\n\n")

print("Done reading all cells to scratch/full_giao_tiep_cells.txt")
