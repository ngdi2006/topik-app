import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))

// Load the pure TS module without requiring a separate app test runner.
function loadExam(random) {
  const source = fs.readFileSync(path.join(testDirectory, 'caliperExam.ts'), 'utf8')
  const exported = {}
  const controlledMath = Object.create(Math)
  let seed = 84312
  controlledMath.random = random ?? (() => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  })
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(compiled, { exports: exported, Math: controlledMath })
  return exported
}

const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-7, `${actual} should equal ${expected}`)

test('random specimens share dimensions and every measured target changes on retake', () => {
  const { generateCaliperExam } = loadExam()
  for (const tool of ['mechanical', 'digital']) {
    let previous
    for (let iteration = 0; iteration < 2500; iteration++) {
      const attempt = generateCaliperExam(tool, previous)
      assert.equal(attempt.tasks.length, 4)
      assert.equal(new Set(attempt.tasks.map(task => task.id)).size, 4)
      const [width, length, inner, outer] = attempt.tasks
      assert.equal(width.targetMm, width.workpiece.features.boltShaftDiameter)
      assert.equal(width.targetMm, width.workpiece.features.outerDiameter)
      assert(width.workpiece.features.boltHeadWidth > width.targetMm)
      assert(length.targetMm > width.workpiece.features.boltHeadHeight)
      assert.deepEqual(width.workpiece.features, length.workpiece.features)
      assert.deepEqual(inner.workpiece.features, outer.workpiece.features)
      assert(inner.targetMm + 15 < outer.targetMm)
      for (const task of attempt.tasks) {
        assert.equal(task.workpiece.targetValueMm, task.targetMm)
        assert.equal(task.workpiece.geometry, task.id)
        assert.equal(task.workpiece.toleranceMm, .20)
        near(task.targetMm / attempt.resolution, Math.round(task.targetMm / attempt.resolution))
        if (previous) assert.notEqual(task.targetMm, previous.tasks.find(old => old.id === task.id).targetMm)
      }
      previous = attempt
    }
  }
})

test('retakes change every target even when randomness repeatedly chooses the same value', () => {
  const { generateCaliperExam } = loadExam(() => 0)
  let previous = generateCaliperExam()
  for (let iteration = 0; iteration < 20; iteration++) {
    const attempt = generateCaliperExam('mechanical', previous)
    assert.notEqual(attempt.id, previous.id)
    assert(attempt.tasks.every((task, index) => task.targetMm !== previous.tasks[index].targetMm))
    previous = attempt
  }
})

test('cm worksheet accepts decimal commas and rejects malformed or non-finite values', () => {
  const { parseExamAnswerCm, formatExamCm } = loadExam()
  for (const [text, expected] of [['1,234', 1.234], [' 1.234 ', 1.234], [',5', .5], ['.5', .5], ['0', 0]]) {
    assert.equal(parseExamAnswerCm(text), expected)
  }
  for (const text of ['', ' ', '-1', '+1', 'Infinity', 'NaN', '1e2', '1,2,3', '1.2.3', '1.2 mm', '1 2', '1/2', '1.', '9'.repeat(400)]) {
    assert.equal(parseExamAnswerCm(text), null, text)
  }
  assert.equal(formatExamCm(12.34), '1.234')
})

test('both tools score ±0.20 mm in full, ±0.30 mm half and ±0.40 mm zero', () => {
  const { generateCaliperExam, gradeCaliperExam } = loadExam()
  for (const tool of ['mechanical', 'digital']) {
    const attempt = generateCaliperExam(tool)
    const contacts = Object.fromEntries(attempt.tasks.map(task => [task.id, true]))
    for (const sign of [-1, 1]) {
      for (const [magnitude, points] of [[0, 25], [.10, 25], [.19, 25], [.20, 25], [.21, 23.75], [.30, 12.5], [.39, 1.25], [.40, 0], [.41, 0]]) {
        const answers = Object.fromEntries(attempt.tasks.map(task => [task.id, ((task.targetMm + magnitude * sign) / 10).toFixed(6).replace('.', ',')]))
        const result = gradeCaliperExam(attempt, answers, contacts)
        assert.equal(result.score, points * 4)
        assert.equal(result.correctCount, magnitude <= .20 ? 4 : 0)
        for (const row of result.results) {
          near(row.errorMm, magnitude * sign)
          near(row.absoluteErrorMm, magnitude)
          assert.equal(row.points, points)
          assert.equal(row.percentage, points * 4)
          assert.equal(row.withinTolerance, magnitude <= .20)
          assert.equal(row.isCorrect, magnitude <= .20)
        }
      }
    }
  }
})

test('invalid or unmeasured entries earn zero and total equals the displayed row points', () => {
  const { generateCaliperExam, gradeCaliperExam, formatExamCm } = loadExam()
  const attempt = generateCaliperExam()
  const answers = Object.fromEntries(attempt.tasks.map(task => [task.id, formatExamCm(task.targetMm)]))
  const contacts = Object.fromEntries(attempt.tasks.map(task => [task.id, true]))
  assert.equal(gradeCaliperExam(attempt, answers, {}).score, 0)
  assert.equal(gradeCaliperExam(attempt, {}, contacts).score, 0)
  const missingMeasurement = gradeCaliperExam(attempt, answers, {})
  assert(missingMeasurement.results.every(row => !row.isCorrect && row.withinTolerance && row.points === 0))
  const malformed = gradeCaliperExam(attempt, { 'bolt-width': '12mm' }, contacts)
  assert(malformed.results.every(row => row.errorMm === null && row.absoluteErrorMm === null && !row.withinTolerance && row.points === 0))

  const errors = [.2337, .2671, .3193, .3719]
  for (let index = 0; index < attempt.tasks.length; index++) {
    const task = attempt.tasks[index]
    answers[task.id] = ((task.targetMm + errors[index]) / 10).toFixed(7)
  }
  const partial = gradeCaliperExam(attempt, answers, contacts)
  const displayedTotal = Math.round(partial.results.reduce((sum, row) => sum + row.points, 0) * 100) / 100
  assert.equal(partial.score, displayedTotal)
  assert(partial.score > 0 && partial.score < 100)
  assert.equal(partial.correctCount, 0)
})
