import docx
import re
import json
import os

def expand_slash_sentences(ko_text, vi_text):
    ko_text = ko_text.strip()
    vi_text = vi_text.strip()
    
    # 1. 기술/ 자격증
    if "기술/ 자격증이" in ko_text:
        return [
            ("한국에서 사용할 수 있는 기술이 있나요?", "Bạn có kỹ thuật gì có thể sử dụng ở Hàn Quốc không?"),
            ("한국에서 사용할 수 있는 자격증이 있나요?", "Bạn có bằng cấp gì có thể sử dụng ở Hàn Quốc không?")
        ]
        
    # 2. 돈을/ 월급을/ 급여를
    if "돈을/ 월급을/ 급여를" in ko_text:
        return [
            ("회사가 돈을 주지 않으면 어떻게 할 건가요?", "Nếu công ty không trả tiền thì sẽ làm thế nào?"),
            ("회사가 월급을 주지 않으면 어떻게 할 건가요?", "Nếu công ty không trả lương thì sẽ làm thế nào?"),
            ("회사가 급여를 주지 않으면 어떻게 할 건가요?", "Nếu công ty không trả lương thì sẽ làm thế nào?")
        ]
        
    # 3. 폭행하면 / 때리면
    if "폭행하면" in ko_text and "때리면" in ko_text:
        return [
            ("상사가 폭행하면 어떻게 할 건가요?", "Nếu cấp trên bạo hành thì sẽ làm như thế nào?"),
            ("상사가 때리면 어떻게 할 건가요?", "Nếu cấp trên đánh đập thì sẽ làm như thế nào?")
        ]
        
    # 4. 돈/ 물건
    if "돈/ 물건" in ko_text:
        return [
            ("회사에서 돈 잃어버리면 어떻게 할 건가요?", "Nếu mất tiền ở công ty thì sẽ làm như thế nào?"),
            ("회사에서 물건 잃어버리면 어떻게 할 건가요?", "Nếu mất đồ vật ở công ty thì sẽ làm như thế nào?")
        ]
        
    # Check if there is any simple slash combination
    if "/" in ko_text and "/" in vi_text:
        ko_parts = [p.strip() for p in ko_text.split("/")]
        vi_parts = [p.strip() for p in vi_text.split("/")]
        if len(ko_parts) == len(vi_parts):
            return list(zip(ko_parts, vi_parts))
            
    return [(ko_text, vi_text)]

def parse_docx():
    docx_path = r"E:\TOPIK-IBT\topik-app\DATA-EPS\XU-LY-TINH-HUONG.docx"
    doc = docx.Document(docx_path)
    table = doc.tables[0]
    
    current_q_num = None
    questions = []
    
    for row in table.rows:
        cells = [cell.text.strip().replace('\n', ' ') for cell in row.cells]
        unique_cells = []
        for c in cells:
            if not unique_cells or unique_cells[-1] != c:
                unique_cells.append(c)
                
        if len(unique_cells) < 2:
            continue
            
        col0 = unique_cells[0]
        match_q = re.match(r'^(\d+)\.$', col0)
        if match_q:
            current_q_num = int(match_q.group(1))
            q_text = unique_cells[1]
            q_vi = unique_cells[2] if len(unique_cells) > 2 else ""
            questions.append({
                "num": current_q_num,
                "q_texts": [q_text],
                "q_vis": [q_vi],
                "answers": []
            })
        elif current_q_num is not None:
            text = unique_cells[1]
            vi = unique_cells[2] if len(unique_cells) > 2 else ""
            if text.startswith('-'):
                # suggested answer
                cleaned_ans = re.sub(r'^-\s*', '', text).strip()
                questions[-1]["answers"].append(cleaned_ans)
            else:
                # alternative question
                questions[-1]["q_texts"].append(text)
                questions[-1]["q_vis"].append(vi)
                
    # Now expand the variants
    final_questions = []
    for q in questions:
        # Collect suggested answers
        suggested = q["answers"]
        for q_text, q_vi in zip(q["q_texts"], q["q_vis"]):
            # Split Korean sentence if it contains multiple sentences (e.g. Q6 contains 3 sentences)
            # Find questions using "?"
            ko_sentences = [s.strip() + "?" for s in q_text.split("?") if s.strip()]
            
            if len(ko_sentences) > 1 and q["num"] == 6:
                # For Q6:
                # 1. 회사가 월급을 제때 주지 않으면 어떻게 할 건가요?
                # 2. 회사가 돈을/ 월급을/ 급여를 주지 않으면 어떻게 할 건가요?
                # 3. 월급을 체불하면 어떻게 하실 겁니까?
                for sent in ko_sentences:
                    expanded = expand_slash_sentences(sent, q_vi)
                    for ko, vi in expanded:
                        final_questions.append({
                            "question_text": ko,
                            "vietnamese_meaning": vi,
                            "suggested_answers": suggested
                        })
            else:
                expanded = expand_slash_sentences(q_text, q_vi)
                for ko, vi in expanded:
                    final_questions.append({
                        "question_text": ko,
                        "vietnamese_meaning": vi,
                        "suggested_answers": suggested
                    })
                    
    # Save to JSON
    out_path = r"e:\TOPIK-IBT\topik-app\scratch\xu_ly_expanded.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final_questions, f, ensure_ascii=False, indent=2)
        
    print(f"Generated {len(final_questions)} question records and saved to scratch/xu_ly_expanded.json")

if __name__ == "__main__":
    parse_docx()
