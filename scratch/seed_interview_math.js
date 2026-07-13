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

const INDUSTRIES = [
    'Sản xuất chế tạo',
    'Ngư nghiệp',
    'Nông nghiệp',
    'Lâm nghiệp',
    'Xây dựng',
    'Dịch vụ'
];

async function seed() {
    console.log('Loading math_vocab.json...');
    if (!fs.existsSync(jsonPath)) {
        console.error(`Error: math_vocab.json not found at ${jsonPath}`);
        return;
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const baseQuestions = JSON.parse(fileContent);
    console.log(`Found ${baseQuestions.length} base questions.`);

    // Delete existing interview_questions with category = 'Toán học'
    console.log('Deleting existing interview_questions with category = "Toán học" to prepare clean state...');
    const { error: deleteError } = await supabase
        .from('interview_questions')
        .delete()
        .eq('category', 'Toán học');

    if (deleteError) {
        console.error('Failed to delete existing records:', deleteError.message);
        return;
    }
    console.log('Successfully cleared existing interview math questions.');

    // Build records for each industry
    const recordsToInsert = [];
    for (const q of baseQuestions) {
        // Extract a_kr from description_vi (e.g. "천 미터입니다. (Là 1000m.)" -> answer is "천 미터입니다.")
        // Since baseQuestions contains 'description_vi' as "a_kr (a_vi)", let's parse them back!
        const match = q.description_vi.match(/^(.*?)\s*\((.*?)\)$/);
        let a_kr = q.description_vi;
        if (match) {
            a_kr = match[1].trim();
        }

        for (const ind of INDUSTRIES) {
            recordsToInsert.push({
                category: 'Toán học',
                question_text: q.word_kr,
                vietnamese_meaning: q.word_vi,
                question_audio_url: q.audio_url,
                suggested_answers: [a_kr],
                countdown_after_audio: 10,
                tool_image_url: '',
                target_zone_id: '',
                industry: ind
            });
        }
    }

    console.log(`Inserting ${recordsToInsert.length} records into interview_questions...`);
    const chunkSize = 50;
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
        const chunk = recordsToInsert.slice(i, i + chunkSize);
        const { data, error } = await supabase
            .from('interview_questions')
            .insert(chunk)
            .select();

        if (error) {
            console.error(`Failed to insert chunk starting at index ${i}:`, error.message);
            return;
        }
        console.log(`Inserted chunk of size ${chunk.length} successfully.`);
    }

    console.log('Successfully completed seeding math questions into interview_questions table!');
}

seed();
