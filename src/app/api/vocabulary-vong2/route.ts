import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInterviewAccess } from '@/features/interview-access/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const industry = searchParams.get('industry')
        const type = searchParams.get('type')

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const access = await getInterviewAccess(supabase, user)

        let query = supabase
            .from('vocabulary_vong2')
            .select('*')
            .order('created_at', { ascending: false })

        if (industry && industry !== 'ALL') {
            query = query.in('industry', [industry, 'COMMON', 'ALL'])
        }

        if (type) {
            const types = type.split(',')
            query = query.in('type', types)
        }

        const { data, error } = await query

        if (error) throw error

        let result = data || []
        if (!access.hasFullAccess) {
            const requestedTypes = type ? type.split(',') : ['TOOL', 'SIGN']
            const limitedGroups = await Promise.all(requestedTypes.map(async (requestedType) => {
                const contentType = requestedType === 'SIGN' ? 'sign' : 'vocabulary'
                const limit = requestedType === 'SIGN' ? access.freeLimits.sign : access.freeLimits.vocabulary
                const matching = result.filter((item) => item.type === requestedType)
                const { data: configured } = await supabase
                    .from('interview_free_content')
                    .select('content_id, display_order')
                    .eq('content_type', contentType)
                    .eq('is_active', true)
                    .order('display_order')
                    .limit(limit)
                const ids = (configured || []).map((item) => item.content_id)
                return ids.length
                    ? ids.map((id) => matching.find((item) => item.id === id)).filter(Boolean)
                    : matching.slice(0, limit)
            }))
            result = limitedGroups.flat()
        }

        return NextResponse.json({ success: true, data: result, access })
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
}
