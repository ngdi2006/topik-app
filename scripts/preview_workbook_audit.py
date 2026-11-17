import json
from pathlib import Path
from PIL import Image,ImageDraw
root=Path('tmp/workbook-coordinate-corrections')
findings=json.loads((root/'missing-lines.json').read_text())
for batch in range((len(findings)+11)//12):
 sheet=Image.new('RGB',(1200,6*240),'#e2e8f0');draw=ImageDraw.Draw(sheet)
 for i,item in enumerate(findings[batch*12:batch*12+12]):
  v,p=item['volume'],item['page'];im=Image.open(f'tmp/workbooks-2025/eps-topik-2025-workbook-{v}/{p:04}.webp').convert('RGB')
  boxes=item['boxes'];y=max(0,min(b[1]for b in boxes)-100);bottom=min(im.height,max(b[3]for b in boxes)+50)
  d=ImageDraw.Draw(im)
  for b in boxes:d.rectangle(b,outline='red',width=3)
  crop=im.crop((100,y,im.width-80,bottom));crop.thumbnail((590,210))
  x=(i%2)*600;top=(i//2)*240;sheet.paste(crop,(x,top+25));draw.text((x+5,top+5),f'Q{v} p{p} / {len(boxes)} candidates',fill='black')
 sheet.save(root/f'audit-sheet-{batch}.png')
rows=json.loads(Path('tmp/workbook-choice-rows/eps-topik-2025-workbook-1/source.json').read_text(encoding='utf-8'))['rows']
for batch in range(3):
 sheet=Image.new('RGB',(1200,600),'#e2e8f0');draw=ImageDraw.Draw(sheet)
 for i,p in enumerate(range(90+batch*3,min(99,93+batch*3))):
  im=Image.open(f'tmp/workbooks-2025/eps-topik-2025-workbook-1/{p:04}.webp').convert('RGB');d=ImageDraw.Draw(im)
  for f in next(r for r in rows if r['page_number']==p)['ocr_payload']['workbook']['fields']:
   for n in ([f]if f['kind']=='text'else f['options']):
    q=n['rect'];d.rectangle((q['x']*im.width,q['y']*im.height,(q['x']+q['width'])*im.width,(q['y']+q['height'])*im.height),outline='blue',width=3)
  im.thumbnail((395,570));sheet.paste(im,(i*400,25));draw.text((i*400,3),f'Page {p}',fill='black')
 sheet.save(root/f'lesson10-{batch}.png')
