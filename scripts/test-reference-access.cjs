const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict'),zod=require('zod')
const load=(file,deps={})=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,console,require:key=>{assert.ok(key in deps,key);return deps[key]}});return exports}
const catalog=load('src/lib/textbooks/catalog.ts')
const entitlement=load('src/lib/textbooks/reference-entitlement.ts',{'./catalog':catalog})
const workbook=load('src/lib/textbooks/workbook-entitlement.ts')
const adminId='00000000-0000-4000-a000-000000000001',teacherId='00000000-0000-4000-a000-000000000002',studentId='00000000-0000-4000-a000-000000000003'
const roles={[adminId]:'admin',[teacherId]:'teacher',[studentId]:'learner'}
const users=Object.fromEntries(Object.keys(roles).map(id=>[id,{id,app_metadata:{keep:true,workbook_access_volumes:{1:{enabled:true,expires_at:'2099-01-01T00:00:00Z'}}},user_metadata:{reference_book_access:{[catalog.referenceBookCodes[0]]:{enabled:true,expires_at:'2099-01-01T00:00:00Z'}}}}]))
let actor=adminId,enabled=true
const db={auth:{admin:{getUserById:async id=>({data:{user:users[id]},error:null}),updateUserById:async(id,value)=>{users[id].app_metadata=value.app_metadata;return {error:null}}}},from:table=>{let id;return {select(){return this},eq(key,value){if(key==='id')id=value;return this},maybeSingle:async()=>({data:table==='profiles'?(roles[id]?{role:roles[id]}:null):{code:id,is_published:id==='course',metadata:{access_mode:'reference_activation',activation_enabled:enabled}},error:null})}}}
const common={'@/lib/supabase/admin':{createAdminClient:()=>db},'@/lib/textbooks/workbook-entitlement':workbook,'./catalog':catalog,'./reference-entitlement':entitlement,'./workbook-entitlement':workbook}
const access=load('src/lib/textbooks/access.ts',common)
const deps={...common,zod,'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:users[actor]}})}})},'@/lib/textbooks/access':access,'@/lib/admin-user-audit':{recordAdminUserActivity:async()=>{}}}
const service=load('src/lib/textbooks/reference-access-admin.ts',deps)
deps['@/lib/textbooks/reference-access-admin']=service
const single=load('src/app/api/admin/users/[id]/reference-access/route.ts',deps),bulk=load('src/app/api/admin/users/bulk-reference-access/route.ts',deps)
const patch=body=>single.PATCH({json:async()=>body},{params:Promise.resolve({id:studentId})})
;(async()=>{
 for(const code of catalog.referenceBookCodes){
  assert.equal(await access.canReadTextbook(studentId,code),false)
  assert.equal(await access.canReadTextbook(adminId,code),true)
  assert.equal(await access.canReadTextbook(teacherId,code),true)
 }
 const first=catalog.referenceBookCodes[0],second=catalog.referenceBookCodes[1]
 assert.equal((await patch({books:[first],action:'extend',days:30})).status,200)
 assert.equal(await access.canReadTextbook(studentId,first),true)
 assert.equal(await access.canReadTextbook(studentId,second),false)
 assert.equal(users[studentId].app_metadata.keep,true)
 assert.equal(users[studentId].app_metadata.workbook_access_volumes[1].enabled,true)
 const expiry=users[studentId].app_metadata.reference_book_access[first].expires_at
 await patch({books:[first],action:'extend',days:7})
 assert.equal(Date.parse(users[studentId].app_metadata.reference_book_access[first].expires_at)-Date.parse(expiry),7*86400000)
 users[studentId].app_metadata.reference_book_access[first].expires_at='2020-01-01T00:00:00Z'
 assert.equal(await access.canReadTextbook(studentId,first),false)
 await patch({books:[first,second],action:'set_expiry',expires_at:'2099-01-01T00:00:00Z'})
 await patch({books:[first],action:'revoke'})
 assert.equal(await access.canReadTextbook(studentId,first),false)
 assert.equal(await access.canReadTextbook(studentId,second),true)
 enabled=false;assert.equal(await access.canReadTextbook(studentId,second),false);enabled=true
 for(const body of [{books:[],action:'revoke'},{books:['unknown'],action:'extend',days:30},{books:[first,first],action:'revoke'},{books:[first],action:'extend',days:0},{books:[first],action:'set_expiry',expires_at:'2020-01-01T00:00:00Z'}])assert.equal((await patch(body)).status,400)
 actor=teacherId;assert.equal((await patch({books:[first],action:'extend',days:30})).status,403)
 actor=studentId;assert.equal((await patch({books:[first],action:'extend',days:30})).status,403)
 actor=null;assert.equal((await patch({books:[first],action:'extend',days:30})).status,401)
 actor=adminId
 const response=await bulk.POST({json:async()=>({userIds:[studentId,teacherId],books:catalog.referenceBookCodes,action:'extend',days:30})})
 const result=await response.json();assert.equal(result.succeeded,1);assert.equal(result.failed,1)
 for(const code of catalog.referenceBookCodes)assert.equal(await access.canReadTextbook(studentId,code),true)
 const mixed={books:['eps-topik-2025-workbook-2',first],action:'extend',days:7};
 const responseMixed=await patch(mixed);assert.equal(responseMixed.status,200);const mixedResult=await responseMixed.json();assert.equal(mixedResult.workbookVolumes[2].active,true);assert.equal(mixedResult.referenceBooks[first].active,true);
 await patch({books:['eps-topik-2025-workbook-2',first],action:'revoke'});assert.equal(await access.hasWorkbookAccess(studentId,2),false);assert.equal(await access.canReadTextbook(studentId,first),false);assert.equal(await access.canReadTextbook(studentId,second),true);
 console.log('PASS mixed workbook/reference grants and revokes plus five independent expiring grants, extension, fixed expiry, revoke, current-session checks, metadata isolation, admin-only APIs, validation and partial bulk results')
})().catch(error=>{console.error(error);process.exitCode=1})
