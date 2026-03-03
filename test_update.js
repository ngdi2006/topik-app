const { createClient } = require('@supabase/supabase-js');
const url = 'https://ydrzamsfwvdwpxgqhtly.supabase.co';
const key = process.argv[2];

const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase.from('milestones').select('id, level, qa_text').limit(1);
    console.log("FETCH RESULT:", data, error);

    if (data && data.length > 0) {
        const id = data[0].id;
        console.log("TRYING TO UPDATE ID:", id);
        const { data: updateData, error: updateError } = await supabase
            .from('milestones')
            .update({ qa_text: JSON.stringify([{ title: "Test", questions: ["Testing 123", "Test 4"] }]) })
            .eq('id', id)
            .select();

        console.log("UPDATE RESULT:", updateData, updateError);
    }
}
check();
