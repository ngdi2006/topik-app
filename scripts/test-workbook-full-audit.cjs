const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),zod=require('zod')
const model={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/textbooks/workbook.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:model,require:()=>zod})
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const root='tmp/workbook-coordinate-corrections',plans=[1,2].flatMap(v=>read(`${root}/q${v}-audit-plan.json`).map(p=>({...p,volume:v})))
test('reviewed repairs preserve answer IDs and fit the original page',()=>{
 for(const p of plans){
  assert.ok(model.parseWorkbookPage({workbook:p.workbook}))
  const old=read(`tmp/workbook-choice-rows/eps-topik-2025-workbook-${p.volume}/source.json`).rows.find(r=>r.page_number===p.pageNumber).ocr_payload.workbook
  for(const f of old.fields)assert.ok(p.workbook.fields.some(n=>n.id===f.id),`lost ${f.id}`)
  for(const f of p.workbook.fields){assert.ok(f.rect.x+f.rect.width<=1);assert.ok(f.rect.y+f.rect.height<=1)}
 }
})
test('lesson 10 has independent left and right blanks for all five adjective pairs',()=>{
 const fields=plans.find(p=>p.volume===1&&p.pageNumber===90).workbook.fields
 assert.equal(fields.filter(f=>f.kind==='text'&&!f.is_context).length,10)
 for(let i=1;i<=5;i++){
  const l=fields.find(f=>f.id===`p90-q${i}-left`).rect,r=fields.find(f=>f.id===`p90-f${i}`).rect
  assert.ok(l.x+l.width<r.x);assert.ok(Math.abs(l.y-r.y)<0.001)
 }
})
test('shifted grammar and reading questions follow each printed answer line exactly',()=>{
 for(const[v,p,ids,offset]of[[1,229,Array.from({length:7},(_,i)=>`p229-f${i+7}`),6],[2,85,Array.from({length:5},(_,i)=>`p85-f${i+6}`),5],[2,155,[...Array.from({length:9},(_,i)=>`p155-f${i+1}`),'p155-q15'],0]]){
  const a=read(`tmp/workbook-coordinate-review/eps-topik-2025-workbook-${v}/${String(p).padStart(4,'0')}.anchors.json`),fields=plans.find(n=>n.volume===v&&n.pageNumber===p).workbook.fields
  ids.forEach((id,i)=>{const r=fields.find(f=>f.id===id).rect,b=a.lines[offset+i];assert.ok(Math.abs(r.y*a.height-b[1])<0.001,id)})
 }
})
