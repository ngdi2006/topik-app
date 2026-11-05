export interface GuidancePoint {
  x: number
  y: number
  /** Normalized device depth, as returned by THREE.Vector3.project(). */
  z: number
}

export interface CaliperGuidanceInput {
  anchor: GuidancePoint
  toward: GuidancePoint
  width: number
  height: number
  labelWidth: number
  labelHeight: number
  direction?: boolean
}

export interface CaliperGuidanceLayout {
  anchorX: number
  anchorY: number
  labelX: number
  labelY: number
  leaderPath: string
  directionPath: string
  swipeX: number
  swipeY: number
  compact: boolean
}

const LABEL_MARGIN = 8
const HALO_RADIUS = 18
const LABEL_GAP = 12
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const coordinate = (value: number) => Number(value.toFixed(3))
const point = (x: number, y: number) => `${coordinate(x)} ${coordinate(y)}`

/**
 * Lay out a guide in canvas-local CSS pixels. Only the label can move away from
 * its preferred position; the halo always identifies the real projected handle.
 */
export function layoutCaliperGuidance({
  anchor, toward, width, height, labelWidth, labelHeight, direction = true,
}: CaliperGuidanceInput): CaliperGuidanceLayout | null {
  const values = [anchor.x, anchor.y, anchor.z, toward.x, toward.y, toward.z, width, height, labelWidth, labelHeight]
  if (!values.every(Number.isFinite) || width < 80 || height < 64
    || labelWidth <= 0 || labelHeight <= 0
    || labelWidth > width - 2 * LABEL_MARGIN || labelHeight > height - 2 * LABEL_MARGIN
    || anchor.x < 0 || anchor.x > width || anchor.y < 0 || anchor.y > height
    || Math.abs(anchor.z) > 1 || Math.abs(toward.z) > 1) return null

  const dx = toward.x - anchor.x
  const dy = toward.y - anchor.y
  const distance = Math.hypot(dx, dy)
  if (direction && distance < 1) return null
  const unitX = distance >= 1 ? dx / distance : 0
  const unitY = distance >= 1 ? dy / distance : 0
  const labelX = clamp(anchor.x - labelWidth / 2, LABEL_MARGIN, width - LABEL_MARGIN - labelWidth)
  const labelY = clamp(anchor.y - labelHeight / 2, LABEL_MARGIN, height - LABEL_MARGIN - labelHeight)
  const gap = HALO_RADIUS + LABEL_GAP
  const candidates = [
    { x: labelX, y: anchor.y + gap },
    { x: labelX, y: anchor.y - gap - labelHeight },
    { x: anchor.x + gap, y: labelY },
    { x: anchor.x - gap - labelWidth, y: labelY },
  ].map(candidate => ({
    x: clamp(candidate.x, LABEL_MARGIN, width - LABEL_MARGIN - labelWidth),
    y: clamp(candidate.y, LABEL_MARGIN, height - LABEL_MARGIN - labelHeight),
  }))
  const clearance = (candidate: { x: number; y: number }) => Math.hypot(
    anchor.x - clamp(anchor.x, candidate.x, candidate.x + labelWidth),
    anchor.y - clamp(anchor.y, candidate.y, candidate.y + labelHeight),
  )
  // Prefer below, then above or beside the handle. If the viewport makes a
  // disjoint label impossible, choose the candidate with the least overlap.
  const label = candidates.find(candidate => clearance(candidate) >= HALO_RADIUS + 4)
    ?? candidates.reduce((best, candidate) => clearance(candidate) > clearance(best) ? candidate : best)

  const leaderX = clamp(anchor.x, label.x, label.x + labelWidth)
  const leaderY = clamp(anchor.y, label.y, label.y + labelHeight)
  const leaderLength = Math.hypot(leaderX - anchor.x, leaderY - anchor.y)
  let leaderPath = ''
  if (leaderLength > HALO_RADIUS + 2) {
    const vx = (leaderX - anchor.x) / leaderLength
    const vy = (leaderY - anchor.y) / leaderLength
    const endX = anchor.x + vx * HALO_RADIUS
    const endY = anchor.y + vy * HALO_RADIUS
    const curve = Math.min(18, leaderLength * .2)
    const controlX = clamp((leaderX + endX) / 2 - vy * curve, 0, width)
    const controlY = clamp((leaderY + endY) / 2 + vx * curve, 0, height)
    leaderPath = `M ${point(leaderX, leaderY)} Q ${point(controlX, controlY)} ${point(endX, endY)}`
  }

  let directionPath = ''
  if (direction) {
    // Intersect the projected slide axis with an inset viewport. Keeping the
    // arrow's shaft inset also leaves room for its six-pixel arrowhead.
    let minimum = -Infinity
    let maximum = Infinity
    for (const [origin, unit, extent] of [[anchor.x, unitX, width], [anchor.y, unitY, height]]) {
      if (Math.abs(unit) < 1e-8) {
        if (origin < LABEL_MARGIN || origin > extent - LABEL_MARGIN) { minimum = 1; maximum = 0; break }
      } else {
        const first = (LABEL_MARGIN - origin) / unit
        const last = (extent - LABEL_MARGIN - origin) / unit
        minimum = Math.max(minimum, Math.min(first, last))
        maximum = Math.min(maximum, Math.max(first, last))
      }
    }
    // Near an edge, place the arrow on the other side of the halo while keeping
    // its true direction. Never flip the instruction simply to make it fit.
    for (const [preferredStart, preferredEnd] of [[22, 60], [-60, -22]]) {
      const start = Math.max(preferredStart, minimum)
      const end = Math.min(preferredEnd, maximum)
      if (end - start < 28) continue
      const startX = anchor.x + unitX * start
      const startY = anchor.y + unitY * start
      const endX = anchor.x + unitX * end
      const endY = anchor.y + unitY * end
      const leftX = endX - unitX * 6 - unitY * 3.5
      const leftY = endY - unitY * 6 + unitX * 3.5
      const rightX = endX - unitX * 6 + unitY * 3.5
      const rightY = endY - unitY * 6 - unitX * 3.5
      directionPath = `M ${point(startX, startY)} L ${point(endX, endY)} M ${point(leftX, leftY)} L ${point(endX, endY)} L ${point(rightX, rightY)}`
      break
    }
  }

  return {
    anchorX: anchor.x,
    anchorY: anchor.y,
    labelX: label.x,
    labelY: label.y,
    leaderPath,
    directionPath,
    swipeX: direction ? unitX * 8 : 0,
    swipeY: direction ? unitY * 8 : 0,
    compact: height < 160,
  }
}
