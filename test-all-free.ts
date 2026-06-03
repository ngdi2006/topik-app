import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const res = await supabase
        .from('exam_free_questions')
        .select(`
            exam_id,
            question_bank_id,
            question_type,
            question_bank (
                id,
                question_categories (
                    id,
                    shuffle_options
                )
            )
        `)
        
    console.log(JSON.stringify(res.data, null, 2))
}
test()
