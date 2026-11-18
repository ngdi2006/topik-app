import { z } from "zod"

const section = z.enum(["vocabulary", "grammar", "writing", "reading", "listening", "intro", "other"])
const waveform = z.array(z.number().int().min(0).max(255)).min(2).max(4096)
export const listeningSegmentSchema = z.object({
  id: z.string().regex(/^s\d{4,6}$/), index: z.number().int().positive(),
  start: z.number().nonnegative(), end: z.number().nonnegative(), clipStart: z.number().nonnegative(), clipEnd: z.number().positive(),
  text_ko: z.string().max(10000), text_vi: z.string().max(10000),
  section, role: z.enum(["instruction", "question", "dialogue", "option", "answer", "explanation", "other"]),
  questionNumber: z.number().int().positive().max(200).nullable(), uncertain: z.boolean(), audio_path: z.string().min(1),
  questionEndNumber: z.number().int().positive().max(200).optional(), groupInstruction: z.string().max(1000).optional(),
  pageNumber: z.number().int().positive().optional(), anchorY: z.number().min(0).max(1).optional(),
  waveform: waveform.optional(),
})
export const listeningGuideSchema = z.object({
  fieldId: z.string().min(1).max(80), pageNumber: z.number().int().positive(),
  optionIds: z.array(z.string().max(80)).max(10), answerText: z.string().max(8000),
  explanation_vi: z.string().max(8000), evidenceSegmentIds: z.array(z.string().max(80)).max(50),
  status: z.enum(["draft", "reviewed"]), confidence: z.enum(["high", "medium", "low", "insufficient"]),
})
const manifestSchema = z.object({ version: z.literal(1), status: z.enum(["draft", "reviewed"]), sourceChecksum: z.string(), duration: z.number().positive(), lesson: z.number().int().min(-2), transcriptionProvider: z.enum(["elevenlabs", "gemini"]), waveform: waveform.optional(), segments: z.array(listeningSegmentSchema).max(3000), answerGuide: z.array(listeningGuideSchema).max(500) })
export function parseListening(metadata: unknown) {
  const result = manifestSchema.safeParse((metadata as { listening?: unknown } | null)?.listening)
  return result.success ? result.data : null
}
export type ListeningSegment = z.infer<typeof listeningSegmentSchema>
export type ListeningGuide = z.infer<typeof listeningGuideSchema>
export type PublicListeningSegment = Omit<ListeningSegment, "audio_path"> & { audio_url: string }
