import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { dob } = body
        
        if (!dob) {
            return NextResponse.json({ success: false, error: 'DOB is required' }, { status: 400 })
        }

        const adminSupabase = createAdminClient()
        const { error } = await adminSupabase
            .from('profiles')
            .update({ date_of_birth: dob })
            .eq('id', user.id)

        if (error) {
            throw error
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
