import {readFile,writeFile,mkdir}from'node:fs/promises'
import dotenv from'dotenv'
import {createClient}from'@supabase/supabase-js'
dotenv.config({path:'.env.local',quiet:true})
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const apply=process.argv.includes('--apply'),check=r=>{if(r.error)throw r.error;return r.data}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
const reports=[]
for(const volume of[1,2]){
 const code=`eps-topik-2025-workbook-${volume}`,root=`tmp/workbook-choice-rows/${code}`
 await mkdir(root,{recursive:true})
 const book=check(await db.from('textbooks').select('id,is_published').eq('code',code).single())
 if(book.is_published)throw new Error('Keep admin preview')
 const rows=check(await db.from('textbook_pages').select('page_number,ocr_payload,updated_at').eq('textbook_id',book.id))
 if(!apply){await writeFile(`${root}/source.json`,JSON.stringify({book,rows}));continue}
 const source=JSON.parse(await readFile(`${root}/source.json`,'utf8'))
 const plan=JSON.parse(await readFile(`${root}/planned.json`,'utf8'))
 let saved=0
 for(const page of plan.pages){
  const old=source.rows.find(r=>r.page_number===page.pageNumber),current=rows.find(r=>r.page_number===page.pageNumber)
  const workbook=page.workbook
  if(same(workbook,old.ocr_payload.workbook)||same(workbook,current.ocr_payload.workbook))continue
  if(current.updated_at!==old.updated_at)throw new Error(`Concurrent edit ${volume}/${page.pageNumber}; do not overwrite`)
  const payload={...current.ocr_payload,workbook}
  const result=check(await db.from('textbook_pages').update({ocr_payload:payload,updated_at:new Date().toISOString()}).eq('textbook_id',book.id).eq('page_number',page.pageNumber).eq('updated_at',current.updated_at).select('page_number'))
  if(result.length!==1)throw new Error('Concurrent edit')
  await writeFile(`tmp/workbook-interactions/${code}/${String(page.pageNumber).padStart(4,'0')}.json`,JSON.stringify(workbook,null,2));saved++
 }
 const remote=check(await db.from('textbook_pages').select('page_number,ocr_payload').eq('textbook_id',book.id))
 for(const p of plan.pages){const actual=remote.find(r=>r.page_number===p.pageNumber).ocr_payload.workbook;if(!same(actual.fields,p.workbook.fields))throw new Error(`Remote mismatch ${volume}/${p.pageNumber}`)}
 reports.push({volume,saved,pagesVerified:remote.length,choiceOptions:plan.choiceOptions,page39AnswerCells:plan.page39AnswerCells})
 console.log(JSON.stringify(reports.at(-1)))
}
if(apply)await writeFile('reports/workbook-choice-row-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),books:reports},null,2))
