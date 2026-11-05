'use client'

import React, { useState, useMemo } from 'react'
import {
  WORKSHOP_OBJECTS,
  WorkshopObject,
  MeasureType,
} from '@/lib/skill-test/sampleObjects'
import { VernierResolution } from '@/lib/skill-test/caliperMath'
import { initialWorkpieceOpening } from '@/lib/skill-test/workpieceContact'
import controlStyles from './caliperControls.module.css'
import { MechanicalCaliperEngine } from './MechanicalCaliperEngine'
import { DigitalCaliperEngine } from './DigitalCaliperEngine'
import { caliperAudio } from '@/lib/skill-test/audioEffects'
import {
  CheckCircle2,
  XCircle,
  Volume2,
  ShieldCheck,
  Target,
  Sparkles,
} from 'lucide-react'

const sampleName = (object: WorkshopObject) => object.nameVi.replace(/\s*\([^)]*\)\s*$/, '')

export function ObjectMeasuringSimulator({ toolType }: { toolType?: 'mechanical' | 'digital' } = {}) {
  const [selectedObjectId, setSelectedObjectId] = useState<string>(
    WORKSHOP_OBJECTS[0].id
  )
  const [localCaliperType, setCaliperType] = useState<'mechanical' | 'digital'>(
    'mechanical'
  )
  const caliperType = toolType ?? localCaliperType
  const [mechResolution, setMechResolution] = useState<VernierResolution>(0.02)
  const [currentJawMm, setCurrentJawMm] = useState<number>(() => initialWorkpieceOpening(WORKSHOP_OBJECTS[0]))
  const [isClamped, setIsClamped] = useState<boolean>(false)
  const [userGuessInput, setUserGuessInput] = useState<string>('')
  const [feedback, setFeedback] = useState<{
    status: 'correct' | 'wrong' | null
    message: string
  }>({ status: null, message: '' })
  const [score, setScore] = useState<number>(0)
  const [completedObjects, setCompletedObjects] = useState<Set<string>>(
    new Set()
  )

  const currentObject = useMemo(() => {
    return (
      WORKSHOP_OBJECTS.find((o) => o.id === selectedObjectId) ||
      WORKSHOP_OBJECTS[0]
    )
  }, [selectedObjectId])

  // Select new object
  const handleSelectObject = (obj: WorkshopObject) => {
    setSelectedObjectId(obj.id)
    setCurrentJawMm(initialWorkpieceOpening(obj))
    setIsClamped(false)
    setUserGuessInput('')
    setFeedback({ status: null, message: '' })
    caliperAudio.playBeep(1200)
  }

  // Handle auto-snap when caliper touches object
  const handleCaliperClamped = () => {
    setIsClamped(true)
  }

  // Handle user submitting their measurement answer
  const handleSubmitReading = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isClamped) {
      setFeedback({ status: 'wrong', message: 'Hãy kéo mỏ đo chạm khít vật mẫu trước khi kiểm tra số đo.' })
      return
    }
    const parsed = parseFloat(userGuessInput.replace(',', '.'))
    if (isNaN(parsed)) {
      setFeedback({
        status: 'wrong',
        message: 'Vui lòng nhập một số kích thước hợp lệ (ví dụ: 12.00 hoặc 24.35).',
      })
      caliperAudio.playError()
      return
    }

    const diff = Math.abs(parsed - currentObject.targetValueMm)
    if (diff <= currentObject.toleranceMm) {
      caliperAudio.playSuccess()
      setFeedback({
        status: 'correct',
        message: `CHÍNH XÁC! Kích thước chuẩn: ${currentObject.targetValueMm.toFixed(
          2
        )} mm. Thao tác đo đạt điểm tối đa!`,
      })
      setScore((prev) => prev + 10)
      setCompletedObjects((prev) => new Set(prev).add(currentObject.id))
    } else {
      caliperAudio.playError()
      setFeedback({
        status: 'wrong',
        message: `Chưa chính xác! Bạn đọc là ${parsed.toFixed(
          2
        )} mm, kích thước thật là ${currentObject.targetValueMm.toFixed(
          2
        )} mm. Hãy kiểm tra lại vạch trùng trên thước!`,
      })
    }
  }

  // Text-to-speech for Korean instruction
  const handlePlayKoreanVoice = () => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(currentObject.instructionKo)
        utterance.lang = 'ko-KR'
        utterance.rate = 0.85
        window.speechSynthesis.speak(utterance)
      }
    } catch {}
  }

  const getMeasureTypeBadge = (type: MeasureType) => {
    switch (type) {
      case 'outer':
        return {
          label: 'Đo đường kính ngoài (외경)',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
        }
      case 'inner':
        return {
          label: 'Đo đường kính trong (내경)',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
        }
      case 'depth':
        return {
          label: 'Đo chiều sâu (깊이)',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
        }
      case 'step':
        return {
          label: 'Đo độ dày bậc (단차)',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        }
    }
  }

  const badge = getMeasureTypeBadge(currentObject.measureType)

  const measureLabel = currentObject.measureType === 'outer' ? 'Đo ngoài'
    : currentObject.measureType === 'inner' ? 'Đo trong'
    : currentObject.measureType === 'step' ? 'Đo bậc' : 'Đo sâu'

  const clampAction = <button type="button" onClick={() => {
    setCurrentJawMm(currentObject.targetValueMm)
    setIsClamped(true)
    caliperAudio.playClampSnap()
  }} title="Tự động kẹp khít vật mẫu" aria-label="Tự động kẹp khít vật mẫu" className="flex items-center">
    <Sparkles aria-hidden="true" className="size-3.5" /><span>Kẹp mẫu</span>
  </button>

  const handleJawChange = (mm: number) => {
    setCurrentJawMm(mm)
    setIsClamped(Math.abs(mm - currentObject.targetValueMm) < 0.005)
  }

  return (
    <section className="min-w-0 space-y-3" aria-label="Thực hành đo mẫu">
      <header className="flex min-w-0 items-center gap-3">
        <h2 className="sr-only">Đo mẫu</h2>
        <div className={`${controlStyles.samplePicker} flex min-w-0 flex-1 items-center gap-2`}>
          <Target aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
          <label htmlFor="workshop-object" className="sr-only">Chọn vật mẫu</label>
          <select id="workshop-object" value={selectedObjectId} onChange={event => {
            const object = WORKSHOP_OBJECTS.find(item => item.id === event.target.value)
            if (object) handleSelectObject(object)
          }} className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700">
            {WORKSHOP_OBJECTS.map(object => <option key={object.id} value={object.id}>{completedObjects.has(object.id) ? '✓ ' : ''}{sampleName(object)}</option>)}
          </select>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap text-[11px] tabular-nums">
          <span className="font-semibold text-blue-700">{score} XP</span>
          <span className="text-slate-500">{completedObjects.size}/{WORKSHOP_OBJECTS.length}</span>
        </div>
      </header>

      <div className={`${controlStyles.workshopStack} flex w-full min-w-0 flex-col gap-3`}>
        <div className={`${controlStyles.workshopBench} min-w-0 space-y-3`}>
          {!toolType && <select aria-label="Loại thước" value={caliperType} onChange={event => setCaliperType(event.target.value as 'mechanical' | 'digital')} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700">
            <option value="mechanical">Thước cơ</option><option value="digital">Điện tử</option>
          </select>}

          {caliperType === 'mechanical' ? <MechanicalCaliperEngine
            key={`mech-${selectedObjectId}`}
            valueMm={currentJawMm} onChangeMm={handleJawChange}
            targetClampMm={currentObject.targetValueMm} onClamped={handleCaliperClamped}
            maxMm={150} resolution={mechResolution} onResolutionChange={setMechResolution}
            toolbarActions={clampAction}
            workpiece={currentObject}
          /> : <DigitalCaliperEngine
            key={`digi-${selectedObjectId}`}
            valueMm={currentJawMm} onChangeMm={handleJawChange}
            targetClampMm={currentObject.targetValueMm} onClamped={handleCaliperClamped}
            maxMm={150} toolbarActions={clampAction} workpiece={currentObject}
          />}

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className={`rounded px-2 py-1 font-medium ${badge.color}`}>{measureLabel}</span>
            <span role="status" className={`flex items-center gap-1.5 ${isClamped ? 'text-emerald-700' : 'text-slate-500'}`}>
              {isClamped && <ShieldCheck aria-hidden="true" className="size-3.5" />}{isClamped ? 'Đã kẹp khít' : 'Kéo thước để kẹp mẫu'}
            </span>
          </div>

          <form onSubmit={handleSubmitReading} className="space-y-2 border-t border-slate-200 pt-3">
            <label htmlFor="workshop-reading" className="block text-xs font-semibold text-slate-700">Số đo của bạn</label>
            <div className="flex min-w-0 gap-2">
              <div className="relative min-w-0 flex-1">
                <input id="workshop-reading" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={userGuessInput} onChange={event => setUserGuessInput(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-3 pr-10 font-mono text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <span className="pointer-events-none absolute right-3 top-3 text-xs text-slate-500">mm</span>
              </div>
              <button type="submit" disabled={!isClamped} title={isClamped ? 'Kiểm tra số đo' : 'Kéo thước chạm khít mẫu trước khi đọc số'} className="h-11 shrink-0 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Kiểm tra</button>
            </div>
            <button type="button" onClick={() => setUserGuessInput(currentObject.targetValueMm.toFixed(2))} className="min-h-9 text-xs font-medium text-slate-500 hover:text-blue-700 focus-visible:outline-blue-500">Gợi ý đáp án</button>
            {feedback.status && <div role="status" className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs ${feedback.status === 'correct' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {feedback.status === 'correct' ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}<p>{feedback.message}</p>
            </div>}
          </form>
        </div>

        <details className={`${controlStyles.workshopDetails} min-w-0 border-t border-slate-200 pt-3`}>
          <summary className="min-h-9 cursor-pointer text-xs font-semibold text-slate-600">Hướng dẫn đo</summary>
          <div className="space-y-2 pt-2 text-xs leading-relaxed text-slate-600">
            <h3 className="font-semibold text-slate-800">{currentObject.nameVi}</h3>
            <div className="flex items-start justify-between gap-2">
              <p className="text-blue-700">{currentObject.nameKo}<span className="mt-0.5 block text-[11px] text-slate-500">{currentObject.koreanPronunciation}</span></p>
              <button type="button" onClick={handlePlayKoreanVoice} title="Nghe khẩu lệnh" aria-label="Nghe khẩu lệnh tiếng Hàn" className="grid size-9 shrink-0 place-items-center rounded-lg text-blue-600 hover:bg-blue-50 focus-visible:outline-blue-500"><Volume2 className="size-4" /></button>
            </div>
            <p lang="ko" className="font-medium text-slate-700">{currentObject.instructionKo}</p>
            <p>{currentObject.instructionVi}</p>
          </div>
        </details>
      </div>
    </section>
  )
}
