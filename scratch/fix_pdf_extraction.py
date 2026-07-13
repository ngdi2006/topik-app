import sys
import io
import os
import re
import json
import fitz  # PyMuPDF

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = r"e:\TOPIK-IBT\topik-app\DATA-EPS\TU-VUNG-BIEN-BAO.pdf"
output_dir = r"e:\TOPIK-IBT\topik-app\public\uploads\vocab_vong2"
os.makedirs(output_dir, exist_ok=True)

doc = fitz.open(pdf_path)

# Map segment to Column based on its start coordinate x0
def get_column(x0):
    if x0 < 162:
        return 0
    elif x0 < 300:
        return 1
    elif x0 < 430:
        return 2
    else:
        return 3

def clean_txt(text):
    t = text.strip()
    t = re.sub(r'\s+', ' ', t)
    return t

def generate_description(word_vi, word_kr):
    vi = word_vi.lower()
    
    # Prohibited signs
    if "cấm" in vi or "đừng" in vi:
        if "hút thuốc" in vi:
            return "Biển báo này dùng để nghiêm cấm hành vi hút thuốc lá trong khu vực này nhằm đề phòng hỏa hoạn, cháy nổ và bảo vệ sức khỏe mọi người xung quanh."
        elif "chụp ảnh" in vi:
            return "Biển báo này dùng để cấm quay phim, chụp ảnh tại khu vực này để bảo vệ thông tin nội bộ hoặc đảm bảo an toàn an ninh."
        elif "chạy" in vi:
            return "Biển báo này cấm chạy nhảy trong khu vực làm việc để tránh va chạm, vấp ngã hoặc xảy ra tai nạn lao động."
        elif "dựa" in vi:
            return "Biển báo này cấm dựa vào vật thể, vách ngăn hoặc cửa kính này nhằm tránh nguy cơ đổ vỡ, té ngã gây tai nạn nguy hiểm."
        elif "chạm" in vi:
            return "Biển báo này cấm chạm tay vào máy móc, thiết bị hoặc các bộ phận có điện/nóng để tránh bị thương hoặc điện giật."
        elif "ngồi" in vi:
            return "Biển báo này cấm ngồi xuống khu vực này để giữ lối đi thông thoáng hoặc phòng ngừa tai nạn do xe nâng, máy móc va quệt."
        elif "thú cưng" in vi or "mang" in vi:
            return "Biển báo này nghiêm cấm mang vật nuôi hoặc thú cưng vào khu vực làm việc để đảm bảo vệ sinh và an toàn lao động."
        elif "găng tay" in vi:
            return "Biển báo cấm đeo găng tay khi vận hành một số loại máy móc có trục xoay (như máy tiện, máy khoan) để tránh bị cuốn tay vào máy."
        elif "lắc" in vi:
            return "Biển báo cấm lắc lư hoặc đùa nghịch tại khu vực này để tránh nguy cơ mất an toàn."
        elif "xe nâng" in vi:
            return "Biển báo cấm xe nâng và các phương tiện vận chuyển tự động qua lại lối đi này để đảm bảo an toàn cho người đi bộ."
        else:
            return f"Biển báo này nghiêm cấm hành vi {word_vi.lower()} tại khu vực này để giữ an toàn tuyệt đối cho người lao động."

    # Mandatory / safety instruction signs
    if "vui lòng" in vi or "hãy" in vi or "trang bị" in vi or "mặc" in vi or "đeo" in vi or "sử dụng" in vi:
        if "phản quang" in vi:
            return "Biển báo yêu cầu người lao động bắt buộc phải mặc áo phản quang khi làm việc giúp dễ dàng nhận biết vị trí, tránh tai nạn va chạm xe cộ."
        elif "bảo hộ đầu" in vi or "mũ" in vi:
            return "Biển báo yêu cầu bắt buộc đội mũ bảo hộ lao động để bảo vệ đầu khỏi nguy cơ chấn thương do vật rơi từ trên cao xuống."
        elif "còi" in vi:
            return "Biển báo yêu cầu bấm còi cảnh báo khi đi qua các khúc cua khuất hoặc cửa ra vào để báo hiệu cho người khác tránh xe."
        elif "nút tai" in vi or "thính giác" in vi:
            return "Biển báo yêu cầu đeo chụp tai hoặc nút bịt tai chống ồn để bảo vệ màng nhĩ tại những khu vực có máy móc phát ra tiếng ồn lớn."
        elif "kính bảo hộ" in vi or "bảo vệ mắt" in vi:
            return "Biển báo yêu cầu đeo kính bảo hộ để bảo vệ mắt khỏi bụi bẩn, hóa chất độc hại hoặc các mảnh vụn bắn ra khi gia công."
        elif "khẩu trang" in vi:
            return "Biển báo yêu cầu đeo khẩu trang để tránh hít phải bụi mịn, khí độc hại hoặc ngăn ngừa lây nhiễm bệnh dịch tại nơi làm việc."
        elif "tạp dề" in vi:
            return "Biển báo yêu cầu mặc tạp dề bảo hộ chống thấm nước hoặc chống hóa chất để bảo vệ cơ thể khỏi bị bám bẩn hoặc bỏng hóa chất."
        elif "găng tay" in vi:
            return "Biển báo yêu cầu đeo găng tay bảo hộ để bảo vệ tay khỏi trầy xước, bỏng, hoặc tiếp xúc trực tiếp với chất nguy hiểm."
        elif "an toàn" in vi:
            return "Biển báo yêu cầu thắt dây đai an toàn và móc cáp treo bảo hộ khi làm việc ở các vị trí trên cao để phòng tránh tai nạn rơi ngã."
        elif "lối đi" in vi:
            return "Biển chỉ dẫn yêu cầu mọi người đi đúng làn đường hoặc lối đi dành riêng cho người đi bộ để tránh va chạm với xe cộ."
        elif "rửa tay" in vi:
            return "Biển báo nhắc nhở mọi người rửa tay sạch sẽ bằng xà phòng để giữ vệ sinh cá nhân, phòng tránh lây nhiễm các bệnh truyền nhiễm."
        elif "tay cầm" in vi:
            return "Biển báo yêu cầu bám tay vào lan can, tay vịn khi di chuyển trên cầu thang bộ để giữ thăng bằng, tránh trượt chân ngã."
        else:
            return f"Biển báo này yêu cầu người lao động thực hiện đúng chỉ dẫn: {word_vi.lower()} để bảo vệ sức khỏe và tính mạng của bản thân."

    # Hazard Warning signs
    if "rơi" in vi or "ngã" in vi or "cảnh báo" in vi or "nguy hiểm" in vi or "trơn" in vi or "vật" in vi or "chất" in vi:
        if "trượt" in vi or "trơn" in vi:
            return "Biển cảnh báo mặt sàn trơn trượt nguy hiểm, yêu cầu đi lại cẩn thận, mặc giày chống trượt để phòng tránh té ngã."
        elif "độc hại" in vi or "độc" in vi:
            return "Biển cảnh báo khu vực có chứa chất độc hại hoặc khí độc, tuyệt đối không vào nếu không có trang thiết bị bảo hộ chuyên dụng."
        elif "dễ cháy" in vi or "cháy" in vi:
            return "Biển cảnh báo chất dễ bắt lửa, dễ cháy nổ, yêu cầu tránh xa nguồn nhiệt, cấm mang lửa hoặc các vật dụng dễ phát tia lửa vào."
        elif "rơi" in vi or "ngã" in vi:
            return "Biển cảnh báo nguy hiểm có thể bị rơi ngã từ trên cao hoặc có vật liệu rơi xuống, yêu cầu thắt dây an toàn và đội mũ bảo hộ."
        else:
            return f"Biển cảnh báo nguy hiểm hoặc nguy cơ mất an toàn liên quan đến: {word_vi.lower()}. Cần nâng cao chú ý khi làm việc."

    # Exit, guide, and rescue signs
    if "cửa" in vi or "lối" in vi or "thoát" in vi or "sơ cứu" in vi or "cứu hộ" in vi or "túi" in vi:
        if "thoát hiểm" in vi or "cứu nạn" in vi:
            return "Biển chỉ dẫn lối thoát hiểm khẩn cấp hoặc đường đi an toàn khi xảy ra hỏa hoạn, sự cố khẩn cấp trong tòa nhà."
        elif "sơ cứu" in vi or "túi cứu thương" in vi:
            return "Biển chỉ dẫn nơi để hộp dụng cụ y tế sơ cứu khẩn cấp khi người lao động bị thương nhẹ tại nơi làm việc."
        elif "cửa trượt" in vi:
            return "Biển chỉ dẫn mở cửa bằng cách kéo/trượt cánh cửa sang bên trái hoặc bên phải để mở rộng lối đi."
        elif "cửa đẩy" in vi:
            return "Biển chỉ dẫn đẩy cửa về phía trước để ra hoặc vào phòng một cách thuận tiện."
        elif "cửa kéo" in vi:
            return "Biển chỉ dẫn dùng tay kéo cánh cửa về phía mình để mở cửa."
        else:
            return f"Biển chỉ dẫn vị trí hoặc thiết bị an toàn, cứu hộ: {word_vi}. Giúp mọi người xử lý nhanh khi có sự cố."

    # Fallback default description
    return f"Biển báo này cung cấp chỉ dẫn và thông điệp an toàn tại nơi làm việc: {word_vi} để bảo vệ bản thân và đồng nghiệp."

def encode_uri_component(s):
    import urllib.parse
    return urllib.parse.quote(s, safe='')

extracted_records = []

for page_idx in range(len(doc)):
    page_num = page_idx + 1
    page = doc[page_idx]
    
    # Page 1-4 are Fishery Tools
    # Page 5-11 are Common Safety Signs
    if page_num <= 4:
        industry = "FISHERY"
        vocab_type = "TOOL"
    else:
        industry = "COMMON"
        vocab_type = "SIGN"
        
    print(f"Processing Page {page_num} ({industry} - {vocab_type})...")

    # 1. Get all words on the page, excluding header/footer
    words = page.get_text("words")
    clean_words = []
    for w in words:
        x0, y0, x1, y1, word, b, l, w_no = w
        if y1 < 90 or y0 > 810:
            continue
        if "KOREA" in word or "LINK" in word or "http" in word:
            continue
        clean_words.append(w)
        
    # 2. Group all words on the page into horizontal lines
    clean_words = sorted(clean_words, key=lambda w: w[1])
    lines = []
    current_line = []
    current_y_mid = None
    
    for w in clean_words:
        x0, y0, x1, y1, word, b_no, l_no, w_no = w
        y_mid = (y0 + y1) / 2
        
        if current_y_mid is None:
            current_line = [w]
            current_y_mid = y_mid
        elif abs(y_mid - current_y_mid) < 8:
            current_line.append(w)
        else:
            lines.append(current_line)
            current_line = [w]
            current_y_mid = y_mid
    if current_line:
        lines.append(current_line)
        
    # 3. Split by horizontal gap >= 8 into columns
    columns_data = {0: {'lines': [], 'images': []}, 
                    1: {'lines': [], 'images': []}, 
                    2: {'lines': [], 'images': []}, 
                    3: {'lines': [], 'images': []}}
                    
    for line in lines:
        line = sorted(line, key=lambda w: w[0])  # sort horizontally
        
        current_seg = [line[0]]
        for w in line[1:]:
            gap = w[0] - current_seg[-1][2]
            if gap < 8:
                current_seg.append(w)
            else:
                seg_text = " ".join([word[4] for word in current_seg])
                
                # Header filtering! If segment contains title keywords, ignore
                seg_text_upper = seg_text.upper()
                if "PHẦN" in seg_text_upper or "BIỂN BÁO" in seg_text_upper or "TỪ VỰNG" in seg_text_upper or "NGÀNH" in seg_text_upper:
                    current_seg = [w]
                    continue
                
                sx0 = min([word[0] for word in current_seg])
                sy0 = min([word[1] for word in current_seg])
                sy1 = max([word[3] for word in current_seg])
                col = get_column(sx0)
                columns_data[col]['lines'].append({
                    'text': seg_text,
                    'y0': sy0,
                    'y1': sy1
                })
                current_seg = [w]
        if current_seg:
            seg_text = " ".join([word[4] for word in current_seg])
            
            # Header filtering
            seg_text_upper = seg_text.upper()
            if "PHẦN" in seg_text_upper or "BIỂN BÁO" in seg_text_upper or "TỪ VỰNG" in seg_text_upper or "NGÀNH" in seg_text_upper:
                continue
                
            sx0 = min([word[0] for word in current_seg])
            sy0 = min([word[1] for word in current_seg])
            sy1 = max([word[3] for word in current_seg])
            col = get_column(sx0)
            columns_data[col]['lines'].append({
                'text': seg_text,
                'y0': sy0,
                'y1': sy1
            })
            
    # Extract images and map by center x
    for img_info in page.get_images(full=True):
        xref = img_info[0]
        rects = page.get_image_rects(xref)
        if rects:
            rect = rects[0]
            if rect.y1 < 90 or rect.width < 30 or rect.height < 30:
                continue
            cx = (rect.x0 + rect.x1) / 2
            col = get_column(cx)
            columns_data[col]['images'].append({
                'xref': xref,
                'rect': rect
            })
            
    # Deduplicate images by rect coordinates
    for col in range(4):
        imgs = columns_data[col]['images']
        deduped = []
        for img in imgs:
            r = img['rect']
            duplicate = False
            for d in deduped:
                dr = d['rect']
                if abs(r.x0 - dr.x0) < 5 and abs(r.y0 - dr.y0) < 5 and abs(r.x1 - dr.x1) < 5 and abs(r.y1 - dr.y1) < 5:
                    duplicate = True
                    break
            if not duplicate:
                deduped.append(img)
        columns_data[col]['images'] = deduped

    # 4. Group segments of each column into Korean and Vietnamese, and match with sorted images
    for col in range(4):
        col_data = columns_data[col]
        col_lines = col_data['lines']
        col_images = col_data['images']
        
        if not col_lines:
            continue
            
        col_lines = sorted(col_lines, key=lambda l: l['y0'])
        
        kr_lines = []
        vi_lines = []
        for l in col_lines:
            if re.search(r'[\uac00-\ud7af]', l['text']):
                kr_lines.append(l)
            else:
                vi_lines.append(l)
                
        def group_lines(line_list):
            if not line_list:
                return []
            grouped = []
            cur = line_list[0]
            for l in line_list[1:]:
                if l['y0'] - cur['y1'] < 18:
                    cur = {
                        'text': cur['text'] + " " + l['text'],
                        'y0': cur['y0'],
                        'y1': l['y1']
                    }
                else:
                    grouped.append(cur)
                    cur = l
            grouped.append(cur)
            return grouped
            
        kr_grouped = group_lines(kr_lines)
        vi_grouped = group_lines(vi_lines)
        
        # Sort images top to bottom
        sorted_images = sorted(col_images, key=lambda img: img['rect'].y0)
        
        num_rows = max(len(kr_grouped), len(vi_grouped))
        for r in range(num_rows):
            kr_str = kr_grouped[r]['text'] if r < len(kr_grouped) else ""
            vi_str = vi_grouped[r]['text'] if r < len(vi_grouped) else ""
            
            if not kr_str or not vi_str:
                continue
                
            word_kr = clean_txt(kr_str)
            if word_kr == "소화기1":
                word_kr = "소화기"
            word_vi = clean_txt(vi_str)
            
            # Crop image if present
            image_url = None
            if r < len(sorted_images):
                best_img = sorted_images[r]
                rect = best_img['rect']
                padding = 5
                crop_rect = fitz.Rect(
                    max(0, rect.x0 - padding),
                    max(0, rect.y0 - padding),
                    min(page.rect.width, rect.x1 + padding),
                    min(page.rect.height, rect.y1 + padding)
                )
                
                try:
                    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=crop_rect)
                    filename = f"vocab_{page_num}_{r}_{col}_v2.png"
                    filepath = os.path.join(output_dir, filename)
                    pix.save(filepath)
                    image_url = f"/uploads/vocab_vong2/{filename}"
                    print(f"Cropped local image: {filename}")
                except Exception as e:
                    print(f"  [Error] Slicing image failed at Col {col}, Row {r}:", e)
            
            description_vi = None
            if vocab_type == "SIGN":
                description_vi = generate_description(word_vi, word_kr)
                
            audio_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q={encode_uri_component(word_kr)}"
            
            record = {
                'industry': industry,
                'type': vocab_type,
                'word_kr': word_kr,
                'word_vi': word_vi,
                'description_vi': description_vi,
                'image_url': image_url,
                'audio_url': audio_url,
                'page': page_num,
                'row': r,
                'col': col
            }
            extracted_records.append(record)

# Write JSON to exact brain directory
json_output_path = r"C:\Users\MTC\.gemini\antigravity-ide\brain\94034162-edd3-48be-b83a-f9971c8e9481\extracted_vocab_items.json"
with open(json_output_path, "w", encoding="utf-8") as f:
    json.dump(extracted_records, f, ensure_ascii=False, indent=2)

print(f"\nExtraction completed! Total items extracted: {len(extracted_records)}")
print(f"Saved structure metadata to: {json_output_path}")
