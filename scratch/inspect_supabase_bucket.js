const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ydrzamsfwvdwpxgqhtly.supabase.co';
const supabaseServiceKey = 'sb_secret_DgSgaPRDfKDLOj9VDkOFpg_f40yLdjX';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Listing files in question-media bucket under vocab-vong2/ starting with vocab_5 ...');
    const { data, error } = await supabase.storage
        .from('question-media')
        .list('vocab-vong2', {
            limit: 200,
            search: 'vocab_5'
        });

    if (error) {
        console.error('Error listing storage:', error);
        return;
    }

    console.log('Total vocab_5 files:', data.length);
    data.forEach((file, idx) => {
        console.log(`${idx + 1}. Name: "${file.name}" | Size: ${file.metadata?.size || 'unknown'} bytes`);
    });
}

run().catch(console.error);
