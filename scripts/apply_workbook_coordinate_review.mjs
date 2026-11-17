import {readFile,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
import {createClient} from '@supabase/supabase-js'
dotenv.config({path:'.env.local',quiet:true})
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const check=r=>{if(r.error)throw r.error;return r.data}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
const audit=JSON.parse(await readFile('reports/workbook-coordinate-plan.json','utf8'))
assert.equal(audit.reviewedPages,543,'Review every page before applying')
assert.equal(audit.issues.length,0,'Resolve flagged fields before applying')
assert.equal(JSON.parse(await readFile('tmp/workbook-coordinate-review/ink-issues.json','utf8')).length,0,'Resolve text overlapping print')
assert.equal(JSON.parse(await readFile('tmp/workbook-coordinate-review/overlap-issues.json','utf8')).length,0,'Resolve overlapping inputs')
const report=[]
for(const volume of [1,2]){
 const code=`eps-topik-2025-workbook-${volume}`
 const source=JSON.parse(await readFile(`tmp/workbook-alignment/${code}/source.json`,'utf8'))
 const plan=JSON.parse(await readFile(`tmp/workbook-coordinate-review/plan-${volume}.json`,'utf8'))
 const book=check(await db.from('textbooks').select('is_published').eq('id',source.book.id).single())
 assert.equal(book.is_published,false)
 const current=check(await db.from('textbook_pages').select('page_number,ocr_payload,updated_at').eq('textbook_id',source.book.id))
 let saved=0
 for(const p of plan.pages){
  const old=source.rows.find(r=>r.page_number===p.pageNumber)
  const now=current.find(r=>r.page_number===p.pageNumber)
  const original=old.ocr_payload.workbook
  assert.deepEqual(p.workbook.fields.map(f=>f.id),original.fields.map(f=>f.id))
  for(let i=0;i<original.fields.length;i++){
   const before=original.fields[i],after=p.workbook.fields[i]
   assert.equal(after.kind,before.kind);assert.equal(after.label,before.label)
   for(const key of ['options','sources','targets'])assert.deepEqual(after[key].map(n=>n.id),before[key].map(n=>n.id))
   for(const node of [after,...after.options,...after.sources,...after.targets]){
    const r=node.rect
    assert.ok(Object.values(r).every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.width>0&&r.height>0&&r.x+r.width<=1.00001&&r.y+r.height<=1.00001,`Invalid bounds ${p.pageNumber}/${after.id}`)
   }
  }
  const baseline=p.concurrentBaseline||old
  const desired={...baseline.ocr_payload,workbook:p.workbook}
  if(!same(now.ocr_payload,desired)){
   assert.ok(same(now.ocr_payload,baseline.ocr_payload),`Concurrent admin change ${volume}/${p.pageNumber}; preserving it`)
   const rows=check(await db.from('textbook_pages').update({ocr_payload:desired,updated_at:new Date().toISOString()}).eq('textbook_id',source.book.id).eq('page_number',p.pageNumber).eq('updated_at',now.updated_at).select('page_number'))
   assert.equal(rows.length,1,'Concurrent edit while saving');saved++
  }
  await writeFile(`tmp/workbook-interactions/${code}/${String(p.pageNumber).padStart(4,'0')}.json`,JSON.stringify(p.workbook,null,2))
 }
 const remote=check(await db.from('textbook_pages').select('page_number,ocr_payload').eq('textbook_id',source.book.id))
 for(const p of plan.pages)assert.ok(same(remote.find(r=>r.page_number===p.pageNumber).ocr_payload.workbook,p.workbook),`Remote verification failed ${volume}/${p.pageNumber}`)
 const aligned=JSON.parse(await readFile(`tmp/workbook-alignment/${code}/aligned.json`,'utf8'))
 aligned.pages=plan.pages
 aligned.summary.coordinateReviewVersion=3
 await writeFile(`tmp/workbook-alignment/${code}/aligned.json`,JSON.stringify(aligned))
 report.push({volume,pagesVerified:remote.length,saved,geometryChanges:plan.changes.length,contextFields:plan.pages.flatMap(p=>p.workbook.fields).filter(f=>f.is_context).length,questionAndOptionIdsPreserved:true,adminOnly:true})
 console.log(JSON.stringify(report.at(-1)))
}
await writeFile('reports/workbook-coordinate-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),books:report},null,2))
