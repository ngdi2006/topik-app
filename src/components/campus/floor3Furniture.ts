import * as THREE from 'three'
import { FLOOR_SCALE, floorPoint } from '@/lib/campus/floor3'
import type { FloorRoom } from '@/lib/campus/floor3'

type Obstacle = { x: number; z: number; w: number; d: number }

/** Batch repeated chair and desk parts into a few GPU draws for the entire floor. */
export function floorFurniture(scene: THREE.Scene, obstacles: Obstacle[], textures: THREE.Texture[]) {
  const batches = new Map<string, THREE.Matrix4[]>()
  const up = new THREE.Vector3(0,1,0)
  const part = (color: string, origin: [number,number], angle: number, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(origin[0]+Math.cos(angle)*x+Math.sin(angle)*z,y,origin[1]-Math.sin(angle)*x+Math.cos(angle)*z),
      new THREE.Quaternion().setFromAxisAngle(up,angle),new THREE.Vector3(w,h,d),
    )
    if(!batches.has(color))batches.set(color,[])
    batches.get(color)!.push(matrix)
  }
  const chair = (origin: [number,number], angle: number, offset = .7) => {
    part('#365f95',origin,angle,0,.46,offset,.46,.09,.46)
    part('#365f95',origin,angle,0,.79,offset+.22,.46,.57,.065)
    for(const x of [-.18,.18])for(const z of [-.17,.17])part('#9caab1',origin,angle,x,.24,offset+z,.035,.44,.035)
    for(const x of [-.18,.18])part('#9caab1',origin,angle,x,.6,offset+.21,.035,.72,.035)
  }
  const desk = (origin: [number,number], angle: number, teacher = false) => {
    const width=teacher?1.25:.98, depth=teacher?.7:.6
    part(teacher?'#b18d60':'#d2b78e',origin,angle,0,.76,0,width,.09,depth)
    for(const x of [-width*.4,width*.4])for(const z of [-depth*.38,depth*.38])part('#89989c',origin,angle,x,.38,z,.045,.7,.045)
    part('#89989c',origin,angle,0,.24,-depth*.37,width*.8,.035,.035)
    part('#f9f5e7',origin,angle,-.16,.815,0,.28,.018,.36)
    part(teacher?'#527c72':'#648aa1',origin,angle,.22,.83,-.06,.22,.04,.3)
    chair(origin,angle)
  }
  const classroom = (room: FloorRoom) => {
    if(!room.platform)return
    const [x1,y1,x2,y2]=room.rect
    const [a,b,c,d]=room.platform
    const east = a>x1
    const angle=east?-Math.PI/2:Math.PI/2
    const top=floorPoint(x1,y1)[1],bottom=floorPoint(x2,y2)[1]
    const height=bottom-top, centerZ=(top+bottom)/2
    const left=floorPoint(x1,y1)[0],right=floorPoint(x2,y2)[0]
    const teachingEdge=floorPoint(east?a:c,y1)[0]
    const start=east?left+1.35:teachingEdge+1.9
    const end=east?teachingEdge-1.7:right-1.15
    const offsets=height>=5.6?[-1.95,-.85,.85,1.95]:[-Math.min(1.45,height*.29),Math.min(1.45,height*.29)]
    let count=0
    for(let x=start;x<=end;x+=1.95)for(const offset of offsets){
      const z=centerZ+offset
      // Shift the first row away from north/south doorway strips where necessary.
      const blockedDoor=room.doors.some(door=>{
        if(door.edge!=='n'&&door.edge!=='s')return false
        const doorX=floorPoint((door.from+door.to)/2,y1)[0]
        const doorZ=door.edge==='n'?top:bottom
        return Math.abs(x-doorX)<.9&&Math.abs(z-doorZ)<1.15
      })
      if(blockedDoor)continue
      desk([x,z],angle);count++
      // Includes chair clearance and the same body radius used for walls.
      obstacles.push({x:x+(east?-.28:.28),z,w:1.7,d:1.42})
    }
    const wallX=floorPoint(east?x2-5:x1+5,y1)[0]
    const [,boardZ]=floorPoint(a,(b+d)/2)
    const boardWidth=Math.min(2.7,(d-b)*FLOOR_SCALE-.45)
    const boardOrigin:[number,number]=[wallX,boardZ]
    part('#9aa6a8',boardOrigin,angle,0,1.5,0,boardWidth+ .12,1.25,.09)
    part('#285852',boardOrigin,angle,0,1.5,.055,boardWidth,1.12,.025)
    part('#c3c9c6',boardOrigin,angle,0,.88,.11,boardWidth,.045,.16)
    for(const x of [-boardWidth*.43,boardWidth*.43])part('#9aa6a8',boardOrigin,angle,x,.75,0,.045,1.5,.045)
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512
    const ctx=canvas.getContext('2d')!
    ctx.fillStyle='#285852';ctx.fillRect(0,0,1024,512)
    ctx.fillStyle='#f7f4de';ctx.textAlign='center';ctx.font='600 100px Arial';ctx.fillText(room.name,512,150)
    ctx.font='64px Arial';ctx.fillText('한국어 · TIẾNG HÀN',512,280)
    ctx.font='52px Arial';ctx.fillText('안녕하세요!',512,395)
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture)
    const board=new THREE.Mesh(new THREE.PlaneGeometry(boardWidth,1.12),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}))
    board.rotation.y=angle;board.position.set(wallX+Math.sin(angle)*.075,1.5,boardZ+Math.cos(angle)*.075)
    board.name=`floor3-board-${room.id}`;scene.add(board)
    const teacherX=floorPoint((a+c)/2,(b+d)/2)[0]
    desk([teacherX,boardZ],angle+Math.PI,true)
    obstacles.push({x:teacherX,z:boardZ,w:1.1,d:1.55})
    return count
  }
  const finish = () => {
    const geometry=new THREE.BoxGeometry(1,1,1)
    for(const [color,matrices]of batches){
      const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color,roughness:color==='#89989c'?.45:.72}),matrices.length)
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix))
      mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true
      mesh.name=`floor3-furniture-${color}`;scene.add(mesh)
    }
  }
  return{classroom,finish}
}
