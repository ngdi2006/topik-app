"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Search, Plus, UserCog, Trash2, History } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserProfile {
    id: string
    name: string
    email: string
    role: string
    groupName: string
    status: string
    joinedAt: string
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'learner',
        groupName: ''
    })

    // History Dialog State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [selectedUserHistory, setSelectedUserHistory] = useState<any[]>([])
    const [isFetchingHistory, setIsFetchingHistory] = useState(false)
    const [selectedUserName, setSelectedUserName] = useState("")

    // Fetch Users from API
    const fetchUsers = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/admin/users')
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to fetch users")
            }
            const data = await res.json()
            setUsers(data.users)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    // Fetch User History
    const handleViewHistory = async (userId: string, userName: string) => {
        setIsHistoryOpen(true)
        setSelectedUserName(userName)
        setIsFetchingHistory(true)
        setSelectedUserHistory([])

        try {
            const res = await fetch(`/api/admin/users/${userId}/history`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setSelectedUserHistory(data.history || [])
        } catch (error: any) {
            toast.error(error.message || "Lỗi tải lịch sử thi")
        } finally {
            setIsFetchingHistory(false)
        }
    }

    // Delete User
    const handleDelete = async (userId: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn người dùng này?")) return

        const loadingToast = toast.loading("Đang xóa người dùng...")
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Lỗi xóa dữ liệu")
            }
            toast.success("Xóa người dùng thành công", { id: loadingToast })
            setUsers(users.filter((u) => u.id !== userId))
        } catch (error: any) {
            toast.error(error.message, { id: loadingToast })
        }
    }

    // Create User
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.email || !formData.password) {
            return toast.error("Vui lòng nhập đầy đủ thông tin")
        }

        setIsSubmitting(true)
        const toastId = toast.loading("Đang tạo tài khoản...")

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Lỗi tạo tài khoản")
            }

            toast.success("Tạo tài khoản thành công!", { id: toastId })
            setIsAddDialogOpen(false)
            setFormData({ name: '', email: '', password: '', role: 'learner', groupName: '' })
            fetchUsers() // Refresh list
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Update Group Name Inline
    const handleChangeGroup = async (userId: string, newGroup: string) => {
        const previousUsers = [...users];
        // Optimistic UI Update
        setUsers(users.map(u => u.id === userId ? { ...u, groupName: newGroup } : u))

        try {
            const res = await fetch(`/api/admin/users/${userId}/group`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupName: newGroup })
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Lỗi cập nhật nhóm")
            }
            toast.success("Cập nhật nhóm thành công")
        } catch (error: any) {
            toast.error(error.message)
            setUsers(previousUsers) // Revert on fail
        }
    }

    // Update Role
    const handleChangeRole = async (userId: string, newRole: string) => {
        if (!confirm(`Xác nhận đổi quyền người dùng này thành ${newRole.toUpperCase()}?`)) return

        const loadingToast = toast.loading("Đang cập nhật quyền...")
        try {
            const res = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Lỗi cập nhật")
            }
            toast.success("Cập nhật quyền thành công", { id: loadingToast })
            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
        } catch (error: any) {
            toast.error(error.message, { id: loadingToast })
        }
    }

    // Filter users
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Quản lý Người Dùng</h2>
                    <p className="text-muted-foreground">
                        Xem, phân quyền và quản lý tài khoản học viên/quản trị viên.
                    </p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm người dùng mới
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-gray-200">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    className="flex-1 border-none focus:ring-0 outline-none text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                        <tr>
                            <th className="px-6 py-4 font-medium">Họ Tên</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Vai trò</th>
                            <th className="px-6 py-4 font-medium">Nhóm/Lớp</th>
                            <th className="px-6 py-4 font-medium">Trạng thái</th>
                            <th className="px-6 py-4 font-medium">Ngày tham gia</th>
                            <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                    Đang tải dữ liệu...
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                    Không tìm thấy dữ liệu nào phù hợp.
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer outline-none appearance-none border-none text-center ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                user.role === 'teacher' ? 'bg-yellow-100 text-yellow-700' :
                                                    user.role === 'supporter' ? 'bg-cyan-100 text-cyan-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}
                                        >
                                            <option value="learner">learner</option>
                                            <option value="supporter">supporter</option>
                                            <option value="teacher">teacher</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Input
                                            type="text"
                                            placeholder="Tên lớp..."
                                            defaultValue={user.groupName}
                                            className="h-8 w-28 text-xs px-2"
                                            onBlur={(e) => {
                                                if (e.target.value !== user.groupName) {
                                                    handleChangeGroup(user.id, e.target.value)
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') e.currentTarget.blur()
                                            }}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{user.joinedAt}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleViewHistory(user.id, user.name)}
                                            className="h-8 w-8 text-blue-600 bg-blue-50"
                                            title="Xem lịch sử thi"
                                        >
                                            <History className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(user.id)}
                                            className="h-8 w-8 text-red-600"
                                            title="Xóa người dùng"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Dialog Create User */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Thêm người dùng mới</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Họ và tên</Label>
                            <Input
                                id="name"
                                placeholder="VD: Nguyễn Văn A"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email truy cập</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Email hợp lệ"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Mật khẩu khởi tạo</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Tối thiểu 6 ký tự"
                                minLength={6}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="groupName">Nhóm/Lớp (Tùy chọn)</Label>
                            <Input
                                id="groupName"
                                placeholder="VD: TOPIK II - Lớp A"
                                value={formData.groupName}
                                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Phân quyền</Label>
                            <select
                                id="role"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="learner">Học viên (Learner)</option>
                                <option value="supporter">Hỗ trợ viên (Supporter)</option>
                                <option value="teacher">Giáo viên (Teacher)</option>
                                <option value="admin">Quản trị viên (Admin)</option>
                            </select>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Đang xử lý..." : "Lưu tài khoản"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog View User History */}
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Lịch sử làm bài - {selectedUserName}</DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {isFetchingHistory ? (
                            <div className="text-center py-10 text-muted-foreground animate-pulse">Đang tải dữ liệu báo cáo...</div>
                        ) : selectedUserHistory.length === 0 ? (
                            <div className="text-center py-12 border border-dashed rounded-lg bg-gray-50 text-gray-500">
                                Học viên này chưa có lịch sử làm bài thi nào.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedUserHistory.map((record) => (
                                    <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:border-blue-200 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded uppercase">
                                                    {record.exams?.level || "N/A"}
                                                </span>
                                                <span className="text-xs text-gray-500">{new Date(record.created_at).toLocaleString("vi-VN")}</span>
                                            </div>
                                            <p className="font-semibold text-gray-900">{record.exams?.title || "Đề thi"}</p>
                                        </div>
                                        <div className="mt-3 sm:mt-0 text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 pl-0 sm:pl-4">
                                            <div className="text-2xl font-bold text-primary">{record.score}<span className="text-sm font-medium text-gray-400">/100</span></div>
                                            <div className="text-xs text-green-600 font-medium mt-1">Đúng {record.total_correct} câu</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>Đóng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
