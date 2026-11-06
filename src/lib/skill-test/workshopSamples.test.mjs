import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const resolutions = [.02, .05, .01]
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-7, `${actual} should equal ${expected}`)

function loadWorkshop(random) {
  const controlledMath = Object.create(Math)
  let seed = 762351
  controlledMath.random = random ?? (() => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  })
  const modules = ['sampleObjects', 'workshopSamples', 'workpieceContact'].map(name => {
    const exported = {}
    const source = fs.readFileSync(path.join(testDirectory, `${name}.ts`), 'utf8')
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
    vm.runInNewContext(compiled, { exports: exported, Math: controlledMath })
    return exported
  })
  return Object.assign({}, ...modules)
}

const ranges = {
  'hex-bolt-m12': [6, 16],
  'steel-cylinder-24-35': [12, 42],
  'pipe-inner-18-50': [10, 40],
  'ball-bearing-inner-15-00': [10, 32],
  'stepped-depth-shaft-14-80': [8, 35],
  'gauge-block-15-00': [5, 30],
  'u-slot-bracket-21-65': [12, 34],
  'flange-thickness-8-25': [5, 14],
  'bolt-length': [36, 78],
  'flange-outer': [55, 105],
  'flange-inner': [14, 38],
  'pipe-outer': [22, 60],
  'bearing-outer': [30, 72],
}

function assertPhysicalDimensions(sample, resolution) {
  for (const value of [sample.targetValueMm, sample.widthMm, sample.heightMm, ...Object.values(sample.features)]) {
    assert(Number.isFinite(value) && value > 0)
    near(value / resolution, Math.round(value / resolution))
  }
  const { outerDiameter: outer, innerDiameter: inner } = sample.features
  if (outer !== undefined && inner !== undefined) assert(outer > inner + 4)
  if (sample.geometry?.startsWith('bolt-')) {
    const features = sample.features
    assert(features.boltHeadWidth > features.boltShaftDiameter)
    assert(features.boltLength > features.boltHeadHeight + 20)
    assert.equal(features.outerDiameter, features.boltShaftDiameter)
    assert.equal(sample.widthMm, features.boltHeadWidth)
    assert.equal(sample.heightMm, features.boltLength)
    assert.equal(sample.targetValueMm, sample.geometry === 'bolt-length' ? features.boltLength : features.boltShaftDiameter)
  } else if (sample.geometry === 'flange-inner' || sample.geometry === 'flange-outer') {
    assert.equal(sample.targetValueMm, sample.geometry === 'flange-inner' ? inner : outer)
    assert.equal(sample.widthMm, outer)
    assert.equal(sample.heightMm, outer)
    assert(sample.features.flangeThickness >= 6 && sample.features.flangeThickness <= 12)
  } else if (sample.id.startsWith('flange-thickness')) {
    assert.equal(sample.targetValueMm, sample.features.flangeThickness)
    assert.equal(sample.widthMm, sample.features.flangeThickness)
    assert.equal(sample.heightMm, outer)
    assert(inner >= 10)
  } else if (sample.geometry === 'pipe-outer' || sample.geometry === 'bearing-outer') {
    assert.equal(sample.targetValueMm, outer)
    assert.equal(sample.widthMm, outer)
  } else if (sample.measureType === 'inner') {
    assert.equal(sample.targetValueMm, inner)
    assert(sample.widthMm > inner + 4)
  } else if (sample.measureType === 'depth') {
    assert.equal(sample.targetValueMm, sample.features.depth)
    assert(sample.heightMm >= sample.features.depth + 8)
  } else {
    assert.equal(sample.targetValueMm, sample.widthMm)
    assert.equal(sample.targetValueMm, outer)
  }
  if (sample.category === 'tubing') assert(sample.heightMm >= 30 && sample.heightMm <= 65)
  if (sample.geometry === 'bearing-outer' || sample.id.startsWith('ball-bearing')) assert(sample.heightMm >= 8 && sample.heightMm <= 16)
}

test('catalog distinguishes all 13 measurement tasks without revealing fixed dimensions in labels', () => {
  const { WORKSHOP_OBJECTS } = loadWorkshop()
  assert.equal(WORKSHOP_OBJECTS.length, 13)
  assert.equal(new Set(WORKSHOP_OBJECTS.map(object => object.id)).size, 13)
  for (const object of WORKSHOP_OBJECTS) {
    assert(ranges[object.id], object.id)
    assert(!/\d/.test(object.nameVi), object.nameVi)
    assert(!/\d/.test(object.nameKo), object.nameKo)
    assert(object.description && object.instructionVi && object.instructionKo)
  }
  for (const geometry of ['bolt-width', 'bolt-length', 'flange-inner', 'flange-outer', 'pipe-outer', 'bearing-outer']) {
    const object = WORKSHOP_OBJECTS.find(item => item.geometry === geometry)
    assert(object, geometry)
    assert.equal(object.measureType, geometry === 'flange-inner' ? 'inner' : 'outer')
  }
  assert.equal(new Set(WORKSHOP_OBJECTS.map(object => object.nameVi)).size, 13)
})

test('every specimen stays measurable and fresh at all mechanical and digital resolutions', () => {
  const { WORKSHOP_OBJECTS, generateWorkshopSample, initialWorkpieceOpening, constrainWorkpieceOpening } = loadWorkshop()
  for (const resolution of resolutions) {
    for (const template of WORKSHOP_OBJECTS) {
      let previous
      for (let iteration = 0; iteration < 500; iteration++) {
        const sample = generateWorkshopSample(template, resolution, previous)
        const [min, max] = ranges[template.id]
        assert(sample.targetValueMm >= min && sample.targetValueMm <= max)
        assert.equal(sample.id, template.id)
        assert.equal(sample.measureType, template.measureType)
        assert.notEqual(sample, template)
        assert.notEqual(sample.features, template.features)
        if (previous) {
          assert.notEqual(sample.targetValueMm, previous.targetValueMm)
          assert.notEqual(sample.features, previous.features)
        }
        assertPhysicalDimensions(sample, resolution)
        const start = initialWorkpieceOpening(sample)
        if (sample.measureType === 'outer') {
          assert(start > sample.targetValueMm)
          assert.equal(constrainWorkpieceOpening(-100, sample), sample.targetValueMm)
          assert.equal(constrainWorkpieceOpening(200, sample), 150)
        } else {
          assert(start < sample.targetValueMm)
          assert.equal(constrainWorkpieceOpening(-100, sample), 0)
          assert.equal(constrainWorkpieceOpening(200, sample), sample.targetValueMm)
        }
        assert.equal(constrainWorkpieceOpening(sample.targetValueMm, sample), sample.targetValueMm)
        previous = sample
      }
    }
  }
})

test('new attempts cannot repeat an answer even when random always selects either range endpoint', () => {
  for (const random of [() => 0, () => 1 - Number.EPSILON]) {
    const { WORKSHOP_OBJECTS, generateWorkshopSample } = loadWorkshop(random)
    for (const resolution of resolutions) {
      for (const template of WORKSHOP_OBJECTS) {
        let previous = generateWorkshopSample(template, resolution)
        for (let iteration = 0; iteration < 20; iteration++) {
          const sample = generateWorkshopSample(template, resolution, previous)
          assert.notEqual(sample.targetValueMm, previous.targetValueMm)
          assertPhysicalDimensions(sample, resolution)
          previous = sample
        }
      }
    }
  }
})

test('changing precision creates an independent aligned sample and leaves templates/history intact', () => {
  const { WORKSHOP_OBJECTS, generateWorkshopSample } = loadWorkshop()
  for (const template of WORKSHOP_OBJECTS) {
    Object.freeze(template.features)
    Object.freeze(template)
    const originalTemplate = JSON.stringify(template)
    let previous = generateWorkshopSample(template, .01)
    for (const resolution of [.05, .02, .01]) {
      Object.freeze(previous.features)
      Object.freeze(previous)
      const originalPrevious = JSON.stringify(previous)
      const sample = generateWorkshopSample(template, resolution, previous)
      assert.notEqual(sample.targetValueMm, previous.targetValueMm)
      assertPhysicalDimensions(sample, resolution)
      sample.features.outerDiameter = 999
      assert.equal(JSON.stringify(template), originalTemplate)
      assert.equal(JSON.stringify(previous), originalPrevious)
      previous = generateWorkshopSample(template, resolution, previous)
    }
  }
})
