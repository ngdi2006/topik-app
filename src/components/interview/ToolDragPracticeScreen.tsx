'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Play, ArrowLeft, Volume2, CheckCircle2, AlertTriangle, Sparkles, HelpCircle, RotateCcw, Eye, EyeOff, ChevronRight, X } from 'lucide-react'
import toolConfigMap from './tool_config_map.json'
import { speakText, stopTTS } from '@/lib/tts'
import { resolveToolQuestionConfig, ACTION_DEFINITIONS, TARGET_DEFINITIONS, TOOL_DEFINITIONS, type VocabularyItem } from './toolQuestionAnalysis'
import { WorkshopToolIcon } from './WorkshopToolIcon'
import { FULL_TOOL_IDS, FULL_TOOL_NAMES, InterviewToolTableGame } from './InterviewToolTableGame'
import { ToolGameOnboarding, type ToolGameTourStep } from './ToolGameOnboarding'

const TOOL_GAME_ONBOARDING_KEY = 'tool_game_onboarding_v1'

const ZONE_LABELS: Record<string, string> = {
    'shelf_top_left': 'Kệ trên (Trái)',
    'shelf_bottom_left': 'Kệ dưới (Trái)',
    'machine_panel': 'Bảng điều khiển / Máy móc',
    'work_area': 'Khu vực thi công',
    'toolbox_center': 'Hộp công cụ chung',
    'special_box': 'Hộp chuyên dụng',
    'shelf_top_right': 'Kệ trên (Phải)',
    'shelf_bottom_right': 'Kệ dưới (Phải)'
}
const TOOL_NAMES: Record<string, { ko: string; vi: string }> = {
    ...Object.fromEntries(TOOL_DEFINITIONS.map((item) => [item.id, { ko: item.ko, vi: item.label }])),
    ...FULL_TOOL_NAMES,
    'allen_wrench': { ko: '육각 렌치', vi: 'Khóa lục giác' },
    'socket_wrench': { ko: '소켓 렌치', vi: 'Cờ lê đầu khẩu' },
    'socket': { ko: '소켓', vi: 'Đầu khẩu' },
    'adjustable_wrench': { ko: '멍키 스패너', vi: 'Mỏ lết' },
    'torque_wrench': { ko: '토크 렌치', vi: 'Cờ lê lực' },
    'pipe_wrench': { ko: '파이프 렌치', vi: 'Mỏ lết răng' },
    'phillips_screwdriver': { ko: '십자드라이버', vi: 'Tua vít chữ thập' },
    'flat_screwdriver': { ko: '일자드라이버', vi: 'Tua vít dẹt' },
    'screwdriver': { ko: '드라이버', vi: 'Tua vít' },
    'hammer': { ko: '망치', vi: 'Búa' },
    'claw_hammer': { ko: '장도리', vi: 'Búa nhổ đinh' },
    'pliers': { ko: '펜치 / 니퍼 / 플라이어', vi: 'Kìm mỏ nhọn / Kìm bấm' },
    'long_nose_pliers': { ko: '롱노즈 플라이어', vi: 'Kìm mũi dài' },
    'pincers': { ko: '펜치', vi: 'Kìm bấm' },
    'nipper': { ko: '니퍼', vi: 'Kìm cắt' },
    'bolt_cutter': { ko: '절단기', vi: 'Kìm cộng lực' },
    'wrench': { ko: '스패너 / 멍키 스패너', vi: 'Cờ lê / Mỏ lết' },
    'saw': { ko: '쇠톱', vi: 'Cưa tay' },
    'welder': { ko: '용접기', vi: 'Máy hàn' },
    'ruler': { ko: '자 / 줄자', vi: 'Thước đo' },
    'bearing_puller': { ko: '풀러', vi: 'Cảo tháo / Cảo bạc đạn' },
    'hand_plane': { ko: '대패', vi: 'Bào tay' },
    'lathe_machine': { ko: '선반 기계', vi: 'Máy tiện' },
    'milling_machine': { ko: '밀링 머신', vi: 'Máy phay' },
    'switch_tool': { ko: '스위치 / 레버', vi: 'Công tắc / Tay gạt công tắc' },
    'generic_tool': { ko: '도구 / 손', vi: 'Công tắc / Tay thao tác' }
}

const TARGET_NAMES: Record<string, string> = {
    ...Object.fromEntries(TARGET_DEFINITIONS.map((item) => [item.id, item.label])),
    'phillips_screw': 'Ốc vít rãnh chữ thập',
    'slotted_screw': 'Ốc vít rãnh dẹt',
    'hex_bolt': 'Bu lông',
    'electric_wire': 'Dây dẫn',
    'metal_wire': 'Dây kim loại',
    'coil_spring': 'Lò xo',
    'bearing': 'Ổ bi / Bạc đạn',
    'gear': 'Bánh răng',
    'metal_pipe': 'Ống sắt',
    'wood_workpiece': 'Phôi gỗ',
    'switch_power': 'Cầu dao / Công tắc',
    'emergency_button': 'Nút khẩn cấp',
    'signal_light': 'Đèn báo',
    'box': 'Hộp công cụ',
    'shelf': 'Ngăn kệ'
}

const ACTION_NAMES: Record<string, string> = {
    ...Object.fromEntries(ACTION_DEFINITIONS.map((item) => [item.id, item.label])),
    'counter_clockwise': 'Tháo',
    'clockwise': 'Siết',
    'cut': 'Cắt',
    'strip': 'Tước vỏ cách điện',
    'turn_on': 'Bật',
    'turn_off': 'Tắt',
    'push': 'Đẩy',
    'pull': 'Kéo ra'
}

const ACTION_HINTS: Record<string, string> = {
    counter_clockwise: 'Xoay ngược chiều kim đồng hồ',
    clockwise: 'Xoay cùng chiều kim đồng hồ',
    turn_on: 'Gạt lên hoặc mở nguồn',
    turn_off: 'Gạt xuống hoặc ngắt nguồn',
}

function getActionDisplay(actionId: string) {
    const rawLabel = ACTION_NAMES[actionId] || actionId
    return {
        label: rawLabel.split(/\s*\/\s*/)[0].trim(),
        hint: ACTION_HINTS[actionId],
    }
}

const SHELF_TARGETS = ['shelf_top_left', 'shelf_bottom_left', 'shelf_top_right', 'shelf_bottom_right']
const BOX_TARGETS = ['toolbox_center', 'special_box']
const ALL_SYSTEM_TOOLS = [...FULL_TOOL_IDS]

const DETAIL_ASSETS: Record<string, string> = {
    nail: '/assets/workshop/details-v2/nail.png',
    hex_bolt: '/assets/workshop/details-v2/hex_bolt.png',
    phillips_screw: '/assets/workshop/details-v2/phillips_screw.png',
    slotted_screw: '/assets/workshop/details-v2/slotted_screw.png',
    paint_can: '/assets/workshop/details-v2/paint_can.png',
    primer_can: '/assets/workshop/details-v2/primer_can.png',
    varnish_can: '/assets/workshop/details-v2/varnish_can.png',
    gear: '/assets/workshop/details-v2/gear.png',
    coil_spring: '/assets/workshop/details-v2/coil_spring.png',
    bearing: '/assets/workshop/details-v2/bearing.png',
    electric_wire: '/assets/workshop/details-v2/electric_wire.png',
    metal_wire: '/assets/workshop/details-v2/metal_wire.png',
    metal_pipe: '/assets/workshop/details-v2/metal_pipe.png',
    wood_workpiece: '/assets/workshop/details-v2/wood_workpiece.png',
    metal_workpiece: '/assets/workshop/details-v2/metal_workpiece.png',
    marking_surface: '/assets/workshop/details-v2/marking_surface.png',
    measured_object: '/assets/workshop/details-v2/workpiece.png',
    finish_surface: '/assets/workshop/details-v2/workpiece.png',
    lever: '/assets/workshop/details-v2/lever.png',
    workpiece: '/assets/workshop/details-v2/workpiece.png',
    box: '/assets/workshop/details-v2/box.png',
    shelf: '/assets/workshop/details-v2/shelf.png',
    switch_power: '/assets/workshop/details-v2/switch_power.png',
    emergency_button: '/assets/workshop/details-v2/emergency_button.png',
    signal_light: '/assets/workshop/details-v2/signal_light.png',
    plastic_workpiece: '/assets/workshop/details-v2/plastic_workpiece.png',
}
const TARGET_DISTRACTOR_POOL = ['nail', 'hex_bolt', 'phillips_screw', 'slotted_screw', 'electric_wire', 'metal_wire', 'metal_pipe', 'bearing', 'gear', 'coil_spring', 'wood_workpiece', 'metal_workpiece', 'switch_power', 'lever', 'paint_can', 'workpiece']
const TOOL_DISTRACTORS: Record<string, string[]> = {
    phillips_screwdriver: ['flat_screwdriver', 'screwdriver', 'allen_wrench', 'wrench'],
    flat_screwdriver: ['phillips_screwdriver', 'screwdriver', 'allen_wrench', 'wrench'],
    allen_wrench: ['socket_wrench', 'torque_wrench', 'wrench', 'adjustable_wrench'],
    screwdriver: ['allen_wrench', 'wrench', 'pliers', 'hammer'],
    electric_cutter: ['saw', 'cutting_machine', 'grinder', 'bolt_cutter'],
    claw_hammer: ['hammer', 'pliers', 'saw', 'screwdriver'],
    hammer: ['screwdriver', 'pliers', 'wrench', 'saw'],
    hand_plane: ['wood_chisel', 'hand_file', 'saw', 'hammer'],
    pliers: ['wrench', 'screwdriver', 'saw', 'ruler'],
    wrench: ['adjustable_wrench', 'socket_wrench', 'torque_wrench', 'pipe_wrench'],
    socket_wrench: ['socket', 'wrench', 'torque_wrench', 'adjustable_wrench'],
    adjustable_wrench: ['wrench', 'pipe_wrench', 'socket_wrench', 'torque_wrench'],
    torque_wrench: ['socket_wrench', 'wrench', 'allen_wrench', 'adjustable_wrench'],
    pipe_wrench: ['adjustable_wrench', 'wrench', 'socket_wrench', 'pliers'],
    bearing_puller: ['wrench', 'pliers', 'screwdriver', 'hammer'],
    lathe_machine: ['milling_machine', 'drill', 'grinder', 'cutting_machine'],
    milling_machine: ['lathe_machine', 'drill', 'grinder', 'cutting_machine'],
    switch_tool: ['screwdriver', 'pliers', 'wrench', 'hammer'],
    rust_preventive_oil: ['ruler', 'pliers', 'wrench', 'screwdriver'],
    paint_roller: ['paint_brush', 'spray_gun', 'ruler', 'pliers'],
    paint_brush: ['paint_roller', 'spray_gun', 'ruler', 'pliers'],
    spray_gun: ['paint_roller', 'paint_brush', 'ruler', 'pliers'],
    scale: ['electronic_scale', 'pan_scale', 'industrial_scale', 'ruler'],
    electronic_scale: ['pan_scale', 'industrial_scale', 'scale', 'ruler'],
    pan_scale: ['electronic_scale', 'industrial_scale', 'scale', 'ruler'],
    industrial_scale: ['electronic_scale', 'pan_scale', 'scale', 'ruler'],
    saw: ['pliers', 'hammer', 'welder', 'ruler'],
    welder: ['saw', 'pliers', 'wrench', 'ruler'],
    ruler: ['screwdriver', 'wrench', 'pliers', 'allen_wrench']
}
const TARGET_SHORT_LABELS: Record<string, string> = {
    ...Object.fromEntries(TARGET_DEFINITIONS.map((item) => [item.id, item.label])),
    phillips_screw: 'Ốc vít chữ thập',
    slotted_screw: 'Ốc vít dẹt',
    hex_bolt: 'Bu lông',
    electric_wire: 'Dây dẫn',
    metal_wire: 'Dây kim loại',
    coil_spring: 'Lò xo',
    bearing: 'Ổ bi / Bạc đạn',
    gear: 'Bánh răng',
    metal_pipe: 'Ống sắt',
    switch_power: 'Cầu dao / Công tắc',
    emergency_button: 'Nút khẩn cấp',
    signal_light: 'Đèn báo',
    wood_workpiece: 'Phôi gỗ',
    metal_workpiece: 'Phôi kim loại',
    plastic_workpiece: 'Phôi nhựa',
    lever: 'Cần gạt',
    workpiece: 'Phôi gia công'
}
const EXACT_TARGET_LABELS: Record<string, string> = {
    ...TARGET_NAMES,
    ...ZONE_LABELS,
    toolbox_center: 'Hộp công cụ chung',
    special_box: 'Hộp chuyên dụng'
}

type ToolPracticeConfig = {
    schema_version?: number
    tools_on_desk?: string[]
    correct_tool?: string
    target_object?: string
    requires_target?: boolean
    correct_action?: string | null
    vietnamese_instruction?: string
    requires_action?: boolean
    vocabulary_analysis?: VocabularyItem[]
    required_tools?: string[]
}

type ToolPracticeQuestion = {
    id: string
    question_text: string
    vietnamese_meaning?: string
    question_audio_url?: string
    countdown_after_audio?: number | null
    tool_config?: ToolPracticeConfig | null
    target_zone_id?: string | null
}

interface ToolDragPracticeScreenProps {
    questions: ToolPracticeQuestion[]
    onFinish: (answers?: Record<string, string>, newlyMasteredIds?: string[]) => void
    onBack?: () => void
    mode?: 'practice' | 'exam'
}

function inferShelfTarget(text: string) {
    const isLeft = /trái|left|왼쪽/.test(text)
    const isRight = /phải|right|오른쪽/.test(text)
    const isTop = /trên|top|위/.test(text)
    const isBottom = /dưới|bottom|아래/.test(text)

    if (isBottom && isLeft) return 'shelf_bottom_left'
    if (isBottom && isRight) return 'shelf_bottom_right'
    if (isTop && isLeft) return 'shelf_top_left'
    if (isTop && isRight) return 'shelf_top_right'
    if (isBottom) return 'shelf_bottom_left'
    if (isTop) return 'shelf_top_left'
    if (isLeft) return 'shelf_bottom_left'
    if (isRight) return 'shelf_bottom_right'
    return 'shelf_bottom_left'
}

function isStorageQuestionText(text: string): boolean {
    const t = text.toLowerCase()
    return /공구함|전용함|함에\s*넣|선반에\s*넣|선반에\s*놓|함에\s*보관|공구함에\s*보관|bỏ.*hộp|cất.*hộp|bỏ.*kệ|cất.*kệ|đặt.*kệ|cho.*vào.*hộp|cho.*vào.*kệ/i.test(t)
}

function inferTargetFromQuestionText(text: string): string {
    const t = text.toLowerCase()

    if (/(?:길이|두께|깊이)(?:을|를)\s*(?:재|측정)|đo\s*(?:chiều dài|bề dày|độ sâu)/i.test(t)) return 'measured_object'
    if (/사포|샌딩|giấy\s*nhám|đánh\s*giấy\s*nhám/i.test(t)) return 'finish_surface'
    if (/바니시|마감재|véc-?ni|vecni|lớp hoàn thiện/i.test(t)) return 'varnish_can'
    if (/젯소|초벌재|sơn lót/i.test(t)) return 'primer_can'
    if (/페인트|hộp sơn|thùng sơn|sơn màu/i.test(t)) return 'paint_can'
    if (/방청유|녹을?\s*방지|dầu\s*(?:dùng để\s*)?(?:chống|ngăn)\s*rỉ|dầu chống gỉ/i.test(t)) return 'metal_workpiece'
    if (/드릴|드릴링머신|뚫는|구멍|khoan|đục lỗ|목재|원목|나무|phôi gỗ|tấm gỗ|gỗ/i.test(t)) return 'wood_workpiece'
    if (/망치|장도리|못|đóng đinh|nhổ đinh/i.test(t)) return 'nail'
    if (/철사|철선|선재|dây kim loại|dây sắt|dây thép|thép ly/i.test(t)) return 'metal_wire'
    if (/전선|구리선|dây điện|dây đồng/i.test(t)) return 'electric_wire'
    if (/십자\s*홈|rãnh chữ thập|rãnh thập|ốc vít chữ thập/i.test(t)) return 'phillips_screw'
    if (/일자\s*홈|rãnh dẹt|rãnh thẳng|ốc vít dẹt/i.test(t)) return 'slotted_screw'
    if (/볼트|너트|암나사|수나사|bu lông|đai ốc/i.test(t)) return 'hex_bolt'
    if (/파이프|철관|가스관|수도관|ống sắt|đường ống|ống kim loại/i.test(t)) return 'metal_pipe'
    if (/코일\s*스프링|스프링|lò xo/i.test(t)) return 'coil_spring'
    if (/베어링|ổ bi|bạc đạn/i.test(t)) return 'bearing'
    if (/기어|부품|bánh răng|linh kiện/i.test(t)) return 'gear'
    if (/금\s*긋기\s*바늘|금을\s*긋|bút lấy dấu|mũi vạch dấu|lấy dấu|vạch dấu/i.test(t)) return 'marking_surface'
    if (/조작반|제어반|스위치|버튼|레버|신호등|cầu dao|công tắc|nút khẩn cấp|đèn báo/i.test(t)) return 'switch_power'
    if (/금속|철판|phôi kim loại/i.test(t)) return 'metal_workpiece'
    if (/플라스틱|phôi nhựa/i.test(t)) return 'plastic_workpiece'

    if (isStorageQuestionText(t)) {
        if (/선반|kệ/i.test(t)) return inferShelfTarget(t)
        return /전용함|hộp chuyên dụng/i.test(t) ? 'special_box' : 'toolbox_center'
    }

    return 'hex_bolt'
}

function inferExactTarget(config: ToolPracticeConfig, question: ToolPracticeQuestion) {
    const text = `${question?.question_text || ''} ${question?.vietnamese_meaning || ''} ${config.vietnamese_instruction || ''}`.toLowerCase()

    if (!isStorageQuestionText(text)) {
        const textTarget = inferTargetFromQuestionText(text)
        if (textTarget) return textTarget
    }

    if (question?.target_zone_id && [...SHELF_TARGETS, ...BOX_TARGETS, 'machine_panel', 'work_area'].includes(question.target_zone_id)) {
        if (question.target_zone_id === 'work_area') return config.target_object || 'hex_bolt'
        if (question.target_zone_id === 'machine_panel') return config.target_object || 'switch_power'
        return question.target_zone_id
    }

    if (config.target_object === 'shelf') return inferShelfTarget(text)
    if (config.target_object === 'box') {
        return /chuyên dụng|전용/.test(text) ? 'special_box' : 'toolbox_center'
    }

    return config.target_object || inferTargetFromQuestionText(text)
}

function inferToolFromText(question: ToolPracticeQuestion, targetObject: string) {
    const text = `${question.question_text || ''} ${question.vietnamese_meaning || ''}`.toLowerCase()

    if (targetObject === 'metal_wire' && /자르는|절단|끊는|cắt/i.test(text)) return 'nipper'
    if (targetObject === 'metal_wire') return 'pliers'
    if (/파이프를\s*(?:자르|절단)|(?:máy|công cụ)\s*(?:dùng\s*)?(?:để\s*)?cắt\s*ống|cắt\s*ống/i.test(text)) return 'electric_cutter'
    if (/크기를\s*조절해.*(?:수나사|암나사|너트|볼트)|조절식.*(?:렌치|스패너)|mỏ\s*lết|điều chỉnh kích (?:cỡ|thước).*(?:ren ngoài|bu lông|đai ốc)/i.test(text)) return 'adjustable_wrench'
    if (/대패|(?:목재|원목)\s*표면을\s*(?:밀어\s*)?깎|bào\s*(?:tay|gỗ|bề mặt gỗ)?/i.test(text)) return 'hand_plane'
    // Check the full compound name before generic measurement/wrench rules.
    if (/토크\s*렌치|토크|cờ lê lực|mô-?men(?: xoắn)?/i.test(text)) return 'torque_wrench'
    if (/소켓\s*렌치|소켓을\s*끼워|cờ lê\s*(?:đầu khẩu|ổ cắm)|đầu khẩu/i.test(text)) return 'socket_wrench'
    if (/장도리|못을\s*(?:빼|뽑)|búa nhổ đinh|nhổ đinh/i.test(text)) return 'claw_hammer'
    if (/금\s*긋기\s*바늘|금을\s*긋|bút lấy dấu|mũi vạch dấu|vạch dấu/i.test(text)) return 'marking_needle'
    if (/롤러|con lăn(?: sơn)?/i.test(text)) return 'paint_roller'
    if (/붓|cọ(?: sơn)?|chổi sơn/i.test(text)) return 'paint_brush'
    if (/스프레이\s*건|도장\s*건|분사기|súng phun sơn|máy phun sơn/i.test(text)) return 'spray_gun'
    if (/전자\s*저울|cân điện tử/i.test(text)) return 'electronic_scale'
    if (/접시\s*저울|cân đĩa/i.test(text)) return 'pan_scale'
    if (/중량을?\s*측정.*기계|중량\s*측정기|máy cân trọng lượng/i.test(text)) return 'industrial_scale'
    if (/무게를\s*재는\s*도구|저울|dụng cụ cân|cân trọng lượng/i.test(text)) return 'scale'
    if (/방청유|녹을?\s*방지.*오일|녹\s*방지\s*오일|dầu\s*(?:dùng để\s*)?(?:chống|ngăn)\s*rỉ|dầu chống gỉ/i.test(text)) return 'rust_preventive_oil'
    if (/스위치|버튼|레버|gạt công tắc|nút khẩn cấp|nút bấm|công tắc|cầu dao/i.test(text)) return 'switch_tool'
    if (/줄자|자를|측정|thước|đo chiều dài|đo/.test(text)) return 'ruler'
    if (/십자드라이버|tua vít chữ thập|tuốc nơ vít chữ thập/.test(text)) return 'phillips_screwdriver'
    if (/일자드라이버|tua vít dẹt|tuốc nơ vít dẹt/.test(text)) return 'flat_screwdriver'
    if (/육각|lục giác|allen/.test(text)) return 'allen_wrench'
    if (/풀러|cảo|vam/.test(text)) return 'bearing_puller'
    if (/망치|장도리|búa|đinh/.test(text)) return 'hammer'
    if (/펜치|니퍼|플라이어|kìm|kềm/.test(text)) return 'pliers'
    if (/스패너|렌치|멍키|몽키|cờ lê|mỏ lết|bu lông|đai ốc|너트|볼트/.test(text)) return 'wrench'
    if (/드라이버|tua vít|tuốc nơ vít|나사/.test(text)) return 'screwdriver'
    if (/톱|cưa/.test(text)) return 'saw'
    if (/용접기|용접|máy hàn|que hàn|mối hàn|gá hàn|hàn kim loại/.test(text)) return 'welder'
    if (/자|줄자|thước|đo|길이|두께|깊이/.test(text)) return 'ruler'

    if (targetObject === 'phillips_screw') return 'phillips_screwdriver'
    if (targetObject === 'slotted_screw') return 'flat_screwdriver'
    if (targetObject === 'electric_wire') return 'pliers'
    if (targetObject === 'metal_pipe' && /자르|절단|cắt/i.test(text)) return 'electric_cutter'
    if (targetObject === 'metal_pipe') return 'pipe_wrench'
    if (targetObject === 'bearing') return 'bearing_puller'
    if (targetObject === 'switch_power' || targetObject === 'emergency_button' || targetObject === 'signal_light') return 'switch_tool'
    return null
}

function normalizeToolId(toolId: string | undefined): string {
    if (!toolId) return 'screwdriver'
    if (toolId === 'level') return 'spirit_level'
    if (toolId === 'cutting_machine') return 'electric_cutter'
    return toolId
}

function normalizeToolConfig(rawConfig: ToolPracticeConfig, question: ToolPracticeQuestion): ToolPracticeConfig {
    const sourceConfig = resolveToolQuestionConfig(question.question_text || '', question.vietnamese_meaning || '', rawConfig)
    const text = `${question?.question_text || ''} ${question?.vietnamese_meaning || ''} ${sourceConfig.vietnamese_instruction || ''}`.toLowerCase()
    const koreanText = question.question_text || ''
    const vietnameseText = `${question.vietnamese_meaning || ''} ${sourceConfig.vietnamese_instruction || ''}`.toLowerCase()

    const target_object = inferExactTarget(sourceConfig, question)
    const isStorageTarget = isStorageQuestionText(text)
    const requires_action = !isStorageTarget
    const isRotationalFastener = ['hex_bolt', 'phillips_screw', 'slotted_screw'].includes(target_object || '')
    const hasKoreanLoosenAction = /푸는|풀다|해체|분리/.test(koreanText)
    const hasKoreanTightenAction = /조이|체결/.test(koreanText)
    const hasLoosenAction = hasKoreanLoosenAction || (!hasKoreanTightenAction && /tháo|vặn ra|nhổ|lấy/.test(vietnameseText))
    const hasTightenAction = hasKoreanTightenAction || (!hasKoreanLoosenAction && /siết|vặn vào/.test(vietnameseText))

    let correct_action = sourceConfig.correct_action
    if (requires_action) {
        if (/금\s*긋기\s*바늘|금을\s*긋|bút lấy dấu|lấy dấu|vạch dấu/i.test(text)) {
            correct_action = 'mark'
        } else if (hasLoosenAction) {
            correct_action = target_object === 'switch_power'
                ? 'turn_off'
                : ['electric_wire', 'metal_wire'].includes(target_object || '')
                  ? 'cut'
                  : isRotationalFastener || target_object === 'metal_pipe'
                    ? 'counter_clockwise'
                    : 'pull'
        } else if (hasTightenAction) {
            correct_action = target_object === 'switch_power' ? 'turn_on' : ['electric_wire', 'metal_wire'].includes(target_object || '') ? 'cut' : isRotationalFastener ? 'clockwise' : 'push'
        } else if (/피복|탈피|tước|tuốt/i.test(text)) {
            correct_action = 'strip'
        } else if (/자르는|절단|끊는|cắt/i.test(text)) {
            correct_action = 'cut'
        } else if (/켜는|올리|bật|gạt lên/i.test(text)) {
            correct_action = 'turn_on'
        } else if (/끄는|내리|차단|tắt|gạt xuống/i.test(text)) {
            correct_action = 'turn_off'
        } else if (!correct_action) {
            correct_action = ['electric_wire', 'metal_wire'].includes(target_object || '') ? 'cut' : target_object === 'hex_bolt' ? 'clockwise' : 'push'
        }
    } else {
        correct_action = null
    }

    const inferredTool = inferToolFromText(question, target_object)
    const rawCorrect = inferredTool || sourceConfig.correct_tool || 'screwdriver'
    const correct_tool = normalizeToolId(rawCorrect)
    const rawDeskTools = (sourceConfig.tools_on_desk || []).map(normalizeToolId)

    return {
        ...sourceConfig,
        target_object,
        // The table-game flow always needs a real object/detail when one can
        // be resolved from the command. Older records may still explicitly
        // disable this step even though they contain a valid target_object.
        requires_target: Boolean(target_object),
        correct_tool,
        tools_on_desk: Array.from(new Set([correct_tool, ...rawDeskTools])),
        correct_action,
        requires_action
    }
}

function hashSeed(value: string) {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0
    }
    return hash || 1
}

function shuffleBySeed(items: string[], seedValue: string) {
    let seed = hashSeed(seedValue)
    const result = [...items]

    for (let i = result.length - 1; i > 0; i -= 1) {
        seed = (seed * 1664525 + 1013904223) >>> 0
        const j = seed % (i + 1)
        const temp = result[i]
        result[i] = result[j]
        result[j] = temp
    }

    return result
}

// Fallback config calculator with refined matching algorithms
function getFallbackToolConfig(ko: string, vi: string) {
    const koText = ko.toLowerCase()
    const viText = vi.toLowerCase()
    
    // 1. Tool Matching
    let correct_tool = 'screwdriver'
    if (/토크\s*렌치|토크/.test(koText) || /cờ lê lực|mô-?men(?: xoắn)?/i.test(viText)) {
        correct_tool = 'torque_wrench'
    } else if (koText.includes('스위치') || koText.includes('버튼') || koText.includes('레버') || viText.includes('công tắc') || viText.includes('cầu dao') || viText.includes('nút khẩn cấp') || viText.includes('nút bấm') || viText.includes('gạt công tắc')) {
        correct_tool = 'switch_tool'
    } else if (koText.includes('육각 렌치') || koText.includes('육각렌치')) {
        correct_tool = 'allen_wrench'
    } else if (koText.includes('풀러') || viText.includes('cảo') || viText.includes('vam')) {
        correct_tool = 'bearing_puller'
    } else if (koText.includes('망치') || koText.includes('장도리') || koText.includes('못을') || koText.includes('못이') || koText.includes('박는')) {
        correct_tool = 'hammer'
    } else if (koText.includes('플라이어') || koText.includes('펜치') || koText.includes('니퍼') || koText.includes('롱노즈') || koText.includes('철사') || koText.includes('선재') || koText.includes('구리선') || koText.includes('철선') || koText.includes('전선')) {
        correct_tool = 'pliers'
    } else if (koText.includes('스패너') || koText.includes('렌치') || koText.includes('몽키') || koText.includes('멍키') || koText.includes('토크') || koText.includes('볼트') || koText.includes('너트') || koText.includes('암나사') || koText.includes('수나사')) {
        correct_tool = 'wrench'
    } else if (koText.includes('드라이버') || koText.includes('나사못') || koText.includes('나사')) {
        correct_tool = 'screwdriver'
    } else if (koText.includes('톱') || koText.includes('날물')) {
        correct_tool = 'saw'
    } else if (koText.includes('용접')) {
        correct_tool = 'welder'
    } else if (koText.includes('자') || koText.includes('줄자') || koText.includes('길이') || koText.includes('두께') || koText.includes('깊이') || koText.includes('선반 기계')) {
        correct_tool = 'ruler'
    }

    // 2. Target Object Matching
    let target_object = 'hex_bolt'
    if (koText.includes('철선') || koText.includes('철사') || koText.includes('선재')) {
        target_object = 'metal_wire'
    } else if (koText.includes('전선') || koText.includes('구리선')) {
        target_object = 'electric_wire'
    } else if (koText.includes('조작반') || koText.includes('제어반') || koText.includes('스위치') || koText.includes('버튼') || koText.includes('레버') || koText.includes('신호등')) {
        target_object = 'switch_power'
    } else if (koText.includes('선반') || koText.includes('kệ') || koText.includes('위치에')) {
        target_object = 'shelf'
    } else if (koText.includes('상자') || koText.includes('함에') || koText.includes('상자에') || koText.includes('전용함') || koText.includes('공구함') || koText.includes('부품') || koText.includes('베어링') || koText.includes('기어') || koText.includes('코일 스프링') || koText.includes('날물')) {
        if (koText.includes('선반') || koText.includes('kệ') || koText.includes('위치에')) {
            target_object = 'shelf'
        } else {
            target_object = 'box'
        }
    }

    // 3. Action Matching
    let correct_action = 'clockwise'
    
    // Check pulling/removing actions
    if (koText.includes('푸는') || koText.includes('해체') || koText.includes('풀기') || koText.includes('빼') || koText.includes('뽑') || viText.includes('tháo') || viText.includes('nhổ') || viText.includes('lấy')) {
        if (target_object === 'switch_power') {
            correct_action = 'turn_off'
        } else if (target_object === 'electric_wire' || target_object === 'metal_wire') {
            if (koText.includes('피복') || koText.includes('탈피')) {
                correct_action = 'strip'
            } else {
                correct_action = 'cut'
            }
        } else if (target_object === 'hex_bolt') {
            correct_action = 'counter_clockwise'
        } else {
            correct_action = 'pull'
        }
    } 
    // Check putting/inserting/tightening actions
    else if (koText.includes('조이') || koText.includes('체결') || koText.includes('박') || koText.includes('끼우') || koText.includes('넣') || koText.includes('장착') || viText.includes('siết') || viText.includes('đóng') || viText.includes('cất') || viText.includes('gắn') || viText.includes('lắp') || viText.includes('bỏ')) {
        if (target_object === 'switch_power') {
            correct_action = 'turn_on'
        } else if (target_object === 'electric_wire' || target_object === 'metal_wire') {
            correct_action = 'cut'
        } else if (target_object === 'hex_bolt') {
            correct_action = 'clockwise'
        } else {
            correct_action = 'push'
        }
    }

    // Default adjust switches
    if (target_object === 'switch_power') {
        if (koText.includes('내리는') || koText.includes('끄는') || viText.includes('tắt') || viText.includes('hạ')) {
            correct_action = 'turn_off'
        } else {
            correct_action = 'turn_on'
        }
    }

    return {
        tools_on_desk: ["allen_wrench", "screwdriver", "hammer", "pliers", "wrench"],
        correct_tool,
        target_object,
        correct_action,
        vietnamese_instruction: vi
    }
}

// Visual tool SVGs
function SmallToolIcon({ type, className = "w-10 h-10" }: { type: string; className?: string }) {
    return <WorkshopToolIcon type={normalizeToolId(type)} className={className} />
}

// Kept temporarily as a visual fallback while older question data is migrated.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacySmallToolIcon({ type, className = "w-10 h-10" }: { type: string; className?: string }) {
    const t = normalizeToolId(type)
    if (t === 'allen_wrench') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 10h34v8H24v34h-8V10z" fill="#d9e2ec" stroke="#64748b" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M22 16h25M22 16v33" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" opacity=".55" />
                <path d="M50 10v8M16 52h8" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
        )
    }
    if (t === 'phillips_screwdriver') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 7l6 8-4 4h-4l-4-4 6-8z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                <path d="M28 12h8M32 8v8" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
                <rect x="29" y="18" width="6" height="20" rx="2" fill="#94a3b8" />
                <rect x="19" y="36" width="26" height="22" rx="8" fill="#f97316" stroke="#9a3412" strokeWidth="2" />
                <path d="M25 40v14M32 39v17M39 40v14" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" opacity=".85" />
            </svg>
        )
    }
    if (t === 'flat_screwdriver') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M27 8h10l-3 11h-4L27 8z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                <path d="M28 12h8" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="29" y="18" width="6" height="20" rx="2" fill="#94a3b8" />
                <rect x="19" y="36" width="26" height="22" rx="8" fill="#0ea5e9" stroke="#075985" strokeWidth="2" />
                <path d="M25 40v14M32 39v17M39 40v14" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" opacity=".85" />
            </svg>
        )
    }
    if (t === 'hammer') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="30" y="23" width="7" height="35" rx="2" fill="#b45309" stroke="#78350f" strokeWidth="2" transform="rotate(-8 33.5 40.5)" />
                <path d="M14 14h31c5 0 8 4 9 9l-9-3H14v-6z" fill="#64748b" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
                <rect x="10" y="12" width="7" height="12" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                <path d="M22 17h18" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" opacity=".7" />
            </svg>
        )
    }
    if (t === 'pliers') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28 24c-8-6-9-14-5-19l9 16-4 3z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                <path d="M36 24c8-6 9-14 5-19l-9 16 4 3z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                <circle cx="32" cy="24" r="5" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
                <path d="M29 28c-5 8-10 20-10 29h8c2-8 5-18 7-25" fill="#ef4444" stroke="#991b1b" strokeWidth="2" strokeLinejoin="round" />
                <path d="M35 28c5 8 10 20 10 29h-8c-2-8-5-18-7-25" fill="#ef4444" stroke="#991b1b" strokeWidth="2" strokeLinejoin="round" />
                <path d="M23 50h5M36 50h5" stroke="#fecaca" strokeWidth="2" strokeLinecap="round" />
            </svg>
        )
    }
    if (t === 'wrench') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M45 7c-4 0-8 2-10 6l6 6-22 22-7-6c-4 3-6 7-5 12 1 5 5 9 10 10 5 1 10-1 12-5l-6-7 22-22 7 6c4-3 6-8 5-13-1-5-6-9-12-9z" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M24 43l20-20" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" opacity=".7" />
            </svg>
        )
    }
    if (t === 'saw') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 25c0-6 4-10 10-10h6v13h-8v11H8V25z" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
                <path d="M22 20h34l-5 18H22V20z" fill="#dbeafe" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" />
                <path d="M25 38l3 5 3-5 3 5 3-5 3 5 3-5 3 5 3-5" stroke="#475569" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="17" cy="27" r="4" fill="#0f172a" opacity=".45" />
            </svg>
        )
    }
    if (t === 'welder') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="17" width="31" height="31" rx="5" fill="#0284c7" stroke="#075985" strokeWidth="2" />
                <circle cx="17" cy="25" r="3" fill="#22c55e" />
                <rect x="24" y="24" width="9" height="16" rx="1.5" fill="#0f172a" />
                <path d="M18 17v-5h17v5M40 33c8 0 12 4 14 10" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M52 42l4 6M50 47h8M54 40v10" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
            </svg>
        )
    }
    if (t === 'ruler') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="7" y="23" width="50" height="18" rx="3" fill="#facc15" stroke="#a16207" strokeWidth="2" transform="rotate(-8 32 32)" />
                <path d="M16 25l1 7M24 24l1 10M32 23l1 7M40 22l1 10M48 21l1 7" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                <path d="M13 36l37-5" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" opacity=".75" />
            </svg>
        )
    }
    if (t === 'adjustable_wrench') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M42 8c-6 0-10 4-10 9v4l-18 24c-2 3-1 7 2 9s7 1 9-2l17-23h2c5 0 9-4 9-9 0-4-3-8-7-9l-4 4z" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" strokeLinejoin="round" />
                <rect x="36" y="16" width="6" height="4" rx="1" fill="#f59e0b" />
            </svg>
        )
    }
    if (t === 'long_nose_pliers') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 22L27 6h4l2 16zM34 22L37 6h-4l-2 16z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                <circle cx="32" cy="24" r="5" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
                <path d="M29 28c-5 8-10 20-10 29h8c2-8 5-18 7-25" fill="#eab308" stroke="#a16207" strokeWidth="2" strokeLinejoin="round" />
                <path d="M35 28c5 8 10 20 10 29h-8c-2-8-5-18-7-25" fill="#eab308" stroke="#a16207" strokeWidth="2" strokeLinejoin="round" />
            </svg>
        )
    }
    if (t === 'nipper') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M27 22l-6-12 8 8 3 4zM37 22l6-12-8 8-3 4z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                <circle cx="32" cy="24" r="5" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
                <path d="M29 28c-5 8-10 20-10 29h8c2-8 5-18 7-25" fill="#0ea5e9" stroke="#0369a1" strokeWidth="2" strokeLinejoin="round" />
                <path d="M35 28c5 8 10 20 10 29h-8c-2-8-5-18-7-25" fill="#0ea5e9" stroke="#0369a1" strokeWidth="2" strokeLinejoin="round" />
            </svg>
        )
    }
    if (t === 'generic_tool' || t === 'hand') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 38v-18c0-3 4-3 4 0v10M28 20v-10c0-3 4-3 4 0v10M32 20v-8c0-3 4-3 4 0v8M36 24v-6c0-3 4-3 4 0v10" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#ffedd5" />
                <path d="M24 36c-3 0-8 3-8 8s8 12 14 14h10c6 0 10-6 10-12v-12" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#ffedd5" />
                <circle cx="42" cy="14" r="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            </svg>
        )
    }
    if (t === 'lathe_machine') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="24" width="48" height="16" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="2.5" />
                <rect x="12" y="16" width="10" height="24" rx="2" fill="#0284c7" stroke="#075985" strokeWidth="2" />
                <rect x="22" y="28" width="20" height="8" rx="2" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
                <path d="M42 26l8 6-8 6V26z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
            </svg>
        )
    }
    if (t === 'drill') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="14" width="30" height="18" rx="4" fill="#0284c7" stroke="#075985" strokeWidth="2.5" />
                <rect x="14" y="32" width="10" height="24" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
                <path d="M38 21h12l6 2-6 2H38v-4z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
                <path d="M56 23l6-1" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            </svg>
        )
    }
    // Default fallback tool (Screwdriver)
    return (
        <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M31 7h2l4 8-4 4h-2l-4-4 4-8z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
            <rect x="29" y="17" width="6" height="21" rx="2" fill="#94a3b8" />
            <rect x="20" y="36" width="24" height="21" rx="7" fill="#f97316" stroke="#9a3412" strokeWidth="2" />
            <path d="M25 39v15M32 38v18M39 39v15" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" opacity=".8" />
        </svg>
    )
}

function TargetObjectIcon({ type, className = "w-10 h-10", activeAction }: { type: string; className?: string; activeAction?: string | null }) {
    const detailAsset = DETAIL_ASSETS[type]
    if (detailAsset) {
        return (
            <Image
                src={detailAsset}
                alt=""
                width={128}
                height={128}
                draggable={false}
                className={`${className} pointer-events-none object-contain`}
            />
        )
    }

    if (['paint_can', 'primer_can', 'varnish_can'].includes(type)) {
        const fill = type === 'paint_can' ? '#3b82f6' : type === 'primer_can' ? '#f8fafc' : '#d97706'
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 19h34l-3 36H18l-3-36Z" fill={fill} stroke="#334155" strokeWidth="2.5" />
                <ellipse cx="32" cy="19" rx="17" ry="6" fill="#e2e8f0" stroke="#475569" strokeWidth="2.5" />
                <path d="M22 18c0-10 20-10 20 0" stroke="#64748b" strokeWidth="3" />
                <rect x="22" y="31" width="20" height="12" rx="3" fill="white" opacity=".9" />
                <path d="M27 37h10" stroke={fill === '#f8fafc' ? '#64748b' : fill} strokeWidth="3" strokeLinecap="round" />
            </svg>
        )
    }
    if (type === 'switch_power') {
        const isOn = activeAction === 'turn_on'
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="19" y="8" width="26" height="48" rx="5" fill="#111827" stroke="#475569" strokeWidth="2.5" />
                <rect x="25" y="15" width="14" height="34" rx="7" fill="#334155" />
                <circle cx="32" cy={isOn ? 23 : 41} r="7" fill={isOn ? '#22c55e' : '#ef4444'} stroke="#0f172a" strokeWidth="2" />
                <path d="M47 18h5M47 46h5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            </svg>
        )
    }
    if (type === 'emergency_button') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="18" width="44" height="34" rx="6" fill="#facc15" stroke="#a16207" strokeWidth="2.5" />
                <ellipse cx="32" cy="28" rx="15" ry="10" fill="#ef4444" stroke="#991b1b" strokeWidth="2.5" />
                <rect x="20" y="28" width="24" height="13" rx="4" fill="#b91c1c" />
                <path d="M23 23c5-5 13-5 18 0" stroke="#fecaca" strokeWidth="2" strokeLinecap="round" opacity=".8" />
            </svg>
        )
    }
    if (type === 'signal_light') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="22" y="7" width="20" height="49" rx="5" fill="#111827" stroke="#475569" strokeWidth="2.5" />
                <circle cx="32" cy="20" r="7" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" />
                <circle cx="32" cy="33" r="7" fill="#facc15" stroke="#854d0e" strokeWidth="2" />
                <circle cx="32" cy="46" r="7" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
                <path d="M25 12h14" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity=".6" />
            </svg>
        )
    }
    if (type === 'phillips_screw' || type === 'slotted_screw') {
        const isPhillips = type === 'phillips_screw'
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="22" fill="#cbd5e1" stroke="#475569" strokeWidth="3" />
                <circle cx="32" cy="32" r="15" fill="#94a3b8" stroke="#64748b" strokeWidth="2" />
                {isPhillips ? (
                    <>
                        <rect x="18" y="28" width="28" height="8" rx="2" fill="#1e293b" />
                        <rect x="28" y="18" width="8" height="28" rx="2" fill="#1e293b" />
                    </>
                ) : (
                    <rect x="17" y="28" width="30" height="8" rx="2" fill="#1e293b" />
                )}
                <path d="M19 20c8-7 18-8 27-1" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" opacity=".45" />
            </svg>
        )
    }
    if (type === 'hex_bolt') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="32,7 53,19 53,45 32,57 11,45 11,19" fill="#cbd5e1" stroke="#475569" strokeWidth="3" />
                <circle cx="32" cy="32" r="11" fill="#94a3b8" stroke="#475569" strokeWidth="2.5" />
                <circle cx="32" cy="32" r="5" fill="#0f172a" opacity=".45" />
                <path d="M22 18l20 28M42 18L22 46" stroke="#f8fafc" strokeWidth="2" opacity=".35" />
            </svg>
        )
    }
    if (type === 'electric_wire') {
        return (
            <svg className={className} viewBox="0 0 80 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 28c14-16 24 16 38 0s22 0 30-10" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
                <path d="M6 28c14-16 24 16 38 0s22 0 30-10" stroke="#fecaca" strokeWidth="2" strokeLinecap="round" opacity=".75" />
                <path d="M9 36h15M55 14h15" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <path d="M16 36h8M55 14h8" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
            </svg>
        )
    }
    if (type === 'gear') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28 6h8l2 8 6 2 7-4 5 7-5 7 1 6 7 5-3 8-9 1-4 5 1 8h-9l-4-7h-6l-4 7h-9l1-8-4-5-9-1-3-8 7-5 1-6-5-7 5-7 7 4 6-2 2-8z" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="32" cy="32" r="13" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
                <circle cx="32" cy="32" r="5" fill="#0f172a" opacity=".75" />
            </svg>
        )
    }
    if (type === 'coil_spring') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 12c12-4 24 0 24 6s-24 6-24 12 24 0 24 6-24 6-24 12 24 0 24 6" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M20 12c12-4 24 0 24 6s-24 6-24 12 24 0 24 6-24 6-24 12 24 0 24 6" stroke="#bae6fd" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".8" />
            </svg>
        )
    }
    if (type === 'bearing') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="24" fill="#64748b" stroke="#334155" strokeWidth="3" />
                <circle cx="32" cy="32" r="14" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
                <circle cx="32" cy="15" r="3.5" fill="#e2e8f0" />
                <circle cx="49" cy="32" r="3.5" fill="#e2e8f0" />
                <circle cx="32" cy="49" r="3.5" fill="#e2e8f0" />
                <circle cx="15" cy="32" r="3.5" fill="#e2e8f0" />
                <circle cx="44" cy="20" r="3.5" fill="#e2e8f0" />
                <circle cx="44" cy="44" r="3.5" fill="#e2e8f0" />
                <circle cx="20" cy="44" r="3.5" fill="#e2e8f0" />
                <circle cx="20" cy="20" r="3.5" fill="#e2e8f0" />
            </svg>
        )
    }
    if (type === 'metal_pipe') {
        return (
            <svg className={className} viewBox="0 0 80 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="19" width="64" height="16" rx="8" fill="#94a3b8" stroke="#475569" strokeWidth="2.5" />
                <ellipse cx="14" cy="27" rx="7" ry="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
                <ellipse cx="14" cy="27" rx="3" ry="4" fill="#334155" />
                <path d="M25 21h34M25 33h31" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" opacity=".65" />
            </svg>
        )
    }
    if (type === 'wood_workpiece') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="16" width="44" height="32" rx="4" fill="#b45309" stroke="#78350f" strokeWidth="2.5" />
                <path d="M16 24h32M16 32h32M16 40h32" stroke="#d97706" strokeWidth="2" strokeLinecap="round" opacity=".6" />
            </svg>
        )
    }
    if (type === 'metal_workpiece') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="16" width="44" height="32" rx="4" fill="#64748b" stroke="#334155" strokeWidth="2.5" />
                <path d="M14 20l36 24M14 44l36-24" stroke="#cbd5e1" strokeWidth="1.5" opacity=".4" />
            </svg>
        )
    }
    if (type === 'plastic_workpiece') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="16" width="44" height="32" rx="4" fill="#0d9488" stroke="#115e59" strokeWidth="2.5" />
                <circle cx="32" cy="32" r="8" fill="#14b8a6" opacity=".5" />
            </svg>
        )
    }
    if (type === 'lever') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="26" y="40" width="12" height="16" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="2" />
                <path d="M32 40L24 16" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
                <circle cx="24" cy="16" r="8" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
            </svg>
        )
    }
    if (type === 'workpiece') {
        return (
            <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="12" y="18" width="40" height="28" rx="4" fill="#475569" stroke="#1e293b" strokeWidth="2.5" />
                <path d="M20 26h24M20 34h24" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity=".5" />
            </svg>
        )
    }
    return <HelpCircle className={className} />
}

export function ToolDragPracticeScreen({
    questions,
    onFinish,
    onBack,
    mode = 'practice',
}: ToolDragPracticeScreenProps) {
    const isExamMode = mode === 'exam'
    const [currentIndex, setCurrentIndex] = useState(0)
    const currentQ = questions[currentIndex]

    const config = useMemo(() => (
        currentQ
            ? normalizeToolConfig(
                currentQ.tool_config ||
                (toolConfigMap as Record<string, ToolPracticeConfig>)[currentQ.question_text] ||
                getFallbackToolConfig(currentQ.question_text, currentQ.vietnamese_meaning || ''),
                currentQ
            )
            : null
    ), [currentQ])

    // Audio & Speed States
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [audioState, setAudioState] = useState<'idle' | 'playing' | 'ended' | 'error'>('idle')
    const [speed, setSpeed] = useState<number>(1.0)
    const [showKoreanText, setShowKoreanText] = useState(true)
    const [showVietnameseText, setShowVietnameseText] = useState(true)

    // Game 3-Step Selection States
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [heldTool, setHeldTool] = useState<string | null>(null)
    const [placedTools, setPlacedTools] = useState<string[]>([])
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
    const [selectedAction, setSelectedAction] = useState<string | null>(null)
    const [choiceSessionSeed] = useState(() => Math.random().toString(36).slice(2))

    const currentToolsOnDesk = useMemo(() => {
        if (!config) return ['phillips_screwdriver', 'flat_screwdriver', 'wrench', 'pliers', 'hammer']

        const correct = normalizeToolId(config.correct_tool || 'screwdriver')
        const requiredTools = (config.required_tools || []).map(normalizeToolId)
        const configuredTools = (config.tools_on_desk || []).map(normalizeToolId)
        const deskToolCount = ALL_SYSTEM_TOOLS.length
        const baseTools = Array.from(new Set([correct, ...requiredTools, ...configuredTools])).slice(0, deskToolCount)
        const distractorPool = [
            ...(TOOL_DISTRACTORS[correct] || []).map(normalizeToolId),
            ...ALL_SYSTEM_TOOLS,
        ].filter((tool) => tool !== correct && !baseTools.includes(tool))
        const shuffleSeed = `${currentQ.id}-${currentIndex}-${correct}`
        const neededCount = Math.max(0, deskToolCount - baseTools.length)
        const selected = shuffleBySeed(distractorPool, shuffleSeed).slice(0, neededCount)

        const finalTools = Array.from(new Set([...baseTools, ...selected]))

        const fallbacks = ALL_SYSTEM_TOOLS
        for (const fb of fallbacks) {
            if (finalTools.length >= deskToolCount) break
            if (!finalTools.includes(fb)) finalTools.push(fb)
        }

        return shuffleBySeed(
            finalTools.slice(0, deskToolCount),
            `${currentQ.id}-${choiceSessionSeed}-tool-order`,
        )
    }, [choiceSessionSeed, config, currentIndex, currentQ.id])

    const currentTargetsOnDesk = useMemo(() => {
        const correctTarget = config?.target_object || 'workpiece'
        const distractors = shuffleBySeed(
            TARGET_DISTRACTOR_POOL.filter((target) => target !== correctTarget),
            `${currentQ.id}-${currentIndex}-${correctTarget}-targets`,
        ).slice(0, 4)
        return shuffleBySeed(
            [correctTarget, ...distractors],
            `${currentQ.id}-${choiceSessionSeed}-${correctTarget}-target-order`,
        )
    }, [choiceSessionSeed, config?.target_object, currentIndex, currentQ.id])

    // Feedback States
    const [isShake, setIsShake] = useState(false)
    const [feedbackState, setFeedbackState] = useState<'idle' | 'success' | 'fail'>('idle')
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
    const [isExamSubmitted, setIsExamSubmitted] = useState(false)
    const [isTourOpen, setIsTourOpen] = useState(false)

    const tourSteps = useMemo<ToolGameTourStep[]>(() => [
        {
            selector: '[data-tour="audio-controls"]',
            title: 'Nghe yêu cầu của giám khảo',
            description: 'Bấm Nghe lại khi cần và chọn tốc độ đọc phù hợp trước khi bắt đầu.',
        },
        {
            selector: '[data-tour="tool-groups"]',
            title: 'Chọn nhóm dụng cụ',
            description: 'Chọn đúng nhóm để thu hẹp danh sách và tìm dụng cụ nhanh hơn.',
        },
        {
            selector: '[data-tour="tool-inventory"]',
            title: 'Nhấc dụng cụ cần dùng',
            description: 'Nhấn giữ dụng cụ rồi kéo. Trên điện thoại, giữ nhẹ một nhịp trước khi di chuyển ngón tay.',
        },
        {
            selector: '[data-tour="operation-zone"]',
            title: 'Thả vào vùng thao tác',
            description: 'Kéo dụng cụ lên mặt bàn. Khi vùng thao tác sáng lên, thả tay để đặt dụng cụ.',
        },
        ...(config?.requires_target !== false ? [{
            selector: '[data-tour="target-tab"]',
            title: 'Chọn chi tiết cần thao tác',
            description: 'Sau khi đặt đủ dụng cụ, mở tab Chi tiết rồi kéo vật cần thao tác lên bàn.',
        }] : []),
        ...(config?.requires_action !== false ? [{
            selector: '[data-tour="operation-zone"]',
            title: 'Thực hiện thao tác cuối cùng',
            description: 'Khi dụng cụ và chi tiết đã sẵn sàng, chọn hành động đúng theo yêu cầu của giám khảo.',
        }] : []),
        {
            selector: '[data-tour="operation-zone"]',
            title: 'Muốn chọn lại?',
            description: 'Nhấn giữ vật đã đặt trên bàn và kéo vào biểu tượng thùng rác để trả lại, sau đó chọn vật khác.',
        },
    ], [config?.requires_action, config?.requires_target])

    const closeTour = useCallback(() => {
        setIsTourOpen(false)
        try {
            window.localStorage.setItem(TOOL_GAME_ONBOARDING_KEY, 'completed')
        } catch {
            // The walkthrough still works when storage is unavailable.
        }
    }, [])

    useEffect(() => {
        let completed = false
        try {
            completed = window.localStorage.getItem(TOOL_GAME_ONBOARDING_KEY) === 'completed'
        } catch {
            completed = false
        }
        if (completed) return
        const timer = window.setTimeout(() => setIsTourOpen(true), 650)
        return () => window.clearTimeout(timer)
    }, [])

    const masteredIdsRef = useRef<Set<string>>(new Set())
    const failedIdsRef = useRef<Set<string>>(new Set())
    const feedbackRef = useRef<HTMLDivElement>(null)

    const revealFeedback = useCallback(() => {
        // Wait for React to commit the result sheet, then move keyboard and
        // screen-reader focus to it. The sheet itself is fixed in the viewport.
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => feedbackRef.current?.focus({ preventScroll: true }))
        })
    }, [])

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed
        }
    }, [speed])

    const handleAudioEnded = useCallback(() => {
        setAudioState('ended')
    }, [])

    useEffect(() => {
        if (!currentQ) return
        
        const audio = audioRef.current
        let fallbackTimer: number | null = null
        if (currentQ.question_audio_url && audio) {
            audio.src = currentQ.question_audio_url
            audio.playbackRate = speed
            audio.play().catch(err => {
                if (err.name !== 'AbortError') {
                    console.warn("Audio error:", err)
                    setAudioState('error')
                    handleAudioEnded()
                }
            })
        } else if (currentQ.question_text) {
            speakText(
                currentQ.question_text,
                speed,
                () => setAudioState('playing'),
                () => handleAudioEnded(),
                () => { setAudioState('error'); handleAudioEnded(); }
            )
        } else {
            fallbackTimer = window.setTimeout(handleAudioEnded, 0)
        }

        return () => {
            if (fallbackTimer) window.clearTimeout(fallbackTimer)
            if (audio) audio.pause()
            stopTTS()
        }
    }, [currentIndex, currentQ, handleAudioEnded, speed])

    const replayAudio = () => {
        if (currentQ.question_audio_url && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.playbackRate = speed
            audioRef.current.play().catch(err => {
                if (err.name !== 'AbortError') {
                    console.warn("Audio replay error:", err)
                    setAudioState('error')
                    handleAudioEnded()
                }
            })
        } else if (currentQ.question_text) {
            speakText(
                currentQ.question_text,
                speed,
                () => setAudioState('playing'),
                () => setAudioState('ended'),
                () => { setAudioState('error'); handleAudioEnded(); }
            )
        }
    }

    // Step 1: Select tool (allowing changing selection during Step 2 as well)
    const selectTool = (tool: string) => {
        if (feedbackState === 'success' || isExamSubmitted) return
        setHeldTool(tool)
        if (step === 1) {
            setStep(config?.requires_target === false ? 3 : 2)
        }
    }

    const evaluateSelection = (target: string | null, action: string | null, toolOverride?: string) => {
        if (!config) return

        const chosenTool = toolOverride || heldTool
        const normalizedRequiredTools = (config.required_tools || []).map(normalizeToolId).filter(Boolean)
        const selectedToolSet = new Set([...placedTools, chosenTool].filter(Boolean))
        const hasAllRequiredTools = normalizedRequiredTools.length > 0
            ? normalizedRequiredTools.every((tool) => selectedToolSet.has(tool))
            : null
        const isSingleToolCorrect = chosenTool === config.correct_tool ||
            (config.correct_tool === 'switch_tool' && ['switch_tool', 'generic_tool', 'pliers', 'screwdriver', 'hand'].includes(chosenTool || '')) ||
            (config.correct_tool === 'generic_tool' && ['switch_tool', 'generic_tool', 'pliers', 'screwdriver', 'hand'].includes(chosenTool || '')) ||
            ((config.target_object === 'switch_power' || config.target_object === 'emergency_button') && ['switch_tool', 'generic_tool', 'pliers', 'screwdriver', 'hand'].includes(chosenTool || ''))
        const isToolCorrect = hasAllRequiredTools ?? isSingleToolCorrect
        const isTargetCorrect = config.requires_target === false || target === config.target_object
        const isActionCorrect = !config.requires_action || action === config.correct_action
        const isCorrect = isToolCorrect && isTargetCorrect && isActionCorrect

        if (isExamMode) {
            if (isCorrect) masteredIdsRef.current.add(currentQ.id)
            else failedIdsRef.current.add(currentQ.id)
            setIsExamSubmitted(true)
            onFinish({
                selected_tool: TOOL_NAMES[chosenTool || '']?.vi || chosenTool || 'Chưa chọn',
                selected_target: config.requires_target === false ? 'Không yêu cầu' : EXACT_TARGET_LABELS[target || ''] || target || 'Chưa chọn',
                selected_action: action ? getActionDisplay(action).label : 'Không yêu cầu',
                correct_tool: TOOL_NAMES[config.correct_tool || '']?.vi || config.correct_tool || 'Chưa cấu hình',
                correct_target: config.requires_target === false ? 'Không yêu cầu' : EXACT_TARGET_LABELS[config.target_object || ''] || config.target_object || 'Chưa cấu hình',
                correct_action: config.requires_action
                    ? getActionDisplay(config.correct_action || '').label || 'Chưa cấu hình'
                    : 'Không yêu cầu',
            }, isCorrect ? [currentQ.id] : [])
            return
        }

        if (isCorrect) {
            setFeedbackState('success')
            setIsFeedbackOpen(true)
            revealFeedback()
            if (!failedIdsRef.current.has(currentQ.id)) {
                masteredIdsRef.current.add(currentQ.id)
            }
        } else {
            setFeedbackState('fail')
            setIsFeedbackOpen(true)
            revealFeedback()
            failedIdsRef.current.add(currentQ.id)
            setIsShake(true)
            setTimeout(() => setIsShake(false), 500)
        }
    }

    const placeToolInOperationZone = (tool: string) => {
        if (!config || feedbackState !== 'idle' || isExamSubmitted) return
        setHeldTool(tool)
        const nextPlacedTools = Array.from(new Set([...placedTools, tool]))
        setPlacedTools(nextPlacedTools)

        // Let learners complete the whole command before grading. The action
        // can provide useful context, while the final result still evaluates
        // the tool, target and action together.
        const requiredToolCount = Math.max(1, config.required_tools?.filter(Boolean).length || 1)
        if (nextPlacedTools.length < requiredToolCount) {
            setStep(1)
            return
        }
        if (config.requires_target === false) {
            if (config.requires_action) {
                setStep(3)
                return
            }
            evaluateSelection(null, null, tool)
            return
        }
        setStep(2)
    }

    const removeToolFromOperationZone = (tool: string) => {
        if (feedbackState !== 'idle' || isExamSubmitted) return
        const nextPlacedTools = placedTools.filter((item) => item !== tool)
        setPlacedTools(nextPlacedTools)
        if (heldTool === tool) setHeldTool(null)
        setSelectedTarget(null)
        setStep(1)
    }

    const placeTargetInOperationZone = (target: string) => {
        if (!config || step !== 2 || feedbackState !== 'idle' || isExamSubmitted) return
        setSelectedTarget(target)
        if (config.requires_action) {
            setStep(3)
            return
        }
        evaluateSelection(target, null)
    }

    const removeTargetFromOperationZone = () => {
        if (feedbackState !== 'idle' || isExamSubmitted) return
        setSelectedTarget(null)
        setSelectedAction(null)
        setStep(2)
    }

    // Step 2: Select target object. Storage commands finish here; operation commands continue to Step 3.
    const selectTarget = (target: string) => {
        if (step !== 2 || feedbackState === 'success' || isExamSubmitted) return
        setSelectedTarget(target)

        if (config?.requires_action) {
            setStep(3)
            return
        }

        setSelectedAction(null)
        evaluateSelection(target, null)
    }

    // Step 3: Choose action and evaluate
    const executeAction = (action: string) => {
        if (step !== 3 || !config || feedbackState === 'success' || (config.requires_target !== false && !selectedTarget) || isExamSubmitted) return
        setSelectedAction(action)
        evaluateSelection(selectedTarget, action)
    }

    const resetSteps = () => {
        if (audioRef.current) audioRef.current.pause()
        stopTTS()
        setStep(1)
        setHeldTool(null)
        setPlacedTools([])
        setSelectedTarget(null)
        setSelectedAction(null)
        setFeedbackState('idle')
        setIsFeedbackOpen(false)
        setShowCorrectAnswer(false)
        setIsExamSubmitted(false)
        setIsShake(false)

    }

    const handleNext = () => {
        resetSteps()
        setAudioState('idle')
        setIsShake(false)

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            onFinish(undefined, Array.from(masteredIdsRef.current))
        }
    }

    if (!currentQ || !config) return null

    // Determine target classifications
    const correctToolId = config.correct_tool || 'screwdriver'
    const targetObjectId = config.target_object || ''
    const correctActionId = config.correct_action || ''
    const displayedVietnameseMeaning = /조이|체결/.test(currentQ.question_text || '')
        ? (currentQ.vietnamese_meaning || '').replace(/\s*\(\s*tháo\s*\)/gi, '')
        : currentQ.vietnamese_meaning || ''

    const ALL_PANEL_ITEMS = ['switch_power', 'emergency_button', 'signal_light']
    const ALL_WORKBENCH_ITEMS = ['paint_can', 'primer_can', 'varnish_can', 'hex_bolt', 'phillips_screw', 'slotted_screw', 'electric_wire', 'metal_wire', 'gear', 'metal_pipe', 'wood_workpiece', 'metal_workpiece', 'lever', 'workpiece']

    const visiblePanelTargets = ALL_PANEL_ITEMS.includes(targetObjectId)
        ? [targetObjectId, ...ALL_PANEL_ITEMS.filter((t) => t !== targetObjectId)].slice(0, 3)
        : ALL_PANEL_ITEMS.slice(0, 3)

    const visibleWorkbenchTargets = ALL_WORKBENCH_ITEMS.includes(targetObjectId)
        ? [targetObjectId, ...ALL_WORKBENCH_ITEMS.filter((t) => t !== targetObjectId)].slice(0, 4)
        : ALL_WORKBENCH_ITEMS.slice(0, 4)

    const actionCandidates = Array.from(new Set([
        ...(selectedTarget === 'hex_bolt' || selectedTarget === 'phillips_screw' || selectedTarget === 'slotted_screw' ? ['clockwise', 'counter_clockwise'] : []),
        ...(['electric_wire', 'metal_wire'].includes(selectedTarget || '') ? ['cut', 'strip', 'pull', 'bend'] : []),
        ...(selectedTarget === 'switch_power' ? ['turn_on', 'turn_off'] : []),
        ...(SHELF_TARGETS.includes(selectedTarget || '') || BOX_TARGETS.includes(selectedTarget || '') ? ['insert', 'pull'] : []),
        'push',
        'pull',
        // Always provide enough plausible distractors for a complete
        // four-choice set, even when the selected target has sparse metadata.
        'clockwise',
        'counter_clockwise',
        'cut',
        'measure'
    ])).filter(Boolean)
    const actionChoiceIds = shuffleBySeed(
        [correctActionId, ...actionCandidates.filter((actionId) => actionId !== correctActionId)].filter(Boolean).slice(0, 4),
        `${currentQ.id}-${choiceSessionSeed}-${selectedTarget || 'no-target'}-action-order`,
    )

    return (
        <div className={`${isExamMode ? 'max-w-none' : 'max-w-5xl'} relative mx-auto select-none overflow-x-hidden bg-white`}>

            <audio ref={audioRef} onPlay={() => setAudioState('playing')} onEnded={handleAudioEnded} onError={() => setAudioState('error')} className="hidden" />

            {/* Header Controls Dashboard */}
            <div className="relative z-40 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
                <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Quay lại" className="shrink-0 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="whitespace-nowrap border-l-2 border-orange-500 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-orange-700">
                            Thực hành Vòng 2
                        </span>
                        <div className="hidden h-4 w-px bg-slate-200 sm:block" />
                        <span className="hidden text-xs font-medium text-slate-500 sm:inline">Mô phỏng sử dụng công cụ</span>
                    </div>
                    <div className="ml-auto shrink-0 rounded-full bg-blue-50 px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-blue-700 ring-1 ring-blue-100">
                        {currentIndex + 1}/{questions.length}
                    </div>
                </div>

                <div data-tour="audio-controls" className="order-3 flex shrink-0 items-center gap-1.5 sm:order-none">
                    <label className="relative grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-extrabold text-slate-700 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-orange-500">
                        <span aria-hidden="true">{speed === 1 ? '1x' : `${speed}x`}</span>
                        <span className="sr-only">Tốc độ đọc</span>
                        <select
                            value={speed}
                            onChange={(event) => setSpeed(Number(event.target.value))}
                            aria-label="Chọn tốc độ đọc"
                            className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
                        >
                            <option value="0.8">0.8x</option>
                            <option value="1">1x</option>
                            <option value="1.2">1.2x</option>
                        </select>
                    </label>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={replayAudio}
                        aria-pressed={audioState === 'playing'}
                        aria-label={audioState === 'playing' ? 'Câu hỏi đang được phát' : 'Nghe lại câu hỏi'}
                        className={`min-w-[84px] px-2.5 py-1 text-xs font-semibold transition-colors ${audioState === 'playing' ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                        {audioState === 'playing' ? (
                            <Volume2 className="mr-1 size-3.5 animate-pulse text-orange-600" />
                        ) : (
                            <Play className="mr-1 size-3.5 fill-orange-500 text-orange-500" />
                        )}
                        <span aria-live="polite">{audioState === 'playing' ? 'Đang phát' : 'Nghe lại'}</span>
                    </Button>
                    <button
                        type="button"
                        onClick={() => setIsTourOpen(true)}
                        aria-label="Xem lại hướng dẫn sử dụng"
                        title="Xem hướng dẫn"
                        className="grid size-9 shrink-0 place-items-center rounded-full text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <HelpCircle className="size-[18px]" strokeWidth={2.2} />
                    </button>
                    <div className="flex items-center rounded-xl bg-slate-100 p-1 ring-1 ring-inset ring-slate-200" role="group" aria-label="Ẩn hoặc hiện nội dung câu hỏi">
                        <button
                            type="button"
                            aria-pressed={showKoreanText}
                            onClick={() => setShowKoreanText((visible) => !visible)}
                            title={showKoreanText ? 'Ẩn tiếng Hàn' : 'Hiện tiếng Hàn'}
                            className={`inline-flex min-h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-bold transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showKoreanText ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'}`}
                        >
                            {showKoreanText ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                            Hàn
                        </button>
                        <button
                            type="button"
                            aria-pressed={showVietnameseText}
                            onClick={() => setShowVietnameseText((visible) => !visible)}
                            title={showVietnameseText ? 'Ẩn tiếng Việt' : 'Hiện tiếng Việt'}
                            className={`inline-flex min-h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-bold transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showVietnameseText ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'}`}
                        >
                            {showVietnameseText ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                            Việt
                        </button>
                    </div>
                </div>

            </div>

            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5 sm:py-3" aria-live="polite">
                <div className="mx-auto max-w-4xl">
                    <div className="space-y-1.5">
                    {showKoreanText ? <p lang="ko" className="text-sm font-bold leading-relaxed text-slate-900 sm:text-base">{currentQ.question_text}</p> : null}
                    {showVietnameseText && displayedVietnameseMeaning ? (
                        <p lang="vi" className="text-xs leading-relaxed text-slate-600 sm:text-sm">{displayedVietnameseMeaning}</p>
                    ) : null}
                    {!showKoreanText && !showVietnameseText ? <p className="py-1 text-center text-[11px] italic text-slate-400">Đã ẩn nội dung để luyện nghe.</p> : null}
                    </div>
                </div>
            </div>

            {/* Workbench Simulator */}
            <div className={`relative flex flex-col items-center gap-1.5 overflow-visible bg-white pb-1 ${isShake ? 'animate-shake' : ''}`}>
                
                {audioState === 'playing' ? <div className="z-10 flex w-full flex-col items-center px-3 py-1.5">
                        <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
                            <Volume2 className="h-4 w-4 text-blue-600" />
                            <span>Hãy nghe kỹ khẩu lệnh của giám khảo trước khi chọn dụng cụ!</span>
                        </div>
                </div> : null}

                <div className="z-10 w-full max-w-[1120px]">
                    <InterviewToolTableGame
                        key={currentQ.id}
                        tools={currentToolsOnDesk}
                        placedTools={placedTools}
                        targets={currentTargetsOnDesk}
                        placedTarget={selectedTarget}
                        toolNames={TOOL_NAMES}
                        targetNames={EXACT_TARGET_LABELS}
                        stage={step}
                        requiresTarget={config.requires_target !== false}
                        disabled={feedbackState !== 'idle' || isExamSubmitted || isTourOpen}
                        actionPanel={step === 3 && config.requires_action && feedbackState === 'idle' ? (
                            <div aria-live="polite">
                                <div className="mb-1 flex items-center justify-between gap-2 px-0.5 sm:mb-1.5 sm:px-1">
                                    <div className="min-w-0">
                                        <h5 className="text-[9px] font-extrabold uppercase tracking-wide text-slate-700 sm:text-xs">Chọn thao tác</h5>
                                        <p className="hidden truncate text-[10px] text-slate-500 sm:block">Chọn đúng hành động theo yêu cầu của giám khảo</p>
                                    </div>
                                    <span className="shrink-0 text-[8px] font-bold uppercase tracking-wide text-slate-500 sm:px-2 sm:py-1 sm:text-[9px]">Bước 3</span>
                                </div>
                                <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                                    {actionChoiceIds.map((actionId) => (
                                        <Button
                                            key={actionId}
                                            type="button"
                                            onClick={() => executeAction(actionId)}
                                            className="flex min-h-8 min-w-0 flex-col whitespace-normal rounded-md border border-white/70 bg-gradient-to-b from-white/95 to-slate-100/90 px-1 py-1 text-center text-[9px] font-bold leading-tight text-slate-700 shadow-[0_3px_0_rgba(148,163,184,0.48),0_5px_9px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] transition-[transform,box-shadow,color,background-color] hover:-translate-y-0.5 hover:text-blue-700 hover:shadow-[0_4px_0_rgba(96,165,250,0.42),0_7px_12px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(148,163,184,0.5),0_2px_4px_rgba(15,23,42,0.1),inset_0_1px_3px_rgba(148,163,184,0.18)] focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 sm:min-h-10 sm:rounded-lg sm:px-2 sm:py-1.5 sm:text-[11px]"
                                        >
                                            <span className="line-clamp-2">{getActionDisplay(actionId).label}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        renderFallback={(tool, className) => <SmallToolIcon type={tool} className={className} />}
                        renderTarget={(target, className) => <TargetObjectIcon type={target} className={className} />}
                        onPlace={placeToolInOperationZone}
                        onRemove={removeToolFromOperationZone}
                        onPlaceTarget={placeTargetInOperationZone}
                        onRemoveTarget={removeTargetFromOperationZone}
                    />
                </div>

                {/* Main simulation grid */}
                <div className="hidden relative w-full max-w-4xl h-[380px] bg-slate-950 rounded-3xl border-4 border-slate-900 mx-auto overflow-hidden shadow-2xl backdrop-blur-lg">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.08)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                    {/* Left Shelves Column */}
                    <div className="w-20 md:w-36 shrink-0 h-full flex flex-col border-r-4 border-slate-900 bg-slate-900/10 relative transition-all duration-300">
                        <div className="absolute inset-y-0 left-2 w-1 bg-slate-800/40" />
                        <div className="absolute inset-y-0 right-2 w-1 bg-slate-800/40" />

                        {/* Top Shelf Left */}
                        <button 
                            disabled={step !== 2 || feedbackState === 'success'}
                            onClick={() => selectTarget('shelf_top_left')}
                            className={`flex-1 border-b-4 border-slate-900 flex flex-col items-center justify-center p-2 relative transition-all duration-300 outline-none ${
                                step === 2 ? 'hover:bg-cyan-500/20 hover:border-cyan-400 cursor-pointer active:bg-cyan-500/30' : ''
                            } ${showCorrectAnswer && config.target_object === 'shelf_top_left' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                        >
                            <span className="text-slate-300 font-bold text-center text-[9px] md:text-xs tracking-wider uppercase bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">Kệ trên (Trái)</span>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-500 shadow" />
                        </button>

                        {/* Bottom Shelf Left */}
                        <button 
                            disabled={step !== 2 || feedbackState === 'success'}
                            onClick={() => selectTarget('shelf_bottom_left')}
                            className={`flex-1 flex flex-col items-center justify-center p-2 relative transition-all duration-300 outline-none ${
                                step === 2 ? 'hover:bg-cyan-500/20 hover:border-cyan-400 cursor-pointer active:bg-cyan-500/30' : ''
                            } ${showCorrectAnswer && config.target_object === 'shelf_bottom_left' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                        >
                            <span className="text-slate-300 font-bold text-center text-[9px] md:text-xs tracking-wider uppercase bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">Kệ dưới (Trái)</span>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-500 shadow" />
                        </button>
                    </div>

                    {/* Central Interactive Workfloor */}
                    <div className="flex-1 h-full flex flex-col p-4 gap-4 relative min-w-0">
                        
                        {/* Control Panel with 3 items */}
                        <div className={`h-[115px] border-2 border-slate-800 bg-slate-900/30 rounded-2xl flex flex-col items-center justify-between p-2.5 relative transition-all duration-300 ${
                            showCorrectAnswer && visiblePanelTargets.includes(config.target_object || '') ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-emerald-950/10' : ''
                        }`}>
                            <span className="text-slate-300 font-bold text-[9px] md:text-xs tracking-widest uppercase bg-slate-950/95 px-2 py-0.5 rounded border border-slate-800">Bảng điều khiển máy móc</span>
                            
                            <div className="grid grid-cols-3 gap-3 items-center w-full flex-1 mt-1">
                                {visiblePanelTargets.map((target) => (
                                    <button
                                        key={target}
                                        disabled={step !== 2 || feedbackState === 'success'}
                                        onClick={() => selectTarget(target)}
                                        className={`h-[70px] p-2 rounded-xl border-2 transition-all relative flex flex-col items-center justify-center bg-slate-950 outline-none ${
                                            step === 2
                                                ? 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:scale-[1.02] cursor-pointer'
                                                : 'border-slate-800'
                                        } ${
                                            target === targetObjectId ? 'ring-1 ring-cyan-500/30' : ''
                                        } ${selectedTarget === target ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.4)]' : ''}`}
                                    >
                                        <TargetObjectIcon type={target} activeAction={selectedAction} className="w-8 h-8" />
                                        <span className="text-[7px] md:text-[9px] text-slate-300 font-extrabold uppercase mt-1 text-center leading-tight">{TARGET_SHORT_LABELS[target] || target}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Heavy Workbench with 4 items */}
                        <div className={`flex-1 border-2 border-slate-800 bg-slate-900/20 rounded-2xl flex flex-col items-center justify-between p-3 relative transition-all duration-300 ${
                            showCorrectAnswer && visibleWorkbenchTargets.includes(config.target_object || '') ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-emerald-950/10' : ''
                        }`}>
                            <span className="text-slate-300 font-bold text-[9px] md:text-xs tracking-wider uppercase bg-slate-950/95 px-2 py-0.5 rounded border border-slate-800">Khu vực thi công / Bàn làm việc</span>

                            <div className="grid grid-cols-4 gap-3 items-center w-full flex-1 mt-1">
                                {visibleWorkbenchTargets.map((target) => (
                                    <button
                                        key={target}
                                        disabled={step !== 2 || feedbackState === 'success'}
                                        onClick={() => selectTarget(target)}
                                        className={`min-h-[86px] p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-slate-950 outline-none ${
                                            step === 2
                                                ? 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:scale-[1.02] cursor-pointer'
                                                : 'border-slate-800'
                                        } ${
                                            target === targetObjectId ? 'ring-1 ring-cyan-500/30' : ''
                                        } ${selectedTarget === target ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.4)]' : ''}`}
                                    >
                                        <TargetObjectIcon type={target} className="w-10 h-10 md:w-12 md:h-12" />
                                        <span className="text-[7px] md:text-[9px] text-slate-300 font-bold uppercase mt-1 text-center leading-tight">{TARGET_SHORT_LABELS[target] || target}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Shelves Column */}
                    <div className="w-20 md:w-36 shrink-0 h-full flex flex-col border-l-4 border-slate-900 bg-slate-900/10 relative transition-all duration-300">
                        <div className="absolute inset-y-0 left-2 w-1 bg-slate-800/40" />
                        <div className="absolute inset-y-0 right-2 w-1 bg-slate-800/40" />

                        {/* Top Shelf Right */}
                        <button 
                            disabled={step !== 2 || feedbackState === 'success'}
                            onClick={() => selectTarget('shelf_top_right')}
                            className={`flex-1 border-b-4 border-slate-900 flex flex-col items-center justify-center p-2 relative transition-all duration-300 outline-none ${
                                step === 2 ? 'hover:bg-cyan-500/20 hover:border-cyan-400 cursor-pointer active:bg-cyan-500/30' : ''
                            } ${showCorrectAnswer && config.target_object === 'shelf_top_right' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                        >
                            <span className="text-slate-300 font-bold text-center text-[9px] md:text-xs tracking-wider uppercase bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">Kệ trên (Phải)</span>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-500 shadow" />
                        </button>

                        {/* Bottom Shelf Right */}
                        <button 
                            disabled={step !== 2 || feedbackState === 'success'}
                            onClick={() => selectTarget('shelf_bottom_right')}
                            className={`flex-1 flex flex-col items-center justify-center p-2 relative transition-all duration-300 outline-none ${
                                step === 2 ? 'hover:bg-cyan-500/20 hover:border-cyan-400 cursor-pointer active:bg-cyan-500/30' : ''
                            } ${showCorrectAnswer && config.target_object === 'shelf_bottom_right' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                        >
                            <span className="text-slate-300 font-bold text-center text-[9px] md:text-xs tracking-wider uppercase bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">Kệ dưới (Phải)</span>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-500 shadow" />
                        </button>
                    </div>

                    {/* Step 3 action modal popup overlay */}
                    {step === 3 && config.requires_action && feedbackState === 'idle' && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
                                <div>
                                    <h5 className="text-slate-200 font-extrabold text-sm tracking-wider uppercase">Chọn hành động thao tác</h5>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {actionChoiceIds.map((actionId) => (
                                        <Button
                                            key={actionId}
                                            type="button"
                                            onClick={() => executeAction(actionId)}
                                            className="py-5 bg-slate-950 border border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800 text-xs font-black tracking-wide"
                                        >
                                            {getActionDisplay(actionId).label}
                                        </Button>
                                    ))}
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-slate-200">
                                    Hủy / Quay lại Bước 2
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Handheld Selected Tool Indicator */}
                {heldTool && feedbackState === 'idle' && (
                    <div className="hidden absolute top-20 right-6 items-center gap-2.5 bg-cyan-950/80 border border-cyan-800/40 px-3.5 py-2 rounded-xl shadow-lg animate-in slide-in-from-right duration-300">
                        <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase">Đang cầm:</span>
                        <div className="p-1.5 bg-slate-950 rounded-lg border border-cyan-800/30">
                            <SmallToolIcon type={heldTool} className="w-7 h-7" />
                        </div>
                    </div>
                )}

                {/* Boxes Row */}
                <div className="hidden w-full max-w-4xl grid-cols-2 gap-4 mt-2 transition-all duration-300">
                    <button 
                        disabled={step !== 2 || feedbackState === 'success'}
                        onClick={() => selectTarget('toolbox_center')}
                        className={`py-3.5 rounded-2xl border-2 bg-slate-900/20 flex items-center justify-center outline-none transition-all ${
                            step === 2 ? 'border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/10 cursor-pointer shadow-sm' : 'border-slate-800'
                        } ${showCorrectAnswer && config.target_object === 'toolbox_center' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                    >
                        <span className="text-[10px] md:text-xs text-slate-300 font-extrabold uppercase">Hộp công cụ chung</span>
                    </button>
                    <button 
                        disabled={step !== 2 || feedbackState === 'success'}
                        onClick={() => selectTarget('special_box')}
                        className={`py-3.5 rounded-2xl border-2 bg-slate-900/20 flex items-center justify-center outline-none transition-all ${
                            step === 2 ? 'border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/10 cursor-pointer shadow-sm' : 'border-slate-800'
                        } ${showCorrectAnswer && config.target_object === 'special_box' ? 'bg-emerald-500/25 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
                    >
                        <span className="text-[10px] md:text-xs text-slate-300 font-extrabold uppercase">Hộp chuyên dụng</span>
                    </button>
                </div>

                {/* BÀN LÀM VIỆC Tool picker rack */}
                <div className="hidden w-full max-w-4xl bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl mt-4 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950 px-4 py-0.5 rounded-full border border-slate-800 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        Bàn làm việc (Chọn dụng cụ)
                    </div>

                    <div className="grid grid-cols-5 gap-3 mt-1.5">
                        {currentToolsOnDesk.map((toolId: string) => {
                            const isSelected = heldTool === toolId
                            const isCorrect = config.correct_tool === toolId
                            const toolInfo = TOOL_NAMES[toolId] || { vi: toolId, ko: '' }
                            return (
                                <button
                                    key={toolId}
                                    disabled={feedbackState === 'success'}
                                    onClick={() => selectTool(toolId)}
                                    className={`p-3 md:p-4 bg-slate-950 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all outline-none cursor-pointer hover:border-orange-500/60 hover:bg-slate-900 ${
                                        isSelected 
                                            ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.35)] bg-orange-950/20 scale-[1.03]'
                                            : 'border-slate-800'
                                    } ${
                                        showCorrectAnswer && isCorrect 
                                            ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)] bg-emerald-950/20'
                                            : ''
                                    }`}
                                >
                                    <SmallToolIcon type={toolId} className="w-9 h-9 md:w-11 md:h-11" />
                                    <span className="text-[9px] md:text-[11px] font-extrabold text-slate-200 text-center leading-tight">
                                        {toolInfo.vi}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Diagnostics and overlays */}
                {isExamMode && isExamSubmitted && (
                    <div className="mt-5 w-full max-w-4xl rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-center shadow-lg">
                        <p className="font-bold text-cyan-300">Đã ghi nhận thao tác</p>
                        <p className="mt-1 text-xs text-slate-400">
                            Kết quả đúng hoặc sai và đáp án chuẩn sẽ được hiển thị sau khi nộp toàn bộ bài thi.
                        </p>
                    </div>
                )}

                {!isExamMode && feedbackState !== 'idle' && isFeedbackOpen && (
                    <div
                        ref={feedbackRef}
                        tabIndex={-1}
                        role="status"
                        aria-live="assertive"
                        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[80] mx-auto max-h-[calc(100dvh-6rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-2xl bg-white/95 p-2 shadow-[0_24px_70px_rgba(15,23,42,0.35)] ring-1 ring-slate-200 backdrop-blur-xl outline-none animate-in fade-in slide-in-from-bottom-6 duration-300"
                    >
                        <button
                            type="button"
                            onClick={() => setIsFeedbackOpen(false)}
                            aria-label="Đóng kết quả để xem lại bài"
                            className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full bg-white/90 text-slate-600 shadow-md ring-1 ring-slate-200 transition-colors hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <X className="size-5" />
                        </button>
                        {feedbackState === 'success' ? (
                            <div className="bg-emerald-950/80 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-20">
                                    <Sparkles className="w-16 h-16 text-emerald-400" />
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-emerald-400 font-bold text-lg">정답입니다! (Chính xác)</h4>
                                        <p className="text-slate-200 font-bold text-base">{currentQ.question_text}</p>
                                        <p className="text-slate-400 text-sm italic">{displayedVietnameseMeaning}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-lg shadow-slate-200/70">
                                <div className="absolute inset-y-0 left-0 w-1 bg-rose-500" aria-hidden="true" />
                                <div className="p-4 sm:p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-baseline justify-between gap-1">
                                                <h4 className="text-base font-extrabold text-slate-900">Chưa chính xác</h4>
                                                <span className="text-xs font-semibold text-rose-600">틀렸습니다</span>
                                            </div>
                                            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-800 sm:text-base">{currentQ.question_text}</p>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{displayedVietnameseMeaning}</p>
                                        </div>
                                    </div>
                                        
                                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xs">
                                            <div className="border-b border-slate-200 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Kết quả từng bước</div>
                                            <div className="flex min-h-10 items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
                                                <span className="text-slate-600">1. Chọn dụng cụ</span>
                                                <span className={heldTool === config.correct_tool ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>
                                                    {heldTool === config.correct_tool ? "✓ Chính xác" : "✗ Sai"}
                                                </span>
                                            </div>
                                            {config.requires_target !== false ? <div className="flex min-h-10 items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
                                                <span className="text-slate-600">2. Chọn chi tiết</span>
                                                <span className={selectedTarget === config.target_object ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>
                                                    {selectedTarget === config.target_object ? "✓ Chính xác" : "✗ Sai"}
                                                </span>
                                            </div> : <div className="flex min-h-10 items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
                                                <span className="text-slate-600">Chi tiết</span>
                                                <span className="font-bold text-slate-500">Không yêu cầu</span>
                                            </div>}
                                            <div className="flex min-h-10 items-center justify-between gap-3 px-3 py-2">
                                                <span className="text-slate-600">{config.requires_target === false ? '2' : '3'}. Chọn thao tác</span>
                                                <span className={!config.requires_action || selectedAction === config.correct_action ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>
                                                    {!config.requires_action ? "Không cần" : selectedAction === config.correct_action ? "✓ Chính xác" : "✗ Sai"}
                                                </span>
                                            </div>

                                            {showCorrectAnswer && (
                                                <div className="space-y-1 border-t border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-slate-700 animate-in fade-in duration-300">
                                                    <div className="mb-1.5 font-extrabold uppercase tracking-wider text-emerald-700">Đáp án đúng</div>
                                                    <div>Bước 1: Chọn <span className="font-bold text-emerald-700">{TOOL_NAMES[correctToolId]?.vi}</span></div>
                                                    {config.requires_target !== false ? <div>Bước 2: Chọn <span className="font-bold text-emerald-700">{EXACT_TARGET_LABELS[targetObjectId] || targetObjectId}</span></div> : null}
                                                    {config.requires_action && (
                                                        <div>Bước 3: Thực hiện <span className="font-bold text-emerald-700">{getActionDisplay(correctActionId).label}</span></div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                </div>
                            </div>
                        )}

                        <div className="sticky bottom-0 mt-2 flex flex-wrap items-center justify-end gap-2 rounded-xl bg-white/95 p-1.5 backdrop-blur-md">
                            {feedbackState === 'fail' && (
                                <>
                                    <Button 
                                        type="button"
                                        size="lg" 
                                        onClick={(e) => { e.stopPropagation(); resetSteps(); }} 
                                        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto sm:px-8"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-1.5" /> Thử lại
                                    </Button>
                                    <Button 
                                        type="button"
                                        size="lg" 
                                        onClick={(e) => { e.stopPropagation(); setShowCorrectAnswer(true); }} 
                                        className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 sm:w-auto sm:px-8"
                                    >
                                        <Eye className="w-4 h-4 mr-1.5" /> Xem đáp án đúng
                                    </Button>
                                </>
                            )}
                            {(feedbackState === 'success' || showCorrectAnswer) && (
                                <Button 
                                    size="lg" 
                                    onClick={handleNext} 
                                    className="min-h-10 w-auto max-w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-sm shadow-orange-500/20 transition-[transform,box-shadow] hover:from-orange-600 hover:to-amber-600 hover:shadow-md active:scale-[0.98] sm:px-5"
                                >
                                    <span>{currentIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành bài tập'}</span>
                                    <ChevronRight className="ml-1.5 size-4" aria-hidden="true" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}
                {!isExamMode && feedbackState !== 'idle' && !isFeedbackOpen ? (
                    <button
                        type="button"
                        onClick={() => {
                            setShowCorrectAnswer(true)
                            setIsFeedbackOpen(true)
                            revealFeedback()
                        }}
                        className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-[75] inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-[transform,background-color] hover:bg-blue-700 active:scale-[0.98] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:hover:-translate-x-1/2 sm:active:-translate-x-1/2"
                    >
                        <Eye className="size-4" />
                        Xem lại đáp án
                    </button>
                ) : null}
            </div>
            {isTourOpen ? <ToolGameOnboarding open steps={tourSteps} onClose={closeTour} /> : null}
        </div>
    )
}
