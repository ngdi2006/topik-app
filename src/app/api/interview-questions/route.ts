import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const industry = searchParams.get('industry')

        const supabase = await createClient()

        let query = supabase
            .from('interview_questions')
            .select('*')
            .order('created_at', { ascending: false })

        if (category) {
            const categories = category.split(',')
            query = query.in('category', categories)
            if (!categories.includes('Khẩu lệnh') && industry) {
                query = query.eq('industry', industry)
            }
        } else if (industry) {
            query = query.or(`industry.eq.${industry},category.eq.Khẩu lệnh`)
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
