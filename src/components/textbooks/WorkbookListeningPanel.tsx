"use client"

import { useMemo, useState } from "react"
import {
  Play,
  Pause,
  RotateCcw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileAudio,
  ListMusic,
  LoaderCircle,
} from "lucide-react"
import type { WorkbookPage } from "@/lib/textbooks/workbook"
import AudioWaveform from "@/components/textbooks/AudioWaveform"
import ListeningTranscript from "@/components/textbooks/ListeningTranscript"
import {
  buildCanonicalGroups,
  type WorkbookListeningController,
} from "@/components/textbooks/useWorkbookListening"

type WorkbookListeningPanelProps = {
  controller: WorkbookListeningController
  workbookPages?: Array<{ pageNumber: number; workbook: WorkbookPage | null }>
  onNavigatePage?: (pageNumber: number) => void
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

export default function WorkbookListeningPanel({
  controller,
  workbookPages = [],
  onNavigatePage,
}: WorkbookListeningPanelProps) {
  const [showGuides, setShowGuides] = useState(false)

  // Compute canonical question groups across all pages in the unit
  const unitGroups = useMemo(() => {
    const allListeningFields = (workbookPages || []).flatMap((p) =>
      (p.workbook?.fields || []).map((f) => ({ ...f, pageNumber: p.pageNumber }))
    )
    return buildCanonicalGroups(allListeningFields, controller.segments)
  }, [workbookPages, controller.segments])

  const activeGroup = useMemo(() => {
    if (!controller.activeGroupId) return null
    return unitGroups.find((g) => g.id === controller.activeGroupId) || null
  }, [unitGroups, controller.activeGroupId])

  const isFullLessonPlaying = !controller.activeGroupId && controller.isPlaying
  const playbackStart = activeGroup?.startTime ?? 0
  const playbackDuration = activeGroup?.duration ?? controller.duration
  const playbackTime = Math.max(0, Math.min(playbackDuration, controller.currentTime - playbackStart))

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-800" data-workbook-listening>
      {/* 1. FILE NGHE TỔNG CẢ BÀI (MASTER AUDIO PLAYER) */}
      <div className="shrink-0 border-b border-slate-200 bg-white p-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <FileAudio className="size-3.5" />
              </span>
              <h3 className="truncate text-xs font-black text-slate-900">
                {controller.resource?.title || "File nghe đầy đủ cả bài"}
              </h3>
            </div>

          </div>

          {/* Quick toggle to full audio */}
          <button
            onClick={() => {
              if (isFullLessonPlaying) controller.pause()
              else controller.playFull()
            }}
            className={`min-h-11 shrink-0 rounded-xl px-2.5 text-[11px] font-bold transition-colors shadow-sm border focus-visible:outline-2 focus-visible:outline-blue-600 ${
              isFullLessonPlaying
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200"
                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
            type="button"
            title="Phát toàn bộ file nghe từ đầu đến cuối"
          >
            {isFullLessonPlaying ? "Đang nghe cả bài" : "Nghe cả bài"}
          </button>
        </div>

        {/* Audio Progress Scrubber */}
        <div className="space-y-1">
          <AudioWaveform className="h-11" currentTime={playbackTime} duration={playbackDuration} label="Thanh thời gian nghe" onSeek={seconds => controller.seek(playbackStart + seconds)} peaks={activeGroup?.waveform ?? controller.waveform} />
          <div className="flex justify-between font-mono text-[10px] text-slate-400">
            <span className="font-semibold text-slate-600">
              {formatTime(playbackTime)}
            </span>
            <span>{formatTime(playbackDuration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="grid grid-cols-5 items-center gap-1.5 pt-1">
          {/* Skip -5s */}
          <button
            onClick={() => controller.skip(-5)}
            aria-label="Lùi 5 giây"
            className="flex min-h-11 min-w-11 items-center justify-center gap-0.5 rounded-lg border border-slate-200 px-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
            title="Lùi 5 giây"
            type="button"
          >
            <RotateCcw className="size-3" />
            <span>-5s</span>
          </button>

          {/* Master Play / Pause Button */}
          <button
            onClick={() => {
              if (controller.isPlaying) {
                controller.pause()
              } else {
                if (controller.activeGroupId) {
                  controller.togglePlay()
                } else {
                  controller.playFull()
                }
              }
            }}
            aria-label={controller.isPlaying ? "Tạm dừng phát" : "Bắt đầu phát"}
            className="flex size-11 items-center justify-center justify-self-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            title={controller.isPlaying ? "Tạm dừng phát" : "Bắt đầu phát"}
            type="button"
          >
            {controller.isPlaying ? (
              <Pause className="size-5 fill-current" />
            ) : (
              <Play className="size-5 ml-0.5 fill-current" />
            )}
          </button>

          {/* Skip +5s */}
          <button
            onClick={() => controller.skip(5)}
            aria-label="Tiến 5 giây"
            className="flex min-h-11 min-w-11 items-center justify-center gap-0.5 rounded-lg border border-slate-200 px-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
            title="Tiến 5 giây"
            type="button"
          >
            <span>+5s</span>
          </button>

          {/* Speed Selector */}
          <select
            value={controller.speed}
            onChange={(e) => controller.setSpeed(Number(e.target.value))}
            className="min-h-11 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-1 text-xs font-bold text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="Tốc độ nghe"
          >
            {[0.75, 1, 1.25, 1.5].map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>

          {/* Loop / Repeat Toggle */}
          <button
            onClick={() => controller.setRepeat(!controller.repeat)}
            aria-label="Lặp lại đoạn đang nghe"
            aria-pressed={controller.repeat}
            className={`flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-1 text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
              controller.repeat
                ? "border-amber-400 bg-amber-50 text-amber-800 shadow-sm"
                : "border-slate-200 text-slate-500 hover:bg-slate-100"
            }`}
            title="Lặp lại liên tục đoạn đang chọn"
            type="button"
          >
            <RotateCcw className="size-3" />
            <span>Lặp</span>
          </button>
        </div>
      </div>

      {/* 2. CÁC PHẦN NGHE TRONG BÀI (NHÓM CÂU HỎI TẬP TRUNG) */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <ListMusic className="size-4 text-blue-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Các phần nghe trong bài ({unitGroups.length})
            </h4>
          </div>
          <span className="block text-[10px] text-slate-500">Chọn một nhóm để nghe</span>
        </div>

        {controller.loading ? (
          <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-slate-400">
            <LoaderCircle className="size-5 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Đang tải danh sách câu nghe...</span>
          </div>
        ) : unitGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Không có câu nghe riêng biệt</p>
            <p className="text-[11px] text-slate-400">
              Bạn có thể sử dụng thanh điều khiển phía trên để nghe toàn bộ file âm thanh.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {unitGroups.map((group) => {
              const isActive = controller.activeGroupId === group.id
              const isPlayingThis = isActive && controller.isPlaying

              const navigate = () => { if (typeof group.pageNumber === "number") onNavigatePage?.(group.pageNumber) }
              const select = () => {
                navigate()
                if (isPlayingThis) controller.pause()
                else if (isActive) controller.togglePlay()
                else controller.playGroup(group)
              }
              const transcript = controller.segments.filter(segment => segment.id === group.id || (segment.start >= group.startTime && segment.start < group.endTime)).map(segment => segment.text_ko).join("\n")
              return <div key={group.id} data-listening-card={group.id} className={`rounded-lg border p-2 ${isActive ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label={`${isPlayingThis ? "Tạm dừng" : "Nghe"} nhóm ${group.rangeLabel}`} onClick={select} className={`grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-indigo-600 ${isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {isPlayingThis ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                  </button>
                  <button type="button" onClick={select} aria-label={`Nghe hướng dẫn nhóm ${group.rangeLabel}`} className="min-h-11 min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-indigo-600">
                    <span className="block text-xs font-bold text-slate-800">Nhóm câu {group.rangeLabel}</span>
                    <span className="block truncate text-[11px] text-slate-500" lang="ko" title={group.instruction}>{group.instruction}</span>
                  </button>
                  <span className="shrink-0 text-[10px] tabular-nums text-slate-500">{formatTime(group.duration)}</span>
                </div>
                <AudioWaveform className="h-11" currentTime={isActive ? Math.max(0,controller.currentTime-group.startTime) : 0} duration={group.duration} label={`Sóng âm nhóm ${group.rangeLabel}`} onSeek={seconds => { if(isActive) controller.seek(group.startTime+seconds); else { navigate(); controller.playGroup(group,seconds) } }} peaks={group.waveform} />
                {controller.canViewTranscript ? <details className="group/transcript" data-group-transcript>
                  <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 rounded text-[11px] text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600"><ChevronDown className="size-3 transition-transform group-open/transcript:rotate-180" />Xem lời thoại</summary>
                  <div className="max-h-72 overflow-y-auto rounded border border-indigo-100 bg-white p-3"><ListeningTranscript text={transcript} /></div>
                </details> : null}
              </div>
            })}
          </div>
        )}

        {/* 3. LỜI GIẢI & DẪN CHỨNG (COLLAPSIBLE CHI TIẾT) */}
        {controller.canViewTranscript && controller.guides.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-white p-3 shadow-xs">
            <button
              type="button"
              onClick={() => setShowGuides(!showGuides)}
              className="flex w-full items-center justify-between text-left text-xs font-bold text-emerald-800"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="size-4 text-emerald-600" />
                <span>Xem lời giải & dẫn chứng ({controller.guides.length} câu)</span>
              </div>
              {showGuides ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showGuides && (
              <div className="mt-3 space-y-2 border-t border-emerald-100 pt-3">
                {controller.guides.map((guide, idx) => (
                  <div
                    key={`${guide.pageNumber}-${guide.fieldId}-${idx}`}
                    className="rounded-lg border border-slate-100 bg-emerald-50/40 p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-emerald-900">
                      <span>
                        Trang {guide.pageNumber}
                        {guide.optionIds.length ? ` · Đáp án: [${guide.optionIds.join(", ")}]` : ""}
                      </span>
                    </div>
                    {guide.answerText && (
                      <p className="font-semibold text-slate-900 font-serif" lang="ko">
                        {guide.answerText}
                      </p>
                    )}
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {guide.explanation_vi}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
