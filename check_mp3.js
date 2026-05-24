const https = require('https');

https.get('https://ydrzamsfwvdwpxgqhtly.supabase.co/storage/v1/object/public/questions-media/MP3-LV2-DANG1/1779520843419_lga5jkr.mp3', (res) => {
    res.on('data', (d) => {
        console.log(d.toString('utf8').substring(0, 200));
        process.exit(0);
    });
});
