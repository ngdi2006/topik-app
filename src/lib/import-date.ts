export type NormalizedImportDate = { value: string | null; error?: string }

const formatUtcDate = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`

const validParts = (year: number, month: number, day: number): string | null => {
  if (year < 1900 || year > new Date().getFullYear() || month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? formatUtcDate(date)
    : null
}

/** Normalize Excel serial dates and Vietnamese/ISO date strings for Postgres DATE. */
export function normalizeImportDate(raw: unknown): NormalizedImportDate {
  if (raw === undefined || raw === null || String(raw).trim() === '') return { value: null }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const value = validParts(raw.getFullYear(), raw.getMonth() + 1, raw.getDate())
    return value ? { value } : { value: null, error: 'Ngày sinh không hợp lệ' }
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const excelDate = new Date(Date.UTC(1899, 11, 30) + Math.floor(raw) * 86_400_000)
    const value = validParts(excelDate.getUTCFullYear(), excelDate.getUTCMonth() + 1, excelDate.getUTCDate())
    return value ? { value } : { value: null, error: 'Ngày sinh Excel không hợp lệ' }
  }

  const text = String(raw).trim()
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text)
  if (match) {
    const value = validParts(Number(match[1]), Number(match[2]), Number(match[3]))
    return value ? { value } : { value: null, error: `Ngày sinh không hợp lệ: ${text}` }
  }

  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text)
  if (match) {
    const value = validParts(Number(match[3]), Number(match[2]), Number(match[1]))
    return value ? { value } : { value: null, error: `Ngày sinh không hợp lệ: ${text}` }
  }

  return { value: null, error: `Ngày sinh phải có dạng DD/MM/YYYY hoặc YYYY-MM-DD: ${text}` }
}
