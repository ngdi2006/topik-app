import type { WorkshopAsset, WorkshopAssetType } from './model'

// Canonical source: docs/import/ke_hoach_86_asset_game_keo_tha.xlsx
// Sheet: "Asset chuẩn để tạo ảnh". Do not invent or rename IDs here.
type CanonicalRow = readonly [id: string, nameKo: string, nameVi: string, sourceGroup: string]

const CANONICAL_ROWS: readonly CanonicalRow[] = [
    ['adjustable_wrench', '멍키 스패너', 'mỏ lết', 'Dụng cụ cầm tay'],
    ['bearing', '베어링', 'ổ bi/vòng bi', 'Chi tiết'],
    ['bearing_puller', '풀러', 'cảo/puller', 'Dụng cụ cầm tay'],
    ['bench_vise', '바이스', 'ê-tô', 'Dụng cụ cầm tay'],
    ['bolt', '볼트', 'bu lông', 'Chi tiết'],
    ['c_clamp', '클램프', 'kẹp chữ C/kẹp cố định', 'Dụng cụ cầm tay'],
    ['cable_reel', '전선 릴', 'cuộn dây điện/cáp', 'Máy/Thiết bị'],
    ['claw_hammer', '장도리', 'búa nhổ đinh', 'Dụng cụ cầm tay'],
    ['coil_spring', '코일 스프링', 'lò xo cuộn', 'Chi tiết'],
    ['cold_chisel', '정', 'đục', 'Dụng cụ cầm tay'],
    ['combination_pliers', '펜치', 'kìm', 'Dụng cụ cầm tay'],
    ['control_panel', '컨트롤 판넬', 'bảng điều khiển', 'Máy/Thiết bị'],
    ['copper_wire', '구리선', 'dây đồng', 'Vật liệu/Vật tư'],
    ['cutting_blade_tool', '날물', 'lưỡi/công cụ có lưỡi', 'Phụ kiện/Lưỡi dụng cụ'],
    ['cutting_machine', '절단기', 'dụng cụ/máy cắt', 'Máy/Thiết bị'],
    ['dedicated_storage_box', '전용함', 'hộp chuyên dụng', 'Vật chứa'],
    ['diagonal_cutters', '니퍼', 'kìm cắt', 'Dụng cụ cầm tay'],
    ['digital_scale', '전자 저울', 'cân điện tử', 'Dụng cụ đo'],
    ['drill_press', '드릴링머신', 'máy khoan', 'Máy/Thiết bị'],
    ['electric_drill', '전기 드릴', 'máy khoan điện', 'Dụng cụ điện'],
    ['electrical_wire', '전선', 'dây điện', 'Vật liệu/Vật tư'],
    ['female_thread_nut', '암나사', 'đai ốc/ren trong', 'Chi tiết'],
    ['flathead_screwdriver', '일자 드라이버', 'tua vít dẹt', 'Dụng cụ cầm tay'],
    ['gas_pipe', '가스관', 'ống gas', 'Vật liệu/Chi tiết'],
    ['gear', '기어', 'bánh răng', 'Chi tiết'],
    ['gesso_primer', '젯소', 'sơn lót (gesso)', 'Vật liệu/Vật tư'],
    ['hacksaw', '쇠톱', 'cưa sắt', 'Dụng cụ cầm tay'],
    ['hammer', '망치', 'búa', 'Dụng cụ cầm tay'],
    ['hand_plane', '대패', 'bào gỗ', 'Dụng cụ cầm tay'],
    ['hex_key', '육각 렌치', 'chìa lục giác', 'Dụng cụ cầm tay'],
    ['iron_wire', '철선', 'dây sắt', 'Vật liệu/Vật tư'],
    ['lever', '레버', 'cần gạt', 'Bộ phận điều khiển'],
    ['lumber', '목재', 'gỗ', 'Vật liệu/Vật tư'],
    ['male_thread_bolt', '수나사', 'bu lông/ren ngoài', 'Chi tiết'],
    ['metal_file', '줄', 'dũa', 'Dụng cụ cầm tay'],
    ['nail', '못', 'đinh', 'Chi tiết'],
    ['nut', '너트', 'đai ốc', 'Chi tiết'],
    ['open_end_wrench', '스패너', 'cờ lê', 'Dụng cụ cầm tay'],
    ['paint', '페인트', 'sơn', 'Vật liệu/Vật tư'],
    ['paint_brush', '붓', 'cọ sơn', 'Dụng cụ cầm tay'],
    ['paint_roller', '룰러', 'con lăn sơn', 'Dụng cụ cầm tay'],
    ['pan_scale', '접시 저울', 'cân đĩa', 'Dụng cụ đo'],
    ['phillips_screwdriver', '십자드라이버', 'tua vít bake/chữ thập', 'Dụng cụ cầm tay'],
    ['pipe', '파이프', 'ống', 'Vật liệu/Chi tiết'],
    ['pipe_cutter', '파이프 커터', 'dụng cụ cắt ống', 'Dụng cụ cầm tay'],
    ['pipe_wrench', '파이프 렌치', 'mỏ lết răng/cờ lê ống', 'Dụng cụ cầm tay'],
    ['pliers', '플라이어', 'kìm', 'Dụng cụ cầm tay'],
    ['push_button', '버튼', 'nút bấm', 'Bộ phận điều khiển'],
    ['putty', '퍼티', 'matit/bột bả', 'Vật liệu/Vật tư'],
    ['putty_knife', '퍼티헤라', 'bay bả matit', 'Dụng cụ cầm tay'],
    ['rcd_breaker', '누전차단기', 'cầu dao chống rò điện', 'Máy/Thiết bị'],
    ['rebar', '철근', 'thép cây', 'Vật liệu/Vật tư'],
    ['ruler', '자', 'thước thẳng', 'Dụng cụ đo'],
    ['rust_preventive_oil', '방청유', 'dầu chống rỉ', 'Vật liệu/Vật tư'],
    ['sandpaper', '사포', 'giấy nhám', 'Vật tư/Dụng cụ'],
    ['saw_blade', '톱날', 'lưỡi cưa', 'Phụ kiện/Lưỡi dụng cụ'],
    ['scale', '저울', 'cân', 'Dụng cụ đo'],
    ['screw', '나사', 'vít', 'Chi tiết'],
    ['screwdriver', '드라이버', 'tua vít', 'Dụng cụ cầm tay'],
    ['scriber', '금 긋기 바늘', 'mũi/bút vạch dấu', 'Dụng cụ cầm tay'],
    ['sheet_metal', '금속 판재', 'tấm kim loại', 'Vật liệu/Vật tư'],
    ['socket_wrench', '소켓 렌치', 'cờ lê đầu khẩu', 'Dụng cụ cầm tay'],
    ['solid_wood', '원목', 'gỗ nguyên khối', 'Vật liệu/Vật tư'],
    ['spirit_level', '수준기', 'thước thủy', 'Dụng cụ đo'],
    ['spray_gun', '스프레이 건', 'súng phun', 'Dụng cụ cầm tay'],
    ['sprayer', '분무기', 'bình phun/xịt', 'Dụng cụ cầm tay'],
    ['steel_wire', '철사', 'dây thép', 'Vật liệu/Vật tư'],
    ['switch', '스위치', 'công tắc', 'Bộ phận điều khiển'],
    ['tape_measure', '줄자', 'thước cuộn', 'Dụng cụ đo'],
    ['tin_snips', '판금 가위', 'kéo cắt tôn', 'Dụng cụ cầm tay'],
    ['toolbox', '공구함', 'hộp dụng cụ', 'Vật chứa'],
    ['torque_wrench', '토크 렌치', 'cờ lê lực', 'Dụng cụ đo'],
    ['varnish', '바니시', 'vecni', 'Vật liệu/Vật tư'],
    ['vernier_caliper', '버니어 캘리퍼스', 'thước cặp', 'Dụng cụ đo'],
    ['water_pipe', '수도관', 'ống nước', 'Vật liệu/Chi tiết'],
    ['welding_rod', '용접봉', 'que hàn', 'Vật liệu/Vật tư'],
    ['wire_rod', '선재', 'dây kim loại', 'Vật liệu/Vật tư'],
    ['wire_stripper', '와이어 스트리퍼', 'kìm tuốt dây', 'Dụng cụ cầm tay'],
    ['wood_chisel', '끌', 'đục gỗ', 'Dụng cụ cầm tay'],
    ['wood_screw', '나사못', 'vít', 'Chi tiết'],
    ['work_light', '작업등', 'đèn làm việc', 'Máy/Thiết bị'],
] as const

const GROUP_TO_TYPE: Record<string, WorkshopAssetType> = {
    'Dụng cụ cầm tay': 'tool',
    'Dụng cụ điện': 'power_tool',
    'Dụng cụ đo': 'measuring_tool',
    'Chi tiết': 'part',
    'Phụ kiện/Lưỡi dụng cụ': 'part',
    'Vật liệu/Vật tư': 'material',
    'Vật liệu/Chi tiết': 'material',
    'Vật tư/Dụng cụ': 'material',
    'Máy/Thiết bị': 'device',
    'Vật chứa': 'container',
    'Bộ phận điều khiển': 'control_part',
}

const LEGACY_METADATA: Record<string, Pick<WorkshopAsset, 'legacyIds' | 'fallbackIconId'>> = {
    hammer: { fallbackIconId: 'hammer' },
    claw_hammer: { fallbackIconId: 'hammer' },
    pipe_wrench: { fallbackIconId: 'wrench' },
    open_end_wrench: { legacyIds: ['wrench'], fallbackIconId: 'wrench' },
    diagonal_cutters: { legacyIds: ['nipper'], fallbackIconId: 'nipper' },
    digital_scale: { legacyIds: ['electronic_scale', 'industrial_scale'] },
    bolt: { legacyIds: ['hex_bolt'] },
    steel_wire: { legacyIds: ['electric_wire'] },
    toolbox: { legacyIds: ['toolbox_center', 'box'] },
}

function folderFor(type: WorkshopAssetType) {
    if (type === 'tool' || type === 'power_tool' || type === 'measuring_tool') return 'tools'
    if (type === 'part') return 'parts'
    if (type === 'material') return 'materials'
    if (type === 'container') return 'containers'
    if (type === 'control_part') return 'control-parts'
    return 'devices'
}

const assets: WorkshopAsset[] = CANONICAL_ROWS.map(([id, nameKo, nameVi, sourceGroup]) => {
    const type = GROUP_TO_TYPE[sourceGroup]
    return {
        id,
        nameKo,
        nameVi,
        type,
        sourceGroup,
        sourceFile: `${id}.png`,
        image: `/assets/workshop/${folderFor(type)}/${id}.webp`,
        suggestedSize: 'Nguồn 1024×1024 → web 256×256 hoặc 512×512',
        ...LEGACY_METADATA[id],
    }
})

export const WORKSHOP_ASSETS = Object.freeze(assets)
export const WORKSHOP_ASSET_REGISTRY = new Map(assets.map((asset) => [asset.id, asset]))

const legacyIdMap = new Map<string, string>()
for (const asset of assets) {
    legacyIdMap.set(asset.id, asset.id)
    for (const legacyId of asset.legacyIds || []) legacyIdMap.set(legacyId, asset.id)
}

export function resolveWorkshopAssetId(id: string) {
    return legacyIdMap.get(id) || id
}

export function getWorkshopAsset(id: string) {
    return WORKSHOP_ASSET_REGISTRY.get(resolveWorkshopAssetId(id))
}

export function listWorkshopAssets(type?: WorkshopAssetType) {
    return type ? assets.filter((asset) => asset.type === type && asset.active !== false) : assets.filter((asset) => asset.active !== false)
}
