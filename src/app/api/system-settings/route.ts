import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 1)
            .single()

        if (error) {
            throw error
        }

        return NextResponse.json({
            success: true,
            data: data,
        })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
