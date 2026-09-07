import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local" })
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: books, error } = await client.from("textbooks").select("id,volume,textbook_units(id,unit_number,start_page,end_page)").eq("is_published", true).order("volume")
if (error) throw error
console.log(`BOOKS=${books?.length ?? 0} UNITS=${books?.reduce((sum, book) => sum + book.textbook_units.length, 0) ?? 0}`)
for (const book of books ?? []) {
  for (const unit of book.textbook_units.filter((entry) => [1, 2, 31, 32].includes(entry.unit_number))) {
    const { data: pages, error: pageError } = await client.from("textbook_pages").select("page_number,ocr_text").eq("textbook_id", book.id).gte("page_number", unit.start_page).lte("page_number", unit.end_page).order("page_number")
    if (pageError) throw pageError
    const matches = (pages ?? []).filter((page) => /어휘|단어|Vocabulary/i.test(page.ocr_text ?? ""))
    console.log(`UNIT=${unit.unit_number} RANGE=${unit.start_page}-${unit.end_page} PAGES=${pages?.length ?? 0} VOCAB_PAGES=${matches.map((page) => page.page_number).join(",")}`)
    for (const page of matches.slice(0, 2)) console.log(`PAGE=${page.page_number}\n${(page.ocr_text ?? "").slice(0, 1200)}\n---`)
  }
}
