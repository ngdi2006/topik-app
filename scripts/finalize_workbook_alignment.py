"""Visually checked exceptions: word alternatives, faint markers, context banks."""
import json
from pathlib import Path

root = Path('tmp/workbook-alignment')
books = {v: json.loads((root / f'eps-topik-2025-workbook-{v}' / 'aligned.json').read_text(encoding='utf-8')) for v in (1, 2)}


def field(volume, page, field_id):
    return next(f for p in books[volume]['pages'] if p['pageNumber'] == page for f in p['workbook']['fields'] if f['id'] == field_id)


def rect(x, y, right, bottom):
    return {'x': x / 900, 'y': y / 1165, 'width': (right - x) / 900, 'height': (bottom - y) / 1165}


for volume, page, fid, oid, x, y in [
    (1, 70, 'p70-f5', '3', 501, 833),
    (2, 98, 'p98-f3', '1', 235, 1000),
    (2, 98, 'p98-f3', '2', 416, 1000),
    (2, 124, 'p124-f1', '1', 580, 262),
    (2, 124, 'p124-f2', '1', 580, 402),
    (2, 124, 'p124-f2', '2', 580, 437),
    (2, 148, 'p148-f6', '2', 357, 1059),
]:
    option = next(node for node in field(volume, page, fid)['options'] if node['id'] == oid)
    option['rect'] = rect(x - 9, y - 10, x + 9, y + 10)
    option['presentation'] = 'marker'

word_boxes = {
    (35, 'p35-f1'): [(185, 189, 239, 208), (249, 189, 302, 208)],
    (35, 'p35-f2'): [(309, 235, 327, 255), (334, 235, 352, 255)],
    (35, 'p35-f3'): [(266, 281, 283, 301), (290, 281, 307, 301)],
    (35, 'p35-f4'): [(250, 327, 303, 347), (311, 327, 347, 347)],
    (35, 'p35-f5'): [(308, 373, 326, 393), (333, 373, 350, 393)],
    (40, 'p40-f8'): [(193, 647, 211, 667), (219, 647, 237, 667)],
    (40, 'p40-f9'): [(295, 693, 313, 713), (321, 693, 339, 713)],
    (40, 'p40-f10'): [(296, 739, 314, 759), (323, 739, 341, 759)],
    (40, 'p40-f11'): [(193, 785, 211, 805), (219, 785, 237, 805), (411, 785, 429, 805), (437, 785, 455, 805)],
    (40, 'p40-f12'): [(210, 831, 228, 851), (236, 831, 254, 851)],
}
for (page, fid), boxes in word_boxes.items():
    for node, box in zip(field(1, page, fid)['options'], boxes):
        node['rect'] = rect(*box)
        node['presentation'] = 'word'

# This passage/table has its real answer choices on page 189. The falsely
# detected table widget is retained by ID but is no longer drawn or counted.
field(1, 188, 'p188-f6')['is_context'] = True
for volume, page, fid in [(1, 210, 'p210-f1'), (2, 12, 'p12-f3'), (2, 245, 'p245-f3'), (2, 253, 'p253-f2')]:
    field(volume, page, fid)['is_context'] = True

# Inside the actual four empty letter cells, excluding the outer table border.
field(2, 108, 'p108-f4')['rect'] = rect(413, 833, 642, 882)

for volume, data in books.items():
    for detail in data['details']:
        page = next(page for page in data['pages'] if page['pageNumber'] == detail['pageNumber'])
        lookup = {f['id']: f for f in page['workbook']['fields']}
        detail['choice_unanchored'] = [item for item in detail['choice_unanchored'] if not lookup[item['fieldId']].get('is_context') and next(node for node in lookup[item['fieldId']]['options'] if node['id'] == item['optionId']).get('presentation') != 'word' and (volume, detail['pageNumber'], item['fieldId'], item['optionId']) not in {
            (1,70,'p70-f5','3'),(2,98,'p98-f3','1'),(2,98,'p98-f3','2'),(2,124,'p124-f1','1'),(2,124,'p124-f2','1'),(2,124,'p124-f2','2'),(2,148,'p148-f6','2')
        }]
    data['summary']['unanchoredChoices'] = sum(len(item['choice_unanchored']) for item in data['details'])
    data['summary']['manualExceptionsChecked'] = True
    (root / f'eps-topik-2025-workbook-{volume}' / 'aligned.json').write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    print(volume, data['summary'])
