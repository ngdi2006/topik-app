async function testApi() {
    try {
        console.log("Fetching milestones id...");
        // 1. Fetch DB directly (using anon key) to get the id of level '1'
        const { createClient } = require('@supabase/supabase-js');
        const fs = require('fs');
        const env = require('dotenv').parse(fs.readFileSync('.env.local'));

        const sup = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        const { data: mData } = await sup.from('milestones').select('id, level').eq('level', '1').single();
        if (!mData) return console.log("Milestone not found");

        console.log("Found ID:", mData.id);

        const payload = {
            id: mData.id,
            level: "1",
            title: "TEST API",
            description: "Testing API DIRECTLY",
            reading_text: JSON.stringify(["TEST READING"]),
            qa_text: JSON.stringify([{ title: "Câu 1", questions: ["TEST QA"] }]),
            has_personal_form: false,
            is_active: true
        }

        console.log("Sending PUT request to http://localhost:3000/api/admin/milestones")
        const res = await fetch("http://localhost:3000/api/admin/milestones", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })

        const txt = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", txt);

    } catch (e) {
        console.error("Error:", e);
    }
}
testApi();
