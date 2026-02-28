import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Activity, GraduationCap } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
    const adminAuthClient = createAdminClient()

    // Lấy số lượng học viên
    const { count: studentCount } = await adminAuthClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'learner')

    // Lấy số lượng Đề thi
    const { count: examCount } = await adminAuthClient
        .from('exams')
        .select('*', { count: 'exact', head: true })

    // Lấy số lượt nộp bài thi
    const { count: submissionCount } = await adminAuthClient
        .from('exam_results')
        .select('*', { count: 'exact', head: true })
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
                <p className="text-muted-foreground">
                    Thống kê tổng quan hệ thống TOPIK IBT.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng số học viên</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{studentCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Tài khoản học viên</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Đề thi sẵn sàng</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{examCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Tổng số đề trong kho</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lượt làm bài thi</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{submissionCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Hồ sơ kết quả thi lưu trữ</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Hệ thống</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">Online</div>
                        <p className="text-xs text-muted-foreground">Đang hoạt động ổn định</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts / Data tables can be added here later */}
        </div>
    )
}
