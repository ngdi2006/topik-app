import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
dotenv.config({ path: ".env.local", quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const codes = ["eps-topik-2025-workbook-1", "eps-topik-2025-workbook-2"]
const { data, error } = await db.from("textbooks").update({ is_published: false, updated_at: new Date().toISOString() }).in("code", codes).select("id,code,is_published")
if (error) throw error
if (data.length !== 2) throw new Error("Expected two workbooks")
const units = await db.from("textbook_units").update({ is_published: false }).in("textbook_id", data.map(book => book.id))
if (units.error) throw units.error
console.log(JSON.stringify(data))
