const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Data:", data);
  console.log("Error:", error);
}

checkSchema();
