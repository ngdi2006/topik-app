"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ListeningGuide, PublicListeningSegment } from "@/lib/textbooks/listening"
import type { WorkbookField } from "@/lib/textbooks/workbook"

export type ListeningGroup = {
  id: string
  rangeLabel: string
  startQ: number
  endQ: number
  instruction: string
  fieldCount: number
  startTime: number
  endTime: number
  duration: number
  y: number
  pageNumber?: number
  audioUrl?: string
  waveform?: number[]
}

/**
 * Normalizes instruction text by removing question number prefixes, leading markers,
 * and common introductory phrases like "다음을 듣고", "잘 듣고", etc.
 */
export function normalizeInstructionText(raw: string): string {
  if (!raw) return ""
  return raw
    .replace(/^\[\d+\s*[-~]\s*\d+\]\s*/, "")
    .replace(/^\[?\d+[\]\.\s번]*/, "")
    .replace(/^다음을\s*듣고\s*/, "")
    .replace(/^다음을\s*잘\s*듣고\s*/, "")
    .replace(/^잘\s*듣고\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Parses question number and question range from a workbook field label.
 */
export function parseFieldQuestion(field: WorkbookField): {
  startQ: number | null
  endQ: number | null
  isExplicitRange: boolean
  instruction: string
} {
  const rangeMatch = field.label.match(/\[(\d+)\s*[-~]\s*(\d+)\]/)
  if (rangeMatch) {
    return {
      startQ: parseInt(rangeMatch[1], 10),
      endQ: parseInt(rangeMatch[2], 10),
      isExplicitRange: true,
      instruction: normalizeInstructionText(field.label),
    }
  }

  const singleMatch = field.label.match(/^\[?(\d+)[\]\.\s번]*(.*)/)
  if (singleMatch) {
    const q = parseInt(singleMatch[1], 10)
    return {
      startQ: q,
      endQ: q,
      isExplicitRange: false,
      instruction: normalizeInstructionText(singleMatch[2]),
    }
  }

  return {
    startQ: null,
    endQ: null,
    isExplicitRange: false,
    instruction: normalizeInstructionText(field.label),
  }
}

export function isTitleSegment(s: PublicListeningSegment): boolean {
  if (!s || !s.text_ko) return false
  const text = s.text_ko.trim()
  if (text.includes("다시")) return false
  if (text.includes("문제입니다")) return false
  if (text.match(/^\d+번?\.?$/)) return false
  if (text === "듣기." || text === "듣기") return false

  const hasTitleKeywords =
    text.includes("고르") ||
    text.includes("대답") ||
    text.includes("쓰십시오") ||
    text.includes("쓰세요") ||
    text.includes("연결") ||
    text.includes("맞으면") ||
    text.includes("맞는") ||
    text.includes("관계 있는") ||
    text.includes("관계있는") ||
    text.includes("그림") ||
    text.includes("이야기를") ||
    text.includes("이야기") ||
    text.includes("대화")

  return (s.role === "instruction" && text.length > 5) || hasTitleKeywords
}

export function extractAudioTitleCues(segments: PublicListeningSegment[]): Array<{
  index: number
  start: number
  end: number
  text: string
}> {
  const cues: Array<{ index: number; start: number; end: number; text: string }> = []
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    if (isTitleSegment(s)) {
      if (cues.length > 0 && s.start - cues[cues.length - 1].end < 2.5) {
        cues[cues.length - 1].text += " " + s.text_ko
        cues[cues.length - 1].end = s.end
        continue
      }
      cues.push({
        index: i,
        start: s.start,
        end: s.end,
        text: s.text_ko,
      })
    }
  }
  return cues
}

/**
 * Builds canonical audio question groups by combining printed question numbers from workbook fields
 * and studio audio segments.
 *
 * User specification:
 * - Each audio slice begins EXACTLY when the section title sentence is read
 *   (e.g. "들은 것을 고르십시오." starts file 1, "잘 듣고 맞는 그림을 고르십시오." starts file 2,
 *   "질문을 듣고 알맞은 대답을 고르십시오." starts file 3, etc.)
 * - The previous file ends EXACTLY when the next title begins ("phần kết thúc thì khi nào thấy chạm bắt đầu cắt từ khúc đó kết thúc âm thanh của đoạn trước").
 */
export function buildCanonicalGroups(
  fields: (WorkbookField & { pageNumber?: number })[] = [],
  segments: PublicListeningSegment[] = []
): ListeningGroup[] {
  const explicitGroups = segments.filter(segment => segment.questionNumber && segment.questionEndNumber && segment.groupInstruction)
  if (explicitGroups.length) return explicitGroups.map(segment => {
    const matched = fields.filter(field => field.section === "listening" && (() => {
      const parsed = parseFieldQuestion(field)
      return parsed.startQ !== null && parsed.startQ >= segment.questionNumber! && parsed.startQ <= segment.questionEndNumber!
    })())
    const first = matched.toSorted((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0) || a.rect.y - b.rect.y)[0]
    const instruction = /[.!?]$/.test(segment.groupInstruction!.trim()) ? segment.groupInstruction! : segment.text_ko.match(/^[\s\S]*?[.!?](?:\s|$)/)?.[0].trim() || segment.groupInstruction!
    return { id: segment.id, startQ: segment.questionNumber!, endQ: segment.questionEndNumber!, rangeLabel: `[${segment.questionNumber} - ${segment.questionEndNumber}]`, instruction, fieldCount: matched.length, pageNumber: segment.pageNumber ?? first?.pageNumber, y: segment.anchorY ?? first?.rect.y ?? 0.1, startTime: segment.clipStart, endTime: segment.clipEnd, duration: segment.clipEnd - segment.clipStart, audioUrl: segment.audio_url, waveform: segment.waveform }
  }).filter(group => group.pageNumber !== undefined || !fields.length || group.fieldCount > 0)
  const listeningFields = fields
    .filter((f) => f.section === "listening")
    .map((f) => ({ ...f, parsed: parseFieldQuestion(f) }))
    .sort((a, b) => {
      if (a.pageNumber !== b.pageNumber && a.pageNumber && b.pageNumber) {
        return a.pageNumber - b.pageNumber
      }
      return (a.rect?.y || 0) - (b.rect?.y || 0)
    })

  const audioTitles = extractAudioTitleCues(segments)

  // 1. Group fields by instruction headers / sections
  const fieldGroups: Array<{
    startQ: number
    endQ: number
    instruction: string
    norm: string
    isHeader: boolean
    pageNumber?: number
    y: number
    firstField: (typeof listeningFields)[0]
    fields: typeof listeningFields
  }> = []
  let currentGroup: (typeof fieldGroups)[0] | null = null

  for (const f of listeningFields) {
    const norm = normalizeInstructionText(f.parsed.instruction)
    const isExplicit = f.parsed.isExplicitRange
    const isQuestionFragment =
      f.label.includes("....") || f.label.includes("___") || f.label.trim().endsWith("?")
    const isHeader =
      !isQuestionFragment &&
      (norm.includes("고르") ||
        norm.includes("대답") ||
        norm.includes("쓰") ||
        norm.includes("연결") ||
        norm.includes("그림") ||
        norm.includes("이야기") ||
        norm.includes("대화"))

    const isExplicitChange = Boolean(
      isExplicit &&
        currentGroup &&
        (f.parsed.startQ !== currentGroup.startQ || f.parsed.endQ !== currentGroup.endQ)
    )

    const shouldStartNew =
      !currentGroup ||
      isExplicitChange ||
      (isHeader && currentGroup?.isHeader && norm !== currentGroup?.norm) ||
      (isHeader !== (currentGroup?.isHeader ?? false))

    if (shouldStartNew || !currentGroup) {
      if (currentGroup) fieldGroups.push(currentGroup)
      currentGroup = {
        startQ: f.parsed.startQ || 1,
        endQ: f.parsed.endQ || 1,
        instruction: f.parsed.instruction,
        norm: isHeader ? norm : "",
        isHeader,
        pageNumber: f.pageNumber,
        y: f.rect?.y || 0.1,
        firstField: f,
        fields: [f],
      }
    } else {
      if (f.parsed.endQ) currentGroup.endQ = Math.max(currentGroup.endQ, f.parsed.endQ)
      currentGroup.fields.push(f)
    }
  }
  if (currentGroup) fieldGroups.push(currentGroup)

  // If no fields found, fallback to audio titles directly
  if (!fieldGroups.length) {
    if (!audioTitles.length) return []
    const groups: ListeningGroup[] = []
    for (let i = 0; i < audioTitles.length; i++) {
      const t = audioTitles[i]
      const nextT = audioTitles[i + 1]
      const startTime = t.start
      const endTime = nextT ? nextT.start : (segments[segments.length - 1]?.end || 0)
      groups.push({
        id: `audio-group-${i}`,
        rangeLabel: `Phần ${i + 1}`,
        startQ: i + 1,
        endQ: i + 1,
        instruction: t.text,
        fieldCount: 0,
        startTime,
        endTime,
        duration: Math.max(0, endTime - startTime),
        y: 0.1,
      })
    }
    return groups
  }

  // 2. Align each field group with an audio title cue
  const result: ListeningGroup[] = []
  let lastMatchedTitleIdx = -1

  for (let i = 0; i < fieldGroups.length; i++) {
    const fg = fieldGroups[i]
    let matchingTitle: (typeof audioTitles)[0] | null = null

    // Attempt text match with remaining audio titles
    for (let tIdx = lastMatchedTitleIdx + 1; tIdx < audioTitles.length; tIdx++) {
      const t = audioTitles[tIdx]
      const tNorm = normalizeInstructionText(t.text)
      const fgNorm = normalizeInstructionText(fg.instruction)
      if (
        (tNorm &&
          fgNorm &&
          (tNorm.includes(fgNorm.slice(0, 4)) || fgNorm.includes(tNorm.slice(0, 4)))) ||
        (audioTitles.length === fieldGroups.length && tIdx === i)
      ) {
        matchingTitle = t
        lastMatchedTitleIdx = tIdx
        break
      }
    }

    // Positional fallback if equal counts or 1:1 progression
    if (!matchingTitle && audioTitles[i] && i > lastMatchedTitleIdx) {
      matchingTitle = audioTitles[i]
      lastMatchedTitleIdx = i
    }

    let startTime = 0
    if (matchingTitle) {
      // Anchored to the exact spoken title sentence
      startTime = matchingTitle.start
    } else {
      // Look for question segment in audio or transition after previous group
      let sIdx = segments.findIndex(
        (seg) =>
          seg.questionNumber === fg.startQ ||
          seg.text_ko?.startsWith(`${fg.startQ}.`) ||
          seg.text_ko?.startsWith(`${fg.startQ}번`)
      )
      if (sIdx < 0 && i > 0 && fieldGroups[i - 1]?.endQ) {
        const prevEndQ = fieldGroups[i - 1].endQ
        const prevLastIdx = segments.findLastIndex(
          (seg) => seg.questionNumber && seg.questionNumber <= prevEndQ
        )
        if (prevLastIdx >= 0 && prevLastIdx < segments.length - 1) {
          sIdx = prevLastIdx + 1
        }
      }
      if (
        sIdx > 0 &&
        segments[sIdx - 1].role === "instruction" &&
        !segments[sIdx - 1].text_ko.includes("다시") &&
        !segments[sIdx - 1].text_ko.includes("문제입니다")
      ) {
        sIdx--
      }
      if (sIdx >= 0) {
        startTime = segments[sIdx].start
      } else if (i === 0 && audioTitles.length > 0) {
        startTime = audioTitles[0].start
      }
    }

    if (result.length > 0) {
      startTime = Math.max(result[result.length - 1].startTime, startTime)
    }

    const rangeLabel = fg.startQ === fg.endQ ? `Câu ${fg.startQ}` : `[${fg.startQ} - ${fg.endQ}]`
    const cleanInst = (matchingTitle?.text || fg.instruction)
      .replace(/^\[?\d+[\]\.\s번]*/, "")
      .replace(/^\[\d+\s*[-~]\s*\d+\]\s*/, "")
      .trim()

    result.push({
      id: `group-${fg.startQ}-${fg.endQ}-${i}`,
      rangeLabel,
      startQ: fg.startQ,
      endQ: fg.endQ,
      instruction: cleanInst,
      fieldCount: fg.fields.length,
      pageNumber: fg.pageNumber,
      y: fg.y,
      startTime,
      endTime: 0,
      duration: 0,
    })
  }

  // 3. User's exact cut rule:
  // "phần kết thúc thì khi nào thấy chạm bắt đầu cắt từ khúc đó kết thúc âm thanh của đoạn trước"
  // The previous file ends EXACTLY when the next file/title starts!
  for (let i = 0; i < result.length; i++) {
    const g = result[i]
    if (i < result.length - 1) {
      g.endTime = result[i + 1].startTime
    } else {
      g.endTime = segments[segments.length - 1]?.end || 0
    }
    g.duration = Math.max(0, g.endTime - g.startTime)
  }

  return result
}

/**
 * Builds canonical audio question groups directly from studio listening segments and fields.
 */
export function buildAudioGroupsFromSegments(
  segments: PublicListeningSegment[],
  fields: (WorkbookField & { pageNumber?: number })[] = []
): Array<{
  id: string
  instruction: string
  startTime: number
  endTime: number
  duration: number
  startQ: number
  endQ: number
  questionNumbers: number[]
  rangeLabel: string
  fieldCount: number
  pageNumber?: number
  y: number
}> {
  const groups = buildCanonicalGroups(fields, segments)
  return groups.map((g) => {
    const qList: number[] = []
    for (let q = g.startQ; q <= g.endQ; q++) qList.push(q)
    return {
      ...g,
      questionNumbers: qList,
    }
  })
}

/**
 * Extracts distinct question groups from workbook fields and aligns them with audio groups.
 */
export function extractListeningGroups(
  fields: (WorkbookField & { pageNumber?: number })[],
  segments: PublicListeningSegment[] = []
): ListeningGroup[] {
  return buildCanonicalGroups(fields, segments)
}

export function useWorkbookListening(
  resource: { id: string; title: string; resource_url: string | null } | null | undefined,
  userId: string | null
) {
  const resourceUrl = resource?.resource_url || null
  const [segments, setSegments] = useState<PublicListeningSegment[]>([])
  const [guides, setGuides] = useState<ListeningGuide[]>([])
  const [loading, setLoading] = useState(false)
  const [loadedResourceUrl, setLoadedResourceUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [waveform, setWaveform] = useState<number[]>([])
  const [canViewTranscript, setCanViewTranscript] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [repeat, setRepeat] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const clipOffsetRef = useRef(0)
  const clipSourceRef = useRef<string | null>(null)
  const fullDurationRef = useRef(0)
  const groupStartRef = useRef<number | null>(null)
  const groupEndRef = useRef<number | null>(null)
  const lastSavedRef = useRef(0)
  const pendingSeekRef = useRef<number | null>(null)

  // Fetch segments & guides for current resource
  useEffect(() => {
    if (!resourceUrl) return
    const controller = new AbortController()
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      setSegments([])
      setGuides([])
      setWaveform([])
      setLoadedResourceUrl(null)
      setActiveGroupId(null)
      setLoading(true)
    })
    clipOffsetRef.current = 0
    clipSourceRef.current = null
    pendingSeekRef.current = null
    groupStartRef.current = null
    groupEndRef.current = null
    const query = resourceUrl.includes("?") ? "&" : "?"

    void fetch(`${resourceUrl}${query}segments=1`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!controller.signal.aborted && data) {
          setSegments(data.segments || [])
          setCanViewTranscript(data.canViewTranscript === true)
          setGuides(data.answerGuide || [])
          setWaveform(data.waveform || [])
          if (Number.isFinite(data.duration) && data.duration > 0) {
            fullDurationRef.current = data.duration
            setDuration(data.duration)
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) { setLoading(false); setLoadedResourceUrl(resourceUrl) }
      })

    return () => controller.abort()
  }, [resourceUrl])

  // Save progress for full audio track
  const saveProgress = useCallback(() => {
    if (!userId || !resourceUrl || activeGroupId || clipSourceRef.current) return
    const player = audioRef.current
    if (!player || !Number.isFinite(player.duration) || player.duration <= 0) return
    lastSavedRef.current = Date.now()
    void fetch(resourceUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ userId, seconds: player.currentTime, duration: player.duration }),
    }).catch(() => undefined)
  }, [resourceUrl, userId, activeGroupId])

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      if (groupEndRef.current !== null && audioRef.current.currentTime >= groupEndRef.current-.1) {
        audioRef.current.currentTime=groupStartRef.current ?? 0
        setCurrentTime(audioRef.current.currentTime+clipOffsetRef.current)
      }
      audioRef.current.playbackRate = speed
      void audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    }
  }, [isPlaying, speed])

  // Play full audio track from start or current position
  const playFull = useCallback(() => {
    if (!audioRef.current) return
    if (clipSourceRef.current && resourceUrl) {
      audioRef.current.src = resourceUrl
      clipOffsetRef.current = 0
      clipSourceRef.current = null
      pendingSeekRef.current = null
      audioRef.current.load()
      setCurrentTime(0)
    }
    setActiveGroupId(null)
    groupStartRef.current = null
    groupEndRef.current = null
    audioRef.current.playbackRate = speed
    void audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }, [speed, resourceUrl])

  // Play a specific question group continuously
  const playGroup = useCallback(
    (group: { id: string; startTime: number; endTime: number; audioUrl?: string }, offsetSeconds = 0) => {
      if (!audioRef.current) return
      setActiveGroupId(group.id)
      if (group.audioUrl) {
        const changed = clipSourceRef.current !== group.audioUrl
        clipOffsetRef.current = group.startTime
        clipSourceRef.current = group.audioUrl
        if (changed) { audioRef.current.src = group.audioUrl; audioRef.current.load() }
      } else {
        clipOffsetRef.current = 0
        clipSourceRef.current = null
        if (resourceUrl && audioRef.current.getAttribute("src") !== resourceUrl) {
          audioRef.current.src = resourceUrl
          audioRef.current.load()
        }
      }
      groupStartRef.current = group.audioUrl ? 0 : Math.max(0, group.startTime)
      groupEndRef.current = group.audioUrl ? group.endTime - group.startTime : group.endTime > group.startTime ? group.endTime : null
      const target = groupStartRef.current + Math.max(0,Math.min(offsetSeconds,group.endTime-group.startTime-.05))
      if (audioRef.current.readyState >= 1) { pendingSeekRef.current = null; audioRef.current.currentTime = target }
      else pendingSeekRef.current = target
      setCurrentTime(target+clipOffsetRef.current)
      audioRef.current.playbackRate = speed
      void audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    },
    [speed, resourceUrl]
  )

  // Pause playback
  const pause = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    setIsPlaying(false)
  }, [])

  // Seek to specific second
  const seek = useCallback((time: number) => {
    if (!audioRef.current) return
    const local = Math.max(0, Math.min(audioRef.current.duration || Infinity, time - clipOffsetRef.current))
    if (audioRef.current.readyState >= 1) audioRef.current.currentTime = local
    else pendingSeekRef.current = local
    setCurrentTime(local + clipOffsetRef.current)
  }, [])

  // Skip relative delta
  const skip = useCallback((deltaSeconds: number) => {
    if (!audioRef.current) return
    const maxDur = audioRef.current.duration || 0
    const newTime = Math.max(0, Math.min(maxDur, audioRef.current.currentTime + deltaSeconds))
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime + clipOffsetRef.current)
  }, [])

  // Change playback speed
  const changeSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed
    }
  }, [])

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return
    const cur = audioRef.current.currentTime
    setCurrentTime(cur + clipOffsetRef.current)

    // Check if group playback reached end
    if (groupEndRef.current !== null && cur >= groupEndRef.current) {
      if (repeat && groupStartRef.current !== null) {
        audioRef.current.currentTime = groupStartRef.current
        void audioRef.current.play().catch(() => undefined)
      } else {
        audioRef.current.pause()
        setIsPlaying(false)
        setCurrentTime((groupEndRef.current || cur)+clipOffsetRef.current)
      }
      return
    }

    if (!activeGroupId && Date.now() - lastSavedRef.current > 10000) {
      saveProgress()
    }
  }, [activeGroupId, repeat, saveProgress])

  // Handle audio ended
  const handleEnded = useCallback(() => {
    if (clipSourceRef.current && repeat && audioRef.current) {
      audioRef.current.currentTime = 0
      void audioRef.current.play().catch(() => undefined)
      return
    }
    setIsPlaying(false)
    if (!clipSourceRef.current) { setActiveGroupId(null); groupStartRef.current = null; groupEndRef.current = null }
    saveProgress()
  }, [saveProgress, repeat])

  // Handle loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return
    if (pendingSeekRef.current !== null) {
      audioRef.current.currentTime=Math.min(pendingSeekRef.current,Math.max(0,audioRef.current.duration-.05))
      pendingSeekRef.current=null
    }
    if (!clipSourceRef.current) fullDurationRef.current = audioRef.current.duration
    setDuration(fullDurationRef.current || audioRef.current.duration)
    audioRef.current.playbackRate = speed
  }, [speed])

  // High-precision frame loop: stops playback right before the next section title begins
  // User requirement: "phần kết thúc thì khi nào thấy chạm bắt đầu cắt từ khúc đó kết thúc âm thanh của đoạn trước"
  // HTML5 audio timeupdate has a ~250ms delay which causes audio overshoot into the next title.
  // RAF checks every ~16ms and pauses with a 40ms safety buffer in the silence before the next title begins.
  useEffect(() => {
    if (!isPlaying || groupEndRef.current === null) return
    let animId: number

    const checkBoundary = () => {
      const player = audioRef.current
      if (!player) return
      const cur = player.currentTime
      const end = groupEndRef.current

      if (end !== null && cur >= end - 0.04) {
        if (repeat && groupStartRef.current !== null) {
          player.currentTime = groupStartRef.current
          void player.play().catch(() => undefined)
        } else {
          player.pause()
          setIsPlaying(false)
          setCurrentTime(end+clipOffsetRef.current)
          return
        }
      }
      animId = requestAnimationFrame(checkBoundary)
    }

    animId = requestAnimationFrame(checkBoundary)
    return () => cancelAnimationFrame(animId)
  }, [isPlaying, repeat])

  return {
    audioRef,
    // Keep React's initial src stable while playGroup selects a clip directly
    // on the media element. Reassigning src during render aborts play().
    audioUrl: resourceUrl,
    resource,
    segments: loadedResourceUrl === resourceUrl ? segments : [],
    guides: loadedResourceUrl === resourceUrl ? guides : [],
    loading: !!resourceUrl && (loading || loadedResourceUrl !== resourceUrl),
    ready: !resourceUrl || loadedResourceUrl === resourceUrl,
    isPlaying,
    currentTime,
    duration,
    waveform: loadedResourceUrl === resourceUrl ? waveform : [],
    canViewTranscript: loadedResourceUrl === resourceUrl && canViewTranscript,
    speed,
    repeat,
    activeGroupId,
    togglePlay,
    playFull,
    playGroup,
    pause,
    seek,
    skip,
    setSpeed: changeSpeed,
    setRepeat,
    handleTimeUpdate,
    handleEnded,
    handleLoadedMetadata,
    setDuration,
    setIsPlaying,
  }
}

export type WorkbookListeningController = ReturnType<typeof useWorkbookListening>
