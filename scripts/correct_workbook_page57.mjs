import{readFile,writeFile,mkdir}from'node:fs/promises'
import dotenv from'dotenv'
import{createClient}from'@supabase/supabase-js'
dotenv.config({path:'.env.local',quiet:true})
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const check=r=>{if(r.error)throw r.error;return r.data}
const book=check(await db.from('textbooks').select('id,is_published').eq('code','eps-topik-2025-workbook-1').single())
if(book.is_published)throw new Error('Expected private workbook')
const row=check(await db.from('textbook_pages').select('ocr_payload,updated_at').eq('textbook_id',book.id).eq('page_number',57).single())
await mkdir('tmp/workbook-coordinate-corrections',{recursive:true})
await writeFile(`tmp/workbook-coordinate-corrections/p57-${Date.now()}-before.json`,JSON.stringify(row))
const payload=structuredClone(row.ocr_payload)
// Exact dotted-line groups in the original 1440 x 1864 scan, matched by question.
const boxes=[[237,904,1277,981],[237,1099,1277,1176],[237,1294,1277,1370],[237,1465,1277,1492],[237,1611,1277,1639]]
for(let i=0;i<5;i++){
 const f=payload.workbook.fields.find(f=>f.id===`p57-f${14+i}`)
 if(f?.kind!=='text'||!f.label.startsWith(`${i+1}.`))throw new Error('Unexpected question ID/label')
 const[x,y,r,b]=boxes[i]
 f.rect={x:x/1440,y:y/1864,width:(r-x)/1440,height:(b-y)/1864}
}
payload.workbook.coordinate_correction='p57-five-writing-questions-printed-lines-v1'
const saved=check(await db.from('textbook_pages').update({ocr_payload:payload,updated_at:new Date().toISOString()}).eq('textbook_id',book.id).eq('page_number',57).eq('updated_at',row.updated_at).select('page_number'))
if(saved.length!==1)throw new Error('Concurrent edit; do not overwrite')
const actual=check(await db.from('textbook_pages').select('ocr_payload').eq('textbook_id',book.id).eq('page_number',57).single())
for(let i=0;i<5;i++){
 const r=actual.ocr_payload.workbook.fields.find(f=>f.id===`p57-f${14+i}`).rect
 const expected=payload.workbook.fields.find(f=>f.id===`p57-f${14+i}`).rect
 for(const k of['x','y','width','height'])if(Math.abs(r[k]-expected[k])>1e-10)throw new Error('Remote coordinate mismatch')
}
await writeFile('tmp/workbook-interactions/eps-topik-2025-workbook-1/0057.json',JSON.stringify(actual.ocr_payload.workbook,null,2))
await writeFile('reports/workbook-page57-correction.json',JSON.stringify({verifiedAt:new Date().toISOString(),page:57,writingQuestions:5,idsPreserved:true,remoteVerified:true},null,2))
console.log('Page 57: all five writing questions verified against original dotted rows; existing IDs retained')
