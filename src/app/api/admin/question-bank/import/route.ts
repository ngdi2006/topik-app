// =====================================================================
// API: Question Bank Import - Parse Excel & Bulk Insert
// =====================================================================

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { parseExcelBuffer } from '@/lib/excel/parser'

// POST: Upload và parse Excel, return preview
export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'Không có file được upload' },
                { status: 400 }
            )
        }

        const buffer = await file.arrayBuffer()
        const results = parseExcelBuffer(buffer)

        const valid = results.filter((r) => r.valid).length
        const invalid = results.filter((r) => !r.valid).length

        return NextResponse.json({
            success: true,
            preview: results,
            stats: {
                total: results.length,
                valid,
                invalid,
            },
        })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// PUT: Confirm import - bulk insert validated questions
export async function PUT(request: Request) {
    try {
        const { questions } = await request.json()

        if (!Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Không có câu hỏi để nhập' },
                { status: 400 }
            )
        }

        const userClient = await createClient()
        const { data: { user } } = await userClient.auth.getUser()
        const adminClient = createAdminClient()

        // Lookup category_id for each question by category_name
        const toInsert = []
        for (const q of questions) {
            const { category_name, ...restQuestionData } = q
            const categoryName = category_name

            if (!categoryName) {
                throw new Error('Thiếu category_name trong dữ liệu')
            }

            // Find category by name
            const { data: category, error: catError } = await adminClient
                .from('question_categories')
                .select('id')
                .eq('name', categoryName)
                .single()

            if (catError || !category) {
                throw new Error(`Không tìm thấy kho: "${categoryName}". Vui lòng tạo kho trước khi import.`)
            }

            // Build insert data with category_id
            toInsert.push({
                ...restQuestionData,
                category_id: category.id,
                created_by: user?.id || null,
                shuffle_options: q.shuffle_options ?? true,
                points: q.points ?? 1,
                tags: q.tags || [],
                question_position: q.question_position || 'below',
            })
        }

        // Bulk insert
        const { data, error } = await adminClient
            .from('question_bank')
            .insert(toInsert)
            .select('id')

        if (error) throw error

        return NextResponse.json({
            success: true,
            inserted: data?.length || 0,
        })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
