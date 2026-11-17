// Isolated PostgreSQL-compatible integration test. Never connects to Supabase.
// Setup: npm install --prefix tmp/campus-validation --no-save --no-package-lock @electric-sql/pglite
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const modulePath = path.resolve('tmp/campus-validation/node_modules/@electric-sql/pglite/dist/index.js')
const { PGlite } = await import(pathToFileURL(modulePath).href)

test('campus migration, admission, authorization and learning lifecycle', async t => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table public.profiles(id uuid primary key references auth.users(id),role text);
      create table public.exams(id uuid primary key,title text,status text);
      grant usage on schema auth,public to authenticated,anon;
    `)
    await db.exec(await fs.readFile('supabase/migrations/202611070001_campus_module.sql', 'utf8'))
    await db.exec(await fs.readFile('supabase/migrations/202611070002_campus_exam_content.sql', 'utf8'))
    const userIds = []
    for (let i = 0; i < 36; i++) {
      const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
      userIds.push(id)
      await db.query('insert into auth.users values($1)', [id])
      await db.query('insert into public.profiles values($1,$2)', [id, i === 34 ? 'admin' : i === 35 ? 'teacher' : 'learner'])
    }
    const { rows: roomRows } = await db.query('select id,kind from public.campus_rooms order by kind')
    const classroom = roomRows.find(r => r.kind === 'classroom').id
    const admin = userIds[34]; const teacher = userIds[35]
    const become = async id => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || ''])
      await db.exec('set role authenticated')
    }
    const snapshot = async () => (await db.query('select public.campus_snapshot() as state')).rows[0].state
    const action = async (name, data = {}) => (await db.query('select public.campus_action($1,$2,$3::jsonb) as state', [classroom, name, JSON.stringify(data)])).rows[0].state
    await t.test('unauthenticated and anonymous access is rejected', async () => {
      await become(null)
      await assert.rejects(snapshot, /đăng nhập/)
      await db.exec('set role anon')
      await assert.rejects(snapshot, /permission denied/)
    })
    await t.test('first 30 admissions get unique seats; overflow is FIFO', async () => {
      for (const id of userIds.slice(0, 33)) { await become(id); await action('join') }
      const state = await snapshot()
      const room = state.rooms.find(r => r.id === classroom)
      assert.equal(room.occupied, 30); assert.equal(room.queued, 3)
      assert.equal(state.memberships[0].position, 3)
      await become(userIds[30]); assert.equal((await snapshot()).memberships[0].position, 1)
    })
    await t.test('repeated join does not duplicate registration or change queue order', async () => {
      await become(userIds[30]); await action('join'); await action('join')
      assert.equal((await snapshot()).memberships[0].position, 1)
      await become(userIds[0]); const state = await action('join')
      assert.equal(state.memberships[0].seat, 1)
      assert.equal(state.rooms.find(r => r.id === classroom).occupied, 30)
    })
    await t.test('leaving promotes the earliest waiting learner into the freed seat', async () => {
      await become(userIds[0]); await action('leave')
      await become(userIds[30]); const state = await snapshot()
      assert.equal(state.memberships[0].status, 'admitted'); assert.equal(state.memberships[0].seat, 1)
      assert.equal(new Set(state.seats.filter(s => s.room_id === classroom).map(s => s.seat)).size, 30)
    })
    await t.test('learners cannot resize or control the board; direct table writes are denied', async () => {
      await become(userIds[1])
      await assert.rejects(() => action('configure', { capacity: 50, mode: 'self' }), /quản trị viên/)
      await assert.rejects(() => action('teach', { phase: 'teaching', step: 0 }), /phân công/)
      await assert.rejects(() => db.query('update public.campus_rooms set capacity=100'), /permission denied/)
    })
    await t.test('admin capacity increase automatically admits the next people', async () => {
      await become(admin)
      const state = await action('configure', { capacity: 32, mode: 'self' })
      const room = state.rooms.find(r => r.id === classroom)
      assert.equal(room.occupied, 32); assert.equal(room.queued, 0)
      await assert.rejects(() => action('configure', { capacity: 29, mode: 'self' }), /giảm sức chứa/)
      await assert.rejects(() => action('configure', { capacity: 121, mode: 'self' }), /1 đến 120/)
    })
    await t.test('quiz is scored server-side; completion requires passing; best result persists', async () => {
      await become(userIds[1])
      await assert.rejects(() => action('complete'), /2\/3/)
      await action('quiz', { answers: [0, 0, 0], score: 3 })
      assert.equal((await snapshot()).progress[0].score, 1)
      await action('quiz', { answers: [1, 0, 2] })
      await action('quiz', { answers: [0, 0, 0] })
      let state = await snapshot(); assert.equal(state.progress[0].score, 3)
      state = await action('complete'); assert.ok(state.progress[0].completed_at)
    })
    await t.test('live class permits only its assigned teacher and gates quiz by lesson phase', async () => {
      await become(admin); await action('configure', { capacity: 32, mode: 'live', teacher_id: teacher })
      await become(userIds[1]); await assert.rejects(() => action('quiz', { answers: [1, 0, 2] }), /chưa mở quiz/)
      await become(teacher); await action('teach', { phase: 'teaching', step: 2 })
      await become(userIds[1]); await action('quiz', { answers: [1, 0, 2] })
      await assert.rejects(() => action('complete'), /chưa đến phần tổng kết/)
      await become(teacher); await action('teach', { phase: 'ended', step: 3 })
      await become(userIds[1]); await action('complete')
      await become(userIds[33]); await assert.rejects(() => action('join'), /kết thúc/)
    })
    await t.test('teacher without assignment cannot exploit a null teacher or missing role', async () => {
      await become(admin); await action('configure', { capacity: 32, mode: 'live' })
      await become(teacher); await assert.rejects(() => action('teach', { phase: 'teaching', step: 0 }), /phân công/)
      await db.exec('reset role'); await db.query('delete from public.profiles where id=$1', [userIds[33]])
      await become(userIds[33]); await assert.rejects(() => action('teach', { phase: 'teaching', step: 0 }), /phân công/)
    })
    await t.test('waiting and unregistered learners cannot submit quiz or complete', async () => {
      await become(userIds[33])
      await assert.rejects(() => action('quiz', { answers: [1, 0, 2] }), /chưa có chỗ/)
      await assert.rejects(() => action('complete'), /chưa có chỗ/)
    })
    await t.test('exam content is editable only by admin or assigned teacher; exam choices contain no questions', async () => {
      const examRoom = roomRows.find(r => r.kind === 'exam').id
      const published = '11111111-0000-4000-8000-000000000001'
      const draft = '11111111-0000-4000-8000-000000000002'
      await db.exec('reset role')
      await db.query('insert into public.exams values($1,$2,$3),($4,$5,$6)', [published, 'Sản xuất chế tạo 2026', 'Published', draft, 'Đề nháp', 'Draft'])
      const setup = data => db.query('select public.campus_exam_setup($1,$2::jsonb) as state', [examRoom, JSON.stringify(data)])
      const options = () => db.query('select public.campus_exam_options($1,$2) as exams', [examRoom, ''])
      const payload = { exam_title: 'Thi thử máy tính ngành sản xuất chế tạo 2026', exam_description: 'Đợt thi mẫu', exam_instructions: 'Kiểm tra tai nghe.\nLàm bài đúng giờ.', exam_id: published }
      await become(userIds[1]); await assert.rejects(() => setup(payload), /phân công/); await assert.rejects(options, /phân công/)
      await become(teacher); await assert.rejects(() => setup(payload), /phân công/)
      await become(admin)
      await db.query('select public.campus_action($1,$2,$3::jsonb)', [examRoom, 'configure', JSON.stringify({capacity:30,mode:'self',teacher_id:teacher})])
      await become(teacher)
      const exams = (await options()).rows[0].exams
      assert.deepEqual(exams, [{ id: published, title: 'Sản xuất chế tạo 2026', status: 'Published' }])
      await setup(payload)
      const room = (await snapshot()).rooms.find(r => r.id === examRoom)
      assert.equal(room.exam_title, payload.exam_title); assert.equal(room.exam_id, published)
      assert.equal(room.capacity, 30); assert.equal(room.teacher_id, teacher)
      await assert.rejects(() => setup({ ...payload, exam_id: draft }), /đã xuất bản/)
      await assert.rejects(() => setup({ ...payload, exam_title: '   ' }), /Tiêu đề/)
      await assert.rejects(() => setup({ ...payload, exam_title: 'a'.repeat(161) }), /Tiêu đề/)
      await setup({ ...payload, capacity: 120, teacher_id: userIds[1] })
      const unchanged = (await snapshot()).rooms.find(r => r.id === examRoom)
      assert.equal(unchanged.capacity, 30); assert.equal(unchanged.teacher_id, teacher)
    })
  } finally { await db.close() }
})
