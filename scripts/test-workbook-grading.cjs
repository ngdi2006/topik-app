const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const grading = {}
const model = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/textbooks/workbook.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: model, require: () => require('zod') })
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/textbooks/grading.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: grading, require: name => name === './workbook' ? model : require(name) })

test('each parenthesized choice in the same sentence is selected and validated independently', () => {
 const field = JSON.parse(fs.readFileSync('tmp/workbook-choice-rows/eps-topik-2025-workbook-1/planned.json','utf8')).pages.find(page=>page.pageNumber===40).workbook.fields.find(field=>field.id==='p40-f11')
 assert.equal(model.inlineChoiceGroups(field).length,2)
 const first=model.selectChoiceOption(field,undefined,'2')
 const both=model.selectChoiceOption(field,first,'3')
 assert.equal(JSON.stringify(both),JSON.stringify({g1:'2',g2:'3'}))
 assert.equal(model.validWorkbookValue(field,both),true)
 assert.equal(model.validWorkbookValue(field,{g1:'3'}),false)
 assert.equal(model.validWorkbookValue(field,{g3:'1'}),false)
 assert.equal(model.fieldAnswered(field,first),0)
 assert.equal(model.fieldAnswered(field,both),1)
 assert.equal(JSON.stringify(model.inlineChoiceSelection(field,'3')),JSON.stringify({g2:'3'}))
 assert.equal(JSON.stringify(model.selectChoiceOption(field,'3','2')),JSON.stringify({g2:'3',g1:'2'}))
 assert.equal(JSON.stringify(model.selectChoiceOption(field,both,'2')),JSON.stringify({g2:'3'}))
 field.answer_key={status:'reviewed',value:{g1:'2',g2:'3'}}
 assert.equal(grading.validAnswerKey(field),true)
 assert.equal(grading.gradeWorkbook([{pageNumber:1,workbook:{fields:[field]}}],{['1:'+field.id]:both}).correct,1)
 field.answer_key.value='2';assert.equal(grading.validAnswerKey(field),false,'One old answer cannot certify both brackets')
})
const choice = id => ({ id,kind:'choice',label:id,section:'reading',options:[1,2,3,4].map(n=>({id:String(n),label:String(n)})),answer_key:{status:'reviewed',value:'1'} })
const page = fields => [{pageNumber:1,workbook:{fields}}]
test('ten questions produce 5/10 with wrong and unanswered counted separately',()=>{
 const fields=Array.from({length:10},(_,i)=>choice('q'+i))
 const answers=Object.fromEntries(fields.map((f,i)=>['1:'+f.id,i<5?'1':i<8?'2':'']))
 const result=grading.gradeWorkbook(page(fields),answers)
 assert.equal(result.correct,5);assert.equal(result.total,10);assert.equal(result.incorrect,3);assert.equal(result.unanswered,2)
})
test('draft and missing keys never count as wrong, contribute points or reveal keys',()=>{
 const a=choice('draft');a.answer_key.status='draft'
 const b=choice('missing');delete b.answer_key
 const result=grading.gradeWorkbook(page([a,b]),{'1:draft':'1'})
 assert.equal(result.total,0);assert.equal(result.ungraded,2);assert.equal(result.items[0].expected,undefined)
})
test('matching counts each real source and accepts shared targets only when allowed',()=>{
 const field={id:'pairs',kind:'match',label:'pairs',sources:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'example',is_context:true}],targets:[{id:'x',label:'X'},{id:'y',label:'Y'}],answer_key:{status:'reviewed',value:{a:'x',b:'y'}}}
 let result=grading.gradeWorkbook(page([field]),{'1:pairs':{a:'x',b:'x'}})
 assert.equal(result.correct,1);assert.equal(result.total,2);assert.equal(result.incorrect,1)
 field.answer_key.value.b='x';assert.equal(grading.validAnswerKey(field),false)
 field.allow_shared_targets=true;assert.equal(grading.validAnswerKey(field),true)
})
test('text accepts reviewed alternatives and Unicode/spacing/punctuation, retains meaningful spaces',()=>{
 const field={id:'text',kind:'text',label:'text',answer_key:{status:'reviewed',value:'안녕하세요.',alternatives:['안녕!']}}
 assert.equal(grading.gradeWorkbook(page([field]),{'1:text':'  안녕하세요! '}).correct,1)
 assert.equal(grading.gradeWorkbook(page([field]),{'1:text':'안녕'}).correct,1)
 assert.equal(grading.gradeWorkbook(page([field]),{'1:text':'안 녕'}).incorrect,1)
})
