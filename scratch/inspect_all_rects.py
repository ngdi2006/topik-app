import fitz

pdf_path = r"E:\TOPIK-IBT\topik-app\DATA-EPS\TU-VUNG-SXCT.pdf"
doc = fitz.open(pdf_path)

for page_idx in [3, 5]: # Pages 4 and 6
    page_num = page_idx + 1
    page = doc[page_idx]
    print(f"\n--- PAGE {page_num} ALL RECTS ---")
    img_list = page.get_images(full=True)
    for idx, img in enumerate(img_list):
        xref = img[0]
        r_list = page.get_image_rects(xref)
        print(f"Image {idx} (xref={xref}): found {len(r_list)} rects")
        for ridx, r in enumerate(r_list):
            print(f"  Rect {ridx}: ({r.x0:.1f}, {r.y0:.1f}, {r.x1:.1f}, {r.y1:.1f})")
