import type { WorkshopAction, WorkshopActionId } from './model'

const actions: WorkshopAction[] = [
    { id: 'tighten', nameKo: '조이다', nameVi: 'Siết', legacyIds: ['clockwise'] },
    { id: 'loosen', nameKo: '풀다', nameVi: 'Tháo / nới', legacyIds: ['counter_clockwise'] },
    { id: 'cut', nameKo: '자르다 / 절단하다', nameVi: 'Cắt' },
    { id: 'hammer', nameKo: '박다', nameVi: 'Đóng' },
    { id: 'bend', nameKo: '구부리다', nameVi: 'Uốn' },
    { id: 'measure', nameKo: '재다 / 측정하다', nameVi: 'Đo' },
    { id: 'weigh', nameKo: '무게를 재다', nameVi: 'Cân' },
    { id: 'grind', nameKo: '갈다 / 연마하다', nameVi: 'Mài' },
    { id: 'plane', nameKo: '대패질하다', nameVi: 'Bào' },
    { id: 'carve', nameKo: '파내다 / 도려내다', nameVi: 'Đẽo' },
    { id: 'shave', nameKo: '깎다', nameVi: 'Gọt' },
    { id: 'smooth', nameKo: '다듬다 / 샌딩하다', nameVi: 'Làm nhẵn' },
    { id: 'operate_machine', nameKo: '기계 작동을 제어하다', nameVi: 'Vận hành máy' },
    { id: 'pull', nameKo: '당기다', nameVi: 'Kéo' },
    { id: 'pull_out', nameKo: '뽑다', nameVi: 'Nhổ ra' },
    { id: 'clamp_tight', nameKo: '단단히 조이다', nameVi: 'Kẹp chặt' },
    { id: 'pull_lever', nameKo: '레버를 당기다', nameVi: 'Kéo ra' },
    { id: 'drill', nameKo: '구멍을 뚫다', nameVi: 'Khoan' },
    { id: 'paint', nameKo: '칠하다', nameVi: 'Sơn' },
    { id: 'sand', nameKo: '샌딩하다', nameVi: 'Chà nhám' },
    { id: 'clamp', nameKo: '고정하다', nameVi: 'Kẹp / cố định' },
    { id: 'insert', nameKo: '끼우다', nameVi: 'Lắp vào' },
    { id: 'remove', nameKo: '분리하다', nameVi: 'Tháo ra' },
    { id: 'put_into', nameKo: '넣다', nameVi: 'Cho vào', legacyIds: ['push'] },
    { id: 'take_out', nameKo: '꺼내다', nameVi: 'Lấy ra' },
]

export const WORKSHOP_ACTIONS = Object.freeze(actions)
export const WORKSHOP_ACTION_REGISTRY = new Map(actions.map((action) => [action.id, action]))

const legacyActionMap = new Map<string, WorkshopActionId>()
for (const action of actions) {
    legacyActionMap.set(action.id, action.id)
    for (const legacyId of action.legacyIds || []) legacyActionMap.set(legacyId, action.id)
}

export function resolveWorkshopActionId(id?: string | null) {
    return id ? legacyActionMap.get(id) : undefined
}

export function getWorkshopAction(id?: string | null) {
    const resolved = resolveWorkshopActionId(id)
    return resolved ? WORKSHOP_ACTION_REGISTRY.get(resolved) : undefined
}
