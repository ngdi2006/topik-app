import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('question_categories')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()

        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('question_categories')
            .update({
                name: body.name,
                description: body.description,
                icon: body.icon,
                color: body.color,
                parent_id: body.parent_id,
                is_active: body.is_active,
                sort_order: body.sort_order ?? 0,
                shuffle_options: body.shuffle_options ?? true,
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const adminClient = createAdminClient()

        // Check if category has questions
        const { count } = await adminClient
            .from('question_bank')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id)

        if (count && count > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Không thể xóa kho có ${count} câu hỏi. Vui lòng di chuyển câu hỏi trước.`,
                },
                { status: 400 }
            )
        }

        const { error } = await adminClient
            .from('question_categories')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
