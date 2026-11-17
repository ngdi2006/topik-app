import json
import re
from pathlib import Path

base = Path('tmp/workbook-listening-elevenlabs')
toc = json.loads(Path('reports/workbook-toc.json').read_text(encoding='utf-8'))
heading = re.compile(r'고르(?:십시오|세요|시오)|(?:답|연결|표|쓰|말)하?(?:십시오|세요)|연결하세요|표하세요|쓰세요|쓰십시오|두 사람은 무엇|무엇에 대해 말|물음에 답')
numbers = {word: index for index, word in enumerate(['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구', '십'])}
numbers.update({'하나': 1, '둘': 2, '셋': 3, '넷': 4, '다섯': 5, '여섯': 6, '일곱': 7, '여덟': 8, '아홉': 9, '열': 10})
def question(text):
    match = re.match(r'^\s*(\d{1,2}|아홉|여덟|일곱|여섯|다섯|하나|둘|셋|넷|[일이삼사오육칠팔구십열])\s*(번|[.,]|$)', text)
    if not match or (match[2] == '번' and text[match.end():].startswith('부터')): return None
    return int(match[1]) if match[1].isdigit() else numbers[match[1]]
prefix = re.compile(r'^(다음|잘 듣|질문|들은|이 사람|두 사람|여기는 어디|무엇|이 대화|이야기|그림|대화|설명)')
all_plans = []
lines = []
for lesson in range(1, 61):
    root = base / f'B{lesson}'
    data = json.loads((root / 'segments.json').read_text(encoding='utf-8'))
    segments = data['segments']
    candidates = []
    for index, segment in enumerate(segments):
        text = segment['text_ko']
        if not heading.search(text) or '다시' in text or len(text) > 130:
            continue
        if '고르' not in text and ('쓰세요' in text or '쓰십시오' in text) and not prefix.search(text): continue
        # Instruction fragments are joined with adjacent introductory phrases.
        first = index
        while first > 0:
            previous = segments[first - 1]
            if segment['start'] - previous['end'] > 5 or (re.search(r'[.?!]$', previous['text_ko']) and previous['text_ko'] != '여기는 어디입니까?') or '다시' in previous['text_ko'] or heading.search(previous['text_ko']): break
            first -= 1
            if index - first >= 4: break
        if candidates and first <= candidates[-1]['lastSegment'] + 1 and segments[first]['start'] - segments[candidates[-1]['lastSegment']]['end'] < 3:
            candidates[-1]['lastSegment'] = index
            candidates[-1]['text'] = ' '.join(s['text_ko'] for s in segments[candidates[-1]['firstSegment']:index+1])
        else:
            candidates.append({'firstSegment': first, 'lastSegment': index, 'start': segments[first]['start'], 'text': ' '.join(s['text_ko'] for s in segments[first:index+1])})
    volume = 1 if lesson <= 30 else 2
    book = next(b for b in toc['books'] if b['code'] == f'eps-topik-2025-workbook-{volume}')
    unit = next(u for u in book['units'] if u['unit_number'] == lesson)
    printed = []
    for page in range(unit['start_page'], unit['end_page']+1):
        fields = json.loads(Path(f"tmp/workbook-interactions/{book['code']}/{page:04}.json").read_text(encoding='utf-8'))['fields']
        for field in fields:
            if field.get('section') == 'listening':
                printed.append({'page': page, 'label': field['label'], 'y': field['rect']['y'], 'id': field['id'], 'context': field.get('is_context', False)})
    plan = {'lesson': lesson, 'sourceChecksum': data['sourceChecksum'], 'duration': data['duration'], 'candidates': candidates, 'fields': printed, 'startPage': unit['start_page'], 'endPage': unit['end_page']}
    for candidate in candidates:
        next_q = question(candidate['text'])
        for segment in segments[candidate['lastSegment']+1:candidate['lastSegment']+7]:
            if next_q: break
            next_q = question(segment['text_ko'])
        candidate['nextQuestion'] = next_q
    (root / 'group-text-plan.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf-8')
    lines.append(f'B{lesson} pages {unit["start_page"]}-{unit["end_page"]}')
    for c in candidates:
        after = ' '.join(s['text_ko'] for s in segments[c['lastSegment']+1:c['lastSegment']+3])
        lines.append(f'  Q{c["nextQuestion"]} seg{c["firstSegment"]} @{c["start"]:.2f}: {c["text"]} >> {after}')
    unique = list(dict.fromkeys(f"p{f['page']} {f['label']}" for f in printed))
    lines.append('  PRINT: '+' | '.join(unique))
    all_plans.append({'lesson': lesson, 'candidates': len(candidates), 'fields': len(printed)})
Path('reports/workbook-group-text-plans.txt').write_text('\n'.join(lines), encoding='utf-8')
print(json.dumps(all_plans))
