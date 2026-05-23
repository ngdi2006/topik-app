import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
    const { data } = await supabase
        .from('question_bank')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 499)
        
    const freeQuestions = data?.filter(q => q.tags && q.tags.some(t => t.toLowerCase() === 'free'))
    console.log('Free questions in top 500 newest:', freeQuestions?.length)
}

test()
