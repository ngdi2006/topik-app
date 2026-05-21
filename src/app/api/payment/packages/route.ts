import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        const { data: packages, error } = await supabase
            .from('payment_packages')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })

        if (error) throw error

        return NextResponse.json(packages)
    } catch (error: any) {
        console.error('Error fetching payment packages:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch packages' },
            { status: 500 }
        )
    }
}
