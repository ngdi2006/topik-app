import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'

function load(file, dependencies = {}, extra = {}) {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  vm.runInNewContext(source,{exports,require:name=>{assert.ok(name in dependencies, name);return dependencies[name]},...extra})
  return exports
}
const model=load('src/lib/campus/floor3.ts')
const browser={document:{createElement:()=>({width:0,height:0,getContext:()=>({clearRect(){},fillRect(){},fillText(){}})})}}
const furniture=load('src/components/campus/floor3Furniture.ts',{'three':THREE,'@/lib/campus/floor3':model},browser)
const {createFloor3}=load('src/components/campus/floor3Scene.ts',{'three':THREE,'@/lib/campus/floor3':model,'./floor3Furniture':furniture},browser)

test('floor 3 preserves all named rooms and every room remains reachable through actual door gaps',()=>{
  const scene=new THREE.Scene(), obstacles=[], textures=[]
  const floor=createFloor3(scene,obstacles,textures)
  assert.equal(model.FLOOR_ROOMS.length,12)
  assert.deepEqual(Array.from(model.FLOOR_ROOMS.filter(r=>r.kind==='classroom').map(r=>r.id)).sort(),['101','103','104','107','108','109'])
  assert.equal(floor.targets.length,12)
  assert.equal(scene.children.filter(o=>o.name.startsWith('floor3-board-')).length,6,'each classroom has a board')
  assert.ok(scene.children.some(o=>o instanceof THREE.InstancedMesh),'repeated furniture is batched')
  const bounds=model.FLOOR_BOUNDS, step=.12
  const nx=Math.ceil((bounds.right-bounds.left)/step),nz=Math.ceil((bounds.bottom-bounds.top)/step)
  const at=(ix,iz)=>[bounds.left+ix*step,bounds.top+iz*step]
  const blocked=(x,z)=>x<=bounds.left||x>=bounds.right||z<=bounds.top||z>=bounds.bottom||obstacles.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2)
  const start=[Math.round((model.FLOOR_SPAWN[0]-bounds.left)/step),Math.round((model.FLOOR_SPAWN[1]-bounds.top)/step)]
  assert.equal(blocked(...at(...start)),false,'spawn must be in the main lobby')
  const visited=new Set([start[1]*nx+start[0]]),queue=[start]
  for(let i=0;i<queue.length;i++){
    const [ix,iz]=queue[i]
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const ax=ix+dx,az=iz+dz,key=az*nx+ax
      if(ax<0||az<0||ax>=nx||az>=nz||visited.has(key)||blocked(...at(ax,az)))continue
      visited.add(key);queue.push([ax,az])
    }
  }
  for(const room of model.FLOOR_ROOMS){
    const [x1,y1,x2,y2]=room.rect
    const [left,top]=model.floorPoint(x1+12,y1+12),[right,bottom]=model.floorPoint(x2-12,y2-12)
    assert.ok(queue.some(([ix,iz])=>{const [x,z]=at(ix,iz);return x>left&&x<right&&z>top&&z<bottom}),`${room.name} must have a path from the main lobby`)
  }
  floor.highlight('104');floor.highlight('');floor.dispose()
  scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()})
  textures.forEach(t=>t.dispose())
})
