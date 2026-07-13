import sys
import io
import docx

doc = docx.Document(r"E:\TOPIK-IBT\topik-app\DATA-EPS\KHA-NANG-TOAN-HOC.docx")
table = doc.tables[0]

with open(r"e:\TOPIK-IBT\topik-app\scratch\docx_table_dump.txt", "w", encoding="utf-8") as f:
    for row_idx, row in enumerate(table.rows):
        row_text = [cell.text.strip().replace('\n', ' ') for cell in row.cells]
        f.write(f"Row {row_idx}: {row_text}\n")
print("Done! Total rows:", len(table.rows))
