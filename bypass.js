const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.rpc('get_policies'); // Supabase doesn't have this by default.
    // Instead we can query pg_policies using postgres if we had it.
    // But wait! We can bypass RLS using the adminClient in the API!
}

check();
