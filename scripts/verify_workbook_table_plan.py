import json
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

ROOT=Path('tmp/workbook-choice-rows')


def verify(task):
    v,p=task
    gray=np.asarray(Image.open(f"tmp/workbooks-2025/eps-topik-2025-workbook-{v}/{p['pageNumber']:04}.webp").convert('L'))
    h,w=gray.shape;ink=gray<125
    rules=ndi.binary_opening(ink,structure=np.ones((30,1)))|ndi.binary_opening(ink,structure=np.ones((1,30)))
    letters=ink&~rules;lab,_=ndi.label(letters);areas=np.bincount(lab.ravel());letters=letters&(areas[lab]>35)
    issues=[]
    for f in p['workbook']['fields']:
        if f['kind']!='text'or f.get('is_context'):continue
        r=f['rect'];x,y=int(r['x']*w),int(r['y']*h);right,bottom=int((r['x']+r['width'])*w),int((r['y']+r['height'])*h)
        crop=letters[y:bottom,x:right]
        if not crop.size or crop.mean()>.035:issues.append(dict(volume=v,page=p['pageNumber'],fieldId=f['id'],ink=float(crop.mean())if crop.size else 1))
    return issues


if __name__=='__main__':
    tasks=[]
    for v in(1,2):
        plan=json.loads((ROOT/f'eps-topik-2025-workbook-{v}/planned.json').read_text(encoding='utf-8'))
        tasks.extend((v,p)for p in plan['pages'])
    with ProcessPoolExecutor(max_workers=4)as pool:issues=[i for result in pool.map(verify,tasks)for i in result]
    findings=json.loads((ROOT/'table-audit.json').read_text(encoding='utf-8'))
    exemptions=[]
    for p in findings:
        reason=('printed punctuation, not an answer cell'if(p['volume'],p['page'])==(1,14)else'calendar illustration inside a listening answer image'if(p['volume'],p['page'])==(2,260)else'intentionally empty table header')
        assert(p['volume'],p['page'])in[(1,6),(1,39),(1,56),(1,64),(1,14),(1,192),(2,260)],p
        for g in p['groups']:
            assert not g['misaligned'],g
            exemptions.extend(dict(volume=p['volume'],page=p['page'],box=b,reason=reason)for b in g['missing'])
    changes=json.loads((ROOT/'table-corrections.json').read_text(encoding='utf-8'))
    report=dict(pagesScanned=len(tasks),changedPages=len({(c['volume'],c['page'])for c in changes}),geometryCorrections=sum(c['kind']=='geometry'for c in changes),newAnswerFields=sum(c['kind']=='added'for c in changes),printedTextOverlap=issues,visuallyReviewedNonAnswerCells=exemptions)
    Path('reports/workbook-table-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(dict(pages=len(tasks),textOverlapFindings=len(issues),reviewedExemptions=len(exemptions))))
    if issues:raise SystemExit(1)
