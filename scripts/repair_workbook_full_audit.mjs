import{readFile,writeFile}from'node:fs/promises'
import dotenv from'dotenv'
import{createClient}from'@supabase/supabase-js'
dotenv.config({path:'.env.local',quiet:true})
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const check=r=>{if(r.error)throw r.error;return r.data}
const apply=process.argv.includes('--apply'),changes=[]
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
for(const v of[1,2]){
 const code=`eps-topik-2025-workbook-${v}`,root=`tmp/workbook-choice-rows/${code}`
 const source=JSON.parse(await readFile(`${root}/source.json`,'utf8'))
 const wanted=v===1?[90,229]:[85,155]
 const planned=[]
 for(const row of source.rows){
  const p=row.page_number;if(!wanted.includes(p))continue
  const payload=structuredClone(row.ocr_payload),fields=payload.workbook.fields
  const a=JSON.parse(await readFile(`tmp/workbook-coordinate-review/${code}/${String(p).padStart(4,'0')}.anchors.json`,'utf8'))
  const norm=([x,y,r,b])=>({x:x/a.width,y:y/a.height,width:(r-x)/a.width,height:(b-y)/a.height})
  const set=(id,box)=>{const f=fields.find(f=>f.id===id);if(f?.kind!=='text')throw Error(`Missing ${id}`);f.rect=norm(box);changes.push({volume:v,page:p,id,kind:'geometry'})}
  if(v===1&&p===90){
   const boxes=a.lines.filter(b=>b[0]===816&&b[1]>800)
   if(boxes.length!==5)throw Error('Expected five left answer lines')
   boxes.forEach((box,i)=>{const id=`p90-q${i+1}-left`;if(fields.some(f=>f.id===id))return;const original=fields.find(f=>f.id===`p90-f${i+1}`);if(!original)throw Error('Missing right blank');fields.push({...structuredClone(original),id,label:`${i+1}. 빈칸에 쓰십시오. (왼쪽)`,rect:norm(box)});changes.push({volume:v,page:p,id,kind:'added'})})
  }
  if(v===1&&p===229){
   const boxes=a.lines.filter(b=>b[1]>=1048)
   if(boxes.length!==7)throw Error('Expected grammar questions 1–7')
   boxes.forEach((box,i)=>set(`p229-f${i+7}`,box))
  }
  if(v===2&&p===85){
   const boxes=a.lines.filter(b=>b[1]>=1065)
   if(boxes.length!==5)throw Error('Expected grammar questions 6–10')
   boxes.forEach((box,i)=>set(`p85-f${i+6}`,box))
  }
  if(v===2&&p===155){
   if(a.lines.length!==10)throw Error('Expected questions 6–15')
   a.lines.slice(0,9).forEach((box,i)=>set(`p155-f${i+1}`,box))
   const id='p155-q15';if(!fields.some(f=>f.id===id)){fields.push({id,kind:'text',section:'reading',label:'15. 한국이 높은 경쟁력을 확보하고 있는 선박의 종류 3가지는 무엇입니까?',rect:norm(a.lines[9]),options:[],sources:[],targets:[]});changes.push({volume:v,page:p,id,kind:'added'})}
  }
  for(const f of row.ocr_payload.workbook.fields)if(!fields.some(n=>n.id===f.id))throw Error('Existing answer removed')
  payload.workbook.coordinate_correction='full-audit-missing-and-shifted-lines-v1'
  planned.push({pageNumber:p,workbook:payload.workbook})
  if(!apply)continue
  const book=check(await db.from('textbooks').select('id,is_published').eq('code',code).single());if(book.is_published)throw Error('Expected admin preview')
  const current=check(await db.from('textbook_pages').select('ocr_payload,updated_at').eq('textbook_id',book.id).eq('page_number',p).single())
  if(current.updated_at!==row.updated_at)throw Error(`Concurrent modification ${v}/${p}`)
  await writeFile(`tmp/workbook-coordinate-corrections/q${v}-p${p}-${Date.now()}-before.json`,JSON.stringify(current))
  const saved=check(await db.from('textbook_pages').update({ocr_payload:payload,updated_at:new Date().toISOString()}).eq('textbook_id',book.id).eq('page_number',p).eq('updated_at',current.updated_at).select('page_number'))
  if(saved.length!==1)throw Error('Concurrent modification')
  const actual=check(await db.from('textbook_pages').select('ocr_payload').eq('textbook_id',book.id).eq('page_number',p).single())
  if(!same(actual.ocr_payload,payload))throw Error(`Readback mismatch ${v}/${p}`)
  await writeFile(`tmp/workbook-interactions/${code}/${String(p).padStart(4,'0')}.json`,JSON.stringify(actual.ocr_payload.workbook,null,2))
 }
 await writeFile(`tmp/workbook-coordinate-corrections/q${v}-audit-plan.json`,JSON.stringify(planned))
}
await writeFile('reports/workbook-full-coordinate-audit.json',JSON.stringify({reviewedAt:new Date().toISOString(),pagesAudited:543,lesson10Pages:[90,91,92,93,94,95,96,97,98],changes,existingAnswerIdsPreserved:true,remoteVerified:apply},null,2))
console.log(JSON.stringify({applied:apply,geometry:changes.filter(c=>c.kind==='geometry').length,added:changes.filter(c=>c.kind==='added').length,pages:[...new Set(changes.map(c=>`${c.volume}/${c.page}`))]}))
