import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local', quiet: true })
const args=process.argv.slice(2)
const opt=(name,fallback)=>args.includes(`--${name}`)?args[args.indexOf(`--${name}`)+1]:fallback
const concurrency=Number(opt('concurrency',4))
const tasks=[]
for(const volume of [1,2]) {
  const code=`eps-topik-2025-workbook-${volume}`
  const source=JSON.parse(await readFile(`tmp/workbook-alignment/${code}/source.json`,'utf8'))
  for(const row of source.rows) tasks.push({code,volume,row})
}
let cursor=0; const failures=[]; let completed=0
async function review({code,volume,row}) {
 const page=row.page_number; const root=`tmp/workbook-coordinate-review/${code}`
 const path=`${root}/${String(page).padStart(4,'0')}.review.json`
 const fields=row.ocr_payload.workbook.fields.filter(f=>!f.is_context)
 const image=await readFile(`tmp/workbooks-2025/${code}/${String(page).padStart(4,'0')}.webp`)
 const measured=JSON.parse(await readFile(`${root}/${String(page).padStart(4,'0')}.anchors.json`,'utf8'))
 const box=r=>[r.y*1000,r.x*1000,(r.y+r.height)*1000,(r.x+r.width)*1000].map(Math.round)
 const anchors=[...measured.lines.map((b,i)=>({id:`L${i}`,box:b})),...measured.parentheses.map((b,i)=>({id:`P${i}`,box:b})),...measured.numerals.map((b,i)=>({id:`C${i}`,box:b.box,digit:b.digit}))].map(a=>({...a,box:[a.box[1]/measured.height*1000,a.box[0]/measured.width*1000,a.box[3]/measured.height*1000,a.box[2]/measured.width*1000].map(Math.round)}))
 const input=fields.map(f=>({id:f.id,kind:f.kind,label:f.label,box:box(f.rect),...Object.fromEntries(['options','sources','targets'].map(k=>[k,f[k].map(n=>({id:n.id,label:n.label,box:box(n.rect),presentation:n.presentation}))]))}))
 const sourceHash=createHash('sha256').update(JSON.stringify({revision:2,input,anchors,imageHash:createHash('sha256').update(image).digest('hex')})).digest('hex')
 try {const cached=JSON.parse(await readFile(path,'utf8'));if(cached.sourceHash===sourceHash)return} catch{}
 const prompt=`Audit ALL existing interactive widgets on this Korean EPS-TOPIK workbook page ${page}, volume ${volume}, against the supplied ORIGINAL SCAN. This is a coordinate correction task, never solve questions. Existing boxes may be on the WRONG question, even if they are on blank paper. Match each field ID by its LABEL/PRINTED QUESTION and section, NOT proximity alone. Keep every ID and node ID. Coordinates are [TOP_Y,LEFT_X,BOTTOM_Y,RIGHT_X] in 0..1000 of the ENTIRE IMAGE.
Return JSON {"text":[{"id":"existing text field ID","anchor":"L0 or P0 or null"}],"choices":[{"fieldId":"existing choice ID","nodeId":"existing option ID","anchor":"C0 or null"}],"corrections":[{"fieldId":"...","collection":"rect|options|sources|targets","nodeId":null,"box":[...],"reason":"specific printed evidence"}],"unresolved":[{"fieldId":"...","reason":"..."}]}.
You receive TWO images: original clean scan, then SAME scan with measured answer regions labeled L/P/C. These labels are authoritative physical positions. SELECT THE LABEL visible next to the actual answer region/number. DO NOT estimate coordinates for measured regions. Existing positions are hints only and may be shifted. For each choice option with presentation marker return a choices entry selecting its exact printed C label, matching its digit AND question content/number. Never select an example's C labels for a real question. For word options use anchor null. Do not output coordinate corrections for marker options when a C label exists. Corrections rect for choice/match parent field are unnecessary and must be omitted.
TEXT: Return EXACTLY one entry for EVERY text field. Prefer the matching measured L dotted-line region or P empty-parentheses region. Map by question number/content, following actual reading order; do not shift one answer into another question's line. Some questions have two lines grouped in one L anchor. Do not map two distinct questions to one anchor. If an L anchor includes unrelated lines, use null plus a precise correction rect. If no applicable measured anchor, use null; retain correct original box or provide correction. O/X boxes belong strictly INSIDE each printed pair of parentheses on its same row. Free text boxes belong only on the answer dots/blank, NEVER over prompt or filled words. Tight height ~15/1000 for one writing line ending just below dotted baseline. Do not move legitimate writing grid cells to nearby dotted exercises. Word banks/examples/passages are not answer blanks; report unresolved if an existing field is actually context.
CHOICE: Check EVERY option belongs to the exact question and number. Boxes should tightly enclose printed circled numerals only (~15–25 pixels in this 1440px image), not the following text. Alternatives without circled numbers use exact printed word bounds and presentation word. Return correction only for actual mismatch. Do not change correctly aligned boxes due to rounding or minor 1–2px differences.
MATCH: Check EVERY source/target box against its exact label/picture, preserving ID. Enclose actual item, excluding question number/example; buttons are drawn OUTSIDE the box edges. Correct displaced items only. If pictures cannot be identified reliably flag unresolved.
Only return corrections with clear visible evidence. Do not guess a uniform grid. Do not create/delete fields or options. Never output guesses or answers.
EXISTING FIELDS: ${JSON.stringify(input)}
MEASURED ANSWER REGIONS: ${JSON.stringify(anchors)}`
 let output
 for(let attempt=0;attempt<4;attempt++) {
  try {
   const annotated=await readFile(`${root}/${String(page).padStart(4,'0')}.annotated.webp`)
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},signal:AbortSignal.timeout(180000),body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:'image/webp',data:image.toString('base64')}},{inlineData:{mimeType:'image/webp',data:annotated.toString('base64')}}]}],generationConfig:{temperature:0,responseMimeType:'application/json',thinkingConfig:{thinkingBudget:2048},maxOutputTokens:14000}})})
   if(!response.ok)throw new Error(`Gemini ${response.status}`)
   const payload=await response.json()
   output=JSON.parse(payload.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join(''))
   await writeFile(`${root}/${String(page).padStart(4,'0')}.response.json`,JSON.stringify(output,null,2))
   if(!Array.isArray(output.text)||!Array.isArray(output.choices)||!Array.isArray(output.corrections)||!Array.isArray(output.unresolved))throw new Error('Invalid review structure')
   const textIds=fields.filter(f=>f.kind==='text').map(f=>f.id)
   for(const id of textIds)if(!output.text.some(t=>t.id===id)){output.text.push({id,anchor:null});output.unresolved.push({fieldId:id,reason:'Visual review omitted this field; separate inspection required'})}
   if(output.text.length!==textIds.length||new Set(output.text.map(f=>f.id)).size!==textIds.length||output.text.some(f=>!textIds.includes(f.id)||(f.anchor&&!anchors.some(a=>a.id===f.anchor))))throw new Error('Missing/invalid text references')
   const choices=fields.filter(f=>f.kind==='choice').flatMap(f=>f.options.map(n=>`${f.id}:${n.id}`))
   for(const f of fields.filter(f=>f.kind==='choice'))for(const n of f.options)if(!output.choices.some(c=>c.fieldId===f.id&&String(c.nodeId)===n.id)){output.choices.push({fieldId:f.id,nodeId:n.id,anchor:null});output.unresolved.push({fieldId:f.id,reason:`Visual review omitted option ${n.id}; separate inspection required`})}
   if(output.choices.length!==choices.length||new Set(output.choices.map(c=>`${c.fieldId}:${c.nodeId}`)).size!==choices.length||output.choices.some(c=>!choices.includes(`${c.fieldId}:${c.nodeId}`)||(c.anchor&&!anchors.some(a=>a.id===c.anchor&&a.id.startsWith('C')))))throw new Error('Missing/invalid choice references')
   for(const c of output.corrections){const f=fields.find(f=>f.id===c.fieldId);if(!f||!['rect','options','sources','targets'].includes(c.collection)||(c.collection!=='rect'&&!f[c.collection].some(n=>n.id===String(c.nodeId)))||!Array.isArray(c.box)||c.box.length!==4||c.box.some(n=>!Number.isFinite(n)||n<0||n>1000)||c.box[2]<=c.box[0]||c.box[3]<=c.box[1])throw new Error('Invalid correction reference/box')}
   break
  }catch(error){if(attempt===3)throw error;await new Promise(r=>setTimeout(r,2000*(attempt+1)))}
 }
 await mkdir(root,{recursive:true})
 await writeFile(path,JSON.stringify({sourceHash,page,volume,anchors,review:output},null,2))
}
await Promise.all(Array.from({length:concurrency},async()=>{while(cursor<tasks.length){const task=tasks[cursor++];try{await review(task);completed++;console.log(`REVIEW ${completed}/543 Q${task.volume} p${task.row.page_number}`)}catch(error){failures.push({volume:task.volume,page:task.row.page_number,error:error.message});console.error(`FAILED Q${task.volume} p${task.row.page_number}: ${error.message}`)}}}))
await writeFile('reports/workbook-coordinate-review.json',JSON.stringify({reviewedAt:new Date().toISOString(),completed,failures},null,2))
if(failures.length)process.exitCode=1
