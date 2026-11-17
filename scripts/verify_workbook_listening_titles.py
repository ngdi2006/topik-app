"""Check the first printed question digit against measured heading glyphs."""
import json
from pathlib import Path
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

rows=json.loads(Path('reports/workbook-listening-title-anchors.json').read_text(encoding='utf-8'))
def glyph(row):
    volume=1 if row['lesson']<=30 else 2
    image=Image.open(f'tmp/workbooks-2025/eps-topik-2025-workbook-{volume}/{row["page"]:04}.webp').convert('L')
    x,y,w,h=row['box']
    if row['method']=='measured_question_number':crop=np.array(image.crop((x,y,x+w,y+h)))<115
    else:
        ink=np.array(image.crop((x+w+1,y-5,x+w+50,y+h+5)))<115
        labels,n=ndi.label(ink);options=[]
        for i,b in enumerate(ndi.find_objects(labels)):
            if b is not None and b[0].stop-b[0].start>=h*.6 and (labels[b]==i+1).sum()>15:options.append((b[1].start,labels[b]==i+1))
        if not options:raise ValueError(f'No printed number: {row}')
        crop=min(options,key=lambda item:item[0])[1]
    return np.array(Image.fromarray(crop.astype('uint8')*255).resize((24,32),Image.Resampling.NEAREST))>0

reference_pairs={1:(1,1),3:(7,3),4:(4,4),5:(1,5),6:(2,6),7:(14,7),8:(2,8),9:(1,9)}
templates={digit:glyph(next(row for row in rows if (row['lesson'],row['question'])==pair)) for digit,pair in reference_pairs.items()}
failures=[]
for row in rows:
    actual=glyph(row)
    expected=int(str(row['question'])[0])
    scores={digit:float(np.logical_and(ndi.binary_dilation(actual),template).sum()+np.logical_and(ndi.binary_dilation(template),actual).sum())/max(1,actual.sum()+template.sum()) for digit,template in templates.items()}
    predicted=max(scores,key=scores.get)
    if predicted!=expected:failures.append({'lesson':row['lesson'],'page':row['page'],'question':row['question'],'predicted':predicted,'scores':{str(k):round(v,3) for k,v in scores.items()}})
Path('reports/workbook-listening-title-digit-check.json').write_text(json.dumps({'checked':len(rows),'mismatches':failures},indent=2),encoding='utf-8')
print(json.dumps({'checked':len(rows),'mismatches':failures},ensure_ascii=False,indent=2))
