const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const model={}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/textbooks/workbook-entitlement.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:model})
const now=Date.parse('2026-11-16T10:00:00Z'),day=86400000
const active={workbook_access:true,workbook_access_expires_at:new Date(now+10*day).toISOString()}
assert.equal(model.workbookEntitlement(active,now).active,true)
assert.equal(model.workbookEntitlement(active,now+10*day).active,false,'expiry boundary must deny access')
assert.equal(model.workbookEntitlement({workbook_access:true},now).active,false,'legacy unlimited grants must require an explicit expiry')
assert.equal(model.workbookEntitlement({workbook_access:true,workbook_access_expires_at:'invalid'},now).active,false)
assert.equal(Date.parse(model.nextWorkbookExpiry(active,{action:'extend',days:30},now).expiresAt),now+40*day)
assert.equal(Date.parse(model.nextWorkbookExpiry({...active,workbook_access_expires_at:new Date(now-day).toISOString()},{action:'extend',days:7},now).expiresAt),now+7*day)
assert.equal(Date.parse(model.nextWorkbookExpiry({...active,workbook_access:false},{action:'extend',days:7},now).expiresAt),now+7*day)
const custom=model.nextWorkbookExpiry(active,{action:'set_expiry',expires_at:'2026-11-20T23:59:59+07:00'},now)
assert.equal(custom.expiresAt,'2026-11-20T16:59:59.000Z')
assert.throws(()=>model.nextWorkbookExpiry(active,{action:'set_expiry',expires_at:'2026-11-01T00:00:00Z'},now))
assert.equal(model.nextWorkbookExpiry(active,{action:'revoke'},now).enabled,false)
console.log('PASS timed workbook access: active/expired/boundary, legacy grant, extension, reactivation, date/timezone and revoke')
