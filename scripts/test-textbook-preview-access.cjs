const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const flags = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/learner-feature-flags.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:flags,process:{env:{}}})

async function run(role, pathname, permissions = [], authFails = false) {
  const response = (kind, value, options) => ({ kind, value, status: options?.status, cookies: { set() {} } })
  const modules = {
    '@supabase/ssr': { createServerClient: () => ({
      auth: { getUser: async () => { if (authFails) throw new Error('Unavailable'); return { data: { user: role ? { id: 'test-user' } : null } } } },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { admin_permissions: permissions } }) }) }) }),
    }) },
    'next/server': { NextResponse: {
      next: () => response('next'), json: (value, options) => response('json', value, options), redirect: url => response('redirect', url.toString()),
    } },
    '@/lib/auth-flow': { sanitizeNextPath: path => path || '/dashboard' },
    '@/lib/admin-role': { getTrustedUserRole: async () => role, isAdminRole: role => ['admin', 'staff'].includes(role) },
    '@/lib/admin-permissions': { permissionsForRole: (_, values) => values, permissionForPath: () => 'textbooks', firstAdminPathForPermissions: () => '/admin/textbooks' },
    '@/lib/learner-feature-flags': flags,
  }
  const compiled = ts.transpileModule(fs.readFileSync('src/lib/supabase/middleware.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: name => { assert.ok(modules[name], name); return modules[name] }, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test' } }, console: { warn() {} }, setTimeout: () => 0 })
  const url = new URL(`http://localhost:3000${pathname}`)
  url.clone = () => new URL(url)
  return exports.updateSession({ nextUrl: url, url: url.toString(), cookies: { getAll: () => [], set() {} } })
}

;(async () => {
  assert.equal((await run('admin', '/textbooks/book/read')).kind, 'next')
  assert.equal((await run('admin', '/api/textbooks/book/pages/1/image')).kind, 'next')
  assert.equal((await run('staff', '/textbooks', ['textbooks'])).kind, 'next')
  assert.equal((await run('staff', '/api/textbooks')).kind, 'next')
  assert.equal((await run('student', '/api/textbooks')).kind, 'next')
  assert.equal((await run('student', '/textbooks')).kind, 'next')
  assert.equal((await run(null, '/api/textbooks')).status, 401)
  assert.equal((await run('admin', '/api/elearning')).status, 503)
  assert.match((await run('student', '/textbooks/learning/vocabulary')).value, /notice=learning-in-development/)
  console.log('PASS: 9 released textbook and unfinished learning-tool access checks')
})().catch(error => { console.error(error); process.exitCode = 1 })
