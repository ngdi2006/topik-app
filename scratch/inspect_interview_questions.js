const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ydrzamsfwvdwpxgqhtly.supabase.co';
const supabaseServiceKey = 'sb_secret_DgSgaPRDfKDLOj9VDkOFpg_f40yLdjX';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    const { data, error } = await supabase
        .from('interview_questions')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching:", error.message);
        return;
    }
    console.log("Keys in interview_questions table:", Object.keys(data[0]));
    console.log("Full record preview:", data[0]);
}

run();
