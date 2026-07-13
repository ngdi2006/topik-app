import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        const admin = createAdminClient()
        
        // Add description_vi column via direct SQL
        // Using a workaround: try to insert a dummy record check
        // Actually let's use the Supabase REST API to run SQL
        const { error } = await admin.rpc('exec_sql', {
            query: 'ALTER TABLE public.vocabulary_vong2 ADD COLUMN IF NOT EXISTS description_vi TEXT'
        })
        
        if (error && error.message.includes('does not exist')) {
            // RPC not available, try raw approach
            return NextResponse.json({ 
                success: false, 
                error: 'RPC not available. Please run migration manually.',
                sql: 'ALTER TABLE public.vocabulary_vong2 ADD COLUMN IF NOT EXISTS description_vi TEXT;'
            })
        }
        
        return NextResponse.json({ success: true, message: 'Column description_vi added' })
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message })
    }
}
