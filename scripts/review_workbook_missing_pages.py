import json
from pathlib import Path
from PIL import Image,ImageDraw
tasks=[(1,p)for p in [32,48,90,229,248]]+[(2,p)for p in [3,24,85,155]]
details=[]
for batch in range(3):
 sheet=Image.new('RGB',(1440,700),'#e2e8f0');d=ImageDraw.Draw(sheet)
 for i,(v,p)in enumerate(tasks[batch*3:batch*3+3]):
  rows=json.loads(Path(f'tmp/workbook-choice-rows/eps-topik-2025-workbook-{v}/source.json').read_text(encoding='utf-8'))['rows']
  fields=next(r for r in rows if r['page_number']==p)['ocr_payload']['workbook']['fields']
  planpath=Path(f'tmp/workbook-coordinate-corrections/q{v}-audit-plan.json')
  if planpath.exists():
   planned=next((r for r in json.loads(planpath.read_text(encoding='utf-8'))if r['pageNumber']==p),None)
   if planned:fields=planned['workbook']['fields']
  print(v,p,[(f['id'],f['label'].split('.')[0],round(f['rect']['y']*1864))for f in fields if f['kind']=='text'])
  if (v,p)in[(1,229),(1,248),(2,85),(2,155)]:
   a=json.loads(Path(f'tmp/workbook-coordinate-review/eps-topik-2025-workbook-{v}/{p:04}.anchors.json').read_text())
   details.append(dict(volume=v,page=p,lines=a['lines'],fields=fields))
  im=Image.open(f'tmp/workbooks-2025/eps-topik-2025-workbook-{v}/{p:04}.webp').convert('RGB');di=ImageDraw.Draw(im)
  for f in fields:
   if f['kind']!='text':continue
   q=f['rect'];x,y,r,b=q['x']*im.width,q['y']*im.height,(q['x']+q['width'])*im.width,(q['y']+q['height'])*im.height
   di.rectangle((x,y,r,b),outline='blue',width=3);di.text((x,y-15),f['id'],fill='red')
  im.thumbnail((475,670));sheet.paste(im,(i*480,25));d.text((i*480,3),f'Q{v} page {p}',fill='black')
 sheet.save(f'tmp/workbook-coordinate-corrections/missing-review-{batch}.png')
Path('tmp/workbook-coordinate-corrections/missing-details.json').write_text(json.dumps(details,ensure_ascii=False),encoding='utf-8')
