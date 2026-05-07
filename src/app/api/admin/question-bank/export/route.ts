// =====================================================================
// API: Export Question Bank to Excel
// =====================================================================

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exportQuestionsToBuffer } from '@/lib/excel/generator'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const questionType = searchParams.get('question_type')
        const level = searchParams.get('level')

        const adminClient = createAdminClient()
        let query = adminClient
            .from('question_bank')
            .select('*')
            .order('created_at', { ascending: false })

        if (questionType) query = query.eq('question_type', questionType)
        if (level) query = query.eq('level', parseInt(level))

        const { data, error } = await query

        if (error) throw error

        const buffer = exportQuestionsToBuffer(data || [])

        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="question-bank-export-${Date.now()}.xlsx"`,
            },
        })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
