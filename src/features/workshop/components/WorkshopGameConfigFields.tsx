'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WORKSHOP_ASSETS } from '../assetRegistry'
import { WORKSHOP_ACTIONS } from '../actionRegistry'
import type { WorkshopGameConfig, WorkshopGameType } from '../model'

type Props = {
    value: WorkshopGameConfig
    onChange: (value: WorkshopGameConfig) => void
}

const GAME_TYPES: Array<{ id: WorkshopGameType; label: string }> = [
    { id: 'select_tool', label: 'Chọn dụng cụ' },
    { id: 'tool_action', label: 'Dụng cụ + thao tác' },
    { id: 'move_object', label: 'Di chuyển vật thể' },
    { id: 'placement', label: 'Đặt đúng vị trí' },
    { id: 'tool_sequence', label: 'Chuỗi thao tác' },
]

function AssetSelect({ label, value, onChange, allowEmpty = true }: { label: string; value?: string; onChange: (value?: string) => void; allowEmpty?: boolean }) {
    return <label className="space-y-1.5 text-sm font-semibold text-slate-700">
        <span>{label}</span>
        <Select value={value || '__none__'} onValueChange={(next) => onChange(next === '__none__' ? undefined : next)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
                {allowEmpty ? <SelectItem value="__none__">Không chọn</SelectItem> : null}
                {WORKSHOP_ASSETS.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.nameVi} · {asset.nameKo}</SelectItem>)}
            </SelectContent>
        </Select>
    </label>
}

export function WorkshopGameConfigFields({ value, onChange }: Props) {
    const update = (patch: Partial<WorkshopGameConfig>) => onChange({ ...value, ...patch, schemaVersion: 1 })
    const selectedDistractors = new Set(value.distractorIds || [])
    const toggleDistractor = (assetId: string) => {
        const next = new Set(selectedDistractors)
        if (next.has(assetId)) next.delete(assetId)
        else next.add(assetId)
        update({ distractorIds: Array.from(next) })
    }

    return <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Loại game</span>
                <Select value={value.type} onValueChange={(type) => update({ type: type as WorkshopGameType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GAME_TYPES.map((type) => <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>)}</SelectContent></Select>
            </label>
            <AssetSelect label="Dụng cụ" value={value.toolId} onChange={(toolId) => update({ toolId })} />
            <AssetSelect label="Vật thể" value={value.objectId} onChange={(objectId) => update({ objectId })} />
            <AssetSelect label="Đích đến" value={value.targetId} onChange={(targetId) => update({ targetId })} />
            <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Thao tác</span>
                <Select value={value.actionId || '__none__'} onValueChange={(actionId) => update({ actionId: actionId === '__none__' ? undefined : actionId as WorkshopGameConfig['actionId'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Không chọn</SelectItem>{WORKSHOP_ACTIONS.map((action) => <SelectItem key={action.id} value={action.id}>{action.nameVi} · {action.nameKo}</SelectItem>)}</SelectContent></Select>
            </label>
        </div>
        <details className="group rounded-xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 marker:content-none">
                <span>Phương án nhiễu</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {selectedDistractors.size} đã chọn · Mở để chỉnh
                </span>
            </summary>
            <div className="border-t border-slate-100 p-3">
                <p className="mb-2 text-xs text-slate-500">Chỉ chọn những asset cần xuất hiện cùng đáp án đúng.</p>
                <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 [content-visibility:auto]">
                {WORKSHOP_ASSETS
                    .filter((asset) => asset.id !== value.toolId && asset.id !== value.objectId && asset.id !== value.targetId)
                    .map((asset) => <label key={asset.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                        <input
                            type="checkbox"
                            checked={selectedDistractors.has(asset.id)}
                            onChange={() => toggleDistractor(asset.id)}
                            className="size-4 rounded border-slate-300 accent-blue-600"
                        />
                        <span className="min-w-0 truncate">{asset.nameVi} · {asset.nameKo}</span>
                    </label>)}
                </div>
            </div>
        </details>
    </div>
}
