import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type DraftPayload = {
    mode?: 'experienced' | 'beginner'
    profile?: Record<string, string>
    text?: string
}

const MAX_INTRODUCTION_CHARACTERS = 500
const MAX_INTRODUCTION_LINES = 20

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
        .from('user_self_introduction_drafts')
        .select('mode, profile, text, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()

    if (error) {
        const metadataDraft = user.user_metadata?.self_introduction_draft
        return NextResponse.json({ draft: metadataDraft || null, storage: 'auth-metadata' })
    }
    if (!data) {
        return NextResponse.json({
            draft: user.user_metadata?.self_introduction_draft || null,
            storage: 'auth-metadata',
        })
    }

    return NextResponse.json({
        draft: {
            version: 1,
            mode: data.mode,
            profile: data.profile,
            text: data.text,
            updatedAt: data.updated_at,
        },
    })
}

export async function PUT(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as DraftPayload
    const text = body.text?.trim()
    if (!text || !body.profile || !['experienced', 'beginner'].includes(body.mode || '')) {
        return NextResponse.json({ error: 'Invalid draft' }, { status: 400 })
    }
    const lineCount = text.split(/\r?\n/).filter((line) => line.trim()).length
    if (text.length > MAX_INTRODUCTION_CHARACTERS || lineCount > MAX_INTRODUCTION_LINES) {
        return NextResponse.json({
            error: `Bài giới thiệu tối đa ${MAX_INTRODUCTION_CHARACTERS} ký tự và ${MAX_INTRODUCTION_LINES} câu`,
        }, { status: 413 })
    }

    const updatedAt = new Date().toISOString()
    const { error } = await supabase.from('user_self_introduction_drafts').upsert({
        user_id: user.id,
        mode: body.mode,
        profile: body.profile,
        text,
        updated_at: updatedAt,
    }, { onConflict: 'user_id' })

    if (error) {
        const fallbackDraft = {
            version: 1,
            mode: body.mode,
            profile: body.profile,
            text,
            updatedAt,
        }
        const { error: metadataError } = await supabase.auth.updateUser({
            data: { self_introduction_draft: fallbackDraft },
        })
        if (metadataError) return NextResponse.json({ error: metadataError.message }, { status: 500 })
        return NextResponse.json({ updatedAt, storage: 'auth-metadata' })
    }
    return NextResponse.json({ updatedAt, storage: 'draft-table' })
}
