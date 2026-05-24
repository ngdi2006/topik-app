import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('interview_questions')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('interview_questions')
            .update({
                category: body.category,
                question_text: body.question_text,
                vietnamese_meaning: body.vietnamese_meaning,
                question_audio_url: body.question_audio_url,
                suggested_answers: body.suggested_answers,
                countdown_after_audio: body.countdown_after_audio,
                tool_image_url: body.tool_image_url,
                target_zone_id: body.target_zone_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('interview_questions')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
