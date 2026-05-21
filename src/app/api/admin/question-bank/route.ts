// =====================================================================
// API: Question Bank - List & Create
// =====================================================================

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { QuestionBankCreate } from '@/types/exam'

// GET: List questions (with filters)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const questionType = searchParams.get('question_type')
        const level = searchParams.get('level')
        const search = searchParams.get('search')
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '20')

        const adminClient = createAdminClient()
        let query = adminClient
            .from('question_bank')
            .select('*, category:question_categories(id, name, icon, color)', { count: 'exact' })
            .order('created_at', { ascending: false })

        if (questionType) query = query.eq('question_type', questionType)
        if (level) query = query.eq('level', parseInt(level))
        if (search) query = query.ilike('question_text', `%${search}%`)

        const categoryId = searchParams.get('category_id')
        if (categoryId) query = query.eq('category_id', categoryId)

        const tag = searchParams.get('tag')
        if (tag) query = query.contains('tags', [tag])

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) throw error

        return NextResponse.json({
            success: true,
            data: data || [],
            total: count || 0,
            page,
            pageSize,
            totalPages: Math.ceil((count || 0) / pageSize),
        })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// POST: Create new question
export async function POST(request: Request) {
    try {
        const body: QuestionBankCreate = await request.json()

        // Validation
        if (!body.question_text || !body.question_type || !body.level) {
            return NextResponse.json(
                { success: false, error: 'Thiếu thông tin bắt buộc' },
                { status: 400 }
            )
        }

        if (!body.options || body.options.length !== 4) {
            return NextResponse.json(
                { success: false, error: 'Phải có đúng 4 đáp án' },
                { status: 400 }
            )
        }

        if (body.correct_answer < 0 || body.correct_answer > 3) {
            return NextResponse.json(
                { success: false, error: 'Đáp án đúng phải từ 0-3' },
                { status: 400 }
            )
        }

        // Get current user
        const userClient = await createClient()
        const { data: { user } } = await userClient.auth.getUser()

        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('question_bank')
            .insert({
                ...body,
                created_by: user?.id || null,
                shuffle_options: body.shuffle_options ?? true,
                points: body.points ?? 1,
                tags: body.tags || [],
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

// PATCH: Bulk toggle tag
export async function PATCH(request: Request) {
    try {
        const { ids, tag, action } = await request.json()

        if (!Array.isArray(ids) || ids.length === 0 || !tag || !['add', 'remove'].includes(action)) {
            return NextResponse.json(
                { success: false, error: 'ids (array), tag (string), action (add|remove) required' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        const { data: questions, error: fetchError } = await adminClient
            .from('question_bank')
            .select('id, tags')
            .in('id', ids)

        if (fetchError) throw fetchError

        const updates = (questions || []).map((q: any) => {
            const currentTags: string[] = q.tags || []
            const newTags = action === 'add'
                ? currentTags.includes(tag) ? currentTags : [...currentTags, tag]
                : currentTags.filter((t: string) => t !== tag)
            return adminClient
                .from('question_bank')
                .update({ tags: newTags })
                .eq('id', q.id)
        })

        await Promise.all(updates)

        return NextResponse.json({ success: true, updated_count: ids.length })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// DELETE: Bulk delete questions
export async function DELETE(request: Request) {
    try {
        const { ids } = await request.json()

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Thiếu danh sách ID cần xóa' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('question_bank')
            .delete()
            .in('id', ids)

        if (error) throw error

        return NextResponse.json({ success: true, deleted_count: ids.length })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

