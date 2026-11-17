"""Locate printed opening brackets instead of estimating from answer boxes."""
import json
from pathlib import Path
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

anchors={};audit=[];cache={}
manual_hints={(14,7):.586,(23,8):.527,(47,7):.365,(57,7):.098}
for lesson in range(1,61):
    volume=1 if lesson<=30 else 2
    manifest=json.loads(Path(f'tmp/workbook-listening-elevenlabs/B{lesson}/question-groups/web-manifest.json').read_text(encoding='utf-8'))
    code=f'eps-topik-2025-workbook-{volume}'
    used=set()
    for group in manifest['segments']:
        page=group['pageNumber'];key=(volume,page)
        if key not in cache:
            image=Image.open(f'tmp/workbooks-2025/{code}/{page:04}.webp').convert('RGB')
            rgb=np.array(image);h,w=rgb.shape[:2]
            ink=np.max(rgb,axis=2)<115
            labels,count=ndi.label(ink)
            found=[]
            for i,box in enumerate(ndi.find_objects(labels)):
                if box is None:continue
                y,x=box[0].start,box[1].start;hh,ww=box[0].stop-y,box[1].stop-x
                if not (.075*w<=x<=.15*w and .055*h<y<.94*h and .008*h<=hh<=.026*h and .0015*w<=ww<=.009*w):continue
                glyph=labels[box]==i+1
                left=glyph[:,:max(1,ww//3)].any(axis=1).mean()
                right=glyph[:,-max(1,ww//3):].any(axis=1).mean()
                top=glyph[:max(2,hh//5)].any(axis=0).mean()
                bottom=glyph[-max(2,hh//5):].any(axis=0).mean()
                if left>.85 and right<.45 and top>.75 and bottom>.75:found.append({'x':x/w,'y':(y+hh/2)/h,'box':[x,y,ww,hh]})
            cache[key]=(w,h,found)
        w,h,candidates=cache[key]
        available=[c for i,c in enumerate(candidates) if (page,i) not in used]
        hint=manual_hints.get((lesson,group['questionNumber']),group['anchorY'])
        best=min(available,key=lambda c:abs(c['y']-hint)) if available else None
        distance=abs(best['y']-hint) if best else 1
        if best and distance<.13:
            if (lesson,group['questionNumber']) not in [(47,7),(57,7)]:used.add((page,candidates.index(best)))
            chosen={**best,'method':'measured_printed_bracket'}
        else:
            chosen={'x':.104,'y':group['anchorY'],'method':'needs_review'}
        if (lesson,group['questionNumber']) in [(47,7),(57,7)]:
            ink=np.max(np.array(Image.open(f'tmp/workbooks-2025/{code}/{page:04}.webp').convert('RGB')),axis=2)<115
            x0,x1=round(w*.095),round(w*.125);y0,y1=round(h*max(0,hint-.04)),round(h*(hint+.05))
            local,n=ndi.label(ink[y0:y1,x0:x1]);options=[]
            for box in ndi.find_objects(local):
                if box is None:continue
                yy,xx=y0+box[0].start,x0+box[1].start;hh,ww=box[0].stop-box[0].start,box[1].stop-box[1].start
                if .008*h<hh<.026*h and .003*w<ww<.022*w:options.append({'x':xx/w,'y':(yy+hh/2)/h,'box':[xx,yy,ww,hh]})
            if not options:raise ValueError(f'No question number at B{lesson} Q7')
            chosen={**min(options,key=lambda item:abs(item['y']-hint)),'method':'measured_question_number'}
        anchors[f'{code}:{page}:{group["questionNumber"]}']={'x':round(chosen['x'],7),'y':round(chosen['y'],7)}
        audit.append({'lesson':lesson,'page':page,'question':group['questionNumber'],'hint':group['anchorY'],'distance':round(distance,4),**chosen})
Path('src/lib/textbooks/workbook-listening-anchors.json').write_text(json.dumps(anchors,ensure_ascii=False,indent=2),encoding='utf-8')
Path('reports/workbook-listening-title-anchors.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print('Measured',sum(row['method']=='measured_printed_bracket' for row in audit),'of',len(audit))
for row in audit:
    if row['method']=='needs_review' or row['distance']>.075:print(json.dumps(row,ensure_ascii=False))
