const http = require('http');

(async () => {
    console.log('Fetching...');
    try {
        const res = await fetch('http://localhost:3000/api/exams');
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text.slice(0, 100));

        // Trích xuất exam ID đầu tiên
        let data;
        try { data = JSON.parse(text); } catch (e) { }

        if (data && data.length > 0) {
            const nextRes = await fetch('http://localhost:3000/api/exams/' + data[0].id + '/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: {} })
            });
            console.log('Submit Status:', nextRes.status);
            console.log('Submit Body:', await nextRes.text());
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
})();
