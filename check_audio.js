import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase
    .from('question_bank')
    .select('id, section, question_text, audio_url')
    .ilike('question_text', '%다음을 듣고 질문에 알맞은 대답을 고르십시오%')
    .limit(5)

  if (error) {
    console.error('Error fetching:', error)
  } else {
    console.log('Found question:', JSON.stringify(data, null, 2))
  }
}

main()
