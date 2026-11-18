"""Inventory and reindex four introductory workbook recordings without changing originals."""
from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw

source = Path('D:/DATA-E9/FILE NGHE SBT 2025 NHẬP MÔN')
root = Path('tmp/workbook-listening-intro')
root.mkdir(parents=True, exist_ok=True)
configs = [
    ('hangul-1', 'LẦM QUEN 1 .mp3', -2, 'Làm quen với Hangeul I'),
    ('hangul-2-a', 'LÀM QUEN 2 (câu1-15) .mp3', -1, 'Làm quen với Hangeul II · Câu 1–15'),
    ('hangul-2-b', 'LÀM QUEN 2 (Câu 16-36) .mp3', -1, 'Làm quen với Hangeul II · Câu 16–36'),
    ('greetings', 'CHAO HOI.mp3', 0, 'Chào hỏi'),
]
tracks = []
for key, filename, unit, title in configs:
    path = source / filename
    directory = root / key
    directory.mkdir(exist_ok=True)
    indexed = directory / 'reindexed-full.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-map', '0:a:0', '-c:a', 'copy', '-write_xing', '1', str(indexed)], check=True, capture_output=True)
    info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_name,sample_rate,channels', '-of', 'json', str(indexed)], check=True, capture_output=True).stdout)
    tracks.append(dict(key=key, source_file=filename, source_path=str(path), source_checksum=hashlib.sha256(path.read_bytes()).hexdigest(), indexed_file=indexed.as_posix(), duration=float(info['format']['duration']), streams=info['streams'], unit_number=unit, title=title))
(root / 'sources.json').write_text(json.dumps(tracks, ensure_ascii=False, indent=2), encoding='utf-8')
for offset in range(0, 14, 6):
    sheet = Image.new('RGB', (1500, 1440), '#dddddd')
    draw = ImageDraw.Draw(sheet)
    for j, page in enumerate(range(offset + 1, min(14, offset + 6) + 1)):
        image = Image.open(f'tmp/workbooks-2025/eps-topik-2025-workbook-1/{page:04d}.webp')
        image.thumbnail((495, 690))
        x, y = (j % 3) * 500, (j // 3) * 720
        draw.text((x + 5, y + 3), f'SBT Q1 PDF page {page}', fill='black')
        sheet.paste(image, (x, y + 22))
    sheet.save(root / f'pages-{offset + 1:02d}.jpg')
print(json.dumps([{k: t[k] for k in ('key', 'unit_number', 'duration', 'streams')} for t in tracks]))
