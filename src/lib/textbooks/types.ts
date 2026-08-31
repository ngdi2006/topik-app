export type TextbookUnit = {
  id: string
  unit_number: number
  title_ko: string | null
  title_vi: string | null
  start_page: number
  end_page: number
  sort_order: number
}

export type TextbookSummary = {
  id: string
  code: string
  title_ko: string
  title_vi: string
  volume: number
  edition: string
  total_pages: number
  coverUrl: string | null
  units: TextbookUnit[]
  progress: { last_page: number; progress_percent: number } | null
}

export type TextbookPagePayload = {
  page_number: number
  imageUrl: string
  width: number | null
  height: number | null
  ocr_text: string | null
  ocr_payload: Record<string, unknown>
}
