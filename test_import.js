// Test Import API
async function testImport() {
    console.log('🧪 Testing Import API...\n');

    // Mock data to test import
    const testData = {
        questions: [
            {
                category_name: 'dang1',
                question_type: 'reading',
                level: 1,
                passage: 'Test passage',
                question_text: 'Test question?',
                options: [
                    { type: 'text', content: 'Option 1' },
                    { type: 'text', content: 'Option 2' },
                    { type: 'text', content: 'Option 3' },
                    { type: 'text', content: 'Option 4' }
                ],
                correct_answer: 0,
                shuffle_options: true,
                points: 1,
                tags: ['test']
            }
        ]
    };

    // Step 2: Confirm Import (PUT)
    console.log('\nStep 2: Confirm Import (PUT)');
    try {
        const response = await fetch('http://localhost:3000/api/admin/question-bank/import', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('\n✅ Import successful!');
            console.log(`Inserted: ${result.inserted} questions`);
        } else {
            console.log('\n❌ Import failed!');
            console.log('Error:', result.error);
        }
    } catch (error) {
        console.log('\n❌ Request failed!');
        console.log('Error:', error.message);
    }
}

testImport();
