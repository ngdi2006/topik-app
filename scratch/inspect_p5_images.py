import fitz

pdf_path = r"e:\TOPIK-IBT\topik-app\DATA-EPS\TU-VUNG-BIEN-BAO.pdf"
doc = fitz.open(pdf_path)
page = doc[4] # Page 5

print("Page 5 size:", page.rect)
print("Images on Page 5:")
for img_info in page.get_images(full=True):
    xref = img_info[0]
    rects = page.get_image_rects(xref)
    print(f"xref: {xref}, rects: {rects}")
