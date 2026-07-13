const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ydrzamsfwvdwpxgqhtly.supabase.co';
const supabaseServiceKey = 'sb_secret_DgSgaPRDfKDLOj9VDkOFpg_f40yLdjX';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    const { data, error } = await supabase
        .from('interview_questions')
        .select('id, category, question_text, vietnamese_meaning');

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    console.log(`Total records: ${data.length}`);
    const counts = {};
    data.forEach(q => {
        counts[q.category] = (counts[q.category] || 0) + 1;
    });
    console.log("Counts per category:", counts);
}

main().catch(console.error);
