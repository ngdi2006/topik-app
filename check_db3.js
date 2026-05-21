const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // We can use an RPC if one exists, but without it, let's just use pg.
    // Wait, let's just select * from exam_attempts to see what columns exist.
    const { data, error } = await supabase.from('exam_attempts').select('*').limit(1);
    console.log("EXAM_ATTEMPTS ALL COLUMNS:", { data, error });
}

check();
