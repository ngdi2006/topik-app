'use client'

import type { DragEvent, KeyboardEvent, ReactNode } from 'react'
import { WorkshopAssetIcon } from './WorkshopAssetIcon'
import { getWorkshopAsset } from '../assetRegistry'

export const WORKSHOP_DRAG_MIME = 'application/x-workshop-asset'

type DraggableWorkshopAssetProps = {
    assetId: string
    className?: string
    disabled?: boolean
    onSelect?: (assetId: string) => void
}

export function DraggableWorkshopAsset({ assetId, className = '', disabled = false, onSelect }: DraggableWorkshopAssetProps) {
    const asset = getWorkshopAsset(assetId)
    const select = () => { if (!disabled) onSelect?.(assetId) }
    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            select()
        }
    }

    return <button
        type="button"
        draggable={!disabled}
        disabled={disabled}
        data-workshop-asset-id={assetId}
        onClick={select}
        onKeyDown={handleKeyDown}
        onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData(WORKSHOP_DRAG_MIME, assetId)
            event.dataTransfer.setData('text/plain', assetId)
        }}
        className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white p-3 text-center transition hover:-translate-y-0.5 hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        aria-label={`Kéo ${asset?.nameVi || assetId}`}
    >
        <WorkshopAssetIcon assetId={assetId} size={52} draggable />
        <span className="text-xs font-bold text-slate-800">{asset?.nameVi || assetId}</span>
        {asset?.nameKo ? <span className="text-[11px] text-slate-500">{asset.nameKo}</span> : null}
    </button>
}

type WorkshopDropTargetProps = {
    assetId?: string
    targetId?: string
    expectedAssetId?: string
    className?: string
    children?: ReactNode
    disabled?: boolean
    onDropAsset: (result: { draggedAssetId: string; targetAssetId?: string; targetId?: string; correct: boolean }) => void
}

export function WorkshopDropTarget({ assetId, targetId, expectedAssetId, className = '', children, disabled = false, onDropAsset }: WorkshopDropTargetProps) {
    const accept = (draggedAssetId: string) => {
        if (!draggedAssetId || disabled) return
        onDropAsset({ draggedAssetId, targetAssetId: assetId, targetId, correct: !expectedAssetId || draggedAssetId === expectedAssetId })
    }
    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        accept(event.dataTransfer.getData(WORKSHOP_DRAG_MIME) || event.dataTransfer.getData('text/plain'))
    }

    return <div
        data-workshop-target-id={targetId || assetId}
        onDragOver={(event) => { if (!disabled) event.preventDefault() }}
        onDrop={handleDrop}
        className={`grid min-h-28 place-items-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/60 p-4 ${className}`}
    >
        {children || (assetId ? <WorkshopAssetIcon assetId={assetId} size={64} /> : <span className="text-sm font-bold text-blue-700">Thả asset vào đây</span>)}
    </div>
}
