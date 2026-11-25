const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict')
const load = (file, deps = {}) => {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, console, Response, require: key => { assert.ok(key in deps, key); return deps[key] } })
  return exports
}
const permissions = load('src/lib/admin-permissions.ts')
const management = load('src/lib/user-access-management.ts', { './admin-permissions': permissions })
let role = 'supporter', allowed = ['users'], targetRole = 'learner', writes = 0, signedIn = true
const actor = { id: 'actor', app_metadata: {} }
const db = { from(table) {
  let id
  const query = { select() { return this }, eq(key, value) { if (key === 'id') id = value; return this }, in() { return this },
    async maybeSingle() { return { data: table === 'profiles' ? id === 'actor' ? { role, admin_permissions: allowed } : { id: 'target', role: targetRole } : { id: 'plan', remaining_credits: 5 }, error: null } },
    async single() { return this.maybeSingle() },
    then(resolve, reject) { return Promise.resolve({ data: [{ id: 'target', role: targetRole }], error: null }).then(resolve, reject) },
  }; return query
}, async rpc() { writes++; return { data: {}, error: null } } }
const deps = {
  'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
  '@/lib/supabase/server': { createClient: async () => ({ ...db, auth: { getUser: async () => ({ data: { user: signedIn ? actor : null } }) } }) },
  '@/lib/supabase/admin': { createAdminClient: () => db },
  '@/lib/user-access-management': management,
  '@/lib/admin-permissions': permissions,
  '@/lib/admin-role': { isAdminRole: value => ['admin', 'teacher', 'supporter'].includes(value) },
  '@/lib/admin-user-audit': { recordAdminUserActivity: async () => {} },
}
const credits = load('src/app/api/admin/users/[id]/credits/route.ts', deps)
const bulk = load('src/app/api/admin/users/bulk-credits/route.ts', deps)
const interview = load('src/app/api/admin/interview-access/route.ts', deps)
const context = { params: Promise.resolve({ id: 'target' }) }
const request = value => ({ json: async () => value })
;(async () => {
  for (const action of ['add', 'deduct']) assert.equal((await credits.POST(request({ credits: 5, action }), context)).status, 200)
  assert.equal((await bulk.POST(request({ userIds: ['target'], credits: 5 }))).status, 200)
  assert.equal((await interview.POST(request({ user_id: 'target', days: 30 }))).status, 200)
  assert.equal(writes, 4)
  assert.equal((await interview.GET()).status, 403, 'users permission must not grant reports access')
  targetRole = 'supporter'
  assert.equal((await credits.POST(request({ credits: 5 }), context)).status, 403)
  assert.equal((await bulk.POST(request({ userIds: ['target'], credits: 5 }))).status, 403)
  assert.equal((await interview.POST(request({ user_id: 'target', days: 30 }))).status, 403)
  assert.equal((await interview.PATCH(request({ user_id: 'target', action: 'revoke' }))).status, 403)
  targetRole = 'learner'; allowed = []
  assert.equal((await credits.POST(request({ credits: 5 }), context)).status, 403)
  assert.equal((await bulk.POST(request({ userIds: ['target'], credits: 5 }))).status, 403)
  assert.equal((await interview.POST(request({ user_id: 'target', days: 30 }))).status, 403)
  assert.equal(writes, 4, 'rejected requests must never change access or credits')
  role = 'learner'; allowed = ['users']
  assert.equal((await credits.POST(request({ credits: 5 }), context)).status, 403)
  signedIn = false
  assert.equal((await credits.POST(request({ credits: 5 }), context)).status, 401)
  console.log('PASS supporter credits and interview grants; revoked permission, non-learner targets, learner actors and report isolation')
})().catch(error => { console.error(error); process.exitCode = 1 })
