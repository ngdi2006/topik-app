const { createClient } = require('@supabase/supabase-js');
// Need to find env vars. Let's look for .env.local
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('milestones').select('id, level, qa_text');
    console.log(JSON.stringify(data, null, 2));
}
check();
