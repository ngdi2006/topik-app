import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { build } from '../tmp/workbook-validation/node_modules/esbuild/lib/main.js'
import { chromium } from '../tmp/workbook-validation/node_modules/playwright/index.mjs'
import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'

await writeFile('tmp/workbook-validation/home-entry.jsx', `import React from'react';import{createRoot}from'react-dom/client';import Home from'../../src/components/home/EpsHome';import Settings from'../../src/components/admin/HomepageSettings';const params=new URLSearchParams(location.search),signed=params.has('signed'),avatar=params.get('avatar');createRoot(document.getElementById('root')).render(location.pathname==='/settings'?<Settings/>:<Home account={signed?{name:'Learner',avatarUrl:avatar==='broken'?'/images/fixture-avatar.png':avatar?'/images/logo/logo.k.png':null}:null}/>);`)
const bundle = await build({ entryPoints: ['tmp/workbook-validation/home-entry.jsx'], bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'next-elements', setup(builder) {
  builder.onResolve({ filter: /^next\/(image|link)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
  builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.endsWith('image') ? "import React from'react';export default function Image({priority,fill,sizes,...props}){return <img {...props} style={fill?{position:'absolute',height:'100%',width:'100%',inset:0,...props.style}:props.style}/>;}" : "import React from'react';export default function Link(props){return <a {...props}/>;}", loader: 'jsx', resolveDir: process.cwd() }))
} }] })
const compiler = await compile(await readFile('src/app/globals.css', 'utf8'), { base: path.resolve('src/app'), onDependency() {} })
const css = compiler.build(new Scanner({ sources: [{ base: path.resolve('src'), pattern: '**/*.{tsx,ts}', negated: false }] }).scan())
let variant = 'eps', allowed = true, writes = 0
const server = http.createServer(async (req, res) => {
  const json = data => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(data)) }
  if (req.url === '/bundle') return res.end(bundle.outputFiles[0].contents)
  if (req.url === '/css') { res.setHeader('content-type', 'text/css'); return res.end(css) }
  if (req.url === '/api/admin/settings/homepage') {
    if (!allowed) { res.statusCode = 403; return json({ error: 'Forbidden' }) }
    if (req.method === 'PATCH') { let body = ''; for await (const part of req) body += part; variant = JSON.parse(body).variant; writes++ }
    return json({ variant })
  }
  if (req.url.startsWith('/textbooks/') || req.url.startsWith('/images/') || req.url.startsWith('/dashboard/')) {
    const file = path.join('public', req.url.split('?')[0]); res.setHeader('content-type', file.endsWith('.mp3') ? 'audio/mpeg' : file.endsWith('.webp') ? 'image/webp' : 'image/png'); return res.end(await readFile(file))
  }
  res.setHeader('content-type', 'text/html'); res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/css"></head><body><div id="root"></div><script src="/bundle"></script></body></html>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage()
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.goto(base)
    await page.locator('[data-homepage=eps]').waitFor()
    assert.equal(await page.locator('header [data-home-login]').textContent(), 'Đăng nhập')
    assert.equal(await page.locator('header [data-home-login]').getAttribute('href'), '/login')
    assert.equal(await page.locator('header [data-home-avatar]').count(), 0)
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1)
    assert.equal(await page.getByText('Bứt phá Vòng 2', { exact: true }).count(), 0)
    assert.ok(await page.getByRole('link', { name: 'Khám phá giáo trình', exact: true }).getAttribute('href').then(value => value.includes('/login?next=')))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No horizontal overflow at ${width}`)
    const cards = await page.locator('[data-home-path]').evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height } }))
    assert.equal(cards.length, 3)
    assert.ok(cards.every(card => card.x >= 0 && card.x + card.width <= width), 'Learning cards stay within the viewport')
    if (width >= 768) assert.ok(cards.every(card => Math.abs(card.y - cards[0].y) < 1 && Math.abs(card.height - cards[0].height) < 1), 'Learning cards have aligned rows and actions')
    assert.equal(await page.locator('[data-home-journey] ol li').count(), 3)
    assert.equal(await page.locator('[data-home-footer] a[href="tel:0965577882"]').count(), 1)
    assert.equal(await page.locator('[data-home-footer] a[href="#noi-dung"]').count(), 1)
    const invitation = page.locator('[data-home-invitation]')
    assert.equal(await invitation.locator('a[href="#cach-hoc"]').count(), 1)
    assert.ok(await invitation.locator('a').count() >= 4)
    const lesson = page.locator('[data-home-lesson]')
    await lesson.getByRole('button', { name: '02 Cảm ơn', exact: true }).click()
    await lesson.getByText('Chưa đúng rồi. Bạn hãy thử lại nhé.', { exact: true }).waitFor()
    await lesson.getByRole('button', { name: '01 Xin chào', exact: true }).click()
    await lesson.getByText('Đúng rồi! 안녕하세요 có nghĩa là “Xin chào”.', { exact: true }).waitFor()
    await page.evaluate(async () => { await Promise.all(Array.from(document.images).map(image => image.decode())); window.scrollTo(0, 0) })
    assert.equal(await page.locator('img').evaluateAll(nodes => nodes.every(image => image.complete && image.naturalWidth > 0)), true, 'All landing illustrations load')
    if (width <= 390) {
      const title = await page.locator('[data-home-hero-title]').evaluate(node => ({ height: node.getBoundingClientRect().height, line: parseFloat(getComputedStyle(node).lineHeight) }))
      assert.ok(title.height <= title.line * 2.1, 'Mobile headline stays within two lines')
      const buttons = await page.locator('[data-home-hero-actions] a').evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, height: rect.height } }))
      assert.ok(buttons.every(button => button.height >= 44 && button.bottom < 390))
      assert.ok(Math.abs(buttons[0].top - buttons[1].top) < 1, 'Both mobile actions stay on one row')
      const illustration = await page.locator('img[src="/dashboard/exam-learner-v2.webp"]').boundingBox()
      assert.ok(illustration.y + illustration.height < 640, 'Hero illustration fits on the first mobile screen')
      await page.screenshot({ path: `reports/homepage-first-screen-${width}.png` })
    }
    await page.screenshot({ path: `reports/homepage-eps-${width}.png`, fullPage: true })
    await lesson.getByRole('button', { name: 'Nghe hiểu', exact: true }).click()
    assert.equal(await lesson.locator('[aria-pressed=true]').count(), 1, 'Switching mode clears the selected answer')
    await lesson.getByRole('button', { name: 'Phát bài nghe mẫu', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('audio').currentTime > 0)
    await lesson.getByRole('button', { name: '02 Học sinh', exact: true }).click()
    await lesson.getByText('Đúng rồi! 학생 có nghĩa là học sinh.', { exact: true }).waitFor()
    await page.goto(base + '?signed=1')
    await page.locator('header [data-home-avatar]').waitFor()
    assert.equal(await page.locator('header [data-home-login]').count(), 0)
    assert.equal(await page.locator('header [data-home-avatar]').textContent(), 'L')
    assert.equal(await page.locator('header [data-home-avatar]').getAttribute('href'), '/dashboard')
    assert.equal(await page.getByRole('link', { name: 'Khám phá giáo trình', exact: true }).getAttribute('href'), '/textbooks')
    assert.equal(await page.getByRole('link', { name: 'Thi thử ngay', exact: true }).getAttribute('href'), '/dashboard?section=thi-thu-de-thi')
    await page.goto(base + '/settings')
    const old = page.getByRole('radio', { name: /Luyện tập Vòng 2/ })
    await old.check()
    assert.equal(await page.getByRole('link', { name: 'Xem trước giao diện', exact: true }).getAttribute('href'), '/?homepage-preview=round-two')
    assert.equal(writes, (width === 320 ? 0 : [320, 390, 768, 1440].indexOf(width) * 2), 'Preview does not save')
    await page.getByRole('button', { name: 'Áp dụng cho trang chủ', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('button')?.disabled === true && document.querySelector('button')?.textContent === 'Áp dụng cho trang chủ')
    assert.equal(variant, 'round-two')
    await page.reload(); await old.waitFor(); assert.equal(await old.isChecked(), true)
    await page.getByRole('radio', { name: /Học tiếng Hàn · EPS-TOPIK/ }).check()
    await page.screenshot({ path: `reports/homepage-settings-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Áp dụng cho trang chủ', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('button')?.disabled === true && document.querySelector('button')?.textContent === 'Áp dụng cho trang chủ')
    assert.equal(variant, 'eps')
  }
  await page.goto(base + '?signed=1&avatar=1')
  const photo = page.locator('header [data-home-avatar] img')
  await photo.waitFor(); await photo.evaluate(image => image.decode())
  assert.equal(await photo.getAttribute('src'), '/images/logo/logo.k.png')
  await page.route('**/images/fixture-avatar.png', route => route.abort())
  await page.goto(base + '?signed=1&avatar=broken')
  await page.waitForFunction(() => document.querySelector('[data-home-avatar]') && !document.querySelector('[data-home-avatar] img'))
  assert.equal(await page.locator('header [data-home-avatar]').textContent(), 'L', 'Failed avatar falls back to initials')
  allowed = false; await page.goto(base + '/settings')
  await page.getByRole('heading', { name: 'Giao diện trang chủ', exact: true }).waitFor({ state: 'hidden' })
  assert.equal(await page.getByRole('heading', { name: 'Giao diện trang chủ', exact: true }).count(), 0)
  console.log('PASS: new EPS home at 320/390/768/1440; guest/member links; live reading/listening sample; reversible settings and admin visibility')
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
