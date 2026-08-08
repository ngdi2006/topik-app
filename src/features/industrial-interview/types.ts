export type IndustrialAction =
  | "tighten"
  | "loosen"
  | "measure"
  | "cut"
  | "sort"
  | "assemble";

export type GameMode = "practice" | "test";

export type IndustrialItemKind = "tool" | "object";

export interface IndustrialQuestion {
  id: string;
  title: string;
  koreanText: string;
  vietnameseText: string;
  audioUrl?: string;
  requiredToolIds: string[];
  requiredObjectIds: string[];
  distractorIds: string[];
  action: IndustrialAction;
  correctSequence: string[];
  timeLimit: number;
  maxScore: number;
}

export interface IndustrialItem {
  id: string;
  kind: IndustrialItemKind;
  koreanName: string;
  vietnameseName: string;
}

export interface ActionHistoryItem {
  action: string;
  timestamp: number;
  correct: boolean;
  objectId?: string;
  currentStep: number;
}

export interface IndustrialGameState {
  questionId: string;
  mode: GameMode;
  currentStepIndex: number;
  score: number;
  remainingTime: number;
  replayCount: number;
  wrongToolCount: number;
  wrongObjectCount: number;
  wrongSequenceCount: number;
  wrongDirectionCount: number;
  tighteningProgress: number;
  completed: boolean;
  timedOut: boolean;
  startedAt: number | null;
  completedAt: number | null;
  actionHistory: ActionHistoryItem[];
}

export interface IndustrialInterviewResultPayload {
  userId?: string;
  questionId: string;
  activityType: "industrial_interview";
  mode: GameMode;
  score: number;
  completionTime: number;
  replayCount: number;
  wrongToolCount: number;
  wrongObjectCount: number;
  wrongSequenceCount: number;
  wrongDirectionCount: number;
  actionHistory: ActionHistoryItem[];
  completed: boolean;
  timedOut: boolean;
}
