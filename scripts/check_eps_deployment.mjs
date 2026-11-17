// Reads deployment status using the configured Git credential helper; credentials stay in memory.
import { spawnSync } from 'node:child_process'
const credential=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\npath=ngdi2006/topik-app.git\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0'}})
if(credential.status!==0)throw new Error('GitHub credential helper is unavailable')
const fields=Object.fromEntries(credential.stdout.trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}))
if(!fields.password)throw new Error('No GitHub credential found')
const base='https://api.github.com/repos/ngdi2006/topik-app'
const get=async endpoint=>{const response=await fetch(base+endpoint,{headers:{Authorization:`Bearer ${fields.password}`,Accept:'application/vnd.github+json','User-Agent':'eps-deployment-check'}});if(!response.ok)throw new Error(`GitHub API ${response.status}`);return response.json()}
const sha=process.argv[2]||'main'
const [repo,status]=await Promise.all([get(''),get(`/commits/${sha}/status`)])
const deployments=await get(`/deployments?sha=${status.sha}&per_page=5`)
const results=[]
for(const deployment of deployments){const states=await get(`/deployments/${deployment.id}/statuses`);results.push({sha:deployment.sha,environment:deployment.environment,state:states[0]?.state,url:states[0]?.environment_url,log:states[0]?.log_url})}
console.log(JSON.stringify({defaultBranch:repo.default_branch,commit:status.sha,state:status.state,statuses:status.statuses.map(item=>({context:item.context,state:item.state,url:item.target_url})),deployments:results},null,2))
