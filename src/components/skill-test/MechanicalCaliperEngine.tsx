'use client'

import controlStyles from './caliperControls.module.css'
import React, { useState, useRef, useCallback, useMemo } from 'react'
import {
  calculateVernierReading,
  VernierResolution,
} from '@/lib/skill-test/caliperMath'
import dynamic from 'next/dynamic'
import type { WorkshopObject } from '@/lib/skill-test/sampleObjects'
import { constrainWorkpieceOpening, workpieceOpeningLimits } from '@/lib/skill-test/workpieceContact'
import { caliperAudio } from '@/lib/skill-test/audioEffects'
import {
  Lock,
  Unlock,
  RotateCcw,
  Info,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react'

const MechanicalCaliper3D = dynamic(() => import('./MechanicalCaliper3D'), {
  ssr: false,
  loading: () => <div className="flex h-[410px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">Đang tải thước kẹp 3D...</div>,
})

interface MechanicalCaliperEngineProps {
  valueMm?: number
  onChangeMm?: (value: number) => void
  readOnly?: boolean
  hideReading?: boolean
  targetClampMm?: number
  maxMm?: number
  resolution?: VernierResolution
  onResolutionChange?: (resolution: VernierResolution) => void
  toolbarActions?: React.ReactNode
  workpiece?: WorkshopObject
  onClamped?: (value: number) => void
}

export function MechanicalCaliperEngine({
  valueMm = 18.32,
  onChangeMm,
  readOnly = false,
  hideReading = false,
  targetClampMm,
  maxMm = 150, // Standard 150mm industrial caliper
  resolution: initialResolution = 0.02, // Mitutoyo / GuangLu 0.02mm standard
  onResolutionChange,
  toolbarActions,
  workpiece,
  onClamped,
}: MechanicalCaliperEngineProps) {
  const [position, setPosition] = useState<number>(() => workpiece ? constrainWorkpieceOpening(valueMm, workpiece, maxMm) : valueMm)
  const [resolution, setResolution] = useState<VernierResolution>(initialResolution)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [showTutorExplanation, setShowTutorExplanation] = useState<boolean>(false)
  const [showReadingResult, setShowReadingResult] = useState<boolean>(!hideReading)

  const [previousValueMm, setPreviousValueMm] = useState(valueMm)
  if (valueMm !== previousValueMm) {
    setPreviousValueMm(valueMm)
    setPosition(workpiece ? constrainWorkpieceOpening(valueMm, workpiece, maxMm) : Math.max(0, Math.min(maxMm, valueMm)))
  }

  const lastAudioTickRef = useRef<number>(position)
  const contactRef = useRef(false)
  const openingLimits = workpiece ? workpieceOpeningLimits(workpiece, maxMm) : { min: 0, max: maxMm }

  const reading = useMemo(() => {
    return calculateVernierReading(position, resolution)
  }, [position, resolution])

  const handleUpdatePosition = useCallback(
    (newPos: number) => {
      if (isLocked || readOnly) return
      let clamped = Math.max(0, Math.min(maxMm, Number((Math.round(newPos / resolution) * resolution).toFixed(2))))
      if (workpiece) clamped = constrainWorkpieceOpening(clamped, workpiece, maxMm)

      // Snap to target clamp object if defined
      if (targetClampMm !== undefined) {
        if (Math.abs(clamped - targetClampMm) <= 0.25) {
          clamped = targetClampMm
          if (!contactRef.current) {
            caliperAudio.playClampSnap()
            onClamped?.(clamped)
          }
        }
      }
      contactRef.current = targetClampMm !== undefined && Math.abs(clamped - targetClampMm) < .005

      setPosition(clamped)
      onChangeMm?.(clamped)

      if (Math.abs(clamped - lastAudioTickRef.current) >= 0.5) {
        caliperAudio.playSlideTick()
        lastAudioTickRef.current = clamped
      }
    },
    [isLocked, readOnly, resolution, maxMm, workpiece, targetClampMm, onChangeMm, onClamped]
  )

  const stepAdjust = (delta: number) => {
    if (readOnly || isLocked) return
    const next = Math.round((position + delta) * 100) / 100
    handleUpdatePosition(next)
  }

  return (
    <div className="w-full min-w-0 select-none">
      <div className={`${controlStyles.toolbar} mb-2 flex min-w-0 items-center gap-1.5`}>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {toolbarActions}
          {/* Lock / Unlock Screw */}
          <button
            onClick={() => {
              setIsLocked(!isLocked)
              caliperAudio.playBeep(isLocked ? 1200 : 800)
            }}
            aria-label={isLocked ? 'Mở khóa vít hãm' : 'Khóa vít hãm'}
            aria-pressed={isLocked}
            data-tone="warning"
            className={`flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition sm:text-xs ${
              isLocked
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title={isLocked ? 'Vít hãm đang khóa' : 'Vít hãm đang mở'}
          >
            {isLocked ? (
              <>
                <Lock className="size-3.5 text-amber-600" />
                <span>Khóa</span>
              </>
            ) : (
              <>
                <Unlock className="size-3.5 text-slate-400" />
                <span>Mở</span>
              </>
            )}
          </button>

          {/* Reset button */}
          {!workpiece && <button
            onClick={() => handleUpdatePosition(0)}
            disabled={readOnly || isLocked}
            className="flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 sm:text-xs"
            title="Đóng khít thước về 0.00"
          >
            <RotateCcw className="size-3.5" />
            <span>Về 0</span>
          </button>}

          {/* Toggle Live Reading Result */}
          <button
            onClick={() => setShowReadingResult(!showReadingResult)}
            aria-label={showReadingResult ? 'Ẩn đáp án số' : 'Hiện đáp án số'}
            aria-pressed={!showReadingResult}
            className={`flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition sm:text-xs ${
              showReadingResult
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {showReadingResult ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            <span>{showReadingResult ? 'Ẩn số' : 'Hiện số'}</span>
          </button>

          {/* Tutor toggle */}
          <button
            onClick={() => setShowTutorExplanation(!showTutorExplanation)}
            aria-label="Hướng dẫn cách đọc thước"
            title="Hướng dẫn cách đọc thước"
            aria-pressed={showTutorExplanation}
            className={`flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition sm:text-xs ${
              showTutorExplanation
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Info className="size-3.5" />
            <span className="hidden sm:inline">Gợi ý</span>
          </button>
        </div>
        <select aria-label="Độ chia thước kẹp cơ" value={resolution} onChange={event => {
          const nextResolution = Number(event.target.value) as VernierResolution
          setResolution(nextResolution)
          onResolutionChange?.(nextResolution)
          caliperAudio.playBeep(nextResolution === 0.02 ? 2000 : 1600)
        }} className="h-10 w-[76px] shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-1 text-[10px] font-semibold text-slate-700 sm:w-auto sm:px-2 sm:text-xs">
          <option value={0.02}>0.02 mm</option>
          <option value={0.05}>0.05 mm</option>
          <option value={0.01}>0.01 mm</option>
        </select>
      </div>

      <MechanicalCaliper3D
        position={position} maxMm={maxMm} resolution={resolution}
        locked={isLocked} readOnly={readOnly}
        onChange={handleUpdatePosition} onLock={() => setIsLocked(!isLocked)}
        workpiece={workpiece}
      />

      {/* Interactive Controls & Fine-Tuning */}
      <div className={workpiece ? `${controlStyles.sampleResultRow} flex w-full min-w-0 justify-end` : 'mt-3 grid min-w-0 grid-cols-1 items-center gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-12'}>
        {/* Fine Adjustment Steppers */}
        {!workpiece && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:col-span-7">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tinh chỉnh ({resolution}mm):
          </span>
          <div className={`${controlStyles.stepper} grid w-full min-w-0 grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 sm:flex sm:w-auto`}>
            <button
              onClick={() => stepAdjust(-1)}
              disabled={readOnly || isLocked || position <= openingLimits.min}
              className="min-h-11 rounded-md bg-transparent px-1.5 sm:min-h-0 sm:px-1.5 py-1.5 text-[11px] whitespace-nowrap sm:px-2.5 sm:text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              -1 mm
            </button>
            <button
              onClick={() => stepAdjust(-resolution)}
              disabled={readOnly || isLocked || position <= openingLimits.min}
              className="flex min-h-11 items-center justify-center rounded-md sm:min-h-0 bg-white px-1.5 py-1.5 text-[11px] whitespace-nowrap sm:px-2.5 sm:text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
            >
              <ChevronLeft className="hidden size-3 sm:block" />
              -{resolution} <span className="hidden sm:inline">mm</span>
            </button>
            <button
              onClick={() => stepAdjust(+resolution)}
              disabled={readOnly || isLocked || position >= openingLimits.max}
              className="flex min-h-11 items-center justify-center rounded-md sm:min-h-0 bg-white px-1.5 py-1.5 text-[11px] whitespace-nowrap sm:px-2.5 sm:text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
            >
              +{resolution} <span className="hidden sm:inline">mm</span>
              <ChevronRight className="hidden size-3 sm:block" />
            </button>
            <button
              onClick={() => stepAdjust(+1)}
              disabled={readOnly || isLocked || position >= openingLimits.max}
              className="min-h-11 rounded-md bg-transparent px-1.5 sm:min-h-0 sm:px-1.5 py-1.5 text-[11px] whitespace-nowrap sm:px-2.5 sm:text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              +1 mm
            </button>
          </div>

          {/* Quick Slider Bar */}
          <div className="flex h-11 w-full min-w-0 items-center px-1 sm:w-auto sm:min-w-[140px] sm:flex-1 sm:px-2">
            <input
              type="range"
              aria-label="Điều chỉnh độ mở thước kẹp cơ"
              min={openingLimits.min}
              max={openingLimits.max}
              step={workpiece ? 'any' : resolution}
              value={position}
              onChange={(e) => handleUpdatePosition(parseFloat(e.target.value))}
              disabled={readOnly || isLocked}
              className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        )}

        {/* Reading Result Display (Can be hidden to force human eye reading) */}
        <div className={workpiece ? 'flex w-full min-w-0 items-center justify-end' : 'flex min-w-0 items-center justify-end gap-3 lg:col-span-5'}>
          {showReadingResult ? (
            <div className={`${controlStyles.readingPanel} flex w-full min-w-0 items-baseline justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-white sm:w-auto`}>
              <span className="text-xs text-slate-400 font-medium">Chỉ số đo:</span>
              <span className="text-xl md:text-2xl font-black font-mono text-emerald-400 tabular-nums">
                {position.toFixed(reading.config.decimals)}
              </span>
              <span className="text-xs text-slate-400 font-bold">mm</span>
              <span className="text-[11px] text-slate-400 font-mono pl-2 border-l border-slate-700">
                {(position / 25.4).toFixed(3)} in.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1 py-2 text-xs font-semibold text-slate-600">
              <EyeOff className="size-4 text-slate-500" />
              <span>Đang ẩn đáp án số: Hãy tự nhìn vạch thước để đọc!</span>
            </div>
          )}
        </div>
      </div>

      {/* Step-by-Step Educational Explanation (Tutor Mode) */}
      {showTutorExplanation && (
        <div className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-700">
          <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold text-sm">
            <Info className="size-4 text-blue-600" />
            <span>Hướng dẫn cách đọc bằng mắt thường (Độ chia {resolution} mm):</span>
          </div>

          <div className="grid grid-cols-1 gap-3 divide-y divide-slate-200 text-center sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {/* Step 1: Main Scale */}
            <div className="px-2 py-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                1. Đọc phần nguyên (Thước chính)
              </span>
              <strong className="text-base font-black text-slate-900 font-mono">
                {reading.mainScaleMm} mm
              </strong>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Nhìn vạch số 0 của du xích: đọc vạch mm nằm ngay bên trái vạch 0
              </p>
            </div>

            {/* Step 2: Vernier Scale */}
            <div className="px-2 py-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                2. Dò tìm vạch trùng (Du xích)
              </span>
              <strong className="text-base font-black text-blue-700 font-mono">
                +{reading.vernierScaleMm.toFixed(reading.config.decimals)} mm
              </strong>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dò mắt từ trái sang phải: vạch thứ <span className="font-bold text-slate-900 font-mono">{reading.vernierIndex}</span> thẳng hàng với 1 vạch trên thước chính ({reading.vernierIndex} × {resolution}mm)
              </p>
            </div>

            {/* Step 3: Total Sum */}
            <div className="px-2 py-3 text-emerald-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                3. Cộng tổng kích thước
              </span>
              <strong className="text-base font-black font-mono">
                {reading.mainScaleMm} + {reading.vernierScaleMm.toFixed(reading.config.decimals)} = {position.toFixed(reading.config.decimals)} mm
              </strong>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Kích thước đọc được: <span className="underline font-bold">{position.toFixed(reading.config.decimals)} mm</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
