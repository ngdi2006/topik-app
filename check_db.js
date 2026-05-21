const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('exams').select('id, title, is_free, free_attempts, credits_required').limit(1);
    console.log("EXAMS TABLE:", { data, error });

    const { data: cData, error: cError } = await supabase.from('user_exam_credits').select('*').limit(1);
    console.log("CREDITS TABLE:", { cData, cError });
}

check();
