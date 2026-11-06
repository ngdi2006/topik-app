import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const directory = path.dirname(fileURLToPath(import.meta.url))
const sourceDirectory = path.resolve(directory, '../..')
const modules = new Map()
const maskedLcd = '••.••'

// Keep the real engine and React hooks. Only the WebGL, CSS and audio boundaries
// are replaced; the scene exposes the LCD text supplied by the digital engine.
function SceneProbe({ digital }) {
  return React.createElement('span', { 'data-testid': 'caliper-lcd' }, digital?.power ? digital.text : null)
}

function loadModule(filename) {
  if (modules.has(filename)) return modules.get(filename).exports
  const loadedModule = { exports: {} }
  modules.set(filename, loadedModule)
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText
  vm.runInNewContext(output, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: name => {
      if (name === 'next/dynamic') return () => SceneProbe
      if (name.endsWith('.css')) return {}
      if (name.endsWith('/audioEffects')) return {
        caliperAudio: { playBeep() {}, playClampSnap() {}, playSlideTick() {} },
      }
      if (name.startsWith('@/') || name.startsWith('./')) {
        const location = name.startsWith('@/')
          ? path.join(sourceDirectory, name.slice(2))
          : path.resolve(path.dirname(filename), name)
        return loadModule(`${location}.ts`)
      }
      return require(name)
    },
  }, { filename })
  return loadedModule.exports
}

const { MechanicalCaliperEngine } = loadModule(path.join(directory, 'MechanicalCaliperEngine.tsx'))
const { DigitalCaliperEngine } = loadModule(path.join(directory, 'DigitalCaliperEngine.tsx'))
const specimen = {
  id: 'visibility-specimen', category: 'mechanical', measureType: 'outer',
  targetValueMm: 42.36, widthMm: 42.36, heightMm: 40, features: {},
}
const specimenProps = { valueMm: specimen.targetValueMm, workpiece: specimen }

function findElement(root, predicate) {
  if (!root || typeof root !== 'object') return undefined
  if (Array.isArray(root)) {
    for (const child of root) {
      const result = findElement(child, predicate)
      if (result) return result
    }
    return undefined
  }
  return predicate(root) ? root : findElement(root.props?.children, predicate)
}

function button(tree, label) {
  const result = findElement(tree, node => node.type === 'button' && node.props['aria-label'] === label)
  assert(result, `Missing button: ${label}`)
  return result
}

function scene(tree) {
  const result = findElement(tree, node => node.type === SceneProbe)
  assert(result, 'The engine should render its caliper scene')
  return result
}

// Calling the engine in a fixed position lets the driver apply its public button
// callbacks as render-phase updates. Real React rerenders its useState hooks;
// these are component contract checks, not browser event/scheduling tests.
function renderEngine(Engine, props, actions = []) {
  const visibilityChanges = []
  let finalTree
  function Driver() {
    const [step, setStep] = React.useState(0)
    const [visible, setVisible] = React.useState(props.readingVisible)
    finalTree = Engine({
      ...props,
      readingVisible: visible,
      onReadingVisibilityChange: next => {
        visibilityChanges.push(next)
        props.onReadingVisibilityChange?.(next)
        if (props.readingVisible !== undefined) setVisible(next)
      },
    })
    if (step < actions.length) {
      actions[step](finalTree)
      setStep(step + 1)
    }
    return finalTree
  }
  const html = renderToStaticMarkup(React.createElement(Driver))
  return { html, tree: finalTree, visibilityChanges }
}

test('mechanical hidden reading also masks the tutor main scale, vernier and total', () => {
  const result = renderEngine(MechanicalCaliperEngine, { ...specimenProps, readingVisible: false }, [
    tree => button(tree, 'Hướng dẫn cách đọc thước').props.onClick(),
  ])
  assert(!result.html.includes('42.36'), 'The answer must stay absent with the tutor open')
  assert(!result.html.includes('>42 mm<'), 'The main scale answer must stay hidden')
  assert(!result.html.includes('+0.36'), 'The vernier answer must stay hidden')
  assert(result.html.includes('Bấm Hiện số'), 'The tutor should explain how to reveal the worked answer')
})

test('mechanical controlled reveal displays the answer and reports true', () => {
  const result = renderEngine(MechanicalCaliperEngine, { ...specimenProps, readingVisible: false }, [
    tree => button(tree, 'Hiện đáp án số').props.onClick(),
  ])
  assert.deepEqual(result.visibilityChanges, [true])
  assert(result.html.includes('42.36'))
  assert.equal(button(result.tree, 'Ẩn đáp án số').props['aria-pressed'], false)
})

test('mechanical re-hiding reports false and masks an already open tutor', () => {
  const result = renderEngine(MechanicalCaliperEngine, { ...specimenProps, readingVisible: true }, [
    tree => button(tree, 'Hướng dẫn cách đọc thước').props.onClick(),
    tree => button(tree, 'Ẩn đáp án số').props.onClick(),
  ])
  assert.deepEqual(result.visibilityChanges, [false])
  assert(!result.html.includes('42.36'))
  assert.equal(button(result.tree, 'Hiện đáp án số').props['aria-pressed'], true)
})

test('mechanical legacy hideReading retains its local reveal toggle', () => {
  const hidden = renderEngine(MechanicalCaliperEngine, { ...specimenProps, hideReading: true })
  assert(!hidden.html.includes('42.36'))
  const revealed = renderEngine(MechanicalCaliperEngine, { ...specimenProps, hideReading: true }, [
    tree => button(tree, 'Hiện đáp án số').props.onClick(),
  ])
  assert(revealed.html.includes('42.36'))
  assert(renderEngine(MechanicalCaliperEngine, specimenProps).html.includes('42.36'))
})

test('digital controlled hidden reading masks the actual LCD and result despite legacy visible flags', () => {
  const result = renderEngine(DigitalCaliperEngine, {
    ...specimenProps, readingVisible: false, hideReading: false, showLcdReading: true,
  })
  assert.equal(scene(result.tree).props.digital.text, maskedLcd)
  assert(!result.html.includes('42.36'))
  assert(!result.html.includes('LCD Thực tế:'))
})

test('digital controlled reveal overrides legacy hidden flags and reports true', () => {
  const result = renderEngine(DigitalCaliperEngine, {
    ...specimenProps, readingVisible: false, hideReading: true, showLcdReading: false,
  }, [tree => button(tree, 'Hiện đáp án số').props.onClick()])
  assert.deepEqual(result.visibilityChanges, [true])
  assert.equal(scene(result.tree).props.digital.text.trim(), '42.36')
  assert(result.html.includes('LCD Thực tế:'))
  assert(result.html.includes('42.36'))
})

test('digital re-hiding masks both outputs and a ZERO warning created while visible', () => {
  const result = renderEngine(DigitalCaliperEngine, { ...specimenProps, readingVisible: true }, [
    tree => scene(tree).props.digital.onZero(),
    tree => button(tree, 'Ẩn đáp án số').props.onClick(),
  ])
  assert.deepEqual(result.visibilityChanges, [false])
  assert.equal(scene(result.tree).props.digital.text, maskedLcd)
  assert(!result.html.includes('42.36'), 'A previously created ZERO warning must not leak the opening')
  assert(result.html.includes('Bạn bấm ZERO khi mỏ kẹp đang mở.'))
})

test('digital ZERO while already hidden keeps its warning and relative LCD answer masked', () => {
  const result = renderEngine(DigitalCaliperEngine, { ...specimenProps, readingVisible: false }, [
    tree => scene(tree).props.digital.onZero(),
  ])
  assert.equal(scene(result.tree).props.digital.text, maskedLcd)
  assert(!result.html.includes('42.36'))
  assert(!result.html.includes('LCD Thực tế:'))
})

for (const hideReading of [false, true]) {
  for (const showLcdReading of [false, true]) {
    test(`digital legacy visibility keeps readout=${!hideReading} and LCD=${showLcdReading} independent`, () => {
      const result = renderEngine(DigitalCaliperEngine, { ...specimenProps, hideReading, showLcdReading })
      assert.equal(result.html.includes('LCD Thực tế:'), !hideReading)
      assert.equal(scene(result.tree).props.digital.text.trim(), showLcdReading ? '42.36' : maskedLcd)
      assert(!findElement(result.tree, node => node.type === 'button' && node.props['aria-label'] === 'Hiện đáp án số'))
    })
  }
}
