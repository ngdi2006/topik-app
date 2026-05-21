import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get or create user credits
        let { data: credits, error } = await supabase
            .from('user_exam_credits')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (error && error.code === 'PGRST116') {
            // No record found, create one
            const { data: newCredits, error: insertError } = await supabase
                .from('user_exam_credits')
                .insert({ user_id: user.id, total_credits: 0, used_credits: 0 })
                .select()
                .single()

            if (insertError) throw insertError
            credits = newCredits
        } else if (error) {
            throw error
        }

        return NextResponse.json(credits)
    } catch (error: any) {
        console.error('Error fetching user credits:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch credits' },
            { status: 500 }
        )
    }
}
