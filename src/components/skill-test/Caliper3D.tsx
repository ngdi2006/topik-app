'use client'

import controlStyles from './caliperControls.module.css'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Box, Focus, Minus, Plus, Maximize2 } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { VERNIER_CONFIGS, type VernierResolution } from '@/lib/skill-test/caliperMath'
import type { WorkshopObject } from '@/lib/skill-test/sampleObjects'
import { createWorkpieceGeometry } from './workpieceGeometry'

export interface DigitalCaliperDisplay {
  text: string
  unit: 'mm' | 'in'
  power: boolean
  relative: boolean
  onPower: () => void
  onZero: () => void
  onUnit: () => void
}

interface Props {
  position: number
  maxMm: number
  resolution: VernierResolution
  locked: boolean
  readOnly: boolean
  onChange: (value: number) => void
  onLock: () => void
  digital?: DigitalCaliperDisplay
  workpiece?: WorkshopObject
  presentation?: 'standard' | 'quiz' | 'exam'
  onReady?: () => void
  viewActions?: ReactNode
}

type View = {
  slider: THREE.Group
  depthRod: THREE.Mesh
  render: () => void
  reset: () => void
  zoomBy: (factor: number) => void
  focusReading: () => void
  focusSample: () => void
  updateSample?: (opening: number) => void
  updateDisplay?: (display: DigitalCaliperDisplay) => void
}

// Engraved zeros sit behind the jaw contact plane, as on the reference tool.
const SCALE_ZERO_OFFSET_MM = 3
// Internal knife edges are offset from the external jaw plane by the same amount.
// Their outward-facing measuring planes are x=INTERNAL_EDGE_X and x=INTERNAL_EDGE_X+position.
const INTERNAL_EDGE_X = -6

// All geometry uses millimetres. The two external contact faces are x=0 and x=position.
export default function Caliper3D(props: Props) {
  const { presentation, onReady } = props
  const digitalMode = Boolean(props.digital)
  const sampleContact = Boolean(props.workpiece && Math.abs(props.position - props.workpiece.targetValueMm) < .005)
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View | null>(null)
  const latestRef = useRef(props)
  const [failed, setFailed] = useState(false)

  useEffect(() => { latestRef.current = props }, [props])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch {
      const frame = requestAnimationFrame(() => setFailed(true))
      return () => cancelAnimationFrame(frame)
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor('#f3f5f6')
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = .78
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const canvas = renderer.domElement
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none'
    canvas.setAttribute('aria-label', digitalMode
      ? 'Thước kẹp điện tử 3D. Kéo cụm LCD để đo; kéo nền để xoay; cuộn để phóng to.'
      : 'Thước kẹp cơ 3D. Kéo cụm du xích để đo; kéo nền để xoay; cuộn để phóng to.')
    canvas.setAttribute('role', 'img')
    if (!latestRef.current.readOnly || presentation === 'exam') canvas.setAttribute('aria-label', `${canvas.getAttribute('aria-label')} Dùng phím mũi tên trái/phải để kéo thước, giữ Shift để dịch 1 mm.`)
    canvas.tabIndex = 0
    host.appendChild(canvas)

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, .04)
    scene.environment = environment.texture
    room.dispose()
    pmrem.dispose()
    const camera = new THREE.OrthographicCamera(-110, 110, 50, -50, .1, 1200)
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = false
    controls.enablePan = false
    controls.zoomToCursor = false
    controls.minZoom = .65
    controls.maxZoom = 6
    controls.minPolarAngle = .2
    controls.maxPolarAngle = Math.PI - .2
    let frameWidth = props.maxMm + 110 + latestRef.current.position
    const centerX = (props.maxMm + 48) / 2
    const overviewTarget = new THREE.Vector3()
    let readingFocused = false
    let sampleFocused = false
    let sampleZoomMultiplier = 1
    let previousZoom = 1
    const overviewHalfHeight = props.workpiece ? Math.max(60, props.workpiece.heightMm + 15) : 43
    const reset = () => {
      readingFocused = false
      sampleFocused = false
      previousZoom = 1
      frameWidth = props.maxMm + 110 + latestRef.current.position
      const midpoint = centerX + latestRef.current.position / 2
      camera.position.set(midpoint, -3, 330)
      camera.up.set(0, 1, 0)
      camera.zoom = 1
      overviewTarget.set(midpoint, -3, 0)
      controls.target.copy(overviewTarget)
      const halfWidth = Math.max(frameWidth / 2, overviewHalfHeight * host.clientWidth / Math.max(1, host.clientHeight))
      camera.left = -halfWidth; camera.right = halfWidth
      camera.top = halfWidth * host.clientHeight / Math.max(1, host.clientWidth); camera.bottom = -camera.top
      const readingWidth = digitalMode ? 48 : VERNIER_CONFIGS[props.resolution].spanMm + 12
      const readingHeight = digitalMode ? 32 : 18
      controls.maxZoom = Math.min(presentation === 'exam' ? 32 : 6, 2 * halfWidth / readingWidth, 2 * camera.top / readingHeight)
      camera.updateProjectionMatrix()
      controls.update()
    }
    reset()

    scene.add(new THREE.HemisphereLight(0xffffff, 0x88909a, .65))
    const light = new THREE.DirectionalLight(0xffffff, 2)
    light.position.set(-70, 100, 160)
    scene.add(light)
    const rim = new THREE.DirectionalLight(0xc7d9ed, 1)
    rim.position.set(170, -10, 80)
    scene.add(rim)

    const steel = new THREE.MeshStandardMaterial({ color: '#59636c', metalness: .83, roughness: .34, envMapIntensity: .75 })
    const satin = new THREE.MeshStandardMaterial({ color: '#606b75', metalness: .7, roughness: .48, envMapIntensity: .75 })
    const polished = new THREE.MeshStandardMaterial({ color: '#b8c1c7', metalness: .95, roughness: .22, envMapIntensity: .85 })
    const dark = new THREE.MeshStandardMaterial({ color: '#626a6e', metalness: .7, roughness: .5 })
    const root = new THREE.Group()
    scene.add(root)
    const slider = new THREE.Group()
    root.add(slider)
    const box = (parent: THREE.Group, x: number, y: number, z: number, w: number, h: number, d: number, material = steel) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
      mesh.position.set(x + w / 2, y + h / 2, z + d / 2)
      parent.add(mesh)
      return mesh
    }
    const extrude = (parent: THREE.Group, shape: THREE.Shape, material = steel, depth = 3.5, z = -1.75) => {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        // A bevel would protrude past x=0 and intersect the opposite contact face.
        depth, bevelEnabled: false, steps: 1,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.z = z
      parent.add(mesh)
      return mesh
    }
    const cylinder = (parent: THREE.Group, x: number, y: number, z: number, radius: number, height: number, material = steel) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 40), material)
      mesh.position.set(x, y, z)
      parent.add(mesh)
      return mesh
    }
    const frontScrew = (parent: THREE.Group, x: number, y: number, z: number) => {
      const screw = cylinder(parent, x, y, z, 1.25, .5, polished)
      screw.rotation.x = Math.PI / 2
      box(parent, x - .8, y - .12, z + .28, 1.6, .24, .06, dark)
    }

    // Beam, narrow hardened jaws and relieved tips follow the supplied front photo.
    box(root, -12, 0, -1.5, props.maxMm + 72, 12, 3, satin)
    const fixedLower = new THREE.Shape()
    fixedLower.moveTo(-12, 1)
    fixedLower.lineTo(0, 1)
    fixedLower.lineTo(0, -36)
    fixedLower.quadraticCurveTo(-4, -36, -5.3, -31)
    fixedLower.quadraticCurveTo(-9, -19, -12, -2)
    fixedLower.closePath()
    extrude(root, fixedLower)
    const fixedTip = new THREE.Shape()
    fixedTip.moveTo(0, -27); fixedTip.lineTo(0, -36)
    fixedTip.quadraticCurveTo(-4, -36, -5.3, -31); fixedTip.lineTo(-5.3, -27); fixedTip.closePath()
    extrude(root, fixedTip, polished, .2, 1.8)
    const fixedUpper = new THREE.Shape()
    // Internal jaws have straight OUTWARD measuring edges and inward curved relief.
    // The left knife edge faces left; the right knife edge faces right.
    fixedUpper.moveTo(-12, 12); fixedUpper.lineTo(-12, 17); fixedUpper.lineTo(INTERNAL_EDGE_X, 17)
    fixedUpper.lineTo(INTERNAL_EDGE_X, 32)
    fixedUpper.quadraticCurveTo(-.2, 27, 0, 17)
    fixedUpper.lineTo(0, 12); fixedUpper.closePath()
    // The two thin blades slide alongside each other in depth, as on a real caliper.
    extrude(root, fixedUpper, steel, 1.5, -1.5)

    const movingLower = new THREE.Shape()
    movingLower.moveTo(0, 0); movingLower.lineTo(12, 0)
    movingLower.quadraticCurveTo(8, -13, 5.6, -29)
    movingLower.quadraticCurveTo(4.2, -36, 0, -36)
    movingLower.closePath()
    extrude(slider, movingLower)
    const movingTip = new THREE.Shape()
    movingTip.moveTo(0, -27); movingTip.lineTo(5.9, -27); movingTip.lineTo(5.6, -29)
    movingTip.quadraticCurveTo(4.2, -36, 0, -36); movingTip.closePath()
    extrude(slider, movingTip, polished, .2, 1.8)
    const movingUpper = new THREE.Shape()
    movingUpper.moveTo(-12, 12); movingUpper.lineTo(-12, 17)
    movingUpper.quadraticCurveTo(-11.8, 27, INTERNAL_EDGE_X, 32)
    movingUpper.lineTo(INTERNAL_EDGE_X, 17)
    movingUpper.lineTo(12, 17); movingUpper.lineTo(12, 12)
    movingUpper.closePath()
    extrude(slider, movingUpper, steel, 1.5, 0)

    // Polished outward facets contact opposite sides of a bore. They remain rigid:
    // opening translates the right blade without morphing either jaw.
    for (const [parent, z, facing] of [[root, -.75, -1], [slider, .75, 1]] as const) {
      const facet = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 15), polished)
      facet.rotation.y = facing * Math.PI / 2
      facet.position.set(INTERNAL_EDGE_X, 24.5, z)
      parent.add(facet)
    }

    // Fine dark seams make the flat mating edges visible even when fully closed.
    const contactEdgeMaterial = new THREE.LineBasicMaterial({ color: '#46525c', transparent: true, opacity: .65 })
    for (const [parent, upperZ] of [[root, .02], [slider, 1.52]] as const) {
      const upperEdge = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(INTERNAL_EDGE_X, 17, upperZ), new THREE.Vector3(INTERNAL_EDGE_X, 32, upperZ),
      ])
      const lowerEdge = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -1, 2.03), new THREE.Vector3(0, -36, 2.03),
      ])
      parent.add(new THREE.LineSegments(upperEdge, contactEdgeMaterial), new THREE.LineSegments(lowerEdge, contactEdgeMaterial))
    }

    const config = VERNIER_CONFIGS[props.resolution]
    const sliderWidth = digitalMode ? 54 : config.spanMm + 5
    // Back plate and upper bridge wrap the beam; the main graduation stays visible.
    box(slider, -.7, -5.5, -3.3, sliderWidth, 23, 1.7)
    if (!digitalMode) {
      box(slider, -.7, 12.3, -1.6, sliderWidth, 6.2, 5.5, satin)
      box(slider, -.7, -5.5, -1.6, sliderWidth, 5.45, 5, satin)
    }
    const shaftX = sliderWidth * .52
    const lockAssembly = new THREE.Group()
    slider.add(lockAssembly)
    cylinder(lockAssembly, shaftX, 19.6, .6, .75, 3, dark)
    cylinder(lockAssembly, shaftX, 22.2, .6, 2.25, 3, steel)
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI * 2 / 32
      cylinder(lockAssembly, shaftX + Math.cos(a) * 2.24, 22.2, .6 + Math.sin(a) * 2.24, .065, 2.6, dark)
    }
    const thumb = cylinder(slider, sliderWidth - 6, -6.8, -.5, 4, 2.5, steel)
    thumb.rotation.x = Math.PI / 2
    for (let i = 0; i < 36; i++) {
      const a = i * Math.PI * 2 / 36
      const tooth = box(slider, sliderWidth - 6 + Math.cos(a) * 3.9, -6.8 + Math.sin(a) * 3.9, -1.7, .18, .5, 2.5, dark)
      tooth.rotation.z = a - Math.PI / 2
    }
    frontScrew(root, props.maxMm + 57.5, 9.5, 1.7)
    frontScrew(root, props.maxMm + 57.5, 2.5, 1.7)

    const depthRod = box(root, 6, 4.8, -1, props.maxMm + 54, 1.6, 1.2, polished)
    // Etched markings are high resolution textures on the actual front faces.
    const textures: THREE.Texture[] = []
    const labelPlate = (parent: THREE.Group, width: number, height: number, x: number, y: number, z: number,
      draw: (ctx: CanvasRenderingContext2D, px: number) => void) => {
      const surface = document.createElement('canvas')
      const px = 32
      surface.width = Math.ceil(width * px)
      surface.height = Math.ceil(height * px)
      const ctx = surface.getContext('2d')!
      ctx.scale(px, px)
      ctx.fillStyle = '#20282f'; ctx.strokeStyle = '#20282f'; ctx.lineWidth = .1
      draw(ctx, px)
      const texture = new THREE.CanvasTexture(surface)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
      textures.push(texture)
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }))
      mesh.position.set(x + width / 2, y + height / 2, z)
      parent.add(mesh)
    }
    labelPlate(root, props.maxMm + 71, 12, -12, 0, 1.62, ctx => {
      ctx.textAlign = 'center'; ctx.font = '500 1.8px Arial'
      // The entire vernier needs opposing main-scale ticks near the travel limit.
      // This reference extension does not increase the jaw's measuring range.
      const graduationEnd = digitalMode ? props.maxMm : props.maxMm + Math.ceil(config.spanMm / 10) * 10
      for (let mm = 0; mm <= graduationEnd; mm++) {
        const major = mm % 10 === 0
        const h = major ? 4.8 : mm % 5 === 0 ? 3.7 : 2.8
        ctx.lineWidth = major ? .17 : .14
        const x = mm + 12 + SCALE_ZERO_OFFSET_MM
        ctx.beginPath(); ctx.moveTo(x, 12); ctx.lineTo(x, 12 - h); ctx.stroke()
        if (major) ctx.fillText(String(mm), x, 6.1)
      }
      ctx.textAlign = 'left'; ctx.font = 'bold 1.7px Arial'; ctx.fillText('Mitutoyo', .8, 6.6)
      ctx.font = '.65px Arial'; ctx.fillText('MADE IN JAPAN', 1, 8.2)
      ctx.fillText('STAINLESS', props.maxMm + 27, 3.3)
      ctx.fillText('HARDENED', props.maxMm + 27, 4.3)
      ctx.font = '1.5px Arial'; ctx.fillText(`${props.maxMm} mm`, props.maxMm + 43, digitalMode ? 6.8 : 2.8)
    })
    if (!digitalMode) {
    labelPlate(slider, sliderWidth, 5.4, -.7, -5.5, 3.45, ctx => {
      ctx.textAlign = 'center'; ctx.font = '500 1.35px Arial'
      for (let n = 0; n <= config.totalDivisions; n++) {
        const x = .7 + SCALE_ZERO_OFFSET_MM + n * config.pitchMm
        const major = n % config.labelStep === 0
        ctx.lineWidth = major ? .16 : .12
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, major ? 3 : 2.1); ctx.stroke()
        if (major) ctx.fillText(String(n / config.labelStep), x, 4.8)
      }
    })
    labelPlate(slider, sliderWidth, 4, -.7, 13.3, 4.02, ctx => {
      ctx.font = '1.2px Arial'; ctx.textAlign = 'right'
      ctx.fillText(`${props.resolution.toFixed(2)} mm`, sliderWidth - 2, 2.5)
    })
    }
    // Fine longitudinal brushing stays attached to each machined face when the view rotates.
    const brushMaterial = new THREE.LineBasicMaterial({ color: '#eef0ee', transparent: true, opacity: .07 })
    const brushPoints = []
    for (let i = 0; i < 36; i++) {
      const y = .3 + i * .32
      brushPoints.push(-11.7, y, 1.56, props.maxMm + 59.5, y, 1.56)
    }
    const brushGeometry = new THREE.BufferGeometry()
    brushGeometry.setAttribute('position', new THREE.Float32BufferAttribute(brushPoints, 3))
    root.add(new THREE.LineSegments(brushGeometry, brushMaterial))

    const deviceActions: { mesh: THREE.Object3D; activate: () => void }[] = []
    let updateDisplay: ((display: DigitalCaliperDisplay) => void) | undefined
    if (digitalMode) {
      const housing = new THREE.MeshStandardMaterial({ color: '#859099', metalness: .55, roughness: .35 })
      const bezel = new THREE.MeshStandardMaterial({ color: '#1c293a', metalness: .15, roughness: .48 })
      const blue = new THREE.MeshStandardMaterial({ color: '#447b9c', metalness: .15, roughness: .45 })
      const face = new THREE.Shape()
      face.moveTo(8, -5); face.lineTo(49, -5)
      face.quadraticCurveTo(53, -5, 53, -1)
      face.lineTo(53, 18); face.quadraticCurveTo(53, 21, 49, 21)
      face.lineTo(8, 21); face.quadraticCurveTo(5, 21, 5, 18)
      face.lineTo(5, -2); face.quadraticCurveTo(5, -5, 8, -5)
      extrude(slider, face, housing, 9, -2)
      box(slider, 7.5, -1.8, 7, 32, 20, 1.1, bezel)
      box(slider, 9, 3, 8.1, 29, 12, .4, dark)

      const lcdCanvas = document.createElement('canvas')
      lcdCanvas.width = 1160; lcdCanvas.height = 480
      const lcd = lcdCanvas.getContext('2d')!
      const lcdTexture = new THREE.CanvasTexture(lcdCanvas)
      lcdTexture.colorSpace = THREE.SRGBColorSpace
      lcdTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()
      textures.push(lcdTexture)
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(28, 11), new THREE.MeshBasicMaterial({ map: lcdTexture }))
      screen.position.set(23.5, 9, 8.55)
      slider.add(screen)

      labelPlate(slider, 31, 3, 8, 15, 8.22, ctx => {
        ctx.fillStyle = '#e6e9e8'; ctx.font = 'bold 1.5px Arial'
        ctx.fillText('Mitutoyo', 1, 2)
      })
      labelPlate(slider, 10, 5, 41, 9, 7.12, ctx => {
        ctx.textAlign = 'center'; ctx.font = '1px Arial'
        ctx.fillText('ABSOLUTE', 5, 2)
        ctx.font = '.9px Arial'; ctx.fillText('mm / inch', 5, 4)
      })

      const button = (x: number, y: number, radius: number, material: THREE.MeshStandardMaterial, label: string,
        action: 'onPower' | 'onZero' | 'onUnit') => {
        const mesh = cylinder(slider, x, y, 8.6, radius, .8, material)
        mesh.rotation.x = Math.PI / 2
        deviceActions.push({ mesh, activate: () => {
          const display = latestRef.current.digital
          if (display && (action === 'onPower' || display.power)) display[action]()
        } })
        labelPlate(slider, radius * 2.4, 2.4, x - radius * 1.2, y - 1.2, 9.05, ctx => {
          ctx.fillStyle = '#101923'; ctx.textAlign = 'center'
          ctx.font = `bold ${label === 'ON/OFF' ? 1.2 : 1.5}px Arial`
          ctx.fillText(label, radius * 1.2, 1.7)
        })
      }
      button(14, .5, 2.5, blue, 'ZERO', 'onZero')
      button(24, .5, 2.5, blue, 'ON/OFF', 'onPower')
      button(34, .5, 2.5, blue, 'mm/in', 'onUnit')

      updateDisplay = display => {
        const background = lcd.createLinearGradient(0, 0, 0, 480)
        background.addColorStop(0, '#a7b39e'); background.addColorStop(.55, '#c6d0b8'); background.addColorStop(1, '#a9b69c')
        lcd.fillStyle = background; lcd.fillRect(0, 0, 1160, 480)
        if (display.power) {
          lcd.fillStyle = '#243222'; lcd.textAlign = 'right'
          lcd.font = 'bold 47px Arial'; lcd.fillText(display.unit, 1110, 81)
          lcd.textAlign = 'left'; lcd.font = 'bold 34px Arial'
          if (display.relative) lcd.fillText('INC', 210, 65)
          lcd.textAlign = 'right'
          // Fit negative inch readings as well as the normal 0.00–150.00 mm range.
          let size = 270
          do { lcd.font = `bold italic ${size}px 'Courier New', monospace`; size -= 4 }
          while (lcd.measureText(display.text.trim()).width > 1050 && size > 120)
          lcd.fillText(display.text.trim(), 1110, 365)
        }
        lcdTexture.needsUpdate = true
      }
      if (latestRef.current.digital) updateDisplay(latestRef.current.digital)
    }

    const specimen = props.workpiece ? createWorkpieceGeometry(props.workpiece, props.maxMm) : undefined
    if (specimen) root.add(specimen.group)
    const sampleBounds = () => {
      const bounds = specimen!.frame.clone()
      if (props.workpiece?.measureType === 'outer') bounds.max.x = Math.max(bounds.max.x, slider.position.x + 14)
      return bounds
    }
    const fitSampleZoom = () => {
      if (!specimen) return
      const bounds = sampleBounds()
      camera.updateMatrixWorld()
      const projected = new THREE.Box3()
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse))
      }
      const span = projected.getSize(new THREE.Vector3())
      const fit = Math.min((camera.right - camera.left) / (span.x + 12), (camera.top - camera.bottom) / (span.y + 12))
      camera.zoom = THREE.MathUtils.clamp(fit * sampleZoomMultiplier, controls.minZoom, controls.maxZoom)
      previousZoom = camera.zoom
      camera.updateProjectionMatrix()
    }
    const readingTarget = new THREE.Vector3()
    const focusDelta = new THREE.Vector3()
    const centerReading = () => {
      if (sampleFocused && specimen) {
        sampleBounds().getCenter(readingTarget)
      } else if (readingFocused) {
        readingTarget.set(
          slider.position.x + (digitalMode ? 23.5 : SCALE_ZERO_OFFSET_MM + config.spanMm / 2),
          digitalMode ? 9 : 0,
          digitalMode ? 8.55 : 2.5,
        )
      } else {
        readingTarget.copy(overviewTarget)
      }
      // Translate camera and orbit target together: retain the user's viewing angle
      // while keeping the LCD / complete vernier centered during zoom and sliding.
      focusDelta.subVectors(readingTarget, controls.target)
      camera.position.add(focusDelta)
      controls.target.copy(readingTarget)
      camera.updateMatrixWorld()
    }
    const render = () => {
      if (disposed) return
      if (Math.abs(camera.zoom - previousZoom) > 1e-6) {
        if (sampleFocused) sampleZoomMultiplier *= camera.zoom / previousZoom
        else readingFocused = true
        previousZoom = camera.zoom
      }
      centerReading()
      if (sampleFocused) fitSampleZoom()
      specimen?.update(slider.position.x)
      const width = host.clientWidth, height = host.clientHeight
      renderer.setScissorTest(false)
      renderer.setViewport(0, 0, width, height)
      renderer.render(scene, camera)

    }
    let disposed = false
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight
      if (w <= 0 || h <= 0) return
      const halfWidth = Math.max(frameWidth / 2, overviewHalfHeight * w / Math.max(1, h))
      camera.left = -halfWidth; camera.right = halfWidth
      camera.top = halfWidth * h / w; camera.bottom = -camera.top
      const readingWidth = digitalMode ? 48 : config.spanMm + 12
      const readingHeight = digitalMode ? 32 : 18
      controls.maxZoom = Math.min(presentation === 'exam' ? 32 : 6, 2 * halfWidth / readingWidth, 2 * camera.top / readingHeight)
      camera.zoom = Math.min(camera.zoom, controls.maxZoom)
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      if (sampleFocused) fitSampleZoom()
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    controls.addEventListener('change', render)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -3)
    const hit = new THREE.Vector3()
    let drag: { start: number; value: number; pointerId: number; camera: THREE.OrthographicCamera } | null = null
    const cast = (event: PointerEvent, projectionCamera = camera) => {
      const rect = canvas.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
      raycaster.setFromCamera(pointer, projectionCamera)
    }
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      cast(event)
      const action = deviceActions.find(({ mesh }) => raycaster.intersectObject(mesh, true).length > 0)
      if (action) {
        action.activate()
        event.stopImmediatePropagation()
        return
      }
      if (raycaster.intersectObject(lockAssembly, true).length) {
        latestRef.current.onLock()
        event.stopImmediatePropagation()
        return
      }
      const sampleHandle = specimen?.handle && raycaster.intersectObject(specimen.handle, true).length > 0
      const depthHandle = props.workpiece?.measureType === 'depth' && raycaster.intersectObject(depthRod).length > 0
      if (!sampleHandle && !depthHandle && !raycaster.intersectObject(slider, true).length) return
      if (latestRef.current.locked || latestRef.current.readOnly) {
        event.stopImmediatePropagation(); return
      }
      if (!raycaster.ray.intersectPlane(plane, hit)) return
      drag = { start: hit.x, value: latestRef.current.position, pointerId: event.pointerId, camera: camera.clone() }
      controls.enabled = false
      canvas.setPointerCapture(event.pointerId)
      event.stopImmediatePropagation()
      canvas.style.cursor = 'grabbing'
    }
    const move = (event: PointerEvent) => {
      if (!drag) return
      // Freeze the drag projection so automatic camera following cannot feed back
      // into the measured displacement and make the carriage jump or accelerate.
      cast(event, drag.camera)
      if (!raycaster.ray.intersectPlane(plane, hit)) return
      const current = latestRef.current
      if (current.locked || current.readOnly) return
      const next = Math.max(0, Math.min(current.maxMm, Math.round((drag.value + hit.x - drag.start) / current.resolution) * current.resolution))
      current.onChange(Number(next.toFixed(2)))
    }
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      drag = null
      controls.enabled = true
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      canvas.style.cursor = 'grab'
    }
    const keydown = (event: KeyboardEvent) => {
      const current = latestRef.current
      if (current.readOnly || current.locked || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
      event.preventDefault()
      const delta = (event.shiftKey ? 1 : current.resolution) * (event.key === 'ArrowRight' ? 1 : -1)
      current.onChange(Number(THREE.MathUtils.clamp(current.position + delta, 0, current.maxMm).toFixed(2)))
    }
    canvas.style.cursor = 'grab'
    canvas.addEventListener('pointerdown', down, true)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('keydown', keydown)
    slider.position.x = latestRef.current.position
    depthRod.position.x += latestRef.current.position
    const zoomBy = (factor: number) => {
      if (!sampleFocused) readingFocused = true
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom)
      camera.updateProjectionMatrix()
      render()
    }
    const focusReading = () => {
      sampleFocused = false
      readingFocused = true
      if (props.workpiece || presentation === 'quiz') {
        camera.position.copy(controls.target).add(new THREE.Vector3(0, 0, 330))
        camera.up.set(0, 1, 0)
        camera.lookAt(controls.target)
      }
      camera.zoom = controls.maxZoom * .95
      camera.updateProjectionMatrix()
      controls.update()
      render()
    }
    const focusSample = () => {
      if (!specimen) return
      sampleFocused = true
      sampleZoomMultiplier = 1
      readingFocused = false
      sampleBounds().getCenter(controls.target)
      camera.position.copy(controls.target).add(props.workpiece?.measureType === 'inner'
        ? new THREE.Vector3(25, 170, 150)
        : new THREE.Vector3(35, 95, 180))
      camera.up.set(0, 1, 0)
      camera.lookAt(controls.target)
      fitSampleZoom()
      controls.update()
      render()
    }
    viewRef.current = { slider, depthRod, render, reset: () => { reset(); render() }, zoomBy, focusReading, focusSample, updateSample: specimen?.update, updateDisplay }
    resize()
    // A full 150 mm tool is too small to read on a phone. Start on the reading
    // area there; the explicit overview button still reveals the complete tool.
    if (specimen) focusSample()
    else if (presentation === 'quiz' || host.clientWidth < 480) focusReading()

    return () => {
      disposed = true
      viewRef.current = null
      observer.disconnect()
      controls.dispose()
      canvas.removeEventListener('pointerdown', down, true)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('keydown', keydown)
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach(material => material.dispose())
        }
      })
      textures.forEach(texture => texture.dispose())
      environment.dispose()
      renderer.dispose()
      canvas.remove()
    }
  }, [props.maxMm, props.resolution, digitalMode, props.workpiece, presentation])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.slider.position.x = props.position
    view.depthRod.position.x = 6 + (props.maxMm + 54) / 2 + props.position
    view.updateSample?.(props.position)
    if (presentation === 'quiz') view.focusReading()
    else view.render()
    onReady?.()
  }, [props.position, props.maxMm, props.workpiece, presentation, onReady])

  useEffect(() => {
    const view = viewRef.current
    if (view && props.digital) {
      view.updateDisplay?.(props.digital)
      view.render()
    }
  }, [props.digital])

  return <div data-presentation={props.presentation} className="relative w-full min-w-0 overflow-hidden bg-[#f3f5f6]">
    <div ref={hostRef} className="w-full min-w-0" style={{ height: presentation === 'quiz' ? 'clamp(100px, calc(100dvh - 480px), 340px)' : presentation === 'exam' ? 'clamp(100px, calc(100dvh - 590px), 320px)' : 'clamp(260px, 40vw, 410px)' }} />
    {presentation !== 'exam' && <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-white/80 bg-white/90 px-2 py-1 text-[9px] font-semibold tracking-wider text-slate-500 sm:left-3 sm:top-3 sm:text-[10px]">3D · THÉP KHÔNG GỈ · {props.maxMm} mm</div>}
    <div data-sample={props.workpiece ? true : undefined} className={`${controlStyles.viewActions} flex items-center sm:justify-end`}>
      {props.workpiece && !sampleContact
        ? <button type="button" onClick={() => viewRef.current?.focusSample()} className="min-w-0 flex-1 sm:flex-none"><Box aria-hidden="true" /><span>Vật mẫu</span></button>
        : <button type="button" data-reading-action="true" title={digitalMode ? 'Đọc LCD' : 'Đọc vạch'} aria-label={digitalMode ? 'Đọc LCD' : 'Đọc vạch'} onClick={() => viewRef.current?.focusReading()} className="min-w-0 flex-1 sm:flex-none"><Focus aria-hidden="true" /><span>{digitalMode ? 'Đọc LCD' : 'Đọc vạch'}</span></button>}
      {props.workpiece && sampleContact && <button type="button" title="Vật mẫu" aria-label="Xem vật mẫu" onClick={() => viewRef.current?.focusSample()} className="min-w-0 flex-1 sm:flex-none"><Box aria-hidden="true" /><span className="hidden sm:inline">Vật mẫu</span></button>}
      {props.viewActions}
      <div className={controlStyles.zoomGroup} role="group" aria-label="Thu phóng thước">
        <button type="button" aria-label="Thu nhỏ thước" onClick={() => viewRef.current?.zoomBy(1 / 1.3)}><Minus aria-hidden="true" /></button>
        <button type="button" aria-label="Phóng to thước" onClick={() => viewRef.current?.zoomBy(1.3)}><Plus aria-hidden="true" /></button>
      </div>
      <button type="button" aria-label="Toàn cảnh" title="Toàn cảnh" onClick={() => viewRef.current?.reset()} className="min-w-0 flex-1 sm:flex-none"><Maximize2 aria-hidden="true" /><span className={props.workpiece ? 'hidden sm:inline' : undefined}>Toàn cảnh</span></button>
    </div>
    {presentation !== 'quiz' && presentation !== 'exam' && <p className="pb-2 pt-1 text-[10px] leading-relaxed text-slate-500 sm:text-xs">{props.workpiece
      ? props.workpiece.measureType === 'outer' ? 'Kéo mỏ trượt hoặc chấm xanh để kẹp mẫu. Chạm khít sẽ chuyển xanh lá.'
        : props.workpiece.measureType === 'inner' ? `Kéo mỏ trên ra để chạm hai thành trong.${props.workpiece.id.startsWith('u-slot') ? '' : ' Thành trước hiển thị mờ để thấy mỏ đo.'}`
          : 'Mặt cắt đo sâu · Kéo chấm xanh ở đầu thanh đo tới đáy lỗ.'
      : <>{digitalMode ? 'Kéo cụm LCD để đo' : 'Kéo du xích để đo'} · <span className="sm:hidden">Chụm 2 ngón để thu/phóng</span><span className="hidden sm:inline">Kéo nền để xoay · Cuộn để phóng to</span></>}</p>}
    {failed && <div role="alert" className="absolute inset-0 flex items-center justify-center bg-slate-50 p-6 text-center text-sm text-slate-600">Trình duyệt chưa bật WebGL. Hãy bật tăng tốc đồ họa để hiển thị mô hình thước kẹp 3D.</div>}
  </div>
}
