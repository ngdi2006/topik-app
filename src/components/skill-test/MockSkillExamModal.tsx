'use client'

import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react'
import dynamic from 'next/dynamic'
import { Trophy, Clock, CheckCircle2, Circle, RotateCcw, Send, Lock, Unlock, XCircle, ArrowRight } from 'lucide-react'
import {
  EXAM_DURATION_SECONDS, generateCaliperExam, gradeCaliperExam, formatExamCm, parseExamAnswerCm,
  type CaliperExamAttempt, type CaliperExamAnswers, type CaliperExamContacts,
  type CaliperExamResult, type ExamTaskId,
} from '@/lib/skill-test/caliperExam'
import { initialWorkpieceOpening, constrainWorkpieceOpening } from '@/lib/skill-test/workpieceContact'
import { caliperAudio } from '@/lib/skill-test/audioEffects'
import type { DigitalCaliperDisplay } from './Caliper3D'
import styles from './caliperExam.module.css'

const Caliper3D = dynamic(() => import('./Caliper3D'), {
  ssr: false,
  loading: () => <div className={styles.loading} role="status">Đang tải thước…</div>,
})
const noAction = () => {}
const formatError = (value: number) => {
  const rounded = Number(value.toFixed(10))
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 10, useGrouping: false })} mm`
}
const worksheetLabels = [
  ['가로', 'Chiều ngang'],
  ['세로', 'Chiều dọc'],
  ['내측', 'Đường kính trong mặt bích'],
  ['외측', 'Đường kính ngoài mặt bích'],
]

interface ExamSession {
  attempt: CaliperExamAttempt
  activeId: ExamTaskId
  openings: Record<ExamTaskId, number>
  answers: CaliperExamAnswers
  contacts: CaliperExamContacts
}

interface Props {
  toolType?: 'mechanical' | 'digital'
  onActiveChange?: (active: boolean) => void
}

export function MockSkillExamModal({ toolType = 'mechanical', onActiveChange }: Props = {}) {
  const [session, setSession] = useState<ExamSession | null>(null)
  const [result, setResult] = useState<CaliperExamResult | null>(null)
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [finishReason, setFinishReason] = useState<'submit' | 'time'>('submit')
  const sessionRef = useRef<ExamSession | null>(null)
  const deadlineRef = useRef<number | null>(null)
  const settledRef = useRef(true)
  const advancingRef = useRef(false)
  const benchRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => onActiveChange?.(false), [onActiveChange])

  const finishExam = useCallback((reason: 'submit' | 'time') => {
    const current = sessionRef.current
    if (!current || settledRef.current) return
    settledRef.current = true
    const remaining = deadlineRef.current === null ? EXAM_DURATION_SECONDS
      : Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
    setTimeLeft(remaining)
    setFinishReason(remaining === 0 ? 'time' : reason)
    setIsTimerRunning(false)
    setResult(gradeCaliperExam(current.attempt, current.answers, current.contacts))
    onActiveChange?.(false)
    caliperAudio.playBeep(700, .2)
  }, [onActiveChange])

  const startExam = useCallback(() => {
    if (!settledRef.current) return
    const attempt = generateCaliperExam(toolType, sessionRef.current?.attempt)
    const next: ExamSession = {
      attempt, activeId: attempt.tasks[0].id,
      openings: Object.fromEntries(attempt.tasks.map(task => [task.id, initialWorkpieceOpening(task.workpiece)])) as Record<ExamTaskId, number>,
      answers: {}, contacts: {},
    }
    sessionRef.current = next
    deadlineRef.current = null
    settledRef.current = false
    advancingRef.current = false
    setSession(next)
    setResult(null)
    setTimeLeft(EXAM_DURATION_SECONDS)
    setSceneReady(false)
    setIsTimerRunning(false)
    setLocked(false)
    onActiveChange?.(true)
    caliperAudio.playBeep(1500)
  }, [toolType, onActiveChange])

  const attempt = session?.attempt
  const activeId = session?.activeId
  const activeTask = attempt?.tasks.find(task => task.id === activeId)
  const position = session && activeId ? session.openings[activeId] : 0

  const handleSceneReady = useCallback(() => {
    const current = sessionRef.current
    if (!current || current.attempt.id !== attempt?.id || current.activeId !== activeId || settledRef.current) return
    advancingRef.current = false
    setSceneReady(true)
    // One deadline for all four measurements. Changing specimens never resets it.
    if (deadlineRef.current === null) deadlineRef.current = Date.now() + EXAM_DURATION_SECONDS * 1000
    setIsTimerRunning(true)
  }, [attempt?.id, activeId])

  useEffect(() => {
    if (!isTimerRunning) return
    const timer = window.setInterval(() => {
      if (settledRef.current || deadlineRef.current === null) return
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) finishExam('time')
    }, 200)
    return () => window.clearInterval(timer)
  }, [isTimerRunning, finishExam])

  const canEdit = useCallback(() => {
    if (settledRef.current) return false
    if (deadlineRef.current !== null && Date.now() >= deadlineRef.current) {
      finishExam('time')
      return false
    }
    return true
  }, [finishExam])

  const selectTask = useCallback((id: ExamTaskId) => {
    const current = sessionRef.current
    if (!current || !canEdit() || current.activeId === id) return
    const next = { ...current, activeId: id }
    sessionRef.current = next
    setSession(next)
    setSceneReady(false)
    setLocked(false)
  }, [canEdit])

  const handleOpeningChange = useCallback((value: number) => {
    const current = sessionRef.current
    if (!current || !sceneReady || locked || !canEdit()) return
    const task = current.attempt.tasks.find(item => item.id === current.activeId)!
    let opening = constrainWorkpieceOpening(value, task.workpiece)
    if (Math.abs(opening - task.targetMm) <= .15) opening = task.targetMm
    const contact = Math.abs(opening - task.targetMm) < .005
    const next = {
      ...current,
      openings: { ...current.openings, [task.id]: opening },
      contacts: { ...current.contacts, [task.id]: current.contacts[task.id] || contact },
    }
    sessionRef.current = next
    setSession(next)
    if (contact && !current.contacts[task.id]) caliperAudio.playClampSnap()
  }, [sceneReady, locked, canEdit])

  const updateAnswer = useCallback((id: ExamTaskId, value: string) => {
    const current = sessionRef.current
    if (!current || !current.contacts[id] || !canEdit()) return
    const next = { ...current, answers: { ...current.answers, [id]: value } }
    sessionRef.current = next
    setSession(next)
  }, [canEdit])

  const toggleLock = useCallback(() => {
    if (canEdit()) setLocked(previous => !previous)
  }, [canEdit])

  const advanceTask = useCallback(() => {
    const current = sessionRef.current
    if (!current || advancingRef.current || !canEdit()) return
    const index = current.attempt.tasks.findIndex(task => task.id === current.activeId)
    const next = current.attempt.tasks[index + 1]
    if (!next) {
      finishExam('submit')
      return
    }
    if (!current.contacts[current.activeId] || parseExamAnswerCm(current.answers[current.activeId] ?? '') === null) return
    advancingRef.current = true
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    selectTask(next.id)
    requestAnimationFrame(() => benchRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [canEdit, finishExam, selectTask])

  const digitalDisplay = useMemo<DigitalCaliperDisplay | undefined>(() => toolType === 'digital' ? {
    text: position.toFixed(2), unit: 'mm', power: true, relative: false,
    onPower: noAction, onZero: noAction, onUnit: noAction,
  } : undefined, [toolType, position])

  if (!session) return <section className={styles.intro} aria-label="Hướng dẫn thi thử">
    <div className={styles.introTitle}><span><Trophy aria-hidden="true" /></span><div><h2>Thi đo · 60 giây</h2><p>2 vật mẫu · 4 phép đo · 1 phiếu kết quả</p></div></div>
    <p>Kéo thước kẹp bu lông và mặt bích, đọc số đo rồi điền vào bảng. Kích thước thay đổi mỗi lượt thi.</p>
    <div className={styles.sheet}>
      <table><thead><tr><th scope="col"><span lang="ko">측정 항목</span><small>Hạng mục đo</small></th><th scope="col"><span lang="ko">측정값</span><small>Kết quả đo</small></th></tr></thead>
        <tbody>{worksheetLabels.map(([ko, vi]) => <tr key={ko}><th scope="row"><span lang="ko">{ko}</span> – {vi}</th><td className={styles.blank}>········ cm</td></tr>)}</tbody>
      </table>
    </div>
    <p className={styles.notice}>Thước hiển thị mm. Ghi <strong>cm = mm ÷ 10</strong> với 3 số thập phân, bấm <strong>Tiếp</strong> để đổi phép đo. Hết 60 giây, bài tự nộp.</p>
    <p className={styles.notice}>Mỗi mục tối đa 25 điểm. Sai số trong ±0,20 mm: đủ điểm; lệch 0,30 mm: 50%; từ 0,40 mm: 0 điểm.</p>
    <div className={styles.introFooter}><span>{toolType === 'digital' ? 'Điện tử · 0.01 mm' : 'Thước cơ · 0.02 mm'}</span><button type="button" className={styles.primary} onClick={startExam}><Clock aria-hidden="true" />Bắt đầu thi</button></div>
  </section>

  if (result) return <section className={styles.results} aria-label="Kết quả thi thử">
    <header className={styles.resultHeader}><div><h2>Kết quả thi</h2><p>{finishReason === 'time' ? 'Hết 60 giây · Đã tự nộp bài' : `Đã nộp bài · ${EXAM_DURATION_SECONDS - timeLeft} giây`}</p></div><strong>{result.score.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}<small>/100</small></strong></header>
    <p className={styles.summary}>{result.correctCount}/4 mục trong ±0,20 mm · Tối đa 25 điểm/mục</p>
    <div className={styles.sheet}><table><thead><tr><th scope="col">Hạng mục</th><th scope="col">Bạn ghi<small>cm</small></th><th scope="col">Chuẩn<small>cm · Δ mm</small></th><th scope="col">Điểm<small>/25</small></th></tr></thead>
      <tbody>{result.results.map(row => {
        const task = session.attempt.tasks.find(item => item.id === row.taskId)!
        return <tr key={row.taskId} data-credit={row.isCorrect ? 'full' : row.points > 0 ? 'partial' : 'none'}>
          <th scope="row"><span lang="ko">{task.labelKo}</span><small>{task.labelVi}{task.id.startsWith('flange') ? ' mặt bích' : ''}</small></th>
          <td>{row.enteredCm === null ? session.answers[row.taskId]?.trim() ? 'Không hợp lệ' : 'Chưa ghi' : row.enteredCm.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 11, useGrouping: false })}{!row.measured && <small>Chưa đo</small>}</td>
          <td><strong>{formatExamCm(task.targetMm)}</strong>{row.errorMm !== null && <small aria-label={`Sai số ${formatError(row.errorMm)}`}>{formatError(row.errorMm)}</small>}</td>
          <td className={styles.points}><strong>{row.points.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</strong>{row.isCorrect ? <CheckCircle2 aria-label="Đủ điểm" /> : row.points === 0 ? <XCircle aria-label="Không có điểm" /> : null}<small>{row.percentage.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%</small></td>
        </tr>
      })}</tbody></table></div>
    <p className={styles.notice}>Sai số ≤0,20 mm: 25 điểm; 0,30 mm: 12,5 điểm; từ 0,40 mm: 0 điểm. Cần đã đo chạm mẫu để được chấm điểm.</p>
    <button type="button" className={styles.primary} onClick={startExam}><RotateCcw aria-hidden="true" />Thi lại · Đề mới</button>
  </section>

  const completed = session.attempt.tasks.filter(task => session.contacts[task.id] && parseExamAnswerCm(session.answers[task.id] ?? '') !== null).length
  const nextTask = session.attempt.tasks[session.attempt.tasks.findIndex(task => task.id === activeId) + 1]
  const answerReady = activeId !== undefined && session.contacts[activeId] && parseExamAnswerCm(session.answers[activeId] ?? '') !== null
  const touching = activeTask && Math.abs(position - activeTask.targetMm) < .005
  const submit = (event: FormEvent) => { event.preventDefault(); advanceTask() }

  return <section className={styles.exam} aria-label="Bài thi đo 60 giây">
    <header className={styles.examHeader}>
      <div className={styles.activeTitle}><h2>{activeTask?.id.startsWith('bolt') ? 'Bu lông' : 'Mặt bích'} · {activeTask?.labelKo} <span>{activeTask?.id.startsWith('bolt') ? activeTask.labelVi : activeTask?.id === 'flange-inner' ? 'Trong' : 'Ngoài'}</span></h2><p role="status">{!sceneReady ? 'Đang tải vật mẫu…' : touching ? 'Đã chạm khít · Đọc thước và ghi cm' : activeTask?.workpiece.measureType === 'inner' ? 'Kéo mỏ trong ra chạm hai thành lỗ' : activeId === 'bolt-width' ? 'Kẹp mỏ ngoài vào hai mép ren bu lông' : 'Kéo mỏ ngoài hoặc chấm xanh để kẹp'}</p></div>
      <div className={styles.examProgress}><span aria-label={`Đã ghi ${completed}/4 mục`}>{completed}/4</span><span className={styles.timer} role="timer" data-urgent={timeLeft <= 10} aria-label={`Còn ${timeLeft} giây`}><Clock aria-hidden="true" /><strong>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</strong></span></div>
    </header>
    <div className={styles.workspace}>
      <div ref={benchRef} className={styles.bench}>
        <p className="sr-only" aria-live="polite">{activeTask?.instructionVi}</p>
        {activeTask && <Caliper3D
          key={`${session.attempt.id}-${activeTask.id}`}
          position={position} maxMm={150} resolution={session.attempt.resolution}
          locked={locked} readOnly={!sceneReady}
          onChange={handleOpeningChange} onLock={toggleLock}
          digital={digitalDisplay} workpiece={activeTask.workpiece}
          presentation="exam" onReady={handleSceneReady}
          viewActions={<button type="button" onClick={toggleLock} aria-label={locked ? 'Mở vít hãm' : 'Khóa vít hãm'} title={locked ? 'Mở vít hãm' : 'Khóa vít hãm'} aria-pressed={locked} data-tone="warning">{locked ? <Lock aria-hidden="true" /> : <Unlock aria-hidden="true" />}<span className="hidden sm:inline">{locked ? 'Đã khóa' : 'Khóa vít'}</span></button>}
        />}
      </div>

      <form className={styles.worksheet} onSubmit={submit} aria-label="Phiếu ghi kết quả đo">
        <div className={styles.sheet}><table>
          <thead><tr><th scope="col"><span lang="ko">측정 항목</span><small>Hạng mục đo</small></th><th scope="col"><span lang="ko">측정값</span><small>Kết quả · cm</small></th></tr></thead>
          <tbody>{session.attempt.tasks.map(task => <tr key={task.id} data-active={activeId === task.id}>
            <th scope="row"><button type="button" onClick={() => selectTask(task.id)} aria-pressed={activeId === task.id} aria-label={`Đo ${task.labelVi.toLowerCase()}`}>
              {session.contacts[task.id] ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
              <span><strong lang="ko">{task.labelKo}</strong><small>{task.labelVi}{task.id.startsWith('flange') ? ' mặt bích' : ''}</small></span>
            </button></th>
            <td><label className="sr-only" htmlFor={`exam-${task.id}`}>{task.labelVi} (cm)</label><input
              id={`exam-${task.id}`} type="text" inputMode="decimal" autoComplete="off" maxLength={12}
              placeholder="······" value={session.answers[task.id] ?? ''}
              disabled={!session.contacts[task.id]}
              title={session.contacts[task.id] ? 'Ghi số đo bằng cm' : 'Kẹp chạm vật mẫu để ghi số đo'}
              onFocus={() => selectTask(task.id)}
              onChange={event => updateAnswer(task.id, event.target.value)}
            /><span className={styles.unit}>cm</span></td>
          </tr>)}</tbody>
        </table></div>
        <div className={styles.submitRow}><p>{nextTask ? answerReady ? `Tiếp: ${nextTask.labelVi.toLowerCase()}` : 'Đo và ghi số để tiếp tục' : 'Mục cuối · Kiểm tra và nộp bài'}<br /><strong>cm = mm ÷ 10</strong></p><div className={styles.footerActions}>{nextTask && <button type="button" className={styles.secondary} disabled={!isTimerRunning} onClick={() => finishExam('submit')}>Nộp bài</button>}<button key={nextTask ? 'next' : 'submit'} type="submit" className={styles.primary} disabled={!isTimerRunning || Boolean(nextTask && !answerReady)} aria-label={nextTask ? `Tiếp: ${nextTask.labelVi.toLowerCase()}` : 'Nộp bài'}>{nextTask ? <>Tiếp<ArrowRight aria-hidden="true" /></> : <><Send aria-hidden="true" />Nộp bài</>}</button></div></div>
      </form>
    </div>
  </section>
}

