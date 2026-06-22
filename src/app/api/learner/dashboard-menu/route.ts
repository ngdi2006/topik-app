import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const fallbackMenu = [
    { key: 'bai-hoc', label: 'Bài học', is_enabled: true, sort_order: 1 },
    { key: 'luyen-tap', label: 'Luyện Tập', is_enabled: true, sort_order: 2 },
    { key: 'thi-thu', label: 'Thi Thử', is_enabled: true, sort_order: 3 },
    { key: 'ai-chat', label: 'Luyện giao tiếp AI', is_enabled: true, sort_order: 4 },
    { key: 'kiem-tra', label: 'Kiểm Tra', is_enabled: true, sort_order: 5 },
    { key: 'phong-van', label: 'Phỏng Vấn V2', is_enabled: true, sort_order: 6 },
    { key: 'tu-vung-vong-2', label: 'Từ vựng & Biển báo', is_enabled: true, sort_order: 7 },
]

export async function GET() {
    try {
        const admin = createAdminClient()
        const { data, error } = await admin
            .from('learner_dashboard_menu_settings')
            .select('*')
            .eq('is_enabled', true)
            .order('sort_order', { ascending: true })

        if (error) throw error

        let finalData = data && data.length > 0 ? data : fallbackMenu

        // Ensure phong-van is always available for Vòng 2 module
        if (!finalData.some(m => m.key === 'phong-van')) {
            finalData.push({ key: 'phong-van', label: 'Phỏng Vấn V2', is_enabled: true, sort_order: 6 })
        }

        // Ensure tu-vung-vong-2 is always available
        if (!finalData.some(m => m.key === 'tu-vung-vong-2')) {
            finalData.push({ key: 'tu-vung-vong-2', label: 'Từ vựng & Biển báo', is_enabled: true, sort_order: 7 })
        }

        return NextResponse.json(finalData)
    } catch (error) {
        console.error('Error fetching learner dashboard menu:', error)
        return NextResponse.json(fallbackMenu)
    }
}
