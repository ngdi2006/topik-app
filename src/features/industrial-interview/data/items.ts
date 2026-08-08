import type { IndustrialItem } from "../types";

export const industrialItems: IndustrialItem[] = [
  { id: "wrench", kind: "tool", koreanName: "스패너", vietnameseName: "Cờ lê" },
  { id: "adjustable-wrench", kind: "tool", koreanName: "몽키 스패너", vietnameseName: "Mỏ lết" },
  { id: "pliers", kind: "tool", koreanName: "펜치", vietnameseName: "Kìm" },
  { id: "hammer", kind: "tool", koreanName: "망치", vietnameseName: "Búa" },
  { id: "phillips-screwdriver", kind: "tool", koreanName: "십자드라이버", vietnameseName: "Tua vít bake" },
  { id: "flat-screwdriver", kind: "tool", koreanName: "일자드라이버", vietnameseName: "Tua vít dẹt" },
  { id: "tape-measure", kind: "tool", koreanName: "줄자", vietnameseName: "Thước dây" },
  { id: "nut", kind: "object", koreanName: "너트", vietnameseName: "Đai ốc" },
  { id: "washer", kind: "object", koreanName: "와셔", vietnameseName: "Vòng đệm" },
  { id: "bolt", kind: "object", koreanName: "볼트", vietnameseName: "Bu lông dự phòng" },
];

export const itemById = new Map(industrialItems.map((item) => [item.id, item]));
