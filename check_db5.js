const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
    const json = await res.json();
    const schemas = json.definitions || (json.components && json.components.schemas) || {};
    console.log(JSON.stringify(schemas.exam_attempts, null, 2));
}

check();
