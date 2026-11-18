import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { build } from '../tmp/workbook-validation/node_modules/esbuild/lib/main.js'
import { chromium } from '../tmp/workbook-validation/node_modules/playwright/index.mjs'
import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
await mkdir('output/playwright/reference-access',{recursive:true})
await writeFile('tmp/workbook-validation/reference-access.jsx',`import React from 'react';import{createRoot}from'react-dom/client';import Control from '../../src/components/admin/ReferenceAccessControl';createRoot(document.getElementById('root')).render(<Control showLabel userId="00000000-0000-4000-a000-000000000003" onChanged={updates=>window.updates=updates}/>);`)
const bundle=await build({entryPoints:['tmp/workbook-validation/reference-access.jsx'],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'}})
const compiler=await compile(await readFile('src/app/globals.css','utf8'),{base:path.resolve('src/app'),onDependency(){}})
const css=compiler.build(new Scanner({sources:[{base:path.resolve('src'),pattern:'**/*.{tsx,ts}',negated:false}]}).scan())
const requests=[]
const server=http.createServer(async(req,res)=>{
 if(req.url==='/bundle'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles[0].contents);return}
 if(req.url==='/css'){res.setHeader('content-type','text/css');res.end(css);return}
 if(req.method==='PATCH'){let body='';for await(const chunk of req)body+=chunk;requests.push(JSON.parse(body));res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true,userId:'fixture',referenceBooks:{}}));return}
 res.setHeader('content-type','text/html; charset=utf-8');res.end('<html><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/css><div id=root></div><script src=/bundle></script></html>')
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
let browser
try{
 browser=await chromium.launch({headless:true,channel:'msedge'})
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}})
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.getByRole('button',{name:'Quản lý quyền tài liệu',exact:true}).click()
  const dialog=page.getByRole('dialog')
  assert.equal(await dialog.getByRole('checkbox').count(),5)
  await dialog.getByRole('checkbox').nth(1).check()
  await dialog.getByRole('button',{name:'Đặt hạn',exact:true}).click()
  await dialog.locator('input[type=date]').fill('2099-02-01')
  await page.screenshot({path:`output/playwright/reference-access/dialog-${width}.png`})
  const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width)
  await dialog.getByRole('button',{name:'Lưu quyền tài liệu',exact:true}).click()
  await dialog.waitFor({state:'hidden'})
  const sent=requests.at(-1);assert.equal(sent.books.length,2);assert.equal(sent.expires_at,'2099-02-01T23:59:59+07:00');assert.equal(sent.volumes,undefined)
  await page.close()
 }
 console.log('PASS five separate document choices, independent request payload, fixed expiry and responsive dialog 320/390/1440px')
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
