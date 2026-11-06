import type { VernierResolution } from './caliperMath'
import type { WorkshopObject } from './sampleObjects'

// These are fictional practice specimens, with dimensions readable at the
// selected caliper resolution. Templates describe the kind, never the answer.
function randomDimension(minMm: number, maxMm: number, resolution: VernierResolution, previousMm?: number) {
  const stepHundredths = Math.round(resolution * 100)
  const first = Math.ceil((minMm * 100 - 1e-7) / stepHundredths)
  const last = Math.floor((maxMm * 100 + 1e-7) / stepHundredths)
  const count = last - first + 1
  let step = first + Math.floor(Math.random() * count)
  if (previousMm !== undefined && Math.abs(step * stepHundredths / 100 - previousMm) < 1e-7 && count > 1) {
    step = first + (step - first + 1) % count
  }
  return step * stepHundredths / 100
}

function quantize(valueMm: number, resolution: VernierResolution) {
  return Number((Math.round(valueMm / resolution) * resolution).toFixed(2))
}

/** A fresh, independent specimen. Pass the previous specimen to avoid repeats. */
export function generateWorkshopSample(
  template: WorkshopObject,
  resolution: VernierResolution,
  previous?: WorkshopObject,
): WorkshopObject {
  const sample: WorkshopObject = { ...template, features: { ...template.features } }
  const target = (min: number, max: number) => randomDimension(min, max, resolution, previous?.targetValueMm)
  const dimension = (min: number, max: number) => randomDimension(min, max, resolution)

  if (template.geometry === 'bolt-width' || template.geometry === 'bolt-length' || template.category === 'fastener') {
    const isLength = template.geometry === 'bolt-length'
    const shaftDiameter = isLength ? dimension(6, 16) : target(6, 16)
    const length = isLength ? target(36, 78) : dimension(36, 78)
    const headWidth = quantize(shaftDiameter / 0.6, resolution)
    const headHeight = quantize(headWidth * 0.35, resolution)
    sample.geometry = isLength ? 'bolt-length' : 'bolt-width'
    sample.targetValueMm = isLength ? length : shaftDiameter
    sample.widthMm = headWidth
    sample.heightMm = length
    sample.features = { outerDiameter: shaftDiameter, boltShaftDiameter: shaftDiameter, boltLength: length, boltHeadWidth: headWidth, boltHeadHeight: headHeight }
  } else if (template.geometry === 'flange-inner' || template.geometry === 'flange-outer') {
    const isInner = template.geometry === 'flange-inner'
    const inner = isInner ? target(14, 38) : dimension(14, 30)
    const outer = isInner ? dimension(Math.max(55, inner + 26), 105) : target(55, 105)
    sample.targetValueMm = isInner ? inner : outer
    sample.widthMm = outer
    sample.heightMm = outer
    sample.features = { outerDiameter: outer, innerDiameter: inner, flangeThickness: dimension(6, 12) }
  } else if (template.geometry === 'pipe-outer' || template.geometry === 'bearing-outer') {
    const isBearing = template.geometry === 'bearing-outer'
    const outer = target(isBearing ? 30 : 22, isBearing ? 72 : 60)
    const inner = isBearing ? dimension(outer * 0.35, outer * 0.55) : quantize(outer - 2 * dimension(2.5, 6), resolution)
    sample.targetValueMm = outer
    sample.widthMm = outer
    sample.heightMm = isBearing ? dimension(8, 16) : dimension(30, 65)
    sample.features = { outerDiameter: outer, innerDiameter: inner }
  } else if (template.id.startsWith('flange-thickness')) {
    const thickness = target(5, 14)
    const outer = dimension(36, 70)
    sample.targetValueMm = thickness
    sample.widthMm = thickness
    sample.heightMm = outer
    sample.features = { outerDiameter: outer, innerDiameter: dimension(10, outer * 0.4), flangeThickness: thickness }
  } else if (template.measureType === 'inner') {
    const isSlot = template.id.startsWith('u-slot')
    const isBearing = template.id.startsWith('ball-bearing')
    const inner = target(isSlot ? 12 : 10, isSlot ? 34 : isBearing ? 32 : 40)
    const outer = quantize(inner + 2 * dimension(isBearing ? 8 : isSlot ? 5 : 3, isBearing ? 16 : isSlot ? 9 : 7), resolution)
    sample.targetValueMm = inner
    sample.widthMm = outer
    sample.heightMm = isSlot ? dimension(26, 38) : isBearing ? dimension(8, 16) : dimension(30, 65)
    sample.features = isSlot ? { innerDiameter: inner } : { outerDiameter: outer, innerDiameter: inner }
  } else if (template.measureType === 'depth') {
    const depth = target(8, 35)
    const outer = dimension(24, 42)
    sample.targetValueMm = depth
    sample.widthMm = outer
    sample.heightMm = quantize(depth + dimension(8, 18), resolution)
    sample.features = { outerDiameter: outer, depth }
  } else if (template.measureType === 'step') {
    const stepHeight = target(5, 30)
    sample.targetValueMm = stepHeight
    sample.widthMm = dimension(35, 60)
    sample.heightMm = quantize(stepHeight + dimension(8, 15), resolution)
    sample.features = { stepHeight }
  } else {
    const width = target(template.category === 'gauge' ? 5 : 12, template.category === 'gauge' ? 30 : 42)
    sample.targetValueMm = width
    sample.widthMm = width
    sample.heightMm = dimension(26, 58)
    sample.features = { outerDiameter: width }
  }

  return sample
}
