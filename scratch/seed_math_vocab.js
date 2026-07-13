const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ydrzamsfwvdwpxgqhtly.supabase.co';
const supabaseServiceKey = 'sb_secret_DgSgaPRDfKDLOj9VDkOFpg_f40yLdjX';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const jsonPath = path.join(__dirname, 'math_vocab.json');

async function seed() {
    console.log('Loading extracted MATH vocabulary items...');
    if (!fs.existsSync(jsonPath)) {
        console.error(`Error: JSON file not found at ${jsonPath}`);
        return;
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const records = JSON.parse(fileContent);
    console.log(`Found ${records.length} records in JSON.`);

    // Delete existing records with type = 'MATH' and industry = 'COMMON'
    console.log('Deleting existing COMMON MATH records to prepare clean state...');
    const { error: deleteError } = await supabase
        .from('vocabulary_vong2')
        .delete()
        .eq('industry', 'COMMON')
        .eq('type', 'MATH');

    if (deleteError) {
        console.error('Failed to clear existing records:', deleteError.message);
        return;
    }
    console.log('Cleaned target DB table records.');

    // Insert new records
    console.log(`Inserting ${records.length} new MATH records...`);
    const { data: insertData, error: insertError } = await supabase
        .from('vocabulary_vong2')
        .insert(records)
        .select();

    if (insertError) {
        console.error('Insert failed:', insertError.message);
    } else {
        console.log(`Successfully seeded ${insertData.length} MATH records into database!`);
    }
}

seed();
