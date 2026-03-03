const fs = require('fs');

async function testApi() {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const env = require('dotenv').parse(fs.readFileSync('.env.local'));

        const sup = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        const { data: mData } = await sup.from('milestones').select('id, level').eq('level', '1').single();

        const payload = {
            id: mData.id,
            level: "1",
            title: "TEST API UPDATE",
            description: "Testing API DIRECTLY THROUGH NODE",
            reading_text: JSON.stringify(["TEST READING"]),
            qa_text: JSON.stringify([{ title: "Câu 1", questions: ["TEST QA"] }]),
            has_personal_form: false,
            is_active: true
        }

        const res = await fetch("http://localhost:3000/api/admin/milestones", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const txt = await res.text();
        fs.writeFileSync("test_api_out.txt", `Status: ${res.status}\nBody: ${txt}\n`);

    } catch (e) {
        fs.writeFileSync("test_api_out.txt", `Error: ${e.message}\n${e.stack}`);
    }
}
testApi();
