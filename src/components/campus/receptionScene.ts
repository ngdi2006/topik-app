import * as THREE from 'three'

type Obstacle = { x: number; z: number; w: number; d: number }
type ReceptionTarget = { type: 'classroom' | 'exam'; x: number; z: number; text: string }

/** Lightweight, open-roof interpretation of the supplied Korea Link reception photos. */
export function createReception(scene: THREE.Scene, obstacles: Obstacle[], textures: THREE.Texture[]) {
  let disposed = false
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const geometries = new Map<string, THREE.BoxGeometry>()
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .55 }))
    return materials.get(color)!
  }
  const box = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, solid = false) => {
    const key = `${w}/${h}/${d}`
    if (!geometries.has(key)) geometries.set(key, new THREE.BoxGeometry(w, h, d))
    const object = new THREE.Mesh(geometries.get(key)!, material(color))
    object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true
    scene.add(object)
    if (solid) obstacles.push({ x, z, w: w + .65, d: d + .65 })
    return object
  }
  const panel = (w: number, h: number, x: number, y: number, z: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512
    const ctx = canvas.getContext('2d')!
    draw(ctx)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture)
    const object = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }))
    object.position.set(x, y, z); scene.add(object)
    return { canvas, texture }
  }
  const sign = (title: string, subtitle: string, x: number, y: number, z: number, width = 3.4, background = '#f5f3e9') => panel(width, width * .27, x, y, z, ctx => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 512)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#172e7b'; ctx.font = 'bold 112px Arial'; ctx.fillText(title, 512, 195, 950)
    ctx.fillStyle = '#5e6780'; ctx.font = '52px Arial'; ctx.fillText(subtitle, 512, 355, 950)
  })

  // Cream ceramic floor and restrained grout lines; no expensive reflection passes.
  box(23.7, .04, 22, '#eee9dd', 0, .005, 3.5)
  const grout = material('#d3cec1')
  grout.roughness = .85
  for (let x = -12; x <= 12; x += 2) box(.018, .008, 22, '#d3cec1', x, .03, 3.5)
  for (let z = -7; z <= 14; z += 2) box(24, .008, .018, '#d3cec1', 0, .03, z)
  box(24, .14, .1, '#c4bfae', 0, .12, -6.8)
  box(24, 1.2, .15, '#f7f4e9', 0, 3.8, -6.85)
  box(10.4, 3.2, .16, '#273239', 0, 1.65, -6.75)
  for (const x of [-4, -2, 0, 2, 4]) box(.025, 3.1, .02, '#485157', x, 1.65, -6.65)
  box(6.6, 2.35, .16, '#d4c9a6', 0, 2.75, -6.52)
  const logo = panel(6.35, 2.13, 0, 2.75, -6.42, ctx => {
    ctx.fillStyle = '#fff7d9'; ctx.fillRect(0, 0, 1024, 512)
    ctx.fillStyle = '#192975'; ctx.textAlign = 'center'; ctx.font = 'bold 100px Arial'; ctx.fillText('Korea Link', 512, 265)
    ctx.font = '36px Arial'; ctx.fillText('Korean and More', 512, 350)
  })
  const image = new Image()
  image.onload = () => {
    if (disposed) return
    const ctx = logo.canvas.getContext('2d')!
    ctx.fillStyle = '#fff7d9'; ctx.fillRect(0, 0, 1024, 512)
    // Use the existing official logo asset, including its original lettering.
    ctx.drawImage(image, 130, 80, 1000, 570, 212, 10, 600, 492)
    logo.texture.needsUpdate = true
  }
  image.src = '/logomobile.png'
  sign('TRUNG TÂM NGOẠI NGỮ KOREA LINK', 'CHÀO MỪNG BẠN ĐẾN VỚI TRUNG TÂM', 0, 4.1, -6.55, 9)

  // Reception desk behind the glass frontage, with a monitor and consultation seats.
  box(9.2, 1.05, 1.25, '#cfbb94', 0, .55, -4.65, true)
  box(9.5, .12, 1.45, '#fff9ed', 0, 1.12, -4.65)
  for (const x of [-3.9, -1.95, 0, 1.95, 3.9]) box(.025, .9, .025, '#b29c78', x, .55, -3.99)
  sign('LỄ TÂN', 'TƯ VẤN & ĐĂNG KÝ HỌC', 0, .62, -3.98, 3.5)
  box(1.05, .65, .09, '#303d4d', -2.2, 1.65, -4.6)
  box(.93, .52, .025, '#b1cbd2', -2.2, 1.65, -4.54)
  box(.16, .24, .18, '#647080', -2.2, 1.24, -4.6)
  box(.8, .035, .3, '#d4d7d6', -2.2, 1.2, -4.2)
  for (const x of [1.3, 2.1, 3]) box(.48, .045, .35, '#fbfbf1', x, 1.21, -4.3)

  // Transparent panels stop at the two doorways, preserving traversable routes.
  const glass = new THREE.MeshStandardMaterial({ color: '#bad5da', transparent: true, opacity: .13, roughness: .18, metalness: .08, depthWrite: false, side: THREE.DoubleSide })
  const spans = [[-9.7, 3], [-3.8, 4.2], [0, 3.3], [3.8, 4.2], [9.7, 3]]
  for (const [x, width] of spans) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(width, 3.65, .04), glass)
    pane.position.set(x, 1.85, -2.05); scene.add(pane)
    obstacles.push({ x, z: -2.05, w: width + .45, d: .55 })
    box(width, .07, .07, '#b0b8b6', x, .08, -2.05)
    box(.035, 3.7, .07, '#d3d7d2', x - width / 2, 1.85, -2.05)
    box(width, .38, .045, '#192b9b', x, 1.38, -2.01)
    for (const y of [1.08, 1.68]) box(width, .025, .05, '#2639b2', x, y, -1.99)
    panel(width * .85, .19, x, 1.38, -1.97, ctx => {
      ctx.fillStyle = '#192b9b'; ctx.fillRect(0, 0, 1024, 512)
      ctx.fillStyle = '#f3e9c6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 170px Arial'; ctx.fillText('KOREA LINK', 512, 256, 950)
    })
  }
  const targets: ReceptionTarget[] = []
  for (const [x, type, heading, subtitle] of [[-7, 'classroom', 'KHU A · LỚP HỌC', 'A101 · ĐIỂM ĐẾN HỌC TẬP'], [7, 'exam', 'KHU C · PHÒNG THI', 'T201 · THI THỬ TRÊN MÁY']] as const) {
    box(2.3, .12, .3, '#d9d7c9', x, 3.75, -2.05)
    sign(heading, subtitle, x, 3.28, -2, 3.8)
    for (const side of [-1, 1]) {
      box(.075, 3.05, .1, '#b9c3c2', x + side * 1.03, 1.52, -2.05)
      // Door handles mounted on the jambs leave the opening clear.
      box(.065, .75, .1, '#8b969b', x + side * .94, 1.38, -1.88)
    }
    box(1.8, .025, 1.35, '#334884', x, .055, -.8)
    targets.push({ type, x, z: -.55, text: `E · ${heading}` })
  }

  const chair = (x: number, z: number) => {
    box(.8, .1, .68, '#254395', x, .55, z, true)
    const back = box(.8, .48, .065, '#2e4a9d', x, .93, z - .3)
    back.rotation.x = -.1
    for (const side of [-1, 1]) {
      box(.045, .53, .045, '#9faeb2', x + side * .32, .27, z - .25)
      box(.045, .53, .045, '#9faeb2', x + side * .32, .27, z + .25)
      box(.045, .045, .64, '#9faeb2', x + side * .32, .045, z)
    }
  }
  for (const x of [-4, -2, 0, 2, 4]) chair(x, -3.05)
  for (const x of [-9.4, -8.15, -6.9, 6.9, 8.15, 9.4]) chair(x, 2.5)
  sign('KHU VỰC CHỜ', 'MỜI BẠN CHỌN LỚP TẠI BẢNG BÊN', -8.15, 1.85, 2.17, 3)

  // Pink blossom tree from the reception photos, built from shared low-poly clusters.
  box(1.4, .5, 1.35, '#e2d8c1', -10.1, .28, -4.4, true)
  box(.16, 2.7, .16, '#8b6651', -10.1, 1.65, -4.4)
  const bloomGeometry = new THREE.IcosahedronGeometry(.5, 1)
  for (let i = 0; i < 18; i++) {
    const angle = i * 2.39996
    const radius = .25 + (i % 4) * .25
    const bloom = new THREE.Mesh(bloomGeometry, material(i % 3 ? '#eaa6b9' : '#f8d3db'))
    bloom.position.set(-10.1 + Math.cos(angle) * radius, 2.4 + (i % 5) * .25, -4.4 + Math.sin(angle) * radius * .7)
    scene.add(bloom)
  }
  const poster = (x: number, title: string, subtitle: string, color: string) => {
    for (const side of [-1, 1]) box(.045, 2.5, .045, '#606974', x + side * .64, 1.25, .5)
    panel(1.55, 2.65, x, 1.5, .56, ctx => {
      ctx.fillStyle = '#fff5e5'; ctx.fillRect(0, 0, 1024, 512)
      ctx.fillStyle = color; ctx.fillRect(0, 0, 1024, 70)
      ctx.textAlign = 'center'; ctx.fillStyle = '#263780'; ctx.font = 'bold 120px Arial'; ctx.fillText(title, 512, 220, 930)
      ctx.fillStyle = '#b3273e'; ctx.font = 'bold 70px Arial'; ctx.fillText(subtitle, 512, 325, 930)
      ctx.fillStyle = color; ctx.fillRect(140, 390, 744, 65)
      ctx.fillStyle = '#fff'; ctx.font = '48px Arial'; ctx.fillText('KOREA LINK', 512, 439)
    })
    obstacles.push({ x, z: .5, w: 1.8, d: .9 })
  }
  poster(-10.35, 'DU HỌC HÈ', 'TIẾNG HÀN D4-1', '#c49242')
  poster(10.35, 'SPEAK UP!', 'ONLINE 2026', '#d33b52')

  // Short ceiling beams suggest the real suspended ceiling without hiding the playable map.
  for (const x of [-11.7, 11.7]) box(.25, .16, 13, '#f7f4e9', x, 5.8, -.6)
  for (const x of [-7, 0, 7]) {
    const lamp = box(1.6, .06, .75, '#ffffff', x, 5.74, -5.65)
    const lightMaterial = lamp.material as THREE.MeshStandardMaterial
    lightMaterial.emissive.set('#fff7db'); lightMaterial.emissiveIntensity = .25
  }
  return { targets, dispose: () => { disposed = true; image.onload = null; image.onerror = null } }
}
