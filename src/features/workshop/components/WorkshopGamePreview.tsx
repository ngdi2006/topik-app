'use client'

import { useState } from 'react'
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import type { WorkshopGameConfig } from '../model'
import { getWorkshopAsset } from '../assetRegistry'
import { getWorkshopAction } from '../actionRegistry'
import { DraggableWorkshopAsset, WorkshopDropTarget } from './WorkshopDragDrop'

type WorkshopGamePreviewProps = {
    config: WorkshopGameConfig
    questionKo?: string
    questionVi?: string
}

export function WorkshopGamePreview({ config, questionKo, questionVi }: WorkshopGamePreviewProps) {
    const [result, setResult] = useState<boolean | null>(null)
    const expectedId = config.type === 'move_object' || config.type === 'placement' ? config.objectId : config.toolId
    const choices = Array.from(new Set([expectedId, ...(config.distractorIds || [])].filter((value): value is string => Boolean(value))))
    const targetAssetId = config.targetId || config.objectId

    return <section className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div>
            {questionKo ? <p className="font-bold text-slate-900">{questionKo}</p> : null}
            {questionVi ? <p className="mt-1 text-sm text-slate-500">{questionVi}</p> : null}
            <p className="mt-2 text-xs font-semibold text-blue-600">{getWorkshopAction(config.actionId)?.nameVi || config.type}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {choices.map((assetId) => <DraggableWorkshopAsset key={assetId} assetId={assetId} disabled={result !== null} onSelect={(selected) => setResult(selected === expectedId)} />)}
        </div>
        <WorkshopDropTarget assetId={targetAssetId} expectedAssetId={expectedId} disabled={result !== null} onDropAsset={({ correct }) => setResult(correct)}>
            <span className="text-center text-sm font-bold text-blue-700">Thả vào {getWorkshopAsset(targetAssetId || '')?.nameVi || 'vùng thao tác'}</span>
        </WorkshopDropTarget>
        {result !== null ? <div className={`flex items-center justify-between rounded-xl p-3 text-sm font-bold ${result ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            <span className="flex items-center gap-2">{result ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}{result ? 'Đúng cấu hình' : 'Chưa đúng asset'}</span>
            <button type="button" onClick={() => setResult(null)} className="rounded-lg p-1 hover:bg-white"><RotateCcw className="size-4" /></button>
        </div> : null}
    </section>
}
