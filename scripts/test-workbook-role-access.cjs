const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),zod=require('zod')
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
const adminId='00000000-0000-4000-a000-000000000001',teacherId='00000000-0000-4000-a000-000000000002',learnerId='00000000-0000-4000-a000-000000000003'
const profiles=new Map([[adminId,{role:'admin'}],[teacherId,{role:'teacher'}],[learnerId,{role:'learner'}]])
const users=new Map([[adminId,{id:adminId,app_metadata:{keep:true}}],[teacherId,{id:teacherId,app_metadata:{keep:true}}],[learnerId,{id:learnerId,app_metadata:{keep:true},user_metadata:{workbook_access:true}}]])
let signedIn=adminId,audits=0,activationEnabled=true
const db={auth:{admin:{getUserById:async id=>({data:{user:users.get(id)},error:null}),updateUserById:async(id,body)=>{users.get(id).app_metadata=body.app_metadata;return {error:null}}}},from:table=>{let id;return {select(){return this},eq(key,value){if(key==='id')id=value;return this},maybeSingle:async()=>({data:table==='profiles'?profiles.get(id):{code:id==='workbook'?'eps-topik-2025-workbook-1':'eps-topik-2025-1',is_published:id!=='draft'&&id!=='workbook',metadata:id==='workbook'?{access_mode:'workbook_activation',activation_enabled:activationEnabled}:{}},error:null})}}}
const entitlement={}
vm.runInNewContext(compile('src/lib/textbooks/workbook-entitlement.ts'),{exports:entitlement})
const access={}
vm.runInNewContext(compile('src/lib/textbooks/access.ts'),{exports:access,require:key=>key==='@/lib/textbooks/workbook-entitlement'?entitlement:({createAdminClient:()=>db})})
const route={},deps={'@/lib/textbooks/workbook-entitlement':entitlement,zod,'next/server':{NextResponse:{json:(data,init)=>Response.json(data,init)}},'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:signedIn?users.get(signedIn):null}})}})},'@/lib/supabase/admin':{createAdminClient:()=>db},'@/lib/textbooks/access':access,'@/lib/admin-user-audit':{recordAdminUserActivity:async()=>{audits++}}}
vm.runInNewContext(compile('src/app/api/admin/users/[id]/workbook-access/route.ts'),{exports:route,require:key=>{assert.ok(deps[key],key);return deps[key]}})
const patch=enabled=>route.PATCH({json:async()=>enabled?({action:"extend",days:30}):({action:"revoke"})},{params:Promise.resolve({id:learnerId})})
;(async()=>{
 for(const id of [adminId,teacherId])assert.equal(await access.canReadTextbook(id,'workbook'),true)
 assert.equal((await access.getTextbookPermissions(teacherId)).canManageAnswerKeys,false)
 assert.equal((await access.getTextbookPermissions(teacherId)).canViewTranscript,true)
 assert.equal(await access.canReadTextbook(learnerId,'workbook'),false,'user-editable metadata must not grant access')
 assert.equal(await access.canReadTextbook(learnerId,'course'),true)
 assert.equal(await access.canReadTextbook(learnerId,'draft'),false)
 for(const body of [{enabled:true},{action:'extend',days:0},{action:'extend',days:3651},{action:'set_expiry',expires_at:'2020-01-01T23:59:59+07:00'}])assert.equal((await route.PATCH({json:async()=>body},{params:Promise.resolve({id:learnerId})})).status,400)
 assert.equal((await patch(true)).status,200)
 assert.equal(users.get(learnerId).app_metadata.keep,true)
 assert.equal(await access.canReadTextbook(learnerId,'workbook'),true)
 const savedExpiry=users.get(learnerId).app_metadata.workbook_access_expires_at
 users.get(learnerId).app_metadata.workbook_access_expires_at=new Date(Date.now()-1).toISOString()
 assert.equal(await access.canReadTextbook(learnerId,'workbook'),false,'expiration must apply during the existing session')
 users.get(learnerId).app_metadata.workbook_access_expires_at=savedExpiry
 assert.equal(await access.usesPrivateWorkbookAccess('workbook'),true)
 activationEnabled=false;assert.equal(await access.canReadTextbook(learnerId,'workbook'),false);activationEnabled=true
 signedIn=teacherId;assert.equal((await patch(false)).status,403)
 signedIn=learnerId;assert.equal((await patch(false)).status,403)
 signedIn=null;assert.equal((await patch(false)).status,401)
 signedIn=adminId;assert.equal((await patch(false)).status,200)
 assert.equal(await access.canReadTextbook(learnerId,'workbook'),false,'revocation must apply without relying on a refreshed JWT')
 assert.equal(audits,2)
 console.log('PASS workbook activation: admin-only toggle, teacher defaults, protected metadata, main books retained and immediate revoke')
})().catch(error=>{console.error(error);process.exitCode=1})
