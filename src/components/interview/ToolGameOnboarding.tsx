'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export type ToolGameTourStep = {
    selector: string
    title: string
    description: string
}

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number }

type Props = {
    open: boolean
    steps: ToolGameTourStep[]
    onClose: () => void
}

const SPOTLIGHT_GAP = 6

export function ToolGameOnboarding({ open, steps, onClose }: Props) {
    const [stepIndex, setStepIndex] = useState(0)
    const [targetRect, setTargetRect] = useState<Rect | null>(null)

    const activeStep = steps[stepIndex]

    const updateTarget = useCallback(() => {
        if (!open || !activeStep) return
        const element = document.querySelector<HTMLElement>(activeStep.selector)
        if (!element) {
            setTargetRect(null)
            return
        }
        const rect = element.getBoundingClientRect()
        setTargetRect({
            top: Math.max(SPOTLIGHT_GAP, rect.top - SPOTLIGHT_GAP),
            left: Math.max(SPOTLIGHT_GAP, rect.left - SPOTLIGHT_GAP),
            right: Math.min(window.innerWidth - SPOTLIGHT_GAP, rect.right + SPOTLIGHT_GAP),
            bottom: Math.min(window.innerHeight - SPOTLIGHT_GAP, rect.bottom + SPOTLIGHT_GAP),
            width: Math.min(window.innerWidth - SPOTLIGHT_GAP * 2, rect.width + SPOTLIGHT_GAP * 2),
            height: Math.min(window.innerHeight - SPOTLIGHT_GAP * 2, rect.height + SPOTLIGHT_GAP * 2),
        })
    }, [activeStep, open])

    useEffect(() => {
        if (!open || !activeStep) return
        const element = document.querySelector<HTMLElement>(activeStep.selector)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
        const timer = window.setTimeout(updateTarget, 360)
        window.addEventListener('resize', updateTarget)
        window.addEventListener('scroll', updateTarget, true)
        return () => {
            window.clearTimeout(timer)
            window.removeEventListener('resize', updateTarget)
            window.removeEventListener('scroll', updateTarget, true)
        }
    }, [activeStep, open, updateTarget])

    useEffect(() => {
        if (!open) return
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, onClose])

    const cardStyle = useMemo(() => {
        if (!targetRect || typeof window === 'undefined') return { left: 12, top: 120, width: 'calc(100vw - 24px)' }
        const width = Math.min(360, window.innerWidth - 24)
        const estimatedHeight = 210
        const fitsBelow = targetRect.bottom + estimatedHeight + 16 <= window.innerHeight
        const top = fitsBelow
            ? targetRect.bottom + 12
            : Math.max(12, targetRect.top - estimatedHeight - 12)
        const left = Math.min(
            window.innerWidth - width - 12,
            Math.max(12, targetRect.left + targetRect.width / 2 - width / 2),
        )
        return { left, top, width }
    }, [targetRect])

    if (!open || !activeStep || typeof document === 'undefined') return null

    const isLast = stepIndex === steps.length - 1

    return createPortal(
        <div className="fixed inset-0 z-[250]" role="dialog" aria-modal="true" aria-label="Hướng dẫn sử dụng game công cụ">
            {targetRect ? (
                <>
                    <div className="fixed inset-x-0 top-0 bg-slate-950/66 backdrop-blur-[1px]" style={{ height: targetRect.top }} />
                    <div className="fixed left-0 bg-slate-950/66 backdrop-blur-[1px]" style={{ top: targetRect.top, width: targetRect.left, height: targetRect.height }} />
                    <div className="fixed right-0 bg-slate-950/66 backdrop-blur-[1px]" style={{ top: targetRect.top, left: targetRect.right, height: targetRect.height }} />
                    <div className="fixed inset-x-0 bottom-0 bg-slate-950/66 backdrop-blur-[1px]" style={{ top: targetRect.bottom }} />
                    <div
                        className="pointer-events-none fixed rounded-xl ring-2 ring-amber-400 ring-offset-2 ring-offset-white/30 shadow-[0_0_24px_rgba(251,191,36,0.75)]"
                        style={{ top: targetRect.top, left: targetRect.left, width: targetRect.width, height: targetRect.height }}
                    />
                </>
            ) : <div className="fixed inset-0 bg-slate-950/66 backdrop-blur-[1px]" />}

            <div
                className="fixed rounded-2xl border border-amber-200 bg-white p-4 text-slate-800 shadow-[0_18px_50px_rgba(15,23,42,0.3)] sm:p-5"
                style={cardStyle}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-700">
                            Hướng dẫn · {stepIndex + 1}/{steps.length}
                        </div>
                        <h3 className="text-base font-extrabold leading-snug text-slate-900">{activeStep.title}</h3>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Đóng hướng dẫn" className="grid size-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                        <X className="size-4" />
                    </button>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{activeStep.description}</p>

                <div className="mt-4 flex items-center justify-between gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                        Bỏ qua
                    </button>
                    <div className="flex items-center gap-2">
                        <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))} className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 disabled:opacity-35">
                            <ChevronLeft className="mr-1 size-4" /> Trước
                        </button>
                        <button type="button" onClick={() => isLast ? onClose() : setStepIndex((value) => Math.min(steps.length - 1, value + 1))} className="inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                            {isLast ? 'Bắt đầu' : 'Tiếp'} {!isLast ? <ChevronRight className="ml-1 size-4" /> : null}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    )
}
