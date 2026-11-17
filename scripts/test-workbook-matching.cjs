const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),zod=require('zod')
const model={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/textbooks/workbook.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:model,require:()=>zod})
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const plans=[1,2].map(v=>read(`tmp/workbook-choice-rows/eps-topik-2025-workbook-${v}/planned.json`))

test('matching curves bow away from aligned ports and retain exact endpoints',()=>{
 const a={x:0.56,y:0.18},b={x:0.557,y:0.48}
 const first=model.matchingCurvePath(a,b,0),second=model.matchingCurvePath(a,b,1)
 const numbers=first.match(/-?\d+(?:\.\d+)?/g).map(Number)
 assert.deepEqual(numbers.slice(0,2),[560,180])
 assert.deepEqual(numbers.slice(-2),[557,480])
 assert.ok(numbers[2]<520 && numbers[4]<520,'vertical pair must visibly bow sideways')
 assert.notEqual(first,second,'separate sources use separate curves')
 const horizontal=model.matchingCurvePath({x:0.3,y:0.5},{x:0.6,y:0.5})
 assert.match(horizontal,/C .* 476,/,'same-row connections must also curve')
})
test('all 32 stages retain original node IDs and keep each dot outside printed item bounds',()=>{
 let count=0
 for(const[v,plan]of plans.entries()){
  const source=read(`tmp/workbook-choice-rows/eps-topik-2025-workbook-${v+1}/source.json`)
  for(const p of plan.pages){
   assert.ok(model.parseWorkbookPage({workbook:p.workbook}),`Invalid workbook ${v+1}/${p.pageNumber}`)
   for(const f of p.workbook.fields.filter(f=>f.kind==='match')){
    const old=source.rows.find(r=>r.page_number===p.pageNumber).ocr_payload.workbook.fields.find(n=>n.id===f.id)
    if(old)for(const key of['sources','targets'])assert.deepEqual(f[key].map(n=>n.id),old[key].map(n=>n.id))
    for(const key of['sources','targets'])for(const n of f[key].filter(n=>!n.is_context)){
     assert.ok(n.port.x>0&&n.port.x<1&&n.port.y>0&&n.port.y<1)
     const gap=key==='sources'?n.port.x-n.rect.x-n.rect.width:n.rect.x-n.port.x
     assert.ok(gap>.004,`Dot covers text ${v+1}/${p.pageNumber}/${f.id}/${n.id}`)
    }
    count++
   }
  }
 }
 assert.equal(count,32)
})
test('noun-to-verb stage allows shared verbs and keeps old picture matches separate',()=>{
 const fields=plans[0].pages.find(p=>p.pageNumber===37).workbook.fields
 const primary=fields.find(f=>f.id==='p37-f1'),stage=fields.find(f=>f.id==='p37-match-verbs')
 assert.equal(primary.sources.length,6)
 assert.equal(primary.targets.filter(n=>!n.is_context).length,6)
 assert.equal(stage.sources.length,6);assert.equal(stage.targets.length,4)
 let value=model.connectMatch({},stage.sources[0].id,stage.targets[0].id,true)
 value=model.connectMatch(value,stage.sources[1].id,stage.targets[0].id,true)
 assert.equal(Object.keys(value).length,2)
 assert.ok(model.validWorkbookValue(stage,value))
 assert.equal(model.fieldAnswered(stage,value),2)
 assert.equal(Object.keys(model.connectMatch(value,stage.sources[0].id,stage.targets[0].id,true)).length,1)
 const hobby=plans[0].pages.find(p=>p.pageNumber===160).workbook.fields.find(f=>f.kind==='match')
 assert.equal(hobby.allow_shared_targets,true)
})
