import docx
import json
import urllib.parse

doc = docx.Document(r"E:\TOPIK-IBT\topik-app\DATA-EPS\KHA-NANG-TOAN-HOC.docx")
table = doc.tables[0]

extracted_records = []
total_questions = len(table.rows) // 2

for i in range(total_questions):
    q_row = table.rows[2*i]
    a_row = table.rows[2*i + 1]
    
    q_kr = q_row.cells[1].text.strip().replace('\n', ' ')
    q_vi = q_row.cells[2].text.strip().replace('\n', ' ')
    
    a_kr = a_row.cells[1].text.strip().replace('\n', ' ')
    a_vi = a_row.cells[2].text.strip().replace('\n', ' ')
    
    q_kr = " ".join(q_kr.split())
    q_vi = " ".join(q_vi.split())
    a_kr = " ".join(a_kr.split())
    a_vi = " ".join(a_vi.split())
    
    # Clean up f"Đáp án: " prepending, just make it the answer string
    description_vi = f"{a_kr} ({a_vi})"
    
    word_kr_encoded = urllib.parse.quote(q_kr)
    audio_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q={word_kr_encoded}"
    
    record = {
        'industry': 'COMMON',
        'type': 'MATH',
        'word_kr': q_kr,
        'word_vi': q_vi,
        'description_vi': description_vi,
        'image_url': None,
        'audio_url': audio_url
    }
    extracted_records.append(record)

json_output_path = r"e:\TOPIK-IBT\topik-app\scratch\math_vocab.json"
with open(json_output_path, "w", encoding="utf-8") as f:
    json.dump(extracted_records, f, ensure_ascii=False, indent=2)

print(f"Successfully extracted {len(extracted_records)} math records.")
