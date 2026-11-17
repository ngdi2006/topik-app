import {readFile,writeFile,mkdir} from 'node:fs/promises'
import dotenv from 'dotenv'
import {createClient} from '@supabase/supabase-js'
dotenv.config({path:'.env.local',quiet:true})
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const check=r=>{if(r.error)throw r.error;return r.data}
const book=check(await db.from('textbooks').select('id,is_published').eq('code','eps-topik-2025-workbook-1').single())
if(book.is_published)throw Error('Expected private workbook')
const rows=check(await db.from('textbook_pages').select('page_number,ocr_payload,updated_at').eq('textbook_id',book.id).gte('page_number',72).lte('page_number',79).order('page_number'))
if(rows.length!==8)throw Error('Incomplete lesson')
await mkdir('tmp/workbook-coordinate-corrections',{recursive:true})
await writeFile(`tmp/workbook-coordinate-corrections/lesson8-${Date.now()}-before.json`,JSON.stringify(rows))
const anchors=JSON.parse(await readFile('tmp/workbook-coordinate-corrections/lesson8-anchors.json','utf8'))
const norm=([x,y,r,b])=>({x:x/1440,y:y/1864,width:(r-x)/1440,height:(b-y)/1864})
const changes=[]
for(const row of rows){
 const p=row.page_number,payload=structuredClone(row.ocr_payload),fields=payload.workbook.fields
 const set=(id,box)=>{const f=fields.find(f=>f.id===id);if(f?.kind!=='text')throw Error(`Missing ${id}`);f.rect=norm(box);changes.push(id)}
 // Match the five particle blanks to the five printed leaders, never the question number.
 if(p===75){const boxes=anchors[p].dots.filter(b=>b[1]===1359);if(boxes.length!==5)throw Error('Expected five question 6 blanks');boxes.forEach((b,i)=>set(`p75-f${6+i}`,b))}
 if(p===76){const boxes=anchors[p].dots.slice(0,5);boxes.forEach((b,i)=>set(`p76-f${i+1}`,b))}
 if(p===78){
  const id='p78-reading-q9'
  const labels=['최정우 씨는 남동생이 있어요.','부모님께서는 연세가 적으세요.','어머니 연세는 59이세요.','최정우 씨는 무역 회사에서 일해요.']
  const tops=[164,237,311,384],ends=[653,669,586,718]
  const options=labels.map((label,i)=>({id:String(i+1),label,presentation:'marker',rect:norm([236,tops[i],261,tops[i]+25]),hit_rect:norm([232,tops[i]-5,ends[i],tops[i]+30])}))
  const field={id,kind:'choice',section:'reading',label:'9. 다음 글을 읽고 내용과 같은 것을 고르십시오. (지문: 77쪽)',rect:norm([232,159,718,414]),options,sources:[],targets:[]}
  const existing=fields.findIndex(f=>f.id===id)
  if(existing<0)fields.unshift(field);else fields[existing]=field
  changes.push(id)
 }
 if(![75,76,78].includes(p))continue
 // Existing answer IDs and all unrelated page data must remain intact.
 for(const f of row.ocr_payload.workbook.fields)if(!fields.some(n=>n.id===f.id))throw Error('Lost existing answer ID')
 payload.workbook.coordinate_correction='lesson8-question6-13-and-reading9-v1'
 const saved=check(await db.from('textbook_pages').update({ocr_payload:payload,updated_at:new Date().toISOString()}).eq('textbook_id',book.id).eq('page_number',p).eq('updated_at',row.updated_at).select('page_number'))
 if(saved.length!==1)throw Error('Concurrent edit; stopped')
 const actual=check(await db.from('textbook_pages').select('ocr_payload').eq('textbook_id',book.id).eq('page_number',p).single())
 if(JSON.stringify(actual.ocr_payload.workbook.fields)!==JSON.stringify(fields)){
  // JSONB may reorder object keys; compare individual normalized values instead.
  for(const f of fields){const a=actual.ocr_payload.workbook.fields.find(n=>n.id===f.id);if(!a||a.options.length!==f.options.length)throw Error('Readback failed');for(const k of ['x','y','width','height'])if(Math.abs(a.rect[k]-f.rect[k])>1e-10)throw Error('Geometry mismatch')}
 }
 await writeFile(`tmp/workbook-interactions/eps-topik-2025-workbook-1/${String(p).padStart(4,'0')}.json`,JSON.stringify(actual.ocr_payload.workbook,null,2))
}
await writeFile('reports/workbook-lesson8-correction.json',JSON.stringify({verifiedAt:new Date().toISOString(),reviewedPages:[72,73,74,75,76,77,78,79],changedFields:changes,existingAnswerIdsPreserved:true,remoteVerified:true},null,2))
console.log('Lesson 8 verified: five question 6 blanks aligned; questions 11–15 aligned; reading 9 has four selectable answer rows on page 78. Existing answer IDs preserved.')
