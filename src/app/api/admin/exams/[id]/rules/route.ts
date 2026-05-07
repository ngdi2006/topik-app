// =====================================================================
// API: Exam Question Rules - List & Create
// =====================================================================

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: List rules for an exam (with available count per rule)
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const adminClient = createAdminClient()
        const { data: rules, error } = await adminClient
            .from('exam_question_rules')
            .select('*')
            .eq('exam_id', params.id)
            .order('order_index', { ascending: true })

        if (error) throw error

        // Tính số câu available trong kho cho mỗi rule
        const rulesWithStats = await Promise.all(
            (rules || []).map(async (rule: any) => {
                let countQuery = adminClient
                    .from('question_bank')
                    .select('*', { count: 'exact', head: true })
                    .eq('question_type', rule.question_type)

                if (rule.levels && rule.levels.length > 0) {
                    countQuery = countQuery.in('level', rule.levels)
                }
                if (rule.tags && rule.tags.length > 0) {
                    countQuery = countQuery.contains('tags', rule.tags)
                }

                const { count } = await countQuery
                return {
                    ...rule,
                    available_count: count || 0,
                    is_sufficient: (count || 0) >= rule.quantity,
                }
            })
        )

        return NextResponse.json({ success: true, data: rulesWithStats })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// POST: Create new rule
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()

        if (!body.question_type || !body.levels || !body.quantity) {
            return NextResponse.json(
                { success: false, error: 'Thiếu thông tin bắt buộc' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // Get max order_index
        const { data: existingRules } = await adminClient
            .from('exam_question_rules')
            .select('order_index')
            .eq('exam_id', params.id)
            .order('order_index', { ascending: false })
            .limit(1)

        const nextOrderIndex = (existingRules?.[0]?.order_index ?? -1) + 1

        const { data, error } = await adminClient
            .from('exam_question_rules')
            .insert({
                exam_id: params.id,
                question_type: body.question_type,
                levels: body.levels,
                tags: body.tags || [],
                quantity: body.quantity,
                points_per_question: body.points_per_question || 0,
                section_name: body.section_name || null,
                order_index: body.order_index ?? nextOrderIndex,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
