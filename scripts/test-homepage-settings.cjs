const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const { createHash } = require('node:crypto')
const jsx = require('react/jsx-runtime')
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText
let role = null, saved = null, bucket = null, writes = 0, revalidated = 0, failSave = false
const actor = () => role ? { id: 'admin-fixture', user_metadata: { full_name: 'Fixture User' } } : null
const db = { storage: {
  getBucket: async () => ({ data: bucket, error: null }),
  createBucket: async (name, options) => { assert.equal(options.public, false); bucket = { name, public: false }; return { data: bucket, error: null } },
  from: name => ({
    download: async file => { assert.equal(name, 'site-settings'); assert.equal(file, 'homepage.json'); return { data: saved ? { text: async () => JSON.stringify(saved) } : null, error: null } },
    upload: async (file, body, options) => { assert.equal(file, 'homepage.json'); assert.equal(options.contentType, 'application/json'); if (failSave) return { error: new Error('upload failure') }; saved = JSON.parse(body.toString()); writes++; return { error: null } },
  }),
} }
const server = { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: actor() } }) }, from: () => ({ select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: { role } }) }) }) }
const settings = {}
vm.runInNewContext(compile('src/lib/homepage-settings.ts'), { exports: settings, require: () => ({ createAdminClient: () => db }) })
const route = {}
const deps = {
  'zod': require('zod'), 'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
  '@/lib/supabase/server': server, '@/lib/supabase/admin': { createAdminClient: () => db },
  '@/lib/homepage-settings': settings, 'next/cache': { revalidatePath: path => { assert.equal(path, '/'); revalidated++ } },
}
vm.runInNewContext(compile('src/app/api/admin/settings/homepage/route.ts'), { exports: route, Buffer, require: key => { assert.ok(deps[key], key); return deps[key] } })
const root = {}, Eps = () => {}, RoundTwo = () => {}
vm.runInNewContext(compile('src/app/page.tsx'), { exports: root, require: key => key === 'react/jsx-runtime' ? jsx : key === 'next/link' ? { default: () => {} } : key.endsWith('EpsHome') ? { default: Eps } : key.endsWith('RoundTwoHome') ? { default: RoundTwo } : deps[key] })
const page = async preview => root.default({ searchParams: Promise.resolve(preview ? { 'homepage-preview': preview } : {}) })
const variant = element => element.props.children[1].type
;(async () => {
  assert.equal(await settings.getHomepageVariant(), 'eps', 'New public page is the default without provisioning')
  for (const next of [null, 'learner', 'teacher', 'supporter']) {
    role = next
    assert.equal((await route.GET()).status, 403)
    assert.equal((await route.PATCH({ json: async () => ({ variant: 'round-two' }) })).status, 403)
    assert.equal(variant(await page('round-two')), Eps, 'Only admins can force preview of the archived page')
  }
  assert.equal(writes, 0)
  role = 'admin'
  assert.equal(variant(await page('round-two')), RoundTwo)
  assert.equal(variant(await page('eps')), Eps)
  assert.equal(writes, 0, 'Preview never publishes')
  assert.equal((await route.PATCH({ json: async () => ({ variant: 'unknown' }) })).status, 400)
  assert.equal((await route.PATCH({ json: async () => ({ variant: 'eps', extra: true }) })).status, 400)
  assert.equal((await route.PATCH({ json: async () => ({ variant: 'round-two' }) })).status, 200)
  assert.equal(saved.updatedBy, 'admin-fixture'); assert.equal(bucket.public, false)
  role = null
  assert.equal(variant(await page()), RoundTwo, 'Saved selection is used for public visitors')
  role = 'admin'
  assert.equal(variant(await page('eps')), Eps)
  assert.equal((await route.PATCH({ json: async () => ({ variant: 'eps' }) })).status, 200)
  assert.equal(await settings.getHomepageVariant(), 'eps')
  assert.equal(revalidated, 2)
  failSave = true
  assert.equal((await route.PATCH({ json: async () => ({ variant: 'round-two' }) })).status, 500)
  assert.equal(saved.variant, 'eps', 'A failed save must not publish a different page')
  saved = { variant: 'corrupt' }; assert.equal(await settings.getHomepageVariant(), 'eps')
  const archivedHash = createHash('sha256').update(fs.readFileSync('src/components/home/RoundTwoHome.tsx', 'utf8').replace(/\r\n/g, '\n')).digest('hex')
  assert.equal(archivedHash, '91273213574e8dd50f55ecd683105892ef32da99b8f65f2fee6a7124d59006bd', 'Archived Vòng 2 page remains unchanged')
  const middleware = {}; let authChecks = 0
  const nextUrl = url => Object.assign(new URL(url), { clone() { return nextUrl(this.href) } })
  const middlewareDeps = {
    '@/lib/learner-feature-flags': { isLockedLearningPath: () => false },
    '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => { authChecks++; return { data: { user: null } } } } }) },
    'next/server': { NextResponse: { next: () => ({ next: true }), redirect: url => ({ redirect: url.href }), json: (data, init) => ({ data, status: init.status }) } },
    '@/lib/auth-flow': { sanitizeNextPath: path => path }, '@/lib/admin-role': {}, '@/lib/admin-permissions': {},
  }
  vm.runInNewContext(compile('src/lib/supabase/middleware.ts'), { exports: middleware, console, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture' } }, setTimeout() {}, require: key => middlewareDeps[key] })
  const request = path => ({ nextUrl: nextUrl('https://fixture.invalid' + path), url: 'https://fixture.invalid' + path })
  assert.equal((await middleware.updateSession(request('/textbooks/tutorial/listening-example.mp3'))).next, true)
  assert.equal(authChecks, 0)
  assert.equal((await middleware.updateSession(request('/api/textbooks/book/units/unit/audio/private'))).status, 401)
  assert.ok((await middleware.updateSession(request('/textbooks/tutorial/private.mp3'))).redirect.includes('/login'))
  console.log('PASS: default EPS page, exact Vòng 2 archive, private persistent selection, reversible publishing, admin-only preview/write and failed-save handling')
})().catch(error => { console.error(error); process.exitCode = 1 })
