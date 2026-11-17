"""Apply visually checked table mappings using measured printed cell borders."""
import json,copy
from pathlib import Path
import numpy as np
from scipy import ndimage as ndi
from PIL import Image,ImageDraw

ROOT=Path('tmp/workbook-choice-rows')
all_changes=[]


def measured(v,p):
    im=Image.open(f'tmp/workbooks-2025/eps-topik-2025-workbook-{v}/{p:04}.webp').convert('L')
    gray=np.asarray(im);ink=ndi.binary_closing(gray<185,structure=np.ones((3,3)))
    lab,_=ndi.label(ndi.binary_fill_holes(ink)&~ink)
    output=[]
    for i,b in enumerate(ndi.find_objects(lab),1):
        if b is None:continue
        yy,xx=b
        if 25<xx.stop-xx.start<1100 and 25<yy.stop-yy.start<160 and (lab[b]==i).mean()>.94:
            output.append(dict(box=[xx.start,yy.start,xx.stop,yy.stop],empty=float((gray[b]<140).mean())<.0015))
    return im.size,output


def groups(items):
    result=[]
    for b in sorted(items,key=lambda b:(b[1],b[0])):
        if not result or abs(b[1]-result[-1][0][1])>8:result.append([b])
        else:result[-1].append(b)
    return [sorted(g,key=lambda b:b[0])for g in result]


for v in(1,2):
    code=f'eps-topik-2025-workbook-{v}'
    source=json.loads((ROOT/code/'source.json').read_text(encoding='utf-8'))
    pages=[dict(pageNumber=r['page_number'],workbook=copy.deepcopy(r['ocr_payload']['workbook']))for r in source['rows']]
    def page(p):return next(q['workbook']for q in pages if q['pageNumber']==p)
    def put(p,fid,boxes):
        wb=page(p);size=Image.open(f'tmp/workbooks-2025/{code}/{p:04}.webp').size;w,h=size
        f=next(f for f in wb['fields']if f['id']==fid)
        x=min(b[0]for b in boxes)+3;y=min(b[1]for b in boxes)+3;r=max(b[2]for b in boxes)-3;bt=max(b[3]for b in boxes)-3
        before=f['rect'];f['rect']=dict(x=x/w,y=y/h,width=(r-x)/w,height=(bt-y)/h)
        if before!=f['rect']:all_changes.append(dict(volume=v,page=p,fieldId=fid,kind='geometry'))
    def add(p,fid,label):
        wb=page(p)
        if any(f['id']==fid for f in wb['fields']):return
        wb['fields'].append(dict(id=fid,kind='text',label=label,section=wb['fields'][0]['section'],rect=dict(x=.1,y=.1,width=.1,height=.1),options=[],sources=[],targets=[]))
        all_changes.append(dict(volume=v,page=p,fieldId=fid,kind='added'))
    if v==1:
        _,items=measured(1,5)
        rows=groups([c['box']for c in items if c['box'][0]>230 and c['box'][1]>600 and c['box'][2]<1240])
        assert len(rows)==16
        for i,row in enumerate(rows):put(5,f'p5-f{i+1}',row)
        _,items=measured(1,55)
        rows=groups([c['box']for c in items if c['box'][0]>650 and 250<c['box'][1]<1500])
        assert [len(r)for r in rows]==[4,4,4,5,7],[len(r)for r in rows]
        fid=1
        for row in rows:
            for b in row:
                target=f'p55-f{fid}' if fid<=23 else 'p55-q10-cell7'
                if fid==24:add(55,target,'10. Ô chữ 7')
                put(55,target,[b]);fid+=1
        for p,start,first,last,col_indices in[(56,1,380,1290,[1,2]),(64,6,970,1650,[0,1]),(238,6,950,1560,[1])]:
            _,items=measured(1,p)
            boxes=[c['box']for c in items if first<c['box'][1]<last and c['box'][2]-c['box'][0]>200 and (p!=64 or c['box'][0]>420)]
            rows=groups(boxes)[2:]
            expected={56:10,64:7,238:6}[p]
            assert len(rows)==expected,(p,len(rows))
            fid=start
            for row in rows:
                for col in col_indices:put(p,f'p{p}-f{fid}',[row[col]]);fid+=1
        _,items=measured(1,220)
        rows=groups([c['box']for c in items if c['box'][1]>1000 and c['box'][2]-c['box'][0]>200])[1:]
        assert len(rows)==7 and all(len(r)==4 for r in rows)
        for i,row in enumerate(rows):put(220,f'p220-f{i+4}',[row[1]]);put(220,f'p220-f{i+11}',[row[3]])
        _,items=measured(1,14)
        rows=groups([c['box']for c in items if 400<c['box'][1]<1000 and c['box'][0]>250])
        assert len(rows)==5
        definitions=[(1,[1,2,3,4,5]),(7,[1,2,3,5,6,7]),(12,[0,1,2,3]),(16,[1,2,3,4]),(21,[0,1,2])]
        for row,(start,columns)in zip(rows,definitions):
            for i,col in enumerate(columns):
                fid=f'p14-f{start+i}'
                if start==7 and i==5:fid='p14-q2-cell6';add(14,fid,'2. Ô chữ 6')
                put(14,fid,[row[col]])
        for fid in(6,20,24,25):page(14)['fields'][fid-1]['is_context']=True;all_changes.append(dict(volume=1,page=14,fieldId=f'p14-f{fid}',kind='printed_sample_or_punctuation'))
        _,items=measured(1,11)
        for fid,x1,x2,y1,y2 in[(14,200,400,1400,1560),(15,600,800,1400,1560),(16,900,1150,1400,1560),(17,200,450,1560,1660),(18,600,800,1560,1660),(19,900,1200,1560,1660)]:
            boxes=[c['box']for c in items if c['empty']and x1<c['box'][0]<x2 and y1<c['box'][1]<y2]
            assert boxes,(11,fid)
            put(11,f'p11-f{fid}',boxes)
        _,items=measured(1,12)
        for row,(y1,y2)in enumerate([(600,760),(760,900)]):
            for col,(x1,x2)in enumerate([(200,450),(450,700),(700,1000),(1000,1300)]):
                boxes=[c['box']for c in items if c['empty']and x1<c['box'][0]<x2 and y1<c['box'][1]<y2]
                assert boxes,(12,row,col)
                put(12,f'p12-f{9+row*4+col}',boxes)
    else:
        _,items=measured(2,108)
        rows=groups([c['box']for c in items if c['empty']and c['box'][0]>600 and c['box'][1]>600])
        assert len(rows)==5,(108,len(rows))
        for i,row in enumerate(rows):put(108,f'p108-f{i+1}',row)
    for p in pages:
        if any(c['volume']==v and c['page']==p['pageNumber']for c in all_changes):p['workbook']['table_alignment_version']=1
    (ROOT/code/'planned.json').write_text(json.dumps(dict(pages=pages,choiceOptions=sum(len(f['options'])for p in pages for f in p['workbook']['fields']if f['kind']=='choice'and not f.get('is_context')),page39AnswerCells=12 if v==1 else None),ensure_ascii=False),encoding='utf-8')
    for number in sorted({c['page']for c in all_changes if c['volume']==v}):
        im=Image.open(f'tmp/workbooks-2025/{code}/{number:04}.webp').convert('RGB');draw=ImageDraw.Draw(im)
        for f in page(number)['fields']:
            if f['kind']!='text'or f.get('is_context'):continue
            r=f['rect'];draw.rectangle([r['x']*im.width,r['y']*im.height,(r['x']+r['width'])*im.width,(r['y']+r['height'])*im.height],outline='#2563eb',width=2)
        im.resize((900,round(im.height*900/im.width))).save(ROOT/code/f'{number:04}.table-corrected.jpg')
(ROOT/'table-corrections.json').write_text(json.dumps(all_changes,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(pages=len({(c['volume'],c['page'])for c in all_changes}),geometry=sum(c['kind']=='geometry'for c in all_changes),added=sum(c['kind']=='added'for c in all_changes))))
