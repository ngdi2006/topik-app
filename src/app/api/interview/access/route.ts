import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInterviewAccess } from '@/features/interview-access/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const access = await getInterviewAccess(supabase, user)
    return NextResponse.json(access)
}

