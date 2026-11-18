"""Prepare five standalone scan books for the existing textbook reader."""
from pathlib import Path
import hashlib
import json
import fitz
from PIL import Image, ImageDraw
import numpy as np

source = Path('D:/DATA-E9/TV-2025')
target = Path('tmp/eps-reference-books')
target.mkdir(parents=True, exist_ok=True)
books = []
configs = [
    ('TV-Q1.pdf', 'vocabulary', 1, 'Từ vựng · Quyển 1', '어휘 1'),
    ('TV-Q2.pdf', 'vocabulary', 2, 'Từ vựng · Quyển 2', '어휘 2'),
    ('TH-NGUPHAP.pdf', 'grammar', 1, 'Ngữ pháp tổng hợp', '종합 문법'),
    ('TTVH-Q1.pdf', 'culture', 1, 'Thông tin văn hóa · Quyển 1', '문화와 정보 1'),
    ('TTTV-Q2.pdf', 'culture', 2, 'Thông tin văn hóa · Quyển 2', '문화와 정보 2'),
]
for filename, kind, volume, title, korean in configs:
    code = f'eps-topik-2025-{kind}-{volume}'
    directory = target / code
    directory.mkdir(exist_ok=True)
    pdf = source / filename
    doc = fitz.open(pdf)
    pages = []
    section_starts = []
    for index, page in enumerate(doc):
        output = directory / f'{index + 1:04d}.webp'
        if not output.exists():
            pix = page.get_pixmap(matrix=fitz.Matrix(1440 / page.rect.width, 1440 / page.rect.width), alpha=False)
            pix.pil_save(str(output), format='WEBP', quality=86)
        image = Image.open(output)
        if kind == 'vocabulary':
            pixels = np.array(image.convert('RGB')).astype(int)
            blue = (pixels[:, :, 2] - pixels[:, :, 0] > 28) & (pixels[:, :, 1] - pixels[:, :, 0] > 10) & (pixels[:, :, 2] > 150)
            rows = np.flatnonzero(blue[:, 180:1300].sum(axis=1) > 650)
            groups = []
            for y in rows:
                if not groups or y > groups[-1][-1] + 3:
                    groups.append([])
                groups[-1].append(int(y))
            for group in groups:
                if len(group) >= 20:
                    section_starts.append(dict(page=index + 1, y=max(0, group[0] - 4) / image.height))
        pages.append(dict(page_number=index + 1, file=output.as_posix(), width=image.width, height=image.height))
    cover = directory / 'cover.webp'
    cover_image = Image.open(source / 'Bia-TV.jpg')
    cover_image.thumbnail((600, 840))
    cover_image.save(cover, format='WEBP', quality=85)
    books.append(dict(code=code, kind=kind, volume=volume, title_vi=title, title_ko=korean, source_file=filename, source_hash=hashlib.sha256(pdf.read_bytes()).hexdigest(), total_pages=len(doc), pages=pages, section_starts=section_starts, cover=cover.as_posix()))
    # All pages, readable enough to check headers and section boundaries locally.
    for offset in range(0, len(pages), 8):
        contact = Image.new('RGB', (1600, 1100), '#dddddd')
        draw = ImageDraw.Draw(contact)
        for j, row in enumerate(pages[offset:offset + 8]):
            im = Image.open(row['file'])
            im.thumbnail((395, 520))
            x, y = (j % 4) * 400, (j // 4) * 550
            draw.text((x + 5, y + 3), f'{filename} PDF p{row["page_number"]}', fill='black')
            contact.paste(im, (x, y + 22))
        contact.save(target / f'{pdf.stem}-contact-{offset + 1:03d}.jpg')
    print(f'{code}: {len(pages)} pages', flush=True)
(target / 'manifest.json').write_text(json.dumps(books, ensure_ascii=False, indent=2), encoding='utf-8')
