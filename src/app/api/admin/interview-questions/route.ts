import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error'
}

const SUPABASE_PAGE_SIZE = 1000

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const industry = searchParams.get('industry')
        const adminClient = createAdminClient()

        // 1. Check user role and assignments
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        let userRole = 'learner'
        let isSuperAdmin = false

        if (user) {
            const { data: profile } = await adminClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()
            userRole = profile?.role || user.app_metadata?.role || 'learner'
            isSuperAdmin = userRole === 'admin'
        }

        // Fetch teacher assignments if not super admin
        let teacherAssignments: Array<{
            category: string | null
            from_order_index: number | null
            to_order_index: number | null
        }> = []

        if (!isSuperAdmin && user) {
            const { data: assignments } = await adminClient
                .from('interview_question_assignments')
                .select('category, from_order_index, to_order_index')
                .eq('teacher_id', user.id)

            teacherAssignments = assignments || []

            // If a non-admin teacher has 0 assignments, return empty array immediately
            if (teacherAssignments.length === 0) {
                return NextResponse.json({
                    success: true,
                    data: [],
                    total: 0,
                    user_role: userRole,
                    is_restricted: true,
                    message: 'Bạn chưa được phân công câu hỏi nào. Vui lòng liên hệ Quản trị viên để nhận nhiệm vụ.'
                })
            }
        }

        const allQuestions: any[] = []
        let useOrderIndex = true

        for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
            let query = adminClient
                .from('interview_questions')
                .select('*')

            if (useOrderIndex) {
                query = query
                    .order('order_index', { ascending: true, nullsFirst: false })
                    .order('created_at', { ascending: true })
            } else {
                query = query.order('created_at', { ascending: false })
            }

            query = query.range(from, from + SUPABASE_PAGE_SIZE - 1)

            if (category && category !== 'all') {
                query = query.eq('category', category)
            }

            if (industry && industry !== 'all') {
                query = query.or(`industry.eq.${industry},industry.eq.COMMON`)
            }

            const { data, error } = await query
            if (error && useOrderIndex && (error.message?.includes('order_index') || error.code === '42703')) {
                useOrderIndex = false
                from = 0
                allQuestions.length = 0
                continue
            }
            if (error) throw error

            const page = data || []
            allQuestions.push(...page)
            if (page.length < SUPABASE_PAGE_SIZE) break
        }

        // If teacher, filter strictly by assignments
        let filteredQuestions = allQuestions
        if (!isSuperAdmin && teacherAssignments.length > 0) {
            filteredQuestions = allQuestions.filter((question) => {
                return teacherAssignments.some((assignment) => {
                    if (assignment.category && question.category !== assignment.category) return false
                    if (assignment.from_order_index !== null && assignment.from_order_index !== undefined) {
                        if ((question.order_index ?? 0) < assignment.from_order_index) return false
                    }
                    if (assignment.to_order_index !== null && assignment.to_order_index !== undefined) {
                        if ((question.order_index ?? 0) > assignment.to_order_index) return false
                    }
                    return true
                })
            })
        }

        return NextResponse.json({
            success: true,
            data: filteredQuestions,
            total: filteredQuestions.length,
            user_role: userRole,
            is_restricted: !isSuperAdmin,
        })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const adminClient = createAdminClient()

        const orderIndex = typeof body.order_index === 'number'
            ? body.order_index
            : (body.order_index !== undefined && body.order_index !== null && body.order_index !== '' ? parseInt(String(body.order_index), 10) : 0)

        const { data, error } = await adminClient
            .from('interview_questions')
            .insert({
                industry: body.industry || 'Sản xuất chế tạo',
                category: body.category,
                question_text: body.question_text,
                vietnamese_meaning: body.vietnamese_meaning,
                question_audio_url: body.question_audio_url,
                suggested_answers: body.suggested_answers,
                countdown_after_audio: body.countdown_after_audio,
                tool_image_url: body.tool_image_url,
                target_zone_id: body.target_zone_id,
                tool_config: body.tool_config,
                order_index: isNaN(orderIndex) ? 0 : orderIndex
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data }, { status: 201 })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json() as { ids?: unknown }
        const ids = Array.isArray(body.ids)
            ? [...new Set(body.ids.filter((id): id is string => typeof id === 'string' && id.length > 0))]
            : []

        if (ids.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Vui lòng chọn ít nhất một câu hỏi' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()
        const batchSize = 200

        for (let index = 0; index < ids.length; index += batchSize) {
            const batch = ids.slice(index, index + batchSize)
            const { error } = await adminClient
                .from('interview_questions')
                .delete()
                .in('id', batch)

            if (error) throw error
        }

        return NextResponse.json({ success: true, data: { deleted: ids.length } })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}
