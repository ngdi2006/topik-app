"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { calculateIndustrialScore } from "../game/scoring";
import type {
  ActionHistoryItem,
  GameMode,
  IndustrialGameState,
  IndustrialItemKind,
  IndustrialQuestion,
} from "../types";

type GameEvent =
  | { type: "start" }
  | { type: "reset"; mode?: GameMode }
  | { type: "tick" }
  | { type: "record"; action: string; correct: boolean; objectId?: string }
  | { type: "advance"; action: string; objectId?: string; progress?: number }
  | { type: "penalty"; action: string; objectId?: string; penaltyKind: "tool" | "object" | "sequence" | "direction" | "replay" }
  | { type: "timeout" }
  | { type: "complete" };

function createInitialState(question: IndustrialQuestion, mode: GameMode): IndustrialGameState {
  return {
    questionId: question.id,
    mode,
    currentStepIndex: 0,
    score: 0,
    remainingTime: question.timeLimit,
    replayCount: 0,
    wrongToolCount: 0,
    wrongObjectCount: 0,
    wrongSequenceCount: 0,
    wrongDirectionCount: 0,
    tighteningProgress: 0,
    completed: false,
    timedOut: false,
    startedAt: null,
    completedAt: null,
    actionHistory: [],
  };
}

function withScore(state: IndustrialGameState, question: IndustrialQuestion) {
  return {
    ...state,
    score: calculateIndustrialScore(state, question),
  };
}

function reducerFactory(question: IndustrialQuestion) {
  return function reducer(state: IndustrialGameState, event: GameEvent): IndustrialGameState {
    const locked = state.completed || state.timedOut;

    if (event.type === "reset") {
      return createInitialState(question, event.mode ?? state.mode);
    }

    if (event.type === "start") {
      if (state.startedAt || locked) return state;
      return {
        ...state,
        startedAt: Date.now(),
        remainingTime: question.timeLimit,
      };
    }

    if (event.type === "tick") {
      if (!state.startedAt || locked) return state;
      const remainingTime = Math.max(0, state.remainingTime - 1);
      if (remainingTime === 0) {
        return withScore(
          {
            ...state,
            remainingTime,
            timedOut: true,
            completedAt: Date.now(),
            actionHistory: [
              ...state.actionHistory,
              makeHistoryItem("timeout", false, undefined, state.currentStepIndex),
            ],
          },
          question
        );
      }
      return { ...state, remainingTime };
    }

    if (locked) return state;

    if (event.type === "record") {
      return withScore(
        {
          ...state,
          actionHistory: [
            ...state.actionHistory,
            makeHistoryItem(event.action, event.correct, event.objectId, state.currentStepIndex),
          ],
        },
        question
      );
    }

    if (event.type === "advance") {
      const nextProgress = event.progress ?? state.tighteningProgress;
      const completed = nextProgress >= 100 || event.action === "complete";
      const nextState: IndustrialGameState = {
        ...state,
        currentStepIndex: completed
          ? question.correctSequence.length - 1
          : event.action === "rotate_clockwise"
            ? state.currentStepIndex
          : Math.min(state.currentStepIndex + 1, question.correctSequence.length - 1),
        tighteningProgress: nextProgress,
        completed,
        completedAt: completed ? Date.now() : state.completedAt,
        actionHistory: [
          ...state.actionHistory,
          makeHistoryItem(event.action, true, event.objectId, state.currentStepIndex),
        ],
      };

      return withScore(nextState, question);
    }

    if (event.type === "penalty") {
      const nextState: IndustrialGameState = {
        ...state,
        wrongToolCount: state.wrongToolCount + (event.penaltyKind === "tool" ? 1 : 0),
        wrongObjectCount: state.wrongObjectCount + (event.penaltyKind === "object" ? 1 : 0),
        wrongSequenceCount: state.wrongSequenceCount + (event.penaltyKind === "sequence" ? 1 : 0),
        wrongDirectionCount: state.wrongDirectionCount + (event.penaltyKind === "direction" ? 1 : 0),
        replayCount: state.replayCount + (event.penaltyKind === "replay" ? 1 : 0),
        actionHistory: [
          ...state.actionHistory,
          makeHistoryItem(event.action, false, event.objectId, state.currentStepIndex),
        ],
      };

      return withScore(nextState, question);
    }

    if (event.type === "timeout") {
      return withScore(
        {
          ...state,
          timedOut: true,
          completedAt: Date.now(),
          actionHistory: [
            ...state.actionHistory,
            makeHistoryItem("timeout", false, undefined, state.currentStepIndex),
          ],
        },
        question
      );
    }

    if (event.type === "complete") {
      return withScore(
        {
          ...state,
          completed: true,
          completedAt: Date.now(),
          currentStepIndex: question.correctSequence.length - 1,
          tighteningProgress: 100,
          actionHistory: [
            ...state.actionHistory,
            makeHistoryItem("complete", true, undefined, state.currentStepIndex),
          ],
        },
        question
      );
    }

    return state;
  };
}

function makeHistoryItem(
  action: string,
  correct: boolean,
  objectId: string | undefined,
  currentStep: number
): ActionHistoryItem {
  return {
    action,
    timestamp: Date.now(),
    correct,
    objectId,
    currentStep,
  };
}

export function useIndustrialInterviewGame(question: IndustrialQuestion, mode: GameMode) {
  const reducer = useMemo(() => reducerFactory(question), [question]);
  const [state, dispatch] = useReducer(reducer, question, () =>
    createInitialState(question, mode)
  );

  useEffect(() => {
    if (!state.startedAt || state.completed || state.timedOut) return;

    const intervalId = window.setInterval(() => {
      dispatch({ type: "tick" });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [state.startedAt, state.completed, state.timedOut]);

  const startQuestion = useCallback(() => {
    dispatch({ type: "start" });
  }, []);

  const resetQuestion = useCallback(
    (nextMode?: GameMode) => {
      dispatch({ type: "reset", mode: nextMode });
    },
    []
  );

  const selectItem = useCallback(
    (itemId: string, kind: IndustrialItemKind) => {
      if (!state.startedAt || state.completed || state.timedOut) {
        dispatch({ type: "record", action: "select_before_start", correct: false, objectId: itemId });
        return { correct: false, reason: "not_started" as const };
      }

      const expectedAction = question.correctSequence[state.currentStepIndex];

      if (expectedAction === "select_nut") {
        if (itemId === "nut") {
          dispatch({ type: "advance", action: "select_nut", objectId: itemId });
          return { correct: true };
        }
        dispatch({
          type: "penalty",
          action: "select_wrong_object",
          objectId: itemId,
          penaltyKind: kind === "tool" ? "tool" : "object",
        });
        return { correct: false, reason: "wrong_item" as const };
      }

      if (expectedAction === "select_wrench") {
        if (itemId === "wrench") {
          dispatch({ type: "advance", action: "select_wrench", objectId: itemId });
          return { correct: true };
        }
        dispatch({
          type: "penalty",
          action: "select_wrong_tool",
          objectId: itemId,
          penaltyKind: kind === "tool" ? "tool" : "object",
        });
        return { correct: false, reason: "wrong_item" as const };
      }

      dispatch({
        type: "penalty",
        action: "wrong_sequence_select",
        objectId: itemId,
        penaltyKind: "sequence",
      });
      return { correct: false, reason: "wrong_sequence" as const };
    },
    [question.correctSequence, state.completed, state.currentStepIndex, state.startedAt, state.timedOut]
  );

  const dropItem = useCallback(
    (itemId: string, zoneId: string) => {
      if (!state.startedAt || state.completed || state.timedOut) {
        return { correct: false, reason: "locked" as const };
      }

      const expectedAction = question.correctSequence[state.currentStepIndex];

      if (expectedAction === "place_nut_on_bolt") {
        if (itemId === "nut" && zoneId === "bolt-thread") {
          dispatch({ type: "advance", action: "place_nut_on_bolt", objectId: itemId });
          return { correct: true };
        }
        dispatch({
          type: "penalty",
          action: "drop_wrong_object_zone",
          objectId: itemId,
          penaltyKind: itemId === "nut" ? "sequence" : "object",
        });
        return { correct: false, reason: "wrong_drop_zone" as const };
      }

      if (expectedAction === "attach_wrench_to_nut") {
        if (itemId === "wrench" && zoneId === "nut-head") {
          dispatch({ type: "advance", action: "attach_wrench_to_nut", objectId: itemId });
          return { correct: true };
        }
        dispatch({
          type: "penalty",
          action: "drop_wrong_tool_zone",
          objectId: itemId,
          penaltyKind: itemId === "wrench" ? "sequence" : "tool",
        });
        return { correct: false, reason: "wrong_drop_zone" as const };
      }

      dispatch({
        type: "penalty",
        action: "wrong_sequence_drop",
        objectId: itemId,
        penaltyKind: "sequence",
      });
      return { correct: false, reason: "wrong_sequence" as const };
    },
    [question.correctSequence, state.completed, state.currentStepIndex, state.startedAt, state.timedOut]
  );

  const validateAction = useCallback(
    (action: string) => question.correctSequence[state.currentStepIndex] === action,
    [question.correctSequence, state.currentStepIndex]
  );

  const recordAction = useCallback((action: string, correct: boolean, objectId?: string) => {
    dispatch({ type: "record", action, correct, objectId });
  }, []);

  const applyPenalty = useCallback(
    (action: string, penaltyKind: "tool" | "object" | "sequence" | "direction" | "replay", objectId?: string) => {
      dispatch({ type: "penalty", action, penaltyKind, objectId });
    },
    []
  );

  const increaseTighteningProgress = useCallback(
    (amount: number, direction: "clockwise" | "counter_clockwise") => {
      if (!state.startedAt || state.completed || state.timedOut) {
        return { correct: false, reason: "locked" as const };
      }

      if (question.correctSequence[state.currentStepIndex] !== "rotate_clockwise") {
        dispatch({
          type: "penalty",
          action: "wrong_sequence_rotate",
          penaltyKind: "sequence",
        });
        return { correct: false, reason: "wrong_sequence" as const };
      }

      if (direction !== "clockwise") {
        dispatch({
          type: "penalty",
          action: "rotate_counter_clockwise",
          penaltyKind: "direction",
        });
        return { correct: false, reason: "wrong_direction" as const };
      }

      const nextProgress = Math.min(100, state.tighteningProgress + amount);
      dispatch({
        type: "advance",
        action: nextProgress >= 100 ? "complete" : "rotate_clockwise",
        objectId: "wrench",
        progress: nextProgress,
      });
      return { correct: true, completed: nextProgress >= 100 };
    },
    [
      question.correctSequence,
      state.completed,
      state.currentStepIndex,
      state.startedAt,
      state.tighteningProgress,
      state.timedOut,
    ]
  );

  const replayAudio = useCallback(() => {
    dispatch({ type: "penalty", action: "replay_audio", penaltyKind: "replay" });
  }, []);

  const completeQuestion = useCallback(() => {
    dispatch({ type: "complete" });
  }, []);

  const timeoutQuestion = useCallback(() => {
    dispatch({ type: "timeout" });
  }, []);

  return {
    state,
    startQuestion,
    selectItem,
    dropItem,
    validateAction,
    recordAction,
    applyPenalty,
    increaseTighteningProgress,
    replayAudio,
    completeQuestion,
    timeoutQuestion,
    resetQuestion,
  };
}
