from pathlib import Path
import json
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

issues = []
for volume in (1, 2):
    root = Path(f'tmp/workbook-alignment/eps-topik-2025-workbook-{volume}')
    data = json.loads((root / 'aligned.json').read_text(encoding='utf-8'))
    counts = {'text': 0, 'textInk': 0, 'wideChoice': 0, 'unanchoredChoices': data['summary']['unanchoredChoices']}
    for page in data['pages']:
        number = page['pageNumber']
        image = np.asarray(Image.open(f'tmp/workbooks-2025/eps-topik-2025-workbook-{volume}/{number:04}.webp').convert('L'))
        height, width = image.shape
        ink = image < 125
        rules = ndi.binary_opening(ink, structure=np.ones((30, 1))) | ndi.binary_opening(ink, structure=np.ones((1, 30)))
        ink = ink & ~rules
        for field in page['workbook']['fields']:
            if field.get('is_context'): continue
            if field['kind'] == 'text':
                counts['text'] += 1
                r = field['rect']; x = int(r['x'] * width); y = int(r['y'] * height)
                right = int((r['x'] + r['width']) * width); bottom = int((r['y'] + r['height']) * height)
                crop = ink[y:bottom, x:right]
                fraction = float(np.mean(crop)) if crop.size else 1
                if fraction > 0.065:
                    counts['textInk'] += 1
                    issues.append({'volume': volume, 'page': number, 'fieldId': field['id'], 'kind': 'text_ink', 'fraction': round(fraction, 4)})
            if field['kind'] == 'choice':
                for node in field['options']:
                    if node.get('presentation') == 'word': continue
                    if node['rect']['width'] * width > 42 or node['rect']['height'] * height > 42:
                        counts['wideChoice'] += 1
                        issues.append({'volume': volume, 'page': number, 'fieldId': field['id'], 'optionId': node['id'], 'kind': 'choice_not_marker'})
    for detail in data['details']:
        if detail['choice_unanchored']:
            issues.append({'volume': volume, 'page': detail['pageNumber'], 'kind': 'unanchored_choice', 'items': detail['choice_unanchored']})
    print(volume, counts)
Path('tmp/workbook-alignment/quality-issues.json').write_text(json.dumps(issues, indent=2))
