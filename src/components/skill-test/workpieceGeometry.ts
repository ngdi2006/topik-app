import * as THREE from 'three'
import type { WorkshopObject } from '@/lib/skill-test/sampleObjects'

export interface WorkpieceGeometry {
  group: THREE.Group
  handle?: THREE.Mesh
  frame: THREE.Box3
  update: (opening: number) => void
}

/** Sample coordinates share the caliper's millimetre units and measuring planes. */
export function createWorkpieceGeometry(object: WorkshopObject, maxMm: number): WorkpieceGeometry {
  const group = new THREE.Group()
  group.name = `workpiece-${object.id}`
  const size = object.targetValueMm
  const metal = new THREE.MeshStandardMaterial({ color: '#7891a7', metalness: .72, roughness: .3, envMapIntensity: .8 })
  const face = new THREE.MeshStandardMaterial({ color: '#bdc7ce', metalness: .85, roughness: .23 })
  const recess = new THREE.MeshStandardMaterial({ color: '#344659', metalness: .6, roughness: .45 })
  const contactMaterial = new THREE.MeshBasicMaterial({ color: '#2563eb', depthTest: false })
  const targetMaterial = new THREE.MeshBasicMaterial({ color: '#a7b5c5', transparent: true, opacity: .7 })
  const addBox = (x: number, y: number, z: number, width: number, height: number, depth: number, material = metal) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
    mesh.position.set(x + width / 2, y + height / 2, z + depth / 2)
    group.add(mesh)
    return mesh
  }
  const addCylinder = (x: number, y: number, z: number, radius: number, length: number, material = metal, sides = 64) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, sides), material)
    mesh.position.set(x, y, z)
    group.add(mesh)
    return mesh
  }
  const ringShape = (outer: number, inner: number) => {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, inner, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    return shape
  }
  const ringHalf = (outer: number, inner: number, start: number) => {
    const end = start + Math.PI
    const shape = new THREE.Shape()
    shape.absarc(0, 0, outer, start, end, false)
    shape.lineTo(Math.cos(end) * inner, Math.sin(end) * inner)
    shape.absarc(0, 0, inner, end, start, true)
    shape.closePath()
    return shape
  }
  const addExtrusion = (shape: THREE.Shape, depth: number, material = metal) => {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 64 }), material)
    group.add(mesh)
    return mesh
  }
  const marker = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 12), contactMaterial)
  marker.name = 'contact-marker'
  marker.renderOrder = 4
  const dragTarget = new THREE.Mesh(new THREE.SphereGeometry(3.5, 14, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }))
  dragTarget.name = 'drag-hit-area'
  const fixedMarker = new THREE.Mesh(new THREE.SphereGeometry(.7, 14, 10), targetMaterial)
  fixedMarker.name = 'fixed-contact-marker'
  group.add(marker, fixedMarker, dragTarget)
  let markerY = -22
  let markerZ = 2
  let fixedX = 0
  let frame: THREE.Box3

  if (object.geometry === 'bolt-width' || object.geometry === 'bolt-length') {
    const length = object.features.boltLength ?? object.heightMm
    const headWidth = object.features.boltHeadWidth ?? object.widthMm
    const headHeight = object.features.boltHeadHeight ?? headWidth * .35
    const shaftDiameter = object.features.boltShaftDiameter ?? headWidth * .6
    const shaftLength = length - headHeight
    // Build the same bolt with its head's outer plane at local y=0 and tip at
    // y=-length. Its threaded shaft, rather than its hex head, is measured in
    // the width task; the length task still measures the complete bolt.
    const bolt = new THREE.Group()
    bolt.name = 'exam-bolt'
    const head = new THREE.Mesh(new THREE.CylinderGeometry(headWidth / Math.sqrt(3), headWidth / Math.sqrt(3), headHeight, 6), face)
    head.name = 'bolt-head'
    head.position.y = -headHeight / 2
    bolt.add(head)
    const core = new THREE.Mesh(new THREE.CylinderGeometry(shaftDiameter / 2 - .2, shaftDiameter / 2 - .2, shaftLength, 48), metal)
    core.name = 'bolt-shaft'
    core.position.y = -headHeight - shaftLength / 2
    bolt.add(core)
    const pitch = Math.max(1, shaftDiameter / 8)
    const contactTravel = shaftLength - 10
    const firstThreadStep = Math.ceil((pitch / 2 - contactTravel) / pitch * 24)
    const lastThreadStep = Math.floor((shaftLength - pitch / 2 - contactTravel) / pitch * 24)
    const threadVertices: number[] = []
    const threadIndices: number[] = []
    // A triangular helical ridge has a crest radius of exactly D/2. Its sampled
    // half-turns include both x tangents, including the moving contact at y=-22.
    for (let step = firstThreadStep; step <= lastThreadStep; step++) {
      const travel = contactTravel + step / 24 * pitch
      const angle = step / 24 * Math.PI * 2 + Math.PI
      for (const [radius, offset] of [[shaftDiameter / 2 - .4, -pitch * .32], [shaftDiameter / 2, 0], [shaftDiameter / 2 - .4, pitch * .32]]) {
        threadVertices.push(radius * Math.cos(angle), -headHeight - travel - offset, radius * Math.sin(angle))
      }
      if (step === lastThreadStep) continue
      const base = (step - firstThreadStep) * 3
      for (let side = 0; side < 2; side++) {
        threadIndices.push(base + side, base + side + 3, base + side + 1, base + side + 3, base + side + 4, base + side + 1)
      }
    }
    const threadGeometry = new THREE.BufferGeometry()
    threadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(threadVertices, 3))
    threadGeometry.setIndex(threadIndices)
    threadGeometry.computeVertexNormals()
    const thread = new THREE.Mesh(threadGeometry, face)
    thread.name = 'bolt-thread'
    bolt.add(thread)
    markerY = -22
    markerZ = 2
    if (object.geometry === 'bolt-length') {
      bolt.rotation.z = Math.PI / 2
      bolt.position.y = markerY
      frame = new THREE.Box3(new THREE.Vector3(-12, -40, -headWidth), new THREE.Vector3(length + 24, 18, headWidth))
    } else {
      // Tip up, head down: the larger head sits beyond the -36 mm jaw tips and
      // cannot stop the jaws closing on the threaded shaft. Even the shortest
      // generated bolt leaves its head's upper face below y=-37.9 mm.
      bolt.rotation.z = Math.PI
      bolt.position.set(shaftDiameter / 2, -12 - length, 0)
      markerZ = 0
      frame = new THREE.Box3(new THREE.Vector3(-16, -12 - length - 5, -headWidth), new THREE.Vector3(shaftDiameter + 30, 18, headWidth))
    }
    group.add(bolt)
  } else if (object.geometry === 'flange-outer' || object.geometry === 'flange-inner') {
    const outerRadius = (object.features.outerDiameter ?? object.widthMm) / 2
    const innerRadius = (object.features.innerDiameter ?? size) / 2
    const thickness = object.features.flangeThickness ?? 8
    const boltCircleRadius = (outerRadius + innerRadius) / 2
    const boltHoleRadius = Math.min(2.4, (outerRadius - innerRadius) / 7)
    const holes = Array.from({ length: 6 }, (_, index) => {
      const angle = Math.PI / 6 + index * Math.PI / 3
      return { x: Math.cos(angle) * boltCircleRadius, y: Math.sin(angle) * boltCircleRadius }
    })
    const addFlangeHoles = (shape: THREE.Shape, half?: number) => {
      for (const center of holes) {
        if (half !== undefined && (half === 0 ? center.y < 0 : center.y > 0)) continue
        const hole = new THREE.Path()
        hole.absarc(center.x, center.y, boltHoleRadius, 0, Math.PI * 2, true)
        shape.holes.push(hole)
      }
      return shape
    }
    const inner = object.geometry === 'flange-inner'
    fixedX = inner ? -6 : 0
    markerY = inner ? 30 : -22
    markerZ = inner ? .75 : 2
    const centerX = inner ? fixedX + innerRadius : outerRadius
    const baseY = markerY - thickness / 2
    const body = new THREE.Group()
    body.name = 'exam-flange'
    group.add(body)
    const flangeMesh = (shape: THREE.Shape, material: THREE.MeshStandardMaterial, name: string) => {
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 64 }), material)
      mesh.name = name
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(centerX, baseY, 0)
      body.add(mesh)
    }
    if (inner) {
      // A complete bore is retained; the front half is translucent so that both
      // internal knife edges and the actual opposite walls can be inspected.
      const transparentFace = face.clone()
      transparentFace.transparent = true
      transparentFace.opacity = .2
      transparentFace.depthWrite = false
      transparentFace.side = THREE.DoubleSide
      flangeMesh(addFlangeHoles(ringHalf(outerRadius, innerRadius, 0), 0), face, 'flange-back')
      flangeMesh(addFlangeHoles(ringHalf(outerRadius, innerRadius, Math.PI), 1), transparentFace, 'flange-front')
    } else {
      flangeMesh(addFlangeHoles(ringShape(outerRadius, innerRadius)), face, 'flange-body')
    }
    // Concentric machining lines make the flat annulus visible without changing
    // either of the cylindrical measuring surfaces.
    for (const radius of [innerRadius + .7, outerRadius - .8]) {
      const line = new THREE.Mesh(new THREE.TorusGeometry(radius, .1, 6, 96), recess)
      line.rotation.x = Math.PI / 2
      line.position.set(centerX, markerY + thickness / 2 + .03, 0)
      body.add(line)
    }
    frame = new THREE.Box3(
      new THREE.Vector3(centerX - outerRadius - 14, inner ? 7 : -40, -outerRadius - 4),
      new THREE.Vector3(centerX + outerRadius + 22, inner ? markerY + thickness / 2 + 12 : 18, outerRadius + 4),
    )
  } else if (object.measureType === 'outer') {
    if (object.category === 'fastener') {
      // Thread crests, rather than the shaft core, establish the exact outside diameter.
      const length = object.heightMm - 6
      addCylinder(size / 2, -8 - length / 2, 0, size / 2 - .35, length)
      const turns = Math.floor(length / 1.5)
      const points = Array.from({ length: turns * 20 + 1 }, (_, i) => {
        const angle = i / 20 * Math.PI * 2
        return new THREE.Vector3(size / 2 + (size / 2 - .22) * Math.cos(angle), -8 - i / 20 * 1.5, (size / 2 - .22) * Math.sin(angle))
      })
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), turns * 24, .22, 6, false), face))
      addCylinder(size / 2, -8 - length - 3, 0, size * .84, 6, face, 6)
    } else if (object.category === 'gauge') {
      addBox(0, -8 - object.heightMm, -6, size, object.heightMm, 12, face)
    } else if (object.id.startsWith('flange')) {
      const radius = object.heightMm / 2
      const shape = ringShape(radius, 5)
      for (let i = 0; i < 6; i++) {
        const hole = new THREE.Path()
        const angle = i * Math.PI / 3
        hole.absarc(Math.cos(angle) * radius * .7, Math.sin(angle) * radius * .7, 1.5, 0, Math.PI * 2, true)
        shape.holes.push(hole)
      }
      const mesh = addExtrusion(shape, size, face)
      mesh.rotation.y = Math.PI / 2
      mesh.position.y = -22
      markerY = -10
    } else {
      addCylinder(size / 2, -8 - object.heightMm / 2, 0, size / 2, object.heightMm)
      for (const y of [-10, -object.heightMm + 2]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(size / 2 - .1, .1, 6, 64), recess)
        band.rotation.x = Math.PI / 2
        band.position.set(size / 2, y, 0)
        group.add(band)
      }
    }
    frame = new THREE.Box3(new THREE.Vector3(-16, -object.heightMm - 12, -18), new THREE.Vector3(size + 30, 18, 18))
  } else if (object.measureType === 'inner') {
    fixedX = -6
    markerY = 32
    markerZ = .75
    if (object.id.startsWith('u-slot')) {
      const wall = Math.max(5, (object.widthMm - size) / 2)
      addBox(fixedX - wall, 22, -5, wall, 20, 10)
      addBox(fixedX + size, 22, -5, wall, 20, 10)
      addBox(fixedX - wall, 42, -5, size + 2 * wall, 5, 10, face)
    } else {
      // The bore axis points upwards. Its two inner tangents coincide with the
      // caliper's outward-facing knife edges at x=-6 and x=-6+opening.
      const outer = (object.features.outerDiameter ?? object.widthMm) / 2
      const seeThrough = metal.clone()
      seeThrough.transparent = true
      seeThrough.opacity = .2
      seeThrough.depthWrite = false
      seeThrough.side = THREE.DoubleSide
      // Retain the whole bore geometry, with its front half translucent so the
      // knife edges and their contact with the inside wall remain visible.
      for (const [start, material] of [[0, metal], [Math.PI, seeThrough]] as const) {
        const ring = addExtrusion(ringHalf(outer, size / 2, start), object.id.startsWith('ball-bearing') ? 8 : 12, material)
        ring.rotation.x = -Math.PI / 2
        ring.position.set(fixedX + size / 2, 26, 0)
      }
      if (object.id.startsWith('ball-bearing')) {
        const transparentFace = face.clone()
        transparentFace.transparent = true
        transparentFace.opacity = .2
        transparentFace.depthWrite = false
        transparentFace.side = THREE.DoubleSide
        for (const [start, material] of [[0, face], [Math.PI, transparentFace]] as const) {
          const race = addExtrusion(ringHalf(outer - .5, size / 2 + 1, start), .4, material)
          race.rotation.x = -Math.PI / 2
          race.position.set(fixedX + size / 2, 34, 0)
        }
        const ballRadius = (outer + size / 2) / 2
        for (let i = 0; i < 12; i++) {
          const angle = i * Math.PI / 6
          const ball = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 10), Math.sin(angle) > 0 ? transparentFace : face)
          ball.position.set(fixedX + size / 2 + Math.cos(angle) * ballRadius, 34.5, Math.sin(angle) * ballRadius)
          group.add(ball)
        }
      }
    }
    frame = new THREE.Box3(new THREE.Vector3(-23, 5, -23), new THREE.Vector3(size + 20, 53, 23))
  } else {
    // A longitudinal cutaway reveals the depth rod meeting the blind hole floor.
    fixedX = maxMm + 60
    markerY = 5.6
    markerZ = -.4
    const radius = object.widthMm / 2
    const bore = 4
    const section = new THREE.Shape()
    section.absarc(0, 0, radius, -Math.PI / 2, Math.PI / 2, false)
    section.lineTo(0, bore)
    section.absarc(0, 0, bore, Math.PI / 2, -Math.PI / 2, true)
    section.closePath()
    const wall = addExtrusion(section, size)
    wall.rotation.y = Math.PI / 2
    wall.position.set(fixedX, markerY, markerZ)
    const floor = addCylinder(fixedX + size + 2, markerY, markerZ, radius, 4, recess)
    floor.rotation.z = Math.PI / 2
    fixedMarker.position.set(fixedX + size, markerY, markerZ)
    frame = new THREE.Box3(new THREE.Vector3(fixedX - 12, -16, -19), new THREE.Vector3(fixedX + size + 12, 27, 19))
  }

  if (object.measureType === 'outer' || object.measureType === 'inner') fixedMarker.position.set(fixedX, markerY, markerZ)
  const update = (opening: number) => {
    marker.position.set(fixedX + opening, markerY, markerZ)
    dragTarget.position.copy(marker.position)
    contactMaterial.color.set(Math.abs(opening - size) < .005 ? '#10b981' : '#2563eb')
    group.userData.contact = Math.abs(opening - size) < .005
  }
  update(0)
  return { group, frame, handle: dragTarget, update }
}
