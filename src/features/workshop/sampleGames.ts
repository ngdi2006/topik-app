import type { WorkshopGameConfig } from './model'

export type WorkshopSampleGame = {
    id: string
    questionKo: string
    questionVi: string
    config: WorkshopGameConfig
}

export const WORKSHOP_SAMPLE_GAMES: WorkshopSampleGame[] = [
    {
        id: 'sample_hammer_nail',
        questionKo: '망치를 이용하여 못을 박는 행동을 합니다.',
        questionVi: 'Sử dụng búa để thực hiện hành động đóng đinh.',
        config: { schemaVersion: 1, type: 'tool_action', toolId: 'hammer', objectId: 'nail', actionId: 'hammer', distractorIds: ['claw_hammer', 'adjustable_wrench', 'diagonal_cutters'] },
    },
    {
        id: 'sample_cut_wire',
        questionKo: '니퍼를 이용하여 철사를 절단하는 행동을 합니다.',
        questionVi: 'Sử dụng kìm cắt để cắt dây thép.',
        config: { schemaVersion: 1, type: 'tool_action', toolId: 'diagonal_cutters', objectId: 'steel_wire', actionId: 'cut', distractorIds: ['phillips_screwdriver', 'adjustable_wrench', 'hammer'] },
    },
    {
        id: 'sample_nut_toolbox',
        questionKo: '너트를 공구함에 넣습니다.',
        questionVi: 'Cho đai ốc vào hộp dụng cụ.',
        config: { schemaVersion: 1, type: 'move_object', objectId: 'nut', targetId: 'toolbox', actionId: 'put_into', sourceLocation: 'workbench', targetLocation: 'toolbox' },
    },
]
