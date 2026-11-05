import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const directory = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(directory, 'caliperGuidance.ts'), 'utf8')
const exported = {}
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exported })
const { layoutCaliperGuidance } = exported
const input = overrides => ({
  anchor: { x: 160, y: 100, z: 0 }, toward: { x: 140, y: 100, z: 0 },
  width: 400, height: 320, labelWidth: 180, labelHeight: 56, ...overrides,
})
const coordinates = value => value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
const near = (actual, expected) => assert(Math.abs(actual - expected) < .00001, `${actual} should equal ${expected}`)
const assertBounds = (layout, options) => {
  assert(layout)
  assert.equal(layout.anchorX, options.anchor.x)
  assert.equal(layout.anchorY, options.anchor.y)
  assert(layout.labelX >= 8 && layout.labelX + options.labelWidth <= options.width - 8)
  assert(layout.labelY >= 8 && layout.labelY + options.labelHeight <= options.height - 8)
  for (const value of [layout.leaderPath, layout.directionPath]) {
    const values = coordinates(value)
    for (let index = 0; index < values.length; index += 2) {
      assert(values[index] >= -.001 && values[index] <= options.width + .001, value)
      assert(values[index + 1] >= -.001 && values[index + 1] <= options.height + .001, value)
    }
  }
}

test('normal guide prefers below the actual handle and points along the projected slide axis', () => {
  const options = input()
  const layout = layoutCaliperGuidance(options)
  assertBounds(layout, options)
  assert.equal(layout.labelY, 130)
  assert.equal(layout.swipeX, -8)
  assert.equal(layout.swipeY, 0)
  const arrow = coordinates(layout.directionPath)
  assert.deepEqual(arrow.slice(0, 4), [138, 100, 100, 100])
  assert(layout.leaderPath.startsWith('M 160 130 Q'))
  assert.equal(layout.compact, false)
})

test('reversed and diagonal camera projections retain the real movement direction', () => {
  for (const vector of [{ x: 20, y: 0 }, { x: 3, y: -4 }, { x: -3, y: 4 }]) {
    const options = input({ toward: { x: 160 + vector.x, y: 100 + vector.y, z: 0 } })
    const layout = layoutCaliperGuidance(options)
    assertBounds(layout, options)
    const length = Math.hypot(vector.x, vector.y)
    near(layout.swipeX, vector.x / length * 8)
    near(layout.swipeY, vector.y / length * 8)
    const arrow = coordinates(layout.directionPath)
    assert((arrow[2] - arrow[0]) * vector.x + (arrow[3] - arrow[1]) * vector.y > 0)
  }
})

test('edge placement moves the arrow behind the handle without reversing its direction', () => {
  const options = input({ anchor: { x: 20, y: 100, z: 0 }, toward: { x: 0, y: 100, z: 0 } })
  const layout = layoutCaliperGuidance(options)
  assertBounds(layout, options)
  const arrow = coordinates(layout.directionPath)
  assert.deepEqual(arrow.slice(0, 4), [80, 100, 42, 100])
  assert.equal(layout.anchorX, 20)
  assert.equal(layout.swipeX, -8)
})

test('offscreen, clipped-depth, nonfinite and undersized inputs do not create a fake handle', () => {
  for (const changes of [
    { anchor: { x: -1, y: 100, z: 0 } }, { anchor: { x: 401, y: 100, z: 0 } },
    { anchor: { x: 160, y: -1, z: 0 } }, { anchor: { x: 160, y: 321, z: 0 } },
    { anchor: { x: 160, y: 100, z: -1.001 } }, { anchor: { x: 160, y: 100, z: 1.001 } },
    { toward: { x: NaN, y: 100, z: 0 } }, { toward: { x: 140, y: 100, z: Infinity } },
    { width: Infinity }, { width: 70, labelWidth: 40 }, { height: 60, labelHeight: 20 },
    { labelWidth: 390 }, { labelHeight: 310 }, { labelWidth: 0 }, { labelHeight: -1 },
  ]) assert.equal(layoutCaliperGuidance(input(changes)), null)
})

test('a degenerate projected direction hides directional guidance but permits a plain label', () => {
  const options = input({ toward: { x: 160.5, y: 100, z: 0 } })
  assert.equal(layoutCaliperGuidance(options), null)
  const plain = layoutCaliperGuidance({ ...options, direction: false })
  assertBounds(plain, options)
  assert.equal(plain.directionPath, '')
  assert.equal(plain.swipeX, 0)
  assert.equal(plain.swipeY, 0)
})

test('resize keeps labels inside the canvas and chooses compact labels below 160px', () => {
  for (const [width, height, labelWidth, labelHeight] of [[400, 320, 180, 56], [160, 100, 120, 28], [351, 159, 180, 28], [351, 160, 180, 56]]) {
    const options = input({ width, height, labelWidth, labelHeight, anchor: { x: width - 8, y: height - 8, z: 1 }, toward: { x: width - 28, y: height - 8, z: 1 } })
    const layout = layoutCaliperGuidance(options)
    assertBounds(layout, options)
    assert.equal(layout.compact, height < 160)
  }
})

test('mobile and desktop edge samples keep anchors exact, labels bounded and arrows truthful', () => {
  for (const [width, height, labelWidth, labelHeight] of [[351, 100, 180, 28], [366, 254, 200, 56], [900, 320, 220, 56]]) {
    for (const x of [0, 8, 20, width / 2, width - 20, width - 8, width]) {
      for (const y of [0, 8, height / 2, height - 8, height]) {
        for (const [dx, dy] of [[20, 0], [-20, 0], [12, 16], [-12, -16]]) {
          const options = input({ width, height, labelWidth, labelHeight, anchor: { x, y, z: -1 }, toward: { x: x + dx, y: y + dy, z: -1 } })
          const layout = layoutCaliperGuidance(options)
          assertBounds(layout, options)
          if (!layout.directionPath) continue
          const arrow = coordinates(layout.directionPath)
          const length = Math.hypot(arrow[2] - arrow[0], arrow[3] - arrow[1])
          assert(length >= 27.999 && length <= 56.001)
          assert((arrow[2] - arrow[0]) * dx + (arrow[3] - arrow[1]) * dy > 0)
        }
      }
    }
  }
})
