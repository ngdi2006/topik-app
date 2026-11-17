"""Read every source page and measure answer lines and empty parentheses."""
import json
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from inspect_workbook_anchors import anchors, components
from align_workbook_regions import dotted_regions, templates, detect_numerals


def scan(task):
    volume, number = task
    code = f'eps-topik-2025-workbook-{volume}'
    target = Path(f'tmp/workbook-coordinate-review/{code}/{number:04}.anchors.json')
    if target.exists(): return
    image, ink, raw, circles = anchors(f'tmp/workbooks-2025/{code}/{number:04}.webp')
    lines = dotted_regions(image, ink, raw)
    comps, _ = components(ink)
    parentheses = []
    # Narrow, tall curved glyphs enclosing genuinely empty paper.
    slender = [(x,y,r,b) for _,x,y,r,b,a in comps if 3 <= r-x <= 12 and 17 <= b-y <= 36 and y > 160 and b < image.height-90]
    for x,y,r,b in slender:
        for xx,yy,rr,bb in slender:
            if not (25 <= xx-r <= 180 and abs(yy-y)<=3 and abs(bb-b)<=3): continue
            if ink[min(y,yy):max(b,bb),r+3:xx-3].mean() > .006: continue
            # Opening/closing parentheses have opposite bend direction.
            left = ink[y:b,x:r]; right = ink[yy:bb,xx:rr]
            def bend(a):
                yy2,xx2=np.where(a); edge=xx2[(yy2<a.shape[0]*.2)|(yy2>a.shape[0]*.8)]; middle=xx2[(yy2>a.shape[0]*.35)&(yy2<a.shape[0]*.65)]
                return float(edge.mean()-middle.mean()) if len(edge) and len(middle) else 0
            if bend(left) > .8 and bend(right) < -.8:
                parentheses.append([r+3,min(y,yy)-2,xx-3,max(b,bb)+2])
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps({'width':image.width,'height':image.height,'lines':lines,'parentheses':parentheses,'circles':circles}),encoding='utf-8')


if __name__ == '__main__':
    tasks=[(v,p) for v,n in [(1,273),(2,270)] for p in range(1,n+1)]
    with ProcessPoolExecutor(max_workers=4) as pool:
        for i,_ in enumerate(pool.map(scan,tasks)):
            if i%25==0: print(f'{i+1}/543 pages measured',flush=True)
    refs=templates()
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
    for volume,number in tasks:
        code=f'eps-topik-2025-workbook-{volume}'
        root=Path(f'tmp/workbook-coordinate-review/{code}')
        path=root/f'{number:04}.anchors.json'
        data=json.loads(path.read_text(encoding='utf-8'))
        image=Image.open(f'tmp/workbooks-2025/{code}/{number:04}.webp').convert('RGB')
        data['numerals']=detect_numerals(image,data['circles'],refs)
        draw=ImageDraw.Draw(image)
        for prefix,key,color in [('L','lines','#087f23'),('P','parentheses','#8020cc'),('C','numerals','#cc2020')]:
            for index,item in enumerate(data[key]):
                box=item['box'] if isinstance(item,dict) else item
                draw.rectangle(box,outline=color,width=2)
                label=f'{prefix}{index}'
                x,y=box[0],max(0,box[1]-18)
                bounds=draw.textbbox((x,y),label,font=font)
                draw.rectangle(bounds,fill='white')
                draw.text((x,y),label,fill=color,font=font)
        path.write_text(json.dumps(data),encoding='utf-8')
        image.save(root/f'{number:04}.annotated.webp',quality=90)
    print('543 labeled anchor images ready',flush=True)
