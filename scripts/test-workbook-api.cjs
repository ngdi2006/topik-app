const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const crypto = require('node:crypto')
const zod = require('zod')
const model = {}
const transpile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
vm.runInNewContext(transpile('src/lib/textbooks/workbook.ts'), { exports: model, require: () => zod })
const grading = {}
vm.runInNewContext(transpile('src/lib/textbooks/grading.ts'), { exports: grading, require: name => name === './workbook' ? model : require(name) })
const submissionModel = {}
vm.runInNewContext(transpile('src/lib/textbooks/submissions.ts'), { exports: submissionModel, require })
const userA = '00000000-0000-4000-a000-000000000001'
const userB = '00000000-0000-4000-a000-000000000002'
const teacherId = '00000000-0000-4000-a000-000000000003'
const workbook = JSON.parse(fs.readFileSync('tmp/workbook-interactions/eps-topik-2025-workbook-1/0016.json', 'utf8'))

function fixture({ uid = userA, canRead = true, admin = true, failInsert = false } = {}) {
  const tables = {
    textbook_units: [{ id: 'unit-1', textbook_id: 'book', start_page: 15, end_page: 21, is_published: false, sort_order: 0 }],
    textbook_pages: [{ textbook_id: 'book', page_number: 16, ocr_payload: { retained: true, workbook: JSON.parse(JSON.stringify(workbook)) } }],
    user_textbook_annotations: [],
    textbooks: [{id:'book',title_vi:'Workbook'}],
    profiles: [{id:userA,full_name:'Learner A',role:uid===userA&&admin?'admin':'student',admin_permissions:[]},{id:userB,full_name:'Learner B',role:'student',admin_permissions:[]},{id:teacherId,full_name:'Teacher',role:'teacher',admin_permissions:['textbooks']}],
  }
  const db = { from(table) {
    const filters = []; let operation = 'select'; let payload; let bounds; let sorting
    const property=(row,key)=>key.includes('->>')?row[key.split('->>')[0]]?.[key.split('->>')[1]]:row[key]
    const query = {
      select() { return this }, eq(key, value) { filters.push(row => property(row,key) === value); return this },
      in(key, values) { filters.push(row => values.includes(row[key])); return this },
      gte(key, value) { filters.push(row => row[key] >= value); return this }, lte(key, value) { filters.push(row => row[key] <= value); return this },
      order(key,options) { sorting={key,ascending:options?.ascending!==false};return this }, range(start, end) { bounds = [start, end]; return this }, limit(count){bounds=[0,count-1];return this},
      insert(value){operation='insert';payload=value;return this},
      upsert(value) { operation = 'upsert'; payload = value; return this }, update(value) { operation = 'update'; payload = value; return this },
      execute() {
        const rows = tables[table]
        if (!rows) throw new Error(`Unexpected table ${table}`)
        if(operation==='insert'){
          if(failInsert)return {data:null,error:{code:'fixture_failure'}}
          if(rows.some(row=>row.id===payload.id))return {data:null,error:{code:'23505'}}
          rows.push({...payload,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});return {data:null,error:null}
        }
        if (operation === 'upsert') {
          for (const row of Array.isArray(payload) ? payload : [payload]) {
            const existing = rows.find(item => item.id === row.id)
            if (existing) Object.assign(existing, row); else rows.push({ ...row })
          }
          return { data: null, error: null }
        }
        let data = rows.filter(row => filters.every(filter => filter(row)))
        if (operation === 'update') { for (const row of data) Object.assign(row, payload); return { data, error: null } }
        if(sorting)data.sort((a,b)=>String(a[sorting.key]).localeCompare(String(b[sorting.key]))*(sorting.ascending?1:-1))
        if (bounds) data = data.slice(bounds[0], bounds[1] + 1)
        return { data, error: null }
      },
      async single() { const result = this.execute(); return { ...result, data: result.data[0] || null } },
      async maybeSingle() { return this.single() },
      then(resolve, reject) { try { return Promise.resolve(this.execute()).then(resolve, reject) } catch (error) { return Promise.reject(error).then(resolve, reject) } },
    }
    return query
  } }
  const deps = {
    'node:crypto': crypto, zod,
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: uid ? { id: uid } : null } }) } }) },
    '@/lib/supabase/admin': { createAdminClient: () => db },
    '@/lib/textbooks/access': { canReadTextbook: async () => canRead, canPreviewTextbooks: async () => admin, getTextbookPermissions: async id => {const role=tables.profiles.find(profile=>profile.id===id)?.role;return {canEditLayout:['admin','teacher'].includes(role),canManageAnswerKeys:role==='admin',canViewTranscript:['admin','teacher'].includes(role)}} },
    '@/lib/textbooks/workbook': model,
    '@/lib/textbooks/grading': grading,
    '@/lib/textbooks/submissions': submissionModel,
  }
  const route = {}
  vm.runInNewContext(transpile('src/app/api/textbooks/[bookId]/workbook/route.ts'), { exports: route, require: name => { assert.ok(deps[name], name); return deps[name] }, Map, Set, JSON, Date })
  const params = { params: Promise.resolve({ bookId: 'book' }) }
  const get = search => route.GET({ nextUrl: new URL(`http://fixture/workbook?${search}`) }, params)
  const post = value => route.POST({ json: async () => value }, params)
  const patch = value => route.PATCH({ json: async () => value }, params)
  const gradeRoute = {}
  vm.runInNewContext(transpile('src/app/api/textbooks/[bookId]/workbook/grade/route.ts'), { exports: gradeRoute, require: name => { assert.ok(deps[name], name); return deps[name] } })
  const grade = value => gradeRoute.POST({ json: async () => value }, params)
  const submitRoute={},reviewRoute={}
  for(const [target,file] of [[submitRoute,'src/app/api/textbooks/[bookId]/workbook/submit/route.ts'],[reviewRoute,'src/app/api/admin/textbooks/submissions/route.ts']])vm.runInNewContext(transpile(file),{exports:target,require:name=>{assert.ok(deps[name],name);return deps[name]}})
  const submit=value=>submitRoute.POST({json:async()=>value},params)
  const submissions=unitId=>submitRoute.GET({nextUrl:new URL('http://fixture?unitId='+unitId)},params)
  const queue=()=>reviewRoute.GET({nextUrl:new URL('http://fixture')})
  const review=value=>reviewRoute.PATCH({json:async()=>value})
  return { tables, get, post, patch, grade, submit, submissions, queue, review }
}
test('two bracket choices save independently and reload; cross-group values are rejected', async () => {
  const env = fixture()
  const field = JSON.parse(fs.readFileSync('tmp/workbook-choice-rows/eps-topik-2025-workbook-1/planned.json','utf8')).pages.find(page=>page.pageNumber===40).workbook.fields.find(field=>field.id==='p40-f11')
  env.tables.textbook_pages[0].ocr_payload.workbook.fields = [field]
  const answer = { pageNumber:16, fieldId:field.id, value:{g1:'2',g2:'3'} }
  assert.equal((await env.post({userId:userA,answers:[answer]})).status,200)
  const loaded=await(await env.get('unitId=unit-1')).json()
  assert.equal(JSON.stringify(loaded.answers[0].value),JSON.stringify(answer.value))
  assert.equal(loaded.progress[0].answered,1)
  assert.equal((await env.post({userId:userA,answers:[{...answer,value:{g1:'3',g2:'1'}}]})).status,409)
  const after=await(await env.get('unitId=unit-1')).json()
  assert.equal(JSON.stringify(after.answers[0].value),JSON.stringify(answer.value))
})

test('workbook endpoints reject unauthenticated and unauthorized draft access', async () => {
  assert.equal((await fixture({ uid: null }).get('unitId=unit-1')).status, 401)
  assert.equal((await fixture({ canRead: false }).post({})).status, 404)
  assert.equal((await fixture().get('unitId=other-book-unit')).status, 404)
})
test('answers are idempotent, belong to the authenticated user, and survive reload', async () => {
  const env = fixture()
  const answer = { pageNumber: 16, fieldId: workbook.fields[0].id, value: '택시 기사' }
  assert.equal((await env.post({ userId: userB, answers: [answer] })).status, 409)
  assert.equal(env.tables.user_textbook_annotations.length, 0)
  const firstSave = await env.post({ userId: userA, answers: [answer] })
  assert.equal(firstSave.status, 200, JSON.stringify(await firstSave.json()))
  assert.equal((await env.post({ userId: userA, answers: [{ ...answer, value: '운전기사' }] })).status, 200)
  assert.equal(env.tables.user_textbook_annotations.length, 1)
  const stored = env.tables.user_textbook_annotations[0]
  assert.equal(stored.user_id, userA)
  assert.equal(stored.kind, 'workbook_answer')
  const reloaded = await (await env.get('unitId=unit-1')).json()
  assert.equal(reloaded.answers[0].value, '운전기사')
  assert.equal(reloaded.progress[0].answered, 1)
  env.tables.user_textbook_annotations.push({ ...stored, id: 'foreign', user_id: userB, content: JSON.stringify({ fieldId: workbook.fields[1].id, value: 'secret' }) })
  const scoped = await (await env.get('unitId=unit-1')).json()
  assert.equal(scoped.answers.length, 1)
  assert.equal(scoped.userId, userA)
})
test('unknown fields and invalid answers are rejected before any write', async () => {
  const env = fixture()
  assert.equal((await env.post({ userId: userA, answers: [{ pageNumber: 999, fieldId: 'invented', value: 'x' }] })).status, 409)
  assert.equal((await env.post({ userId: userA, answers: [{ pageNumber: 16, fieldId: workbook.fields[0].id, value: {} }] })).status, 409)
  assert.equal(env.tables.user_textbook_annotations.length, 0)
})
test('admin layout review preserves page metadata; learner cannot change layout', async () => {
  const body = { pageNumber: 16, workbook }
  assert.equal((await fixture({ admin: false }).patch(body)).status, 403)
  const env = fixture()
  assert.equal((await env.patch(body)).status, 200)
  assert.equal(env.tables.textbook_pages[0].ocr_payload.retained, true)
  assert.equal(env.tables.textbook_pages[0].ocr_payload.workbook.review_status, 'reviewed')
})
test('progress aggregation reads beyond the default 1000 annotation rows', async () => {
  const env = fixture()
  for (let i = 0; i < 1001; i++) env.tables.user_textbook_annotations.push({ id: String(i), user_id: userA, textbook_id: 'book', page_number: 16, kind: 'workbook_answer', content: 'invalid legacy content', updated_at: new Date().toISOString() })
  env.tables.user_textbook_annotations.push({ id: 'valid', user_id: userA, textbook_id: 'book', page_number: 16, kind: 'workbook_answer', content: JSON.stringify({ fieldId: workbook.fields[0].id, value: '끝' }), updated_at: new Date().toISOString() })
  const response = await (await env.get('summary=1')).json()
  assert.equal(response.progress[0].answered, 1)
})

test('grading uses server-reviewed keys, enforces unit ownership and never writes user answers', async () => {
  const unitId='00000000-0000-4000-a000-000000000099'
  const env=fixture({admin:false})
  env.tables.textbook_units[0].id=unitId;env.tables.textbook_units[0].is_published=true
  const field=env.tables.textbook_pages[0].ocr_payload.workbook.fields[0]
  field.kind='choice';field.section='reading';field.options=[1,2,3,4].map(n=>({id:String(n),label:String(n),rect:field.rect}))
  field.answer_key={status:'reviewed',value:'1'}
  const publicData=await (await env.get('unitId='+unitId)).json()
  assert.equal(JSON.stringify(publicData).includes('answer_key'),false)
  const response=await env.grade({unitId,section:'reading',answers:{['16:'+field.id]:'1'}})
  assert.equal(response.status,200)
  const result=await response.json();assert.equal(result.correct,1);assert.equal(result.total,1)
  assert.equal(env.tables.user_textbook_annotations.length,0)
  assert.equal((await env.grade({unitId:'00000000-0000-4000-a000-000000000088',answers:{}})).status,404)
  assert.equal((await fixture({uid:null}).grade({unitId,answers:{}})).status,401)
  assert.equal((await fixture({canRead:false}).grade({unitId,answers:{}})).status,404)
  field.answer_key={status:'draft',value:'SECRET_DRAFT'}
  const draft=await (await env.grade({unitId,answers:{}})).json()
  assert.equal(draft.total,0);assert.equal(JSON.stringify(draft).includes('SECRET_DRAFT'),false)
  delete field.answer_key
})

test('learners cannot install answer keys and invalid reviewed keys are rejected', async () => {
 const copy=JSON.parse(JSON.stringify(workbook));copy.fields[0].answer_key={status:'reviewed',value:''}
 assert.equal((await fixture({admin:false}).patch({pageNumber:16,workbook:copy})).status,403)
 assert.equal((await fixture().patch({pageNumber:16,workbook:copy})).status,400)
})

test('manual sections store a teacher-owned snapshot, retry safely, isolate recipients and return review',async()=>{
 const env=fixture({admin:false}), unitId='00000000-0000-4000-a000-000000000099',requestId='00000000-0000-4000-a000-000000000098'
 env.tables.textbook_units[0].id=unitId;env.tables.textbook_units[0].is_published=true
 const field=env.tables.textbook_pages[0].ocr_payload.workbook.fields[0];field.section='writing'
 const input={unitId,section:'writing',teacherId,requestId,answers:{['16:'+field.id]:'Bài nộp'}}
 const response=await env.submit(input);assert.equal(response.status,200)
 const stored=env.tables.user_textbook_annotations[0]
 assert.equal(stored.user_id,teacherId);assert.equal(stored.rect.student_id,userA)
 assert.equal(JSON.parse(stored.content).answers[0].value,'Bài nộp')
 assert.equal((await env.submit(input)).status,200);assert.equal(env.tables.user_textbook_annotations.length,1)
 assert.equal((await env.submit({...input,answers:{['16:'+field.id]:'Changed'}})).status,409)
 const status=await (await env.submissions(unitId)).json();assert.equal(status.submissions[0].status,'pending')
 const teacher=fixture({uid:teacherId});teacher.tables.user_textbook_annotations.push(stored)
 assert.equal((await (await teacher.queue()).json()).submissions.length,1)
 assert.equal((await teacher.review({id:stored.id,correct:1000,feedback:'x'})).status,400)
 assert.equal((await teacher.review({id:stored.id,correct:1,feedback:'Tốt'})).status,200)
 const reviewed=await (await env.submissions(unitId)).json();assert.equal(reviewed.submissions[0].review.correct,1)
 assert.equal((await env.review({id:stored.id,correct:1,feedback:'spoof'})).status,403)
 const other=fixture({uid:userB,admin:false});other.tables.user_textbook_annotations.push(stored);other.tables.textbook_units[0].id=unitId;other.tables.textbook_units[0].is_published=true
 assert.equal((await (await other.submissions(unitId)).json()).submissions.length,0)
 assert.equal((await env.submit({...input,requestId:crypto.randomUUID(),teacherId:userB})).status,400)
 const foreignTeacher=fixture({uid:teacherId});foreignTeacher.tables.user_textbook_annotations.push({...stored,id:'00000000-0000-4000-a000-000000000097',user_id:userB})
 assert.equal((await (await foreignTeacher.queue()).json()).submissions.length,0)
 assert.equal((await foreignTeacher.review({id:'00000000-0000-4000-a000-000000000097',correct:0,feedback:'not assigned'})).status,404)
 const failing=fixture({admin:false,failInsert:true});failing.tables.textbook_units[0].id=unitId;failing.tables.textbook_units[0].is_published=true;failing.tables.textbook_pages[0].ocr_payload.workbook.fields[0].section='writing'
 const failed=await failing.submit(input);assert.equal(failed.status,500);assert.equal(failing.tables.user_textbook_annotations.length,0)
})

test('automatic scoring ignores vocabulary/grammar/writing even when answer keys exist',async()=>{
 const env=fixture({admin:false}),unitId='00000000-0000-4000-a000-000000000099'
 env.tables.textbook_units[0].id=unitId;env.tables.textbook_units[0].is_published=true
 const field=env.tables.textbook_pages[0].ocr_payload.workbook.fields[0];field.section='writing';field.answer_key={status:'reviewed',value:'A'}
 const result=await (await env.grade({unitId,answers:{['16:'+field.id]:'A'}})).json()
 assert.equal(result.total,0);assert.equal(result.items.length,0)
 assert.equal((await env.grade({unitId,section:'writing',answers:{}})).status,400)
})

test('teacher can adjust layout but cannot change, remove, approve or redefine a standard answer',async()=>{
 const env=fixture({uid:teacherId}),source=env.tables.textbook_pages[0].ocr_payload.workbook
 source.fields[0].answer_key={status:'reviewed',value:'표준 답'}
 let draft=JSON.parse(JSON.stringify(source));draft.fields[0].rect.x+=.001
 assert.equal((await env.patch({pageNumber:16,workbook:draft})).status,200)
 draft=JSON.parse(JSON.stringify(source));draft.fields[0].answer_key.value='changed'
 assert.equal((await env.patch({pageNumber:16,workbook:draft})).status,403)
 draft=JSON.parse(JSON.stringify(source));delete draft.fields[0].answer_key
 assert.equal((await env.patch({pageNumber:16,workbook:draft})).status,403)
 draft=JSON.parse(JSON.stringify(source));draft.fields[0].section='listening'
 assert.equal((await env.patch({pageNumber:16,workbook:draft})).status,403)
 const data=await(await env.get('unitId=unit-1')).json();assert.equal(data.canEdit,true);assert.equal(data.canManageAnswerKeys,false)
})
