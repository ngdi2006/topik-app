import type { IndustrialInterviewResultPayload } from "../types";

const STORAGE_KEY = "industrial_interview_results_v1";

export function saveIndustrialInterviewResult(payload: IndustrialInterviewResultPayload) {
  if (typeof window === "undefined") {
    return { ok: false, error: "Window is not available" };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const previous = raw ? (JSON.parse(raw) as IndustrialInterviewResultPayload[]) : [];
    const next = [payload, ...previous].slice(0, 20);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save result",
    };
  }
}
