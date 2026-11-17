"""Combine visual question identification with exact measured print geometry."""
import json, copy
from pathlib import Path
from collections import Counter
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path('tmp/workbook-coordinate-review')


def read(path): return json.loads(path.read_text(encoding='utf-8'))
def box(rect,w,h): return [rect['x']*w,rect['y']*h,(rect['x']+rect['width'])*w,(rect['y']+rect['height'])*h]
def rect(b,w,h): return dict(x=b[0]/w,y=b[1]/h,width=(b[2]-b[0])/w,height=(b[3]-b[1])/h)
def distance(a,b): return max(abs(x-y) for x,y in zip(a,b))


def plan(volume):
    code=f'eps-topik-2025-workbook-{volume}'
    source=read(Path(f'tmp/workbook-alignment/{code}/source.json'))
    pages=[]; changes=[]; issues=[]
    manual=read(ROOT/'manual-overrides.json') if (ROOT/'manual-overrides.json').exists() else []
    for row in source['rows']:
        page=row['page_number']; root=ROOT/code
        path=root/f'{page:04}.review.json'
        if not path.exists(): continue
        review=read(path)['review']
        if 'choices' not in review: continue  # Old unlabelled pilot, never apply.
        measured=read(root/f'{page:04}.anchors.json')
        w,h=measured['width'],measured['height']
        anchors={**{f'L{i}':b for i,b in enumerate(measured['lines'])},**{f'P{i}':b for i,b in enumerate(measured['parentheses'])},**{f'C{i}':b['box'] for i,b in enumerate(measured['numerals'])}}
        workbook=copy.deepcopy(row['ocr_payload']['workbook'])
        lookup={f['id']:f for f in workbook['fields']}
        used=Counter(item['anchor'] for item in review['text']+review['choices'] if item['anchor'])
        pending=[]
        for item in review['text']:
            anchor=item['anchor']
            if not anchor: continue
            if not anchor.startswith(('L','P')) or used[anchor]>1:
                issues.append(dict(volume=volume,page=page,fieldId=item['id'],reason='duplicate or invalid text anchor')); continue
            pending.append((lookup[item['id']],None,'rect',anchors[anchor],f'visual identification: {anchor}'))
        for item in review['choices']:
            anchor=item['anchor']
            if not anchor: continue
            field=lookup[item['fieldId']]; index=next(i for i,n in enumerate(field['options']) if n['id']==str(item['nodeId']))
            node=field['options'][index]
            candidate=measured['numerals'][int(anchor[1:])]
            if used[anchor]>1 or candidate['digit']!=index%4+1:
                issues.append(dict(volume=volume,page=page,fieldId=field['id'],nodeId=node['id'],reason='duplicate or mismatched choice numeral'));continue
            node['presentation']='marker'
            b=anchors[anchor]; b=[b[0]-1,b[1]-1,b[2]+1,b[3]+1]
            pending.append((field,node,'options',b,f'visual identification: {anchor}'))
        for c in review['corrections']:
            field=lookup[c['fieldId']]; key=c['collection']
            if key=='rect' and field['kind']!='text': continue
            if key=='options':
                node=next(n for n in field[key] if n['id']==str(c['nodeId']))
                # Marker positions require a measured numeral, never guessed coordinates.
                if node.get('presentation')!='word': continue
            else: node=None if key=='rect' else next(n for n in field[key] if n['id']==str(c['nodeId']))
            b=[c['box'][1]*w/1000,c['box'][0]*h/1000,c['box'][3]*w/1000,c['box'][2]*h/1000]
            pending.append((field,node,key,b,c['reason']))
        # On pages with one measured answer region per text field, printed
        # reading order is stronger than a model's estimated coordinates.
        # Never sort fields by their old, possibly displaced geometry.
        text_fields=[f for f in workbook['fields'] if f['kind']=='text' and not f.get('is_context')]
        wide_lines=[b for b in measured['lines'] if b[2]-b[0]>=w*.16 and b[3]-b[1]<h*.13]
        if text_fields and all(f['rect']['width']>=.16 for f in text_fields) and len(wide_lines)==len(text_fields) and (volume==2 or page>14):
            ordered=sorted(wide_lines,key=lambda b:(b[1],b[0]))
            pending=[p for p in pending if p[0]['kind']!='text']
            pending.extend((f,None,'rect',b,'printed answer rows in question order; exact count matched') for f,b in zip(text_fields,ordered))
        for field,node,key,b,reason in pending:
            target=node or field; before=box(target['rect'],w,h)
            if distance(before,b)<3: continue
            target['rect']=rect(b,w,h)
            changes.append(dict(volume=volume,page=page,fieldId=field['id'],nodeId=node['id'] if node else None,collection=key,before=before,after=b,reason=reason))
        for patch in manual:
            if patch['volume']!=volume or patch['page']!=page:continue
            field=lookup[patch['fieldId']]
            target=next(n for n in field[patch['collection']] if n['id']==patch['nodeId']) if patch.get('collection') else field
            if patch.get('is_context'):
                field['is_context']=True
            if patch.get('pixels'):
                before=box(target['rect'],w,h)
                target['rect']=rect(patch['pixels'],w,h)
                if distance(before,patch['pixels'])>=3: changes.append(dict(volume=volume,page=page,fieldId=field['id'],nodeId=patch.get('nodeId'),collection=patch.get('collection','rect'),before=before,after=patch['pixels'],reason=patch['reason']))
        for issue in review['unresolved']:
            if not any(p['volume']==volume and p['page']==page and p['fieldId']==issue['fieldId'] for p in manual):issues.append(dict(volume=volume,page=page,**issue))
        workbook['coordinate_review_version']=3
        pages.append(dict(pageNumber=page,workbook=workbook))
    # Count final, unique changes, excluding intermediate proposals superseded
    # by measured/manual corrections.
    history=changes;changes=[]
    for page in pages:
        original=next(r['ocr_payload']['workbook'] for r in source['rows'] if r['page_number']==page['pageNumber'])
        im=Image.open(f"tmp/workbooks-2025/{code}/{page['pageNumber']:04}.webp")
        w,h=im.size
        for before,after in zip(original['fields'],page['workbook']['fields']):
            for collection in ['rect','options','sources','targets']:
                pairs=[(before,after)] if collection=='rect' else list(zip(before[collection],after[collection]))
                for old,new in pairs:
                    if old['rect']==new['rect']:continue
                    if distance(box(old['rect'],w,h),box(new['rect'],w,h))<.01:continue
                    changes.append(dict(volume=volume,page=page['pageNumber'],fieldId=after['id'],nodeId=None if collection=='rect' else new['id'],collection=collection,before=box(old['rect'],w,h),after=box(new['rect'],w,h)))
    issues=[i for i in issues if not any(p['volume']==i['volume'] and p['page']==i['page'] and p['fieldId']==i['fieldId'] for p in manual)]
    data=dict(pages=pages,changes=changes,issues=issues)
    (ROOT/f'plan-{volume}.json').write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
    print(volume,'reviewed',len(pages),'changes',len(changes),'issues',len(issues),flush=True)
    return data


if __name__=='__main__':
    all_data=[plan(v) for v in (1,2)]
    Path('reports/workbook-coordinate-plan.json').write_text(json.dumps({ 'reviewedPages':sum(len(d['pages']) for d in all_data), 'changes':sum(len(d['changes']) for d in all_data),'issues':[i for d in all_data for i in d['issues']]},ensure_ascii=False,indent=2),encoding='utf-8')
