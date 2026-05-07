// =====================================================================
// API: Download Excel Template
// =====================================================================

import { NextResponse } from 'next/server'
import { generateTemplateBuffer } from '@/lib/excel/generator'

export async function GET() {
    try {
        const buffer = generateTemplateBuffer()

        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition':
                    'attachment; filename="question-bank-template.xlsx"',
            },
        })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
