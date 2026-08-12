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

        let query = includeSummary
            ? supabase.from('interview_questions').select('id, category, industry').order('created_at', { ascending: false })
            : supabase.from('interview_questions').select('*').order('created_at', { ascending: false })

        if (category) {
            const categories = category.split(',')
            query = query.in('category', categories)
            if (!categories.includes('Khẩu lệnh') && industry) {
                query = query.or(`industry.eq.${industry},industry.eq.COMMON`)
            }
        } else if (industry) {
            query = query.or(`industry.eq.${industry},industry.eq.COMMON,category.eq.Khẩu lệnh`)
        }

        if (!access.hasFullAccess && !includeSummary) {
            query = query.eq('category', 'Khẩu lệnh')
        }

        const { data, error } = await query

        if (error) {
            throw error
        }

        const allRows = data || []
        const categoryTotals = includeSummary ? new Map<string, number>() : null
        if (categoryTotals) {
            for (const row of allRows) {
                categoryTotals.set(row.category, (categoryTotals.get(row.category) || 0) + 1)
            }
        }
        const catalogTotals = categoryTotals
            ? {
                command: categoryTotals.get('Khẩu lệnh') || 0,
                math: categoryTotals.get('Toán học') || 0,
                tools: categoryTotals.get('Sử dụng công cụ') || 0,
                communication: categoryTotals.get('Giao tiếp') || 0,
                situation: categoryTotals.get('Xử lý tình huống') || 0,
                safety: categoryTotals.get('An toàn lao động') || 0,
            }
            : undefined

        let result = allRows
        if (!access.hasFullAccess && !includeSummary) {
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
