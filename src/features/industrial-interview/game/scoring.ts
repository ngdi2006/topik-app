import type { IndustrialGameState, IndustrialQuestion } from "../types";

const PENALTIES = {
  wrongTool: 10,
  wrongObject: 10,
  wrongSequence: 5,
  wrongDirection: 5,
  replay: 2,
};

export function calculateIndustrialScore(
  state: IndustrialGameState,
  question: IndustrialQuestion
) {
  const sequenceReached = Math.min(
    state.currentStepIndex,
    question.correctSequence.length - 1
  );
  const baseScore =
    (sequenceReached >= 1 ? 20 : 0) +
    (sequenceReached >= 3 ? 25 : 0) +
    (sequenceReached >= 4 ? 20 : 0) +
    (state.tighteningProgress >= 100 ? 25 : Math.floor(state.tighteningProgress * 0.25)) +
    (state.completed && !state.timedOut ? 10 : 0);

  const penalty =
    state.wrongToolCount * PENALTIES.wrongTool +
    state.wrongObjectCount * PENALTIES.wrongObject +
    state.wrongSequenceCount * PENALTIES.wrongSequence +
    state.wrongDirectionCount * PENALTIES.wrongDirection +
    state.replayCount * PENALTIES.replay;

  return Math.max(0, Math.min(question.maxScore, baseScore - penalty));
}

export function buildIndustrialFeedback(state: IndustrialGameState) {
  const feedback: string[] = [];

  if (state.currentStepIndex >= 3) {
    feedback.push("Bạn đã chọn đúng cờ lê và đai ốc.");
  }

  if (state.wrongSequenceCount === 0 && state.currentStepIndex >= 4) {
    feedback.push("Bạn thực hiện đúng trình tự.");
  }

  if (state.completed && !state.timedOut) {
    feedback.push("Bạn hoàn thành thao tác trong thời gian quy định.");
  } else if (state.timedOut) {
    feedback.push("Bạn cần thao tác nhanh hơn để kịp thời gian.");
  }

  if (state.replayCount > 0) {
    feedback.push(`Bạn đã nghe lại câu hỏi ${state.replayCount} lần.`);
  }

  if (state.wrongToolCount > 0) {
    feedback.push("Cần phân biệt chính xác dụng cụ trước khi thao tác.");
  }

  if (state.wrongObjectCount > 0) {
    feedback.push("Cần chọn đúng vật liệu trước khi đặt vào chi tiết máy.");
  }

  if (state.wrongDirectionCount > 0) {
    feedback.push("Khi siết bu lông, hãy kéo theo chiều kim đồng hồ.");
  }

  return feedback.length > 0 ? feedback : ["Hãy làm lại chậm rãi theo đúng thứ tự thao tác."];
}
