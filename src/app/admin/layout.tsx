import Link from "next/link"
import { Shield, Users, FileText, Settings, LayoutDashboard } from "lucide-react"
import { AdminUserNav } from "@/components/admin/AdminUserNav"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-gray-50/50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200">
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <Shield className="w-6 h-6 text-primary mr-2" />
                    <span className="font-bold text-lg">TOPIK Admin</span>
                </div>
                <nav className="p-4 space-y-1">
                    <Link href="/admin" className="flex items-center px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-100 transition-colors">
                        <LayoutDashboard className="w-5 h-5 mr-3" />
                        Dashboard
                    </Link>
                    <Link href="/admin/users" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Users className="w-5 h-5 mr-3" />
                        Người dùng
                    </Link>
                    <Link href="/admin/milestones" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <FileText className="w-5 h-5 mr-3" />
                        Các Mốc Học
                    </Link>
                    <Link href="/admin/exams" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <FileText className="w-5 h-5 mr-3" />
                        Exams
                    </Link>
                    <Link href="/admin/settings" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Settings className="w-5 h-5 mr-3" />
                        Settings
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
                    <h1 className="text-xl font-semibold text-gray-800">Cổng Quản Trị Hệ Thống</h1>
                    <div className="flex items-center space-x-4">
                        <AdminUserNav />
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8 flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
