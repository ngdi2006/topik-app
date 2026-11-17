import{readFile,writeFile}from'node:fs/promises'
import dotenv from'dotenv'
import{createClient}from'@supabase/supabase-js'
dotenv.config({path:'.env.local',quiet:true})
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
const preserved=[]
for(const volume of[1,2]){
 const code=`eps-topik-2025-workbook-${volume}`
 const source=JSON.parse(await readFile(`tmp/workbook-alignment/${code}/source.json`,'utf8'))
 const path=`tmp/workbook-coordinate-review/plan-${volume}.json`
 const plan=JSON.parse(await readFile(path,'utf8'))
 const {data,error}=await db.from('textbook_pages').select('page_number,ocr_payload,updated_at').eq('textbook_id',source.book.id)
 if(error)throw error
 for(const row of data){
  const old=source.rows.find(r=>r.page_number===row.page_number)
  const page=plan.pages.find(p=>p.pageNumber===row.page_number)
  if(same(row.ocr_payload,old.ocr_payload)||same(row.ocr_payload.workbook,page.workbook))continue
  const previous=old.ocr_payload.workbook,now=row.ocr_payload.workbook
  if(now.source!=='admin_reviewed')throw new Error(`Unexpected concurrent update ${volume}/${row.page_number}`)
  const fields=[]
  page.workbook={...page.workbook,source:now.source,review_status:now.review_status,fields:now.fields.map(field=>{
   const original=previous.fields.find(f=>f.id===field.id)
   const planned=page.workbook.fields.find(f=>f.id===field.id)
   if(!same(field,original)){fields.push(field.id);return field}
   return planned||field
  })}
  // Save the exact concurrency baseline for optimistic updates on the next run.
  page.concurrentBaseline=row
  preserved.push({volume,page:row.page_number,fields})
 }
 await writeFile(path,JSON.stringify(plan))
}
await writeFile('reports/workbook-coordinate-preserved-admin.json',JSON.stringify({preservedAt:new Date().toISOString(),preserved},null,2))
console.log(JSON.stringify(preserved))
