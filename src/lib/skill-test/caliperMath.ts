// Mathematical calculation utilities for Vernier and Digital Calipers
// EPS-TOPIK Round 2 Skill Test Standards & Metrology Education

export type VernierResolution = 0.02 | 0.05 | 0.01

export interface VernierScaleConfig {
  resolution: VernierResolution
  totalDivisions: number
  pitchMm: number
  spanMm: number
  labelStep: number
  decimals: number
  description: string
  nameVi: string
}

export const VERNIER_CONFIGS: Record<VernierResolution, VernierScaleConfig> = {
  0.02: {
    resolution: 0.02,
    totalDivisions: 50,
    pitchMm: 0.98,
    spanMm: 49.0,
    labelStep: 5,
    decimals: 2,
    description: 'Thước cặp cơ khí 50 vạch du xích, độ chính xác cao 0.02mm (Khuyên dùng)',
    nameVi: '0.02 mm (Ưu tiên / Chuẩn cơ khí)',
  },
  0.05: {
    resolution: 0.05,
    totalDivisions: 20,
    pitchMm: 1.95,
    spanMm: 39.0,
    labelStep: 2,
    decimals: 2,
    description: 'Thước cặp 20 vạch du xích (chuẩn thi tay nghề EPS phổ biến)',
    nameVi: '0.05 mm (Chuẩn EPS)',
  },
  0.01: {
    resolution: 0.01,
    totalDivisions: 100,
    pitchMm: 0.49,
    spanMm: 49.0,
    labelStep: 10,
    decimals: 2,
    description: 'Thước cặp vi sai siêu chính xác 0.01mm (100 vạch chia)',
    nameVi: '0.01 mm (Độ chính xác cao)',
  },
}

export interface VernierReadingBreakdown {
  rawMm: number
  mainScaleMm: number
  vernierScaleMm: number
  vernierIndex: number
  resolution: VernierResolution
  totalDivisions: number
  coincidingMainMm: number
  isExactCoincidence: boolean
  config: VernierScaleConfig
}

/**
 * Calculates the exact breakdown for reading a mechanical vernier caliper.
 * Defaults to 0.02mm resolution as prioritized by the user.
 */
export function calculateVernierReading(
  positionMm: number,
  resolution: VernierResolution = 0.02
): VernierReadingBreakdown {
  const config = VERNIER_CONFIGS[resolution] || VERNIER_CONFIGS[0.02]
  const clampedMm = Math.max(0, Math.min(150, Math.round(positionMm * 1000) / 1000))
  
  // Main scale is the integer millimeter mark strictly to the left of (or at) vernier 0
  const mainScaleMm = Math.floor(clampedMm)
  
  // Remainder fraction in mm [0, 1.0)
  const remainderMm = clampedMm - mainScaleMm
  
  // Calculate which vernier tick best aligns
  const rawVernierIndex = remainderMm / resolution
  const vernierIndex = Math.min(config.totalDivisions, Math.max(0, Math.round(rawVernierIndex)))
  
  const vernierScaleMm = Math.round(vernierIndex * resolution * 100) / 100
  
  // Position on main scale where vernier tick coincides
  const vernierMarkPositionOnMain = clampedMm + vernierIndex * config.pitchMm
  const coincidingMainMm = Math.round(vernierMarkPositionOnMain * 2) / 2 // aligns to 0.5mm or 1.0mm ticks
  
  const isExactCoincidence = Math.abs(rawVernierIndex - vernierIndex) < 0.03

  return {
    rawMm: clampedMm,
    mainScaleMm,
    vernierScaleMm,
    vernierIndex,
    resolution,
    totalDivisions: config.totalDivisions,
    coincidingMainMm,
    isExactCoincidence,
    config,
  }
}

/**
 * Format caliper reading as standard string (e.g. "24.35 mm", "12.5 mm")
 */
export function formatMm(value: number, resolution: VernierResolution = 0.02): string {
  return `${value.toFixed(2)} mm`
}

/**
 * Convert millimeters to inches (for digital caliper)
 */
export function mmToInches(mm: number): string {
  const inches = mm / 25.4
  return `${inches.toFixed(4)} in`
}

/**
 * Generates a realistic random measurement value conforming to resolution step
 */
export function generateRandomCaliperValue(
  min = 1.0,
  max = 75.0,
  resolution: VernierResolution = 0.02
): number {
  const steps = Math.floor((max - min) / resolution)
  const randomStep = Math.floor(Math.random() * (steps + 1))
  const val = min + randomStep * resolution
  return Math.round(val * 100) / 100
}

/**
 * Generates 4 multiple choice options for quick reading drills
 */
export function generateMultipleChoiceOptions(
  correctValue: number,
  resolution: VernierResolution = 0.02
): number[] {
  const options = new Set<number>()
  options.add(correctValue)

  // Common reading mistakes learners make:
  // 1. Reading main scale off by +1mm / -1mm
  if (correctValue >= 1) {
    options.add(Math.round((correctValue + 1.0) * 100) / 100)
    options.add(Math.round((correctValue - 1.0) * 100) / 100)
  }
  
  // 2. Miscounting vernier mark by +/- 1 or 2 divisions
  const stepFactor = resolution * 2
  options.add(Math.round((correctValue + stepFactor) * 100) / 100)
  options.add(Math.round((correctValue - stepFactor) * 100) / 100)
  
  // 3. Misreading decimal
  const mainPart = Math.floor(correctValue)
  const fracPart = Math.round((correctValue - mainPart) * 100) / 100
  if (fracPart > 0) {
    options.add(Math.round((mainPart + (fracPart > 0.5 ? fracPart - 0.5 : fracPart + 0.5)) * 100) / 100)
  }

  // Fill up to 4 distinct options
  let safety = 0
  while (options.size < 4 && safety < 40) {
    safety++
    const delta = (Math.floor(Math.random() * 9) - 4) * resolution
    if (delta !== 0) {
      const candidate = Math.max(0, Math.round((correctValue + delta) * 100) / 100)
      options.add(candidate)
    }
  }

  return Array.from(options).slice(0, 4).sort(() => Math.random() - 0.5)
}
