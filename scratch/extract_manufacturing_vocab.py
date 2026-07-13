import sys
import io
import os
import re
import json
import urllib.parse
import fitz  # PyMuPDF

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = r"E:\TOPIK-IBT\topik-app\DATA-EPS\TU-VUNG-SXCT.pdf"
output_dir = r"e:\TOPIK-IBT\topik-app\public\uploads\vocab_vong2"
os.makedirs(output_dir, exist_ok=True)

doc = fitz.open(pdf_path)

vocab_data = {
    1: [
        {"row": 0, "col": 0, "word_kr": "CO2용접기", "word_vi": "Máy hàn khí CO2"},
        {"row": 0, "col": 1, "word_kr": "누전차단기", "word_vi": "Bộ ngắt mạch điện"},
        {"row": 0, "col": 2, "word_kr": "방청유", "word_vi": "Dầu chống rỉ"},
        {"row": 0, "col": 3, "word_kr": "버니어 캘리퍼스", "word_vi": "Thước cặp vernier"},
        {"row": 1, "col": 0, "word_kr": "밴딩기", "word_vi": "Máy đóng gói"},
        {"row": 1, "col": 1, "word_kr": "에어콤프레샤", "word_vi": "Máy nén khí"},
        {"row": 1, "col": 2, "word_kr": "원형톱", "word_vi": "Máy cưa đĩa"},
        {"row": 1, "col": 3, "word_kr": "지게차", "word_vi": "Xe nâng"},
        {"row": 2, "col": 0, "word_kr": "컨트롤 판넬", "word_vi": "Bảng điều khiển"},
        {"row": 2, "col": 1, "word_kr": "호이스트", "word_vi": "Tời"},
        {"row": 2, "col": 2, "word_kr": "회로시험기", "word_vi": "Máy kiểm tra mạch"},
        {"row": 2, "col": 3, "word_kr": "대차", "word_vi": "Xe đẩy hàng"},
    ],
    2: [
        {"row": 0, "col": 0, "word_kr": "파이프 렌치", "word_vi": "Cờ lê ống"},
        {"row": 0, "col": 1, "word_kr": "소켓 렌치", "word_vi": "Bộ cờ lê ổ cắm"},
        {"row": 0, "col": 2, "word_kr": "스패너", "word_vi": "Cờ lê"},
        {"row": 0, "col": 3, "word_kr": "육각렌치", "word_vi": "Cờ lê lục giác"},
        {"row": 1, "col": 0, "word_kr": "작업등", "word_vi": "Đèn làm việc"},
        {"row": 1, "col": 1, "word_kr": "전기 드릴", "word_vi": "Khoan điện"},
        {"row": 1, "col": 2, "word_kr": "전선 릴", "word_vi": "Cuộn cáp"},
        {"row": 1, "col": 3, "word_kr": "핸드카", "word_vi": "Xe đẩy tay"},
        {"row": 2, "col": 0, "word_kr": "핸드 파레트 트럭", "word_vi": "Xe đẩy tay pallet"},
        {"row": 2, "col": 1, "word_kr": "공구함", "word_vi": "Hộp dụng cụ"},
        {"row": 2, "col": 2, "word_kr": "나사못", "word_vi": "Vít"},
        {"row": 2, "col": 3, "word_kr": "마대", "word_vi": "Bao tải"},
        {"row": 3, "col": 0, "word_kr": "바구니", "word_vi": "Rổ, giỏ"},
        {"row": 3, "col": 1, "word_kr": "사다리", "word_vi": "Thang"},
        {"row": 3, "col": 2, "word_kr": "스위치", "word_vi": "Công tắc"},
        {"row": 3, "col": 3, "word_kr": "암나사(너트), 수나사(볼트)", "word_vi": "Đai ốc, bu lông"},
    ],
    3: [
        {"row": 0, "col": 0, "word_kr": "저울", "word_vi": "Cân"},
        {"row": 0, "col": 1, "word_kr": "줄자", "word_vi": "Thước dây"},
        {"row": 0, "col": 2, "word_kr": "파렛트", "word_vi": "Pallet"},
        {"row": 0, "col": 3, "word_kr": "환풍기", "word_vi": "Quạt thông gió"},
        {"row": 1, "col": 0, "word_kr": "방수 앞치마", "word_vi": "Tạp dề chống thấm nước"},
        {"row": 1, "col": 1, "word_kr": "방진마스크", "word_vi": "Khẩu trang chống bụi"},
        {"row": 1, "col": 2, "word_kr": "보안경", "word_vi": "Kính bảo hộ"},
        {"row": 1, "col": 3, "word_kr": "안전대", "word_vi": "Dây đai an toàn"},
        {"row": 2, "col": 0, "word_kr": "안전모", "word_vi": "Mũ bảo hộ"},
        {"row": 2, "col": 1, "word_kr": "안전장갑", "word_vi": "Găng tay bảo hộ"},
        {"row": 2, "col": 2, "word_kr": "안전화", "word_vi": "Giày bảo hộ"},
        {"row": 2, "col": 3, "word_kr": "용접면", "word_vi": "Mặt nạ hàn"},
        {"row": 3, "col": 0, "word_kr": "위생마스크", "word_vi": "Khẩu trang chống khuẩn"},
        {"row": 3, "col": 1, "word_kr": "위생모", "word_vi": "Mũ chống khuẩn"},
        {"row": 3, "col": 2, "word_kr": "위생복", "word_vi": "Quần áo chống khuẩn"},
        {"row": 3, "col": 3, "word_kr": "위생장갑", "word_vi": "Găng tay chống khuẩn"},
    ],
    4: [
        {"row": 0, "col": 0, "word_kr": "위생장화", "word_vi": "Ủng chống khuẩn"},
        {"row": 0, "col": 1, "word_kr": "작업복", "word_vi": "Quần áo làm việc"},
        {"row": 0, "col": 2, "word_kr": "청력보호구", "word_vi": "Dụng cụ bảo vệ thính giác"},
        {"row": 0, "col": 3, "word_kr": "열풍기", "word_vi": "Quạt sấy"},
        {"row": 1, "col": 0, "word_kr": "밀링 머신", "word_vi": "Máy phay"},
        {"row": 1, "col": 1, "word_kr": "선반 기계", "word_vi": "Máy tiện"},
        {"row": 1, "col": 2, "word_kr": "프레스 기계", "word_vi": "Máy dập"},
        {"row": 1, "col": 3, "word_kr": "플라이어", "word_vi": "Kìm mỏ nhọn"},
        {"row": 2, "col": 0, "word_kr": "롱 노즈 플라이어", "word_vi": "Kìm mỏ dài"},
        {"row": 2, "col": 1, "word_kr": "펜치", "word_vi": "Kìm"},
        {"row": 2, "col": 2, "word_kr": "니퍼", "word_vi": "Kìm cắt"},
        {"row": 2, "col": 3, "word_kr": "멍키 스패너", "word_vi": "Mỏ lết"},
        {"row": 3, "col": 0, "word_kr": "토크 렌치", "word_vi": "Cờ lê lực"},
        {"row": 3, "col": 1, "word_kr": "일자 드라이버", "word_vi": "Tua vít 2 cạnh"},
        {"row": 3, "col": 2, "word_kr": "십자드라이버", "word_vi": "Tua vít 4 cạnh"},
        {"row": 3, "col": 3, "word_kr": "베어링", "word_vi": "Ổ lăn, vòng bi(bạc đạn)"},
    ],
    5: [
        {"row": 0, "col": 0, "word_kr": "기어", "word_vi": "Bánh răng"},
        {"row": 0, "col": 1, "word_kr": "코일 스프링", "word_vi": "Lò xo cuộn"},
        {"row": 0, "col": 2, "word_kr": "풀러", "word_vi": "Dụng cụ tháo vòng bi"},
        {"row": 0, "col": 3, "word_kr": "수준기", "word_vi": "Ống bọt nước"},
        {"row": 1, "col": 0, "word_kr": "망치", "word_vi": "Búa"},
        {"row": 1, "col": 1, "word_kr": "쇠톱", "word_vi": "Cưa sắt"},
        {"row": 1, "col": 2, "word_kr": "줄", "word_vi": "Cái dũa"},
        {"row": 1, "col": 3, "word_kr": "정", "word_vi": "Cái đục"},
        {"row": 2, "col": 0, "word_kr": "리머", "word_vi": "Mũi Khoan"},
        {"row": 2, "col": 1, "word_kr": "금 긋기 바늘", "word_vi": "Dụng cụ vạch dấu"},
        {"row": 2, "col": 2, "word_kr": "바이스", "word_vi": "Ê tô"},
        {"row": 2, "col": 3, "word_kr": "판금 가위", "word_vi": "Kéo cắt tấm kim loại"},
        {"row": 3, "col": 0, "word_kr": "핸드 절단기", "word_vi": "Kìm cộng lực, máy cắt tay"},
        {"row": 3, "col": 1, "word_kr": "전기 절단기", "word_vi": "Máy cắt điện"},
        {"row": 3, "col": 2, "word_kr": "토치", "word_vi": "Đèn hàn"},
        {"row": 3, "col": 3, "word_kr": "용접봉", "word_vi": "Que hàn"},
    ],
    6: [
        {"row": 0, "col": 0, "word_kr": "혼합기", "word_vi": "Máy trộn"},
        {"row": 0, "col": 1, "word_kr": "접시 저울", "word_vi": "Cân đĩa"},
        {"row": 0, "col": 2, "word_kr": "전자 저울", "word_vi": "Cân điện tử"},
        {"row": 0, "col": 3, "word_kr": "자", "word_vi": "Thước"},
        {"row": 1, "col": 0, "word_kr": "테이블톱 và 날물", "word_vi": "Cưa bàn và lưỡi cưa"},
        {"row": 1, "col": 1, "word_kr": "그라인더", "word_vi": "Máy mài"},
        {"row": 1, "col": 2, "word_kr": "대패", "word_vi": "Bào"},
        {"row": 1, "col": 3, "word_kr": "끌", "word_vi": "Cái đục"},
        {"row": 2, "col": 0, "word_kr": "클램프", "word_vi": "Cái kẹp"},
        {"row": 2, "col": 1, "word_kr": "퍼티헤라", "word_vi": "Bay bả matit"},
        {"row": 2, "col": 2, "word_kr": "사포", "word_vi": "Giấy nhám"},
        {"row": 2, "col": 3, "word_kr": "롤러", "word_vi": "Con lăn"},
        {"row": 3, "col": 0, "word_kr": "붓", "word_vi": "Cọ"},
        {"row": 3, "col": 1, "word_kr": "스프레이 건", "word_vi": "Súng phun sơn"},
    ]
}

def classify_cell(rect, page_num):
    cx = (rect.x0 + rect.x1) / 2
    cy = (rect.y0 + rect.y1) / 2
    
    # Columns
    if cx < 162:
        col = 0
    elif cx < 300:
        col = 1
    elif cx < 430:
        col = 2
    else:
        col = 3
        
    # Rows
    if page_num == 1:
        if cy < 320:
            row = 0
        elif cy < 520:
            row = 1
        else:
            row = 2
    else:
        if cy < 220:
            row = 0
        elif cy < 400:
            row = 1
        elif cy < 580:
            row = 2
        else:
            row = 3
            
    return row, col

extracted_records = []

for page_idx in range(len(doc)):
    page_num = page_idx + 1
    page = doc[page_idx]
    
    print(f"\nProcessing Page {page_num}...")
    
    # 1. Extract all images and classification
    img_list = page.get_images(full=True)
    rects = []
    for img in img_list:
        xref = img[0]
        r_list = page.get_image_rects(xref)
        if r_list:
            rect = r_list[0]
            if rect.y1 < 90 or rect.width < 20 or rect.height < 20:
                continue
            rects.append(rect)
            
    # Deduplicate overlapping image rects
    deduped_rects = []
    for r in rects:
        duplicate = False
        for dr in deduped_rects:
            if abs(r.x0 - dr.x0) < 5 and abs(r.y0 - dr.y0) < 5 and abs(r.x1 - dr.x1) < 5 and abs(r.y1 - dr.y1) < 5:
                duplicate = True
                break
        if not duplicate:
            deduped_rects.append(r)
            
    # Group rects into grid map {(row, col): rect} selecting largest area if duplicates
    grid_images = {}
    for r in deduped_rects:
        row, col = classify_cell(r, page_num)
        area = r.width * r.height
        key = (row, col)
        if key in grid_images:
            old_r = grid_images[key]
            old_area = old_r.width * old_r.height
            if area > old_area:
                grid_images[key] = r
        else:
            grid_images[key] = r
            
    # 2. Iterate items of this page and crop
    items = vocab_data.get(page_num, [])
    for item in items:
        row = item["row"]
        col = item["col"]
        word_kr = item["word_kr"]
        word_vi = item["word_vi"]
        
        image_url = None
        key = (row, col)
        
        crop_rect = None
        if key in grid_images:
            rect = grid_images[key]
            padding = 5
            crop_rect = fitz.Rect(
                max(0, rect.x0 - padding),
                max(0, rect.y0 - padding),
                min(page.rect.width, rect.x1 + padding),
                min(page.rect.height, rect.y1 + padding)
            )
        else:
            # Calculate fallback rect dynamically
            # 1. Get X range from other rows in same col
            x0s, x1s = [], []
            for r_idx in range(4):
                if (r_idx, col) in grid_images:
                    x0s.append(grid_images[(r_idx, col)].x0)
                    x1s.append(grid_images[(r_idx, col)].x1)
            # 2. Get Y range from other cols in same row
            y0s, y1s = [], []
            for c_idx in range(4):
                if (row, c_idx) in grid_images:
                    y0s.append(grid_images[(row, c_idx)].y0)
                    y1s.append(grid_images[(row, c_idx)].y1)
                    
            if x0s and y0s:
                x0 = sum(x0s) / len(x0s)
                x1 = sum(x1s) / len(x1s)
                y0 = sum(y0s) / len(y0s)
                y1 = sum(y1s) / len(y1s)
                crop_rect = fitz.Rect(x0 - 5, y0 - 5, x1 + 5, y1 + 5)
                print(f"  Using dynamic fallback rect for cell ({row}, {col}): ({crop_rect.x0:.1f}, {crop_rect.y0:.1f}, {crop_rect.x1:.1f}, {crop_rect.y1:.1f})")
            else:
                print(f"  [Warning] Fallback calculation failed for cell ({row}, {col})")
        
        if crop_rect:
            try:
                pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=crop_rect)
                filename = f"vocab_sxct_{page_num}_{row}_{col}.png"
                filepath = os.path.join(output_dir, filename)
                pix.save(filepath)
                image_url = f"/uploads/vocab_vong2/{filename}"
                print(f"  Cropped: {filename} at cell ({row}, {col})")
            except Exception as e:
                print(f"  [Error] Cropping failed for {word_kr} at cell ({row}, {col}): {e}")
        else:
            print(f"  [Warning] No image found or calculated for {word_kr} at cell ({row}, {col})")
            
        audio_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q={urllib.parse.quote(word_kr)}"
        
        extracted_records.append({
            "industry": "MANUFACTURING",
            "type": "TOOL",
            "word_kr": word_kr,
            "word_vi": word_vi,
            "description_vi": None,
            "image_url": image_url,
            "audio_url": audio_url
        })

json_output_path = r"e:\TOPIK-IBT\topik-app\scratch\extracted_manufacturing_vocab.json"
with open(json_output_path, "w", encoding="utf-8") as f:
    json.dump(extracted_records, f, ensure_ascii=False, indent=2)
    
print(f"\nExtraction completed! Total items: {len(extracted_records)}")
print(f"JSON saved to: {json_output_path}")
