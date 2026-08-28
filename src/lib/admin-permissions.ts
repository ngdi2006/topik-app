export const ADMIN_MENU_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', path: '/admin', description: 'Xem tổng quan hệ thống.' },
    { key: 'lessons', label: 'Bài học', path: '/admin/lessons', description: 'Quản lý nội dung bài học.' },
    { key: 'practice', label: 'Luyện tập AI', path: '/admin/practice', description: 'Quản lý nội dung luyện tập AI.' },
    { key: 'interview', label: 'Phỏng vấn (Vòng 2)', path: '/admin/interview-module', description: 'Quản lý dữ liệu phỏng vấn Vòng 2.' },
    { key: 'vocabulary_vong2', label: 'Từ vựng Vòng 2', path: '/admin/vocabulary-vong2', description: 'Quản lý từ vựng và biển báo.' },
    { key: 'users', label: 'Người dùng', path: '/admin/users', description: 'Xem và quản lý tài khoản học viên.' },
    { key: 'milestones', label: 'Các mốc học', path: '/admin/milestones', description: 'Quản lý các mốc học tập.' },
    { key: 'categories', label: 'Quản lý kho', path: '/admin/categories', description: 'Quản lý danh mục nội dung.' },
    { key: 'question_bank', label: 'Câu hỏi', path: '/admin/question-bank', description: 'Quản lý ngân hàng câu hỏi.' },
    { key: 'ai_sync', label: 'Đồng bộ AI', path: '/admin/ai-sync', description: 'Thực hiện các tác vụ đồng bộ AI.' },
    { key: 'exams', label: 'Đề thi', path: '/admin/exams', description: 'Quản lý đề thi và cấu hình thi.' },
    { key: 'payments', label: 'Thanh toán', path: '/admin/payments', description: 'Theo dõi và xử lý thanh toán.' },
    { key: 'interview_access', label: 'Báo cáo gói Vòng 2', path: '/admin/interview-access', description: 'Xem và cấp quyền gói Vòng 2.' },
    { key: 'sepay_logs', label: 'Log SePay', path: '/admin/sepay-logs', description: 'Kiểm tra nhật ký webhook SePay.' },
    { key: 'payment_packages', label: 'Gói thanh toán', path: '/admin/payment-packages', description: 'Quản lý các gói thanh toán.' },
    { key: 'settings', label: 'Settings', path: '/admin/settings', description: 'Thay đổi cấu hình hệ thống.' },
] as const

export type AdminPermissionKey = (typeof ADMIN_MENU_ITEMS)[number]['key']

export const ADMIN_PERMISSION_KEYS = ADMIN_MENU_ITEMS.map((item) => item.key)

export function sanitizeAdminPermissions(value: unknown): AdminPermissionKey[] {
    if (!Array.isArray(value)) return []
    const allowed = new Set<string>(ADMIN_PERMISSION_KEYS)
    return Array.from(new Set(['dashboard', ...value.filter((item): item is string => typeof item === 'string' && allowed.has(item))])) as AdminPermissionKey[]
}

export function permissionsForRole(role: string | null | undefined, stored: unknown): AdminPermissionKey[] {
    if (role === 'admin') return [...ADMIN_PERMISSION_KEYS]
    return sanitizeAdminPermissions(stored)
}

export function permissionForPath(pathname: string): AdminPermissionKey | null {
    // Some proxies/CDNs preserve a trailing slash (for example `/admin/`).
    // Normalize it before matching so the dashboard permission cannot redirect
    // `/admin/` back to `/admin` forever.
    const normalizedPathname = pathname.length > 1
        ? pathname.replace(/\/+$/, '')
        : pathname

    if (normalizedPathname.startsWith('/api/admin/')) {
        const apiMappings: Array<[string, AdminPermissionKey]> = [
            ['/api/admin/me', 'dashboard'],
            ['/api/admin/users', 'users'],
            ['/api/admin/lessons', 'lessons'],
            ['/api/admin/practice', 'practice'],
            ['/api/admin/interview-access', 'interview_access'],
            ['/api/admin/interview-', 'interview'],
            ['/api/admin/vocabulary-vong2', 'vocabulary_vong2'],
            ['/api/admin/milestones', 'milestones'],
            ['/api/admin/categories', 'categories'],
            ['/api/admin/question', 'question_bank'],
            ['/api/admin/ai-', 'ai_sync'],
            ['/api/admin/exams', 'exams'],
            ['/api/admin/payments', 'payments'],
            ['/api/admin/sepay-logs', 'sepay_logs'],
            ['/api/admin/payment-packages', 'payment_packages'],
            ['/api/admin/settings', 'settings'],
        ]
        return apiMappings.find(([prefix]) => normalizedPathname.startsWith(prefix))?.[1] || null
    }
    const matches = ADMIN_MENU_ITEMS
        .filter((item) => item.path === '/admin'
            ? normalizedPathname === '/admin'
            : normalizedPathname === item.path || normalizedPathname.startsWith(`${item.path}/`))
        .sort((a, b) => b.path.length - a.path.length)
    return matches[0]?.key || null
}
