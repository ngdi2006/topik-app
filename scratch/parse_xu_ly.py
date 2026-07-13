import docx
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def parse_docx():
    doc = docx.Document(r"E:\TOPIK-IBT\topik-app\DATA-EPS\XU-LY-TINH-HUONG.docx")
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
        # check if it is a main question
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
            # alternative question or answer
            text = unique_cells[1]
            vi = unique_cells[2] if len(unique_cells) > 2 else ""
            if text.startswith('-'):
                # suggested answer
                questions[-1]["answers"].append({
                    "ko": text,
                    "vi": vi
                })
            else:
                # alternative question
                questions[-1]["q_texts"].append(text)
                questions[-1]["q_vis"].append(vi)
                
    return questions

def expand_options(text_ko, text_vi):
    # Regex to find alternatives like "A/ B/ C"
    # To do this correctly, we find groups of words separated by slashes.
    # For example: "몸무게가/ 체중이" -> ["몸무게가", "체중이"]
    # "얼마예요?/ 입니까?/ 인가요?" -> ["얼마예요?", "입니까?", "인가요?"]
    # Let's write a simple recursive or pattern replacement.
    # In Xử lý tình huống, let's inspect the `/` questions:
    # Q6: 회사가 돈을/ 월급을/ 급여를 주지 않으면 어떻게 할 건가요?
    # Q7: 상사가 폭행하면 / 때리면 어떻게 할 건가요? -> Nếu cấp trên bạo hành / đánh đập thì sẽ làm như thế nào?
    # Q19: 회사에서 돈/ 물건 잃어버리면 어떻게 할 건가요? -> Nếu mất tiền hay đồ vật thì sẽ làm như thế nào?
    
    # Let's handle these specific cases or write a generic slash expander:
    # Let's look at Q6 first:
    # Korean: "회사가 돈을/ 월급을/ 급여를 주지 않으면 어떻게 할 건가요?"
    # Here, "돈을/ 월급을/ 급여를" is a slash group.
    # Group 1 (KO): ["돈을", "월급을", "급여를"]
    # Group 1 (VI): ["tiền", "lương", "thu nhập"] (Wait, the input Vietnamese meaning has no slash!)
    # If Vietnamese has no slash, we map it manually or keep the full Vietnamese meaning.
    
    # Let's inspect Q7:
    # Korean: "상사가 폭행하면 / 때리면 어떻게 할 건가요?" -> slash group: ["폭행하면", "때리면"]
    # Vietnamese: "Nếu cấp trên bạo hành / đánh đập thì sẽ làm như thế nào?" -> slash group: ["bạo hành", "đánh đập"]
    # We should pair them!
    # Variation 1: "상사가 폭행하면 어떻게 할 건가요?" -> "Nếu cấp trên bạo hành thì sẽ làm như thế nào?"
    # Variation 2: "상사가 때리면 어떻게 할 건가요?" -> "Nếu cấp trên đánh đập thì sẽ làm như thế nào?"
    
    # Let's write a custom expander that covers all patterns:
    if "폭행하면" in text_ko and "때리면" in text_ko:
        return [
            ("상사가 폭행하면 어떻게 할 건가요?", "Nếu cấp trên bạo hành thì sẽ làm như thế nào?"),
            ("상사가 때리면 어떻게 할 건가요?", "Nếu cấp trên đánh đập thì sẽ làm như thế nào?")
        ]
    elif "돈을/" in text_ko:
        # "회사가 돈을/ 월급을/ 급여를 주지 않으면 어떻게 할 건가요?"
        return [
            ("회사가 돈을 주지 않으면 어떻게 할 건가요?", "Nếu công ty không trả tiền thì sẽ làm thế nào?"),
            ("회사가 월급을 주지 않으면 어떻게 할 건가요?", "Nếu công ty không trả lương thì sẽ làm thế nào?"),
            ("회사가 급여를 주지 않으면 어떻게 할 건가요?", "Nếu công ty không trả lương thì sẽ làm thế nào?")
        ]
    elif "돈/" in text_ko:
        # "회사에서 돈/ 물건 잃어버리면 어떻게 할 건가요?"
        return [
            ("회사에서 돈 잃어버리면 어떻게 할 건가요?", "Nếu mất tiền ở công ty thì sẽ làm như thế nào?"),
            ("회사에서 물건 잃어버리면 어떻게 할 건가요?", "Nếu mất đồ vật ở công ty thì sẽ làm như thế nào?")
        ]
    elif "체불하면" in text_ko:
        # "월급을 체불하면 어떻게 하실 겁니까?"
        return [(text_ko, "Nếu bị nợ lương thì sẽ làm thế nào?")]
    elif "제때" in text_ko:
        # "회사가 월급을 제때 주지 않으면 어떻게 할 건가요?"
        return [(text_ko, "Nếu công ty không trả lương đúng hạn thì sẽ làm thế nào?")]
    
    # Generic or fallback
    return [(text_ko, text_vi)]

questions = parse_docx()
print(f"Parsed {len(questions)} questions.")

for q in questions:
    print(f"\n--- Question {q['num']} ---")
    for q_text, q_vi in zip(q["q_texts"], q["q_vis"]):
        expanded = expand_options(q_text, q_vi)
        for idx, (ko, vi) in enumerate(expanded):
            print(f"  Variant {idx+1}: {ko} -> {vi}")
    print(f"  Answers ({len(q['answers'])}):")
    for ans in q["answers"]:
        print(f"    - {ans['ko']} -> {ans['vi']}")
