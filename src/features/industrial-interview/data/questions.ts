import type { IndustrialQuestion } from "../types";

export const tightenBoltQuestion: IndustrialQuestion = {
  id: "tighten-bolt-01",
  title: "Siết bu lông bằng cờ lê",
  koreanText: "스패너와 너트를 사용해서 볼트를 조이세요.",
  vietnameseText: "Hãy sử dụng cờ lê và đai ốc để siết bu lông.",
  audioUrl: "/audio/industrial-interview/tighten-bolt-01.mp3",
  requiredToolIds: ["wrench"],
  requiredObjectIds: ["nut", "bolt"],
  distractorIds: [
    "hammer",
    "pliers",
    "adjustable-wrench",
    "flat-screwdriver",
    "phillips-screwdriver",
    "tape-measure",
    "washer",
  ],
  action: "tighten",
  correctSequence: [
    "select_nut",
    "place_nut_on_bolt",
    "select_wrench",
    "attach_wrench_to_nut",
    "rotate_clockwise",
    "complete",
  ],
  timeLimit: 30,
  maxScore: 100,
};
