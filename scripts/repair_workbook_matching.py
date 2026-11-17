import json,copy,re
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as ndi
from align_workbook_regions import image_bands

ROOT=Path('tmp/workbook-choice-rows')
IMAGE_SOURCES={1:{15,37,134,175,211},2:{30,143,198}}
IMAGE_TARGETS={1:{3,63,85},2:{49}}
report=[]
def pixels(r,w,h):return[r['x']*w,r['y']*h,(r['x']+r['width'])*w,(r['y']+r['height'])*h]
def rect(b,w,h):return dict(x=b[0]/w,y=b[1]/h,width=(b[2]-b[0])/w,height=(b[3]-b[1])/h)

for v in(1,2):
 code=f'eps-topik-2025-workbook-{v}';source=json.loads((ROOT/code/'source.json').read_text(encoding='utf-8'))
 pages=[]
 for row in source['rows']:
  number=row['page_number'];wb=copy.deepcopy(row['ocr_payload']['workbook']);matches=[f for f in wb['fields']if f['kind']=='match']
  if matches:
   image=Image.open(f'tmp/workbooks-2025/{code}/{number:04}.webp').convert('RGB');w,h=image.size;ink=np.asarray(image.convert('L'))<125
   for field in matches:
    if v==1 and number==10:
     for node,label in zip(field['targets'],['옥','박','밤','잇다','입다','날','낫','숯','술','찝','짐']):node['label']=label
    if v==1 and number==63:field['targets'][2]['is_context']=True
    if v==1 and number==160:field['allow_shared_targets']=True
    for side,key,image_pages in [('target','targets',IMAGE_TARGETS[v]),('source','sources',IMAGE_SOURCES[v])]:
     nodes=field[key]
     # Separate the two target columns of the three-stage exercise.
     columns=[]
     for node in sorted(nodes,key=lambda n:n['rect']['x']):
      group=next((g for g in columns if abs(g[0]['rect']['x']-node['rect']['x'])<.14),None)
      if group is None:columns.append([node])
      else:group.append(node)
     for group in columns:
      group.sort(key=lambda n:n['rect']['y'])
      if number in image_pages:
       bands=image_bands(image,group)
       if len(bands)==len(group):
        for n,b in zip(group,bands):n['rect']=rect(b,w,h)
       continue
      left=max(0,int(min(n['rect']['x']for n in group)*w)-65)
      right=min(w-25,int(max(n['rect']['x']+n['rect']['width']for n in group)*w)+150)
      if side=='source':right=int(min(n['rect']['x']for n in field['targets'])*w)-35
      for i,node in enumerate(group):
       old=pixels(node['rect'],w,h);cy=(old[1]+old[3])/2
       top=max(145,int(old[1])-55);bottom=min(h-70,int(old[3])+65)
       if i:top=max(top,int((pixels(group[i-1]['rect'],w,h)[3]+old[1])/2))
       if i+1<len(group):bottom=min(bottom,int((old[3]+pixels(group[i+1]['rect'],w,h)[1])/2))
       if bottom<=top:continue
       crop=ink[top:bottom,left:right]
       occupied=ndi.binary_closing(crop.sum(1)>3,structure=np.ones(3))
       lab,_=ndi.label(occupied);bands=[b[0]for b in ndi.find_objects(lab)if b is not None and 10<=b[0].stop-b[0].start<=48]
       if not bands:continue
       band=min(bands,key=lambda b:abs(top+b.start-old[1]))
       yy,xx=np.where(crop[band.start:band.stop]);x=left+int(xx.min());r=left+int(xx.max())+1;y=top+band.start;bt=top+band.stop
       # Keep multiline text bounds; use the first printed row for its port.
       final_bottom=max(bt,old[3])if old[3]-old[1]>48 else bt
       node['rect']=rect([x-2,y-2,r+2,final_bottom+2],w,h)
       # Solid isolated bullets are original printed connection points.
       label,count=ndi.label(ink[y:bt,max(0,x-5):r+5]);components=ndi.find_objects(label)
       for component in components:
        if component is None:continue
        sy,sx=component;cw=sx.stop-sx.start;ch=sy.stop-sy.start
        if not(6<=cw<=28 and 6<=ch<=28 and .7<cw/ch<1.4):continue
        if ink[y+sy.start:y+sy.stop,max(0,x-5)+sx.start:max(0,x-5)+sx.stop].mean()<.65:continue
        cx=max(0,x-5)+(sx.start+sx.stop)/2;py=y+(sy.start+sy.stop)/2
        if side=='target' and cx<x+30:
         next_ink=np.where(ink[y:bt,int(cx+cw/2)+8:r].any(0))[0]
         if len(next_ink)and next_ink[0]>=5:
          node['port']=dict(x=cx/w,y=py/h);node['rect']['x']=(cx+cw/2+8+int(next_ink[0])-2)/w;node['rect']['width']=(r+2)/w-node['rect']['x']
        if side=='source' and cx>r-32:
         prev_ink=np.where(ink[y:bt,x:int(cx-cw/2)-8].any(0))[0]
         if len(prev_ink)and int(cx-cw/2)-8-(x+prev_ink[-1])>=5:
          node['port']=dict(x=cx/w,y=py/h);node['rect']['width']=(x+int(prev_ink[-1])+3)/w-node['rect']['x']
       node['_first_y']=(y+bt)/2/h
    if v==1 and number==37:
     verbs={'t3','t5','t7','t9'}
     for n in field['targets']:
      if n['id']in verbs:n['is_context']=True
     stage=copy.deepcopy(field);stage['id']='p37-match-verbs';stage['label']='Nối danh từ với động từ';stage['allow_shared_targets']=True
     stage['sources']=[copy.deepcopy(n)for n in field['targets']if n['id']not in verbs]
     stage['targets']=[copy.deepcopy(n)for n in field['targets']if n['id']in verbs]
     for n in stage['sources']+stage['targets']:n.pop('is_context',None)
     for n in stage['sources']:n.pop('port',None)
     wb['fields'].append(stage)
    for f in [field]+([stage]if v==1 and number==37 else[]):
     src=[n for n in f['sources']if not n.get('is_context')];tgt=[n for n in f['targets']if not n.get('is_context')]
     sx=max(n['rect']['x']+n['rect']['width']for n in src)+.02;tx=min(n['rect']['x']for n in tgt)-.02
     for side,nodes,x in [('source',src,sx),('target',tgt,tx)]:
      for n in nodes:
       if 'port'not in n:n['port']=dict(x=x,y=n.get('_first_y',n['rect']['y']+n['rect']['height']/2))
       n.pop('_first_y',None)
     for n in f['sources']+f['targets']:n.pop('_first_y',None)
     report.append(dict(volume=v,page=number,fieldId=f['id'],sources=len(src),targets=len(tgt)))
    wb['matching_alignment_version']=1
   # Render all actual ports for direct inspection.
   draw=ImageDraw.Draw(image)
   for f in wb['fields']:
    if f['kind']!='match':continue
    for key in ['sources','targets']:
     for n in f[key]:
      if n.get('is_context'):continue
      p=n['port'];x=p['x']*w;y=p['y']*h;draw.ellipse([x-6,y-6,x+6,y+6],fill='#2563eb')
   image.resize((900,round(h*900/w))).save(ROOT/code/f'{number:04}.matching-corrected.jpg')
  pages.append(dict(pageNumber=number,workbook=wb))
 (ROOT/code/'planned.json').write_text(json.dumps(dict(pages=pages,choiceOptions=sum(len(f['options'])for p in pages for f in p['workbook']['fields']if f['kind']=='choice'and not f.get('is_context')),page39AnswerCells=12 if v==1 else None),ensure_ascii=False),encoding='utf-8')
Path('reports/workbook-matching-plan.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(len(report),'matching stages prepared')
