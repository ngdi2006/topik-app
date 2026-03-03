import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use Service Role Key to bypass RLS for Admin operations
const getAdminClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(req: Request) {
    try {
        const payload = await req.json()
        const adminClient = getAdminClient()
        const { data, error } = await adminClient.from('milestones').insert([payload]).select()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to create milestone" }, { status: 400 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, ...payload } = body
        if (!id) throw new Error("Missing ID for update")

        const adminClient = getAdminClient()
        const { data, error } = await adminClient.from('milestones').update(payload).eq('id', id).select()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to update milestone" }, { status: 400 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) throw new Error("Missing ID for deletion")

        const adminClient = getAdminClient()
        const { error } = await adminClient.from('milestones').delete().eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to delete milestone" }, { status: 400 })
    }
}
