"""Find enclosed answer cells across both books, including cells without dots."""
import json
import sys
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from scipy import ndimage as ndi
from PIL import Image,ImageDraw

ROOT=Path('tmp/workbook-choice-rows')


def scan(task):
    volume,row=task;p=row['page_number'];code=f'eps-topik-2025-workbook-{volume}'
    image=Image.open(f'tmp/workbooks-2025/{code}/{p:04}.webp').convert('RGB');w,h=image.size
    dark=np.asarray(image.convert('L'))<140
    ink=ndi.binary_closing(np.asarray(image.convert('L'))<185,structure=np.ones((3,3)))
    holes=ndi.binary_fill_holes(ink)&~ink;labels,_=ndi.label(holes)
    cells=[]
    for i,b in enumerate(ndi.find_objects(labels),1):
        if b is None:continue
        yy,xx=b;cw,ch=xx.stop-xx.start,yy.stop-yy.start
        if not(24<cw<w*.85 and 24<ch<h*.18 and yy.start>140 and yy.stop<h-70):continue
        if (labels[b]==i).mean()<.94:continue
        cells.append(dict(box=[xx.start,yy.start,xx.stop,yy.stop],ink=float(dark[b].mean())))
    # Real tables have adjoining cells with common straight boundaries.
    families=[];visited=set()
    def adjacent(a,b):
        x,y,r,bt=a;xx,yy,rr,bb=b
        return (abs(y-yy)<6 and abs(bt-bb)<6 and min(abs(r-xx),abs(rr-x))<9) or (abs(x-xx)<6 and abs(r-rr)<6 and min(abs(bt-yy),abs(bb-y))<9)
    for i in range(len(cells)):
        if i in visited:continue
        todo=[i];group=[]
        while todo:
            j=todo.pop()
            if j in visited:continue
            visited.add(j);group.append(cells[j])
            todo.extend(k for k in range(len(cells)) if k not in visited and adjacent(cells[j]['box'],cells[k]['box']))
        if len(group)>=2:families.append(group)
    fields=[f for f in row['ocr_payload']['workbook']['fields'] if f['kind']=='text' and not f.get('is_context')]
    output=[]
    for group in families:
        empty=[c for c in group if c['ink']<.0015]
        if not empty:continue
        boxes=[c['box'] for c in group];bounds=[min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)]
        nearby=[]
        for f in fields:
            r=f['rect'];b=[r['x']*w,r['y']*h,(r['x']+r['width'])*w,(r['y']+r['height'])*h]
            if b[2]>bounds[0] and b[0]<bounds[2] and b[3]>bounds[1] and b[1]<bounds[3]:nearby.append((f,b))
        if not nearby and (len(empty)<2 or len(empty)<len(group)*.3):continue
        missing=[];misaligned=[]
        for c in empty:
            x,y,r,bt=c['box'];area=(r-x)*(bt-y)
            coverage=[]
            for f,b in nearby:
                overlap=max(0,min(r,b[2])-max(x,b[0]))*max(0,min(bt,b[3])-max(y,b[1]))
                coverage.append((overlap/area,f,b))
            best=max(coverage,key=lambda t:t[0]) if coverage else (0,None,None)
            if best[0]<.35:missing.append(c['box'])
            elif best[0]<.8:misaligned.append(dict(cell=c['box'],fieldId=best[1]['id'],coverage=round(best[0],2)))
        if missing or misaligned:output.append(dict(bounds=bounds,emptyCells=[c['box'] for c in empty],fields=[dict(id=f['id'],label=f['label'],box=b) for f,b in nearby],missing=missing,misaligned=misaligned))
    if output:
        draw=ImageDraw.Draw(image)
        for group in output:
            for b in group['emptyCells']:draw.rectangle(b,outline='#16a34a',width=2)
            for f in group['fields']:draw.rectangle(f['box'],outline='#2563eb',width=2)
            for b in group['missing']:draw.rectangle(b,outline='red',width=4)
        image.resize((900,round(h*900/w))).save(ROOT/code/f'{p:04}.table-audit.jpg')
    return dict(volume=volume,page=p,width=w,height=h,groups=output)


if __name__=='__main__':
    tasks=[]
    for v in(1,2):
        data=json.loads((ROOT/f'eps-topik-2025-workbook-{v}/source.json').read_text(encoding='utf-8'))
        if '--planned' in sys.argv:
            planned=json.loads((ROOT/f'eps-topik-2025-workbook-{v}/planned.json').read_text(encoding='utf-8'))
            for row in data['rows']:row['ocr_payload']['workbook']=next(p['workbook']for p in planned['pages']if p['pageNumber']==row['page_number'])
        tasks.extend((v,row)for row in data['rows'])
    with ProcessPoolExecutor(max_workers=4)as pool:results=list(pool.map(scan,tasks))
    issues=[r for r in results if r['groups']]
    (ROOT/'table-audit.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(dict(pagesScanned=len(results),flaggedPages=len(issues),pages=[[r['volume'],r['page']]for r in issues])))
