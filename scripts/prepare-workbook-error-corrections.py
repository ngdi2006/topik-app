"""Build transparent hit areas from the verified correction exercise scans."""
import json
import re
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

# Field ranges include continuation pages whose imported labels omit the heading.
groups = {
    1: {17: (6, 10), 24: (1, 5), 40: (4, 7), 49: (5, 9),
        138: (3, 7), 179: (5, 9), 249: (7, 9), 250: (1, 2)},
    2: {4: (9, 9), 5: (1, 4), 22: (6, 8), 23: (1, 2),
        85: (6, 10), 103: (1, 5), 120: (3, 7), 127: (7, 11),
        137: (4, 8), 155: (1, 5), 164: (1, 5), 172: (1, 5)},
}
manual = {
    (1, 138): [
        "이 식당은 맛있은 음식이 많아요.", "지금 날씨가 아주 좋고 있어요.",
        "멀은 곳에서 손님이 왔어요.", "이 옷은 너무 어둡은 색깔이라서 안 좋아해요.",
        "아버지는 운동화를 신고 있어요.",
    ],
    (1, 24): [
        "이것은 민우 씨의 가방가 아니에요.", "저건 우리 가족사진예요.",
        "로라 씨는 한국이에요.", "그것은 뭐입니까?", "이것이 우산 민우 씨예요.",
    ],
    (2, 4): ["작업복을 단정히 입어야 사고가 나지 않습니다."],
    (2, 5): [
        "안전모를 제대로 착용하지 않아서 위험하게 보입니다.",
        "깨지기 쉬운 물건을 옮길 때는 조심할 들어야 합니다.",
        "반장님의 지시에 제대로 하지 않아서 태도가 나빠 보여요.",
        "가방이 무거운 보이는데 제가 도와드릴까요?",
    ],
    (2, 103): [
        "마두 씨는 언제 선반 기계로 공작물을 갈느냐고 문의해요.",
        "사장님이 지금 창고에 바니시가 몇 통 남았으냐고 하셨어요.",
        "사장님이 원목 두께가 두꺼우느냐고 물으셨어요.",
        "아궁 씨가 창고에 대패가 있느냐고 물었어요.",
        "반장님이 아궁 씨에게 원목을 다 재단하으냐고 물어봤어요.",
    ],
    (2, 120): [
        "사고가 나도록 안전 수칙을 꼭 지키세요.",
        "배관을 묻으려면 먼저 땅을 다져야 합니다.",
        "흙을 운반할 때는 굴착기를 이용하는 것이 좋습니다.",
        "하천의 얼음이 녹으려면 날이 좀 따뜻했어요.",
        "오늘 작업할 자재가 부족하니까 빨리 주문하겠어요.",
    ],
    (2, 127): [
        "다린투 씨는 눈으로 모판을 옮길까 해요.", "내일 감자를 캐을까 해요.",
        "추우니까 에어컨을 켰지 말고 끄세요.", "사과를 따지 말고 좀 기다렸어요.",
        "점심 시간에 고구마를 굽을까 해요.",
    ],
    (2, 155): [
        "비가 많이 온 덕분에 야외 작업을 못했습니다.",
        "선체의 앞부분인 선미부에 가서 작업을 시작하세요.",
        "페인트를 분사한 후에는 스프레이 건으로 마무리 작업을 하세요.",
        "비계 기둥이 미끄러지거나 가라앉지 않도록 밑 부분에 수평으로 설치하는 부재는\n장선입니다.",
        "물 분사기로 청소한 후에는 녹을 완전히 제거해야 합니다.",
    ],
    (2, 172): [
        "반장님은 저번에 뿌리 가위를 부러뜨린대요.", "린 씨는 뚜안 씨를 도와달래요.",
        "마대를 쓰지 마래요.", "동료는 구내식당의 음식이 맛있는대요.",
        "상사는 언제 집재 작업이 끝날 거냬요.",
    ],
}

# Printed multi-line sentences retain their original line break.
line_breaks = {
    (2, 23, "p23-f1"): "요즘 젊은 사람들은 예전보다 개인 시간을 중요하게 생각해서 혼자 여행을 즐긴\n편이에요.",
}
registry = {}
report = []
for volume, pages in groups.items():
    plan = json.loads(Path(f"tmp/workbook-choice-rows/eps-topik-2025-workbook-{volume}/planned.json").read_text(encoding="utf-8"))
    for number, (first, last) in pages.items():
        page = next(p for p in plan["pages"] if p["pageNumber"] == number)
        workbook = page["workbook"]
        image = np.array(Image.open(f"tmp/workbooks-2025/eps-topik-2025-workbook-{volume}/{number:04}.webp").convert("L"))
        height, width = image.shape
        specs = {}
        for offset, index in enumerate(range(first, last + 1)):
            field = next(f for f in workbook["fields"] if f["id"] == f"p{number}-f{index}")
            sentence = manual.get((volume, number), [])[offset] if (volume, number) in manual else re.sub(r"^\d+\.\s*(?:틀린 부분을 찾고 맞게 고치십시오\.\s*)?", "", field["label"])
            sentence = line_breaks.get((volume, number, field["id"]), sentence)
            inline = field["rect"]["x"] > .45
            left = .16
            right = field["rect"]["x"] - .035 if inline else .95
            expected = field["rect"]["y"] + .01 if inline else field["rect"]["y"] - .04
            if volume == 2 and number == 85:
                expected = [1018, 1164, 1311, 1457, 1604][offset] / height
            if volume == 2 and number == 155:
                expected = [246, 393, 540, 714, 873][offset] / height
            top = max(.07, expected - .035)
            bottom = min(.94, expected + .035)
            crop = image[int(top * height):int(bottom * height), int(left * width):int(right * width)] < 105
            labels, _ = ndimage.label(crop)
            glyphs = []
            for region in ndimage.find_objects(labels):
                if region is None:
                    continue
                yy, xx = region
                if yy.stop - yy.start >= 12 and xx.stop - xx.start >= 3:
                    glyphs.append((xx.start, yy.start, xx.stop, yy.stop))
            bands = []
            for glyph in sorted(glyphs, key=lambda b: b[1]):
                center = (glyph[1] + glyph[3]) / 2
                band = next((b for b in bands if abs(b["center"] - center) < 14), None)
                if band is None:
                    band = {"center": center, "glyphs": []}
                    bands.append(band)
                band["glyphs"].append(glyph)
            lines = sentence.split("\n")
            bands.sort(key=lambda b: abs((int(top * height) + b["center"]) / height - expected))
            chosen = sorted(bands[:len(lines)], key=lambda b: b["center"])
            if len(chosen) != len(lines):
                raise ValueError((volume, number, field["id"], "Missing sentence line"))
            tokens = []
            cursor = 0
            for text, band in zip(lines, chosen):
                boxes = band["glyphs"]
                x1 = min(b[0] for b in boxes) + int(left * width)
                x2 = max(b[2] for b in boxes) + int(left * width)
                y1 = min(b[1] for b in boxes) + int(top * height)
                y2 = max(b[3] for b in boxes) + int(top * height)
                weights = [.42 if c.isspace() else .45 if c in ".,?!" else 1 for c in text]
                unit = (x2 - x1) / sum(weights)
                position = x1
                for character, weight in zip(text, weights):
                    if not character.isspace():
                        tokens.append({"text": character, "index": cursor, "rect": {
                            "x": round(position / width, 7), "y": round((y1 - 3) / height, 7),
                            "width": round(unit * weight / width, 7), "height": round((y2 - y1 + 8) / height, 7),
                        }})
                    position += unit * weight
                    cursor += 1
                cursor += 1
            sentence_bottom = max(t["rect"]["y"] + t["rect"]["height"] for t in tokens)
            sentence_top = min(t["rect"]["y"] for t in tokens)
            search_top = int((sentence_top if inline else sentence_bottom) * height)
            search_bottom = min(height, search_top + (80 if inline else 125))
            answer_left = field["rect"]["x"]
            answer_right = min(.95, answer_left + field["rect"]["width"])
            score = (image[search_top:search_bottom, int(answer_left * width):int(answer_right * width)] < 105).sum(1)
            rows = np.where(score > (60 if inline else 150))[0]
            runs = np.split(rows, np.where(np.diff(rows) > 1)[0] + 1)
            dots = [search_top + float(run.mean()) for run in runs if 0 < len(run) < 9]
            if not dots:
                raise ValueError((volume, number, field["id"], "Missing answer line"))
            answer_rect = {**field["rect"], "y": dots[0] / height - .0164, "height": .0248}
            specs[field["id"]] = {"sentence": sentence.replace("\n", " "), "label": field["label"], "tokens": tokens, "answerRect": answer_rect}
        registry[workbook["image_hash"]] = specs
        report.append({"volume": volume, "page": number, "fields": list(specs)})
Path("src/lib/textbooks/workbook-error-corrections.json").write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
Path("reports/workbook-error-correction-audit.json").write_text(json.dumps({"pagesScanned": 543, "grammarPagesReviewed": 136, "groups": report, "fields": sum(len(p["fields"]) for p in report)}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Prepared {len(report)} pages and {sum(len(p['fields']) for p in report)} correction fields")
