"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Headphones,
  Play,
  RotateCcw,
  Timer,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { itemById } from "../data/items";
import { tightenBoltQuestion } from "../data/questions";
import { buildIndustrialFeedback } from "../game/scoring";
import { useIndustrialInterviewGame } from "../hooks/useIndustrialInterviewGame";
import { saveIndustrialInterviewResult } from "../services/resultStorage";
import type { GameMode, IndustrialItem, IndustrialInterviewResultPayload } from "../types";
import { IndustrialItemIcon } from "./IndustrialItemIcon";

type DragState = {
  item: IndustrialItem;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
};

const STEP_GUIDES = [
  "Bước 1: Chọn đai ốc.",
  "Bước 2: Đặt đai ốc vào bu lông.",
  "Bước 3: Chọn cờ lê.",
  "Bước 4: Đặt cờ lê vào đai ốc.",
  "Bước 5: Xoay theo chiều kim đồng hồ.",
];

export default function IndustrialInterviewGame() {
  const question = tightenBoltQuestion;
  const [mode, setMode] = useState<GameMode>("practice");
  const {
    state,
    startQuestion,
    selectItem,
    dropItem,
    increaseTighteningProgress,
    replayAudio,
    resetQuestion,
  } = useIndustrialInterviewGame(question, mode);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [shakeItemId, setShakeItemId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Nhấn bắt đầu để nghe hoặc đọc câu lệnh.");
  const [wrenchAngle, setWrenchAngle] = useState(0);
  const rotateStartXRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const savedRef = useRef(false);

  const locked = !state.startedAt || state.completed || state.timedOut;
  const showPracticeHints = state.mode === "practice";
  const nutPlaced = state.currentStepIndex >= 2;
  const wrenchAttached = state.currentStepIndex >= 4;
  const terminal = state.completed || state.timedOut;

  const orderedItems = useMemo(() => {
    const ids = [
      ...question.requiredToolIds,
      ...question.requiredObjectIds.filter((id) => id !== "bolt"),
      ...question.distractorIds,
    ];
    return ids
      .map((id) => itemById.get(id))
      .filter((item): item is IndustrialItem => Boolean(item));
  }, [question.distractorIds, question.requiredObjectIds, question.requiredToolIds]);

  useEffect(() => {
    if (!terminal || savedRef.current) return;

    const completionTime = state.startedAt
      ? Math.max(0, Math.round(((state.completedAt ?? Date.now()) - state.startedAt) / 1000))
      : 0;
    const payload: IndustrialInterviewResultPayload = {
      questionId: state.questionId,
      activityType: "industrial_interview",
      mode: state.mode,
      score: state.score,
      completionTime,
      replayCount: state.replayCount,
      wrongToolCount: state.wrongToolCount,
      wrongObjectCount: state.wrongObjectCount,
      wrongSequenceCount: state.wrongSequenceCount,
      wrongDirectionCount: state.wrongDirectionCount,
      actionHistory: state.actionHistory,
      completed: state.completed,
      timedOut: state.timedOut,
    };

    const result = saveIndustrialInterviewResult(payload);
    savedRef.current = true;
    if (!result.ok) {
      toast.error("Không thể lưu kết quả tạm thời, nhưng kết quả vẫn hiển thị trên màn hình.");
    }
  }, [state, terminal]);

  const triggerShake = useCallback((itemId: string) => {
    setShakeItemId(itemId);
    window.setTimeout(() => setShakeItemId(null), 320);
  }, []);

  const handleIncorrect = useCallback(
    (itemId: string, text: string) => {
      triggerShake(itemId);
      setStatusText(state.mode === "practice" ? text : "Thao tác chưa chính xác.");
    },
    [state.mode, triggerShake]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, item: IndustrialItem) => {
      if (locked) {
        setStatusText("Hãy nhấn bắt đầu trước khi thao tác.");
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = event.currentTarget.getBoundingClientRect();
      const selectResult = selectItem(item.id, item.kind);

      if (!selectResult.correct) {
        handleIncorrect(
          item.id,
          selectResult.reason === "wrong_sequence"
            ? "Bạn cần hoàn thành bước hiện tại trước."
            : "Vật thể hoặc dụng cụ này chưa đúng."
        );
        return;
      }

      setStatusText(item.id === "nut" ? "Kéo đai ốc vào vị trí bu lông." : "Kéo cờ lê vào vùng đai ốc.");
      setDragState({
        item,
        x: event.clientX,
        y: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      });
    },
    [handleIncorrect, locked, selectItem]
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    setDragState((current) =>
      current
        ? {
            ...current,
            x: event.clientX,
            y: event.clientY,
          }
        : null
    );
  }, [dragState]);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState) return;

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const zone = element?.closest<HTMLElement>("[data-drop-zone]");
      const zoneId = zone?.dataset.dropZone;

      if (!zoneId) {
        handleIncorrect(dragState.item.id, "Hãy thả vật thể vào đúng vùng thao tác.");
        setDragState(null);
        return;
      }

      const result = dropItem(dragState.item.id, zoneId);
      if (!result.correct) {
        handleIncorrect(
          dragState.item.id,
          result.reason === "wrong_sequence"
            ? "Bạn đang làm sai thứ tự thao tác."
            : "Vùng thả chưa chính xác."
        );
      } else {
        setStatusText(dragState.item.id === "nut" ? "Đai ốc đã vào vị trí. Hãy chọn cờ lê." : "Cờ lê đã gắn đúng. Kéo sang phải để siết.");
      }

      setDragState(null);
    },
    [dragState, dropItem, handleIncorrect]
  );

  const handleReplayAudio = useCallback(() => {
    if (!state.startedAt || terminal) return;
    replayAudio();
    setStatusText("Đang phát lại câu lệnh.");

    if (!question.audioUrl) {
      toast.warning("Câu hỏi này chưa có file âm thanh.");
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(question.audioUrl);
      audioRef.current.addEventListener("error", () => {
        toast.warning("Không tải được audio. Bạn có thể đọc câu lệnh trên màn hình.");
      });
    }

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      toast.warning("Trình duyệt chưa cho phép phát audio. Hãy thử bấm nghe lại.");
    });
  }, [question.audioUrl, replayAudio, state.startedAt, terminal]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const handleRotatePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!wrenchAttached || terminal) return;
    rotateStartXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [terminal, wrenchAttached]);

  const handleRotatePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!wrenchAttached || terminal || rotateStartXRef.current === null) return;
      const deltaX = event.clientX - rotateStartXRef.current;
      rotateStartXRef.current = null;

      if (Math.abs(deltaX) < 18) {
        setStatusText("Kéo cờ lê sang phải rõ hơn để tăng tiến độ siết.");
        return;
      }

      if (deltaX < 0) {
        const result = increaseTighteningProgress(0, "counter_clockwise");
        if (!result.correct) setStatusText("Xoay ngược chiều không làm tăng tiến độ.");
        setWrenchAngle(-18);
        window.setTimeout(() => setWrenchAngle(0), 180);
        return;
      }

      const amount = Math.min(28, Math.max(12, Math.round(deltaX / 4)));
      const result = increaseTighteningProgress(amount, "clockwise");
      setWrenchAngle(32);
      window.setTimeout(() => setWrenchAngle(0), 180);
      setStatusText(result.completed ? "Hoàn thành thao tác siết bu lông." : "Tốt. Tiếp tục kéo sang phải để siết đủ lực.");
    },
    [increaseTighteningProgress, terminal, wrenchAttached]
  );

  const handleReset = useCallback(() => {
    audioRef.current?.pause();
    savedRef.current = false;
    setStatusText("Nhấn bắt đầu để nghe hoặc đọc câu lệnh.");
    setWrenchAngle(0);
    setDragState(null);
    resetQuestion(mode);
  }, [mode, resetQuestion]);

  const completionTime = state.startedAt && state.completedAt
    ? Math.max(0, Math.round((state.completedAt - state.startedAt) / 1000))
    : 0;
  const feedback = buildIndustrialFeedback(state);

  return (
    <div
      className="min-h-screen bg-slate-50 p-3 text-slate-900 md:p-6"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDragState(null)}
    >
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/interview-practice">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Trở về phỏng vấn
            </Button>
          </Link>
          <div className="flex items-center gap-2 rounded-lg border bg-white p-1">
            {(["practice", "test"] as GameMode[]).map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={mode === option ? "default" : "ghost"}
                onClick={() => {
                  setMode(option);
                  savedRef.current = false;
                  resetQuestion(option);
                }}
              >
                {option === "practice" ? "Luyện tập" : "Thi thật"}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <QuestionPanel
            mode={state.mode}
            title={question.title}
            koreanText={question.koreanText}
            vietnameseText={question.vietnameseText}
            replayCount={state.replayCount}
            remainingTime={state.remainingTime}
            score={state.score}
            started={Boolean(state.startedAt)}
            terminal={terminal}
            onStart={() => {
              startQuestion();
              setStatusText("Hãy chọn đai ốc.");
            }}
            onReplay={handleReplayAudio}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(300px,420px)_1fr]">
            <ToolDesk
              items={orderedItems}
              locked={locked}
              shakeItemId={shakeItemId}
              onPointerDown={handlePointerDown}
            />
            <PracticeArea
              showPracticeHints={showPracticeHints}
              nutPlaced={nutPlaced}
              wrenchAttached={wrenchAttached}
              tighteningProgress={state.tighteningProgress}
              wrenchAngle={wrenchAngle}
              terminal={terminal}
              onRotatePointerDown={handleRotatePointerDown}
              onRotatePointerUp={handleRotatePointerUp}
            />
          </div>
        </div>

        <StatusPanel
          mode={state.mode}
          statusText={statusText}
          currentStepIndex={state.currentStepIndex}
        />
      </div>

      {dragState && (
        <div
          className="pointer-events-none fixed z-[70] rounded-xl border-2 border-blue-400 bg-white p-3 shadow-2xl"
          style={{
            left: dragState.x - dragState.offsetX,
            top: dragState.y - dragState.offsetY,
            width: 112,
          }}
        >
          <IndustrialItemIcon id={dragState.item.id} className="mx-auto h-12 w-12" />
          <div className="mt-1 text-center text-xs font-bold text-slate-700">
            {dragState.item.vietnameseName}
          </div>
        </div>
      )}

      <Dialog open={terminal}>
        <DialogContent showCloseButton={false} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="h-6 w-6 text-amber-500" />
              Kết quả mô phỏng
            </DialogTitle>
            <DialogDescription>
              Kết quả đã được lưu tạm thời trên thiết bị này. Khi có bảng kết quả phù hợp, payload có thể đồng bộ lên Supabase.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <ResultStat label="Điểm" value={`${state.score}/100`} />
            <ResultStat label="Trạng thái" value={state.completed ? "Hoàn thành" : "Hết giờ"} />
            <ResultStat label="Thời gian" value={`${completionTime}s`} />
            <ResultStat label="Nghe lại" value={`${state.replayCount} lần`} />
            <ResultStat label="Sai dụng cụ" value={`${state.wrongToolCount}`} />
            <ResultStat label="Sai vật liệu" value={`${state.wrongObjectCount}`} />
            <ResultStat label="Sai thứ tự" value={`${state.wrongSequenceCount}`} />
            <ResultStat label="Sai chiều" value={`${state.wrongDirectionCount}`} />
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="mb-2 font-semibold text-slate-800">Nhận xét</div>
            <div className="space-y-1 text-sm text-slate-600">
              {feedback.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" asChild>
              <Link href="/interview-practice">Trở về danh sách</Link>
            </Button>
            <Button type="button" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Làm lại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface QuestionPanelProps {
  mode: GameMode;
  title: string;
  koreanText: string;
  vietnameseText: string;
  replayCount: number;
  remainingTime: number;
  score: number;
  started: boolean;
  terminal: boolean;
  onStart: () => void;
  onReplay: () => void;
}

function QuestionPanel({
  mode,
  title,
  koreanText,
  vietnameseText,
  replayCount,
  remainingTime,
  score,
  started,
  terminal,
  onStart,
  onReplay,
}: QuestionPanelProps) {
  return (
    <Card className="gap-4 rounded-lg border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div>
          <div className="mb-2 inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            Mô phỏng phỏng vấn thao tác công nghiệp
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Chế độ: {mode === "practice" ? "Luyện tập" : "Thi thật"}
          </p>
        </div>

        <div className="rounded-lg border bg-slate-50 p-4">
          <p className="text-xl font-extrabold leading-relaxed text-slate-950">{koreanText}</p>
          <p className="mt-2 text-sm font-medium text-slate-600">{vietnameseText}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric icon={<Timer className="h-4 w-4" />} label="Còn lại" value={`${remainingTime}s`} />
          <Metric icon={<Trophy className="h-4 w-4" />} label="Điểm" value={`${score}`} />
          <Metric icon={<Headphones className="h-4 w-4" />} label="Nghe lại" value={`${replayCount}`} />
          <Metric icon={<Clock3 className="h-4 w-4" />} label="Giới hạn" value="30s" />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" disabled={started || terminal} onClick={onStart} className="flex-1">
            <Play className="h-4 w-4" />
            Bắt đầu
          </Button>
          <Button type="button" variant="outline" disabled={!started || terminal} onClick={onReplay} className="flex-1">
            <Headphones className="h-4 w-4" />
            Nghe câu hỏi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolDesk({
  items,
  locked,
  shakeItemId,
  onPointerDown,
}: {
  items: IndustrialItem[];
  locked: boolean;
  shakeItemId: string | null;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>, item: IndustrialItem) => void;
}) {
  return (
    <Card className="gap-3 rounded-lg border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Bàn dụng cụ</h2>
          <span className="text-xs font-medium text-slate-500">Chuột và touch</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              onPointerDown={(event) => onPointerDown(event, item)}
              className={`min-h-28 touch-none rounded-lg border bg-slate-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-55 ${
                shakeItemId === item.id ? "animate-[wiggle_0.25s_ease-in-out_1]" : ""
              }`}
            >
              <IndustrialItemIcon id={item.id} className="mx-auto h-12 w-12" />
              <div className="mt-2 text-center text-sm font-bold leading-tight text-slate-800">
                {item.vietnameseName}
              </div>
              <div className="text-center text-xs text-slate-500">{item.koreanName}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PracticeArea({
  showPracticeHints,
  nutPlaced,
  wrenchAttached,
  tighteningProgress,
  wrenchAngle,
  terminal,
  onRotatePointerDown,
  onRotatePointerUp,
}: {
  showPracticeHints: boolean;
  nutPlaced: boolean;
  wrenchAttached: boolean;
  tighteningProgress: number;
  wrenchAngle: number;
  terminal: boolean;
  onRotatePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onRotatePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <Card className="gap-3 rounded-lg border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900">Khu vực thực hành</h2>
          <div className="text-sm font-bold text-blue-700">{tighteningProgress}%</div>
        </div>

        <div className="relative min-h-[390px] overflow-hidden rounded-lg border bg-[linear-gradient(135deg,#f8fafc,#e0f2fe_55%,#ecfeff)] p-4">
          <div className="absolute inset-x-6 bottom-12 h-20 rounded-md border-2 border-slate-300 bg-slate-200 shadow-inner" />
          <div className="absolute left-1/2 top-24 h-44 w-24 -translate-x-1/2 rounded-md border-2 border-slate-400 bg-slate-300 shadow-md">
            <div className="absolute inset-x-3 top-3 h-5 rounded bg-slate-400/70" />
            <div className="absolute inset-x-3 bottom-3 h-5 rounded bg-slate-400/70" />
          </div>

          <div className="absolute left-1/2 top-40 h-14 w-36 -translate-x-1/2 rounded-full border-4 border-slate-500 bg-slate-100 shadow-lg">
            <div className="absolute left-8 top-1/2 h-5 w-28 -translate-y-1/2 rounded-full bg-slate-500" />
            <div className="absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-4 border-slate-600 bg-slate-200" />
          </div>

          <div
            data-drop-zone="bolt-thread"
            className={`absolute left-1/2 top-[158px] h-24 w-32 -translate-x-1/2 rounded-lg border-2 border-dashed ${
              showPracticeHints && !nutPlaced ? "border-blue-500 bg-blue-100/60" : "border-transparent"
            }`}
          />

          {nutPlaced && (
            <div
              data-drop-zone="nut-head"
              className={`absolute left-1/2 top-[171px] z-10 h-16 w-16 -translate-x-1/2 rounded-full border-4 ${
                showPracticeHints && !wrenchAttached ? "border-blue-500 bg-blue-100" : "border-slate-600 bg-slate-100"
              }`}
            >
              <IndustrialItemIcon id="nut" className="h-full w-full" />
            </div>
          )}

          {wrenchAttached && (
            <div
              className={`absolute left-1/2 top-[130px] z-20 h-40 w-48 -translate-x-[18%] touch-none cursor-grab rounded-lg ${
                terminal ? "cursor-default" : "active:cursor-grabbing"
              }`}
              onPointerDown={onRotatePointerDown}
              onPointerUp={onRotatePointerUp}
              style={{ transform: `translateX(-18%) rotate(${wrenchAngle}deg)`, transformOrigin: "32px 82px" }}
            >
              <IndustrialItemIcon id="wrench" className="h-40 w-40 drop-shadow-xl transition-transform" />
            </div>
          )}

          <div className="absolute inset-x-4 bottom-5">
            <div className="mb-2 flex justify-between text-xs font-bold text-slate-600">
              <span>Tiến độ siết</span>
              <span>{tighteningProgress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-[width] duration-200"
                style={{ width: `${tighteningProgress}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPanel({
  mode,
  statusText,
  currentStepIndex,
}: {
  mode: GameMode;
  statusText: string;
  currentStepIndex: number;
}) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_2fr]">
        <div>
          <div className="mb-1 text-sm font-bold text-slate-900">Trạng thái</div>
          <p className="text-sm text-slate-600">{statusText}</p>
        </div>
        <div>
          <div className="mb-2 text-sm font-bold text-slate-900">Hướng dẫn thao tác</div>
          {mode === "practice" ? (
            <div className="grid gap-2 md:grid-cols-5">
              {STEP_GUIDES.map((step, index) => (
                <div
                  key={step}
                  className={`rounded-md border p-2 text-xs font-medium ${
                    index === currentStepIndex
                      ? "border-blue-300 bg-blue-50 text-blue-800"
                      : index < currentStepIndex
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {index < currentStepIndex && <CheckCircle2 className="mb-1 h-4 w-4" />}
                  {step}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">Hoàn thành thao tác theo đúng câu lệnh. Hệ thống chỉ phản hồi khi thao tác chưa chính xác.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
    </div>
  );
}
