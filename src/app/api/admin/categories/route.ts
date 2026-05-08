import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
    try {
        const adminClient = createAdminClient()

        // Try with sort_order first, fallback to created_at if column doesn't exist
        let { data, error } = await adminClient
            .from('question_categories')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false })

        // If sort_order column doesn't exist yet (migration not run)
        if (error && error.message?.includes('sort_order')) {
            console.warn('⚠️ Migration setup_categories_v2.sql chưa chạy. Sử dụng created_at order.')
            const fallback = await adminClient
                .from('question_categories')
                .select('*')
                .order('created_at', { ascending: false })

            data = fallback.data
            error = fallback.error
        }

        if (error) throw error

        return NextResponse.json({ success: true, data: data || [] })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}


export async function POST(request: Request) {
    try {
        const body = await request.json()

        if (!body.name?.trim()) {
            return NextResponse.json(
                { success: false, error: 'Tên kho không được để trống' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('question_categories')
            .insert({
                name: body.name.trim(),
                description: body.description?.trim() || null,
                icon: body.icon || '📚',
                color: body.color || '#3B82F6',
                parent_id: body.parent_id || null,
                is_active: body.is_active ?? true,
                sort_order: body.sort_order ?? 0,
                shuffle_options: body.shuffle_options ?? true,
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
