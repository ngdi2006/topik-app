import type { WorkshopObject } from './sampleObjects'

export function workpieceOpeningLimits(object: WorkshopObject, maxMm = 150) {
  const contact = Math.max(0, Math.min(maxMm, object.targetValueMm))
  return object.measureType === 'outer'
    ? { min: contact, max: maxMm }
    : { min: 0, max: contact }
}

export function constrainWorkpieceOpening(value: number, object: WorkshopObject, maxMm = 150) {
  const { min, max } = workpieceOpeningLimits(object, maxMm)
  return Math.max(min, Math.min(max, value))
}

export function initialWorkpieceOpening(object: WorkshopObject, maxMm = 150) {
  if (object.measureType === 'outer') return Math.min(maxMm, object.targetValueMm + 12)
  if (object.measureType === 'inner') return Math.max(0, object.targetValueMm - 6)
  return 0
}
