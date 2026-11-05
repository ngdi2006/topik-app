'use client'

import controlStyles from './caliperControls.module.css'
import React, { useState, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { WorkshopObject } from '@/lib/skill-test/sampleObjects'
import { constrainWorkpieceOpening, workpieceOpeningLimits } from '@/lib/skill-test/workpieceContact'
import { caliperAudio } from '@/lib/skill-test/audioEffects'
import {
  Power,
  RotateCcw,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react'

const DigitalCaliper3D = dynamic(() => import('./Caliper3D'), { ssr: false })

interface DigitalCaliperEngineProps {
  valueMm?: number
  onChangeMm?: (value: number) => void
  readOnly?: boolean
  hideReading?: boolean
  showLcdReading?: boolean
  toolbarActions?: React.ReactNode
  workpiece?: WorkshopObject
  targetClampMm?: number
  maxMm?: number
  onClamped?: (value: number) => void
}

export function DigitalCaliperEngine({
  valueMm = 18.50,
  onChangeMm,
  readOnly = false,
  hideReading = false,
  showLcdReading = !hideReading,
  toolbarActions,
  workpiece,
  targetClampMm,
  maxMm = 150,
  onClamped,
}: DigitalCaliperEngineProps) {
  const [position, setPosition] = useState<number>(() => workpiece ? constrainWorkpieceOpening(valueMm, workpiece, maxMm) : valueMm)
  const [isPowerOn, setIsPowerOn] = useState<boolean>(true)
  const [unit, setUnit] = useState<'mm' | 'in'>('mm')
  const [zeroOffsetMm, setZeroOffsetMm] = useState<number>(0)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [zeroWarning, setZeroWarning] = useState<string | null>(null)

  // Synchronize only when the parent supplies a new value; local dragging stays independent.
  const [previousValueMm, setPreviousValueMm] = useState(valueMm)
  if (valueMm !== previousValueMm) {
    setPreviousValueMm(valueMm)
    setPosition(workpiece ? constrainWorkpieceOpening(valueMm, workpiece, maxMm) : Math.max(0, Math.min(maxMm, valueMm)))
  }

  const lastAudioTickRef = useRef<number>(position)
  const contactRef = useRef(false)
  const openingLimits = workpiece ? workpieceOpeningLimits(workpiece, maxMm) : { min: 0, max: maxMm }

  const handleUpdatePosition = useCallback(
    (newPos: number) => {
      if (isLocked || readOnly) return
      let clamped = Math.max(0, Math.min(maxMm, Math.round(newPos * 100) / 100))
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
    [isLocked, readOnly, maxMm, workpiece, targetClampMm, onChangeMm, onClamped]
  )

  const stepAdjust = (delta: number) => {
    if (readOnly || isLocked) return
    const next = Math.round((position + delta) * 100) / 100
    handleUpdatePosition(next)
  }

  // Handle ZERO button
  const handleZeroPress = () => {
    caliperAudio.playBeep(2200)
    if (position > 0.05) {
      setZeroWarning(
        `⚠️ Bạn bấm ZERO khi mỏ kẹp đang mở ${position.toFixed(
          2
        )} mm. Hãy đóng khít thước về 0.00 rồi bấm ZERO để đo tuyệt đối!`
      )
    } else {
      setZeroWarning(null)
    }
    setZeroOffsetMm(position)
  }

  // Toggle mm / inch
  const handleUnitToggle = () => {
    caliperAudio.playBeep(1800)
    setUnit((prev) => (prev === 'mm' ? 'in' : 'mm'))
  }

  // Toggle Power
  const handlePowerToggle = () => {
    caliperAudio.playBeep(isPowerOn ? 1000 : 1500)
    setIsPowerOn(!isPowerOn)
  }

  // Calculate displayed LCD string
  const lcdText = useMemo(() => {
    if (!isPowerOn) return ''
    const currentValMm = position - zeroOffsetMm

    if (unit === 'mm') {
      const sign = currentValMm < 0 ? '-' : ''
      const absVal = Math.abs(currentValMm).toFixed(2)
      return `${sign}${absVal.padStart(6, ' ')}`
    } else {
      const inVal = (currentValMm / 25.4).toFixed(4)
      return inVal.padStart(7, ' ')
    }
  }, [isPowerOn, position, zeroOffsetMm, unit])


  return (
    <div className="w-full min-w-0 select-none">
      <div className={`${controlStyles.toolbar} mb-2 flex min-w-0 items-center gap-1.5`}>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {toolbarActions}
          {/* Power Button */}
          <button
            onClick={handlePowerToggle}
            aria-pressed={isPowerOn}
            data-tone="power"
            className={`flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] sm:text-xs font-bold transition ${
              isPowerOn
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Power className="size-3.5" />
            <span>{isPowerOn ? 'ON' : 'OFF'}</span>
          </button>

          {/* ZERO / ORIGIN */}
          <button
            onClick={handleZeroPress}
            disabled={!isPowerOn}
            className="flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 text-[10px] sm:text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" />
            <span>ZERO</span>
          </button>

          {/* Unit Toggle mm / inch */}
          <button
            onClick={handleUnitToggle}
            disabled={!isPowerOn}
            aria-label={unit === 'mm' ? 'Đổi sang inch' : 'Đổi sang milimét'}
            className="h-10 shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2 text-[10px] sm:text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
          >
            {unit === 'mm' ? 'INCH' : 'MM'}
          </button>

          {/* Lock / Unlock */}
          <button
            aria-pressed={isLocked}
            aria-label={isLocked ? 'Mở khóa vít hãm' : 'Khóa vít hãm'}
            data-tone="warning"
            onClick={() => {
              setIsLocked(!isLocked)
              caliperAudio.playBeep(isLocked ? 1200 : 800)
            }}
            className={`flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] sm:text-xs font-semibold transition ${
              isLocked
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
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
        </div>
        <span className="flex h-10 shrink-0 items-center rounded-lg bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 sm:text-xs">0.01 mm</span>
      </div>

      <DigitalCaliper3D
        position={position} maxMm={maxMm} resolution={0.01}
        locked={isLocked} readOnly={readOnly}
        onChange={handleUpdatePosition} onLock={() => setIsLocked(prev => !prev)}
        workpiece={workpiece}
        digital={{
          text: showLcdReading ? lcdText : '\u2022\u2022.\u2022\u2022', unit,
          power: isPowerOn, relative: zeroOffsetMm !== 0,
          onPower: handlePowerToggle, onZero: handleZeroPress,
          onUnit: handleUnitToggle,
        }}
      />

      {/* Zero Warning Alert */}
      {zeroWarning && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-600" />
            <span>{zeroWarning}</span>
          </div>
          <button
            onClick={() => {
              setZeroOffsetMm(0)
              setZeroWarning(null)
              caliperAudio.playBeep(1500)
            }}
            className="font-bold underline hover:text-amber-950 shrink-0"
          >
            Khôi phục chuẩn 0
          </button>
        </div>
      )}

      {/* Bottom Fine Adjustment & Operations */}
      <div className={workpiece ? `${controlStyles.sampleResultRow} flex w-full min-w-0 justify-end` : 'mt-3 grid min-w-0 grid-cols-1 items-center gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-12'}>
        {/* Steppers */}
        {!workpiece && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:col-span-7">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Kéo trượt:
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
              onClick={() => stepAdjust(-0.01)}
              disabled={readOnly || isLocked || position <= openingLimits.min}
              className="flex min-h-11 items-center justify-center rounded-md sm:min-h-0 bg-white px-1.5 py-1.5 text-[11px] whitespace-nowrap sm:px-2.5 sm:text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
            >
              <ChevronLeft className="hidden size-3 sm:block" />
              -0.01 <span className="hidden sm:inline">mm</span>
            </button>
            <button
              onClick={() => stepAdjust(+0.01)}
              disabled={readOnly || isLocked || position >= openingLimits.max}
              className="flex min-h-11 items-center justify-center rounded-md sm:min-h-0 bg-white px-1.5 py-1.5 text-[11px] whitespace-nowrap sm:px-2.5 sm:text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
            >
              +0.01 <span className="hidden sm:inline">mm</span>
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

          <div className="flex h-11 w-full min-w-0 items-center px-1 sm:w-auto sm:min-w-[140px] sm:flex-1 sm:px-2">
            <input
              type="range"
              aria-label="Điều chỉnh độ mở thước kẹp điện tử"
              min={openingLimits.min}
              max={openingLimits.max}
              step="0.01"
              value={position}
              onChange={(e) => handleUpdatePosition(parseFloat(e.target.value))}
              disabled={readOnly || isLocked}
              className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        )}

        {/* Status display */}
        <div className={workpiece ? 'flex w-full min-w-0 items-center justify-end' : 'flex min-w-0 items-center justify-end gap-3 lg:col-span-5'}>
          {!hideReading ? (
            <div className={`${controlStyles.readingPanel} flex w-full min-w-0 items-baseline justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-white sm:w-auto`}>
              <span className="text-xs text-slate-400 font-medium">LCD Thực tế:</span>
              <span className="text-xl md:text-2xl font-black font-mono text-emerald-400 tabular-nums">
                {isPowerOn ? lcdText.trim() : 'OFF'}
              </span>
              <span className="text-xs text-slate-400 font-bold">{unit}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1 py-2 text-xs font-semibold text-amber-800">
              <Sparkles className="size-4 text-amber-600" />
              <span>{showLcdReading ? 'Đọc chỉ số trên LCD để chọn đáp án.' : 'Chế độ kiểm tra: Màn hình LCD đã bị che!'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Industrial Practical Tips */}
      <div className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-700">
        <div className="flex items-center gap-2 mb-1.5 text-emerald-950 font-bold text-sm">
          <Info className="size-4 text-emerald-600" />
          <span>Bí quyết đạt điểm tối đa thao tác thước điện tử thi EPS:</span>
        </div>
        <ul className="mt-2 grid grid-cols-1 gap-3 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <li className="px-2 py-3">
            <strong className="block text-emerald-800 font-bold mb-1">1. Đóng khít & Zero</strong>
            <p className="text-slate-600">Trước khi đo vật mới, luôn khép kín 2 mỏ và bấm nút ZERO để triệt tiêu sai số.</p>
          </li>
          <li className="px-2 py-3">
            <strong className="block text-emerald-800 font-bold mb-1">2. Lực kẹp vừa đủ</strong>
            <p className="text-slate-600">Dùng con lăn ngón cái đẩy nhẹ nhàng, không bóp quá mạnh làm cong vênh hàm kẹp.</p>
          </li>
          <li className="px-2 py-3">
            <strong className="block text-emerald-800 font-bold mb-1">3. Kiểm tra đơn vị</strong>
            <p className="text-slate-600">Luôn để ý góc trên màn hình LCD là chữ &quot;mm&quot;, tránh nhầm sang đơn vị &quot;in&quot; (inch).</p>
          </li>
        </ul>
      </div>
    </div>
  )
}

