import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
    try {
        const adminAuthClient = createAdminClient()
        // Fetch exams
        const { data: exams, error } = await adminAuthClient
            .from('exams')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ exams }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const adminAuthClient = createAdminClient()
        // Create an empty Draft Exam
        const { data: newExam, error } = await adminAuthClient
            .from('exams')
            .insert({
                title: 'Đề thi mới (Draft)',
                level: 'TOPIK II',
                duration: 60,
                total_questions: 0,
                status: 'Draft',
                is_ai_generated: false
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, exam: newExam }, { status: 201 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}
