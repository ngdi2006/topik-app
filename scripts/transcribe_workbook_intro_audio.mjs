// Uses the same ElevenLabs word-timestamp configuration as workbook lessons 1–60.
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { segmentTranscript, validateSegments } from './lib/workbook-listening.mjs'

const root = 'tmp/workbook-listening-intro'
const tracks = JSON.parse(await readFile(`${root}/sources.json`, 'utf8'))
if (!process.env.ELEVENLABS_API_KEY) throw new Error('Missing ELEVENLABS_API_KEY')
for (const track of tracks) {
  const directory = `${root}/${track.key}`
  const source = await readFile(track.source_path)
  const checksum = createHash('sha256').update(source).digest('hex')
  if (checksum !== track.source_checksum) throw new Error(`${track.key}: source changed`)
  let transcript
  try { const cached = JSON.parse(await readFile(`${directory}/transcript.json`, 'utf8')); if (cached.sourceChecksum === checksum && cached.provider === 'elevenlabs' && cached.model === 'scribe_v2' && cached.words?.some(w => w.type === 'word')) transcript = cached } catch {}
  if (!transcript) {
    const form = new FormData()
    form.append('file', new Blob([source], { type: 'audio/mpeg' }), `${track.key}.mp3`)
    form.append('model_id', 'scribe_v2')
    form.append('language_code', 'kor')
    form.append('timestamps_granularity', 'word')
    form.append('tag_audio_events', 'false')
    form.append('diarize', 'true')
    console.log(`${track.key}: sending ${track.duration.toFixed(1)} seconds to ElevenLabs Scribe v2`)
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, body: form, signal: AbortSignal.timeout(600000) })
    if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${(await response.text()).slice(0, 400)}`)
    const data = await response.json()
    if (!Array.isArray(data.words) || !data.words.some(w => w.type === 'word')) throw new Error(`${track.key}: no timestamped words`)
    if (data.words.some(w => !Number.isFinite(w.start) || !Number.isFinite(w.end) || w.end < w.start || w.end > track.duration + 2)) throw new Error(`${track.key}: invalid timestamps`)
    transcript = { ...data, provider: 'elevenlabs', model: 'scribe_v2', sourceChecksum: checksum, duration: track.duration, sourceFile: track.source_file, generatedAt: new Date().toISOString() }
    await writeFile(`${directory}/transcript.json`, JSON.stringify(transcript, null, 2))
  }
  const segments = segmentTranscript(transcript.words, track.duration)
  validateSegments(segments, track.duration)
  await writeFile(`${directory}/segments.json`, JSON.stringify({ key: track.key, sourceChecksum: checksum, duration: track.duration, segments }, null, 2))
  await writeFile(`${directory}/transcript.ko.txt`, transcript.text)
  console.log(`${track.key}: ${transcript.words.filter(w => w.type === 'word').length} words, ${segments.length} speech segments`)
}
