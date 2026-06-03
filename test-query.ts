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
            question_bank_id,
            order_index,
            question_bank (*, question_categories(shuffle_options))
        `)
        .limit(1)
        
    console.log(JSON.stringify(res, null, 2))
}
test()
