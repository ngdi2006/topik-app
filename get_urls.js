import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase
    .from('question_bank')
    .select('id, question_type, audio_url')
    .eq('question_type', 'listening')
    .limit(10)

  if (error) {
    console.error('Error fetching:', error)
  } else {
    console.log('Sample audio URLs:', JSON.stringify(data, null, 2))
  }
}

main()
