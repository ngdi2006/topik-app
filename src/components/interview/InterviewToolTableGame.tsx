'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import Image from 'next/image'
import { GripVertical, RotateCcw } from 'lucide-react'
import toolMetadata from '../../../DATA-EPS/img/metadata_tools.json'

type ToolGroup = 'Tháo lắp' | 'Kìm & cắt' | 'Đo kiểm' | 'Gia công' | 'Sơn & hoàn thiện'

type ToolAsset = {
    src: string
    group: ToolGroup
    scale?: number
}

const TOOL_GROUP_ORDER: ToolGroup[] = ['Tháo lắp', 'Kìm & cắt', 'Đo kiểm', 'Gia công', 'Sơn & hoàn thiện']

const TOOL_IDS_BY_NUMBER = [
    'screwdriver', 'flat_screwdriver', 'phillips_screwdriver', 'pliers', 'long_nose_pliers',
    'pincers', 'nipper', 'socket_wrench', 'socket', 'wrench', 'adjustable_wrench', 'torque_wrench',
    'allen_wrench', 'pipe_wrench', 'bearing_puller', 'spirit_level', 'hammer', 'claw_hammer', 'saw',
    'hand_file', 'metal_chisel', 'marking_needle', 'vise', 'tin_snips', 'bolt_cutter', 'ruler',
    'tape_measure', 'vernier_caliper', 'hand_plane', 'wood_chisel', 'clamp', 'sprayer', 'sandpaper',
    'putty_knife', 'putty', 'paint_brush', 'paint_roller', 'primer', 'paint', 'varnish', 'spray_gun',
    'heat_gun', 'rust_preventive_oil', 'ladder', 'work_light', 'cable_reel', 'forklift', 'platform_cart',
    'hand_cart', 'pallet_truck', 'strapping_machine', 'drill_press', 'drill', 'handheld_cutter',
    'electric_cutter', 'reamer', 'welder', 'torch', 'mixer', 'scale', 'electronic_scale', 'table_saw',
    'circular_saw', 'grinder', 'drill_mixer', 'leakage_breaker', 'air_compressor', 'switch_tool', 'hoist',
    'circuit_tester',
] as const

const groupForToolNumber = (number: number): ToolGroup => {
    if ([1, 2, 3, 8, 9, 10, 11, 12, 13, 14, 15, 23, 31].includes(number)) return 'Tháo lắp'
    if ([4, 5, 6, 7, 19, 24, 25, 54, 55].includes(number)) return 'Kìm & cắt'
    if ([16, 26, 27, 28, 60, 61, 70].includes(number)) return 'Đo kiểm'
    if (number >= 32 && number <= 43) return 'Sơn & hoàn thiện'
    return 'Gia công'
}

export const FULL_TOOL_IDS = toolMetadata.map((item) => TOOL_IDS_BY_NUMBER[item.id - 1])
export const FULL_TOOL_NAMES: Record<string, { ko: string; vi: string }> = Object.fromEntries(
    toolMetadata.map((item) => [TOOL_IDS_BY_NUMBER[item.id - 1], { ko: item.kr, vi: item.vi }]),
)

const METADATA_TOOL_ASSETS: Record<string, ToolAsset> = Object.fromEntries(
    toolMetadata.map((item) => [
        TOOL_IDS_BY_NUMBER[item.id - 1],
        {
            src: `/assets/workshop/tools/${item.filename}`,
            group: groupForToolNumber(item.id),
        },
    ]),
)

const CURATED_TOOL_ASSETS: Record<string, ToolAsset> = {
    screwdriver: { src: '/assets/workshop/tools/game-v2/screwdriver.png', group: 'Tháo lắp' },
    flat_screwdriver: { src: '/assets/workshop/tools/02_tuavitdet_iljadriver.png', group: 'Tháo lắp' },
    phillips_screwdriver: { src: '/assets/workshop/tools/03_tuavitchuthap_sipjadriver.png', group: 'Tháo lắp' },
    pliers: { src: '/assets/workshop/tools/game-v2/pliers.png', group: 'Kìm & cắt', scale: 0.84 },
    long_nose_pliers: { src: '/assets/workshop/tools/05_kimmuidai_longnosepliers.png', group: 'Kìm & cắt', scale: 1.12 },
    pincers: { src: '/assets/workshop/tools/06_kimbam_penchi.png', group: 'Kìm & cắt', scale: 1.06 },
    nipper: { src: '/assets/workshop/tools/07_kimcat_nipper.png', group: 'Kìm & cắt', scale: 0.7 },
    bolt_cutter: { src: '/assets/workshop/tools/25_kimcongluc_jeoldangi.png', group: 'Kìm & cắt', scale: 0.94 },
    socket_wrench: { src: '/assets/workshop/tools/08_cole_daukhau_socketwrench.png', group: 'Tháo lắp', scale: 1.08 },
    socket: { src: '/assets/workshop/tools/09_daukhau_socket.png', group: 'Tháo lắp', scale: 1.08 },
    wrench: { src: '/assets/workshop/tools/10_cole_spanner.png', group: 'Tháo lắp' },
    adjustable_wrench: { src: '/assets/workshop/tools/11_molet_monkeyspanner.png', group: 'Tháo lắp' },
    torque_wrench: { src: '/assets/workshop/tools/12_coleluc_torquewrench.png', group: 'Tháo lắp' },
    allen_wrench: { src: '/assets/workshop/tools/13_khoalucgiac_hexwrench.png', group: 'Tháo lắp', scale: 1.16 },
    pipe_wrench: { src: '/assets/workshop/tools/14_moletrang_pipewrench.png', group: 'Tháo lắp' },
    bearing_puller: { src: '/assets/workshop/tools/15_caobacdan_puller.png', group: 'Tháo lắp' },
    ruler: { src: '/assets/workshop/tools/game-v2/ruler.png', group: 'Đo kiểm' },
    hammer: { src: '/assets/workshop/tools/game-v2/claw-hammer.png', group: 'Gia công' },
    spirit_level: { src: '/assets/workshop/tools/game-v2/spirit-level.png', group: 'Đo kiểm' },
    hand_file: { src: '/assets/workshop/tools/game-v2/hand-file.png', group: 'Gia công' },
    saw: { src: '/assets/workshop/tools/19_cuasat_soetop.png', group: 'Gia công' },
    paint_brush: { src: '/assets/workshop/tools/36_coson_but.png', group: 'Sơn & hoàn thiện' },
    paint_roller: { src: '/assets/workshop/tools/37_conlanson_roller.png', group: 'Sơn & hoàn thiện' },
    spray_gun: { src: '/assets/workshop/tools/41_sungphunson_spraygun.png', group: 'Sơn & hoàn thiện' },
    rust_preventive_oil: { src: '/assets/workshop/tools/43_dauchonggi_bangcheongyu.png', group: 'Sơn & hoàn thiện' },
    welder: { src: '/assets/workshop/tools/57_mayhanco2_co2yongjeopgi.png', group: 'Gia công' },
    scale: { src: '/assets/workshop/tools/60_candia_jeopsijeoul.png', group: 'Đo kiểm' },
    pan_scale: { src: '/assets/workshop/tools/60_candia_jeopsijeoul.png', group: 'Đo kiểm' },
    electronic_scale: { src: '/assets/workshop/tools/61_candientu_jeonjajeoul.png', group: 'Đo kiểm' },
    industrial_scale: { src: '/assets/workshop/tools/61_candientu_jeonjajeoul.png', group: 'Đo kiểm' },
    lathe_machine: { src: '/assets/workshop/tools/63_maycuadia_wonhyeongtop.png', group: 'Gia công' },
    drill: { src: '/assets/workshop/tools/53_khoandien_jeongidrill.png', group: 'Gia công' },
    switch_tool: { src: '/assets/workshop/tools/68_bangdieukhien_controlpanel.png', group: 'Đo kiểm' },
}

const TOOL_ASSETS: Record<string, ToolAsset> = {
    ...METADATA_TOOL_ASSETS,
    ...CURATED_TOOL_ASSETS,
    pan_scale: METADATA_TOOL_ASSETS.scale,
    industrial_scale: METADATA_TOOL_ASSETS.electronic_scale,
    lathe_machine: METADATA_TOOL_ASSETS.circular_saw,
}

type Props = {
    tools: string[]
    placedTools: string[]
    targets: string[]
    placedTarget: string | null
    toolNames: Record<string, { ko: string; vi: string }>
    targetNames: Record<string, string>
    stage: 1 | 2 | 3
    requiresTarget?: boolean
    disabled?: boolean
    renderFallback: (tool: string, className: string) => ReactNode
    renderTarget: (target: string, className: string) => ReactNode
    onPlace: (tool: string) => void
    onRemove: (tool: string) => void
    onPlaceTarget: (target: string) => void
    onRemoveTarget: () => void
}

type InventoryKind = 'tool' | 'target'
type DragState = { id: string; kind: InventoryKind } | null

const SLOT_POSITIONS = [
    { left: '20%', top: '43%', rotate: '-5deg' },
    { left: '36%', top: '42%', rotate: '4deg' },
    { left: '50%', top: '43%', rotate: '-2deg' },
    { left: '64%', top: '42%', rotate: '5deg' },
]

const TABLE_OPERATION_POLYGON = [
    { x: 0.13, y: 0.53 },
    { x: 0.87, y: 0.53 },
    { x: 0.97, y: 0.60 },
    { x: 0.03, y: 0.60 },
] as const

const TABLE_CLIP_PATH = `polygon(${TABLE_OPERATION_POLYGON.map(({ x, y }) => `${x * 100}% ${y * 100}%`).join(', ')})`
const TABLE_SVG_POINTS = TABLE_OPERATION_POLYGON.map(({ x, y }) => `${x * 100},${y * 100}`).join(' ')

export function InterviewToolTableGame({
    tools,
    placedTools,
    targets,
    placedTarget,
    toolNames,
    targetNames,
    stage,
    requiresTarget = true,
    disabled = false,
    renderFallback,
    renderTarget,
    onPlace,
    onRemove,
    onPlaceTarget,
    onRemoveTarget,
}: Props) {
    const dropZoneRef = useRef<HTMLButtonElement | null>(null)
    const floatingRef = useRef<HTMLDivElement | null>(null)
    const pointRef = useRef({ x: 0, y: 0 })
    const frameRef = useRef<number | null>(null)
    const movedRef = useRef(false)
    const previousBodyOverflowRef = useRef('')
    const [drag, setDrag] = useState<DragState>(null)
    const [isOverDropZone, setIsOverDropZone] = useState(false)
    const [isDropZoneFocused, setIsDropZoneFocused] = useState(false)
    const [tapSelected, setTapSelected] = useState<{ id: string; kind: InventoryKind } | null>(null)
    const [requestedGroup, setRequestedGroup] = useState<ToolGroup | null>(null)
    const [inventoryKind, setInventoryKind] = useState<InventoryKind>('tool')

    const availableTools = useMemo(
        () => tools.filter((tool) => !placedTools.includes(tool)),
        [placedTools, tools],
    )
    const groupedTools = useMemo(() => {
        const groups = new Map<ToolGroup, string[]>()
        for (const tool of availableTools) {
            const group = TOOL_ASSETS[tool]?.group || 'Gia công'
            groups.set(group, [...(groups.get(group) || []), tool])
        }
        return TOOL_GROUP_ORDER
            .filter((group) => groups.has(group))
            .map((group) => [group, groups.get(group) || []] as const)
    }, [availableTools])
    const activeGroup = groupedTools.some(([group]) => group === requestedGroup)
        ? requestedGroup
        : groupedTools[0]?.[0] || null
    const activeGroupTools = groupedTools.find(([group]) => group === activeGroup)?.[1] || []
    const availableTargets = targets.filter((target) => target !== placedTarget)
    const visibleInventoryKind: InventoryKind = stage === 1 || !requiresTarget ? 'tool' : stage === 2 ? 'target' : inventoryKind

    useEffect(() => {
        if (!drag) return
        previousBodyOverflowRef.current = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previousBodyOverflowRef.current
        }
    }, [drag])

    useEffect(() => () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }, [])

    const updateFloatingPosition = (x: number, y: number) => {
        pointRef.current = { x, y }
        if (frameRef.current !== null) return
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null
            if (floatingRef.current) {
                floatingRef.current.style.transform = `translate3d(${pointRef.current.x - 45}px, ${pointRef.current.y - 45}px, 0) scale(1.08)`
            }
        })
    }

    const isPointInDropZone = (x: number, y: number) => {
        const rect = dropZoneRef.current?.getBoundingClientRect()
        if (!rect || rect.width === 0 || rect.height === 0) return false
        const pointX = (x - rect.left) / rect.width
        const pointY = (y - rect.top) / rect.height
        let inside = false
        for (let index = 0, previous = TABLE_OPERATION_POLYGON.length - 1; index < TABLE_OPERATION_POLYGON.length; previous = index, index += 1) {
            const currentPoint = TABLE_OPERATION_POLYGON[index]
            const previousPoint = TABLE_OPERATION_POLYGON[previous]
            const intersects = ((currentPoint.y > pointY) !== (previousPoint.y > pointY)) &&
                (pointX < ((previousPoint.x - currentPoint.x) * (pointY - currentPoint.y)) / (previousPoint.y - currentPoint.y) + currentPoint.x)
            if (intersects) inside = !inside
        }
        return inside
    }

    const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string, kind: InventoryKind) => {
        if (disabled) return
        event.currentTarget.setPointerCapture(event.pointerId)
        movedRef.current = false
        setDrag({ id, kind })
        updateFloatingPosition(event.clientX, event.clientY)
    }

    const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (!drag) return
        movedRef.current = true
        updateFloatingPosition(event.clientX, event.clientY)
        const nextIsOver = isPointInDropZone(event.clientX, event.clientY)
        setIsOverDropZone((current) => current === nextIsOver ? current : nextIsOver)
    }

    const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (!drag) return
        const shouldPlace = isPointInDropZone(event.clientX, event.clientY)
        if (shouldPlace) {
            if (drag.kind === 'tool') onPlace(drag.id)
            else onPlaceTarget(drag.id)
        }
        setIsOverDropZone(false)
        setDrag(null)
    }

    const cancelDrag = () => {
        setIsOverDropZone(false)
        setDrag(null)
    }

    const handleItemClick = (id: string, kind: InventoryKind) => {
        if (movedRef.current || disabled) return
        setTapSelected((current) => current?.id === id && current.kind === kind ? null : { id, kind })
    }

    const handleDropZoneClick = () => {
        if (!tapSelected || disabled) return
        if (tapSelected.kind === 'tool') onPlace(tapSelected.id)
        else onPlaceTarget(tapSelected.id)
        setTapSelected(null)
    }

    return (
        <section aria-label="Bàn thi thực hành" className="w-full lg:pr-[300px]">
            <div className="relative mx-auto mb-[206px] aspect-square w-full overflow-visible bg-slate-100 overscroll-contain sm:mb-[222px] sm:rounded-lg lg:mb-0">
                <Image
                    src="/assets/workshop/scenes/interview-table-v2.png"
                    alt="Bàn thi thực hành trước mặt giám khảo"
                    width={1254}
                    height={1254}
                    draggable={false}
                    className="absolute inset-0 h-full w-full select-none rounded-lg object-contain"
                />

                <div className="pointer-events-none absolute left-[7%] top-[49%] z-20 rounded-full bg-blue-950/80 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-sm sm:text-[10px]">
                    Vùng thao tác
                </div>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                    aria-hidden="true"
                >
                    <polygon
                        points={TABLE_SVG_POINTS}
                        fill={isOverDropZone || tapSelected || isDropZoneFocused ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.035)'}
                        stroke={isOverDropZone || tapSelected || isDropZoneFocused ? '#3b82f6' : 'rgba(255, 255, 255, 0.58)'}
                        strokeWidth={isOverDropZone || tapSelected || isDropZoneFocused ? 0.7 : 0.35}
                        strokeDasharray={isOverDropZone || tapSelected || isDropZoneFocused ? undefined : '1.4 1.2'}
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
                <button
                    ref={dropZoneRef}
                    type="button"
                    onClick={handleDropZoneClick}
                    onFocus={() => setIsDropZoneFocused(true)}
                    onBlur={() => setIsDropZoneFocused(false)}
                    disabled={disabled}
                    aria-label={tapSelected ? `Đặt ${tapSelected.kind === 'tool' ? toolNames[tapSelected.id]?.vi || tapSelected.id : targetNames[tapSelected.id] || tapSelected.id} vào vùng thao tác` : 'Vùng thao tác trước mặt giám khảo'}
                    style={{ clipPath: TABLE_CLIP_PATH }}
                    className="absolute inset-0 z-10 h-full w-full bg-transparent focus-visible:outline-none"
                >
                    <span className="sr-only">Chạm để đặt dụng cụ đã chọn</span>
                </button>

                <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
                    {placedTools.map((tool, index) => {
                        const asset = TOOL_ASSETS[tool]
                        const slot = SLOT_POSITIONS[index % SLOT_POSITIONS.length]
                        return (
                            <span
                                key={tool}
                                className="absolute grid h-16 w-16 place-items-center rounded-xl bg-slate-950/20 shadow-[0_8px_18px_rgba(15,23,42,0.28)] backdrop-blur-[2px] sm:h-[84px] sm:w-[84px]"
                                style={{ left: slot.left, top: slot.top, rotate: slot.rotate }}
                            >
                                {asset ? (
                                    <Image src={asset.src} alt="" width={84} height={84} draggable={false} className="h-full w-full object-contain" />
                                ) : renderFallback(tool, 'h-14 w-14 sm:h-[72px] sm:w-[72px]')}
                                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow">
                                    {index + 1}
                                </span>
                            </span>
                        )
                    })}
                    {placedTarget ? (
                        <span className="absolute left-[76%] top-[43%] grid h-16 w-16 place-items-center rounded-xl bg-amber-50/95 shadow-[0_8px_18px_rgba(15,23,42,0.22)] sm:h-[84px] sm:w-[84px]">
                            {renderTarget(placedTarget, 'h-14 w-14 sm:h-[72px] sm:w-[72px]')}
                            <span className="absolute -right-1 -top-2 rounded bg-amber-500 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white shadow-sm">Chi tiết</span>
                        </span>
                    ) : null}
                </div>

                <div className="absolute inset-x-[1.5%] top-[calc(100%+6px)] bottom-auto z-30 rounded-2xl border border-white/80 bg-white/65 p-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:inset-x-[2%] sm:p-2.5 lg:bottom-0 lg:left-[calc(100%+16px)] lg:right-auto lg:top-0 lg:flex lg:h-full lg:w-[284px] lg:flex-col lg:border-slate-200/70 lg:bg-white/80 lg:p-3">
                    <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 lg:mb-3 lg:grid lg:grid-cols-2 lg:gap-1.5" role="tablist" aria-label="Loại vật thể">
                        <button type="button" role="tab" aria-selected={visibleInventoryKind === 'tool'} onClick={() => setInventoryKind('tool')} className={`min-h-9 rounded-lg px-3 text-[10px] font-bold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${visibleInventoryKind === 'tool' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/70'}`}>
                            1. Dụng cụ <span className="opacity-70">{placedTools.length}</span>
                        </button>
                        {requiresTarget ? <button type="button" role="tab" aria-selected={visibleInventoryKind === 'target'} disabled={stage === 1} onClick={() => setInventoryKind('target')} className={`min-h-9 rounded-lg px-3 text-[10px] font-bold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-40 ${visibleInventoryKind === 'target' ? 'bg-white text-amber-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/70'}`}>
                            2. Chi tiết {placedTarget ? '✓' : ''}
                        </button> : null}
                        <span className="ml-auto px-2 text-[9px] font-semibold text-slate-400 lg:col-span-2 lg:ml-0 lg:text-center lg:text-[10px]">{stage === 1 ? 'Chọn đủ dụng cụ' : stage === 2 ? 'Chọn chi tiết' : 'Sẵn sàng thao tác'}</span>
                    </div>

                    {visibleInventoryKind === 'tool' ? <div role="tablist" aria-label="Nhóm dụng cụ" className="mt-1.5 flex touch-pan-x gap-1.5 overflow-x-auto overscroll-x-contain border-y border-slate-200/70 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-2 lg:overflow-visible lg:py-3">
                        {groupedTools.map(([group, groupTools]) => {
                            const isActive = activeGroup === group
                            return (
                                <button
                                    key={group}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls="active-tool-group"
                                    onClick={() => setRequestedGroup(group)}
                                    className={`inline-flex min-h-8 shrink-0 touch-manipulation items-center justify-center gap-1 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-wide transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-[10px] lg:min-h-9 lg:whitespace-normal lg:rounded-lg lg:text-center lg:text-[9px] ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white/70 text-slate-500 ring-1 ring-slate-200 hover:bg-white hover:text-slate-900'
                                    }`}
                                >
                                    {group}
                                    <span className={`px-1 text-[8px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{groupTools.length}</span>
                                </button>
                            )
                        })}
                    </div> : null}

                    <div id="active-tool-group" role="tabpanel" aria-label={visibleInventoryKind === 'tool' ? activeGroup || 'Dụng cụ' : 'Chi tiết cần thao tác'} className="flex min-h-[76px] touch-pan-x snap-x snap-mandatory items-center gap-2 overflow-x-auto overscroll-x-contain py-2 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:min-h-[84px] lg:grid lg:flex-1 lg:auto-rows-min lg:grid-cols-2 lg:content-start lg:items-stretch lg:overflow-y-auto lg:pr-0 lg:pt-3">
                        {visibleInventoryKind === 'tool' && activeGroupTools.length > 0 ? (
                            activeGroupTools.map((tool) => {
                                    const asset = TOOL_ASSETS[tool]
                                    const isTapSelected = tapSelected?.kind === 'tool' && tapSelected.id === tool
                                    const label = toolNames[tool]?.vi || tool
                                    return (
                                        <button
                                            key={tool}
                                            type="button"
                                            aria-label={`Chọn ${label}`}
                                            aria-pressed={isTapSelected}
                                            disabled={disabled}
                                            onPointerDown={(event) => beginDrag(event, tool, 'tool')}
                                            onPointerMove={moveDrag}
                                            onPointerUp={finishDrag}
                                            onPointerCancel={cancelDrag}
                                            onClick={() => handleItemClick(tool, 'tool')}
                                            className={`relative grid h-[68px] min-w-[68px] snap-start touch-pan-x place-items-center rounded-xl bg-white/75 p-1 shadow-sm ring-1 ring-slate-200/80 transition-[transform,background-color,box-shadow] hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-[76px] sm:min-w-[76px] lg:h-auto lg:min-h-[96px] lg:touch-none lg:grid-cols-[68px_1fr] lg:justify-items-start lg:gap-1 lg:px-2 ${isTapSelected ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}
                                        >
                                            {asset ? (
                                                <Image
                                                    src={asset.src}
                                                    alt=""
                                                    width={72}
                                                    height={72}
                                                    draggable={false}
                                                    style={{ transform: `scale(${asset.scale ?? 1})` }}
                                                    className="pointer-events-none h-full w-full object-contain lg:p-0"
                                                />
                                            ) : renderFallback(tool, 'h-9 w-9 pointer-events-none lg:h-14 lg:w-14')}
                                            <span className="hidden min-w-0 line-clamp-2 text-left text-[9px] font-medium leading-[1.25] text-slate-600 lg:block">{label}</span>
                                            <GripVertical className="absolute right-0.5 top-1 h-3 w-3 text-slate-400" aria-hidden="true" />
                                        </button>
                                    )
                                })
                        ) : visibleInventoryKind === 'target' ? (
                            availableTargets.map((target) => {
                                const isTapSelected = tapSelected?.kind === 'target' && tapSelected.id === target
                                return (
                                    <button
                                        key={target}
                                        type="button"
                                        aria-label={`Chọn ${targetNames[target] || target}`}
                                        aria-pressed={isTapSelected}
                                        disabled={disabled}
                                        onPointerDown={(event) => beginDrag(event, target, 'target')}
                                        onPointerMove={moveDrag}
                                        onPointerUp={finishDrag}
                                        onPointerCancel={cancelDrag}
                                        onClick={() => handleItemClick(target, 'target')}
                                        className={`relative flex h-16 min-w-32 snap-start touch-pan-x items-center gap-2 bg-transparent px-2 text-left transition-[transform,background-color] hover:bg-amber-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:h-[72px] lg:h-auto lg:min-h-[96px] lg:min-w-0 lg:touch-none lg:rounded-md lg:bg-amber-50 ${isTapSelected ? 'bg-amber-50 ring-2 ring-amber-500 ring-inset' : ''}`}
                                    >
                                        {renderTarget(target, 'h-14 w-14 shrink-0 lg:h-16 lg:w-16')}
                                        <span className="line-clamp-2 text-[9px] font-medium leading-[1.25] text-slate-600">{targetNames[target] || target}</span>
                                        <GripVertical className="ml-auto h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                                    </button>
                                )
                            })
                        ) : (
                            <p className="w-full text-center text-[10px] text-slate-400">Nhóm này không còn dụng cụ.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex min-h-8 items-center justify-between gap-2 px-3 py-1 text-[11px] text-slate-500 sm:px-0 lg:mr-[300px]" aria-live="polite">
                <p className="min-w-0 text-pretty">
                    {tapSelected
                        ? `Đã chọn ${tapSelected.kind === 'tool' ? toolNames[tapSelected.id]?.vi || tapSelected.id : targetNames[tapSelected.id] || tapSelected.id}. Chạm vùng thao tác để đặt.`
                        : stage === 1
                            ? placedTools.length > 0 ? 'Tiếp tục chọn đủ dụng cụ, hoặc trả lại để đổi.' : 'Kéo dụng cụ cần dùng lên bàn.'
                            : stage === 2
                                ? placedTarget ? 'Đã chọn chi tiết. Bạn có thể trả lại để đổi.' : 'Kéo chi tiết cần thao tác lên bàn.'
                                : requiresTarget ? 'Dụng cụ và chi tiết đã sẵn sàng.' : 'Dụng cụ đã sẵn sàng để thao tác.'}
                </p>
                {placedTools.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => onRemove(placedTools[placedTools.length - 1])}
                        className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        Trả lại
                    </button>
                ) : null}
                {placedTarget ? (
                    <button type="button" onClick={onRemoveTarget} className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1.5 font-semibold text-amber-700 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        Trả chi tiết
                    </button>
                ) : null}
            </div>

            {drag ? (
                <div
                    ref={floatingRef}
                    className="pointer-events-none fixed left-0 top-0 z-[100] grid h-[90px] w-[90px] place-items-center rounded-2xl bg-white/95 shadow-2xl will-change-transform motion-reduce:transition-none"
                    aria-hidden="true"
                >
                    {drag.kind === 'target' ? renderTarget(drag.id, 'h-16 w-16') : TOOL_ASSETS[drag.id] ? (
                        <Image src={TOOL_ASSETS[drag.id].src} alt="" width={84} height={84} draggable={false} className="h-full w-full object-contain p-2" />
                    ) : renderFallback(drag.id, 'h-16 w-16')}
                </div>
            ) : null}
        </section>
    )
}
