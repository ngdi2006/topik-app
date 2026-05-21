const http = require('http');

async function check() {
    const data = JSON.stringify({
        id: "59838015",
        gateway: "VietinBank",
        transaction_date: "2026-05-21 15:06:03",
        account_number: "198801988888",
        amount_in: 2000,
        amount_out: 0,
        accumulated: 10000,
        code: "FT26141250003317",
        transaction_content: "SEVQR1779343547084J80K0",
        reference_number: "441D6052IMTF7FQH",
        body: ""
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/payment/webhook',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    req.write(data);
    req.end();
}

check();
