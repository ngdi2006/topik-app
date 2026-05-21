const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('exam_attempts').select('id, user_id, exam_id, is_free_attempt, credits_used, started_at, completed_at, score, created_at, status, questions_snapshot, attempt_number').limit(1);
    console.log("EXAM_ATTEMPTS FETCH:", { error: error?.message, data });
}

check();
