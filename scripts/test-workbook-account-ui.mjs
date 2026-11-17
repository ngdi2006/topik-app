import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import {build} from '../tmp/workbook-validation/node_modules/esbuild/lib/main.js'
import {chromium} from '../tmp/workbook-validation/node_modules/playwright/index.mjs'
import {compile} from '@tailwindcss/node'
import {Scanner} from '@tailwindcss/oxide'
const root='tmp/workbook-validation'
const workbook=JSON.parse(await readFile('tmp/workbook-choice-rows/eps-topik-2025-workbook-1/planned.json','utf8')).pages.find(page=>page.pageNumber===16).workbook
await writeFile(`${root}/account-ui.jsx`,`import React,{useState}from'react';import{createRoot}from'react-dom/client';import Control from'../../src/components/admin/WorkbookAccessControl';import Editor from'../../src/components/textbooks/WorkbookLayoutEditor';function App(){const[enabled,setEnabled]=useState(false);const[expiry,setExpiry]=useState(null);return <div style={{position:'relative',minHeight:600,padding:'80px 20px 20px'}}>{window.fixture.role==='admin'?<Control showLabel userId='fixture' enabled={enabled} expiresAt={expiry} onChanged={(active,end)=>{setEnabled(active);setExpiry(end)}}/>:null}{['admin','teacher'].includes(window.fixture.role)?<Editor bookId='fixture' pageNumber={16} workbook={window.fixture.workbook} onSaved={()=>{}} canManageAnswerKeys={window.fixture.role==='admin'}/>:null}</div>}createRoot(document.getElementById('root')).render(<App/>);`)
const bundle=await build({entryPoints:[`${root}/account-ui.jsx`],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'}})
const compiler=await compile(await readFile('src/app/globals.css','utf8'),{base:path.resolve('src/app'),onDependency(){}})
const css=compiler.build(new Scanner({sources:[{base:path.resolve('src'),pattern:'**/*.{tsx,ts}',negated:false}]}).scan())
const server=http.createServer((req,res)=>{if(req.url==='/bundle'){res.end(bundle.outputFiles[0].contents);return}if(req.url==='/css'){res.setHeader('content-type','text/css');res.end(css);return}const role=new URL(req.url,'http://fixture').searchParams.get('role');res.setHeader('content-type','text/html; charset=utf-8');res.end(`<html><head><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/css></head><body><div id=root></div><script>window.fixture=${JSON.stringify({role,workbook})}</script><script src=/bundle></script></body></html>`)})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`
let browser
try{
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({viewport:{width:1200,height:800}})
 let enabled=false,expiresAt=null;const requests=[]
 await page.route('**/api/admin/users/fixture/workbook-access',async route=>{const body=route.request().postDataJSON();requests.push(body);enabled=body.action!=='revoke';if(enabled)expiresAt=body.action==='set_expiry'?new Date(body.expires_at).toISOString():new Date(Date.now()+body.days*86400000).toISOString();await route.fulfill({json:{ok:true,workbookAccess:enabled,workbookAccessExpiresAt:expiresAt}})})
 await page.goto(base+'/?role=admin')
 const manage=page.getByRole('button',{name:'Quản lý thời hạn sách bài tập',exact:true})
 await manage.click();assert.equal(requests.length,0,'Opening the dialog must not grant access')
 await page.getByRole('spinbutton',{name:'Số ngày sử dụng',exact:true}).fill('0')
 assert.equal(await page.getByRole('button',{name:'Kích hoạt 0 ngày',exact:true}).isDisabled(),true)
 await page.getByRole('button',{name:'30 ngày',exact:true}).click()
 await page.getByRole('button',{name:'Kích hoạt 30 ngày',exact:true}).click()
 await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(enabled,true);assert.equal(requests.at(-1).days,30)
 await manage.click();await page.getByRole('button',{name:'7 ngày',exact:true}).click()
 await page.getByRole('button',{name:'Cộng thêm 7 ngày',exact:true}).click()
 await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(requests.at(-1).days,7)
 await manage.click();await page.getByRole('button',{name:'Đặt hạn',exact:true}).click()
 const day=new Date(Date.now()+60*86400000).toISOString().slice(0,10)
 await page.getByLabel('Ngày hết hạn',{exact:true}).fill(day)
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:'reports/workbook-access-expiry-390.png'})
 await page.getByRole('button',{name:'Lưu ngày hết hạn',exact:true}).click()
 await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(requests.at(-1).expires_at,day+'T23:59:59+07:00')
 await manage.click();await page.getByRole('button',{name:'Hủy quyền',exact:true}).click()
 await page.getByRole('button',{name:'Hủy quyền ngay',exact:true}).click()
 await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(enabled,false)
 await page.setViewportSize({width:1200,height:800})
 assert.equal(await page.getByRole('button',{name:'Đáp án chuẩn',exact:true}).count(),1)
 await page.goto(base+'/?role=teacher');await page.getByRole('button',{name:'Chỉnh vùng làm bài',exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:'Đáp án chuẩn',exact:true}).count(),0)
 assert.equal(await page.getByRole('button',{name:'Quản lý thời hạn sách bài tập',exact:true}).count(),0)
 await page.goto(base+'/?role=learner');assert.equal(await page.getByRole('button').count(),0)
 console.log('PASS account UI: admin activation toggles, admin-only answer editor, teacher layout and learner restrictions')
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
