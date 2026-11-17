// Coordinates traced from the user's revised floor-3 plan (1018 × 600).
// Scale is illustrative: the source contains no physical dimensions.
export type FloorDoor = { edge: 'n' | 's' | 'e' | 'w'; from: number; to: number }
export type FloorRoom = {
  id: string; name: string; rect: [number, number, number, number]
  kind: 'classroom' | 'office' | 'service'; doors: FloorDoor[]
  platform?: [number, number, number, number]
}
export const FLOOR_SCALE = .04
export const floorPoint = (x: number, y: number): [number, number] => [(x - 509) * FLOOR_SCALE, (y - 300) * FLOOR_SCALE]
export const FLOOR_ROOMS: FloorRoom[] = [
  { id: '104', name: 'P.104', rect: [2, 4, 461, 151], kind: 'classroom', platform: [397, 4, 461, 151], doors: [{ edge: 's', from: 310, to: 370 }] },
  { id: '103', name: 'P.103', rect: [2, 151, 283, 298], kind: 'classroom', platform: [223, 151, 283, 258], doors: [{ edge: 'e', from: 259, to: 292 }] },
  { id: '101', name: 'P.101', rect: [2, 446, 283, 595], kind: 'classroom', platform: [223, 490, 283, 595], doors: [{ edge: 'e', from: 452, to: 486 }, { edge: 'n', from: 30, to: 78 }] },
  { id: 'marketing', name: 'P. Marketing / P. IT', rect: [2, 298, 102, 446], kind: 'office', doors: [{ edge: 's', from: 30, to: 78 }] },
  { id: 'academic', name: 'P. GĐ Chuyên môn', rect: [102, 298, 283, 446], kind: 'office', doors: [{ edge: 'e', from: 405, to: 440 }] },
  { id: 'director', name: 'P. Giám đốc', rect: [397, 151, 541, 298], kind: 'office', doors: [{ edge: 'w', from: 260, to: 292 }, { edge: 'n', from: 481, to: 523 }] },
  { id: 'deputy', name: 'P. Phó giám đốc', rect: [397, 298, 541, 446], kind: 'office', doors: [{ edge: 'w', from: 304, to: 340 }] },
  { id: 'storage', name: 'P. Kho', rect: [461, 4, 541, 151], kind: 'service', doors: [{ edge: 's', from: 481, to: 523 }] },
  { id: 'break', name: 'P. Nghỉ', rect: [541, 4, 642, 110], kind: 'service', doors: [{ edge: 's', from: 563, to: 621 }] },
  { id: '109', name: 'P.109', rect: [642, 4, 1016, 151], kind: 'classroom', platform: [642, 4, 713, 110], doors: [{ edge: 'w', from: 113, to: 146 }] },
  { id: '108', name: 'P.108', rect: [642, 151, 1016, 278], kind: 'classroom', platform: [642, 151, 713, 238], doors: [{ edge: 'w', from: 240, to: 273 }] },
  { id: '107', name: 'P.107', rect: [642, 278, 1016, 382], kind: 'classroom', platform: [642, 302, 713, 382], doors: [{ edge: 'w', from: 282, to: 316 }] },
]
export const FLOOR_BOUNDS = { left: -20.28, right: 20.28, top: -11.84, bottom: 11.8 }
export const FLOOR_SPAWN = floorPoint(790, 555)

export function floorDoorPoint(room: FloorRoom, door = room.doors[0]): [number, number] {
  const [x1, y1, x2, y2] = room.rect
  const middle = (door.from + door.to) / 2
  return floorPoint(door.edge === 'w' ? x1 : door.edge === 'e' ? x2 : middle, door.edge === 'n' ? y1 : door.edge === 's' ? y2 : middle)
}
