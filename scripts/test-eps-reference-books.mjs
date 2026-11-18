// Browser verification using the real library/reader and the prepared source scans.
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { build } from '../tmp/workbook-validation/node_modules/esbuild/lib/main.js'
import { chromium } from '../tmp/workbook-validation/node_modules/playwright/index.mjs'
import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import { referenceUnits } from './eps-reference-toc-data.mjs'

const root = 'tmp/workbook-validation'
const output = 'output/playwright/eps-reference-books'
await mkdir(output, { recursive: true })
const scans = JSON.parse(await readFile('tmp/eps-reference-books/manifest.json', 'utf8'))
const [before] = JSON.parse(await readFile('tmp/eps-reference-books/database-before.json', 'utf8'))
const core = before.filter(book => /^eps-topik-2025-(?:workbook-)?[12]$/.test(book.code)).map(book => ({ ...book, units: book.textbook_units, total_pages: book.code.includes('workbook') ? (book.volume === 1 ? 273 : 270) : (book.volume === 1 ? 388 : 356), edition: '2025', coverUrl: null, progress: null, canAccess: true }))
const references = scans.map(scan => ({ ...scan, id: scan.code, edition: '2025', coverUrl: '/reference-cover', progress: null, canAccess: true, units: referenceUnits(scan).map((u, i) => ({ ...u, id: `${scan.code}-unit-${i}` })) }))
const books = [...core, ...references]
assert.equal(references.flatMap(b => b.units).length, 141)
assert.equal(scans.reduce((sum, b) => sum + b.total_pages, 0), 193)
await writeFile(`${root}/reference-entry.jsx`, `import React from 'react';import{createRoot}from'react-dom/client';import Library from '../../src/components/textbooks/TextbookLibrary';import Reader from '../../src/components/textbooks/TextbookReader';const p=new URLSearchParams(location.search);createRoot(document.getElementById('root')).render(location.pathname.startsWith('/reader')||location.pathname.endsWith('/read')?<Reader bookId={p.get('book')||location.pathname.split('/')[2]} initialPage={Number(p.get('page')||1)} initialUnitId={p.get('unit')||undefined}/>:<Library books={window.books} loading={false} error={null} onRetry={()=>{}}/>);`)
const bundle = await build({ entryPoints: [`${root}/reference-entry.jsx`], bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'next-fixture', setup(builder) {
  builder.onResolve({ filter: /^next\/(image|link)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
  builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.endsWith('image') ? `import React from'react';export default function Image({fill,sizes,priority,unoptimized,...props}){return <img {...props} style={fill?{position:'absolute',height:'100%',width:'100%'}:undefined}/>} ` : `import React from'react';export default function Link(props){return <a {...props}/>} `, loader: 'jsx', resolveDir: process.cwd() }))
} }] })
const compiler = await compile(await readFile('src/app/globals.css', 'utf8'), { base: path.resolve('src/app'), onDependency() {} })
const css = compiler.build(new Scanner({ sources: [{ base: path.resolve('src'), pattern: '**/*.{tsx,ts}', negated: false }] }).scan())
const requests = [], errors = []
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://fixture')
    requests.push(url.pathname)
    const json = value => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)) }
    if (url.pathname === '/bundle.js') { res.setHeader('content-type', 'text/javascript'); res.end(bundle.outputFiles[0].contents); return }
    if (url.pathname === '/style.css') { res.setHeader('content-type', 'text/css'); res.end(css); return }
    if (url.pathname === '/api/textbooks') { json({ books }); return }
    if (url.pathname.endsWith('/progress')) { json({ ok: true }); return }
    if (url.pathname.endsWith('/summary')) { json({ grammar: [], audio: [], listening: null }); return }
    const unitMatch = /^\/api\/textbooks\/([^/]+)\/units\/([^/]+)$/.exec(url.pathname)
    if (unitMatch) {
      const book = references.find(b => b.id === unitMatch[1])
      const unit = book?.units.find(u => u.id === unitMatch[2])
      assert.ok(unit)
      json({ pages: book.pages.filter(p => p.page_number >= unit.start_page && p.page_number <= unit.end_page).map(p => ({ ...p, imageUrl: `/scan/${book.id}/${p.page_number}`, ocr_text: null, ocr_payload: {} })) }); return
    }
    const imageMatch = /^\/scan\/([^/]+)\/(\d+)$/.exec(url.pathname)
    if (imageMatch) { res.setHeader('content-type', 'image/webp'); res.end(await readFile(scans.find(b => b.code === imageMatch[1]).pages[Number(imageMatch[2]) - 1].file)); return }
    if (url.pathname === '/reference-cover') { res.setHeader('content-type', 'image/webp'); res.end(await readFile(scans[0].cover)); return }
    if (url.pathname.startsWith('/textbooks/covers/')) { res.setHeader('content-type', 'image/png'); res.end(await readFile(`public${url.pathname}`)); return }
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.end(`<!doctype html><html lang=vi><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/style.css><style>body{margin:0;background:#f8fafc}</style><div id=root></div><script>window.books=${JSON.stringify(books)}</script><script src=/bundle.js></script></html>`)
  } catch (error) { errors.push(error.message); res.writeHead(500); res.end(error.message) }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.goto(base)
    await page.locator('[data-library-book]').first().waitFor()
    assert.equal(await page.locator('[data-library-book]').count(), 9)
    for (const [filter, count] of [['Giáo trình', 2], ['Sách bài tập', 2], ['Từ vựng', 2], ['Ngữ pháp', 1], ['Văn hóa', 2], ['Tất cả', 9]]) {
      await page.getByRole('button', { name: filter, exact: true }).click()
      assert.equal(await page.locator('[data-library-book]').count(), count)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    }
    await page.waitForFunction(() => [...document.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0))
    await page.screenshot({ path: `${output}/library-${width}.png`, fullPage: true })
    await page.close()
    console.log(`PASS library ${width}px: nine books, six filters, no overflow`)
  }
  requests.length = 0
  for (const book of references) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/reader?book=${book.id}`)
    await page.locator('[data-page] img').first().waitFor()
    await page.waitForFunction(() => { const image = document.querySelector('[data-page] img'); return image?.complete && image.naturalWidth > 0 })
    assert.equal(await page.getByRole('button', { name: 'Nội dung liên kết', exact: true }).count(), 0)
    assert.equal(await page.locator('[data-workbook-mode]').count(), 0)
    assert.equal(await page.locator('aside').count(), 1)
    assert.equal(await page.locator('aside nav a').count(), book.units.length)
    if (book.kind === 'grammar') assert.match(await page.locator('aside nav a').first().innerText(), /Chủ đề 1/)
    await page.screenshot({ path: `${output}/reader-${book.kind}-${book.volume}.png`, fullPage: true })
    await page.locator('aside nav a').last().click()
    await page.waitForFunction(number => [...document.querySelectorAll('[data-page]')].some(e => Number(e.dataset.page) === number), book.units.at(-1).start_page)
    await page.getByRole('button', { name: 'Phóng to', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Vừa chiều rộng trang', exact: true }).innerText(), '125%')
    await page.close()
    console.log(`PASS ${book.code}: ${book.units.length} indexed lessons/topics, first and last lesson, zoom`)
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(`${base}/reader?book=${references[3].id}`)
  await page.locator('[data-page] img').first().waitFor()
  await page.getByRole('button', { name: 'Mở mục lục', exact: true }).click()
  await page.locator('aside nav a').nth(1).click()
  assert.equal(await page.locator('section header strong').innerText(), 'Bài 2')
  await page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().right <= 1)
  assert.match(page.url(), /[?&]unit=/)
  await page.reload()
  await page.locator('[data-page] img').first().waitFor()
  assert.equal(await page.locator('section header strong').innerText(), 'Bài 2')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: `${output}/reader-culture-mobile.png`, fullPage: true })
  assert.equal(requests.some(url => /summary|regions|workbook/.test(url)), false)
  assert.deepEqual(errors, [])
  console.log('PASS mobile table of contents, shared-page lessons; reference reader makes no summary/OCR/workbook requests')
} finally {
  await browser?.close()
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
}
