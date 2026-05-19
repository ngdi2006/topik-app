require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function importLessons() {
    console.log('🚀 Starting EPS-TOPIK 2025 lesson import...\n')

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing required environment variables:')
        console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
        console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
        process.exit(1)
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })

    console.log('✓ Supabase admin client initialized\n')

    // Read JSON data file
    const dataPath = path.join(__dirname, '../src/data/eps_topik_2025.json')
    let lessonsData

    try {
        const fileContent = fs.readFileSync(dataPath, 'utf8')
        lessonsData = JSON.parse(fileContent)
        console.log(`✓ Loaded ${lessonsData.lessons.length} lessons from JSON file\n`)
    } catch (error) {
        console.error('❌ Failed to read or parse JSON file:', error.message)
        process.exit(1)
    }

    // Import each lesson
    let successCount = 0
    let errorCount = 0

    for (const lessonData of lessonsData.lessons) {
        try {
            console.log(`📚 Processing Lesson ${lessonData.lesson_number}: ${lessonData.title_korean}`)

            // Extract AI scenarios before upserting lesson
            const aiScenarios = lessonData.ai_speaking_scenarios || []
            delete lessonData.ai_speaking_scenarios

            // Upsert lesson (conflict on lesson_number)
            const { data: lesson, error: lessonError } = await supabase
                .from('lessons')
                .upsert(lessonData, {
                    onConflict: 'lesson_number',
                    ignoreDuplicates: false
                })
                .select()
                .single()

            if (lessonError) {
                throw new Error(`Lesson upsert failed: ${lessonError.message}`)
            }

            console.log(`   ✓ Lesson upserted (ID: ${lesson.id})`)

            // Upsert AI speaking scenarios
            if (aiScenarios.length > 0) {
                // Delete existing scenarios for this lesson first to avoid orphans
                const { error: deleteError } = await supabase
                    .from('ai_speaking_scenarios')
                    .delete()
                    .eq('lesson_id', lesson.id)

                if (deleteError) {
                    console.warn(`   ⚠ Warning: Could not delete old scenarios: ${deleteError.message}`)
                }

                // Insert new scenarios
                const scenariosToInsert = aiScenarios.map(scenario => ({
                    ...scenario,
                    lesson_id: lesson.id
                }))

                const { data: insertedScenarios, error: scenarioError } = await supabase
                    .from('ai_speaking_scenarios')
                    .insert(scenariosToInsert)
                    .select()

                if (scenarioError) {
                    throw new Error(`AI scenarios insert failed: ${scenarioError.message}`)
                }

                console.log(`   ✓ ${insertedScenarios.length} AI scenarios inserted`)
            }

            successCount++
            console.log(`   ✅ Lesson ${lessonData.lesson_number} completed\n`)

        } catch (error) {
            errorCount++
            console.error(`   ❌ Error processing lesson ${lessonData.lesson_number}:`, error.message)
            console.error(`      ${error.stack}\n`)
        }
    }

    // Summary
    console.log('═'.repeat(50))
    console.log('📊 Import Summary:')
    console.log(`   Total lessons: ${lessonsData.lessons.length}`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Failed: ${errorCount}`)
    console.log('═'.repeat(50))

    if (errorCount > 0) {
        console.log('\n⚠️  Import completed with errors')
        process.exit(1)
    } else {
        console.log('\n🎉 All lessons imported successfully!')
        process.exit(0)
    }
}

// Run import
importLessons().catch(error => {
    console.error('\n💥 Unexpected error:', error)
    process.exit(1)
})
