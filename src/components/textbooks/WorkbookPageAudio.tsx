"use client"

import { Volume2 } from "lucide-react"
import { useEffect, useRef } from "react"
import type { ListeningGroup, WorkbookListeningController } from "@/components/textbooks/useWorkbookListening"
import printedAnchors from "@/lib/textbooks/workbook-listening-anchors.json"

export default function WorkbookPageAudio({ bookCode, pageNumber, groups, controller }: {
  bookCode: string
  pageNumber: number
  groups: ListeningGroup[]
  controller: WorkbookListeningController
}) {
  const tools = useRef<HTMLDivElement>(null)
  const activeOnPage = groups.some(group => group.id === controller.activeGroupId)
  useEffect(() => {
    if (controller.activeGroupId && activeOnPage) {
      tools.current?.querySelector("button[aria-pressed='true']")?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })
    }
  }, [controller.activeGroupId, activeOnPage])
  if (!groups.length) return null
  const anchors = printedAnchors as Record<string, { x: number; y: number }>
  return <div aria-label={`Nghe bài tập trang ${pageNumber}`} className="pointer-events-none absolute inset-0 z-20" ref={tools} role="group">
      {groups.map(group => {
        const active = controller.activeGroupId === group.id
        const playing = active && controller.isPlaying
        const anchor = anchors[`${bookCode}:${pageNumber}:${group.startQ}`] || { x: 0.104, y: group.y }
        return <button
          aria-label={`${playing ? "Tạm dừng" : "Nghe"} nhóm ${group.rangeLabel}`}
          aria-pressed={active}
          className={`pointer-events-auto absolute grid -translate-y-1/2 touch-manipulation place-items-center rounded-full border shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active ? "border-blue-600 bg-blue-600 text-white" : "border-blue-300 bg-white text-blue-600 hover:bg-blue-50"}`}
          data-audio-group={group.id}
          data-heading-x={anchor.x}
          data-heading-y={anchor.y}
          style={{ left: `calc(${anchor.x * 100}% - clamp(26px, 6cqw, 40px) - max(2px, 0.5cqw))`, top: `${anchor.y * 100}%`, width: "clamp(26px, 6cqw, 40px)", height: "clamp(26px, 6cqw, 40px)" }}
          key={group.id}
          onClick={() => {
            if (playing) controller.pause()
            else if (active) controller.togglePlay()
            else controller.playGroup(group)
          }}
          title={group.instruction}
          type="button"
        >
          <Volume2 aria-hidden="true" className="h-[55%] w-[55%]" />
        </button>
      })}
  </div>
}
