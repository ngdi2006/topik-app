import { resolveWorkshopAssetId } from './assetRegistry'
import { resolveWorkshopActionId } from './actionRegistry'
import type { WorkshopGameConfig, WorkshopGameType } from './model'

export type LegacyToolConfig = {
    correct_tool?: string
    target_object?: string
    correct_action?: string | null
    tools_on_desk?: string[]
    requires_action?: boolean
    game_config?: WorkshopGameConfig | null
}

export function legacyToolConfigToWorkshopGame(config: LegacyToolConfig): WorkshopGameConfig {
    if (config.game_config?.schemaVersion === 1) return config.game_config
    const target = config.target_object ? resolveWorkshopAssetId(config.target_object) : undefined
    const actionId = resolveWorkshopActionId(config.correct_action)
    const isPlacement = !config.requires_action || ['toolbox', 'shelf'].some((value) => target?.includes(value))
    const type: WorkshopGameType = isPlacement ? 'placement' : 'tool_action'

    return {
        schemaVersion: 1,
        type,
        toolId: config.correct_tool ? resolveWorkshopAssetId(config.correct_tool) : undefined,
        objectId: isPlacement ? undefined : target,
        targetId: isPlacement ? target : undefined,
        actionId,
        distractorIds: config.tools_on_desk?.map(resolveWorkshopAssetId),
    }
}
