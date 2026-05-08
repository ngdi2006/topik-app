import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCategoryPDF } from '@/lib/export/pdf-generator'
import { generateCategoryDocx } from '@/lib/export/docx-generator'
import { Packer } from 'docx'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { searchParams } = new URL(request.url)
        const format = searchParams.get('format') || 'pdf' // 'pdf' | 'docx'

        const adminClient = createAdminClient()

        // Fetch category
        const { data: category, error: catError } = await adminClient
            .from('question_categories')
            .select('*')
            .eq('id', id)
            .single()

        if (catError || !category) {
            return NextResponse.json(
                { success: false, error: 'Không tìm thấy kho' },
                { status: 404 }
            )
        }

        // Fetch questions in this category
        const { data: questions, error: qError } = await adminClient
            .from('question_bank')
            .select('*')
            .eq('category_id', id)
            .order('created_at', { ascending: true })

        if (qError) throw qError

        if (!questions || questions.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Kho chưa có câu hỏi nào' },
                { status: 400 }
            )
        }

        const filename = `${category.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`

        if (format === 'pdf') {
            // Generate PDF
            const pdf = await generateCategoryPDF(category, questions)
            const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

            return new NextResponse(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}.pdf"`,
                },
            })
        } else if (format === 'docx') {
            // Generate Word
            const doc = await generateCategoryDocx(category, questions)
            const buffer = await Packer.toBuffer(doc)

            return new NextResponse(buffer as any, {
                headers: {
                    'Content-Type':
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'Content-Disposition': `attachment; filename="${filename}.docx"`,
                },
            })
        } else {
            return NextResponse.json(
                { success: false, error: 'Format không hợp lệ (pdf hoặc docx)' },
                { status: 400 }
            )
        }
    } catch (error: any) {
        console.error('Export error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Lỗi xuất file' },
            { status: 500 }
        )
    }
}
