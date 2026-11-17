"""Visually verified introductory tables; measured cell boundaries, no guessed grids."""
import json
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
from inspect_workbook_anchors import anchors

root=Path('tmp/workbook-coordinate-review')
patches=[]


def cells(page):
    im=Image.open(f'tmp/workbooks-2025/eps-topik-2025-workbook-1/{page:04}.webp').convert('L')
    ink=ndi.binary_closing(np.asarray(im)<160,structure=np.ones((3,3)))
    holes=ndi.binary_fill_holes(ink)&~ink
    lab,_=ndi.label(holes)
    result=[]
    for b in ndi.find_objects(lab):
        if b is None:continue
        y,x=b; w=x.stop-x.start; h=y.stop-y.start
        if 30<w<450 and 30<h<150 and (lab[b]>0).mean()>.9:
            result.append([x.start,y.start,x.stop,y.stop])
    return result


def rows(boxes,tolerance=15):
    groups=[]
    for b in sorted(boxes,key=lambda b:(b[1],b[0])):
        if not groups or abs(b[1]-groups[-1][0][1])>tolerance:groups.append([b])
        else:groups[-1].append(b)
    return [sorted(g,key=lambda b:b[0]) for g in groups]


def put(page,fid,b=None,context=False):
    item=dict(volume=1,page=page,fieldId=f'p{page}-f{fid}',reason='manually verified against printed table/reading instruction')
    if b:item['pixels']=b
    if context:item['is_context']=True
    patches.append(item)


def union(boxes): return [min(b[0] for b in boxes)+2,min(b[1] for b in boxes)+2,max(b[2] for b in boxes)-2,max(b[3] for b in boxes)-2]


for page,start,count,left,right in [(1,500,10,350,1095),(2,150,11,350,1095),(5,600,16,326,1235)]:
    groups=rows([b for b in cells(page) if b[1]>start and b[0]>=left and b[2]<=right])
    assert len(groups)==count,(page,len(groups))
    for i,group in enumerate(groups):put(page,i+1,union(group))

# Reading-only prompts have no writable answer; retain IDs and stored values.
for page,ids in [(3,range(1,7)),(8,range(17,29)),(9,range(1,13))]:
    for fid in ids:put(page,fid,context=True)

for page,start_id,group_size in [(3,8,3),(4,1,4)]:
    groups=rows(cells(page))
    assert len(groups)==3
    for row,group in enumerate(groups):
        # Filled word cells are columns 0 and 3.
        blank=[group[i] for i in [1,2,4,5]]
        chunks=[[b] for b in blank] if group_size==4 else [[blank[0]],[blank[1]],blank[2:]]
        for col,chunk in enumerate(chunks):put(page,start_id+row*group_size+col,union(chunk))

groups=rows([b for b in cells(7) if b[1]>250 and b[2]-b[0]<90],tolerance=45)
ordered=[b for group in groups for b in group]
assert len(ordered)==29
for i,b in enumerate(ordered):put(7,i+1,union([b]))

# Six continuation cells at the top of page 8.
top=rows([b for b in cells(8) if b[1]<400 and b[1]>180 and b[2]-b[0]<90],tolerance=45)
ordered=[b for group in top for b in group]
assert len(ordered)==6,len(ordered)
for i,b in enumerate(ordered):put(8,i+1,union([b]))

groups=rows(cells(9))
assert len(groups)==14
for row,group in enumerate(groups):
    blank=group[1:6]
    for col,chunk in enumerate([[blank[0]],blank[1:3],blank[3:5]]):put(9,13+row*3+col,union(chunk))

# Page 6 had 13 estimated widgets per practice row, but 11 real empty cells.
all_cells=cells(6)
top=rows([b for b in all_cells if b[1]<400 and b[0]>=230])
assert len(top)==3
for row,group in enumerate(top):
    assert len(group)==11
    for col,b in enumerate(group):put(6,1+row*13+col,union([b]))
    for col in (11,12):put(6,1+row*13+col,context=True)
lower=rows([b for b in all_cells if b[1]>650 and b[0]>=230])
assert len(lower)==10 and all(len(g)==10 for g in lower)
fid=40
for row,group in enumerate(lower):
    slices=([group[0:2],group[2:4],group[4:6],group[6:8],group[8:10]] if row==0 else [group[0:2],group[2:5],group[5:7],group[7:10]])
    for chunk in slices:put(6,fid,union(chunk));fid+=1
assert fid==81

# The existing question 11 widget includes the already printed syllable 우.
blank11=[b for b in cells(11) if 690<b[0]<800 and 1400<b[1]<1500]
assert len(blank11)==1
put(11,15,union(blank11))

# Translation questions have genuine blank lines despite labels quoting prompts.
a=json.loads((root/'eps-topik-2025-workbook-1/0025.anchors.json').read_text(encoding='utf-8'))
lines=sorted([b for b in a['lines'] if b[0]>200 and b[2]>1200],key=lambda b:b[1])
assert len(lines)==8,len(lines)
put(25,7,lines[-2]);put(25,8,lines[-1])

# Each dialogue line already has its own saved-answer ID. Split the measured
# multiline region instead of stacking two inputs on the same pair of lines.
for volume,page,ids in [(1,32,[9,10]),(2,3,[6,7])]:
    _,_,raw,_=anchors(f'tmp/workbooks-2025/eps-topik-2025-workbook-{volume}/{page:04}.webp')
    lines=sorted([b for b in raw if b[0]>200 and b[2]>1200 and b[1]>1500],key=lambda b:b[1])[-2:]
    assert len(lines)==2
    for fid,b in zip(ids,lines):patches.append(dict(volume=volume,page=page,fieldId=f'p{page}-f{fid}',pixels=[b[0]-1,b[1]-23,b[2]+1,b[3]+2],reason='separate measured answer line for each dialogue turn'))
for fid in (4,5):patches.append(dict(volume=2,page=71,fieldId=f'p71-f{fid}',reason='visually verified legitimate multiple-choice question; keep options'))
a=json.loads((root/'eps-topik-2025-workbook-2/0101.anchors.json').read_text(encoding='utf-8'))
patches.append(dict(volume=2,page=101,fieldId='p101-f7',pixels=a['lines'][5],reason='question 6 has a real dotted answer line below its reported-speech prompt'))

# Remaining pages were inspected directly when the external service stopped.
manual_pages=[(1,3),(1,92),(1,173),(1,192),(1,248),(2,114),(2,234),(2,238)]
text_maps={
 (1,92):{i+1:f'L{i}' for i in range(8)},
 (1,192):{**{i+1:f'L{i}' for i in range(5)},15:'L5'},
 (1,248):{1:'L0',2:'L1',4:'L2',6:'L3',8:'L4',10:'L5',13:'L7'},
 (2,234):{i+1:f'L{i+1}' for i in range(6)},
 (2,238):{i+1:f'L{i}' for i in range(3)},
}
choice_maps={(1,173):{1:0,2:4,3:8},(2,114):{1:4,2:8},(2,238):{4:0,5:4,6:8}}
for volume,page in manual_pages:
    code=f'eps-topik-2025-workbook-{volume}'
    source=json.loads(Path(f'tmp/workbook-alignment/{code}/source.json').read_text(encoding='utf-8'))
    fields=next(r['ocr_payload']['workbook']['fields'] for r in source['rows'] if r['page_number']==page)
    review={'text':[{'id':f['id'],'anchor':text_maps.get((volume,page),{}).get(int(f['id'].split('-f')[1]))} for f in fields if f['kind']=='text' and not f.get('is_context')],'choices':[], 'corrections':[],'unresolved':[]}
    for f in fields:
        if f['kind']!='choice' or f.get('is_context'):continue
        start=choice_maps.get((volume,page),{}).get(int(f['id'].split('-f')[1]))
        for i,node in enumerate(f['options']):review['choices'].append(dict(fieldId=f['id'],nodeId=node['id'],anchor=f'C{start+i}' if start is not None else None))
    (root/code/f'{page:04}.review.json').write_text(json.dumps(dict(reviewer='direct_visual_with_measured_print_anchors',page=page,volume=volume,review=review),ensure_ascii=False),encoding='utf-8')

groups=rows([b for b in cells(192) if 900<b[1]<1450])
assert len(groups)==6 and all(len(g)==4 for g in groups)
for i,fid in enumerate(range(6,10)):put(192,fid,union([groups[i+2][1]]))
for i,fid in enumerate(range(10,15)):put(192,fid,union([groups[i+1][3]]))
for fid in (3,5,7,9):put(248,fid,context=True)
_,_,raw,_=anchors('tmp/workbooks-2025/eps-topik-2025-workbook-1/0248.webp')
for ids,top,bottom in [([11,12],1100,1210),([14,15],1500,1610)]:
    lines=sorted([b for b in raw if b[0]>200 and b[2]>1200 and top<b[1]<bottom],key=lambda b:b[1])
    assert len(lines)==2,(ids,lines)
    for fid,b in zip(ids,lines):put(248,fid,[b[0]-1,b[1]-23,b[2]+1,b[3]+2])

# Exact colored picture bounds for the introductory matching exercise.
a=json.loads((root/'eps-topik-2025-workbook-2/0114.anchors.json').read_text(encoding='utf-8'))
b=a['numerals'][9]['box']
patches.append(dict(volume=2,page=114,fieldId='p114-f2',collection='options',nodeId='2',pixels=[b[0]-1,b[1]-1,b[2]+1,b[3]+1],reason='visually verified printed circled 2 below the second listening picture; classifier misread digit'))
rgb=np.asarray(Image.open('tmp/workbooks-2025/eps-topik-2025-workbook-1/0003.webp').convert('RGB')).astype(int)
for node,(top,bottom) in enumerate([(740,890),(890,1040),(1040,1210),(1210,1370)],1):
    crop=rgb[top:bottom,820:1040]
    mask=(crop.max(2)-crop.min(2)>45)&(crop.min(2)<215)
    yy,xx=np.where(mask)
    assert len(xx)>100
    patches.append(dict(volume=1,page=3,fieldId='p3-f7',collection='targets',nodeId=str(node),pixels=[int(xx.min())+818,int(yy.min())+top-2,int(xx.max())+823,int(yy.max())+top+3],reason='visually identified matching picture, measured colored bounds'))

for fid in (8,10):patches.append(dict(volume=2,page=265,fieldId=f'p265-f{fid}',is_context=True,reason='duplicate input covers the printed sentence ending; actual blank retained by preceding field'))
patches.append(dict(volume=2,page=26,fieldId='p26-f4',is_context=True,reason='passage blank belongs to the multiple-choice question below; not a separate free-text answer'))
_,_,raw,_=anchors('tmp/workbooks-2025/eps-topik-2025-workbook-1/0268.webp')
for ids,top,bottom in [([4,5],800,960),([6,7],1100,1250)]:
    lines=sorted([b for b in raw if b[0]>200 and b[2]>1200 and top<b[1]<bottom],key=lambda b:b[1])
    assert len(lines)==3,(ids,lines)
    first=lines[0]; rest=lines[1:]
    put(268,ids[0],[first[0]-1,first[1]-23,first[2]+1,first[3]+2])
    put(268,ids[1],[rest[0][0]-1,rest[0][1]-23,rest[-1][2]+1,rest[-1][3]+2])

for volume,page,ids,region in [(1,48,[6,7],5),(2,24,[1,2],0),(2,24,[6,7],4)]:
    code=f'eps-topik-2025-workbook-{volume}'
    a=json.loads((root/code/f'{page:04}.anchors.json').read_text(encoding='utf-8'))
    bounds=a['lines'][region]
    _,_,raw,_=anchors(f'tmp/workbooks-2025/{code}/{page:04}.webp')
    lines=sorted([b for b in raw if abs(b[0]-bounds[0])<5 and bounds[1]<b[1]<bounds[3]],key=lambda b:b[1])
    assert len(lines)==2,(volume,page,lines)
    for fid,b in zip(ids,lines):patches.append(dict(volume=volume,page=page,fieldId=f'p{page}-f{fid}',pixels=[b[0]-1,b[1]-23,b[2]+1,b[3]+2],reason='separate original dialogue answer lines; no overlapping widgets'))
a=json.loads((root/'eps-topik-2025-workbook-2/0024.anchors.json').read_text(encoding='utf-8'))
for fid,region in [(3,1),(4,2),(5,3)]:patches.append(dict(volume=2,page=24,fieldId=f'p24-f{fid}',pixels=a['lines'][region],reason='matched exact printed question to its own answer region'))

(root/'manual-overrides.json').write_text(json.dumps(patches,ensure_ascii=False,indent=2),encoding='utf-8')
print('Measured, visually checked table overrides:',len(patches))
