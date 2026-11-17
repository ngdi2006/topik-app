'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Armchair, ArrowLeft, ArrowRight, BookOpen, Check, DoorOpen, Footprints, GraduationCap, Headphones, MapPin, Maximize, Monitor, Presentation, RefreshCw, Settings, Users, X } from 'lucide-react'
import { LESSON } from '@/lib/campus/model'
import type { CampusRoom, CampusSnapshot, CampusView } from '@/lib/campus/model'
import styles from './campus.module.css'

const CampusScene = dynamic(() => import('./CampusScene'), { ssr: false, loading: () => <div className={styles.loading}>Đang dựng không gian 3D…</div> })
const EMPTY_SEATS: number[] = []
type Action = (roomId: string, action: string, data?: Record<string, unknown>) => Promise<boolean>

function RoomSettings({ room, busy, act }: { room: CampusRoom; busy: boolean; act: Action }) {
  return <form className={styles.settings} onSubmit={async event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await act(room.id, 'configure', Object.fromEntries(data))
  }}>
    <h3><Settings size={17} /> Cấu hình quản trị viên</h3>
    <label>Sức chứa (1–120)<input name="capacity" type="number" min="1" max="120" required defaultValue={room.capacity} /></label>
    {room.kind === 'classroom' ? <>
      <label>Hình thức học<select name="mode" defaultValue={room.mode}><option value="self">Tự học theo bài</option><option value="live">Giáo viên trực tiếp</option></select></label>
      <label>ID tài khoản giáo viên<input name="teacher_id" defaultValue={room.teacher_id || ''} placeholder="UUID tài khoản giáo viên" /></label>
      <label>Liên kết phòng họp HTTPS<input name="meeting_url" type="url" defaultValue={room.meeting_url || ''} placeholder="https://meet.google.com/…" /></label>
      <input type="hidden" name="exam_id" value={room.exam_id || ''} />
    </> : <>
      <input type="hidden" name="mode" value="self" /><input type="hidden" name="meeting_url" value="" />
      <input type="hidden" name="exam_id" value={room.exam_id || ''} />
      <label>ID giáo viên phụ trách phòng thi<input name="teacher_id" defaultValue={room.teacher_id || ''} placeholder="UUID tài khoản giáo viên" /></label>
      <p>Giáo viên được phân công có thể sửa nội dung và chọn đề thi; sức chứa và phân công do admin quản lý.</p>
    </>}
    <button className={styles.secondary} disabled={busy}>Lưu cấu hình</button>
    <p>Khi tăng chỗ, hệ thống tự nhận người chờ theo thứ tự. Chỗ đã cấp được giữ đến khi học viên chủ động trả chỗ.</p>
  </form>
}

function ExamSettings({ room, busy, act }: { room: CampusRoom; busy: boolean; act: Action }) {
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<{ id: string; title: string; status: string }[]>([])
  const [selectedExam, setSelectedExam] = useState(room.exam_id || '')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true); setLoadError('')
      try {
        const response = await fetch(`/api/campus/exam-setup?roomId=${room.id}&search=${encodeURIComponent(search)}`, { cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Không tải được đề thi.')
        if (!controller.signal.aborted) setOptions(result)
      } catch (cause) { if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Không tải được đề thi.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [room.id, search])
  return <form className={styles.settings} onSubmit={async event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await act(room.id, 'exam_setup', Object.fromEntries(data))
  }}>
    <h3><Monitor size={17} /> Nội dung phòng thi</h3>
    <label>Tiêu đề hiển thị trên bảng<input name="exam_title" maxLength={160} required defaultValue={room.exam_title || ''} placeholder="Thi thử máy tính ngành sản xuất chế tạo 2026" /></label>
    <label>Mô tả đợt thi<textarea name="exam_description" maxLength={1000} rows={3} defaultValue={room.exam_description || ''} /></label>
    <label>Hướng dẫn cho thí sinh<textarea name="exam_instructions" maxLength={4000} rows={5} defaultValue={room.exam_instructions || ''} placeholder="Mỗi dòng là một hướng dẫn…" /></label>
    <label>Tìm đề thi theo tên<input value={search} maxLength={120} onChange={e => setSearch(e.target.value)} placeholder="Ví dụ: sản xuất chế tạo" /></label>
    <label>Đề thi được sử dụng<select name="exam_id" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
      <option value="">Chưa gắn đề thi</option>
      {selectedExam && !options.some(exam => exam.id === selectedExam) ? <option value={selectedExam}>Đề đang chọn · {selectedExam}</option> : null}
      {options.map(exam => <option key={exam.id} value={exam.id}>{exam.title}{exam.status === 'Internal' ? ' (Nội bộ)' : ''}</option>)}
    </select></label>
    {loading ? <p role="status">Đang tìm đề thi…</p> : loadError ? <p role="alert">{loadError}</p> : <p>Tối đa 100 kết quả. Có thể tìm theo tên để thu hẹp danh sách.</p>}
    <p>Đề nội bộ vẫn cần phân quyền cho từng thí sinh. Tiêu đề và hướng dẫn không thay đổi câu hỏi hoặc lượt thi.</p>
    <button className={styles.primary} disabled={busy}>Lưu nội dung phòng thi</button>
  </form>
}

function Study({ room, snapshot, busy, act }: { room: CampusRoom; snapshot: CampusSnapshot; busy: boolean; act: Action }) {
  const [selfStep, setSelfStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [revealed, setRevealed] = useState<number | null>(null)
  const step = room.mode === 'live' ? room.step : selfStep
  const progress = snapshot.progress.find(item => item.room_id === room.id)
  const teacher = snapshot.role === 'admin' || (snapshot.role === 'teacher' && room.teacher_id === snapshot.userId)
  const admitted = snapshot.memberships.some(item => item.room_id === room.id && item.status === 'admitted')
  const waitingForTeacher = room.mode === 'live' && room.phase === 'waiting'
  return <div className={styles.study}>
    <div className={styles.eyebrow}>{room.mode === 'live' ? 'LỚP CÓ GIÁO VIÊN' : 'TỰ HỌC THEO BÀI'}</div>
    <h2>{LESSON.title}</h2>
    <div className={styles.notice}><strong>Giáo trình EPS</strong><p>Mở lộ trình và nhiệm vụ lớp EPS để học, làm bài tập và kiểm tra theo kế hoạch giáo viên. Kết quả được lưu tại module Giáo trình EPS.</p><Link className={styles.secondary} href="/giao-trinh-eps">Mở Giáo trình EPS <ArrowRight size={15} /></Link></div>
    {room.mode === 'live' ? <div className={styles.notice}>
      <strong>{room.phase === 'waiting' ? 'Đang chờ giáo viên bắt đầu' : room.phase === 'ended' ? 'Buổi học đã kết thúc' : 'Buổi học đang diễn ra'}</strong>
      <p>Nội dung bảng giảng đồng bộ theo giáo viên. Mic/camera sử dụng phòng họp bên ngoài.</p>
      {admitted && room.meeting_url ? <a className={styles.secondary} href={room.meeting_url} target="_blank" rel="noopener noreferrer">Mở phòng học trực tiếp ↗</a> : <p>{room.meeting_url ? 'Đăng ký chỗ để tham gia phòng họp.' : 'Chưa cấu hình liên kết phòng họp.'}</p>}
    </div> : null}
    {teacher && room.mode === 'live' ? <div className={styles.teacher}>
      <h3>Điều khiển buổi học</h3>
      <div className={styles.buttonRow}>
        <button disabled={busy} onClick={() => act(room.id, 'teach', { phase: 'teaching', step: 0 })}>Bắt đầu bài</button>
        <button disabled={busy || room.step === 0} onClick={() => act(room.id, 'teach', { phase: 'teaching', step: room.step - 1 })}>← Mục trước</button>
        <button disabled={busy || room.step === 3} onClick={() => act(room.id, 'teach', { phase: 'teaching', step: room.step + 1 })}>Mục tiếp →</button>
        <button disabled={busy} onClick={() => act(room.id, 'teach', { phase: 'ended', step: 3 })}>Kết thúc buổi</button>
      </div>
    </div> : null}
    <div className={styles.steps} aria-label="Tiến trình bài học">{LESSON.steps.map((title, i) => <button key={title} aria-current={step === i ? 'step' : undefined} disabled={room.mode === 'live'} onClick={() => setSelfStep(i)} className={step === i ? styles.currentStep : ''}><span>{i + 1}</span>{title}</button>)}</div>
    {waitingForTeacher ? <p className={styles.empty}>Bạn có thể chuẩn bị tài liệu và mở phòng họp trong khi chờ.</p> : <>
      {step === 0 ? <div className={styles.lesson}>
        <span className={styles.lessonMark}>안녕하세요!</span>
        <h3>Buổi đầu tiên tại trung tâm</h3>
        <p>Khi gặp giáo viên và bạn cùng lớp, hãy nói <b>안녕하세요</b> để chào hỏi lịch sự.</p>
        <blockquote>안녕하세요. 저는 학생입니다.<br /><small>Xin chào. Tôi là học viên.</small></blockquote>
        <p>Khi nhận được sự giúp đỡ, hãy nói <b>감사합니다</b> — Cảm ơn.</p>
        <p>Thử đọc to hai câu trên, rồi chuyển sang phần từ vựng.</p>
      </div> : null}
      {step === 1 ? <div className={styles.vocabulary}>{LESSON.vocabulary.map((word, i) => <button key={word.korean} onClick={() => setRevealed(revealed === i ? null : i)} aria-expanded={revealed === i}>
        <strong lang="ko">{word.korean}</strong><span>{word.reading}</span><em>{revealed === i ? word.vietnamese : 'Chạm để xem nghĩa'}</em>
      </button>)}</div> : null}
      {step === 2 ? <form className={styles.quiz} onSubmit={async event => {
        event.preventDefault()
        await act(room.id, 'quiz', { answers: LESSON.questions.map((_, index) => answers[index]) })
      }}>
        {LESSON.questions.map((question, i) => <fieldset key={question.prompt}><legend>{i + 1}. {question.prompt}</legend>{question.options.map((option, j) => <label key={option}><input type="radio" name={`question-${i}`} required checked={answers[i] === j} onChange={() => setAnswers(previous => ({ ...previous, [i]: j }))} />{option}</label>)}</fieldset>)}
        <button className={styles.primary} disabled={busy || !admitted}>Nộp quiz</button>
        {progress ? <p role="status">Kết quả tốt nhất: <b>{progress.score}/3</b> · {progress.score >= 2 ? 'Đạt yêu cầu' : 'Hãy ôn lại và làm lại.'}</p> : null}
      </form> : null}
      {step === 3 ? <div className={styles.lesson}>
        <h3>{progress?.completed_at ? 'Bạn đã hoàn thành bài học!' : 'Tổng kết buổi học'}</h3>
        <p>Bạn đã làm quen cách chào hỏi, cảm ơn, và bốn từ vựng đầu tiên. Hãy luyện giới thiệu bản thân trước buổi sau.</p>
        <p>Quiz: {progress ? `${progress.score}/3` : 'Chưa làm'} · Cần đúng ít nhất 2 câu để hoàn thành.</p>
        <button className={styles.primary} disabled={busy || !admitted || (progress?.score ?? 0) < 2 || !!progress?.completed_at} onClick={() => act(room.id, 'complete')}><Check size={16} />{progress?.completed_at ? 'Đã lưu hoàn thành' : 'Hoàn thành bài học'}</button>
      </div> : null}
      {room.mode === 'self' && selfStep < 3 ? <button className={styles.secondary} onClick={() => setSelfStep(value => value + 1)}>Tiếp theo: {LESSON.steps[selfStep + 1]} <ArrowRight size={15} /></button> : null}
    </>}
    <p className={styles.footnote}>Bài mẫu của module 3D. Thư viện giáo trình và tiến độ e-learning hiện có được giữ riêng trong bản đầu.</p>
  </div>
}

function ExamPreparation({ room, seated }: { room: CampusRoom; seated: boolean }) {
  const [audioChecked, setAudioChecked] = useState(false)
  const [rulesChecked, setRulesChecked] = useState(false)
  const [audioError, setAudioError] = useState('')
  const audio = useRef<AudioContext | null>(null)
  useEffect(() => () => { void audio.current?.close() }, [])
  async function testAudio() {
    try {
      const context = audio.current ?? new AudioContext(); audio.current = context
      await context.resume()
      const oscillator = context.createOscillator(); const gain = context.createGain()
      oscillator.frequency.value = 440; gain.gain.value = .08
      oscillator.connect(gain); gain.connect(context.destination)
      oscillator.start(); oscillator.stop(context.currentTime + .6)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      setAudioError('')
    } catch { setAudioError('Không phát được âm thanh. Kiểm tra trình duyệt và thiết bị âm thanh.') }
  }
  return <div className={styles.study}>
    <div className={styles.eyebrow}>LÀM QUEN QUY TRÌNH THI</div><h2>{room.exam_title || 'Chuẩn bị tại máy thi'}</h2>
    {room.exam_description ? <p>{room.exam_description}</p> : null}
    {room.exam_instructions ? <div className={styles.examInstructions}><h3>Hướng dẫn của phòng thi</h3><p>{room.exam_instructions}</p></div> : null}
    <p>Map mẫu giúp luyện tìm phòng và số máy. Quy trình chính thức sẽ được điều chỉnh theo sơ đồ và nội quy bạn cung cấp.</p>
    <ol className={styles.checklist}><li>Nhận số máy sau khi đăng ký chỗ.</li><li>Di chuyển đến máy của mình và nhấn E để ngồi.</li><li>Kiểm tra âm thanh và đọc hướng dẫn.</li><li>Mở đề thi trên giao diện thi hiện có.</li></ol>
    <button className={styles.secondary} onClick={testAudio}><Headphones size={17} /> Phát âm thanh kiểm tra</button>
    {audioError ? <p role="alert">{audioError}</p> : null}
    <label className={styles.checkLabel}><input type="checkbox" checked={audioChecked} onChange={e => setAudioChecked(e.target.checked)} />Tôi nghe rõ âm thanh kiểm tra</label>
    <label className={styles.checkLabel}><input type="checkbox" checked={rulesChecked} onChange={e => setRulesChecked(e.target.checked)} />Tôi đã đọc hướng dẫn và sẵn sàng làm bài</label>
    {!seated ? <p className={styles.notice}>Hãy ngồi vào máy được cấp trước khi mở đề. Có thể dùng nút “Ngồi vào chỗ” bên trên.</p> : null}
    {room.exam_id ? seated && audioChecked && rulesChecked ? <Link className={styles.primary} href={`/exam/${room.exam_id}/start`}>Mở màn hình chuẩn bị thi <ArrowRight size={16} /></Link> : <button className={styles.primary} disabled>Chưa đủ bước chuẩn bị</button> : <p className={styles.notice}>Chưa gắn đề thi cho phòng mẫu. Quản trị viên có thể cấu hình ID đề thi bên dưới; bạn vẫn luyện được việc tìm và ngồi vào máy.</p>}
    <p className={styles.footnote}>Mở màn hình chuẩn bị chưa bắt đầu tính giờ hay trừ lượt. Bài thi tiếp tục trong giao diện thi hiện có.</p>
  </div>
}

export default function CampusHub() {
  const [snapshot, setSnapshot] = useState<CampusSnapshot | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [inside, setInside] = useState<string | null>(null)
  const [seated, setSeated] = useState(false)
  const [viewChoice, setViewChoice] = useState<{ mode: CampusView; roomId: string | null }>({ mode: 'overview', roomId: null })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const requestVersion = useRef(0)
  const mutation = useRef(false)
  const alive = useRef(true)
  const load = useCallback(async (signal?: AbortSignal) => {
    if (mutation.current) return
    const version = ++requestVersion.current
    try {
      const response = await fetch('/api/campus', { cache: 'no-store', signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không tải được module.')
      if (alive.current && version === requestVersion.current) { setSnapshot(data); setError('') }
    } catch (cause) {
      if (alive.current && version === requestVersion.current && !signal?.aborted) setError(cause instanceof Error ? cause.message : 'Không thể kết nối.')
    }
  }, [])
  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    void load(controller.signal)
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => { if (!document.hidden) await load(controller.signal); if (!controller.signal.aborted) timer = setTimeout(tick, 4000) }
    timer = setTimeout(tick, 4000)
    return () => { alive.current = false; controller.abort(); clearTimeout(timer) }
  }, [load])

  const act: Action = async (roomId, action, data = {}) => {
    if (mutation.current) return false
    mutation.current = true; ++requestVersion.current; setBusy(true); setNotice('')
    try {
      const response = await fetch('/api/campus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, action, data }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Thao tác chưa thành công.')
      if (alive.current) {
        setSnapshot(payload); setError('')
        setNotice(action === 'join' ? 'Đã ghi nhận đăng ký. Xem trạng thái chỗ bên dưới.' : action === 'quiz' ? 'Đã chấm và lưu kết quả quiz.' : action === 'complete' ? 'Đã lưu hoàn thành bài học.' : action === 'leave' ? 'Đã trả chỗ. Người tiếp theo trong hàng đợi sẽ được nhận chỗ.' : 'Đã cập nhật.')
      }
      return true
    } catch (cause) { if (alive.current) setNotice(cause instanceof Error ? cause.message : 'Không thể thực hiện thao tác.'); return false }
    finally { mutation.current = false; if (alive.current) setBusy(false) }
  }
  const rooms = snapshot?.rooms ?? []
  const chosen = rooms.find(room => room.id === selected) ?? rooms[0]
  const currentRoom = rooms.find(room => room.id === inside) ?? null
  const membership = snapshot?.memberships.find(item => item.room_id === chosen?.id)
  const currentMembership = snapshot?.memberships.find(item => item.room_id === inside)
  const seats = currentRoom ? snapshot?.seats.filter(item => item.room_id === currentRoom.id).map(item => item.seat) ?? EMPTY_SEATS : EMPTY_SEATS
  const canEnter = membership?.status === 'admitted'
  const canTeach = chosen && snapshot && (snapshot.role === 'admin' || (snapshot.role === 'teacher' && chosen.teacher_id === snapshot.userId))
  // A seat may be released in another tab. Never leave the learner in an unauthorized room.
  const authorizedRoom = currentMembership?.status === 'admitted' ? currentRoom : null
  const view: CampusView = viewChoice.roomId !== (authorizedRoom?.id ?? null) || (!seated && (viewChoice.mode === 'seat' || viewChoice.mode === 'focus')) ? 'follow' : viewChoice.mode
  const focused = view === 'focus'
  const changeView = (mode: CampusView) => {
    if (authorizedRoom && (mode === 'focus' || mode === 'seat')) setSelected(authorizedRoom.id)
    setViewChoice({ mode, roomId: authorizedRoom?.id ?? null })
  }
  const toggleSeated = () => {
    setSeated(value => !value)
    setViewChoice({ mode: 'follow', roomId: authorizedRoom?.id ?? null })
  }
  useEffect(() => {
    if (view === 'follow') return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setViewChoice({ mode: view === 'focus' ? 'seat' : 'follow', roomId: authorizedRoom?.id ?? null }) }
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [view, authorizedRoom?.id])
  const inRoom = authorizedRoom?.id === chosen?.id
  const enterRoom = () => { if (chosen && canEnter) { setInside(chosen.id); setSeated(false) } }
  return <main className={`${styles.app} ${focused ? styles.focused : ''}`}>
    <header className={styles.header}>
      <Link className={styles.back} href="/dashboard"><ArrowLeft size={17} /> Dashboard</Link>
      <div className={styles.brand}><span><GraduationCap size={23} /></span><div>TRUNG TÂM <b>3D</b><small>Hành trình học tập của bạn</small></div></div>
      <span className={styles.previewBadge}>BẢN CƠ BẢN</span>
    </header>
    <div className={styles.intro}><div><div className={styles.eyebrow}>ĐẾN LỚP. GẶP GỠ. TIẾN BỘ.</div><h1>Một ngày tại trung tâm<span>.</span></h1><p>Khám phá tầng 3: khu A, khu C, các phòng học và sảnh chính.</p></div><div className={styles.location}><MapPin size={18} /><span>{authorizedRoom ? authorizedRoom.title : 'Sảnh chính tầng 3'}<small>Theo sơ đồ trung tâm · Tỷ lệ mô phỏng</small></span></div></div>
    {error ? <div role="alert" className={styles.error}>{error} <button onClick={() => load()}><RefreshCw size={14} /> Thử lại</button>{snapshot ? <span> Dữ liệu đang hiển thị có thể chưa cập nhật.</span> : null}</div> : null}
    <div className={styles.layout}>
      <section className={styles.world} aria-label="Không gian 3D">
        <div className={styles.worldBar}><span><span className={styles.dot} /> {authorizedRoom ? 'Trong phòng' : 'Khám phá tầng 3'}</span>{authorizedRoom ? <button onClick={() => { setInside(null); setSeated(false) }}><DoorOpen size={15} /> Về sảnh</button> : <span>{view === 'overview' ? 'Toàn cảnh tầng 3' : 'Góc nhìn thứ ba'}</span>}</div>
        <div className={styles.sceneFrame}>
        <CampusScene room={authorizedRoom} ownSeat={authorizedRoom ? currentMembership?.seat ?? null : null} seats={seats} seated={!!authorizedRoom && seated} view={view} onInteract={(target,location) => {
          if (target === 'classroom' || target === 'exam') { const room = rooms.find(item => item.kind === target); if (room) { setSelected(room.id); setNotice('Đăng ký chỗ hoặc vào phòng tại bảng bên cạnh.') } }
          else if (target === 'exit') { setInside(null); setSeated(false) }
          else if (target === 'seat') toggleSeated()
          else if(target==='location') setNotice(`Bạn đang ở cửa ${location}. Các phòng trên sơ đồ là vị trí thực tế; lớp học và đề thi mẫu vẫn được chọn tại bảng hoạt động.`)
          else document.getElementById('campus-activity')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }} />
        <div className={styles.viewToolbar} role="group" aria-label="Chọn góc nhìn">
          <button aria-label="Góc nhìn di chuyển" title="Di chuyển" aria-pressed={view === 'follow'} onClick={() => changeView('follow')}><Footprints size={18} /><span>Di chuyển</span></button>
          <button aria-label="Góc nhìn toàn cảnh" title="Toàn cảnh" aria-pressed={view === 'overview'} onClick={() => changeView('overview')}><Maximize size={18} /><span>Toàn cảnh</span></button>
          <button aria-label="Góc nhìn chỗ ngồi" title={seated ? 'Từ chỗ ngồi' : 'Ngồi vào chỗ để mở góc nhìn này'} aria-pressed={view === 'seat'} disabled={!authorizedRoom || !seated} onClick={() => changeView('seat')}><Armchair size={18} /><span>Chỗ ngồi</span></button>
          <button aria-label={authorizedRoom?.kind === 'exam' ? 'Tập trung bài thi' : 'Tập trung bảng giảng'} title={seated ? 'Tập trung nội dung' : 'Ngồi vào chỗ để tập trung nội dung'} aria-pressed={focused} disabled={!authorizedRoom || !seated} onClick={() => changeView('focus')}>{authorizedRoom?.kind === 'exam' ? <Monitor size={18} /> : <Presentation size={18} />}<span>{authorizedRoom?.kind === 'exam' ? 'Bài thi' : 'Bảng giảng'}</span></button>
        </div>
        {focused ? <button className={styles.exitFocus} onClick={() => changeView('seat')}><X size={16} /> Rời chế độ tập trung <kbd>Esc</kbd></button> : null}
        </div>
        <div className={styles.legend}><span><kbd>W A S D</kbd> Di chuyển</span><span>Kéo chuột để xoay</span><span><kbd>E</kbd> Tương tác</span><span className={styles.goldDot}>Chỗ của bạn</span><span>Nhân vật tại ghế = chỗ đã đăng ký</span></div>
      </section>
      <aside className={styles.panel} aria-label={focused ? authorizedRoom?.kind === 'exam' ? 'Nội dung thi tập trung' : 'Nội dung bảng giảng tập trung' : 'Đăng ký và hoạt động trong phòng'}>
        <div className={styles.panelHeading}><span className={styles.eyebrow}>ĐIỂM ĐẾN CỦA BẠN</span><h2>Hôm nay bạn muốn…</h2></div>
        <div className={styles.roomTabs}>{rooms.map(room => <button key={room.id} aria-pressed={chosen?.id === room.id} className={chosen?.id === room.id ? styles.activeRoom : ''} onClick={() => { setSelected(room.id); setSettingsOpen(false) }}>{room.kind === 'classroom' ? <BookOpen size={19} /> : <Monitor size={19} />}<span>{room.kind === 'classroom' ? 'Vào lớp học' : 'Đi thi thử'}<small>{room.title}</small></span></button>)}</div>
        {!snapshot ? <div className={styles.empty}>{error ? 'Chưa kết nối được dữ liệu trung tâm.' : 'Đang tải lớp và phòng thi…'}</div> : chosen ? <>
          <div className={styles.roomSummary}><span><Users size={16} />{chosen.occupied}/{chosen.capacity} chỗ đã đăng ký</span><span>{chosen.queued} đang chờ</span><div className={styles.capacity}><i style={{ width: `${chosen.occupied / chosen.capacity * 100}%` }} /></div></div>
          <div className={styles.admission}>
            {membership?.status === 'waiting' ? <><h3>Bạn ở vị trí chờ #{membership.position}</h3><p>Hệ thống tự cấp chỗ theo thứ tự khi có người trả chỗ hoặc quản trị viên tăng sức chứa. Bạn có thể quay lại sau.</p></> : canEnter ? <><h3><Check size={18} /> {chosen.kind === 'exam' ? 'Máy thi' : 'Ghế học'} số {membership.seat}</h3><p>Chỗ đã được giữ cho tài khoản của bạn.</p></> : <><h3>{chosen.kind === 'exam' ? 'Đăng ký chỗ thi thử' : 'Đăng ký vào lớp mẫu'}</h3><p>{chosen.kind === 'classroom' ? 'Bản cơ bản tự xếp vào lớp mẫu khi còn chỗ.' : 'Nhận số máy và tập làm quen quy trình vào phòng.'} Hết chỗ sẽ vào hàng đợi.</p></>}
            <div className={styles.buttonRow}>
              {!membership ? <button className={styles.primary} disabled={busy || !!error} onClick={() => act(chosen.id, 'join')}>{chosen.occupied >= chosen.capacity ? 'Tham gia hàng đợi' : 'Đăng ký nhận chỗ'} <ArrowRight size={16} /></button> : null}
              {canEnter && !inRoom ? <button className={styles.primary} disabled={!!error} onClick={enterRoom}>Vào phòng <ArrowRight size={16} /></button> : null}
              {canEnter && inRoom ? <button className={styles.primary} onClick={toggleSeated}>{seated ? 'Đứng lên' : `Ngồi vào ${chosen.kind === 'exam' ? 'máy' : 'chỗ'} của tôi`}</button> : null}
              {membership ? <button className={styles.textButton} disabled={busy} onClick={async () => { if (await act(chosen.id, 'leave')) { if (inside === chosen.id) { setInside(null); setSeated(false) } } }}>{membership.status === 'waiting' ? 'Rời hàng đợi' : 'Trả chỗ'}</button> : null}
            </div>
            {inRoom ? <p className={styles.footnote}>Nút vào phòng/ngồi là cách di chuyển nhanh, hỗ trợ cả người không dùng bàn phím.</p> : null}
          </div>
          {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
          <div id="campus-activity">
            {(inRoom || (canTeach && chosen.mode === 'live')) && chosen.kind === 'classroom' ? <Study key={chosen.id} room={chosen} snapshot={snapshot} busy={busy || !!error} act={act} /> : null}
            {inRoom && chosen.kind === 'exam' ? <ExamPreparation key={chosen.id} room={chosen} seated={seated} /> : null}
            {!inRoom ? <div className={styles.destination}><div>{chosen.kind === 'classroom' ? '가' : '01'}</div><h3>{chosen.kind === 'classroom' ? 'Học một chút. Tiến bộ mỗi ngày.' : chosen.exam_title || 'Tự tin hơn trước ngày thi.'}</h3><p>{chosen.kind === 'classroom' ? 'Bài giảng · Từ vựng · Quiz · Tổng kết' : chosen.exam_description || 'Tìm phòng · Nhận máy · Kiểm tra âm thanh'}</p></div> : null}
          </div>
          {snapshot.role === 'admin' || (canTeach && chosen.kind === 'exam') ? <><button className={styles.settingsToggle} aria-expanded={settingsOpen} onClick={() => setSettingsOpen(value => !value)}><Settings size={16} /> Cấu hình phòng</button>{settingsOpen ? <div className={styles.roomConfiguration}>{snapshot.role === 'admin' ? <RoomSettings key={`room-${chosen.id}`} room={chosen} busy={busy || !!error} act={act} /> : null}{chosen.kind === 'exam' ? <ExamSettings key={`exam-${chosen.id}`} room={chosen} busy={busy || !!error} act={act} /> : null}</div> : null}</> : null}
        </> : <p className={styles.empty}>Chưa có phòng được cấu hình.</p>}
      </aside>
    </div>
    <footer className={styles.footer}><span>TRUNG TÂM 3D <b> / </b> Bắt đầu từ những bước nhỏ.</span><span>30 chỗ mặc định · Hàng đợi tự động · Hai hình thức học</span></footer>
  </main>
}
