import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { build } from '../tmp/workbook-validation/node_modules/esbuild/lib/main.js'
import { chromium } from '../tmp/workbook-validation/node_modules/playwright/index.mjs'
import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'

await writeFile('tmp/workbook-validation/access-entry.jsx', `import React from 'react';import{createRoot}from'react-dom/client';import Users from '../../src/app/admin/users/page';import{useUserStore}from'../../src/store/userStore';useUserStore.setState({role:new URLSearchParams(location.search).get('role')||'admin'});createRoot(document.getElementById('root')).render(<Users/>);`)
const bundle = await build({ entryPoints: ['tmp/workbook-validation/access-entry.jsx'], bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' } })
const compiler = await compile(await readFile('src/app/globals.css', 'utf8'), { base: path.resolve('src/app'), onDependency() {} })
const css = compiler.build(new Scanner({ sources: [{ base: path.resolve('src'), pattern: '**/*.{tsx,ts}', negated: false }] }).scan())
const makeUsers = (count = 2) => Array.from({ length: count }, (_, index) => ({ id: `00000000-0000-4000-a000-${String(index + 1).padStart(12, '0')}`, name: `Learner ${index + 1}`, email: `learner${index + 1}@test.invalid`, role: 'learner', adminPermissions: [], groupName: 'Class A', remainingCredits: 0, status: 'Active', joinedAt: '2026-11-17', createdAt: '2026-11-17T00:00:00Z', lastSignInAt: null, emailConfirmedAt: null, authProvider: 'email', adminActivity: [], lastAdminActivity: null, interviewAccess: null, workbookAccess: false, workbookAccessExpiresAt: null, workbookVolumes: { 1: { active: false, expiresAt: null }, 2: { active: false, expiresAt: null } } }))
let users = makeUsers(), requests = [], failOnce = true
const server = http.createServer(async (req, res) => {
  const json = data => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(data)) }
  if (req.url === '/bundle') return res.end(bundle.outputFiles[0].contents)
  if (req.url === '/css') { res.setHeader('content-type', 'text/css'); return res.end(css) }
  if (req.url === '/api/admin/users') return json({ users })
  if (req.method === 'POST' || req.method === 'PATCH') {
    let raw = ''; for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw); requests.push({ url: req.url, body })
    const ids = body.userIds ?? [req.url.split('/')[4]]
    const results = ids.map(id => {
      if (failOnce && id === users[1].id) { failOnce = false; return { userId: id, ok: false, error: 'Temporary failure', status: 500 } }
      const user = users.find(user => user.id === id)
      for (const volume of body.volumes) user.workbookVolumes[volume] = { active: body.action !== 'revoke', expiresAt: body.action === 'set_expiry' ? body.expires_at : '2099-01-01T00:00:00Z' }
      user.workbookAccess = Object.values(user.workbookVolumes).some(value => value.active)
      return { ok: true, userId: id, workbookAccess: user.workbookAccess, workbookAccessExpiresAt: '2099-01-01T00:00:00Z', workbookVolumes: user.workbookVolumes }
    })
    return json(body.userIds ? { results } : results[0])
  }
  res.setHeader('content-type', 'text/html'); res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/css"></head><body><div id="root"></div><script src="/bundle"></script></body></html>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage()
  for (const width of [320, 390, 1440]) {
    users = makeUsers(); requests = []; failOnce = true
    await page.setViewportSize({ width, height: 900 }); await page.goto(base)
    await page.getByRole('checkbox', { name: 'Chọn Learner 1', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Chọn Learner 2', exact: true }).check()
    await page.getByRole('button', { name: 'Cấp quyền sách bài tập hàng loạt', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor(); assert.equal(await dialog.getByRole('checkbox', { name: 'Quyển 1', exact: true }).isChecked(), true)
    await dialog.getByRole('checkbox', { name: 'Quyển 1', exact: true }).uncheck()
    const submit = dialog.getByRole('button', { name: /^Cấp / })
    assert.equal(await submit.isDisabled(), true)
    await dialog.getByRole('checkbox', { name: 'Quyển 2', exact: true }).check()
    await dialog.getByRole('button', { name: '7 ngày', exact: true }).click()
    await submit.click(); await dialog.getByRole('alert').waitFor()
    assert.deepEqual(requests[0].body.volumes, [2]); assert.equal(requests[0].body.userIds.length, 2)
    assert.equal(await page.getByRole('checkbox', { name: 'Chọn Learner 1', exact: true, includeHidden: true }).isChecked(), false)
    assert.equal(await page.getByRole('checkbox', { name: 'Chọn Learner 2', exact: true, includeHidden: true }).isChecked(), true)
    assert.equal(users[0].workbookVolumes[1].active, false)
    await page.screenshot({ path: `reports/workbook-volume-bulk-${width}.png`, fullPage: true })
    const bounds = await dialog.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width)
    await submit.click(); await dialog.waitFor({ state: 'hidden' })
    assert.deepEqual(requests[1].body.userIds, [users[1].id], 'Retry excludes already extended accounts')
    const row = page.getByRole('row').filter({ has: page.getByRole('checkbox', { name: 'Chọn Learner 1', exact: true }) })
    await row.getByRole('button', { name: 'Quản lý quyền từng quyển sách bài tập', exact: true }).click()
    await dialog.getByRole('button', { name: 'Đặt hạn', exact: true }).click()
    await dialog.locator('input[type=date]').fill('2099-02-01')
    await page.screenshot({ path: `reports/workbook-volume-single-${width}.png`, fullPage: true })
    await dialog.getByRole('button', { name: /^Lưu thời hạn/ }).click(); await dialog.waitFor({ state: 'hidden' })
    assert.deepEqual(requests[2].body.volumes, [1]); assert.equal(requests[2].body.expires_at, '2099-02-01T23:59:59+07:00')
    assert.equal(users[0].workbookVolumes[2].active, true)
  }
  users = makeUsers(205); failOnce = false; requests = []
  await page.goto(base); await page.getByRole('checkbox', { name: 'Chọn tất cả người dùng đang lọc', exact: true }).check()
  await page.getByRole('button', { name: 'Cấp quyền sách bài tập hàng loạt', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^Cấp / }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.deepEqual(requests.map(request => request.body.userIds.length), [100, 100, 5])
  await page.goto(base + '?role=teacher'); await page.getByRole('checkbox', { name: 'Chọn tất cả người dùng đang lọc', exact: true }).check()
  assert.equal(await page.getByRole('button', { name: 'Cấp quyền sách bài tập hàng loạt', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Quản lý quyền từng quyển sách bài tập', exact: true }).count(), 0)
  console.log('PASS: per-volume controls at 320/390/1440, bulk selection, partial failure/retry, 205 accounts in batches, teacher UI restricted')
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
