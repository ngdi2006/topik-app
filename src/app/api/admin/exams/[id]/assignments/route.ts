import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// GET all assigned users for an exam
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const adminSupabase = createAdminClient()
        const resolvedParams = await context.params
        const examId = resolvedParams.id

        // Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Get assignments
        const { data: assignments, error } = await adminSupabase
            .from('exam_assignments')
            .select('user_id, created_at')
            .eq('exam_id', examId)

        if (error) {
            // Handle if table doesn't exist yet
            if (error.code === '42P01') {
                return NextResponse.json({ success: true, assignments: [] }, { status: 200 })
            }
            throw error
        }

        // We can optionally fetch user info for these user_ids using profiles
        const userIds = assignments.map(a => a.user_id)
        let profiles: any[] = []
        let authUsers: any[] = []
        if (userIds.length > 0) {
            const { data } = await adminSupabase
                .from('profiles')
                .select('id, full_name, email, group_name')
                .in('id', userIds)
            profiles = data || []
            
            const authUserResponses = await Promise.all(
                userIds.map((id: string) => adminSupabase.auth.admin.getUserById(id))
            )
            authUsers = authUserResponses.map(res => res.data?.user).filter(Boolean)
        }

        const result = assignments.map(a => {
            const profile = profiles.find(p => p.id === a.user_id)
            const authUser = authUsers.find(u => u.id === a.user_id)
            return {
                user_id: a.user_id,
                email: authUser?.email || profile?.email || 'N/A',
                name: profile?.full_name || authUser?.user_metadata?.full_name || 'Học viên',
                groupName: profile?.group_name || '',
                assigned_at: a.created_at
            }
        })

        return NextResponse.json({ success: true, assignments: result }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || "Internal Server Error" }, { status: 500 })
    }
}

// POST: Add an assignment
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const adminSupabase = createAdminClient()
        const resolvedParams = await context.params
        const examId = resolvedParams.id
        
        const body = await request.json()
        const { user_id, user_ids } = body
        
        if (user_ids && Array.isArray(user_ids)) {
            const inserts = user_ids.map((id: string) => ({ exam_id: examId, user_id: id }))
            const { error } = await adminSupabase.from('exam_assignments').insert(inserts)
            if (error) throw error
            return NextResponse.json({ success: true }, { status: 201 })
        }
        
        if (!user_id) return NextResponse.json({ success: false, error: 'user_id or user_ids is required' }, { status: 400 })

        const { data, error } = await adminSupabase
            .from('exam_assignments')
            .insert({ exam_id: examId, user_id })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, assignment: data }, { status: 201 })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || "Internal Server Error" }, { status: 500 })
    }
}

// DELETE: Remove an assignment
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const adminSupabase = createAdminClient()
        const resolvedParams = await context.params
        const examId = resolvedParams.id
        
        // Handle DELETE body or URL params
        const url = new URL(request.url)
        let user_id = url.searchParams.get('user_id')
        let user_ids: string[] = []
        
        if (!user_id) {
            // try body if not in query
            const body = await request.json().catch(() => ({}))
            user_id = body.user_id
            user_ids = body.user_ids || []
        }
        
        if (user_ids.length > 0) {
            const { error } = await adminSupabase
                .from('exam_assignments')
                .delete()
                .eq('exam_id', examId)
                .in('user_id', user_ids)

            if (error) throw error
            return NextResponse.json({ success: true }, { status: 200 })
        }

        if (!user_id) return NextResponse.json({ success: false, error: 'user_id or user_ids is required' }, { status: 400 })

        const { error } = await adminSupabase
            .from('exam_assignments')
            .delete()
            .eq('exam_id', examId)
            .eq('user_id', user_id)

        if (error) throw error

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || "Internal Server Error" }, { status: 500 })
    }
}
