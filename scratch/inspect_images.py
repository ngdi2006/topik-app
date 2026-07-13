import fitz

pdf_path = r"E:\TOPIK-IBT\topik-app\DATA-EPS\TU-VUNG-SXCT.pdf"
doc = fitz.open(pdf_path)

for page_idx in range(len(doc)):
    page_num = page_idx + 1
    page = doc[page_idx]
    print(f"\n--- PAGE {page_num} IMAGES ---")
    
    # Text blocks for matching or reference
    img_list = page.get_images(full=True)
    print(f"Total image refs: {len(img_list)}")
    
    rects = []
    for img in img_list:
        xref = img[0]
        r_list = page.get_image_rects(xref)
        if r_list:
            rect = r_list[0]
            rects.append((rect.x0, rect.y0, rect.x1, rect.y1, xref))
            
    # Sort rects by y0, then x0
    rects = sorted(rects, key=lambda r: (round(r[1]/20)*20, r[0]))
    for idx, r in enumerate(rects):
        print(f"  {idx}: coord=({r[0]:.1f}, {r[1]:.1f}, {r[2]:.1f}, {r[3]:.1f}) xref={r[4]}")
