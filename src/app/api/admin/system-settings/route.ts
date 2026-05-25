import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
    try {
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('system_settings')
            .select('*')
            .eq('id', 1)
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

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('system_settings')
            .upsert({
                id: 1,
                ai_global_prompt: body.ai_global_prompt,
                industry_prompts: body.industry_prompts,
                updated_at: new Date().toISOString()
            })
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
