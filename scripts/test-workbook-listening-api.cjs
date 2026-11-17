const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const crypto = require('node:crypto')
const zod = require('zod')
const transpile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const model = {}
vm.runInNewContext(transpile('src/lib/textbooks/listening.ts'), { exports: model, require: () => zod })
const manifest = JSON.parse(fs.readFileSync('tmp/workbook-listening/B1/manifest.json', 'utf8'))
const uid = '00000000-0000-4000-a000-000000000001'
function fixture({ authenticated = true, admin = true, teacher = false, read = true, privateMode = false, listening = manifest } = {}) {
  const annotations = new Map(); const downloads = []
  const tables = {
    textbook_units: [{ id: 'unit', textbook_id: 'book', start_page: 15, is_published: !admin }],
    textbook_resources: [{ id: 'resource', unit_id: 'unit', kind: 'audio', is_published: privateMode ? false : !admin, metadata: { storage_path: 'private/full.mp3', listening } }],
  }
  const db = { storage: { from: () => ({ createSignedUrl: async path => { downloads.push(path); return { data: { signedUrl: `https://storage.example/${path}` }, error: null } } }) }, from(table) {
    const filters = []
    const query = { select() { return this }, eq(key, value) { filters.push(row => row[key] === value); return this },
      async maybeSingle() { const rows = table === 'user_textbook_annotations' ? [...annotations.values()] : tables[table]; return { data: rows.find(row => filters.every(filter => filter(row))) || null, error: null } },
      async single() { return this.maybeSingle() },
      async upsert(row) { annotations.set(row.id, row); return { error: null } },
    }; return query
  } }
  const dependencies = {
    'node:crypto': crypto, zod,
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init), redirect: (url, init) => new Response(null, { ...init, headers: { ...init.headers, location: url } }) } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: authenticated ? { id: uid } : null } }) } }) },
    '@/lib/supabase/admin': { createAdminClient: () => db },
    '@/lib/textbooks/access': { canReadTextbook: async () => read, canPreviewTextbooks: async () => admin||teacher, usesPrivateWorkbookAccess:async()=>privateMode, getTextbookPermissions:async()=>({canManageAnswerKeys:admin,canViewTranscript:admin||teacher,canEditLayout:admin||teacher}) },
    '@/lib/textbooks/listening': model,
  }
  const route = {}
  vm.runInNewContext(transpile('src/app/api/textbooks/[bookId]/units/[unitId]/audio/[resourceId]/route.ts'), { exports: route, require: name => { assert.ok(dependencies[name], name); return dependencies[name] }, Response, URL })
  const context = { params: Promise.resolve({ bookId: 'book', unitId: 'unit', resourceId: 'resource' }) }
  return { annotations, downloads, get: query => route.GET({ nextUrl: new URL(`http://fixture/audio?${query}`) }, context), post: (query, body) => route.POST({ nextUrl: new URL(`http://fixture/audio?${query}`), json: async () => body }, context) }
}
test('real Gemini manifest parses and public segments never expose storage paths', async () => {
  assert.ok(model.parseListening({ listening: manifest }))
  const data = await (await fixture().get('segments=1')).json()
  assert.equal(data.segments.length, manifest.segments.length)
  assert.equal(data.segments[0].audio_path, undefined)
  assert.match(data.segments[0].audio_url, /\?clip=s\d+/)
})

test('real full-track and group waveforms are authenticated, bounded and do not expose audio paths', async () => {
  const listening = JSON.parse(fs.readFileSync('tmp/workbook-listening-elevenlabs/B60/question-groups/web-manifest.json','utf8'))
  assert.ok(model.parseListening({listening}))
  const data = await (await fixture({listening}).get('segments=1')).json()
  assert.deepEqual(data.waveform,listening.waveform)
  assert.deepEqual(data.segments[0].waveform,listening.segments[0].waveform)
  assert.ok(data.waveform.length>256)
  assert.equal(data.segments[0].audio_path,undefined)
  assert.equal((await fixture({listening,authenticated:false}).get('segments=1')).status,401)
  assert.equal(model.parseListening({listening:{...listening,waveform:[-1,256]}}),null)
  assert.equal(model.parseListening({listening:{...listening,waveform:Array(4097).fill(0)}}),null)
})

for (const lesson of [1, 2]) test(`B${lesson} approved groups replace old segments and retain clip ownership checks`, async () => {
  const listening = JSON.parse(fs.readFileSync(`tmp/workbook-listening-elevenlabs/B${lesson}/question-groups-pilot/web-manifest.json`, 'utf8'))
  assert.ok(model.parseListening({ listening }))
  const env = fixture({ listening })
  const data = await (await env.get('segments=1')).json()
  assert.equal(data.segments.length, 3)
  assert.deepEqual(data.answerGuide, [])
  assert.equal(data.segments[0].questionEndNumber, lesson === 1 ? 4 : 5)
  assert.equal(data.segments[0].groupInstruction, listening.segments[0].groupInstruction)
  assert.equal(data.segments[0].audio_path, undefined)
  assert.equal((await env.get('clip=s0001')).status, 404)
  assert.equal((await env.get(`clip=${data.segments[0].id}`)).status, 307)
  assert.equal(env.downloads.at(-1), listening.segments[0].audio_path)
})
test('clip audio checks ownership and signed redirects target only the selected file', async () => {
  assert.equal((await fixture({ authenticated: false }).get('segments=1')).status, 401)
  assert.equal((await fixture({ read: false }).get('segments=1')).status, 404)
  assert.equal((await fixture().get('clip=unknown')).status, 404)
  const env = fixture(); const segment = manifest.segments[0]
  const response = await env.get(`clip=${segment.id}`)
  assert.equal(response.status, 307)
  assert.equal(env.downloads[0], segment.audio_path)
})
test('per-clip progress is isolated from the full recording and another account', async () => {
  const env = fixture(); const segment = manifest.segments[0]
  const body = { userId: uid, seconds: 1, duration: segment.clipEnd - segment.clipStart }
  assert.equal((await env.post(`clip=${segment.id}`, body)).status, 200)
  assert.equal((await (await env.get(`clip=${segment.id}&progress=1`)).json()).seconds, 1)
  assert.equal((await (await env.get('progress=1')).json()).seconds, 0)
  assert.equal((await env.post(`clip=${segment.id}`, { ...body, userId: '00000000-0000-4000-a000-000000000002' })).status, 400)
  assert.equal(env.annotations.size, 1)
})
test('admin/teacher can view dialogue; learner payload contains no transcript or answer-guide text', async () => {
  const admin = await (await fixture().get('segments=1')).json()
  const learner = await (await fixture({ admin: false }).get('segments=1')).json()
  assert.ok(admin.answerGuide.length > 0)
  assert.equal(learner.answerGuide.length,0)
  assert.equal(learner.canViewTranscript,false)
  assert.ok(learner.segments.every(segment=>segment.text_ko===''&&segment.text_vi===''))
  const teacher=await(await fixture({admin:false,teacher:true}).get('segments=1')).json()
  assert.equal(teacher.canViewTranscript,true);assert.equal(teacher.canReview,false)
  assert.ok(teacher.segments.some(segment=>segment.text_ko))
  const activated=fixture({admin:false,privateMode:true})
  assert.equal((await activated.get('segments=1')).status,200)
  assert.equal((await activated.get('')).status,307)
  assert.equal((await fixture({admin:false,privateMode:true,read:false}).get('segments=1')).status,404)
})
