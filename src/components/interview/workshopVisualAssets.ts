import toolMetadata from '../../../DATA-EPS/img/metadata_tools.json'

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

const TOOL_IMAGE_BY_ID = new Map<string, string>(
    toolMetadata.map((item) => [
        TOOL_IDS_BY_NUMBER[item.id - 1],
        `/assets/workshop/tools/game-v2/${item.filename}`,
    ]),
)

// The game uses annotated screwdriver images so their tips remain clear on mobile.
TOOL_IMAGE_BY_ID.set('flat_screwdriver', '/assets/workshop/tools/game-v2/02_tuavitdet_iljadriver_marked.png')
TOOL_IMAGE_BY_ID.set('phillips_screwdriver', '/assets/workshop/tools/game-v2/03_tuavitchuthap_sipjadriver_marked.png')
TOOL_IMAGE_BY_ID.set('control_panel', '/assets/workshop/tools/game-v2/control_panel.png')
TOOL_IMAGE_BY_ID.set('lathe_machine', '/assets/workshop/tools/game-v2/lathe_machine.png')
TOOL_IMAGE_BY_ID.set('milling_machine', '/assets/workshop/tools/game-v2/milling_machine.png')
TOOL_IMAGE_BY_ID.set('press_machine', '/assets/workshop/tools/game-v2/press_machine.png')
TOOL_IMAGE_BY_ID.set('lever', '/assets/workshop/details-v2/lever.png')

const TOOL_ALIASES: Record<string, string> = {
    pan_scale: 'scale',
    industrial_scale: 'electronic_scale',
    digital_scale: 'electronic_scale',
    level: 'spirit_level',
    cutting_machine: 'electric_cutter',
    flathead_screwdriver: 'flat_screwdriver',
    open_end_wrench: 'wrench',
    combination_pliers: 'pliers',
    diagonal_cutters: 'nipper',
    hex_key: 'allen_wrench',
    metal_file: 'hand_file',
    cold_chisel: 'metal_chisel',
    scriber: 'marking_needle',
    bench_vise: 'vise',
    c_clamp: 'clamp',
}

const DETAIL_IMAGE_BY_ID: Record<string, string> = {
    temperature_controller: 'temperature_controller.png',
    pressure_regulator: 'pressure_regulator.png',
    pressure_gauge: 'pressure_regulator.png',
    wood_screw: 'phillips_screw.png',
    screw: 'phillips_screw.png',
    male_thread_bolt: 'male_thread_bolt.png',
    female_thread_nut: 'female_thread_nut.png',
    nut: 'female_thread_nut.png',
    bolt: 'male_thread_bolt.png',
    hex_nut: 'female_thread_nut.png',
    welding_rod: 'welding_rod.png',
    saw_blade: 'saw_blade.png',
    cutting_blade_tool: 'saw_blade.png',
    nail: 'nail.png',
    hex_bolt: 'hex_bolt.png',
    phillips_screw: 'phillips_screw.png',
    slotted_screw: 'slotted_screw.png',
    bearing: 'bearing.png',
    gear: 'gear.png',
    coil_spring: 'coil_spring.png',
    electric_wire: 'electric_wire.png',
    metal_wire: 'metal_wire.png',
    metal_pipe: 'metal_pipe.png',
    wood_workpiece: 'wood_workpiece.png',
    metal_workpiece: 'metal_workpiece.png',
    plastic_workpiece: 'plastic_workpiece.png',
    marking_surface: 'marking_surface.png',
    measured_object: '/assets/workshop/tools/game-v2/measured_object.png',
    stone: '/assets/workshop/tools/game-v2/stone.png',
    rebar: '/assets/workshop/tools/game-v2/rebar.png',
    bolted_joint: '/assets/workshop/tools/game-v2/bolted_joint.png',
    cargo: '/assets/workshop/tools/game-v2/cargo.png',
    drilled_hole: '/assets/workshop/tools/game-v2/drilled_hole.png',
    hole: '/assets/workshop/tools/game-v2/drilled_hole.png',
    electric_circuit: '/assets/workshop/tools/game-v2/electric_circuit.png',
    flame: '/assets/workshop/tools/game-v2/flame.png',
    groove: '/assets/workshop/tools/game-v2/groove.png',
    inclined_surface: '/assets/workshop/tools/game-v2/inclined_surface.png',
    machine_control: '/assets/workshop/tools/game-v2/control_panel.png',
    packaged_product: '/assets/workshop/tools/game-v2/packaged_product.png',
    pressure_setting: '/assets/workshop/details-v2/pressure_regulator.png',
    raw_materials: '/assets/workshop/tools/game-v2/raw_materials.png',
    rusty_area: '/assets/workshop/tools/game-v2/rusty_area.png',
    temperature_setting: '/assets/workshop/details-v2/temperature_controller.png',
    water_surface: '/assets/workshop/tools/game-v2/water_surface.png',
    work_area: '/assets/workshop/tools/game-v2/work_area.png',
    workpiece: 'workpiece.png',
    clamped_workpiece: '/assets/workshop/tools/game-v2/clamped_workpiece.png',
    finish_surface: 'workpiece.png',
    processed_material: 'workpiece.png',
    weighed_item: '/assets/workshop/tools/game-v2/weighed_item_box.png',
    paint_can: 'paint_can.png',
    primer_can: 'primer_can.png',
    varnish_can: 'varnish_can.png',
    switch_power: 'switch_power.png',
    emergency_button: 'emergency_button.png',
    signal_light: 'signal_light.png',
    lever: 'lever.png',
    box: 'box.png',
    toolbox_center: 'box.png',
    special_box: 'box.png',
    shelf: 'shelf.png',
    shelf_top_left: 'shelf.png',
    shelf_bottom_left: 'shelf.png',
    shelf_top_right: 'shelf.png',
    shelf_bottom_right: 'shelf.png',
}

export function getWorkshopToolImage(toolId?: string | null) {
    if (!toolId) return null
    const direct = TOOL_IMAGE_BY_ID.get(TOOL_ALIASES[toolId] || toolId)
    if (direct) return direct
    const detail = getWorkshopDetailImage(toolId)
    if (detail) return detail
    return null
}

export function getWorkshopDetailImage(targetId?: string | null) {
    if (!targetId) return null
    const filename = DETAIL_IMAGE_BY_ID[targetId]
    if (!filename) return null
    return filename.startsWith('/') ? filename : `/assets/workshop/details-v2/${filename}`
}
