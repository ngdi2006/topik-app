'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { seatPosition } from '@/lib/campus/model'
import type { CampusRoom, CampusView } from '@/lib/campus/model'
import styles from './campus.module.css'
import { createFloor3 } from './floor3Scene'
import { FLOOR_BOUNDS, FLOOR_ROOMS, FLOOR_SPAWN, floorPoint } from '@/lib/campus/floor3'

type Props = {
  room: CampusRoom | null; ownSeat: number | null; seats: number[]; seated: boolean; view: CampusView
  onInteract: (target: 'classroom' | 'exam' | 'board' | 'seat' | 'exit' | 'location', location?: string) => void
}

export default function CampusScene({ room, ownSeat, seats, seated, view, onInteract }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const input = useRef(new Set<string>())
  const interact = useRef(onInteract)
  const trigger = useRef<() => void>(() => {})
  const occupants = useRef(new Map<number, THREE.Group>())
  const cameraView = useRef(view)
  const writeBoard = useRef<(title: string) => void>(() => {})
  const [hint, setHint] = useState('Đi đến biển phòng để tương tác')
  const [error, setError] = useState(false)
  const [destination, setDestination] = useState('')
  const destinationRef = useRef(destination)
  const highlightFloor = useRef<(id:string)=>void>(()=>{})
  useEffect(() => { interact.current = onInteract }, [onInteract])
  useEffect(() => { cameraView.current = view; input.current.clear() }, [view])
  useEffect(() => { destinationRef.current=destination; highlightFloor.current(destination) }, [destination])
  const seatKey = seats.join(',')

  useEffect(() => {
    const element = host.current
    if (!element) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }) }
    catch { setError(true); return }
    setError(false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    element.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', 'Bản đồ trung tâm 3D. Dùng WASD hoặc phím mũi tên để đi, E để tương tác.')
    renderer.domElement.tabIndex = 0
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#dbe9e6')
    scene.fog = new THREE.Fog('#dbe9e6', 26, 65)
    if (!room) scene.fog=null
    const camera = new THREE.PerspectiveCamera(48, 1, .1, 220)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x70938b, 2.3))
    const sun = new THREE.DirectionalLight(0xfff3d9, 3)
    sun.position.set(-8, 20, 8); sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 25, bottom: -25 })
    scene.add(sun)
    const textures: THREE.Texture[] = []
    occupants.current.clear()
    const obstacles: { x: number; z: number; w: number; d: number }[] = []
    const mesh = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, solid = false) => {
      const object = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: .8 }))
      object.position.set(x, y, z); object.receiveShadow = true; object.castShadow = true; scene.add(object)
      if (solid) obstacles.push({ x, z, w: w + .65, d: d + .65 })
      return object
    }
    const label = (text: string, x: number, y: number, z: number, width = 4, background = '#173e3b') => {
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 160
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = background; ctx.fillRect(0, 0, 768, 160)
      ctx.font = '600 42px Arial'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(text, 384, 80, 720)
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }))
      sprite.position.set(x, y, z); sprite.scale.set(width, width * 160 / 768, 1); scene.add(sprite)
      return sprite
    }
    const plant = (x: number, z: number) => {
      mesh(.65, .7, .65, '#ba8a60', x, .35, z, true)
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(.75, 0), new THREE.MeshStandardMaterial({ color: '#4f9271' }))
      leaves.position.set(x, 1.2, z); leaves.castShadow = true; scene.add(leaves)
    }
    const rows = room ? Math.ceil(room.capacity / Math.min(6, room.capacity)) : 5
    const depth = Math.max(14, rows * 1.9 + 7)
    const back = room ? depth - 6 : 10
    if (room) {
      mesh(70, .2, 80, '#bdcec4', 0, -.4, 8)
      mesh(24, .3, depth + 8, '#f3f0e4', 0, -.16, (back - 6) / 2)
      mesh(24, 3, .3, '#e7e5d7', 0, 1.5, -7)
      mesh(.3, 2, depth + 8, '#e7e5d7', -12, 1, (back - 6) / 2)
      mesh(.3, 2, depth + 8, '#e7e5d7', 12, 1, (back - 6) / 2)
      for (const x of [-8, -3, 3, 8]) mesh(2.4, 1.4, .12, '#9ccbd1', x, 1.8, -6.8)
      plant(-10, -5); plant(10, -5)
    }

    type Target = { type: Parameters<Props['onInteract']>[0]; x: number; z: number; text: string; name?:string }
    const targets: Target[] = []
    let disposeReception: (() => void) | undefined
    if (!room) {
      const reception = createFloor3(scene, obstacles, textures)
      targets.push(...reception.targets)
      disposeReception = reception.dispose
      highlightFloor.current=reception.highlight
      reception.highlight(destinationRef.current)
    } else {
      const exam = room.kind === 'exam'
      mesh(8, 2.4, .2, '#204d48', 0, 2, -6.7)
      const board = label(exam ? room.exam_title || 'PHÒNG THI THỬ · MAP MẪU' : 'BÀI 1 · CHÀO HỎI', 0, 2.2, -6.4, 7)
      if (exam) {
        const texture = board.material.map!
        const canvas = texture.image as HTMLCanvasElement
        canvas.height = 240; board.scale.set(7, 7 * 240 / 768, 1)
        writeBoard.current = title => {
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = '#173e3b'; ctx.fillRect(0, 0, 768, 240)
          ctx.font = '600 34px Arial'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          const lines: string[] = []; let line = ''
          for (const word of title.split(/\s+/)) {
            const next = line ? `${line} ${word}` : word
            if (line && ctx.measureText(next).width > 690) { lines.push(line); line = word } else line = next
          }
          if (line) lines.push(line)
          const visible = lines.slice(0, 4)
          visible.forEach((text, index) => ctx.fillText(text, 384, 120 + (index - (visible.length - 1) / 2) * 48, 690))
          texture.needsUpdate = true
        }
        writeBoard.current(room.exam_title || 'PHÒNG THI THỬ · MAP MẪU')
      }
      label(room.title, 0, 4.1, -6, 7)
      mesh(3, .9, 1, '#bb956e', 0, .45, -5, true)
      targets.push({ type: 'board', x: 0, z: -3.8, text: exam ? 'E · Xem hướng dẫn thi' : 'E · Xem bài giảng' })
      for (let i = 1; i <= room.capacity; i++) {
        const [x, z] = seatPosition(i, room.capacity)
        mesh(1.35, .12, .8, i === ownSeat ? '#dfb956' : '#c6ab83', x, .95, z, true)
        mesh(.12, .9, .12, '#6e7d78', x - .5, .45, z)
        mesh(.12, .9, .12, '#6e7d78', x + .5, .45, z)
        mesh(.65, .12, .65, '#577f78', x, .5, z + .75)
        mesh(.65, .65, .1, '#577f78', x, .8, z + 1)
        if (exam) {
          mesh(.85, .6, .08, '#344b5a', x, 1.4, z - .12)
          mesh(.72, .45, .02, '#93c9dc', x, 1.4, z - .06)
          mesh(.15, .25, .15, '#344b5a', x, 1.06, z - .12)
        } else mesh(.6, .04, .4, '#f9f5e9', x, 1.03, z)
        label(String(i).padStart(2, '0'), x + .46, 1.18, z + .3, .52)
        if (i !== ownSeat) {
          const person = new THREE.Group()
          const body = new THREE.Mesh(new THREE.BoxGeometry(.4, .6, .3), new THREE.MeshStandardMaterial({ color: '#8196b6' }))
          body.position.set(x, 1, z + .7); person.add(body)
          const head = new THREE.Mesh(new THREE.SphereGeometry(.23, 10, 8), new THREE.MeshStandardMaterial({ color: '#deb48d' }))
          head.position.set(x, 1.52, z + .7); person.add(head)
          person.visible = seats.includes(i); scene.add(person); occupants.current.set(i, person)
        }
        if (i === ownSeat) targets.push({ type: 'seat', x, z: z + .9, text: `E · Ngồi vào ${exam ? 'máy' : 'ghế'} ${i}` })
      }
      label('LỐI RA', 9, 2, back, 2.8)
      targets.push({ type: 'exit', x: 9, z: back - .5, text: 'E · Trở về sảnh' })
    }
    const avatar = new THREE.Group()
    const torso = new THREE.Mesh(new THREE.BoxGeometry(.5, .7, .32), new THREE.MeshStandardMaterial({ color: '#e8a348' }))
    torso.position.y = .88; torso.castShadow = true; avatar.add(torso)
    const head = new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 10), new THREE.MeshStandardMaterial({ color: '#e5b38b' }))
    head.position.y = 1.45; head.castShadow = true; avatar.add(head)
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#343a3d' }))
    hair.position.y = 1.49; avatar.add(hair)
    const legs = [-.15, .15].map(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.18, .48, .2), new THREE.MeshStandardMaterial({ color: '#344e65' }))
      leg.position.set(x, .28, 0); avatar.add(leg); return leg
    })
    avatar.position.set(room ? 9 : FLOOR_SPAWN[0], 0, room ? back - 2 : FLOOR_SPAWN[1]); scene.add(avatar)
    if (seated && room && ownSeat) {
      const [x, z] = seatPosition(ownSeat, room.capacity)
      avatar.position.set(x, -.35, z + .75); avatar.rotation.y = Math.PI
    }
    let yaw = 0; let dragging = false; let previousX = 0; let nearest: Target | undefined
    let lastHint = ''; let frame = 0; let animation = 0; let disposed = false
    const interactNow = () => {
      if (!nearest) return
      interact.current(nearest.type,nearest.name)
    }
    trigger.current = interactNow
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('input,textarea,select,button,a')) return
      const key = event.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'e'].includes(key)) {
        event.preventDefault(); input.current.add(key)
        if (key === 'e' && !event.repeat) interactNow()
      }
    }
    const keyup = (event: KeyboardEvent) => input.current.delete(event.key.toLowerCase())
    const clear = () => { input.current.clear(); dragging = false }
    const pointerDown = (event: PointerEvent) => { if (cameraView.current !== 'follow') return; dragging = true; previousX = event.clientX; renderer.domElement.setPointerCapture(event.pointerId); renderer.domElement.focus() }
    const pointerMove = (event: PointerEvent) => { if (dragging) { yaw -= (event.clientX - previousX) * .005; previousX = event.clientX } }
    const pointerUp = () => { dragging = false }
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', clear)
    renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointermove', pointerMove); renderer.domElement.addEventListener('pointerup', pointerUp)
    const resize = () => { const { width, height } = element.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix() }
    const observer = new ResizeObserver(resize); observer.observe(element); resize()
    camera.position.set(avatar.position.x, 9, avatar.position.z + 10)
    const clock = new THREE.Clock()
    const direction = new THREE.Vector3(); const desired = new THREE.Vector3(); const lookAt = new THREE.Vector3()
    const currentLookAt = avatar.position.clone().add(new THREE.Vector3(0, 1, -2))
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const render = () => {
      if (disposed) return
      animation = requestAnimationFrame(render)
      const delta = Math.min(clock.getDelta(), .05); frame += delta
      if (document.hidden) return
      const keys = input.current
      const dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
      const dz = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'))
      const mode = cameraView.current
      if ((dx || dz) && !seated && mode === 'follow') {
        direction.set(dx, 0, dz).normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).multiplyScalar(delta * 4)
        const bounds=room?{left:-11.3,right:11.3,top:-6,bottom:back+2}:FLOOR_BOUNDS
        const canMove = (x: number, z: number) => x > bounds.left && x < bounds.right && z > bounds.top && z < bounds.bottom && !obstacles.some(o => Math.abs(x - o.x) < o.w / 2 && Math.abs(z - o.z) < o.d / 2)
        if (canMove(avatar.position.x + direction.x, avatar.position.z)) avatar.position.x += direction.x
        if (canMove(avatar.position.x, avatar.position.z + direction.z)) avatar.position.z += direction.z
        avatar.rotation.y = Math.atan2(direction.x, direction.z)
        legs[0].rotation.x = Math.sin(frame * 12) * .45; legs[1].rotation.x = -legs[0].rotation.x
      } else { legs[0].rotation.x = 0; legs[1].rotation.x = 0 }
      const followDistance = room ? 10 : 11
      desired.set(Math.sin(yaw) * followDistance, room ? 9 : 8.5, Math.cos(yaw) * followDistance).add(avatar.position)
      lookAt.copy(avatar.position); lookAt.y += 1; lookAt.x -= Math.sin(yaw) * (room ? 2 : 4.5); lookAt.z -= Math.cos(yaw) * (room ? 2 : 4.5)
      let targetFov = 48
      if (mode === 'overview') {
        const center = (back - 6) / 2
        const distance = Math.max(depth + 8, 24 / camera.aspect) * 1.05
        desired.set(0, distance * .85, center + distance * .65)
        lookAt.set(0, 0, center)
        if(!room){
          const selected=FLOOR_ROOMS.find(item=>item.id===destinationRef.current)
          const [x1,y1,x2,y2]=selected?.rect??[2,4,1016,595]
          const [cx,cz]=floorPoint((x1+x2)/2,(y1+y2)/2)
          const distance=Math.max((y2-y1)*.04,(x2-x1)*.04/camera.aspect)*1.3+4
          desired.set(cx,Math.max(11,distance),cz+.8)
          lookAt.set(cx,0,cz)
          if(selected){
            const east=selected.platform&&selected.platform[0]>selected.rect[0]
            desired.set(cx+distance*(east?-.48:.48),distance*.74,cz+distance*.38)
            lookAt.y=.5
          }
        }
      } else if (seated && room && ownSeat && (mode === 'seat' || mode === 'focus')) {
        const [x, z] = seatPosition(ownSeat, room.capacity)
        if (mode === 'seat') {
          desired.set(x, 1.65, z + 1.3)
          lookAt.set(room.kind === 'exam' ? x : 0, room.kind === 'exam' ? 1.4 : 2.2, room.kind === 'exam' ? z - .06 : -6.4)
          targetFov = 62
        } else if (room.kind === 'exam') {
          const distance = Math.max(.65, .43 / camera.aspect)
          desired.set(x, 1.4, z - .06 + distance)
          lookAt.set(x, 1.4, z - .06)
          targetFov = 42
        } else {
          const distance = Math.max(3.8, 4.5 / camera.aspect)
          desired.set(0, 2.2, -6.4 + distance)
          lookAt.set(0, 2.2, -6.4)
          targetFov = 44
        }
      }
      avatar.visible = mode !== 'seat' && mode !== 'focus'
      const blend = reducedMotion.matches ? 1 : 1 - Math.exp(-delta * 6)
      camera.position.lerp(desired, blend); currentLookAt.lerp(lookAt, blend); camera.lookAt(currentLookAt)
      if (Math.abs(camera.fov - targetFov) > .01) { camera.fov += (targetFov - camera.fov) * blend; camera.updateProjectionMatrix() }
      nearest = targets.filter(t => Math.hypot(t.x - avatar.position.x, t.z - avatar.position.z) < 2.1).sort((a, b) => Math.hypot(a.x - avatar.position.x, a.z - avatar.position.z) - Math.hypot(b.x - avatar.position.x, b.z - avatar.position.z))[0]
      const text = seated ? 'Bạn đang ngồi · E để đứng lên' : nearest?.text || (room ? `Tìm ${room.kind === 'exam' ? 'máy' : 'ghế'} ${ownSeat ?? 'của bạn'} · Kéo để xoay góc nhìn` : 'WASD để đi · Kéo để xoay góc nhìn')
      if (text !== lastHint) { lastHint = text; setHint(text) }
      renderer.render(scene, camera)
    }
    render()
    return () => {
      disposed = true; cancelAnimationFrame(animation); observer.disconnect(); clear(); trigger.current = () => {}; writeBoard.current = () => {}
      disposeReception?.()
      highlightFloor.current=()=>{}
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clear)
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove); renderer.domElement.removeEventListener('pointerup', pointerUp)
      scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) { if (object instanceof THREE.Mesh) object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose() } })
      textures.forEach(texture => texture.dispose()); renderer.dispose(); renderer.domElement.remove()
    }
  // Seat occupancy updates separately, preserving the current walking position.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.capacity, ownSeat, seated])

  useEffect(() => {
    const occupied = new Set(seats)
    occupants.current.forEach((person, seat) => { person.visible = occupied.has(seat) })
  }, [seatKey, seats])

  useEffect(() => { if (room?.kind === 'exam') writeBoard.current(room.exam_title || 'PHÒNG THI THỬ · MAP MẪU') }, [room?.kind, room?.exam_title])

  return <div className={styles.sceneWrap}>
    <div ref={host} className={styles.scene} />
    <div className={styles.mapBadge}>{room ? 'PHÒNG MẪU' : 'TẦNG 3 · KHU A / KHU C'}<span>{room ? room.title : 'Theo sơ đồ trung tâm'}</span></div>
    {!room ? <label className={styles.floorSelector}>Xem vị trí phòng<select aria-label="Tìm phòng tầng 3" value={destination} onChange={event=>setDestination(event.target.value)}><option value="">Toàn bộ tầng 3</option>{FLOOR_ROOMS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
    {error ? <div className={styles.sceneError}>Thiết bị chưa hỗ trợ WebGL. Bạn vẫn có thể dùng các nút bên cạnh để vào lớp và học.</div> : null}
    {view !== 'focus' ? <div className={styles.sceneHint} role="status">{view === 'overview' ? 'Toàn cảnh trung tâm · Chọn Di chuyển để tiếp tục đi' : view === 'seat' ? 'Góc nhìn từ chỗ ngồi của bạn' : hint}</div> : null}
    {view === 'follow' ? <div className={styles.pad} aria-label="Điều khiển di chuyển">
      {(['w', 'a', 's', 'd'] as const).map((key, i) => <button key={key} aria-label={['Tiến', 'Trái', 'Lùi', 'Phải'][i]} className={styles[`pad${key}`]}
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); input.current.add(key) }}
        onPointerUp={() => input.current.delete(key)} onPointerCancel={() => input.current.delete(key)} onLostPointerCapture={() => input.current.delete(key)}>{['↑', '←', '↓', '→'][i]}</button>)}
    </div> : null}
    {view === 'follow' || view === 'seat' ? <button className={styles.interact} onClick={() => trigger.current()}>Tương tác <kbd>E</kbd></button> : null}
  </div>
}
