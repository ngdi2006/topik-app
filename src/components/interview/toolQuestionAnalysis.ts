export type VocabularyItem = {
    term: string
    meaning: string
    role: 'tool' | 'target' | 'action' | 'location' | 'keyword'
}

export type ToolAnswerStep = {
    step: number
    kind: 'tool' | 'target' | 'action'
    expected: string
}

export type ToolQuestionConfig = {
    schema_version?: number
    tools_on_desk: string[]
    correct_tool: string
    target_object: string
    correct_action: string | null
    requires_action: boolean
    vocabulary_analysis: VocabularyItem[]
    answer_steps?: ToolAnswerStep[]
    scoring?: {
        tool: number
        target: number
        action: number
        pass_all_required: boolean
    }
    vietnamese_instruction?: string
    game_config?: WorkshopGameConfig | null
}

type Definition = {
    id: string
    label: string
    ko: string
    patterns: RegExp[]
}

export const TOOL_DEFINITIONS: Definition[] = [
    { id: 'phillips_screwdriver', label: 'Tua vít chữ thập', ko: '십자드라이버', patterns: [/십자\s*드라이버/, /tua vít chữ thập/i] },
    { id: 'flat_screwdriver', label: 'Tua vít dẹt', ko: '일자드라이버', patterns: [/일자\s*드라이버/, /tua vít dẹt|tua vít rãnh thẳng/i] },
    { id: 'screwdriver', label: 'Tua vít', ko: '드라이버', patterns: [/드라이버/, /나사를 조이는 도구/, /tua vít|vặn ốc vít/i] },
    { id: 'allen_wrench', label: 'Cờ lê lục giác', ko: '육각 렌치', patterns: [/육각\s*렌치|육각/, /lục giác|allen/i] },
    { id: 'socket_wrench', label: 'Cờ lê khẩu', ko: '소켓 렌치', patterns: [/소켓\s*렌치|소켓을 끼워/, /cờ lê ổ cắm|đầu khẩu/i] },
    { id: 'adjustable_wrench', label: 'Mỏ lết', ko: '멍키 스패너', patterns: [/멍키\s*스패너|크기를 조절해/, /mỏ lết|điều chỉnh kích cỡ/i] },
    { id: 'wrench', label: 'Cờ lê', ko: '스패너 / 렌치', patterns: [/스패너|렌치|너트를 조이는 도구|볼트를 조이는 도구|너트를 푸는 도구|볼트를 푸는 도구/, /cờ lê|bu lông|đai ốc/i] },
    { id: 'long_nose_pliers', label: 'Kìm mũi dài', ko: '롱노즈 플라이어', patterns: [/롱노즈\s*플라이어/, /kìm mũi dài/i] },
    { id: 'nipper', label: 'Kìm cắt', ko: '니퍼', patterns: [/니퍼|절단하는 도구/, /kìm cắt/i] },
    { id: 'pliers', label: 'Kìm', ko: '펜치 / 플라이어', patterns: [/펜치|플라이어|끼우는 도구|당기는 도구|구부리는 도구|펴는 도구|끊는 도구|자르는 도구/, /kìm|công cụ cắt dây|công cụ bẻ cong/i] },
    { id: 'hammer', label: 'Búa', ko: '망치 / 장도리', patterns: [/망치|장도리|못을 박|못을 빼|못을 뽑/, /búa|đóng đinh|nhổ đinh/i] },
    { id: 'saw', label: 'Cưa tay', ko: '쇠톱 / 톱', patterns: [/쇠톱|톱날|날물|톱을/, /cưa|lưỡi cưa/i] },
    { id: 'welder', label: 'Máy hàn', ko: '용접기', patterns: [/용접기|용접하는 기계|CO2용접기|용접/, /máy hàn|que hàn|mối hàn|gá hàn|hàn kim loại|hàn nối/i] },
    { id: 'torch', label: 'Đèn hàn', ko: '토치', patterns: [/토치/, /đèn hàn/i] },
    { id: 'paint_roller', label: 'Con lăn sơn', ko: '롤러', patterns: [/롤러/, /con lăn(?: sơn)?/i] },
    { id: 'paint_brush', label: 'Cọ sơn', ko: '붓', patterns: [/붓/, /cọ(?: sơn)?|chổi sơn/i] },
    { id: 'spray_gun', label: 'Súng phun sơn', ko: '스프레이 건 / 도장 건', patterns: [/스프레이\s*건|도장\s*건|분사기/, /súng phun sơn|máy phun sơn/i] },
    { id: 'electronic_scale', label: 'Cân điện tử', ko: '전자 저울', patterns: [/전자\s*저울/, /cân điện tử/i] },
    { id: 'pan_scale', label: 'Cân đĩa', ko: '접시 저울', patterns: [/접시\s*저울/, /cân đĩa/i] },
    { id: 'industrial_scale', label: 'Máy cân trọng lượng', ko: '중량 측정기', patterns: [/중량을?\s*측정.*기계|중량\s*측정기/, /máy cân trọng lượng|máy đo trọng lượng/i] },
    { id: 'scale', label: 'Cân', ko: '저울', patterns: [/무게를\s*재는\s*도구|저울/, /dụng cụ cân|cân trọng lượng/i] },
    { id: 'ruler', label: 'Thước đo', ko: '자 / 줄자', patterns: [/줄자|자를 이용|길이를 재/, /thước|đo chiều dài/i] },
    { id: 'torque_wrench', label: 'Cờ lê lực', ko: '토크 렌치', patterns: [/토크/, /mô-men|lực xoay/i] },
    { id: 'pipe_wrench', label: 'Kìm/cờ lê ống', ko: '파이프 렌치', patterns: [/파이프\s*렌치|관을 설치|관을 해체/, /đường ống|ống nước|ống ga/i] },
    { id: 'bearing_puller', label: 'Cảo tháo (Cảo bạc đạn / Vam tháo)', ko: '풀러', patterns: [/풀러|베어링|기어를 빼|스프링/, /cảo|vam|tháo ổ bi|tháo bánh răng|tháo lò xo/i] },
    { id: 'level', label: 'Thước thủy', ko: '수평계', patterns: [/수평계|기울기를 측정/, /độ nghiêng|thước thủy/i] },
    { id: 'drill', label: 'Máy khoan', ko: '드릴 / 드릴링머신', patterns: [/드릴링머신|전기\s*드릴|구멍을 뚫는 기계/, /máy khoan|khoan/i] },
    { id: 'cutting_machine', label: 'Máy cắt', ko: '절단기 / 커터기', patterns: [/절단기|전동커터기|절단하는 기계|자르는 기계/, /máy cắt/i] },
    { id: 'grinder', label: 'Máy mài', ko: '그라인더', patterns: [/그라인더|다듬는 기계|가는 기계/, /máy mài/i] },
    { id: 'press_machine', label: 'Máy dập / máy ép', ko: '프레스 기계', patterns: [/프레스|압축하는 기계|찍어 내는 기계/, /máy dập|máy ép/i] },
    { id: 'lathe_machine', label: 'Máy gọt gỗ / Máy tiện gỗ', ko: '원목 깎는 기계 / 선반 기계', patterns: [/선반 기계|원목.*깎|목재.*깎|도려내는 기계/, /máy tiện|máy gọt gỗ|gọt gỗ|bào gỗ/i] },
    { id: 'milling_machine', label: 'Máy phay', ko: '멀링 머신', patterns: [/멀링\s*머신/, /máy phay/i] },
    { id: 'hoist', label: 'Tời', ko: '호이스트', patterns: [/호이스트/, /tời/i] },
    { id: 'control_panel', label: 'Bảng điều khiển', ko: '컨트롤 판넬', patterns: [/컨트롤\s*판넬|제어반|조작반/, /bảng điều khiển/i] },
    { id: 'circuit_tester', label: 'Máy kiểm tra mạch', ko: '회로시험기', patterns: [/회로시험기/, /kiểm tra mạch/i] },
    { id: 'switch_tool', label: 'Công tắc / Tay gạt công tắc', ko: '스위치 / 레버', patterns: [/스위치|버튼|레버/, /công tắc|cầu dao|gạt công tắc/i] },
    { id: 'rust_preventive_oil', label: 'Dầu chống rỉ', ko: '방청유 / 녹 방지 오일', patterns: [/방청유|녹을?\s*방지.*오일|녹\s*방지\s*오일/, /dầu\s*(?:dùng để\s*)?(?:chống|ngăn)\s*rỉ|dầu chống gỉ/i] },
    { id: 'generic_tool', label: 'Công cụ phù hợp', ko: '도구', patterns: [/도구를 이용|기계를 이용|장비를 이용|장치를 이용/, /công cụ|thiết bị|máy/i] }
]

export const TARGET_DEFINITIONS: Definition[] = [
    { id: 'phillips_screw', label: 'Ốc vít rãnh chữ thập', ko: '십자 홈이 있는 나사', patterns: [/십자\s*홈.*나사|십자.*나사/, /rãnh chữ thập/i] },
    { id: 'slotted_screw', label: 'Ốc vít rãnh thẳng', ko: '일자 홈이 있는 나사', patterns: [/일자\s*홈.*나사|일자.*나사/, /rãnh thẳng|rãnh dẹt/i] },
    { id: 'hex_bolt', label: 'Bu lông / đai ốc', ko: '볼트 / 너트', patterns: [/볼트|너트|암나사|수나사/, /bu lông|đai ốc|ren ngoài/i] },
    { id: 'electric_wire', label: 'Dây điện / dây kim loại', ko: '전선 / 철사 / 선재', patterns: [/전선|철사|철선|선재|구리선/, /dây điện|dây kim loại|dây sắt|dây đồng|thép ly/i] },
    { id: 'metal_pipe', label: 'Ống kim loại', ko: '파이프 / 관', patterns: [/파이프|철관|가스관|수도관/, /ống|đường ống/i] },
    { id: 'coil_spring', label: 'Lò xo / Coil spring', ko: '코일 스프링 / 스프링', patterns: [/코일\s*스프링|스프링/, /lò xo|cuộn lò xo/i] },
    { id: 'bearing', label: 'Ổ bi / Bạc đạn', ko: '베어링', patterns: [/베어링/, /ổ bi|bạc đạn/i] },
    { id: 'gear', label: 'Bánh răng / linh kiện', ko: '기어 / 부품', patterns: [/기어|부품/, /bánh răng|linh kiện/i] },
    { id: 'wood_workpiece', label: 'Gỗ / ván / nguyên mộc', ko: '목재 / 원목 / 나무', patterns: [/목재|원목|나무/, /gỗ|ván/i] },
    { id: 'metal_workpiece', label: 'Kim loại / tấm thép', ko: '금속 / 철판', patterns: [/금속|철판/, /kim loại|tấm thép/i] },
    { id: 'plastic_workpiece', label: 'Nhựa', ko: '플라스틱', patterns: [/플라스틱/, /nhựa/i] },
    { id: 'switch_power', label: 'Nguồn điện / công tắc', ko: '전원 / 스위치', patterns: [/전원|스위치|전기를 차단/, /nguồn điện|công tắc|ngắt điện/i] },
    { id: 'emergency_button', label: 'Nút bấm', ko: '버튼', patterns: [/버튼/, /nút/i] },
    { id: 'lever', label: 'Cần gạt / tay cầm', ko: '레버 / 핸들', patterns: [/레버|핸들/, /cần gạt|tay cầm/i] },
    { id: 'paint_can', label: 'Hộp sơn', ko: '페인트 통', patterns: [/페인트/, /hộp sơn|thùng sơn|sơn màu/i] },
    { id: 'primer_can', label: 'Hộp sơn lót', ko: '젯소 / 초벌재', patterns: [/젯소|초벌재/, /sơn lót|hộp sơn lót/i] },
    { id: 'varnish_can', label: 'Hộp véc-ni', ko: '바니시 / 마감재', patterns: [/바니시|마감재/, /véc-?ni|vecni|lớp hoàn thiện/i] },
    { id: 'shelf', label: 'Kệ', ko: '선반', patterns: [/선반/, /kệ/i] },
    { id: 'box', label: 'Hộp công cụ', ko: '공구함 / 함 / 전용함', patterns: [/공구함|전용함|함에 넣/, /hộp|hộp chuyên dụng/i] },
    { id: 'workpiece', label: 'Vật thể gia công', ko: '공작물', patterns: [/공작물|제품|물건|짐|원재료|첨가제|오일|방청유/, /vật|hàng|nguyên liệu|dầu/i] }
]

export const ACTION_DEFINITIONS: Definition[] = [
    { id: 'clockwise', label: 'Siết / vặn vào', ko: '조이다 / 체결하다', patterns: [/조이|체결|조이는/, /siết|vặn vào/i] },
    { id: 'counter_clockwise', label: 'Tháo / vặn ra', ko: '풀다', patterns: [/푸는|풀다/, /tháo|vặn ra/i] },
    { id: 'cut', label: 'Cắt', ko: '자르다 / 절단하다 / 끊다', patterns: [/자르|절단|끊/, /cắt/i] },
    { id: 'strip', label: 'Tuốt vỏ dây', ko: '피복을 벗기다', patterns: [/피복.*벗기/, /tước|tuốt/i] },
    { id: 'bend', label: 'Uốn / bẻ cong', ko: '구부리다', patterns: [/구부리/, /uốn|bẻ cong/i] },
    { id: 'straighten', label: 'Duỗi / làm thẳng', ko: '펴다', patterns: [/펴는|펴다/, /duỗi|làm thẳng/i] },
    { id: 'insert', label: 'Lắp / gắn / đặt vào', ko: '끼우다 / 장착하다 / 넣다', patterns: [/끼우|장착|넣/, /lắp|gắn|bỏ|đặt vào|cất vào/i] },
    { id: 'pull', label: 'Kéo / lấy ra / nhổ ra', ko: '당기다 / 빼다 / 뽑다', patterns: [/당기|빼|뽑|꺼내/, /kéo|lấy ra|nhổ/i] },
    { id: 'push', label: 'Đẩy / ấn', ko: '밀다 / 누르다', patterns: [/미는|밀다|누르/, /đẩy|ấn|bấm/i] },
    { id: 'turn_on', label: 'Bật / gạt lên', ko: '켜다 / 올리다', patterns: [/켜|올리/, /bật|mở nguồn|gạt lên/i] },
    { id: 'turn_off', label: 'Tắt / gạt xuống / ngắt', ko: '끄다 / 내리다 / 차단하다', patterns: [/끄|내리|차단/, /tắt|gạt xuống|ngắt/i] },
    { id: 'rotate', label: 'Xoay', ko: '돌리다', patterns: [/돌리/, /xoay/i] },
    { id: 'measure', label: 'Đo / cân', ko: '측정하다 / 재다', patterns: [/측정|재는|검사/, /đo|cân|kiểm tra/i] },
    { id: 'weld', label: 'Hàn', ko: '용접하다', patterns: [/용접/, /(?:^|[\s,.;:])hàn(?:[\s,.;:]|$)/i] },
    { id: 'drill', label: 'Khoan / đục lỗ', ko: '구멍을 뚫다', patterns: [/구멍|뚫/, /khoan|đục lỗ/i] },
    { id: 'grind', label: 'Mài / làm nhẵn', ko: '다듬다 / 샌딩하다', patterns: [/다듬|샌딩|사포질/, /mài|làm nhẵn|đánh giấy nhám/i] },
    { id: 'shave', label: 'Gọt / đẽo / bào', ko: '깎다 / 파내다', patterns: [/깎|파내|도려내/, /gọt|đẽo|khoét|tiện|bào/i] },
    { id: 'paint', label: 'Sơn / quét / bôi', ko: '칠하다 / 바르다 / 뿌리다', patterns: [/칠하|바르|뿌리|도장/, /sơn|quét|bôi|phun/i] },
    { id: 'dry', label: 'Sấy khô', ko: '말리다 / 건조시키다', patterns: [/말리|건조/, /sấy|khô/i] },
    { id: 'mix', label: 'Trộn / khuấy', ko: '혼합하다 / 섞다', patterns: [/혼합|섞/, /trộn|khuấy/i] },
    { id: 'lift', label: 'Nâng lên', ko: '들어 올리다 / 올라가다', patterns: [/들어 올리|올라가/, /nâng|leo lên/i] },
    { id: 'lower', label: 'Hạ xuống / giảm', ko: '내리다 / 낮추다', patterns: [/낮추|내리는/, /hạ|giảm/i] },
    { id: 'raise', label: 'Tăng / nâng', ko: '높이다', patterns: [/높이/, /tăng/i] },
    { id: 'transport', label: 'Vận chuyển', ko: '나르다 / 옮기다 / 운반하다', patterns: [/나르|옮기|운반/, /vận chuyển|chuyển/i] },
    { id: 'adjust', label: 'Điều chỉnh', ko: '조절하다 / 제어하다', patterns: [/조절|제어/, /điều chỉnh|điều khiển/i] },
    { id: 'fix', label: 'Cố định / kẹp chặt', ko: '고정하다', patterns: [/고정/, /cố định/i] },
    { id: 'compress', label: 'Ép / nén', ko: '압축하다', patterns: [/압축/, /(?:^|[\s,.;:])(?:ép|nén)(?:[\s,.;:]|$)/i] },
    { id: 'stamp', label: 'Dập / đột', ko: '찍어 내다', patterns: [/찍어 내/, /(?:^|[\s,.;:])dập(?:[\s,.;:]|$)|đột/i] }
]

const DEFAULT_DESK_TOOLS = ['phillips_screwdriver', 'flat_screwdriver', 'wrench', 'pliers', 'hammer']

function firstMatch(definitions: Definition[], text: string) {
    return definitions.find((definition) => definition.patterns.some((pattern) => pattern.test(text)))
}

function matchedTerm(definition: Definition | undefined, text: string) {
    if (!definition) return ''
    const match = definition.patterns.map((pattern) => text.match(pattern)?.[0]).find(Boolean)
    return match || definition.ko
}

function refineTool(tool: Definition | undefined, target: Definition | undefined, text: string) {
    if (target?.id === 'phillips_screw') return TOOL_DEFINITIONS.find((item) => item.id === 'phillips_screwdriver')
    if (target?.id === 'slotted_screw') return TOOL_DEFINITIONS.find((item) => item.id === 'flat_screwdriver')
    if (tool && tool.id !== 'generic_tool') return tool
    if (/나사|드라이버|ốc vít|tua vít/i.test(text)) return TOOL_DEFINITIONS.find((item) => item.id === 'screwdriver')
    if (/너트|볼트|암나사|수나사|bu lông|đai ốc/i.test(text)) return TOOL_DEFINITIONS.find((item) => item.id === 'wrench')
    if (/전선|철사|선재|구리선|dây/i.test(text)) return TOOL_DEFINITIONS.find((item) => item.id === 'pliers')
    if (/못|đinh/i.test(text)) return TOOL_DEFINITIONS.find((item) => item.id === 'hammer')
    return tool || TOOL_DEFINITIONS.find((item) => item.id === 'generic_tool')
}

function refineTarget(target: Definition | undefined, text: string) {
    if (target) return target
    if (/나사|ốc vít/i.test(text)) return TARGET_DEFINITIONS.find((item) => item.id === 'phillips_screw')
    return TARGET_DEFINITIONS.find((item) => item.id === 'workpiece')
}

function resolveDeskTools(correctTool: string) {
    const distractorsByFamily: Record<string, string[]> = {
        phillips_screwdriver: ['flat_screwdriver', 'screwdriver', 'wrench', 'pliers'],
        flat_screwdriver: ['phillips_screwdriver', 'screwdriver', 'wrench', 'pliers'],
        screwdriver: ['phillips_screwdriver', 'flat_screwdriver', 'wrench', 'pliers'],
        wrench: ['adjustable_wrench', 'socket_wrench', 'pliers', 'screwdriver'],
        adjustable_wrench: ['wrench', 'socket_wrench', 'pliers', 'screwdriver'],
        socket_wrench: ['wrench', 'adjustable_wrench', 'pliers', 'screwdriver'],
        pliers: ['nipper', 'long_nose_pliers', 'wrench', 'screwdriver'],
        nipper: ['pliers', 'long_nose_pliers', 'wrench', 'screwdriver'],
        hammer: ['pliers', 'saw', 'screwdriver', 'wrench'],
        saw: ['hammer', 'pliers', 'ruler', 'welder'],
        welder: ['torch', 'saw', 'pliers', 'wrench'],
        drill: ['cutting_machine', 'grinder', 'ruler', 'saw'],
        cutting_machine: ['grinder', 'drill', 'press_machine', 'milling_machine'],
        grinder: ['cutting_machine', 'drill', 'lathe_machine', 'milling_machine'],
        press_machine: ['cutting_machine', 'grinder', 'drill', 'milling_machine'],
        lathe_machine: ['milling_machine', 'grinder', 'cutting_machine', 'drill'],
        milling_machine: ['lathe_machine', 'grinder', 'cutting_machine', 'drill'],
        hoist: ['control_panel', 'circuit_tester', 'drill', 'cutting_machine'],
        control_panel: ['circuit_tester', 'hoist', 'drill', 'cutting_machine'],
        rust_preventive_oil: ['ruler', 'pliers', 'wrench', 'screwdriver'],
        paint_roller: ['paint_brush', 'spray_gun', 'ruler', 'pliers'],
        paint_brush: ['paint_roller', 'spray_gun', 'ruler', 'pliers'],
        spray_gun: ['paint_roller', 'paint_brush', 'ruler', 'pliers'],
        scale: ['electronic_scale', 'pan_scale', 'industrial_scale', 'ruler'],
        electronic_scale: ['pan_scale', 'industrial_scale', 'scale', 'ruler'],
        pan_scale: ['electronic_scale', 'industrial_scale', 'scale', 'ruler'],
        industrial_scale: ['electronic_scale', 'pan_scale', 'scale', 'ruler']
    }

    return Array.from(new Set([correctTool, ...(distractorsByFamily[correctTool] || DEFAULT_DESK_TOOLS)])).slice(0, 5)
}

export function buildAnswerSteps(config: Pick<ToolQuestionConfig, 'correct_tool' | 'target_object' | 'correct_action' | 'requires_action'>) {
    const steps: ToolAnswerStep[] = [
        { step: 1, kind: 'tool', expected: config.correct_tool },
        { step: 2, kind: 'target', expected: config.target_object }
    ]
    if (config.requires_action) steps.push({ step: 3, kind: 'action', expected: config.correct_action || '' })
    return steps
}

export function completeToolConfig(config: ToolQuestionConfig): ToolQuestionConfig {
    return {
        ...config,
        answer_steps: buildAnswerSteps(config),
        scoring: {
            tool: 1,
            target: 1,
            action: config.requires_action ? 1 : 0,
            pass_all_required: true
        }
    }
}

export function analyzeToolQuestionText(questionText: string, vietnameseMeaning = ''): ToolQuestionConfig {
    const text = `${questionText} ${vietnameseMeaning}`
    const isStorageCommand = /공구함|전용함|함에\s*넣|선반에\s*넣|선반에\s*놓|함에\s*보관|공구함에\s*보관|bỏ.*hộp|cất.*hộp|bỏ.*kệ|cất.*kệ|đặt.*kệ|cho.*vào.*hộp|cho.*vào.*kệ/i.test(text)
    const rawTarget = isStorageCommand
        ? TARGET_DEFINITIONS.find((item) => item.id === (/선반|kệ/i.test(text) ? 'shelf' : 'box'))
        : firstMatch(TARGET_DEFINITIONS, text)
    const target = refineTarget(rawTarget, text) || TARGET_DEFINITIONS[TARGET_DEFINITIONS.length - 1]
    const action = isStorageCommand
        ? ACTION_DEFINITIONS.find((item) => item.id === 'insert') || ACTION_DEFINITIONS[0]
        : firstMatch(ACTION_DEFINITIONS, text) || ACTION_DEFINITIONS[ACTION_DEFINITIONS.length - 1]
    const rawTool = firstMatch(TOOL_DEFINITIONS, text)
    const tool = refineTool(rawTool, target, text) || TOOL_DEFINITIONS[TOOL_DEFINITIONS.length - 1]
    const toolTerm = rawTool && rawTool.id !== 'generic_tool' ? matchedTerm(tool, text) : tool.ko
    const isStorage = target.id === 'shelf' || target.id === 'box'
    const targetObject = target.id === 'shelf'
        ? inferShelfTarget(text)
        : target.id === 'box' && /전용함|hộp chuyên dụng/i.test(text)
          ? 'special_box'
          : target.id === 'box'
            ? 'toolbox_center'
            : target.id
    const requiresAction = !isStorage

    return completeToolConfig({
        schema_version: 3,
        tools_on_desk: resolveDeskTools(tool.id),
        correct_tool: tool.id,
        target_object: targetObject,
        correct_action: requiresAction ? action.id : null,
        requires_action: requiresAction,
        vietnamese_instruction: vietnameseMeaning,
        vocabulary_analysis: [
            { term: toolTerm, meaning: tool.label, role: 'tool' },
            { term: matchedTerm(target, text), meaning: target.label, role: isStorage ? 'location' : 'target' },
            { term: matchedTerm(action, text), meaning: action.label, role: 'action' }
        ]
    })
}

export function resolveToolQuestionConfig(
    questionText: string,
    vietnameseMeaning = '',
    storedConfig?: Partial<ToolQuestionConfig> | null
): ToolQuestionConfig {
    const analyzedConfig = analyzeToolQuestionText(questionText, vietnameseMeaning)
    if (!storedConfig) return analyzedConfig

    const text = `${questionText} ${vietnameseMeaning}`
    const isStorage = /공구함|전용함|함에\s*넣|선반에\s*넣|선반에\s*놓|함에\s*보관|공구함에\s*보관|bỏ.*hộp|cất.*hộp|bỏ.*kệ|cất.*kệ/i.test(text)

    // Override target object if stored config assigned a box/shelf to a non-storage operation question
    const isStoredStorage = Boolean(
        storedConfig.target_object === 'box' ||
        storedConfig.target_object === 'shelf' ||
        storedConfig.target_object === 'toolbox_center' ||
        storedConfig.target_object === 'special_box' ||
        storedConfig.target_object?.startsWith('shelf_')
    )

    const correct_tool = analyzedConfig.correct_tool || storedConfig.correct_tool || 'screwdriver'
    const target_object = (!isStorage && isStoredStorage)
        ? analyzedConfig.target_object
        : (analyzedConfig.target_object || storedConfig.target_object)

    const requires_action = !isStorage
    const correct_action = requires_action ? (analyzedConfig.correct_action || storedConfig.correct_action) : null

    return completeToolConfig({
        ...analyzedConfig,
        ...storedConfig,
        correct_tool,
        target_object,
        correct_action,
        schema_version: 3,
        tools_on_desk: storedConfig.tools_on_desk?.length ? storedConfig.tools_on_desk : analyzedConfig.tools_on_desk,
        vocabulary_analysis: storedConfig.vocabulary_analysis?.length ? storedConfig.vocabulary_analysis : analyzedConfig.vocabulary_analysis,
        requires_action
    } as ToolQuestionConfig)
}

export function inferShelfTarget(text: string) {
    const isLeft = /왼쪽|trái|left/i.test(text)
    const isRight = /오른쪽|phải|right/i.test(text)
    const isTop = /위|trên|top/i.test(text)
    const isBottom = /아래|dưới|bottom/i.test(text)

    if (isBottom && isLeft) return 'shelf_bottom_left'
    if (isBottom && isRight) return 'shelf_bottom_right'
    if (isTop && isLeft) return 'shelf_top_left'
    if (isTop && isRight) return 'shelf_top_right'
    if (isBottom) return 'shelf_bottom_left'
    if (isTop) return 'shelf_top_left'
    if (isRight) return 'shelf_bottom_right'
    return 'shelf_bottom_left'
}

export function definitionLabel(definitions: Definition[], id: string) {
    return definitions.find((item) => item.id === id)?.label || id
}
import type { WorkshopGameConfig } from '@/features/workshop/model'
