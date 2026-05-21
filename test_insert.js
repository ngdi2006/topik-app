const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const userId = 'c329a9ac-0b86-443c-bb42-22e105fe8e17'; // example user
const examId = 'c04c0de7-ba63-4cba-8378-6fe59b0686dc'; // from the screenshot URL

async function check() {
    console.log("Testing insert...");
    const { data, error } = await supabase
        .from('exam_attempts')
        .insert({
            user_id: userId,
            exam_id: examId,
            is_free_attempt: true,
            status: 'started'
        })
        .select()
        .single();
        
    console.log("Insert result:", { data, error: error?.message, details: error?.details, hint: error?.hint });
}

check();
