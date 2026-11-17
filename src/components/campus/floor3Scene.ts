import * as THREE from 'three'
import { FLOOR_ROOMS, FLOOR_SCALE, floorPoint, floorDoorPoint } from '@/lib/campus/floor3'
import type { FloorRoom } from '@/lib/campus/floor3'
import { floorFurniture } from './floor3Furniture'

type Obstacle = { x: number; z: number; w: number; d: number }
export function createFloor3(scene: THREE.Scene, obstacles: Obstacle[], textures: THREE.Texture[]) {
  const furniture=floorFurniture(scene,obstacles,textures)
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const geometry = new Map<string, THREE.BoxGeometry>()
  const box = (x: number, z: number, w: number, d: number, height: number, color: string, solid = false, elevation = 0) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .8 }))
    const key = `${w}/${height}/${d}`
    if (!geometry.has(key)) geometry.set(key, new THREE.BoxGeometry(w, height, d))
    const mesh = new THREE.Mesh(geometry.get(key)!, materials.get(color)!)
    mesh.position.set(x, height / 2 + elevation, z); mesh.castShadow = height > .2; mesh.receiveShadow = true; scene.add(mesh)
    if (solid) obstacles.push({ x, z, w: w + .5, d: d + .5 })
    return mesh
  }
  const rect = (r: number[], color: string, height = .04, solid = false, elevation = 0) => {
    const [x1, y1, x2, y2] = r; const [x, z] = floorPoint((x1 + x2) / 2, (y1 + y2) / 2)
    return box(x, z, (x2 - x1) * FLOOR_SCALE, (y2 - y1) * FLOOR_SCALE, height, color, solid, elevation)
  }
  const text = (value: string, px: number, py: number, width: number, color = '#21485d', size = 48) => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160
    const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, 1024, 160)
    ctx.font = `600 ${size}px Arial`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(value, 512, 80, 980)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture)
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 160 / 1024), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }))
    const [x, z] = floorPoint(px, py); mesh.position.set(x, .075, z); mesh.rotation.x = -Math.PI / 2; scene.add(mesh)
  }
  const wallKeys = new Set<string>()
  const wall = (x1: number, y1: number, x2: number, y2: number, glass = false) => {
    if (Math.hypot(x2 - x1, y2 - y1) < 1) return
    const key = [Math.min(x1,x2), Math.min(y1,y2), Math.max(x1,x2), Math.max(y1,y2)].join('/')
    if (wallKeys.has(key)) return
    wallKeys.add(key)
    const [x, z] = floorPoint((x1 + x2) / 2, (y1 + y2) / 2)
    const object = box(x, z, Math.max(.1, Math.abs(x2 - x1) * FLOOR_SCALE), Math.max(.1, Math.abs(y2 - y1) * FLOOR_SCALE), glass ? .85 : 1.15, glass ? '#b9d2d8' : '#e8e7df', true)
    if (glass) {
      object.material = new THREE.MeshStandardMaterial({ color: '#a8c8d5', transparent: true, opacity: .4, roughness: .3, depthWrite: false })
      box(x, z, Math.max(.1, Math.abs(x2 - x1) * FLOOR_SCALE), .06, .15, '#243b96', false, .55)
    }
  }
  rect([2,4,1016,595], '#eeece3', .12, false, -.15)
  rect([283,151,397,595], '#dcece5')
  rect([283,446,541,595], '#dcece5')
  rect([541,110,642,595], '#e1eaf6')
  rect([642,382,1016,595], '#e1eaf6')
  text('HÀNH LANG A', 340, 320, 3.7)
  text('HÀNH LANG C', 592, 205, 3.5)
  text('LỄ TÂN KHU A', 354, 550, 4.2)
  text('LỄ TÂN KHU C', 590, 415, 3.6)
  text('SẢNH CHÍNH TẦNG 3', 804, 525, 9, '#243b72', 62)

  const decorate = (room: FloorRoom) => {
    const [x1,y1,x2,y2] = room.rect
    rect(room.rect, room.kind === 'classroom' ? '#f5f1e6' : room.kind === 'office' ? '#e9e5ee' : '#e4e7e3')
    // All openings are cut out of their boundary wall, not painted on top.
    for (const edge of ['n','s','w','e'] as const) {
      let cursor = edge === 'n' || edge === 's' ? x1 : y1
      const end = edge === 'n' || edge === 's' ? x2 : y2
      const segment = (a: number, b: number) => edge === 'n' || edge === 's' ? wall(a, edge === 'n' ? y1 : y2, b, edge === 'n' ? y1 : y2) : wall(edge === 'w' ? x1 : x2, a, edge === 'w' ? x1 : x2, b)
      for (const door of room.doors.filter(d => d.edge === edge).sort((a,b) => a.from-b.from)) {
        segment(cursor, door.from); cursor = door.to
        const [x,z] = floorDoorPoint(room, door)
        const horizontal = edge === 'n' || edge === 's'
        box(x,z,horizontal ? (door.to-door.from)*FLOOR_SCALE : .16,horizontal ? .16 : (door.to-door.from)*FLOOR_SCALE,.025,'#bf9e54',false,.045)
      }
      segment(cursor,end)
    }
    if (room.platform) {
      rect(room.platform, '#c6aa7c', .17)
      const [a,b,c,d] = room.platform
      text('BỤC GIẢNG', (a+c)/2, d-13, (c-a)*FLOOR_SCALE*.9, '#79542b', 40)
    } else {
      const [x,z] = floorPoint((x1+x2)/2, y1+(y2-y1)*.3)
      box(x,z,Math.min(1.4,(x2-x1)*.04*.45),.7,.65,'#baac99',true)
    }
    text(room.name, room.platform ? (x1+x2)/2 + (x1>600 ? 18 : -18) : (x1+x2)/2, y1+(y2-y1)*.52, Math.min((x2-x1)*.034,8), '#273e64', room.name.length>12 ? 42 : 72)
    if (room.kind === 'classroom') {
      furniture.classroom(room)
    }
  }
  FLOOR_ROOMS.forEach(decorate)
  furniture.finish()
  // Boundary of the two reception zones. Door shown in the revised plan opens into A.
  wall(541,446,541,515,true); wall(541,565,541,595,true)
  wall(642,446,713,446,true); wall(916,446,1016,446,true)
  text('CỬA CHÍNH A', 493, 567, 3.5, '#5d6f84', 38)
  text('CỬA CHÍNH C', 815, 463, 5, '#5d6f84', 45)
  rect([397,469,541,490], '#a99374', .8, true)
  rect([642,404,1016,425], '#a99374', .8, true)
  text('BÀN LỄ TÂN A', 470, 503, 4)
  text('BÀN LỄ TÂN KHU C', 829, 393, 8)
  wall(2,4,1016,4); wall(2,4,2,595); wall(1016,4,1016,595)
  wall(2,595,1016,595)
  const marker = new THREE.Mesh(new THREE.RingGeometry(.28,.48,24), new THREE.MeshBasicMaterial({color:'#cc941e',side:THREE.DoubleSide,toneMapped:false}))
  marker.rotation.x=-Math.PI/2;marker.position.y=.11;marker.visible=false;scene.add(marker)
  return {
    targets: FLOOR_ROOMS.map(room => { const [x,z]=floorDoorPoint(room); return { type:'location' as const,x,z,text:`E · ${room.name}`,name:room.name } }),
    dispose: () => {},
    highlight: (id: string) => { const room=FLOOR_ROOMS.find(item=>item.id===id); marker.visible=!!room;if(room){const [x,z]=floorDoorPoint(room);marker.position.set(x,.11,z)} },
  }
}
