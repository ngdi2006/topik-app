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

const jsonPath = 'C:\\Users\\MTC\\.gemini\\antigravity-ide\\brain\\94034162-edd3-48be-b83a-f9971c8e9481\\extracted_vocab_items.json';
const publicDir = path.join('e:', 'TOPIK-IBT', 'topik-app', 'public');

async function seed() {
    console.log('Loading extracted vocabulary items...');
    if (!fs.existsSync(jsonPath)) {
        console.error(`Error: JSON file not found at ${jsonPath}`);
        return;
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const records = JSON.parse(fileContent);
    console.log(`Found ${records.length} records in JSON.`);

    // 1. Check if description_vi column exists
    console.log('Validating table columns in Supabase...');
    const { data: testData, error: testError } = await supabase
        .from('vocabulary_vong2')
        .select('description_vi')
        .limit(1);

    if (testError) {
        console.error('Validation failed: column "description_vi" might be missing.');
        console.error('Error message:', testError.message);
        return;
    }

    console.log('Column "description_vi" exists. Starting media uploads to Supabase Storage...');

    // 2. Upload images to Supabase Storage bucket 'question-media'
    const updatedRecords = [];
    const totalRecords = records.length;

    for (let idx = 0; idx < totalRecords; idx++) {
        const r = records[idx];
        let finalImageUrl = null;

        if (r.image_url) {
            // Local path is public/uploads/...
            // Clean up paths
            const cleanedRelativeUrl = r.image_url.startsWith('/') ? r.image_url.substring(1) : r.image_url;
            const localImagePath = path.join(publicDir, cleanedRelativeUrl);
            
            if (fs.existsSync(localImagePath)) {
                const filename = path.basename(localImagePath);
                const storagePath = `vocab-vong2/${filename}`;
                
                try {
                    const fileBuffer = fs.readFileSync(localImagePath);
                    
                    // Upload to 'question-media' bucket
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('question-media')
                        .upload(storagePath, fileBuffer, {
                            contentType: 'image/png',
                            upsert: true  // overwrite if already exists
                        });

                    if (uploadError) {
                        console.error(`  [Upload Error] ${filename}:`, uploadError.message);
                    } else {
                        // Get public URL
                        const { data: urlData } = supabase.storage
                            .from('question-media')
                            .getPublicUrl(storagePath);
                            
                        finalImageUrl = urlData.publicUrl;
                        console.log(`[${idx + 1}/${totalRecords}] Uploaded ${filename} -> ${finalImageUrl}`);
                    }
                } catch (err) {
                    console.error(`  [System Error] Upload failed for ${filename}:`, err.message);
                }
            } else {
                console.warn(`  [Warning] Local file not found: ${localImagePath}`);
            }
        }

        updatedRecords.append ? null : updatedRecords.push({
            ...r,
            image_url: finalImageUrl
        });
    }

    // 3. Clear existing vocabulary of target industry & types
    console.log('Deleting existing database records to prepare clean state...');
    const { error: deleteError } = await supabase
        .from('vocabulary_vong2')
        .delete()
        .or('industry.eq.FISHERY,industry.eq.COMMON'); // Clear Fishery tools and Common signs

    if (deleteError) {
        console.error('Failed to clear existing records:', deleteError.message);
        return;
    }

    // 4. Batch insert records
    console.log(`Inserting ${updatedRecords.length} records with Supabase Storage image URLs...`);
    
    const chunkSize = 50;
    for (let i = 0; i < updatedRecords.length; i += chunkSize) {
        const chunk = updatedRecords.slice(i, i + chunkSize);
        
        const payload = chunk.map(r => ({
            industry: r.industry,
            type: r.type,
            word_kr: r.word_kr,
            word_vi: r.word_vi,
            description_vi: r.description_vi,
            image_url: r.image_url,
            audio_url: r.audio_url
        }));

        const { data, error } = await supabase
            .from('vocabulary_vong2')
            .insert(payload);

        if (error) {
            console.error(`Error inserting database chunk starting at index ${i}:`, error.message);
            return;
        }
        console.log(`Successfully inserted database chunk ${i / chunkSize + 1} (${chunk.length} items).`);
    }

    console.log('🎉 Seeding successfully completed with Supabase Storage!');
}

seed().catch(console.error);
