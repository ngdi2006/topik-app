"""Measure picture answer hit areas independently of printed number markers."""
import json,re
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw

result={};report=[];thumbs=[]
for volume in (1,2):
    code=f'eps-topik-2025-workbook-{volume}'
    plan=json.loads(Path(f'tmp/workbook-choice-rows/{code}/planned.json').read_text(encoding='utf-8'))
    for page in plan['pages']:
        fields=page['workbook']['fields'];image=None
        for field in fields:
            opts=sorted(field['options'],key=lambda n:n['rect']['x'])
            if field['kind']!='choice' or len(opts)!=4 or not all(re.fullmatch(r'[①②③④1-4.\s]+',o['label']) for o in opts):continue
            ys=[o['rect']['y'] for o in opts]
            if max(ys)-min(ys)>.012:continue
            if image is None:
                image=Image.open(f'tmp/workbooks-2025/{code}/{page["pageNumber"]:04}.webp').convert('RGB');pixels=np.asarray(image).astype(int);w,h=image.size
            centers=[o['rect']['x']+o['rect']['width']/2 for o in opts]
            gap=min(b-a for a,b in zip(centers,centers[1:]))
            if gap<.12:continue
            marker=min(ys)
            prior=max([o['rect']['y']+o['rect']['height']+.012 for f in fields if f['kind']=='choice' for o in f['options'] if o['rect']['y']<marker-.025]+[.09])
            top=max(prior,marker-.19);bottom=marker-.012
            bounds=[]
            for center in centers:
                x1=int(max(0,center-gap*.46)*w);x2=int(min(1,center+gap*.46)*w)
                y1=int(top*h);y2=int(bottom*h)
                crop=pixels[y1:y2,x1:x2]
                if not crop.size:bounds.append(None);continue
                color=(crop.max(2)-crop.min(2)>35)&(crop.min(2)<215)
                ink=crop.mean(2)<150
                # Broad, tall ink/color regions distinguish illustrations from text rows.
                mask=color if color.sum()>150 else ink
                rows=np.where(mask.sum(1)>max(5,(x2-x1)*.08))[0]
                if len(rows)<h*.03:bounds.append(None);continue
                lo,hi=rows[0],rows[-1]+1
                if hi-lo<h*.035:bounds.append(None);continue
                bounds.append((x1,y1+lo,x2,y1+hi))
            if sum(b is not None for b in bounds)<3:continue
            if (volume==2 and page["pageNumber"]==260) or (volume==1 and page["pageNumber"]==132 and field["id"]=="p132-f6"):continue
            fallback_top=min(b[1] for b in bounds if b is not None)
            bounds=[b if b is not None else (int((center-gap*.46)*w),fallback_top,int((center+gap*.46)*w),int(bottom*h)) for center,b in zip(centers,bounds)]
            # Give each picture its own column, including the gap down to its number.
            key=page['workbook']['image_hash'];entries=result.setdefault(key,{})
            for option,b in zip(opts,bounds):
                x1,y1,x2,y2=b
                r=option['rect'];end=max(r['y']+r['height']+.004,y2/h)
                entries[f'{field["id"]}:{option["id"]}']={'x':x1/w,'y':max(0,y1/h-.004),'width':(x2-x1)/w,'height':end-max(0,y1/h-.004)}
            report.append({'volume':volume,'page':page['pageNumber'],'field':field['id']})
            crop=image.crop((int((centers[0]-gap*.48)*w),int(top*h),int((centers[-1]+gap*.48)*w),int((marker+.025)*h)))
            crop.thumbnail((380,150));thumb=Image.new('RGB',(400,180),'white');thumb.paste(crop,(5,22));ImageDraw.Draw(thumb).text((5,3),f'V{volume} P{page["pageNumber"]} {field["id"]}',fill='black');thumbs.append(thumb)
Path('src/lib/textbooks/workbook-picture-choices.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
Path('reports/workbook-picture-choice-measurement.json').write_text(json.dumps(report,indent=2))
for i in range(0,len(thumbs),24):
    batch=thumbs[i:i+24];sheet=Image.new('RGB',(1600,180*((len(batch)+3)//4)),'#ddd')
    for j,t in enumerate(batch):sheet.paste(t,((j%4)*400,(j//4)*180))
    sheet.save(f'reports/workbook-picture-choices-{i//24+1}.jpg')
print(f'Measured {len(report)} picture questions / {len(report)*4} clickable pictures')
