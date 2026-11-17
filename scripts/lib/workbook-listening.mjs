export function segmentTranscript(words, duration) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Invalid audio duration")
  const spoken = words.filter(word => word.type === "word" && typeof word.text === "string" && word.text.trim())
  if (!spoken.length) throw new Error("No timestamped speech")
  if (spoken.some(word => !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < 0 || word.end < word.start || word.end > duration + 0.5)) throw new Error("Invalid word timestamps")
  const groups = []
  let group = []
  for (let index = 0; index < spoken.length; index++) {
    const word = spoken[index]; const next = spoken[index + 1]
    group.push({ ...word, wordIndex: index })
    const text = group.map(item => item.text.trim()).join(" ")
    const numberOnly = /^(?:\d+\s*번[.!?]?|[일이삼사오육칠팔구십]+\s*번[.!?]?)$/.test(text)
    const boundary = !next || (!numberOnly && (/[.!?。？！]["'”’)]*$/.test(word.text.trim()) || next.start - word.end >= 0.65 || (word.speaker_id && next.speaker_id && word.speaker_id !== next.speaker_id && next.start - word.end > 0.08) || word.end - group[0].start >= 18))
    if (boundary) { groups.push(group); group = [] }
  }
  return groups.map((group, index) => {
    const start = group[0].start; const end = group.at(-1).end
    const previousEnd = groups[index - 1]?.at(-1).end || 0
    const nextStart = groups[index + 1]?.[0].start ?? duration
    const clipStart = Math.max(0, start - Math.min(0.16, Math.max(0, (start - previousEnd) / 2)))
    const clipEnd = Math.min(duration, end + Math.min(0.2, Math.max(0, (nextStart - end) / 2)))
    return { id: `s${String(index + 1).padStart(4, "0")}`, index: index + 1, start, end, clipStart, clipEnd: Math.max(clipEnd, clipStart + 0.04), firstWord: group[0].wordIndex, lastWord: group.at(-1).wordIndex, text_ko: group.map(word => word.text.trim()).join(" "), speakerIds: [...new Set(group.map(word => word.speaker_id).filter(Boolean))] }
  })
}

export function validateSegments(segments, duration) {
  const ids = new Set()
  for (const [index, segment] of segments.entries()) {
    if (!segment.id || ids.has(segment.id)) throw new Error("Duplicate segment ID")
    ids.add(segment.id)
    if (!(segment.clipStart >= 0 && segment.clipStart <= segment.start && segment.clipEnd >= segment.end && segment.clipEnd <= duration + 0.1 && segment.clipEnd > segment.clipStart)) throw new Error(`Invalid clip boundaries: ${segment.id}`)
    if (index && segment.firstWord !== undefined && segment.firstWord !== segments[index - 1].lastWord + 1) throw new Error("Speech words lost between clips")
    if (index && segment.start < segments[index - 1].start) throw new Error("Clips are not in source order")
  }
  return true
}
