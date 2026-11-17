"""Measure option text rows separately from their small printed number markers."""
import json,copy
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT=Path('tmp/workbook-choice-rows')


def rect(b,w,h):return dict(x=b[0]/w,y=b[1]/h,width=(b[2]-b[0])/w,height=(b[3]-b[1])/h)
def pixels(r,w,h):return [r['x']*w,r['y']*h,(r['x']+r['width'])*w,(r['y']+r['height'])*h]


for volume in (1,2):
    code=f'eps-topik-2025-workbook-{volume}'
    source=json.loads((ROOT/code/'source.json').read_text(encoding='utf-8'))
    pages=[];count=0;answer_cells=None
    for row in source['rows']:
        p=row['page_number'];workbook=copy.deepcopy(row['ocr_payload']['workbook'])
        options=[n for f in workbook['fields'] if f['kind']=='choice' and not f.get('is_context') for n in f['options']]
        if options or (volume==1 and p==39):
            image=Image.open(f'tmp/workbooks-2025/{code}/{p:04}.webp').convert('L')
            ink=np.asarray(image)<125;h,w=ink.shape
            for node in options:
                x,y,right,bottom=pixels(node['rect'],w,h)
                if node.get('presentation')=='word':
                    b=[max(0,x-3),max(0,y-3),min(w,right+3),min(h,bottom+3)]
                else:
                    neighbors=[pixels(n['rect'],w,h) for n in options if n is not node]
                    limit=min([w*.96]+[b[0]-10 for b in neighbors if b[0]>x+5 and abs((b[1]+b[3]-y-bottom)/2)<max(bottom-y,b[3]-b[1])*.65])
                    top=max(0,int(y)-4);end=min(h,int(bottom)+5)
                    left=max(0,int(x)-4)
                    # The last actual ink pixel stops the hit area after the text,
                    # before the next column. Original marker geometry stays intact.
                    crop=ink[top:end,left:max(left+1,int(limit))]
                    cols=np.where(crop.sum(0)>=2)[0]
                    end_x=max(right+4,left+int(cols[-1])+7) if len(cols) else right+4
                    b=[left,top,min(limit,end_x),end]
                node['hit_rect']=rect(b,w,h);count+=1
            if volume==1 and p==39:
                closed=ndi.binary_closing(ink,structure=np.ones((3,3)))
                holes=ndi.binary_fill_holes(closed)&~closed
                labels,_=ndi.label(holes)
                cells=[]
                for region in ndi.find_objects(labels):
                    if region is None:continue
                    yy,xx=region
                    if xx.start>700 and xx.stop-xx.start>400 and 500<yy.start<1410 and 50<yy.stop-yy.start<100:
                        cells.append([xx.start+3,yy.start+3,xx.stop-3,yy.stop-3])
                cells.sort(key=lambda b:b[1])
                words=['마시다','배우다','쇼핑하다','읽다','공부하다','오다','앉다','일어나다','기다리다','입다','좋다','낫다']
                assert len(cells)==len(words),(len(cells),cells)
                for word,b in zip(words,cells):
                    f=next((f for f in workbook['fields'] if f['kind']=='text' and f['label'].split()[-1]==word),None)
                    if f is None:
                        assert word=='마시다'
                        f=dict(id='p39-table-masida',kind='text',label='1. 마시다',section='grammar',rect=rect(b,w,h),options=[],sources=[],targets=[])
                        workbook['fields'].insert(0,f)
                    f['rect']=rect(b,w,h)
                workbook['coordinate_correction']='p39-exact-table-cells-v1'
                answer_cells=len(cells)
        pages.append(dict(pageNumber=p,workbook=workbook))
    (ROOT/code/'planned.json').write_text(json.dumps(dict(pages=pages,choiceOptions=count,page39AnswerCells=answer_cells),ensure_ascii=False),encoding='utf-8')
    print(volume,'clickable option rows',count,'page39 cells',answer_cells,flush=True)
