import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')

        const supabase = await createClient()

        let query = supabase
            .from('interview_questions')
            .select('*')
            .order('created_at', { ascending: false })

        if (category) {
            query = query.eq('category', category)
        }

        const { data, error } = await query

        if (error) {
            throw error
        }

        return NextResponse.json({
            success: true,
            data: data || [],
        })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
