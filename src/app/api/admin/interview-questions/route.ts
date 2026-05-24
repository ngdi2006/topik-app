import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const adminClient = createAdminClient()

        let query = adminClient
            .from('interview_questions')
            .select('*')
            .order('created_at', { ascending: false })

        if (category && category !== 'all') {
            query = query.eq('category', category)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('interview_questions')
            .insert({
                category: body.category,
                question_text: body.question_text,
                vietnamese_meaning: body.vietnamese_meaning,
                question_audio_url: body.question_audio_url,
                suggested_answers: body.suggested_answers,
                countdown_after_audio: body.countdown_after_audio,
                tool_image_url: body.tool_image_url,
                target_zone_id: body.target_zone_id
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
