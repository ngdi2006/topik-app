import os
import sys
import json
from PIL import Image, ImageDraw
import rembg
import numpy as np
import scipy.ndimage as ndi

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Output directory
output_dir = r"E:\TOPIK-IBT\topik-app\DATA-EPS\img"
os.makedirs(output_dir, exist_ok=True)

# Refined Grid layout on 800x446 slide images (excluding dark outer margins)
cols = [(56, 176), (198, 320), (342, 464), (484, 606), (628, 750)]
rows = [(78, 238), (260, 420)]

tools_data = [
    # Page 1 (1-10)
    {"id": 1, "kr": "드라이버", "vi": "Tua vít", "filename": "01_tuavit_driver.png"},
    {"id": 2, "kr": "일자 드라이버", "vi": "Tua vít dẹt", "filename": "02_tuavitdet_iljadriver.png"},
    {"id": 3, "kr": "십자드라이버", "vi": "Tua vít chữ thập", "filename": "03_tuavitchuthap_sipjadriver.png"},
    {"id": 4, "kr": "플라이어", "vi": "Kìm mỏ nhọn", "filename": "04_kimmonhon_pliers.png"},
    {"id": 5, "kr": "롱노즈 플라이어", "vi": "Kìm mũi dài", "filename": "05_kimmuidai_longnosepliers.png"},
    {"id": 6, "kr": "펜치", "vi": "Kìm bấm", "filename": "06_kimbam_penchi.png"},
    {"id": 7, "kr": "니퍼", "vi": "Kìm cắt", "filename": "07_kimcat_nipper.png"},
    {"id": 8, "kr": "소켓 렌치", "vi": "Cờ lê đầu khẩu", "filename": "08_cole_daukhau_socketwrench.png"},
    {"id": 9, "kr": "소켓", "vi": "Đầu khẩu", "filename": "09_daukhau_socket.png"},
    {"id": 10, "kr": "스패너", "vi": "Cờ lê", "filename": "10_cole_spanner.png"},

    # Page 2 (11-20)
    {"id": 11, "kr": "멍키 스패너", "vi": "Mỏ lết", "filename": "11_molet_monkeyspanner.png"},
    {"id": 12, "kr": "토크 렌치", "vi": "Cờ lê lực", "filename": "12_coleluc_torquewrench.png"},
    {"id": 13, "kr": "육각 렌치", "vi": "Khóa lục giác", "filename": "13_khoalucgiac_hexwrench.png"},
    {"id": 14, "kr": "파이프 렌치", "vi": "Mỏ lết răng", "filename": "14_moletrang_pipewrench.png"},
    {"id": 15, "kr": "풀러", "vi": "Cảo bạc đạn", "filename": "15_caobacdan_puller.png"},
    {"id": 16, "kr": "수준기", "vi": "Thước thủy", "filename": "16_thuocthuy_sujungi.png"},
    {"id": 17, "kr": "망치", "vi": "Búa", "filename": "17_bua_mangchi.png"},
    {"id": 18, "kr": "장도리", "vi": "Búa nhổ đinh", "filename": "18_buanhodinh_jangdori.png"},
    {"id": 19, "kr": "쇠톱", "vi": "Cưa sắt", "filename": "19_cuasat_soetop.png"},
    {"id": 20, "kr": "줄", "vi": "Dũa", "filename": "20_dua_jul.png"},

    # Page 3 (21-30)
    {"id": 21, "kr": "정", "vi": "Đục", "filename": "21_duc_jeong.png"},
    {"id": 22, "kr": "금 긋기 바늘", "vi": "Bút lấy dấu", "filename": "22_butlaydau_geumgeutgibaneul.png"},
    {"id": 23, "kr": "바이스", "vi": "Ê-tô", "filename": "23_eto_vise.png"},
    {"id": 24, "kr": "판금 가위", "vi": "Kéo cắt tôn", "filename": "24_keocatton_pangeumgawi.png"},
    {"id": 25, "kr": "절단기", "vi": "Kìm cộng lực / Máy cắt thép", "filename": "25_kimcongluc_jeoldangi.png"},
    {"id": 26, "kr": "자", "vi": "Thước", "filename": "26_thuoc_ja.png"},
    {"id": 27, "kr": "줄자", "vi": "Thước dây", "filename": "27_thuocday_julja.png"},
    {"id": 28, "kr": "버니어 캘리퍼스", "vi": "Thước cặp", "filename": "28_thuoccap_verniercaliper.png"},
    {"id": 29, "kr": "대패", "vi": "Cái bào", "filename": "29_caibao_daepae.png"},
    {"id": 30, "kr": "끌", "vi": "Đục gỗ", "filename": "30_ducgo_kkeul.png"},

    # Page 4 (31-40)
    {"id": 31, "kr": "클램프", "vi": "Kẹp", "filename": "31_kep_clamp.png"},
    {"id": 32, "kr": "분무기", "vi": "Bình xịt", "filename": "32_binhxit_bunmugi.png"},
    {"id": 33, "kr": "사포", "vi": "Giấy nhám", "filename": "33_giaynham_sapo.png"},
    {"id": 34, "kr": "퍼티헤라", "vi": "Bay bả matit", "filename": "34_baybamatit_puttyhera.png"},
    {"id": 35, "kr": "퍼티", "vi": "Matit", "filename": "35_matit_putty.png"},
    {"id": 36, "kr": "붓", "vi": "Cọ sơn", "filename": "36_coson_but.png"},
    {"id": 37, "kr": "롤러(룰러)", "vi": "Con lăn sơn", "filename": "37_conlanson_roller.png"},
    {"id": 38, "kr": "젯소", "vi": "Sơn lót (Gesso)", "filename": "38_sonlot_gesso.png"},
    {"id": 39, "kr": "페인트", "vi": "Sơn", "filename": "39_son_paint.png"},
    {"id": 40, "kr": "바니시", "vi": "Vecni", "filename": "40_vecni_varnish.png"},

    # Page 5 (41-50)
    {"id": 41, "kr": "스프레이 건", "vi": "Súng phun sơn", "filename": "41_sungphunson_spraygun.png"},
    {"id": 42, "kr": "열풍기", "vi": "Máy thổi nhiệt", "filename": "42_maythoinhiet_yeolpunggi.png"},
    {"id": 43, "kr": "방청유", "vi": "Dầu chống gỉ", "filename": "43_dauchonggi_bangcheongyu.png"},
    {"id": 44, "kr": "사다리", "vi": "Thang", "filename": "44_thang_sadari.png"},
    {"id": 45, "kr": "작업등", "vi": "Đèn làm việc", "filename": "45_denlamviec_jakeopdeung.png"},
    {"id": 46, "kr": "전선 릴", "vi": "Cuộn dây điện", "filename": "46_cuondaydien_jeonseonril.png"},
    {"id": 47, "kr": "지게차", "vi": "Xe nâng", "filename": "47_xenang_jigecha.png"},
    {"id": 48, "kr": "대차", "vi": "Xe đẩy hàng", "filename": "48_xedayhang_daecha.png"},
    {"id": 49, "kr": "핸드카", "vi": "Xe đẩy tay", "filename": "49_xedaytay_handcar.png"},
    {"id": 50, "kr": "핸드파레트트럭", "vi": "Xe nâng tay", "filename": "50_xenangtay_handpallettruck.png"},

    # Page 6 (51-60)
    {"id": 51, "kr": "밴딩기", "vi": "Máy đóng đai PP", "filename": "51_maydongdai_baendinggi.png"},
    {"id": 52, "kr": "드릴링머신", "vi": "Máy khoan", "filename": "52_maykhoan_drillingmachine.png"},
    {"id": 53, "kr": "전기 드릴", "vi": "Khoan điện", "filename": "53_khoandien_jeongidrill.png"},
    {"id": 54, "kr": "전동커터기", "vi": "Máy cắt điện cầm tay", "filename": "54_maycatdiencamtay_jeondongcuttergi.png"},
    {"id": 55, "kr": "전기 절단기", "vi": "Máy cắt điện", "filename": "55_maycatdien_jeongijeoldangi.png"},
    {"id": 56, "kr": "리머", "vi": "Mũi doa", "filename": "56_muidoa_reamer.png"},
    {"id": 57, "kr": "CO2용접기", "vi": "Máy hàn CO2", "filename": "57_mayhanco2_co2yongjeopgi.png"},
    {"id": 58, "kr": "토치", "vi": "Đèn khò / Đèn hàn", "filename": "58_denkho_denhan_tochi.png"},
    {"id": 59, "kr": "혼합기", "vi": "Máy trộn", "filename": "59_maytron_honhapgi.png"},
    {"id": 60, "kr": "접시 저울", "vi": "Cân đĩa", "filename": "60_candia_jeopsijeoul.png"},

    # Page 7 (61-70)
    {"id": 61, "kr": "전자 저울", "vi": "Cân điện tử", "filename": "61_candientu_jeonjajeoul.png"},
    {"id": 62, "kr": "테이블톱", "vi": "Cưa bàn", "filename": "62_cuaban_tabletop.png"},
    {"id": 63, "kr": "원형톱", "vi": "Máy cưa đĩa", "filename": "63_maycuadia_wonhyeongtop.png"},
    {"id": 64, "kr": "그라인더", "vi": "Máy mài", "filename": "64_maymai_grinder.png"},
    {"id": 65, "kr": "드릴 믹서", "vi": "Máy khuấy sơn", "filename": "65_maykhuayson_drillmixer.png"},
    {"id": 66, "kr": "누전차단기", "vi": "Cầu dao chống rò điện (ELCB)", "filename": "66_caudaochongrodien_nujeonchadangi.png"},
    {"id": 67, "kr": "에어콤프레샤", "vi": "Máy nén khí", "filename": "67_maynenkhi_aircompressor.png"},
    {"id": 68, "kr": "컨트롤 판넬", "vi": "Bảng điều khiển", "filename": "68_bangdieukhien_controlpanel.png"},
    {"id": 69, "kr": "호이스트", "vi": "Tời điện", "filename": "69_toidien_hoist.png"},
    {"id": 70, "kr": "회로시험기", "vi": "Đồng hồ kiểm tra mạch điện", "filename": "70_donghokiemtramachdien_hoirosiheomgi.png"}
]

def clean_artifacts(nobg):
    arr = np.array(nobg)
    alpha = arr[:, :, 3]
    mask = alpha > 30
    labeled, num_features = ndi.label(mask)
    if num_features <= 1:
        return nobg
    sizes = ndi.sum(mask, labeled, range(1, num_features + 1))
    max_idx = np.argmax(sizes) + 1
    max_size = sizes[max_idx - 1]
    
    # Keep components that are >= 20% of max component OR close to the center
    keep = np.zeros_like(mask, dtype=bool)
    for i, size in enumerate(sizes):
        feat_id = i + 1
        if size >= max_size * 0.15:
            keep |= (labeled == feat_id)
            
    arr[:, :, 3] = np.where(keep, arr[:, :, 3], 0)
    res = Image.fromarray(arr)
    bbox = res.getbbox()
    if bbox:
        res = res.crop(bbox)
        pad = 12
        padded = Image.new("RGBA", (res.width + pad*2, res.height + pad*2), (0, 0, 0, 0))
        padded.paste(res, (pad, pad))
        return padded
    return res

print(f"Starting clean extraction for {len(tools_data)} items...")
session = rembg.new_session("u2net")

for idx, item in enumerate(tools_data):
    page_num = (idx // 10) + 1
    slot_idx = idx % 10
    row_idx = 0 if slot_idx < 5 else 1
    col_idx = slot_idx % 5

    page_path = f"E:\\TOPIK-IBT\\topik-app\\scratch\\pdf_pages\\raw_page_{page_num}_img_1.png"
    page_img = Image.open(page_path)

    x1, x2 = cols[col_idx]
    y1, y2 = rows[row_idx]
    card = page_img.crop((x1, y1, x2, y2)).convert("RGBA")

    # Sample solid card background from clean area
    bg_color = (245, 246, 248, 255)

    # Mask out yellow number badge (top-left)
    draw = ImageDraw.Draw(card)
    draw.rectangle([0, 0, 34, 30], fill=bg_color)

    # Mask out bottom text area
    draw.rectangle([0, 100, card.width, card.height], fill=bg_color)

    # Process with rembg
    nobg = rembg.remove(card, session=session)

    # Auto-trim & clean artifacts
    nobg = clean_artifacts(nobg)

    out_file = os.path.join(output_dir, item["filename"])
    nobg.save(out_file, format="PNG")
    print(f"[{idx+1:02d}/70] Saved {item['filename']} ({item['kr']} - {item['vi']})")

meta_path = os.path.join(output_dir, "metadata_tools.json")
with open(meta_path, "w", encoding="utf-8") as f:
    json.dump(tools_data, f, ensure_ascii=False, indent=2)

print("\nDone! All 70 cleaned transparent PNG images saved to:", output_dir)
