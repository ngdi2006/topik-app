const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { error } = await supabase.from('exam_attempts').select('questions_snapshot, attempt_number, status, started_at, completed_at, score, created_at').limit(1);
    console.log("EXAM_ATTEMPTS MISSING COLUMNS:", error?.message);
}

check();
