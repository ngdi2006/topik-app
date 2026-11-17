"""Snap existing exercise IDs to actual printed dots/circled numerals.

Only geometry changes. The exported current layouts remain an untouched backup.
"""
from pathlib import Path
import argparse
import copy
import json
from functools import lru_cache
import numpy as np
from scipy import ndimage as ndi
from scipy.optimize import linear_sum_assignment
from PIL import Image
from inspect_workbook_anchors import anchors

ROOT = Path('tmp/workbook-alignment')


def pixels(rect, width, height):
    return [rect['x'] * width, rect['y'] * height, (rect['x'] + rect['width']) * width, (rect['y'] + rect['height']) * height]


def normalized(box, width, height):
    x, y, right, bottom = box
    x = max(0, min(x, width - 2)); y = max(0, min(y, height - 2))
    return {'x': round(x / width, 7), 'y': round(y / height, 7), 'width': round(max(1, min(right, width) - x) / width, 7), 'height': round(max(1, min(bottom, height) - y) / height, 7)}


def patch(image, box):
    return np.asarray(image.crop(tuple(box)).convert('L').resize((24, 24), Image.Resampling.BILINEAR), dtype=float) / 255


def templates():
    image, _, _, circles = anchors('tmp/workbooks-2025/eps-topik-2025-workbook-1/0215.webp')
    ordered = [box for box in circles if 790 < box[0] < 805 and 450 < box[1] < 1310 and box[2] - box[0] >= 23 and box[3] - box[1] >= 24] + [box for box in circles if 1580 < box[1] < 1590 and box[2] - box[0] >= 23]
    assert len(ordered) == 16
    return [(index % 4 + 1, patch(image, box)) for index, box in enumerate(ordered)]


def detect_numerals(image, boxes, refs):
    result = []
    for box in boxes:
        if box[1] < 150 or box[3] > image.height - 80:
            continue
        value = patch(image, box)
        scores = sorted((float(np.mean((value - reference) ** 2)), digit) for digit, reference in refs)
        score, digit = scores[0]
        if score < 0.085:
            result.append({'box': box, 'digit': digit, 'error': score})
    return result


def dotted_regions(image, ink, raw):
    width, height = image.size
    lines = []
    for box in raw:
        x, y, right, bottom = box
        if y < 150 or y > height - 90:
            continue
        # At real dotted leaders the tiny ink components repeat regularly.
        strip = ink[max(0, y - 1):bottom + 1, x:right]
        columns = np.where(strip.any(axis=0))[0]
        if len(columns) < 3:
            continue
        starts = columns[np.r_[True, np.diff(columns) > 1]]
        if len(starts) < 3 or np.median(np.diff(starts)) < 3:
            continue
        lines.append([x, y, right, bottom])
    lines.sort(key=lambda box: (box[1], box[0]))
    groups = []
    for line in lines:
        x, y, right, bottom = line
        previous = groups[-1] if groups else None
        if previous:
            px, py, pr, pb = previous
            gap = y - pb
            between = ink[pb + 4:max(pb + 4, y - 25), max(x, px):min(right, pr)]
            if 10 <= gap <= 65 and abs(x - px) < 15 and abs(right - pr) < 25 and int(between.sum()) < 20:
                previous[3] = bottom
                continue
        groups.append(line.copy())
    return [[x - 1, y - 23, right + 1, bottom + 2] for x, y, right, bottom in groups]


def assign_ordered(fields, regions, width, height):
    """Allow extra print anchors and genuine unlined spaces without shifting IDs."""
    ordered = sorted(enumerate(fields), key=lambda pair: (pair[1]['rect']['y'], pair[1]['rect']['x']))
    regions = sorted(regions, key=lambda box: (box[1], box[0]))
    costs = np.full((len(ordered), len(regions)), 1e6)
    for i, (_, field) in enumerate(ordered):
        x, y, right, bottom = pixels(field['rect'], width, height)
        for j, (rx, ry, rr, rb) in enumerate(regions):
            ratio = (rr - rx) / max(1, right - x)
            if not 0.18 <= ratio <= 4 or abs(ry - y) > 320:
                continue
            costs[i, j] = abs(ry - y) * 0.65 + abs(rx - x) * 0.5 + abs((rr - rx) - (right - x)) * 0.15

    @lru_cache(None)
    def solve(i, j):
        if i >= len(ordered): return 0, ()
        if j >= len(regions): return 155 * (len(ordered) - i), ()
        skip_field, pairs = solve(i + 1, j)
        best = (skip_field + 155, pairs)
        skip_region, pairs = solve(i, j + 1)
        if skip_region < best[0]: best = skip_region, pairs
        tail, pairs = solve(i + 1, j + 1)
        if costs[i, j] + tail < best[0]: best = costs[i, j] + tail, ((ordered[i][0], j),) + pairs
        return best
    return [(fields[i], regions[j]) for i, j in solve(0, 0)[1]]


def image_bands(image, nodes):
    width, height = image.size
    rects = [pixels(node['rect'], width, height) for node in nodes]
    left = max(0, int(min(box[0] for box in rects)) - 35)
    right = min(width, int(max(box[2] for box in rects)) + 35)
    top = max(150, int(min(box[1] for box in rects)) - 80)
    bottom = min(height - 90, int(max(box[3] for box in rects)) + 120)
    rgb = np.asarray(image)[top:bottom, left:right].astype(np.int16)
    colored = (rgb.max(axis=2) - rgb.min(axis=2) > 45) & (rgb.min(axis=2) < 215)
    rows = colored.sum(axis=1) > 4
    rows = ndi.binary_closing(rows, structure=np.ones(13))
    labels, _ = ndi.label(rows)
    result = []
    for segment in ndi.find_objects(labels):
        if segment is None: continue
        span = segment[0]
        if span.stop - span.start < 30: continue
        yy, xx = np.where(colored[span.start:span.stop])
        if len(xx) < 150: continue
        result.append([left + int(xx.min()) - 3, top + span.start - 3, left + int(xx.max()) + 4, top + span.stop + 3])
    return result


def target_rows(image, ink, nodes):
    width, height = image.size
    boxes = [pixels(node['rect'], width, height) for node in nodes]
    left = max(0, int(min(box[0] for box in boxes)) - 40)
    right = min(width, int(max(box[2] for box in boxes)) + 65)
    top = max(150, int(min(box[1] for box in boxes)) - 100)
    bottom = min(height - 90, int(max(box[3] for box in boxes)) + 100)
    crop = ink[top:bottom, left:right]
    occupied = ndi.binary_closing(crop.sum(axis=1) >= 3, structure=np.ones(5))
    labels, _ = ndi.label(occupied)
    result = []
    for segment in ndi.find_objects(labels):
        if segment is None: continue
        span = segment[0]
        if not 12 <= span.stop - span.start <= 45: continue
        yy, xx = np.where(crop[span.start:span.stop])
        if len(xx) < 30: continue
        result.append([left + int(xx.min()) - 2, top + span.start - 2, left + int(xx.max()) + 3, top + span.stop + 2])
    return result


def avoid_print(ink, rect, width, height):
    x, y, right, bottom = pixels(rect, width, height)
    x = int(x); y = int(y); right = int(right); bottom = int(bottom)
    current = ink[max(0, y):bottom, max(0, x):right]
    if not current.size or current.mean() <= 0.045:
        return rect, False
    # Search nearby blank paper, keeping the answer in the same horizontal
    # neighborhood. This handles unruled cells and handwriting spaces too.
    target_height = min(max(16, bottom - y), 32)
    target_width = right - x
    integral = np.pad(ink.astype(np.int32), ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    best = None
    for fraction in (1, 0.8, 0.6, 0.4):
        w = max(12, int(target_width * fraction))
        for yy in range(max(151, y - 25), min(height - 90 - target_height, y + 141), 3):
            for xx in range(max(90, x - 18), min(width - w - 40, x + 81), 6):
                area = integral[yy + target_height, xx + w] - integral[yy, xx + w] - integral[yy + target_height, xx] + integral[yy, xx]
                if area / (w * target_height) > 0.012: continue
                distance = abs(yy - y) + abs(xx - x) * 0.5 + (1 - fraction) * 80
                if best is None or distance < best[0]: best = (distance, [xx, yy, xx + w, yy + target_height])
        if best is not None: break
    return (normalized(best[1], width, height), True) if best else (rect, False)


def align_page(image, ink, raw_lines, circles, original, refs):
    workbook = copy.deepcopy(original)
    width, height = image.size
    report = {'text': 0, 'choice': 0, 'match_sources': 0, 'match_targets': 0, 'text_unanchored': [], 'choice_unanchored': []}
    regions = dotted_regions(image, ink, raw_lines)
    text_fields = [field for field in workbook['fields'] if field['kind'] == 'text']
    matches = assign_ordered(text_fields, regions, width, height)
    aligned = set()
    for field, box in matches:
        field['rect'] = normalized(box, width, height)
        aligned.add(field['id']); report['text'] += 1
    for field in text_fields:
        if field['id'] not in aligned:
            report['text_unanchored'].append(field['id'])
        field['rect'], _ = avoid_print(ink, field['rect'], width, height)

    numerals = detect_numerals(image, circles, refs)
    expected = [(field, index, option) for field in workbook['fields'] if field['kind'] == 'choice' and len(field['options']) in (4, 8) for index, option in enumerate(field['options'])]
    if expected and numerals:
        costs = np.full((len(expected), len(numerals) + len(expected)), 300.0)
        for i, (field, index, option) in enumerate(expected):
            x, y, right, bottom = pixels(option['rect'], width, height)
            for j, candidate in enumerate(numerals):
                if candidate['digit'] != index % 4 + 1: continue
                cx, cy, cr, cb = candidate['box']
                # Vision often estimated a whole word/line; its left edge is a
                # much better cue than its center when finding the printed number.
                dx = min(abs(cx - x), abs((cx + cr) / 2 - (x + right) / 2))
                dy = abs((cy + cb) / 2 - (y + bottom) / 2)
                if dx > 400 or dy > 450: continue
                costs[i, j] = dx * 0.55 + dy + candidate['error'] * 100
        ii, jj = linear_sum_assignment(costs)
        done = set()
        for i, j in zip(ii, jj):
            if j >= len(numerals) or costs[i, j] >= 260: continue
            field, index, option = expected[i]
            x, y, right, bottom = numerals[j]['box']
            option['rect'] = normalized([x - 1, y - 1, right + 1, bottom + 1], width, height)
            done.add(i); report['choice'] += 1
        # Preserve printed question order when the complete set of a numeral
        # is present. This corrects duplicated/shifted vision rows rather than
        # stealing a later question's otherwise-nearer option.
        for digit in range(1, 5):
            wanted = [(i, option) for i, (_, index, option) in enumerate(expected) if index % 4 + 1 == digit]
            found = sorted([candidate for candidate in numerals if candidate['digit'] == digit], key=lambda candidate: (candidate['box'][1], candidate['box'][0]))
            if len(wanted) != len(found): continue
            for (i, option), candidate in zip(wanted, found):
                x, y, right, bottom = candidate['box']
                option['rect'] = normalized([x - 1, y - 1, right + 1, bottom + 1], width, height)
                if i not in done: report['choice'] += 1
                done.add(i)
        report['choice_unanchored'] = [{'fieldId': field['id'], 'optionId': option['id']} for i, (field, _, option) in enumerate(expected) if i not in done]
    elif expected:
        report['choice_unanchored'] = [{'fieldId': field['id'], 'optionId': option['id']} for field, _, option in expected]

    for field in workbook['fields']:
        if field['kind'] == 'choice':
            for option in field['options']:
                option['presentation'] = 'word' if len(field['options']) not in (4, 8) else 'marker'

    for field in workbook['fields']:
        if field['kind'] != 'match': continue
        source_matches = assign_ordered(field['sources'], image_bands(image, field['sources']), width, height)
        for node, box in source_matches:
            node['rect'] = normalized(box, width, height); report['match_sources'] += 1
        target_matches = assign_ordered(field['targets'], target_rows(image, ink, field['targets']), width, height)
        for node, box in target_matches:
            node['rect'] = normalized(box, width, height); report['match_targets'] += 1
    workbook['alignment_version'] = 2
    workbook['alignment_source'] = 'printed_dots_and_number_glyphs'
    return workbook, report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--volume', type=int)
    parser.add_argument('--pages', type=str)
    args = parser.parse_args()
    refs = templates()
    selection = set(map(int, args.pages.split(','))) if args.pages else None
    for volume in ([args.volume] if args.volume else [1, 2]):
        code = f'eps-topik-2025-workbook-{volume}'
        source = json.loads((ROOT / code / 'source.json').read_text(encoding='utf-8'))
        output = []; details = []
        for row in source['rows']:
            number = row['page_number']
            if selection and number not in selection: continue
            image, ink, raw_lines, circles = anchors(f'tmp/workbooks-2025/{code}/{number:04}.webp')
            workbook, report = align_page(image, ink, raw_lines, circles, row['ocr_payload']['workbook'], refs)
            output.append({'pageNumber': number, 'workbook': workbook})
            details.append({'pageNumber': number, **report})
            if number % 25 == 0 or selection:
                print(code, number, report['text'], 'text', report['choice'], 'choices', flush=True)
        summary = {key: sum(item[key] for item in details) for key in ['text', 'choice', 'match_sources', 'match_targets']}
        summary['unanchoredText'] = sum(len(item['text_unanchored']) for item in details)
        summary['unanchoredChoices'] = sum(len(item['choice_unanchored']) for item in details)
        (ROOT / code / 'aligned.json').write_text(json.dumps({'pages': output, 'summary': summary, 'details': details}, ensure_ascii=False), encoding='utf-8')
        print(code, summary, flush=True)
