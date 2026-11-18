export type TextbookKind = "course" | "workbook" | "vocabulary" | "grammar" | "culture"

export const referenceBookCodes = [
  "eps-topik-2025-vocabulary-1", "eps-topik-2025-vocabulary-2", "eps-topik-2025-grammar-1",
  "eps-topik-2025-culture-1", "eps-topik-2025-culture-2",
] as const

export function textbookKind(book: { code: string }): TextbookKind {
  if (book.code.includes("-workbook-")) return "workbook"
  if (/^eps-topik-2025-vocabulary-[12]$/.test(book.code)) return "vocabulary"
  if (book.code === "eps-topik-2025-grammar-1") return "grammar"
  if (/^eps-topik-2025-culture-[12]$/.test(book.code)) return "culture"
  return "course"
}

export const textbookKindLabels: Record<TextbookKind, string> = {
  course: "Giáo trình", workbook: "Sách bài tập", vocabulary: "Từ vựng",
  grammar: "Ngữ pháp tổng hợp", culture: "Thông tin văn hóa",
}

export function isReferenceBook(book: { code: string }): boolean {
  const kind = textbookKind(book)
  return kind === "vocabulary" || kind === "grammar" || kind === "culture"
}
