export type WorkshopAssetType =
    | 'tool'
    | 'power_tool'
    | 'measuring_tool'
    | 'part'
    | 'material'
    | 'device'
    | 'container'
    | 'control_part'

export interface WorkshopAsset {
    id: string
    nameKo: string
    nameVi: string
    type: WorkshopAssetType
    image: string
    sourceFile?: string
    sourceGroup?: string
    prompt?: string
    suggestedSize?: string
    aliases?: string[]
    active?: boolean
    legacyIds?: string[]
    fallbackIconId?: string
}

export interface WorkshopAction {
    id: WorkshopActionId
    nameKo: string
    nameVi: string
    legacyIds?: string[]
}

export type WorkshopActionId =
    | 'tighten'
    | 'loosen'
    | 'cut'
    | 'hammer'
    | 'bend'
    | 'measure'
    | 'weigh'
    | 'grind'
    | 'plane'
    | 'carve'
    | 'shave'
    | 'smooth'
    | 'operate_machine'
    | 'pull'
    | 'pull_out'
    | 'clamp_tight'
    | 'pull_lever'
    | 'drill'
    | 'paint'
    | 'sand'
    | 'clamp'
    | 'insert'
    | 'remove'
    | 'put_into'
    | 'take_out'

export type WorkshopGameType =
    | 'select_tool'
    | 'tool_action'
    | 'move_object'
    | 'placement'
    | 'tool_sequence'

export interface WorkshopGameConfig {
    schemaVersion: 1
    type: WorkshopGameType
    toolId?: string
    objectId?: string
    targetId?: string
    actionId?: WorkshopActionId
    distractorIds?: string[]
    sourceLocation?: string
    targetLocation?: string
    sequence?: Array<{
        toolId?: string
        objectId?: string
        targetId?: string
        actionId?: WorkshopActionId
    }>
}

export function isWorkshopGameConfig(value: unknown): value is WorkshopGameConfig {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Partial<WorkshopGameConfig>
    return candidate.schemaVersion === 1 && typeof candidate.type === 'string'
}
