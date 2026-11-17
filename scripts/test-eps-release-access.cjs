const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript')
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
const flags={};vm.runInNewContext(compile('src/lib/learner-feature-flags.ts'),{exports:flags,process:{env:{}}})
for(const path of ['/textbooks','/textbooks/book/read','/api/textbooks','/api/textbooks/book/workbook/submit','/api/textbooks/book/units/unit/audio/resource'])assert.equal(flags.isLockedLearningPath(path),false,path)
for(const path of ['/elearning','/api/elearning','/textbooks/learning/vocabulary','/textbooks/learning/grammar'])assert.equal(flags.isLockedLearningPath(path),true,path)
async function campus(role){
 let calls=0
 const client={auth:{getUser:async()=>({data:{user:role?{id:'fixture'}:null}})},rpc:async()=>{calls++;return {data:{ok:true},error:null}}}
 const deps={'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},'@/lib/supabase/server':{createClient:async()=>client},'@/lib/admin-role':{getTrustedUserRole:async()=>role},'@/lib/campus/model':{safeMeetingUrl:value=>value}}
 const route={},exam={}
 for(const [exports,file] of [[route,'src/app/api/campus/route.ts'],[exam,'src/app/api/campus/exam-setup/route.ts']])vm.runInNewContext(compile(file),{exports,require:key=>{assert.ok(deps[key],key);return deps[key]},URL})
 const responses=[await route.GET(),await route.POST({json:async()=>({roomId:'00000000-0000-4000-a000-000000000001',action:'join'})}),await exam.GET({url:'http://fixture?roomId=00000000-0000-4000-a000-000000000001'})]
 const expected=!role?401:role==='admin'?200:403
 for(const response of responses)assert.equal(response.status,expected,role)
 assert.equal(calls,role==='admin'?3:0)
 const page={};vm.runInNewContext(compile('src/app/(learner)/campus/page.tsx'),{exports:page,require:key=>key==='next/navigation'?{redirect:location=>{throw {location}}}:key==='react/jsx-runtime'?{jsx:()=>({rendered:true})}:key==='@/components/campus/CampusHub'?{default:()=>null}:deps[key]})
 if(role==='admin')assert.equal((await page.default()).rendered,true)
 else await assert.rejects(page.default(),error=>error.location===(!role?'/login?next=/campus':'/dashboard'))
}
;(async()=>{for(const role of [null,'student','teacher','supporter','admin'])await campus(role);console.log('PASS: EPS reader released, unfinished tools locked; campus page/API admin-only for all roles')})().catch(error=>{console.error(error);process.exitCode=1})
