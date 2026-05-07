// =====================================================================
// API: Upload Media to Supabase Storage
// =====================================================================

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const folder = formData.get('folder') as string || 'general'

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'Không có file được upload' },
                { status: 400 }
            )
        }

        // Validate file type
        const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
            'image/gif',
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/ogg',
            'audio/webm',
        ]

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Loại file không được hỗ trợ' },
                { status: 400 }
            )
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, error: 'File quá lớn (tối đa 10MB)' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()
        const timestamp = Date.now()
        const fileName = `${folder}/${timestamp}-${file.name}`

        const { data, error } = await adminClient.storage
            .from('question-media')
            .upload(fileName, file, {
                contentType: file.type,
                upsert: false,
            })

        if (error) throw error

        // Get public URL
        const { data: urlData } = adminClient.storage
            .from('question-media')
            .getPublicUrl(fileName)

        return NextResponse.json({
            success: true,
            url: urlData.publicUrl,
            path: fileName,
        })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
