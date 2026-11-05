'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  generateRandomCaliperValue,
  generateMultipleChoiceOptions,
  calculateVernierReading,
  type VernierResolution,
} from '@/lib/skill-test/caliperMath'
import type { DigitalCaliperDisplay } from './Caliper3D'
import { caliperAudio } from '@/lib/skill-test/audioEffects'
import { Flame, Award, CheckCircle2, XCircle, Clock, ArrowRight, TrendingUp } from 'lucide-react'
import controlStyles from './caliperControls.module.css'
import styles from './caliperDrill.module.css'

const Caliper3D = dynamic(() => import('./Caliper3D'), { ssr: false })
const noAction = () => {}

interface Question {
  id: number
  value: number
  options: number[]
}

export function CaliperSpeedDrill({ toolType = 'mechanical' }: { toolType?: 'mechanical' | 'digital' } = {}) {
  const [resolution, setResolution] = useState<VernierResolution>(toolType === 'digital' ? 0.01 : 0.02)
  const [question, setQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [stats, setStats] = useState({ streak: 0, best: 0, answered: 0, correct: 0 })
  const [timerSeconds, setTimerSeconds] = useState(20)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const roundRef = useRef(0)
  const settledRef = useRef(false)
  const deadlineRef = useRef<number | null>(null)

  const nextQuestion = useCallback(() => {
    const value = generateRandomCaliperValue(2, 110, resolution)
    roundRef.current += 1
    settledRef.current = false
    deadlineRef.current = null
    setIsTimerRunning(false)
    setQuestion({ id: roundRef.current, value, options: generateMultipleChoiceOptions(value, resolution) })
    setSelectedAnswer(null)
    setIsAnswered(false)
    setTimerSeconds(20)
  }, [resolution])

  useEffect(() => {
    const pendingQuestion = window.setTimeout(nextQuestion, 0)
    return () => window.clearTimeout(pendingQuestion)
  }, [nextQuestion])

  // Start each round only after its reading has been rendered, including on slow devices.
  const handleReady = useCallback(() => {
    if (!question || question.id !== roundRef.current || settledRef.current || deadlineRef.current !== null) return
    deadlineRef.current = Date.now() + 20_000
    setIsTimerRunning(true)
  }, [question])

  useEffect(() => {
    if (!isTimerRunning || !question) return
    const roundId = question.id
    const interval = window.setInterval(() => {
      if (roundRef.current !== roundId || settledRef.current || deadlineRef.current === null) return
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      setTimerSeconds(remaining)
      if (remaining > 0) return

      // A round can settle once, even when an answer and the timer arrive together.
      settledRef.current = true
      setIsAnswered(true)
      setIsTimerRunning(false)
      setStats(previous => ({ ...previous, streak: 0, answered: previous.answered + 1 }))
      caliperAudio.playError()
    }, 200)
    return () => window.clearInterval(interval)
  }, [isTimerRunning, question])

  const handleSelectOption = useCallback((option: number) => {
    if (!question || settledRef.current || !isTimerRunning) return
    // Enforce the deadline even if a background tab delayed the interval.
    const expired = deadlineRef.current !== null && Date.now() >= deadlineRef.current
    settledRef.current = true
    setSelectedAnswer(expired ? null : option)
    setIsAnswered(true)
    setIsTimerRunning(false)
    if (expired) setTimerSeconds(0)
    const correct = !expired && Math.abs(option - question.value) < 0.005
    setStats(previous => {
      const streak = correct ? previous.streak + 1 : 0
      return {
        streak,
        best: Math.max(previous.best, streak),
        answered: previous.answered + 1,
        correct: previous.correct + Number(correct),
      }
    })
    if (correct) caliperAudio.playSuccess()
    else caliperAudio.playError()
  }, [question, isTimerRunning])

  const targetValue = question?.value ?? 24.32
  const breakdown = calculateVernierReading(targetValue, resolution)
  const decimals = breakdown.config.decimals
  const correctAnswer = selectedAnswer !== null && Math.abs(selectedAnswer - targetValue) < 0.005
  const digitalDisplay = useMemo<DigitalCaliperDisplay | undefined>(() => toolType === 'digital' ? {
    text: targetValue.toFixed(2), unit: 'mm', power: true, relative: false,
    onPower: noAction, onZero: noAction, onUnit: noAction,
  } : undefined, [toolType, targetValue])

  return (
    <section className={styles.drill} aria-label={toolType === 'digital' ? 'Luyện đọc LCD' : 'Luyện đọc vạch'}>
      <h2 className="sr-only">{toolType === 'digital' ? 'Luyện đọc LCD' : 'Luyện đọc vạch'}</h2>
      <div className={`${controlStyles.toolbar} ${styles.header}`}>
        <div className={styles.stats} aria-label="Kết quả luyện tập">
          <span title="Chuỗi đúng" aria-label={`Chuỗi đúng: ${stats.streak}`}><Flame aria-hidden="true" />{stats.streak}</span>
          <span title="Kỷ lục" aria-label={`Kỷ lục: ${stats.best}`}><Award aria-hidden="true" />{stats.best}</span>
          <span title="Tỷ lệ đúng" aria-label={`${stats.correct}/${stats.answered} câu đúng`}><TrendingUp aria-hidden="true" />{stats.answered ? Math.round(stats.correct / stats.answered * 100) : 100}%</span>
        </div>
        <div className={styles.settings}>
          {toolType === 'mechanical' ? <select
            aria-label="Độ chia luyện đọc"
            value={resolution}
            onChange={event => setResolution(Number(event.target.value) as VernierResolution)}
          >
            <option value={0.02}>0.02 mm</option>
            <option value={0.05}>0.05 mm</option>
            <option value={0.01}>0.01 mm</option>
          </select> : <span className={styles.lcdLabel}>LCD · 0.01 mm</span>}
          <span className={styles.timer} data-urgent={timerSeconds <= 5} role="timer" aria-label={`Còn ${timerSeconds} giây`}>
            <Clock aria-hidden="true" /><strong>{timerSeconds}s</strong>
          </span>
        </div>
      </div>

      {question ? <Caliper3D
        position={targetValue}
        maxMm={150}
        resolution={resolution}
        locked={false}
        readOnly
        onChange={noAction}
        onLock={noAction}
        digital={digitalDisplay}
        presentation="quiz"
        onReady={handleReady}
      /> : <div className={styles.loading} role="status">Đang tải thước…</div>}

      <div className={styles.answers}>
        <p className={styles.prompt}>Chọn số đo <span>mm</span></p>
        <div className={styles.options} role="group" aria-label="Chọn số đo chính xác">
          {question?.options.map((option, index) => {
            const isTarget = Math.abs(option - targetValue) < 0.005
            const isSelected = selectedAnswer === option
            const state = !isAnswered ? undefined : isTarget ? 'correct' : isSelected ? 'wrong' : 'muted'
            return <button
              type="button"
              key={option}
              data-state={state}
              disabled={isAnswered || !isTimerRunning}
              onClick={() => handleSelectOption(option)}
            >
              <span className={styles.optionLetter} aria-hidden="true">{isAnswered && isTarget ? <CheckCircle2 /> : isAnswered && isSelected ? <XCircle /> : String.fromCharCode(65 + index)}</span>
              <strong>{option.toFixed(decimals)} <small>mm</small></strong>
            </button>
          })}
        </div>
      </div>

      <div className={styles.feedback}>
        <div className={styles.feedbackText} role="status" aria-live="polite" aria-atomic="true">
          {isAnswered ? <>
            <strong data-correct={correctAnswer}>{correctAnswer ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
              {correctAnswer ? 'Chính xác' : selectedAnswer === null ? 'Hết giờ' : 'Chưa đúng'} · {targetValue.toFixed(decimals)} mm
            </strong>
            <p>{toolType === 'digital' ? 'Đọc trực tiếp chỉ số trên LCD.' : `${breakdown.mainScaleMm} + ${breakdown.vernierIndex} × ${resolution} = ${targetValue.toFixed(decimals)} mm`}</p>
          </> : <p>{!isTimerRunning ? 'Đang chuẩn bị thước…' : toolType === 'digital' ? 'Đọc LCD và chọn đáp án trong 20 giây.' : 'Đọc thước và chọn đáp án trong 20 giây.'}</p>}
        </div>
        {isAnswered && <button type="button" className={styles.next} onClick={nextQuestion}>Tiếp<ArrowRight aria-hidden="true" /></button>}
      </div>
    </section>
  )
}
