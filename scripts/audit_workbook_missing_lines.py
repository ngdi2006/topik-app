import json
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path('tmp/workbook-choice-rows')
findings=[]
for v in (1,2):
 code=f'eps-topik-2025-workbook-{v}'
 rows=json.loads((ROOT/code/'source.json').read_text(encoding='utf-8'))['rows']
 for row in rows:
  p=row['page_number'];a=json.loads(Path(f'tmp/workbook-coordinate-review/{code}/{p:04}.anchors.json').read_text())
  w,h=a['width'],a['height'];fields=row['ocr_payload']['workbook']['fields'];missing=[]
  for b in a['lines']:
   x,y,r,bt=b
   if r-x<65 or y<190 or y>h-90:continue
   cx,cy=(x+r)/2,(y+bt)/2
   covered=False
   for f in fields:
    q=f['rect'];fx,fy,fr,fb=q['x']*w,q['y']*h,(q['x']+q['width'])*w,(q['y']+q['height'])*h
    if f['kind']=='text':
     if fx-10<=cx<=fr+10 and fy-6<=cy<=fb+8:covered=True
    elif fx-8<=cx<=fr+8 and fy-8<=cy<=fb+8:covered=True
   if not covered:missing.append(b)
  if missing:findings.append(dict(volume=v,page=p,boxes=missing))
Path('tmp/workbook-coordinate-corrections/missing-lines.json').write_text(json.dumps(findings))
print(json.dumps(findings))
