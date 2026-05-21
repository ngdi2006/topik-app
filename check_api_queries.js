const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const userId = 'c329a9ac-0b86-443c-bb42-22e105fe8e17';
const examId = '1185afcb-f206-4bfd-971e-1b318b00fc0b'; // from screenshot url presumably, or I can just use one.

async function check() {
    console.log("Checking exam...");
    const q1 = await supabase.from('exams').select('id, title, is_free, free_attempts, credits_required').limit(1);
    console.log("Exams:", q1.error?.message || "OK");
    
    console.log("Checking user credits...");
    const q2 = await supabase.from('user_exam_credits').select('remaining_credits').eq('user_id', userId).maybeSingle();
    console.log("Credits:", q2.error?.message || "OK");

    console.log("Checking attempt count...");
    const q3 = await supabase.from('exam_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    console.log("Attempt Count:", q3.error?.message || "OK");

    console.log("Checking attempt list...");
    const q4 = await supabase.from('exam_attempts').select('id, is_free_attempt, created_at').eq('user_id', userId).order('created_at', { ascending: false });
    console.log("Attempt List:", q4.error?.message || "OK");
}

check();
