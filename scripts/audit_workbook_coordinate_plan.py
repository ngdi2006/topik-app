import json
import sys
from pathlib import Path
import numpy as np
from scipy import ndimage as ndi
from PIL import Image,ImageDraw

root=Path('tmp/workbook-coordinate-review')
selection=set(sys.argv[1].split(',')) if len(sys.argv)>1 else None
issues=[];overlaps=[]
for v in (1,2):
    code=f'eps-topik-2025-workbook-{v}'
    data=json.loads((root/f'plan-{v}.json').read_text(encoding='utf-8'))
    for page in data['pages']:
        number=page['pageNumber']
        if selection and f'{v}:{number}' not in selection:continue
        image=Image.open(f'tmp/workbooks-2025/{code}/{number:04}.webp').convert('RGB')
        w,h=image.size
        ink=np.asarray(image.convert('L'))<125
        rules=ndi.binary_opening(ink,structure=np.ones((30,1)))|ndi.binary_opening(ink,structure=np.ones((1,30)))
        letters=ink&~rules
        lab,_=ndi.label(letters)
        areas=np.bincount(lab.ravel())
        # Exclude answer dots and noise; keep printed character strokes.
        letters=letters & (areas[lab]>35)
        draw=ImageDraw.Draw(image)
        widgets=[]
        for field in page['workbook']['fields']:
            if field.get('is_context'):continue
            if field['kind']=='text':widgets.append((field['id'],field['rect']))
            elif field['kind']=='choice':widgets.extend((f"{field['id']}:{n['id']}",n['rect']) for n in field['options'])
        for i,(fid,a) in enumerate(widgets):
            for other,b in widgets[i+1:]:
                overlap=max(0,min(a['x']+a['width'],b['x']+b['width'])-max(a['x'],b['x']))*max(0,min(a['y']+a['height'],b['y']+b['height'])-max(a['y'],b['y']))
                fraction=overlap/min(a['width']*a['height'],b['width']*b['height'])
                if fraction>.2:overlaps.append(dict(volume=v,page=number,fieldId=fid,other=other,fraction=round(fraction,3)))
        for field in page['workbook']['fields']:
            if field.get('is_context') or field['kind']!='text':continue
            r=field['rect'];x,y=int(r['x']*w),int(r['y']*h);right,bottom=int((r['x']+r['width'])*w),int((r['y']+r['height'])*h)
            crop=letters[y:bottom,x:right]
            if crop.size and crop.mean()>.035:
                issues.append(dict(volume=v,page=number,fieldId=field['id'],fraction=round(float(crop.mean()),4),label=field['label']))
                draw.rectangle((x,y,right,bottom),outline='red',width=3)
        if any(i['volume']==v and i['page']==number for i in issues):
            image.resize((900,round(h*900/w))).save(root/code/f'{number:04}.ink-issues.jpg')
if selection:
    issues=[i for i in json.loads((root/'ink-issues.json').read_text(encoding='utf-8')) if f"{i['volume']}:{i['page']}" not in selection]+issues
    overlaps=[i for i in json.loads((root/'overlap-issues.json').read_text(encoding='utf-8')) if f"{i['volume']}:{i['page']}" not in selection]+overlaps
(root/'ink-issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'overlap-issues.json').write_text(json.dumps(overlaps,ensure_ascii=False,indent=2),encoding='utf-8')
print('Potential text overlaps:',len(issues))
print('Overlapping widgets:',len(overlaps))
