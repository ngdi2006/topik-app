import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('interview_subscription_plans')
        .select('id, code, name, duration_days, price_vnd, daily_ai_limit')
        .eq('is_active', true)
        .order('display_order')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ plans: data || [] })
}

