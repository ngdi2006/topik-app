"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Search, Plus, Coins, Trash2, History, Upload, Download } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { useUserStore } from "@/store/userStore"
import { UserBulkImportModal } from "@/components/admin/UserBulkImportModal"
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
    remainingCredits: number
    status: string
    joinedAt: string
}

type HistoryRecord = {
    id: string
    score: number
    raw_score?: number
    total_points?: number
    total_correct: number
    created_at: string
    exams?: {
        level?: string
        title?: string
    }
}

type CreditAction = 'add' | 'deduct'

const initialGrantForm = {
    action: 'add' as CreditAction,
    credits: '',
    notes: '',
}

const actionLabels: Record<CreditAction, string> = {
    add: 'Cộng lượt',
    deduct: 'Trừ lượt',
}

const actionMessages: Record<CreditAction, string> = {
    add: 'Đang cộng lượt...',
    deduct: 'Đang trừ lượt...',
}

const actionErrorMessages: Record<CreditAction, string> = {
    add: 'Không thể cộng lượt',
    deduct: 'Không thể trừ lượt',
}

const actionSuccessMessages: Record<CreditAction, (credits: string, name: string) => string> = {
    add: (credits, name) => `Đã cộng ${credits} lượt cho ${name}`,
    deduct: (credits, name) => `Đã trừ ${credits} lượt của ${name}`,
}

const actionInputLabels: Record<CreditAction, string> = {
    add: 'Số lượt cộng thêm',
    deduct: 'Số lượt cần trừ',
}

const actionHelperText: Record<CreditAction, string> = {
    add: 'Nhập số lượt muốn cộng thêm cho người dùng.',
    deduct: 'Không thể trừ vượt quá số lượt hiện có của người dùng.',
}

const actionButtonVariants: Record<CreditAction, 'default' | 'destructive'> = {
    add: 'default',
    deduct: 'destructive',
}

const actionButtonClasses: Record<CreditAction, string> = {
    add: '',
    deduct: 'bg-red-600 hover:bg-red-700',
}

const actionTabsClasses = (isActive: boolean) =>
    isActive
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:bg-muted/80'

const formatCredits = (credits: number) => `${credits} lượt`

const isErrorWithMessage = (error: unknown): error is Error => error instanceof Error

const getErrorMessage = (error: unknown, fallback: string) =>
    isErrorWithMessage(error) ? error.message : fallback

const isPositiveInteger = (value: string) => /^[1-9]\d*$/.test(value)

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('all')
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(20)
    const { role: currentUserRole } = useUserStore()
    const isTeacher = currentUserRole === 'teacher'

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'learner',
        groupName: '',
        dateOfBirth: ''
    })
    const [isExporting, setIsExporting] = useState(false)

    const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false)
    const [selectedUserForCredits, setSelectedUserForCredits] = useState<UserProfile | null>(null)
    const [grantForm, setGrantForm] = useState(initialGrantForm)
    const [isGrantingCredits, setIsGrantingCredits] = useState(false)

    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [isBulkGrantDialogOpen, setIsBulkGrantDialogOpen] = useState(false)
    const [bulkGrantForm, setBulkGrantForm] = useState(initialGrantForm)

    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [selectedUserHistory, setSelectedUserHistory] = useState<HistoryRecord[]>([])
    const [isFetchingHistory, setIsFetchingHistory] = useState(false)
    const [selectedUserName, setSelectedUserName] = useState("")

    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)
    const [mathProblem, setMathProblem] = useState({ a: 0, b: 0, answer: '' })

    const generateMathProblem = () => {
        const a = Math.floor(Math.random() * 10) + 1
        const b = Math.floor(Math.random() * 10) + 1
        setMathProblem({ a, b, answer: '' })
    }

    const fetchUsers = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/admin/users')
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch users")
            }
            setUsers(Array.isArray(data.users) ? data.users : [])
        } catch (error) {
            toast.error(getErrorMessage(error, 'Không thể tải danh sách người dùng'))
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, selectedGroupFilter, selectedRoleFilter, itemsPerPage])

    const closeGrantDialog = () => {
        setIsGrantDialogOpen(false)
        setSelectedUserForCredits(null)
        setGrantForm(initialGrantForm)
    }

    const openGrantDialog = (user: UserProfile) => {
        setSelectedUserForCredits(user)
        setGrantForm(initialGrantForm)
        setIsGrantDialogOpen(true)
    }

    const handleViewHistory = async (userId: string, userName: string) => {
        setIsHistoryOpen(true)
        setSelectedUserName(userName)
        setIsFetchingHistory(true)
        setSelectedUserHistory([])

        try {
            const res = await fetch(`/api/admin/users/${userId}/history`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setSelectedUserHistory(Array.isArray(data.history) ? data.history : [])
        } catch (error) {
            toast.error(getErrorMessage(error, "Lỗi tải lịch sử thi"))
        } finally {
            setIsFetchingHistory(false)
        }
    }

    const handleDelete = async (userId: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn người dùng này?")) return

        const loadingToast = toast.loading("Đang xóa người dùng...")
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                const message = data && typeof data.error === 'string' ? data.error : "Lỗi xóa dữ liệu"
                throw new Error(message)
            }
            toast.success("Xóa người dùng thành công", { id: loadingToast })
            setUsers(users.filter((u) => u.id !== userId))
        } catch (error) {
            toast.error(getErrorMessage(error, 'Lỗi xóa dữ liệu'), { id: loadingToast })
        }
    }

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

            const data = await res.json().catch(() => null)
            if (!res.ok) {
                const message = data && typeof data.error === 'string' ? data.error : "Lỗi tạo tài khoản"
                throw new Error(message)
            }

            toast.success("Tạo tài khoản thành công!", { id: toastId })
            setIsAddDialogOpen(false)
            setFormData({ name: '', email: '', password: '', role: 'learner', groupName: '', dateOfBirth: '' })
            fetchUsers()
        } catch (error) {
            toast.error(getErrorMessage(error, 'Lỗi tạo tài khoản'), { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChangeGroup = async (userId: string, newGroup: string) => {
        const previousUsers = [...users]
        setUsers(users.map(u => u.id === userId ? { ...u, groupName: newGroup } : u))

        try {
            const res = await fetch(`/api/admin/users/${userId}/group`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupName: newGroup })
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                const message = data && typeof data.error === 'string' ? data.error : "Lỗi cập nhật nhóm"
                throw new Error(message)
            }
            toast.success("Cập nhật nhóm thành công")
        } catch (error) {
            toast.error(getErrorMessage(error, 'Lỗi cập nhật nhóm'))
            setUsers(previousUsers)
        }
    }

    const handleChangeRole = async (userId: string, newRole: string) => {
        if (!confirm(`Xác nhận đổi quyền người dùng này thành ${newRole.toUpperCase()}?`)) return

        const loadingToast = toast.loading("Đang cập nhật quyền...")
        try {
            const res = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                const message = data && typeof data.error === 'string' ? data.error : "Lỗi cập nhật"
                throw new Error(message)
            }
            toast.success("Cập nhật quyền thành công", { id: loadingToast })
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
        } catch (error) {
            toast.error(getErrorMessage(error, 'Lỗi cập nhật quyền'), { id: loadingToast })
        }
    }

    const handleGrantCredits = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedUserForCredits) return

        if (!isPositiveInteger(grantForm.credits)) {
            toast.error('Vui lòng nhập số lượt là số nguyên dương')
            return
        }

        const action = grantForm.action
        const requestedCredits = Number(grantForm.credits)

        if (action === 'deduct' && requestedCredits > selectedUserForCredits.remainingCredits) {
            toast.error('Số lượt cần trừ không được vượt quá số lượt hiện có')
            return
        }

        setIsGrantingCredits(true)
        const toastId = toast.loading(actionMessages[action])

        try {
            const res = await fetch(`/api/admin/users/${selectedUserForCredits.id}/credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    credits: requestedCredits,
                    notes: grantForm.notes,
                })
            })

            const data = await res.json().catch(() => null)
            if (!res.ok) {
                const message = data && typeof data.error === 'string' ? data.error : actionErrorMessages[action]
                throw new Error(message)
            }

            toast.success(actionSuccessMessages[action](grantForm.credits, selectedUserForCredits.name), { id: toastId })
            closeGrantDialog()
            fetchUsers()
        } catch (error) {
            toast.error(getErrorMessage(error, actionErrorMessages[action]), { id: toastId })
        } finally {
            setIsGrantingCredits(false)
        }
    }

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUserIds(filteredUsers.map(u => u.id))
        } else {
            setSelectedUserIds([])
        }
    }

    const handleSelectUser = (userId: string, checked: boolean) => {
        if (checked) {
            setSelectedUserIds(prev => [...prev, userId])
        } else {
            setSelectedUserIds(prev => prev.filter(id => id !== userId))
        }
    }

    const handleBulkGrantCredits = async (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedUserIds.length === 0) return

        if (!isPositiveInteger(bulkGrantForm.credits)) {
            toast.error('Vui lòng nhập số lượt là số nguyên dương')
            return
        }

        const action = bulkGrantForm.action
        const requestedCredits = Number(bulkGrantForm.credits)

        setIsGrantingCredits(true)
        const toastId = toast.loading(`Đang xử lý ${selectedUserIds.length} tài khoản...`)

        try {
            const res = await fetch(`/api/admin/users/bulk-credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds: selectedUserIds,
                    action,
                    credits: requestedCredits,
                    notes: bulkGrantForm.notes,
                })
            })

            const data = await res.json().catch(() => null)
            if (!res.ok) {
                const message = data && typeof data.error === 'string' ? data.error : 'Lỗi cập nhật hàng loạt'
                throw new Error(message)
            }

            toast.success(data.message, { id: toastId })
            setIsBulkGrantDialogOpen(false)
            setSelectedUserIds([])
            setBulkGrantForm(initialGrantForm)
            fetchUsers()
        } catch (error) {
            toast.error(getErrorMessage(error, 'Lỗi cập nhật hàng loạt'), { id: toastId })
        } finally {
            setIsGrantingCredits(false)
        }
    }

    const handleBulkDelete = async (e: React.FormEvent) => {
        e.preventDefault()
        if (parseInt(mathProblem.answer) !== mathProblem.a + mathProblem.b) {
            toast.error("Kết quả phép tính không chính xác!")
            return
        }

        setIsBulkDeleting(true)
        const toastId = toast.loading(`Đang xóa ${selectedUserIds.length} tài khoản...`)

        try {
            const res = await fetch(`/api/admin/users/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: selectedUserIds })
            })

            const data = await res.json().catch(() => null)
            if (!res.ok) throw new Error(data?.error || 'Lỗi xóa hàng loạt')

            toast.success(`Đã xóa thành công ${data.successCount} tài khoản`, { id: toastId })
            if (data.errors && data.errors.length > 0) {
                toast.warning(`Có ${data.errors.length} tài khoản không thể xóa`)
            }
            
            setIsBulkDeleteDialogOpen(false)
            setSelectedUserIds([])
            fetchUsers()
        } catch (error) {
            toast.error(getErrorMessage(error, 'Lỗi xóa hàng loạt'), { id: toastId })
        } finally {
            setIsBulkDeleting(false)
        }
    }

    const filteredUsers = users.filter(user => {
        const email = user.email || ''
        const name = user.name || ''
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesGroup = selectedGroupFilter === 'all' || user.groupName === selectedGroupFilter
        const matchesRole = selectedRoleFilter === 'all' || user.role === selectedRoleFilter
        return matchesSearch && matchesGroup && matchesRole
    })

    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

    const handleExportExcel = async () => {
        if (filteredUsers.length === 0) {
            toast.error("Không có người dùng nào để xuất.")
            return
        }

        setIsExporting(true)
        const toastId = toast.loading(`Đang xử lý xuất dữ liệu cho ${filteredUsers.length} người dùng...`)
        try {
            const userIds = filteredUsers.map(u => u.id)
            const res = await fetch('/api/admin/users/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds })
            })

            const responseData = await res.json()
            if (!res.ok) throw new Error(responseData.error || "Lỗi xuất dữ liệu")

            const maxAttempts = Math.max(
                0,
                ...responseData.data.map((item: any) => (item.attempts ? item.attempts.length : 0))
            )

            const exportData = responseData.data.map((item: any, index: number) => {
                const row: any = {
                    'STT': index + 1,
                    'Họ Tên': item.name,
                    'Email': item.email,
                    'Lớp': item.groupName || 'N/A',
                }

                if (!item.attempts || item.attempts.length === 0) {
                    row['Trạng thái'] = 'Chưa có điểm'
                } else {
                    row['Trạng thái'] = 'Đã thi'
                }

                for (let i = 0; i < maxAttempts; i++) {
                    const attempt = item.attempts ? item.attempts[i] : null
                    row[`Ngày giờ lần ${i + 1}`] = attempt ? attempt.completedAt : ''
                    row[`Đề thi lần ${i + 1}`] = attempt ? attempt.examTitle : ''
                    row[`Điểm số lần ${i + 1}`] = attempt ? attempt.score : ''
                }

                return row
            })

            const worksheet = XLSX.utils.json_to_sheet(exportData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "DiemSo")
            
            const groupNameSafe = selectedGroupFilter === 'all' ? 'Tat_Ca' : selectedGroupFilter.replace(/[^a-zA-Z0-9]/g, '_')
            XLSX.writeFile(workbook, `Bang_Diem_${groupNameSafe}_${new Date().getTime()}.xlsx`)

            toast.success("Xuất file Excel thành công", { id: toastId })
        } catch (error) {
            toast.error(getErrorMessage(error, "Lỗi khi xuất file Excel"), { id: toastId })
        } finally {
            setIsExporting(false)
        }
    }

    const uniqueGroups = Array.from(new Set(users.map(u => u.groupName).filter(Boolean)))

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Quản lý Người Dùng</h2>
                    <p className="text-muted-foreground mt-1 mb-4">
                        Xem, phân quyền và quản lý tài khoản học viên/quản trị viên.
                    </p>
                    <div className="flex space-x-3 mb-2">
                        <div className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-md flex flex-col min-w-[120px]">
                            <span className="text-xs text-blue-600 font-medium uppercase tracking-wider">Tổng tài khoản</span>
                            <span className="text-lg font-bold text-blue-900">{users.length}</span>
                        </div>
                        <div className="bg-green-50 border border-green-100 px-3 py-1.5 rounded-md flex flex-col min-w-[120px]">
                            <span className="text-xs text-green-600 font-medium uppercase tracking-wider">Học viên</span>
                            <span className="text-lg font-bold text-green-900">{users.filter(u => u.role === 'learner').length}</span>
                        </div>
                        {!isTeacher && (
                            <div className="bg-yellow-50 border border-yellow-100 px-3 py-1.5 rounded-md flex flex-col min-w-[120px]">
                                <span className="text-xs text-yellow-600 font-medium uppercase tracking-wider">Giáo viên</span>
                                <span className="text-lg font-bold text-yellow-900">{users.filter(u => u.role === 'teacher').length}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex space-x-2">
                    {selectedUserIds.length > 0 && (
                        <>
                            {!isTeacher && (
                                <Button variant="destructive" onClick={() => { generateMathProblem(); setIsBulkDeleteDialogOpen(true); }} className="bg-red-600 hover:bg-red-700">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Xóa ({selectedUserIds.length})
                                </Button>
                            )}
                            <Button variant="secondary" onClick={() => setIsBulkGrantDialogOpen(true)} className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300">
                                <Coins className="w-4 h-4 mr-2" />
                                Điều chỉnh lượt ({selectedUserIds.length})
                            </Button>
                        </>
                    )}
                    <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel} disabled={isExporting} className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? "Đang xuất..." : "Xuất điểm Excel"}
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm người dùng mới
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex-1 flex items-center space-x-2 w-full">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc email..."
                        className="flex-1 border-none focus:ring-0 outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-gray-200 pt-3 sm:pt-0 sm:pl-4 flex space-x-2">
                    <select
                        className="w-full sm:w-[150px] text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"
                        value={selectedRoleFilter}
                        onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    >
                        <option value="all">Tất cả vai trò</option>
                        <option value="learner">Học viên</option>
                        {!isTeacher && <option value="supporter">Hỗ trợ viên</option>}
                        {!isTeacher && <option value="teacher">Giáo viên</option>}
                        {!isTeacher && <option value="admin">Quản trị viên</option>}
                    </select>
                    <select
                        className="w-full sm:w-[180px] text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary"
                        value={selectedGroupFilter}
                        onChange={(e) => setSelectedGroupFilter(e.target.value)}
                    >
                        <option value="all">Tất cả Nhóm/Lớp</option>
                        {uniqueGroups.map((group, idx) => (
                            <option key={idx} value={group}>{group}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                        <tr>
                            <th className="px-6 py-4 font-medium w-12">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-4 font-medium">Họ Tên</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Vai trò</th>
                            <th className="px-6 py-4 font-medium">Nhóm/Lớp</th>
                            <th className="px-6 py-4 font-medium">Lượt</th>
                            <th className="px-6 py-4 font-medium">Trạng thái</th>
                            <th className="px-6 py-4 font-medium">Ngày tham gia</th>
                            <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                                    Đang tải dữ liệu...
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                                    Không tìm thấy dữ liệu nào phù hợp.
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                            checked={selectedUserIds.includes(user.id)}
                                            onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role}
                                            disabled={isTeacher}
                                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${!isTeacher ? 'cursor-pointer' : 'cursor-not-allowed'} outline-none appearance-none border-none text-center ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
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
                                    <td className="px-6 py-4 font-medium text-blue-700">{formatCredits(user.remainingCredits)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{user.joinedAt}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openGrantDialog(user)}
                                            className="h-8 w-8 text-amber-600 bg-amber-50"
                                            title="Điều chỉnh lượt"
                                        >
                                            <Coins className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleViewHistory(user.id, user.name)}
                                            className="h-8 w-8 text-blue-600 bg-blue-50"
                                            title="Xem lịch sử thi"
                                        >
                                            <History className="w-4 h-4" />
                                        </Button>
                                        {!isTeacher && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(user.id)}
                                                className="h-8 w-8 text-red-600"
                                                title="Xóa người dùng"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {filteredUsers.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                        <div className="text-sm text-gray-500">
                            Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} trong số {filteredUsers.length} tài khoản
                        </div>
                        <div className="flex items-center space-x-2">
                            <select 
                                className="text-sm border-gray-300 rounded-md py-1 px-2"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            >
                                <option value={10}>10 dòng/trang</option>
                                <option value={20}>20 dòng/trang</option>
                                <option value={50}>50 dòng/trang</option>
                                <option value={100}>100 dòng/trang</option>
                            </select>
                            <div className="flex items-center space-x-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8"
                                >
                                    Trước
                                </Button>
                                <span className="text-sm px-2">
                                    Trang {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8"
                                >
                                    Sau
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

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
                            <Label htmlFor="dateOfBirth">Ngày sinh (Tùy chọn)</Label>
                            <Input
                                id="dateOfBirth"
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Phân quyền</Label>
                            <select
                                id="role"
                                disabled={isTeacher}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="learner">Học viên (Learner)</option>
                                {!isTeacher && (
                                    <>
                                        <option value="supporter">Hỗ trợ viên (Supporter)</option>
                                        <option value="teacher">Giáo viên (Teacher)</option>
                                        <option value="admin">Quản trị viên (Admin)</option>
                                    </>
                                )}
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

            <Dialog open={isGrantDialogOpen} onOpenChange={(open) => !open && closeGrantDialog()}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Điều chỉnh lượt người dùng</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleGrantCredits} className="space-y-4 py-4">
                        <div className="space-y-1 text-sm">
                            <p className="font-medium text-gray-900">{selectedUserForCredits?.name}</p>
                            <p className="text-muted-foreground">{selectedUserForCredits?.email}</p>
                            <p className="text-blue-700 font-medium">Hiện có: {formatCredits(selectedUserForCredits?.remainingCredits ?? 0)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                            {(['add', 'deduct'] as CreditAction[]).map((action) => (
                                <button
                                    key={action}
                                    type="button"
                                    onClick={() => setGrantForm({ ...grantForm, action })}
                                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${actionTabsClasses(grantForm.action === action)}`}
                                >
                                    {actionLabels[action]}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="grantCredits">{actionInputLabels[grantForm.action]}</Label>
                            <Input
                                id="grantCredits"
                                type="number"
                                min={1}
                                step={1}
                                placeholder="VD: 5"
                                value={grantForm.credits}
                                onChange={(e) => setGrantForm({ ...grantForm, credits: e.target.value })}
                                required
                            />
                            <p className={`text-xs ${grantForm.action === 'deduct' ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {actionHelperText[grantForm.action]}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="grantNotes">Ghi chú (Tùy chọn)</Label>
                            <Input
                                id="grantNotes"
                                placeholder={grantForm.action === 'add' ? 'VD: Tặng thêm lượt cho học viên' : 'VD: Điều chỉnh lại lượt đã cấp'}
                                value={grantForm.notes}
                                onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeGrantDialog}>
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                variant={actionButtonVariants[grantForm.action]}
                                className={actionButtonClasses[grantForm.action]}
                                disabled={isGrantingCredits}
                            >
                                {isGrantingCredits ? actionMessages[grantForm.action] : actionLabels[grantForm.action]}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isBulkGrantDialogOpen} onOpenChange={(open) => !open && setIsBulkGrantDialogOpen(false)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Điều chỉnh lượt cho {selectedUserIds.length} tài khoản</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBulkGrantCredits} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                            {(['add', 'deduct'] as CreditAction[]).map((action) => (
                                <button
                                    key={action}
                                    type="button"
                                    onClick={() => setBulkGrantForm({ ...bulkGrantForm, action })}
                                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${actionTabsClasses(bulkGrantForm.action === action)}`}
                                >
                                    {actionLabels[action]}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bulkGrantCredits">{actionInputLabels[bulkGrantForm.action]}</Label>
                            <Input
                                id="bulkGrantCredits"
                                type="number"
                                min={1}
                                step={1}
                                placeholder="VD: 5"
                                value={bulkGrantForm.credits}
                                onChange={(e) => setBulkGrantForm({ ...bulkGrantForm, credits: e.target.value })}
                                required
                            />
                            <p className={`text-xs ${bulkGrantForm.action === 'deduct' ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {bulkGrantForm.action === 'deduct' ? 'Lưu ý: Nếu số lượt trừ lớn hơn số lượt hiện có của tài khoản nào đó, hệ thống sẽ báo lỗi cho tài khoản đó.' : 'Số lượt sẽ được cộng thêm vào tất cả tài khoản đã chọn.'}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bulkGrantNotes">Ghi chú (Tùy chọn)</Label>
                            <Input
                                id="bulkGrantNotes"
                                placeholder="VD: Tặng lượt nhân dịp lễ"
                                value={bulkGrantForm.notes}
                                onChange={(e) => setBulkGrantForm({ ...bulkGrantForm, notes: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsBulkGrantDialogOpen(false)}>
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                variant={actionButtonVariants[bulkGrantForm.action]}
                                className={actionButtonClasses[bulkGrantForm.action]}
                                disabled={isGrantingCredits}
                            >
                                {isGrantingCredits ? actionMessages[bulkGrantForm.action] : actionLabels[bulkGrantForm.action]}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
                                            <div className="text-2xl font-bold text-primary">{record.raw_score ?? record.score}<span className="text-sm font-medium text-gray-400">/{record.total_points ?? 100}</span></div>
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

            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" /> Xác nhận xóa hàng loạt
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBulkDelete} className="space-y-4 py-4">
                        <p className="text-sm text-gray-700">
                            Bạn đang chuẩn bị xóa vĩnh viễn <strong>{selectedUserIds.length}</strong> tài khoản khỏi hệ thống. Thao tác này không thể hoàn tác!
                        </p>
                        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-100">
                            Để xác nhận xóa, vui lòng nhập kết quả của phép tính:
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="font-bold text-lg bg-gray-100 px-4 py-2 rounded-md">
                                {mathProblem.a} + {mathProblem.b} =
                            </div>
                            <Input
                                type="number"
                                placeholder="Nhập kết quả"
                                className="flex-1"
                                value={mathProblem.answer}
                                onChange={(e) => setMathProblem({ ...mathProblem, answer: e.target.value })}
                                required
                            />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" variant="destructive" disabled={isBulkDeleting || !mathProblem.answer}>
                                {isBulkDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <UserBulkImportModal 
                isOpen={isBulkImportOpen}
                onClose={() => setIsBulkImportOpen(false)}
                onSuccess={() => fetchUsers()}
            />
        </div>
    )
}
