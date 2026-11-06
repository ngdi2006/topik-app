import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import ts from 'typescript'

const directory = path.dirname(fileURLToPath(import.meta.url))
const exported = {}
const source = fs.readFileSync(path.join(directory, 'workpieceGeometry.ts'), 'utf8')
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  exports: exported,
  require: name => {
    assert.equal(name, 'three')
    return THREE
  },
})
const { createWorkpieceGeometry } = exported
const near = (actual, expected) => assert(Math.abs(actual - expected) < .0001, `${actual} should equal ${expected}`)
const sample = changes => ({
  id: 'sample', category: 'mechanical', measureType: 'outer', targetValueMm: 24.36,
  widthMm: 24.36, heightMm: 40, features: {}, ...changes,
})
const dispose = model => model.group.traverse(child => {
  child.geometry?.dispose()
  const materials = Array.isArray(child.material) ? child.material : [child.material]
  for (const material of materials) material?.dispose()
})
const frameContains = model => {
  model.group.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(model.group)
  const frame = model.frame.clone().expandByScalar(.0001)
  assert(frame.containsBox(bounds), `frame ${JSON.stringify(frame)} does not contain ${JSON.stringify(bounds)}`)
}
const cast = (mesh, origin, direction) => {
  mesh.updateMatrixWorld(true)
  return new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction)).intersectObject(mesh, true)
}

test('outside pipe and bearing keep a real bore and exact lower-jaw measuring surfaces', () => {
  for (const [geometry, diameter, bore, height] of [
    ['pipe-outer', 22.4, 14, 65], ['pipe-outer', 56.02, 32.8, 30],
    ['bearing-outer', 64, 23.2, 8], ['bearing-outer', 30.5, 12.4, 16],
  ]) {
    const model = createWorkpieceGeometry(sample({ geometry, targetValueMm: diameter, widthMm: diameter, heightMm: height, features: { outerDiameter: diameter, innerDiameter: bore } }), 150)
    try {
      model.update(diameter)
      const body = model.group.getObjectByName(geometry === 'pipe-outer' ? 'pipe-body' : 'bearing-body')
      const bounds = new THREE.Box3().setFromObject(body)
      near(bounds.min.x, 0)
      near(bounds.max.x, diameter)
      near(bounds.max.y - bounds.min.y, height)
      near(bounds.max.z - bounds.min.z, diameter)
      assert.equal(cast(body, [diameter / 2, bounds.max.y + 10, 0], [0, -1, 0]).length, 0, 'the bore must remain open')
      assert(cast(body, [diameter / 2 + (diameter + bore) / 4, bounds.max.y + 10, 0], [0, -1, 0]).length > 0)
      const marker = model.group.getObjectByName('contact-marker')
      const fixed = model.group.getObjectByName('fixed-contact-marker')
      near(marker.position.x, diameter)
      near(fixed.position.x, 0)
      near(marker.position.y, -22)
      near(marker.position.z, 0)
      const contact = cast(body, [diameter + 5, -22, 0], [-1, 0, 0])[0]
      assert(contact, 'the moving jaw must touch the outside wall')
      near(contact.point.x, diameter)
      assert.equal(model.group.userData.contact, true)
      frameContains(model)
    } finally { dispose(model) }
  }
})

test('flange outside and inside variants preserve their different contact planes', () => {
  for (const geometry of ['flange-outer', 'flange-inner']) {
    const diameter = 105
    const bore = 39.6
    const value = geometry === 'flange-outer' ? diameter : bore
    const model = createWorkpieceGeometry(sample({ geometry, targetValueMm: value, widthMm: diameter, heightMm: 14, features: { outerDiameter: diameter, innerDiameter: bore, flangeThickness: 14 } }), 150)
    try {
      model.update(value)
      const fixed = model.group.getObjectByName('fixed-contact-marker')
      const marker = model.group.getObjectByName('contact-marker')
      near(fixed.position.x, geometry === 'flange-inner' ? -6 : 0)
      near(marker.position.x - fixed.position.x, value)
      near(marker.position.y, geometry === 'flange-inner' ? 30 : -22)
      const body = model.group.getObjectByName('exam-flange')
      const bounds = new THREE.Box3().setFromObject(body)
      near(bounds.max.x - bounds.min.x, diameter)
      const centerX = geometry === 'flange-inner' ? -6 + bore / 2 : diameter / 2
      assert.equal(cast(body, [centerX, bounds.max.y + 10, 0], [0, -1, 0]).length, 0)
      frameContains(model)
    } finally { dispose(model) }
  }
})

test('flange thickness follows its randomized bore and keeps the contact on the annular face', () => {
  for (const [diameter, bore] of [[36, 10], [70, 10], [70, 28]]) {
    const model = createWorkpieceGeometry(sample({ id: 'flange-thickness-8-25', targetValueMm: 13.8, widthMm: 13.8, heightMm: diameter, features: { outerDiameter: diameter, innerDiameter: bore, flangeThickness: 13.8 } }), 150)
    try {
      model.update(13.8)
      const body = model.group.children.find(child => child.geometry?.type === 'ExtrudeGeometry')
      const bounds = new THREE.Box3().setFromObject(body)
      near(bounds.min.x, 0)
      near(bounds.max.x, 13.8)
      near(bounds.max.y - bounds.min.y, diameter)
      near(bounds.max.y, -8)
      assert.equal(cast(body, [20, body.position.y, 0], [-1, 0, 0]).length, 0, 'the central hole is not solid metal')
      const marker = model.group.getObjectByName('contact-marker').position
      assert(marker.y >= -36 && marker.y <= 0)
      const hit = cast(body, [20, marker.y, marker.z], [-1, 0, 0])[0]
      assert(hit, 'contact must land outside the central hole')
      near(hit.point.x, 13.8)
      frameContains(model)
    } finally { dispose(model) }
  }
})

test('large inside samples retain their specified height and fit the camera frame', () => {
  for (const [id, height] of [['pipe-inner-18-50', 65], ['ball-bearing-inner-15-00', 16]]) {
    const model = createWorkpieceGeometry(sample({ id, measureType: 'inner', targetValueMm: 40, widthMm: 84, heightMm: height, features: { outerDiameter: 84, innerDiameter: 40 } }), 150)
    try {
      model.update(40)
      const body = model.group.children.find(child => child.geometry?.type === 'ExtrudeGeometry')
      const bounds = new THREE.Box3().setFromObject(body)
      near(bounds.min.y, 26)
      near(bounds.max.y - bounds.min.y, height)
      frameContains(model)
    } finally { dispose(model) }
  }
})

test('random-size slot, solid shaft, gauge and depth specimens remain fully framed', () => {
  for (const object of [
    sample({ id: 'u-slot-bracket-21-65', measureType: 'inner', targetValueMm: 39.8, widthMm: 65, heightMm: 30, features: { innerDiameter: 39.8 } }),
    sample({ id: 'steel-cylinder-24-35', targetValueMm: 64, widthMm: 64, heightMm: 65 }),
    sample({ id: 'gauge-block-15-00', category: 'gauge', targetValueMm: 35, widthMm: 35, heightMm: 45 }),
    sample({ id: 'stepped-depth-shaft-14-80', measureType: 'depth', targetValueMm: 35, widthMm: 60, heightMm: 40, features: { outerDiameter: 60, depth: 35 } }),
  ]) {
    const model = createWorkpieceGeometry(object, 150)
    try {
      model.update(object.targetValueMm)
      frameContains(model)
    } finally { dispose(model) }
  }
})

test('all generated specimen types fit their frame at each resolution and dimension extreme', () => {
  const libraryDirectory = path.resolve(directory, '../../lib/skill-test')
  const load = (name, random) => {
    const values = {}
    const controlledMath = Object.create(Math)
    controlledMath.random = () => random
    const code = fs.readFileSync(path.join(libraryDirectory, `${name}.ts`), 'utf8')
    vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: values, Math: controlledMath })
    return values
  }
  const { WORKSHOP_OBJECTS } = load('sampleObjects', .5)
  for (const random of [0, .5, .999999]) {
    const { generateWorkshopSample } = load('workshopSamples', random)
    for (const resolution of [.02, .05, .01]) {
      for (const template of WORKSHOP_OBJECTS) {
        const object = generateWorkshopSample(template, resolution)
        const model = createWorkpieceGeometry(object, 150)
        try {
          model.update(object.targetValueMm)
          assert.equal(model.group.userData.contact, true)
          if (template.id.startsWith('flange-thickness')) {
            const body = model.group.children.find(child => child.geometry?.type === 'ExtrudeGeometry')
            assert(new THREE.Box3().setFromObject(body).max.y <= -8 + .0001, 'the flange must stay below the caliper beam')
            const marker = model.group.getObjectByName('contact-marker').position
            assert(marker.y >= -36 && marker.y <= 0)
          }
          frameContains(model)
        } finally { dispose(model) }
      }
    }
  }
})
