'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { WORKSHOP_OBJECTS, type WorkshopObject, type MeasureType } from '@/lib/skill-test/sampleObjects'
import type { VernierResolution } from '@/lib/skill-test/caliperMath'
import { generateWorkshopSample } from '@/lib/skill-test/workshopSamples'
import { initialWorkpieceOpening } from '@/lib/skill-test/workpieceContact'
import controlStyles from './caliperControls.module.css'
import styles from './workshopPractice.module.css'
import { MechanicalCaliperEngine } from './MechanicalCaliperEngine'
import { DigitalCaliperEngine } from './DigitalCaliperEngine'
import { caliperAudio } from '@/lib/skill-test/audioEffects'
import { CheckCircle2, XCircle, Volume2, ShieldCheck, Target, Sparkles, Shuffle, ArrowRight } from 'lucide-react'

interface WorkshopRound {
  id: number
  templateId: string
  toolType: 'mechanical' | 'digital'
  resolution: VernierResolution
  object: WorkshopObject
}

const parseReading = (text: string) => {
  const value = text.trim().replace(',', '.')
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function ObjectMeasuringSimulator({ toolType }: { toolType?: 'mechanical' | 'digital' } = {}) {
  const [selectedObjectId, setSelectedObjectId] = useState(WORKSHOP_OBJECTS[0].id)
  const [localCaliperType, setCaliperType] = useState<'mechanical' | 'digital'>('mechanical')
  const caliperType = toolType ?? localCaliperType
  const [mechResolution, setMechResolution] = useState<VernierResolution>(0.02)
  const resolution = caliperType === 'mechanical' ? mechResolution : 0.01
  const [round, setRound] = useState<WorkshopRound | null>(null)
  const roundRef = useRef<WorkshopRound | null>(null)
  const [currentJawMm, setCurrentJawMm] = useState(0)
  const [isClamped, setIsClamped] = useState(false)
  const [readingVisible, setReadingVisible] = useState(false)
  const [userGuessInput, setUserGuessInput] = useState('')
  const [feedback, setFeedback] = useState<{ status: 'correct' | 'wrong' | null; message: string }>({ status: null, message: '' })
  const [score, setScore] = useState(0)
  const [completedObjects, setCompletedObjects] = useState<Set<string>>(new Set())
  const previousSamples = useRef(new Map<string, WorkshopObject>())
  const sequence = useRef(0)
  const awardedRound = useRef<number | null>(null)
  const benchRef = useRef<HTMLDivElement>(null)

  const selectedTemplate = WORKSHOP_OBJECTS.find(object => object.id === selectedObjectId) ?? WORKSHOP_OBJECTS[0]
  const activeRound = round?.templateId === selectedObjectId && round.toolType === caliperType && round.resolution === resolution ? round : null
  const currentObject = activeRound?.object ?? selectedTemplate

  const startRound = useCallback((template: WorkshopObject, precision: VernierResolution, tool: 'mechanical' | 'digital') => {
    const object = generateWorkshopSample(template, precision, previousSamples.current.get(template.id))
    previousSamples.current.set(template.id, object)
    sequence.current += 1
    awardedRound.current = null
    const next = { id: sequence.current, templateId: template.id, toolType: tool, resolution: precision, object }
    roundRef.current = next
    setRound(next)
    setCurrentJawMm(initialWorkpieceOpening(object))
    setIsClamped(false)
    setReadingVisible(false)
    setUserGuessInput('')
    setFeedback({ status: null, message: '' })
  }, [])

  // Generate after hydration; selecting a type, tool or precision starts a fresh specimen.
  useEffect(() => {
    const scheduledRound = roundRef.current
    const pendingRound = window.setTimeout(() => {
      const current = roundRef.current
      if (current !== scheduledRound || (current?.templateId === selectedTemplate.id
        && current.resolution === resolution && current.toolType === caliperType)) return
      startRound(selectedTemplate, resolution, caliperType)
    }, 0)
    return () => window.clearTimeout(pendingRound)
  }, [selectedTemplate, resolution, caliperType, startRound])

  const nextSample = () => {
    startRound(selectedTemplate, resolution, caliperType)
    caliperAudio.playBeep(1200)
  }

  const handleSubmitReading = (event: React.FormEvent) => {
    event.preventDefault()
    if (!activeRound || !isClamped) {
      setFeedback({ status: 'wrong', message: 'Kéo mỏ đo chạm khít vật mẫu trước khi kiểm tra.' })
      return
    }
    const parsed = parseReading(userGuessInput)
    if (parsed === null) {
      setFeedback({ status: 'wrong', message: 'Vui lòng nhập số đo hợp lệ bằng mm.' })
      caliperAudio.playError()
      return
    }
    const correct = Math.abs(parsed - currentObject.targetValueMm) <= currentObject.toleranceMm + 1e-7
    setFeedback({ status: correct ? 'correct' : 'wrong', message: correct ? 'Chính xác! Bạn đã đọc đúng số đo.' : 'Chưa chính xác. Hãy đọc lại thước rồi thử lại.' })
    if (correct) {
      caliperAudio.playSuccess()
      if (awardedRound.current !== activeRound.id) {
        awardedRound.current = activeRound.id
        setScore(previous => previous + 10)
        setCompletedObjects(previous => new Set(previous).add(activeRound.templateId))
      }
    } else caliperAudio.playError()
  }

  const handlePlayKoreanVoice = () => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(currentObject.instructionKo)
        utterance.lang = 'ko-KR'
        utterance.rate = 0.85
        window.speechSynthesis.speak(utterance)
      }
    } catch {}
  }

  const badges: Record<MeasureType, { label: string; color: string }> = {
    outer: { label: 'Đo ngoài', color: 'bg-blue-100 text-blue-800' },
    inner: { label: 'Đo trong', color: 'bg-purple-100 text-purple-800' },
    depth: { label: 'Đo sâu', color: 'bg-amber-100 text-amber-800' },
    step: { label: 'Đo bậc', color: 'bg-emerald-100 text-emerald-800' },
  }
  const badge = badges[currentObject.measureType]
  const clampAction = <button type="button" onClick={() => {
    setCurrentJawMm(currentObject.targetValueMm)
    setIsClamped(true)
    caliperAudio.playClampSnap()
  }} title="Tự động kẹp khít vật mẫu" aria-label="Tự động kẹp khít vật mẫu" className="flex items-center"><Sparkles aria-hidden="true" /><span>Kẹp mẫu</span></button>
  const handleJawChange = (mm: number) => {
    setCurrentJawMm(mm)
    setIsClamped(Math.abs(mm - currentObject.targetValueMm) < .005)
  }

  return <section className="min-w-0 space-y-3" aria-label="Thực hành đo mẫu">
    <header className={styles.header}>
      <h2 className="sr-only">Đo mẫu</h2>
      <div className={controlStyles.samplePicker}>
        <Target aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
        <label htmlFor="workshop-object" className="sr-only">Chọn vật mẫu</label>
        <select id="workshop-object" value={selectedObjectId} onChange={event => {
          const template = WORKSHOP_OBJECTS.find(object => object.id === event.target.value)
          if (!template) return
          setSelectedObjectId(template.id)
          startRound(template, resolution, caliperType)
        }}>
          {WORKSHOP_OBJECTS.map(object => <option key={object.id} value={object.id}>{completedObjects.has(object.id) ? '✓ ' : ''}{object.nameVi}</option>)}
        </select>
      </div>
      <button type="button" className={styles.newSample} onClick={nextSample} disabled={!activeRound} title="Mẫu mới với kích thước khác" aria-label="Tạo mẫu mới với kích thước khác"><Shuffle aria-hidden="true" /><span>Mẫu mới</span></button>
      <div className={styles.progress}><strong>{score} XP</strong><span>{completedObjects.size}/{WORKSHOP_OBJECTS.length}</span></div>
    </header>

    <div className={controlStyles.workshopStack}>
      <div ref={benchRef} className={`${controlStyles.workshopBench} min-w-0 space-y-3`}>
        {!toolType && <select aria-label="Loại thước" value={caliperType} onChange={event => {
          const tool = event.target.value as 'mechanical' | 'digital'
          setCaliperType(tool)
          startRound(selectedTemplate, tool === 'mechanical' ? mechResolution : 0.01, tool)
        }} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"><option value="mechanical">Thước cơ</option><option value="digital">Điện tử</option></select>}
        {!activeRound ? <div className={styles.loading} role="status">Đang chuẩn bị vật mẫu…</div> : <>
          {caliperType === 'mechanical' ? <MechanicalCaliperEngine
            key={`mech-${activeRound.id}`}
            valueMm={currentJawMm} onChangeMm={handleJawChange}
            targetClampMm={currentObject.targetValueMm} onClamped={() => setIsClamped(true)}
            maxMm={150} resolution={mechResolution} onResolutionChange={precision => {
              setMechResolution(precision)
              startRound(selectedTemplate, precision, caliperType)
            }}
            hideReading readingVisible={readingVisible} onReadingVisibilityChange={setReadingVisible}
            toolbarActions={clampAction} workpiece={currentObject}
          /> : <DigitalCaliperEngine
            key={`digi-${activeRound.id}`}
            valueMm={currentJawMm} onChangeMm={handleJawChange}
            targetClampMm={currentObject.targetValueMm} onClamped={() => setIsClamped(true)}
            maxMm={150} hideReading readingVisible={readingVisible} onReadingVisibilityChange={setReadingVisible}
            toolbarActions={clampAction} workpiece={currentObject}
          />}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className={`rounded px-2 py-1 font-medium ${badge.color}`}>{badge.label}</span>
            <span role="status" className={`flex items-center gap-1.5 ${isClamped ? 'text-emerald-700' : 'text-slate-500'}`}>{isClamped && <ShieldCheck aria-hidden="true" className="size-3.5" />}{isClamped ? 'Đã kẹp khít' : 'Kéo thước để kẹp mẫu'}</span>
          </div>
          <form onSubmit={handleSubmitReading} className="space-y-2 border-t border-slate-200 pt-3">
            <label htmlFor="workshop-reading" className="block text-xs font-semibold text-slate-700">Số đo của bạn</label>
            <div className="flex min-w-0 gap-2">
              <div className="relative min-w-0 flex-1">
                <input id="workshop-reading" type="text" inputMode="decimal" autoComplete="off" maxLength={12} placeholder="0.00" value={userGuessInput} onChange={event => setUserGuessInput(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-3 pr-10 font-mono text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <span className="pointer-events-none absolute right-3 top-3 text-xs text-slate-500">mm</span>
              </div>
              <button type="submit" disabled={!isClamped} title={isClamped ? 'Kiểm tra số đo' : 'Kéo thước chạm khít mẫu trước khi đọc số'} className="h-11 shrink-0 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Kiểm tra</button>
            </div>
            {feedback.status && <div role="status" className={`${styles.result} ${feedback.status === 'correct' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              <div>{feedback.status === 'correct' ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}<p>{feedback.message}{readingVisible && <small>Kích thước mẫu: <strong>{currentObject.targetValueMm.toFixed(2)} mm</strong></small>}</p></div>
              {feedback.status === 'correct' && <button type="button" onClick={() => { nextSample(); requestAnimationFrame(() => benchRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })) }}>Đo lượt mới<ArrowRight aria-hidden="true" /></button>}
            </div>}
          </form>
        </>}
      </div>
      {activeRound && <details className={`${controlStyles.workshopDetails} min-w-0 border-t border-slate-200 pt-3`}>
        <summary className="min-h-9 cursor-pointer text-xs font-semibold text-slate-600">Hướng dẫn đo</summary>
        <div className="space-y-2 pt-2 text-xs leading-relaxed text-slate-600">
          <h3 className="font-semibold text-slate-800">{currentObject.nameVi}</h3>
          <div className="flex items-start justify-between gap-2"><p className="text-blue-700">{currentObject.nameKo}<span className="mt-0.5 block text-[11px] text-slate-500">{currentObject.koreanPronunciation}</span></p><button type="button" onClick={handlePlayKoreanVoice} title="Nghe khẩu lệnh" aria-label="Nghe khẩu lệnh tiếng Hàn" className="grid size-9 shrink-0 place-items-center rounded-lg text-blue-600 hover:bg-blue-50 focus-visible:outline-blue-500"><Volume2 className="size-4" /></button></div>
          <p lang="ko" className="font-medium text-slate-700">{currentObject.instructionKo}</p><p>{currentObject.instructionVi}</p>
        </div>
      </details>}
    </div>
  </section>
}
