import type { VernierResolution } from './caliperMath'
import type { WorkshopObject } from './sampleObjects'

export const EXAM_DURATION_SECONDS = 60
export const EXAM_TOLERANCE_MM = 0.20
export const EXAM_POINTS_PER_TASK = 25
export const EXAM_TASK_IDS = ['bolt-length', 'bolt-width', 'flange-inner', 'flange-outer'] as const
export type ExamTaskId = typeof EXAM_TASK_IDS[number]
export type CaliperExamAnswers = Partial<Record<ExamTaskId, string>>
export type CaliperExamContacts = Partial<Record<ExamTaskId, boolean>>

export interface CaliperExamTask {
  id: ExamTaskId
  labelKo: string
  labelVi: string
  instructionVi: string
  workpiece: WorkshopObject
  targetMm: number
}

export interface CaliperExamAttempt {
  id: string
  toolType: 'mechanical' | 'digital'
  resolution: VernierResolution
  tasks: CaliperExamTask[]
}

export interface CaliperExamTaskResult {
  taskId: ExamTaskId
  enteredCm: number | null
  expectedCm: number
  measured: boolean
  errorMm: number | null
  absoluteErrorMm: number | null
  withinTolerance: boolean
  points: number
  percentage: number
  isCorrect: boolean
}

export interface CaliperExamResult {
  results: CaliperExamTaskResult[]
  correctCount: number
  score: number
}

// Fictional specimens for practice; dimensions follow the selected caliper's step.
function randomDimension(minMm: number, maxMm: number, resolution: VernierResolution, previousMm?: number) {
  const first = Math.ceil(minMm / resolution)
  const count = Math.floor(maxMm / resolution) - first + 1
  let step = first + Math.floor(Math.random() * count)
  if (previousMm !== undefined && Math.abs(step * resolution - previousMm) < 0.0001) {
    step = first + (step - first + 1) % count
  }
  return Number((step * resolution).toFixed(2))
}

function quantize(valueMm: number, resolution: VernierResolution) {
  return Number((Math.round(valueMm / resolution) * resolution).toFixed(2))
}

export function generateCaliperExam(
  toolType: 'mechanical' | 'digital' = 'mechanical',
  previousAttempt?: CaliperExamAttempt,
): CaliperExamAttempt {
  const resolution: VernierResolution = toolType === 'digital' ? 0.01 : 0.02
  const previous = (id: ExamTaskId) => previousAttempt?.tasks.find(task => task.id === id)?.targetMm
  // Generate the measured thread diameter directly so every retake changes it.
  const boltShaftDiameter = randomDimension(7.2, 15.6, resolution, previous('bolt-width'))
  const boltHeadWidth = quantize(boltShaftDiameter / 0.6, resolution)
  const boltLength = randomDimension(35, 90, resolution, previous('bolt-length'))
  const boltHeadHeight = quantize(boltHeadWidth * 0.35, resolution)
  const flangeInner = randomDimension(14, 34, resolution, previous('flange-inner'))
  const flangeOuter = randomDimension(60, 105, resolution, previous('flange-outer'))
  const flangeThickness = randomDimension(6, 12, resolution)
  const id = `${toolType}-${boltHeadWidth}-${boltLength}-${flangeInner}-${flangeOuter}-${flangeThickness}`
  const boltFeatures = { boltLength, boltHeadWidth, boltShaftDiameter, boltHeadHeight, outerDiameter: boltShaftDiameter }
  const flangeFeatures = { outerDiameter: flangeOuter, innerDiameter: flangeInner, flangeThickness }
  const common = { koreanPronunciation: '', color: '#94a3b8', toleranceMm: EXAM_TOLERANCE_MM }

  const makeTask = (
    taskId: ExamTaskId,
    labelKo: string,
    labelVi: string,
    instructionVi: string,
    targetMm: number,
    isBolt: boolean,
  ): CaliperExamTask => ({
    id: taskId,
    labelKo,
    labelVi,
    instructionVi,
    targetMm,
    workpiece: {
      ...common,
      id: `exam-${id}-${taskId}`,
      geometry: taskId,
      nameVi: isBolt ? 'Bu lông lục giác' : 'Mặt bích',
      nameKo: isBolt ? '육각 볼트' : '플랜지',
      category: isBolt ? 'fastener' : 'mechanical',
      measureType: taskId === 'flange-inner' ? 'inner' : 'outer',
      targetValueMm: targetMm,
      description: instructionVi,
      instructionKo: '',
      instructionVi,
      widthMm: isBolt ? boltHeadWidth : flangeOuter,
      heightMm: isBolt ? boltLength : flangeOuter,
      features: isBolt ? { ...boltFeatures } : { ...flangeFeatures },
    },
  })

  return {
    id,
    toolType,
    resolution,
    tasks: [
      makeTask('bolt-length', '가로', 'Chiều ngang', 'Kẹp từ mặt ngoài đầu bu lông đến đầu mút thân ren bằng mỏ đo ngoài.', boltLength, true),
      makeTask('bolt-width', '세로', 'Chiều dọc', 'Dùng mỏ đo ngoài kẹp hai đỉnh ren đối diện trên thân bu lông.', boltShaftDiameter, true),
      makeTask('flange-inner', '내측', 'Đường kính trong', 'Mở hai mỏ đo trong để chạm hai thành đối diện của lỗ mặt bích.', flangeInner, false),
      makeTask('flange-outer', '외측', 'Đường kính ngoài', 'Kẹp hai mép ngoài đối diện của mặt bích bằng mỏ đo ngoài.', flangeOuter, false),
    ],
  }
}

/** The worksheet uses cm; a hundredth of a millimetre needs three cm decimals. */
export function formatExamCm(valueMm: number): string {
  return (valueMm / 10).toFixed(3)
}

/** Accept a single decimal value, including Vietnamese decimal commas. */
export function parseExamAnswerCm(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) && value >= 0 && Number.isFinite(value * 10) ? value : null
}

export function gradeCaliperExam(
  attempt: CaliperExamAttempt,
  answers: CaliperExamAnswers,
  contacts: CaliperExamContacts,
): CaliperExamResult {
  const results = attempt.tasks.map(task => {
    const enteredCm = parseExamAnswerCm(answers[task.id] ?? '')
    const measured = contacts[task.id] === true
    const errorMm = enteredCm === null ? null : enteredCm * 10 - task.targetMm
    const absoluteErrorMm = errorMm === null ? null : Math.abs(errorMm)
    const withinTolerance = absoluteErrorMm !== null && absoluteErrorMm <= EXAM_TOLERANCE_MM + 1e-7
    // Full credit inside ±0.20 mm; outside that band credit falls linearly to
    // zero at ±0.40 mm. A recorded measurement is required for any credit.
    const fraction = absoluteErrorMm === null || !measured ? 0 : withinTolerance ? 1
      : Math.max(0, Math.min(1, 1 - (absoluteErrorMm - EXAM_TOLERANCE_MM) / EXAM_TOLERANCE_MM))
    const points = Math.round(EXAM_POINTS_PER_TASK * fraction * 100) / 100
    return {
      taskId: task.id,
      enteredCm,
      expectedCm: Number(formatExamCm(task.targetMm)),
      measured,
      errorMm,
      absoluteErrorMm,
      withinTolerance,
      points,
      percentage: Math.round(points / EXAM_POINTS_PER_TASK * 10_000) / 100,
      isCorrect: measured && withinTolerance,
    }
  })
  const correctCount = results.filter(result => result.isCorrect).length
  const score = Math.round(results.reduce((sum, result) => sum + result.points, 0) * 100) / 100
  return { results, correctCount, score }
}
