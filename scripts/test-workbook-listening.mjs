import test from "node:test"
import assert from "node:assert/strict"
import { segmentTranscript, validateSegments } from "./lib/workbook-listening.mjs"

const word = (text, start, end, speaker_id = "speaker_1") => ({ type: "word", text, start, end, speaker_id })
test("sentence splitting preserves Korean, punctuation and complete ordered word coverage", () => {
  const input = [word("1번.", 1, 1.4), word("안녕하세요?", 1.8, 2.6), { type: "spacing", text: " ", start: 2.6, end: 2.6 }, word("저는", 3.2, 3.5), word("투안입니다.", 3.6, 4.8)]
  const result = segmentTranscript(input, 8)
  assert.equal(result.length, 2)
  assert.equal(result[0].text_ko, "1번. 안녕하세요?")
  assert.equal(result[1].text_ko, "저는 투안입니다.")
  assert.equal(result[0].firstWord, 0)
  assert.equal(result.at(-1).lastWord, 3)
  assert.equal(validateSegments(result, 8), true)
})
test("dialogue and actual pauses form separate clips, with padding inside available silence", () => {
  const input = [word("어디에", 0, 0.5), word("가요", 0.6, 1.1), word("은행에", 1.4, 2.0, "speaker_2"), word("가요", 2.1, 2.5, "speaker_2"), word("다음", 4, 4.5), word("문제입니다.", 4.6, 5.2)]
  const result = segmentTranscript(input, 6)
  assert.equal(result.length, 3)
  assert.ok(result[0].clipEnd <= result[1].clipStart + 0.0001)
  assert.ok(result.every(segment => segment.clipStart <= segment.start && segment.clipEnd >= segment.end))
  assert.equal(validateSegments(result, 6), true)
})
test("long turns split only between words and missing or invalid timestamps fail closed", () => {
  const input = Array.from({ length: 25 }, (_, index) => word("단어", index, index + 0.9))
  const result = segmentTranscript(input, 26)
  assert.ok(result.length >= 2)
  assert.equal(result.reduce((total, segment) => total + segment.lastWord - segment.firstWord + 1, 0), 25)
  assert.equal(validateSegments(result, 26), true)
  assert.throws(() => segmentTranscript([word("invalid", 5, 4)], 8), /timestamps/)
  assert.throws(() => segmentTranscript([], 8), /No timestamped speech/)
  assert.throws(() => validateSegments([{ ...result[0], clipStart: -1 }], 26), /boundaries/)
})
