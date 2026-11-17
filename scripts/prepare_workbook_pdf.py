"""Render scanned workbook PDFs for the existing digital textbook reader."""
import hashlib
import json
from pathlib import Path
import sys

import fitz

source = Path(sys.argv[1] if len(sys.argv) > 1 else r"D:\SBT2026")
target = Path("tmp/workbooks-2025")
target.mkdir(parents=True, exist_ok=True)
books = []
for volume in (1, 2):
    pdf = source / f"SBT-Q{volume}.pdf"
    code = f"eps-topik-2025-workbook-{volume}"
    directory = target / code
    directory.mkdir(exist_ok=True)
    pages = []
    with fitz.open(pdf) as document:
        for index, page in enumerate(document):
            output = directory / f"{index + 1:04}.webp"
            if not output.exists():
                pixmap = page.get_pixmap(matrix=fitz.Matrix(1440 / page.rect.width, 1440 / page.rect.width), alpha=False)
                pixmap.pil_save(str(output), format="WEBP", quality=84)
            pages.append({"page_number": index + 1, "file": str(output)})
        books.append({"code": code, "volume": volume, "title_vi": f"Sách bài tập EPS-TOPIK 2025 - Quyển {volume}", "title_ko": f"EPS-TOPIK 2025 워크북 {volume}", "source_hash": hashlib.sha256(pdf.read_bytes()).hexdigest(), "source_file": pdf.name, "total_pages": len(document), "pages": pages})
    print(f"{code}: {len(pages)} pages", flush=True)
(target / "manifest.json").write_text(json.dumps(books, ensure_ascii=False, indent=2), encoding="utf-8")
