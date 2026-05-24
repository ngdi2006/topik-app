const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const attemptId = 'a064f340-be8b-42eb-b41b-35c8f47cd91c';
    const { data: attemptData } = await supabase.from('exam_attempts').select('questions_snapshot').eq('id', attemptId).single();
    
    if (attemptData) {
        const q31 = attemptData.questions_snapshot.find(q => q.order === 30); // 0-indexed, so order 30 is Câu 31
        console.log("Attempt Q31 Audio URL:", q31.audio_url);
        
        const { data: bankData } = await supabase.from('question_bank').select('audio_url').eq('id', q31.id).single();
        console.log("Bank Q31 Audio URL:", bankData.audio_url);
    }
}
check();
