'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, GripVertical, RotateCcw, Trash2 } from 'lucide-react'
import toolMetadata from '../../../DATA-EPS/img/metadata_tools.json'

type ToolGroup = 'Tháo lắp' | 'Kìm & cắt' | 'Đo kiểm' | 'Gia công' | 'Sơn & hoàn thiện'

type ToolAsset = {
    src: string
    group: ToolGroup
    scale?: number
}

const TOOL_GROUP_ORDER: ToolGroup[] = ['Tháo lắp', 'Kìm & cắt', 'Đo kiểm', 'Gia công', 'Sơn & hoàn thiện']
const SCREWDRIVER_TIP_TOOLS = new Set(['flat_screwdriver', 'phillips_screwdriver'])

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
            src: `/assets/workshop/tools/game-v2/${item.filename}`,
            group: groupForToolNumber(item.id),
        },
    ]),
)

const CURATED_TOOL_ASSETS: Record<string, ToolAsset> = {
    screwdriver: { src: '/assets/workshop/tools/game-v2/01_tuavit_driver.png', group: 'Tháo lắp' },
    flat_screwdriver: { src: '/assets/workshop/tools/game-v2/02_tuavitdet_iljadriver_marked.png', group: 'Tháo lắp' },
    phillips_screwdriver: { src: '/assets/workshop/tools/game-v2/03_tuavitchuthap_sipjadriver_marked.png', group: 'Tháo lắp' },
    pliers: { src: '/assets/workshop/tools/game-v2/04_kimmonhon_pliers.png', group: 'Kìm & cắt', scale: 0.84 },
    long_nose_pliers: { src: '/assets/workshop/tools/game-v2/05_kimmuidai_longnosepliers.png', group: 'Kìm & cắt', scale: 1.12 },
    pincers: { src: '/assets/workshop/tools/game-v2/06_kimbam_penchi.png', group: 'Kìm & cắt', scale: 1.06 },
    nipper: { src: '/assets/workshop/tools/game-v2/07_kimcat_nipper.png', group: 'Kìm & cắt', scale: 0.7 },
    bolt_cutter: { src: '/assets/workshop/tools/game-v2/25_kimcongluc_jeoldangi.png', group: 'Kìm & cắt', scale: 0.94 },
    socket_wrench: { src: '/assets/workshop/tools/game-v2/08_cole_daukhau_socketwrench.png', group: 'Tháo lắp', scale: 1.08 },
    socket: { src: '/assets/workshop/tools/game-v2/09_daukhau_socket.png', group: 'Tháo lắp', scale: 1.08 },
    wrench: { src: '/assets/workshop/tools/game-v2/10_cole_spanner.png', group: 'Tháo lắp' },
    adjustable_wrench: { src: '/assets/workshop/tools/game-v2/11_molet_monkeyspanner.png', group: 'Tháo lắp' },
    torque_wrench: { src: '/assets/workshop/tools/game-v2/12_coleluc_torquewrench.png', group: 'Tháo lắp' },
    allen_wrench: { src: '/assets/workshop/tools/game-v2/13_khoalucgiac_hexwrench.png', group: 'Tháo lắp', scale: 1.16 },
    pipe_wrench: { src: '/assets/workshop/tools/game-v2/14_moletrang_pipewrench.png', group: 'Tháo lắp' },
    bearing_puller: { src: '/assets/workshop/tools/game-v2/15_caobacdan_puller.png', group: 'Tháo lắp' },
    ruler: { src: '/assets/workshop/tools/game-v2/26_thuoc_ja.png', group: 'Đo kiểm' },
    hammer: { src: '/assets/workshop/tools/game-v2/17_bua_mangchi.png', group: 'Gia công' },
    claw_hammer: { src: '/assets/workshop/tools/game-v2/18_buanhodinh_jangdori.png', group: 'Gia công' },
    hand_plane: { src: '/assets/workshop/tools/game-v2/29_caibao_daepae.png', group: 'Gia công' },
    spirit_level: { src: '/assets/workshop/tools/game-v2/16_thuocthuy_sujungi.png', group: 'Đo kiểm' },
    hand_file: { src: '/assets/workshop/tools/game-v2/20_dua_jul.png', group: 'Gia công' },
    saw: { src: '/assets/workshop/tools/game-v2/19_cuasat_soetop.png', group: 'Gia công' },
    paint_brush: { src: '/assets/workshop/tools/game-v2/36_coson_but.png', group: 'Sơn & hoàn thiện' },
    paint_roller: { src: '/assets/workshop/tools/game-v2/37_conlanson_roller.png', group: 'Sơn & hoàn thiện' },
    spray_gun: { src: '/assets/workshop/tools/game-v2/41_sungphunson_spraygun.png', group: 'Sơn & hoàn thiện' },
    rust_preventive_oil: { src: '/assets/workshop/tools/game-v2/43_dauchonggi_bangcheongyu.png', group: 'Sơn & hoàn thiện' },
    welder: { src: '/assets/workshop/tools/game-v2/57_mayhanco2_co2yongjeopgi.png', group: 'Gia công' },
    scale: { src: '/assets/workshop/tools/game-v2/60_candia_jeopsijeoul.png', group: 'Đo kiểm' },
    pan_scale: { src: '/assets/workshop/tools/game-v2/60_candia_jeopsijeoul.png', group: 'Đo kiểm' },
    electronic_scale: { src: '/assets/workshop/tools/game-v2/61_candientu_jeonjajeoul.png', group: 'Đo kiểm' },
    industrial_scale: { src: '/assets/workshop/tools/game-v2/61_candientu_jeonjajeoul.png', group: 'Đo kiểm' },
    lathe_machine: { src: '/assets/workshop/tools/game-v2/71_maytien_lathe_machine.png', group: 'Gia công' },
    milling_machine: { src: '/assets/workshop/tools/game-v2/72_mayphay_milling_machine.png', group: 'Gia công' },
    drill: { src: '/assets/workshop/tools/game-v2/53_khoandien_jeongidrill.png', group: 'Gia công' },
    switch_tool: { src: '/assets/workshop/tools/game-v2/68_bangdieukhien_controlpanel.png', group: 'Đo kiểm' },
}

const TOOL_ASSETS: Record<string, ToolAsset> = {
    ...METADATA_TOOL_ASSETS,
    ...CURATED_TOOL_ASSETS,
    pan_scale: METADATA_TOOL_ASSETS.scale,
    industrial_scale: METADATA_TOOL_ASSETS.electronic_scale,
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
    actionPanel?: ReactNode
    renderFallback: (tool: string, className: string) => ReactNode
    renderTarget: (target: string, className: string) => ReactNode
    onPlace: (tool: string) => void
    onRemove: (tool: string) => void
    onPlaceTarget: (target: string) => void
    onRemoveTarget: () => void
}

type InventoryKind = 'tool' | 'target'
type DragState = { id: string; kind: InventoryKind; origin: 'inventory' | 'table' } | null

const SLOT_POSITIONS = [
    { left: '22%', top: '53%', rotate: '-5deg' },
    { left: '37%', top: '52%', rotate: '4deg' },
    { left: '51%', top: '53%', rotate: '-2deg' },
    { left: '65%', top: '52%', rotate: '5deg' },
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
    actionPanel,
    renderFallback,
    renderTarget,
    onPlace,
    onRemove,
    onPlaceTarget,
    onRemoveTarget,
}: Props) {
    const dropZoneRef = useRef<HTMLButtonElement | null>(null)
    const trashZoneRef = useRef<HTMLDivElement | null>(null)
    const floatingRef = useRef<HTMLDivElement | null>(null)
    const pointRef = useRef({ x: 0, y: 0 })
    const frameRef = useRef<number | null>(null)
    const movedRef = useRef(false)
    const dragRef = useRef<DragState>(null)
    const inventoryScrollRef = useRef<HTMLDivElement | null>(null)
    const previousBodyOverflowRef = useRef('')
    const [drag, setDrag] = useState<DragState>(null)
    const [isOverDropZone, setIsOverDropZone] = useState(false)
    const [isOverTrashZone, setIsOverTrashZone] = useState(false)
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
    const isDropZonePrompted = Boolean(drag || tapSelected || isDropZoneFocused)

    useEffect(() => {
        inventoryScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
    }, [activeGroup, visibleInventoryKind])

    const scrollInventory = (direction: -1 | 1) => {
        const container = inventoryScrollRef.current
        if (!container) return
        container.scrollBy({
            left: direction * Math.max(220, container.clientWidth * 0.75),
            behavior: 'smooth',
        })
    }

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
        // Keep the visible outline precise, but make the touch target more
        // forgiving on phones by accepting the full visible table area.
        const insideTableTouchArea = pointX >= 0.03 && pointX <= 0.97 && pointY >= 0.49 && pointY <= 0.72
        return inside || insideTableTouchArea
    }

    const isPointInTrashZone = (x: number, y: number) => {
        const rect = trashZoneRef.current?.getBoundingClientRect()
        return Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
    }

    const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string, kind: InventoryKind, origin: 'inventory' | 'table' = 'inventory') => {
        if (disabled) return
        event.preventDefault()
        try {
            event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
            // Older iOS versions can reject pointer capture during a fast touch.
        }
        movedRef.current = false
        const nextDrag = { id, kind, origin }
        dragRef.current = nextDrag
        setDrag(nextDrag)
        updateFloatingPosition(event.clientX, event.clientY)
    }

    const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const activeDrag = dragRef.current
        if (!activeDrag) return
        event.preventDefault()
        movedRef.current = true
        updateFloatingPosition(event.clientX, event.clientY)
        if (activeDrag.origin === 'table') {
            const nextIsOverTrash = isPointInTrashZone(event.clientX, event.clientY)
            setIsOverTrashZone((current) => current === nextIsOverTrash ? current : nextIsOverTrash)
            return
        }
        const nextIsOver = isPointInDropZone(event.clientX, event.clientY)
        setIsOverDropZone((current) => current === nextIsOver ? current : nextIsOver)
    }

    const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const activeDrag = dragRef.current
        if (!activeDrag) return
        event.preventDefault()
        if (activeDrag.origin === 'table') {
            if (isPointInTrashZone(event.clientX, event.clientY)) {
                if (activeDrag.kind === 'tool') onRemove(activeDrag.id)
                else onRemoveTarget()
            }
            dragRef.current = null
            setIsOverTrashZone(false)
            setDrag(null)
            return
        }
        const shouldPlace = isPointInDropZone(event.clientX, event.clientY)
        if (shouldPlace) {
            if (activeDrag.kind === 'tool') onPlace(activeDrag.id)
            else onPlaceTarget(activeDrag.id)
        }
        dragRef.current = null
        setIsOverDropZone(false)
        setIsOverTrashZone(false)
        setDrag(null)
    }

    const cancelDrag = () => {
        dragRef.current = null
        setIsOverDropZone(false)
        setIsOverTrashZone(false)
        setDrag(null)
    }

    useEffect(() => {
        if (drag?.origin !== 'table') return

        const handleWindowPointerMove = (event: PointerEvent) => {
            if (!dragRef.current || dragRef.current.origin !== 'table') return
            if (event.cancelable) event.preventDefault()
            movedRef.current = true
            updateFloatingPosition(event.clientX, event.clientY)
            const nextIsOverTrash = isPointInTrashZone(event.clientX, event.clientY)
            setIsOverTrashZone((current) => current === nextIsOverTrash ? current : nextIsOverTrash)
        }

        const handleWindowPointerEnd = (event: PointerEvent) => {
            const activeDrag = dragRef.current
            if (!activeDrag || activeDrag.origin !== 'table') return
            if (isPointInTrashZone(event.clientX, event.clientY)) {
                if (activeDrag.kind === 'tool') onRemove(activeDrag.id)
                else onRemoveTarget()
            }
            dragRef.current = null
            setIsOverTrashZone(false)
            setDrag(null)
        }

        window.addEventListener('pointermove', handleWindowPointerMove, { passive: false })
        window.addEventListener('pointerup', handleWindowPointerEnd)
        window.addEventListener('pointercancel', handleWindowPointerEnd)
        return () => {
            window.removeEventListener('pointermove', handleWindowPointerMove)
            window.removeEventListener('pointerup', handleWindowPointerEnd)
            window.removeEventListener('pointercancel', handleWindowPointerEnd)
        }
    }, [drag, onRemove, onRemoveTarget])

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
            <div data-tour="operation-zone" className="relative mx-auto mb-[206px] aspect-square w-full overflow-visible bg-slate-100 overscroll-contain sm:mb-[222px] sm:rounded-lg lg:mb-0">
                <Image
                    src="/assets/workshop/scenes/interview-table-v2.png"
                    alt="Bàn thi thực hành trước mặt giám khảo"
                    width={1254}
                    height={1254}
                    draggable={false}
                    className="absolute inset-0 h-full w-full select-none rounded-lg object-contain"
                />

                <div className={`pointer-events-none absolute right-[6%] top-[62%] z-20 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white transition-[background-color,box-shadow,transform] duration-200 sm:right-[7%] sm:top-[61.5%] sm:text-[10px] ${
                    isOverDropZone
                        ? 'scale-105 bg-emerald-600 shadow-[0_0_18px_rgba(16,185,129,0.75)]'
                        : isDropZonePrompted
                            ? 'bg-blue-600 shadow-[0_0_16px_rgba(59,130,246,0.65)]'
                            : 'bg-blue-950/80 shadow-sm'
                }`}>
                    {isOverDropZone ? 'Thả vào đây' : 'Vùng thao tác'}
                </div>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                    aria-hidden="true"
                >
                    <polygon
                        points={TABLE_SVG_POINTS}
                        className="transition-[fill,stroke,stroke-width,filter] duration-200"
                        fill={isOverDropZone ? 'rgba(16, 185, 129, 0.3)' : isDropZonePrompted ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.035)'}
                        stroke={isOverDropZone ? '#34d399' : isDropZonePrompted ? '#60a5fa' : 'rgba(255, 255, 255, 0.58)'}
                        strokeWidth={isOverDropZone ? 1.15 : isDropZonePrompted ? 0.8 : 0.35}
                        strokeDasharray={isDropZonePrompted ? undefined : '1.4 1.2'}
                        style={{ filter: isOverDropZone ? 'drop-shadow(0 0 7px rgba(52, 211, 153, 0.95))' : isDropZonePrompted ? 'drop-shadow(0 0 5px rgba(96, 165, 250, 0.8))' : 'none' }}
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

                <div className="pointer-events-none absolute inset-0 z-20">
                    {placedTools.map((tool, index) => {
                        const asset = TOOL_ASSETS[tool]
                        const slot = SLOT_POSITIONS[index % SLOT_POSITIONS.length]
                        return (
                            <button
                                key={tool}
                                type="button"
                                disabled={disabled}
                                onPointerDown={(event) => beginDrag(event, tool, 'tool', 'table')}
                                onKeyDown={(event) => {
                                    if (event.key === 'Delete' || event.key === 'Backspace') onRemove(tool)
                                }}
                                aria-label={`Kéo ${toolNames[tool]?.vi || tool} vào thùng rác để chọn lại`}
                                title={`Giữ và kéo ${toolNames[tool]?.vi || tool} vào thùng rác`}
                                className={`group pointer-events-auto absolute grid h-[68px] w-[76px] -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-xl transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:pointer-events-none sm:h-[92px] sm:w-[102px] sm:cursor-grab sm:active:cursor-grabbing ${drag?.origin === 'table' && drag.kind === 'tool' && drag.id === tool ? 'opacity-15' : 'opacity-100'}`}
                                style={{ left: slot.left, top: slot.top, rotate: slot.rotate }}
                            >
                                <span className="absolute bottom-[8%] left-[12%] right-[12%] h-[15%] rounded-full bg-slate-950/30 blur-[5px] sm:blur-[7px]" />
                                {asset ? (
                                    <Image
                                        src={asset.src}
                                        alt=""
                                        width={102}
                                        height={92}
                                        draggable={false}
                                        className="relative z-10 h-full w-full object-contain drop-shadow-[0_5px_4px_rgba(15,23,42,0.28)]"
                                        style={{ transform: asset.scale ? `scale(${Math.min(asset.scale, 1.08)})` : undefined }}
                                    />
                                ) : <span className="relative z-10">{renderFallback(tool, 'h-16 w-16 sm:h-20 sm:w-20 drop-shadow-[0_5px_4px_rgba(15,23,42,0.28)]')}</span>}
                                <span className="absolute left-[4%] top-[2%] z-20 grid h-[18px] min-w-[18px] place-items-center rounded-full border border-white/80 bg-blue-600 px-1 text-[9px] font-bold text-white shadow-sm">
                                    {index + 1}
                                </span>
                            </button>
                        )
                    })}
                    {placedTarget ? (
                        <button
                            type="button"
                            disabled={disabled}
                            onPointerDown={(event) => beginDrag(event, placedTarget, 'target', 'table')}
                            onKeyDown={(event) => {
                                if (event.key === 'Delete' || event.key === 'Backspace') onRemoveTarget()
                            }}
                            aria-label={`Kéo ${targetNames[placedTarget] || placedTarget} vào thùng rác để chọn lại`}
                            title={`Giữ và kéo ${targetNames[placedTarget] || placedTarget} vào thùng rác`}
                            className={`group pointer-events-auto absolute left-[78%] top-[52.5%] grid h-[76px] w-[84px] -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-xl transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:pointer-events-none sm:h-[100px] sm:w-[110px] sm:cursor-grab sm:active:cursor-grabbing ${drag?.origin === 'table' && drag.kind === 'target' ? 'opacity-15' : 'opacity-100'}`}
                        >
                            <span className="absolute bottom-[7%] left-[13%] right-[13%] h-[15%] rounded-full bg-slate-950/30 blur-[5px] sm:blur-[7px]" />
                            <span className="relative z-10 grid h-full w-full place-items-center drop-shadow-[0_5px_4px_rgba(15,23,42,0.28)]">
                                {renderTarget(placedTarget, 'h-[70px] w-[70px] sm:h-[92px] sm:w-[92px]')}
                            </span>
                            <span className="absolute left-[2%] top-[2%] z-20 rounded-full border border-white/80 bg-amber-500 px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-wide text-white shadow-sm sm:text-[8px]">Chi tiết</span>
                        </button>
                    ) : null}
                </div>

                {drag?.origin === 'table' ? (
                    <div
                        ref={trashZoneRef}
                        className={`pointer-events-none absolute bottom-[5%] right-[5%] z-50 flex h-[82px] w-[82px] flex-col items-center justify-center text-center text-red-600 transition-[transform,color,filter] duration-150 sm:h-[96px] sm:w-[96px] ${
                            isOverTrashZone
                                ? 'scale-[1.15] text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]'
                                : 'drop-shadow-[0_2px_3px_rgba(255,255,255,0.95)]'
                        }`}
                        aria-hidden="true"
                    >
                        <Trash2 className={`h-8 w-8 sm:h-10 sm:w-10 ${isOverTrashZone ? 'animate-pulse' : ''}`} strokeWidth={2.4} />
                        <span className="mt-1 text-[8px] font-extrabold uppercase tracking-wide [text-shadow:0_1px_3px_rgba(255,255,255,0.95)] sm:text-[9px]">
                            {isOverTrashZone ? 'Thả để trả lại' : 'Kéo vào đây'}
                        </span>
                    </div>
                ) : null}

                {actionPanel && !drag ? (
                    <div className="absolute inset-x-[3%] bottom-[1.5%] z-30 mx-auto max-w-[620px] rounded-lg bg-white/55 p-1.5 shadow-[0_4px_14px_rgba(15,23,42,0.1)] backdrop-blur-lg sm:inset-x-[8%] sm:bottom-[2.5%] sm:rounded-xl sm:bg-white/60 sm:p-2.5">
                        {actionPanel}
                    </div>
                ) : null}

                <div className="absolute inset-x-[1.5%] top-[calc(100%+6px)] bottom-auto z-30 rounded-lg bg-white/55 px-2 py-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:inset-x-[2%] sm:px-2.5 sm:py-2 lg:bottom-0 lg:left-[calc(100%+16px)] lg:right-auto lg:top-0 lg:flex lg:h-full lg:w-[284px] lg:flex-col lg:bg-white/75 lg:p-3">
                    <div className="flex items-center gap-1 border-b border-slate-200/60 pb-1 lg:mb-2 lg:grid lg:grid-cols-2 lg:gap-1.5" role="tablist" aria-label="Loại vật thể">
                        <button type="button" role="tab" aria-selected={visibleInventoryKind === 'tool'} onClick={() => setInventoryKind('tool')} className={`min-h-8 rounded-md px-3 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${visibleInventoryKind === 'tool' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                            1. Dụng cụ <span className="opacity-70">{placedTools.length}</span>
                        </button>
                        {requiresTarget ? <button data-tour="target-tab" type="button" role="tab" aria-selected={visibleInventoryKind === 'target'} disabled={stage === 1} onClick={() => setInventoryKind('target')} className={`min-h-8 rounded-md px-3 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-40 ${visibleInventoryKind === 'target' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                            2. Chi tiết {placedTarget ? '✓' : ''}
                        </button> : null}
                        <span className="ml-auto px-2 text-[9px] font-semibold text-slate-400 lg:col-span-2 lg:ml-0 lg:text-center lg:text-[10px]">{stage === 1 ? 'Chọn đủ dụng cụ' : stage === 2 ? 'Chọn chi tiết' : 'Sẵn sàng thao tác'}</span>
                    </div>

                    {visibleInventoryKind === 'tool' ? <div data-tour="tool-groups" role="tablist" aria-label="Nhóm dụng cụ" className="mt-1 grid grid-cols-5 gap-0.5 border-b border-slate-200/60 py-1.5 lg:grid-cols-2 lg:gap-1 lg:py-2">
                        {groupedTools.map(([group]) => {
                            const isActive = activeGroup === group
                            return (
                                <button
                                    key={group}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls="active-tool-group"
                                    onClick={() => setRequestedGroup(group)}
                                    className={`inline-flex min-h-8 min-w-0 touch-manipulation items-center justify-center rounded-md px-1 py-1 text-center text-[7px] font-bold uppercase leading-[1.15] tracking-[0.02em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-[9px] lg:min-h-9 lg:px-2 lg:text-[9px] ${
                                        isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-transparent text-slate-500 hover:bg-slate-100/70 hover:text-slate-900'
                                    }`}
                                >
                                    {group}
                                </button>
                            )
                        })}
                    </div> : null}

                    <div className="relative lg:flex lg:min-h-0 lg:flex-1">
                        <div className="pointer-events-none absolute inset-x-[-3px] top-1/2 z-20 flex -translate-y-1/2 justify-between lg:hidden">
                            <button type="button" onClick={() => scrollInventory(-1)} aria-label="Xem các dụng cụ phía trước" className="pointer-events-auto grid h-7 w-7 place-items-center rounded-lg bg-white/75 text-slate-700 opacity-[0.62] shadow-sm ring-1 ring-slate-300/70 backdrop-blur-sm transition-[background-color,opacity,transform] hover:bg-white hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 active:opacity-100">
                                <ChevronLeft className="h-4 w-4" strokeWidth={3} />
                            </button>
                            <button type="button" onClick={() => scrollInventory(1)} aria-label="Xem thêm dụng cụ phía sau" className="pointer-events-auto grid h-7 w-7 place-items-center rounded-lg bg-white/75 text-slate-700 opacity-[0.62] shadow-sm ring-1 ring-slate-300/70 backdrop-blur-sm transition-[background-color,opacity,transform] hover:bg-white hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 active:opacity-100">
                                <ChevronRight className="h-4 w-4" strokeWidth={3} />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => scrollInventory(-1)}
                            aria-label="Xem các dụng cụ phía trước"
                            className="hidden"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div data-tour="tool-inventory" ref={inventoryScrollRef} id="active-tool-group" role="tabpanel" aria-label={visibleInventoryKind === 'tool' ? activeGroup || 'Dụng cụ' : 'Chi tiết cần thao tác'} className="flex min-h-[76px] w-full touch-pan-x snap-x snap-mandatory items-center gap-1.5 overflow-x-auto overscroll-x-contain pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:min-h-[84px] lg:grid lg:flex-1 lg:auto-rows-min lg:grid-cols-2 lg:content-start lg:items-stretch lg:gap-2 lg:overflow-y-auto lg:pt-3">
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
                                            className={`relative grid h-[68px] min-w-[68px] snap-start touch-none place-items-center rounded-md bg-white/45 p-1 transition-[transform,background-color,box-shadow] hover:bg-white/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-[76px] sm:min-w-[76px] lg:h-auto lg:min-h-[96px] lg:grid-cols-[68px_1fr] lg:justify-items-start lg:gap-1 lg:px-2 ${isTapSelected ? 'bg-blue-50 shadow-[inset_0_0_0_2px_rgb(59_130_246)]' : ''}`}
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
                                            {false && asset && SCREWDRIVER_TIP_TOOLS.has(tool) ? (
                                                <span
                                                    className="pointer-events-none absolute -bottom-1 -right-1 z-10 grid h-8 w-8 place-items-center overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-[0_3px_9px_rgba(15,23,42,0.24)] lg:hidden"
                                                    aria-hidden="true"
                                                >
                                                    <span
                                                        className="absolute inset-0 bg-no-repeat"
                                                        style={{
                                                            backgroundImage: `url(${asset.src})`,
                                                            backgroundPosition: '2% 91%',
                                                            backgroundSize: '360% 360%',
                                                        }}
                                                    />
                                                    <span className="absolute right-0 top-0 grid h-3.5 w-3.5 place-items-center rounded-full bg-blue-600 text-[9px] font-black leading-none text-white shadow-sm">
                                                        {tool === 'flat_screwdriver' ? '−' : '+'}
                                                    </span>
                                                </span>
                                            ) : null}
                                            <span className="hidden min-w-0 line-clamp-2 text-left text-[9px] font-medium leading-[1.25] text-slate-600 lg:block">{label}</span>
                                            <GripVertical className="absolute right-0.5 top-1 h-3 w-3 text-slate-400" aria-hidden="true" />
                                        </button>
                                    )
                                })
                        ) : visibleInventoryKind === 'target' ? (
                            availableTargets.map((target) => {
                                const isTapSelected = tapSelected?.kind === 'target' && tapSelected.id === target
                                const targetLabel = targetNames[target] || target
                                return (
                                    <button
                                        key={target}
                                        type="button"
                                        aria-label={`Chọn ${targetLabel}`}
                                        aria-pressed={isTapSelected}
                                        title={targetLabel}
                                        disabled={disabled}
                                        onPointerDown={(event) => beginDrag(event, target, 'target')}
                                        onPointerMove={moveDrag}
                                        onPointerUp={finishDrag}
                                        onPointerCancel={cancelDrag}
                                        onClick={() => handleItemClick(target, 'target')}
                                        className={`group relative grid h-[94px] min-w-[112px] snap-start touch-none grid-rows-[62px_1fr] place-items-center rounded-xl border bg-white px-2 pb-2 pt-1.5 text-center shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-[transform,border-color,background-color,box-shadow] hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:h-[104px] sm:min-w-[124px] sm:grid-rows-[70px_1fr] lg:h-auto lg:min-h-[130px] lg:min-w-0 lg:grid-rows-[82px_1fr] lg:px-2.5 lg:pb-3 ${isTapSelected ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500 ring-inset' : 'border-slate-200/90'}`}
                                    >
                                        <span className="grid h-[62px] w-[72px] place-items-center sm:h-[70px] sm:w-20 lg:h-[82px] lg:w-[92px]">
                                            {renderTarget(target, 'h-full w-full drop-shadow-[0_3px_4px_rgba(15,23,42,0.14)] transition-transform group-hover:scale-105')}
                                        </span>
                                        <span className="line-clamp-2 min-w-0 break-words text-[10px] font-semibold leading-[1.25] text-slate-700 lg:text-[11px]">{targetLabel}</span>
                                        <GripVertical className="absolute right-1.5 top-1.5 h-3 w-3 text-slate-300 group-hover:text-slate-400" aria-hidden="true" />
                                    </button>
                                )
                            })
                        ) : (
                            <p className="w-full text-center text-[10px] text-slate-400">Nhóm này không còn dụng cụ.</p>
                        )}
                        </div>
                        <button
                            type="button"
                            onClick={() => scrollInventory(1)}
                            aria-label="Xem thêm dụng cụ phía sau"
                            className="hidden"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
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
                    className={`pointer-events-none fixed left-0 top-0 z-[100] grid h-[90px] w-[90px] place-items-center will-change-transform motion-reduce:transition-none ${drag.origin === 'table' ? 'drop-shadow-[0_12px_10px_rgba(15,23,42,0.38)]' : 'rounded-2xl bg-white/95 shadow-2xl'}`}
                    aria-hidden="true"
                >
                    {drag.kind === 'target' ? renderTarget(drag.id, 'h-16 w-16') : TOOL_ASSETS[drag.id] ? (
                        <Image src={TOOL_ASSETS[drag.id].src} alt="" width={84} height={84} draggable={false} className={`h-full w-full object-contain ${drag.origin === 'table' ? '' : 'p-2'}`} />
                    ) : renderFallback(drag.id, 'h-16 w-16')}
                </div>
            ) : null}
        </section>
    )
}
