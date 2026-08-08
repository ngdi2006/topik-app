import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInterviewAccess } from '@/features/interview-access/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const industry = searchParams.get('industry')
        const includeSummary = searchParams.get('summary') === '1'

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const access = await getInterviewAccess(supabase, user)
        const isCommandRequest = category?.split(',').includes('Khẩu lệnh') ?? false

        if (!access.hasFullAccess && category && !isCommandRequest) {
            return NextResponse.json({
                success: false,
                error: 'Gói Phỏng vấn Vòng 2 đã bị khóa',
                code: 'INTERVIEW_SUBSCRIPTION_REQUIRED',
                access,
            }, { status: 403 })
        }

        let query = supabase
            .from('interview_questions')
            .select('*')
            .order('created_at', { ascending: false })

        if (category) {
            const categories = category.split(',')
            query = query.in('category', categories)
            if (!categories.includes('Khẩu lệnh') && industry) {
                query = query.or(`industry.eq.${industry},industry.eq.COMMON`)
            }
        } else if (industry) {
            query = query.or(`industry.eq.${industry},industry.eq.COMMON,category.eq.Khẩu lệnh`)
        }

        if (!access.hasFullAccess) {
            query = query.eq('category', 'Khẩu lệnh')
        }

        const catalogTotalsPromise = includeSummary
            ? Promise.all(
                [
                    ['command', 'Khẩu lệnh'],
                    ['math', 'Toán học'],
                    ['tools', 'Sử dụng công cụ'],
                    ['communication', 'Giao tiếp'],
                    ['situation', 'Xử lý tình huống'],
                ].map(async ([topicId, topicCategory]) => {
                    let countQuery = supabase
                        .from('interview_questions')
                        .select('id', { count: 'exact', head: true })
                        .eq('category', topicCategory)

                    if (topicCategory !== 'Khẩu lệnh' && industry) {
                        countQuery = countQuery.or(`industry.eq.${industry},industry.eq.COMMON`)
                    }

                    const { count, error: countError } = await countQuery
                    if (countError) throw countError
                    return [topicId, count || 0] as const
                }),
            ).then((entries) => Object.fromEntries(entries))
            : Promise.resolve(undefined)

        const [{ data, error }, catalogTotals] = await Promise.all([query, catalogTotalsPromise])

        if (error) {
            throw error
        }

        let result = data || []
        if (!access.hasFullAccess) {
            const { data: configuredFree } = await supabase
                .from('interview_free_content')
                .select('content_id, display_order')
                .eq('content_type', 'command')
                .eq('is_active', true)
                .order('display_order')
                .limit(access.freeLimits.command)
            const freeIds = (configuredFree || []).map((item) => item.content_id)
            result = freeIds.length
                ? freeIds.map((id) => result.find((question) => question.id === id)).filter(Boolean)
                : result.slice(0, access.freeLimits.command)
        }

        return NextResponse.json({
            success: true,
            data: result,
            access,
            catalogTotals,
        })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
