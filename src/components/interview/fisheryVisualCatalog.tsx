import type { LucideIcon } from 'lucide-react'
import {
    Activity,
    Anchor,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Box,
    Brush,
    CircleDot,
    CircleHelp,
    Compass,
    Droplets,
    Fish,
    Flag,
    Gauge,
    Grid3X3,
    Hand,
    Layers3,
    Link2,
    ListFilter,
    MapPin,
    MoveHorizontal,
    Navigation,
    Octagon,
    Package,
    PackageOpen,
    Pickaxe,
    Power,
    Ruler,
    Scale,
    Search,
    Send,
    Shield,
    Ship,
    Shirt,
    ShoppingCart,
    SprayCan,
    Sun,
    Thermometer,
    UserRound,
    Utensils,
    Waves,
    Wind,
    Wrench,
} from 'lucide-react'

export type FisheryVisualDefinition = {
    id: string
    label: string
    ko: string
    icon: LucideIcon
}

const target = (id: string, label: string, ko: string, icon: LucideIcon): FisheryVisualDefinition => ({ id, label, ko, icon })

export const FISHERY_TARGET_DEFINITIONS: FisheryVisualDefinition[] = [
    target('here', 'Đến đây / vị trí nhận', '여기', MapPin),
    target('away', 'Mang đi / vị trí khác', '저쪽', Navigation),
    target('marker', 'Dấu mốc', '표적', Flag),
    target('signal', 'Tín hiệu', '신호', Activity),
    target('switch', 'Nguồn điện / công tắc', '전원', Power),
    target('object', 'Đồ vật', '물건', Package),
    target('water', 'Nước', '물', Waves),
    target('fish', 'Cá', '물고기', Fish),
    target('shrimp', 'Tôm', '새우', Fish),
    target('shellfish', 'Sò / nhuyễn thể', '조개', CircleDot),
    target('net_rope', 'Lưới hoặc dây thừng', '그물이나 밧줄', Link2),
    target('direction', 'Phương hướng', '방향', Compass),
    target('net', 'Lưới', '그물', Grid3X3),
    target('seafood', 'Thủy sản', '수산물', Fish),
    target('cart', 'Xe vận chuyển', '수레', ShoppingCart),
    target('body', 'Cơ thể', '몸', UserRound),
    target('feet', 'Chân', '발', UserRound),
    target('hands', 'Tay', '손', Hand),
    target('sunlight', 'Ánh nắng', '햇빛', Sun),
    target('boat', 'Tàu / thuyền', '배', Ship),
    target('oxygen', 'Ôxy', '산소', Wind),
    target('water_temperature', 'Nhiệt độ nước', '수온', Thermometer),
    target('net_buoy', 'Lưới và phao', '그물과 부표', Link2),
    target('anchor_boat', 'Neo và tàu đánh cá', '닻과 어선', Anchor),
    target('fish_box', 'Thùng cá', '물고기 상자', Box),
    target('fishing_gear', 'Dụng cụ đánh bắt', '어구', Wrench),
    target('weight', 'Trọng lượng', '무게', Scale),
    target('pump', 'Máy bơm', '펌프', Gauge),
    target('salinity', 'Độ mặn nước biển', '바닷물의 염도', Gauge),
    target('deck', 'Boong tàu', '갑판', Layers3),
    target('oyster', 'Hàu', '굴', CircleDot),
    target('sea', 'Biển', '바다', Waves),
]

const action = (id: string, label: string, ko: string, icon: LucideIcon): FisheryVisualDefinition => ({ id, label, ko, icon })

export const FISHERY_ACTION_DEFINITIONS: FisheryVisualDefinition[] = [
    action('bring', 'Mang đến', '가져오다', ArrowRight),
    action('take_away', 'Mang đi', '가져가다', ArrowLeft),
    action('mark', 'Dùng làm dấu mốc', '표적으로 삼다', Flag),
    action('signal', 'Dùng làm tín hiệu', '신호로 사용하다', Activity),
    action('turn_on', 'Bật lên', '켜다', Power),
    action('search', 'Tìm kiếm', '찾아내다', Search),
    action('pump', 'Bơm nước', '물을 공급하다', Waves),
    action('put_into', 'Cho / đựng vào', '넣다 / 담다', PackageOpen),
    action('lift', 'Kéo lên', '끌어올리다', ArrowUp),
    action('dig', 'Đào', '캐다', Pickaxe),
    action('pull', 'Kéo', '끌어당기다', ArrowRight),
    action('check', 'Kiểm tra / xác định', '확인하다', Compass),
    action('scoop', 'Vớt', '뜨다', Hand),
    action('weave', 'Đan lưới', '짜다', Grid3X3),
    action('catch', 'Bắt thủy sản', '잡다', Fish),
    action('wear', 'Đeo / mặc', '쓰다 / 신다 / 입다', Shirt),
    action('push_pull', 'Đẩy và kéo', '밀고 당기다', MoveHorizontal),
    action('block', 'Che chắn', '막다', Shield),
    action('stop', 'Làm dừng lại', '멈추게 하다', Octagon),
    action('fish', 'Câu cá', '낚다', Fish),
    action('wash', 'Rửa sạch', '세척하다', SprayCan),
    action('supply', 'Cung cấp', '공급하다', Wind),
    action('measure', 'Đo', '측정하다', Ruler),
    action('tie', 'Buộc', '묶다', Link2),
    action('connect', 'Kết nối', '연결하다', Link2),
    action('feed', 'Cho ăn', '먹이를 주다', Utensils),
    action('weigh', 'Cân trọng lượng', '재다', Scale),
    action('float', 'Thả nổi', '띄우다', ArrowUp),
    action('sink', 'Thả chìm', '가라앉히다', ArrowDown),
    action('sort', 'Phân loại', '선별하다', ListFilter),
    action('shuck', 'Cạy hàu', '까다', Pickaxe),
    action('sweep', 'Quét sạch', '청소하다', Brush),
    action('scoop_water', 'Múc nước', '퍼 담다', Droplets),
    action('throw', 'Quăng', '던지다', Send),
]

export type FisheryToolGroup =
    | 'Ánh sáng & nước'
    | 'Đánh bắt'
    | 'Chứa & vận chuyển'
    | 'Bảo hộ lao động'
    | 'Dây, phao & neo'
    | 'Máy & đo kiểm'
    | 'Boong & vệ sinh'

export const FISHERY_TOOL_GROUP_ORDER: FisheryToolGroup[] = [
    'Ánh sáng & nước',
    'Đánh bắt',
    'Chứa & vận chuyển',
    'Bảo hộ lao động',
    'Dây, phao & neo',
    'Máy & đo kiểm',
    'Boong & vệ sinh',
]

const fisheryToolGroups: Record<FisheryToolGroup, string[]> = {
    'Ánh sáng & nước': ['fishery_searchlight', 'fishery_attracting_lamp', 'fishery_submersible_pump'],
    'Đánh bắt': ['fishery_gaff', 'fishery_shell_rake', 'fishery_hook', 'fishery_compass', 'fishery_landing_net', 'fishery_netting_needle', 'fishery_scoop_net', 'fishery_trap', 'fishery_fishhook', 'fishery_oyster_knife', 'fishery_cast_net'],
    'Chứa & vận chuyển': ['fishery_livewell', 'fishery_handcart', 'fishery_wheelbarrow', 'fishery_basket', 'fishery_rubber_tub', 'fishery_sack', 'fishery_sorting_tray'],
    'Bảo hộ lao động': ['fishery_goggles', 'fishery_fins', 'fishery_rubber_gloves', 'fishery_waterproof_apron', 'fishery_work_clothes'],
    'Dây, phao & neo': ['fishery_buoy', 'fishery_shade_net', 'fishery_anchor', 'fishery_rope', 'fishery_chain_hook', 'fishery_iron_chain', 'fishery_hose', 'fishery_float_line', 'fishery_lead_line'],
    'Máy & đo kiểm': ['fishery_pressure_sprayer', 'fishery_net_hauler', 'fishery_oxygenator', 'fishery_thermometer', 'fishery_scale', 'fishery_salinity_meter'],
    'Boong & vệ sinh': ['fishery_deck_brush', 'fishery_scoop', 'fishery_feed'],
}

export const FISHERY_TOOL_GROUP_BY_ID: Record<string, FisheryToolGroup> = Object.fromEntries(
    Object.entries(fisheryToolGroups).flatMap(([group, ids]) => ids.map((id) => [id, group])),
) as Record<string, FisheryToolGroup>

export function findFisheryTarget(id: string | null | undefined) {
    return FISHERY_TARGET_DEFINITIONS.find((item) => item.id === id)
}

export function getFisheryTargetImage(id: string | null | undefined) {
    return findFisheryTarget(id) ? `/assets/workshop/fishery-targets-3d/${id}.png` : null
}

export function findFisheryAction(id: string | null | undefined) {
    return FISHERY_ACTION_DEFINITIONS.find((item) => item.id === id)
}

type FisheryEntityIconProps = {
    id: string | null | undefined
    kind: 'target' | 'action'
    className?: string
}

export function FisheryEntityIcon({ id, kind, className = 'size-7' }: FisheryEntityIconProps) {
    const definition = kind === 'target' ? findFisheryTarget(id) : findFisheryAction(id)
    const Icon = definition?.icon || CircleHelp
    return <Icon aria-hidden="true" className={className} strokeWidth={1.8} />
}
