import json
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from verify_workbook_table_plan import verify
if __name__=='__main__':
 tasks=[]
 for v in (1,2):
  rows=json.loads(Path(f'tmp/workbook-choice-rows/eps-topik-2025-workbook-{v}/source.json').read_text(encoding='utf-8'))['rows']
  tasks.extend((v,dict(pageNumber=r['page_number'],workbook=r['ocr_payload']['workbook']))for r in rows)
 with ProcessPoolExecutor(max_workers=4)as pool:issues=[x for batch in pool.map(verify,tasks)for x in batch]
 Path('tmp/workbook-coordinate-corrections/current-overlap.json').write_text(json.dumps(issues))
 print(json.dumps(issues))
