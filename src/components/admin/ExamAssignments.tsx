'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Search, UserPlus, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

interface ExamAssignmentsProps {
    examId: string
}

interface AssignedUser {
    user_id: string
    email: string
    name: string
    groupName?: string
    assigned_at: string
}

export function ExamAssignments({ examId }: ExamAssignmentsProps) {
    const [assignments, setAssignments] = useState<AssignedUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
    const [selectedAssignedIds, setSelectedAssignedIds] = useState<Set<string>>(new Set())

    const fetchAssignments = async () => {
        try {
            setIsLoading(true)
            const res = await fetch(`/api/admin/exams/${examId}/assignments`)
            const data = await res.json()
                if (data.success) {
                setAssignments(data.assignments)
                setSelectedAssignedIds(new Set())
            }
        } catch (error) {
            toast.error('Lỗi tải danh sách user được gán')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchAssignments()
    }, [examId])

    const searchUsers = async () => {
        if (!searchQuery.trim()) return
        try {
            setIsSearching(true)
            const res = await fetch(`/api/admin/users`) // Currently this returns all users, we filter locally
            const data = await res.json()
            if (data.users) {
                const query = searchQuery.toLowerCase()
                const filtered = data.users.filter((u: any) => 
                    u.email.toLowerCase().includes(query) || 
                    (u.name && u.name.toLowerCase().includes(query)) ||
                    (u.groupName && u.groupName.toLowerCase().includes(query))
                )
                setSearchResults(filtered)
                setSelectedUserIds(new Set())
            }
        } catch (error) {
            toast.error('Lỗi tìm kiếm user')
        } finally {
            setIsSearching(false)
        }
    }

    const handleAssign = async (userId: string) => {
        if (assignments.some(a => a.user_id === userId)) {
            toast.error('User đã được gán')
            return
        }
        
        const toastId = toast.loading('Đang gán...')
        try {
            const res = await fetch(`/api/admin/exams/${examId}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            })
            const data = await res.json()
            if (data.success) {
                toast.success('Đã gán user', { id: toastId })
                fetchAssignments()
                setSearchResults([])
                setSearchQuery('')
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast.error(error.message || 'Lỗi gán user', { id: toastId })
        }
    }

    const handleAssignBulk = async () => {
        if (selectedUserIds.size === 0) return
        
        const toastId = toast.loading(`Đang gán ${selectedUserIds.size} user...`)
        try {
            const user_ids = Array.from(selectedUserIds).filter(id => !assignments.some(a => a.user_id === id))
            if (user_ids.length === 0) {
                toast.success('Các user đã chọn đều đã được gán', { id: toastId })
                return
            }

            const res = await fetch(`/api/admin/exams/${examId}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_ids })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Đã gán ${user_ids.length} user`, { id: toastId })
                fetchAssignments()
                setSearchResults([])
                setSearchQuery('')
                setSelectedUserIds(new Set())
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast.error(error.message || 'Lỗi gán danh sách user', { id: toastId })
        }
    }

    const toggleSelection = (userId: string) => {
        const newSet = new Set(selectedUserIds)
        if (newSet.has(userId)) newSet.delete(userId)
        else newSet.add(userId)
        setSelectedUserIds(newSet)
    }

    const toggleAll = () => {
        if (selectedUserIds.size === searchResults.length) {
            setSelectedUserIds(new Set())
        } else {
            setSelectedUserIds(new Set(searchResults.map(u => u.id)))
        }
    }

    const handleRemove = async (userId: string) => {
        const toastId = toast.loading('Đang xóa...')
        try {
            const res = await fetch(`/api/admin/exams/${examId}/assignments?user_id=${userId}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (data.success) {
                toast.success('Đã xóa user khỏi danh sách', { id: toastId })
                fetchAssignments()
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast.error(error.message || 'Lỗi xóa user', { id: toastId })
        }
    }

    const handleRemoveBulk = async () => {
        if (selectedAssignedIds.size === 0) return
        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedAssignedIds.size} user khỏi danh sách thi?`)) return
        
        const toastId = toast.loading(`Đang xóa ${selectedAssignedIds.size} user...`)
        try {
            const user_ids = Array.from(selectedAssignedIds)
            const res = await fetch(`/api/admin/exams/${examId}/assignments`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_ids })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Đã xóa ${user_ids.length} user khỏi danh sách`, { id: toastId })
                fetchAssignments()
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast.error(error.message || 'Lỗi xóa danh sách user', { id: toastId })
        }
    }

    const toggleAssignedSelection = (userId: string) => {
        const newSet = new Set(selectedAssignedIds)
        if (newSet.has(userId)) newSet.delete(userId)
        else newSet.add(userId)
        setSelectedAssignedIds(newSet)
    }

    const toggleAllAssigned = () => {
        if (selectedAssignedIds.size === assignments.length) {
            setSelectedAssignedIds(new Set())
        } else {
            setSelectedAssignedIds(new Set(assignments.map(a => a.user_id)))
        }
    }

    return (
        <div className="space-y-4 border-t pt-4 mt-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="font-semibold text-sm">Danh Sách User (Nội bộ)</h4>
            </div>
            
            <p className="text-xs text-muted-foreground">
                Chỉ những học viên có trong danh sách này mới nhìn thấy và làm được đề thi.
            </p>

            <div className="flex gap-2">
                <Input 
                    placeholder="Tìm theo email, tên hoặc lớp..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchUsers()}
                    className="text-sm"
                />
                <Button size="sm" onClick={searchUsers} disabled={isSearching}>
                    <Search className="w-4 h-4" />
                </Button>
            </div>

            {searchResults.length > 0 && (
                <div className="border rounded-md bg-gray-50 p-2 space-y-2 max-h-[300px] overflow-y-auto">
                    <div className="flex justify-between items-center px-1 mb-1 border-b pb-2">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4"
                                checked={selectedUserIds.size === searchResults.length}
                                onChange={toggleAll}
                            />
                            <p className="text-xs font-semibold text-gray-500">Chọn tất cả ({searchResults.length})</p>
                        </div>
                        {selectedUserIds.size > 0 && (
                            <Button size="sm" onClick={handleAssignBulk}>
                                <UserPlus className="w-3 h-3 mr-1" /> Thêm ({selectedUserIds.size}) user
                            </Button>
                        )}
                    </div>
                    {searchResults.map(u => {
                        const isAssigned = assignments.some(a => a.user_id === u.id)
                        return (
                            <div key={u.id} className="flex items-center justify-between bg-white p-2 rounded text-sm border shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 shrink-0"
                                        checked={selectedUserIds.has(u.id)}
                                        onChange={() => toggleSelection(u.id)}
                                        disabled={isAssigned}
                                    />
                                    <div className="overflow-hidden">
                                        <p className="font-medium truncate">{u.name}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {u.email} {u.groupName && <span className="ml-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">- Lớp: {u.groupName}</span>}
                                        </p>
                                    </div>
                                </div>
                                {isAssigned ? (
                                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded shrink-0 ml-2">Đã gán</span>
                                ) : (
                                    <Button size="sm" variant="outline" className="shrink-0 ml-2" onClick={() => handleAssign(u.id)}>
                                        <UserPlus className="w-3 h-3 mr-1" /> Thêm
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="space-y-2 mt-4">
                {isLoading ? (
                    <div className="text-xs text-center py-2 text-gray-500">Đang tải...</div>
                ) : assignments.length === 0 ? (
                    <div className="text-xs text-center py-4 bg-gray-50 rounded border border-dashed text-gray-500">
                        Chưa có học viên nào được gán.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        <div className="flex justify-between items-center px-1 mb-1 border-b pb-2">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4"
                                    checked={selectedAssignedIds.size === assignments.length}
                                    onChange={toggleAllAssigned}
                                />
                                <p className="text-xs font-semibold text-gray-500">Chọn tất cả ({assignments.length})</p>
                            </div>
                            {selectedAssignedIds.size > 0 && (
                                <Button size="sm" variant="destructive" onClick={handleRemoveBulk}>
                                    <X className="w-3 h-3 mr-1" /> Xoá ({selectedAssignedIds.size}) user
                                </Button>
                            )}
                        </div>
                        {assignments.map(a => (
                            <div key={a.user_id} className="flex items-center justify-between text-sm p-2 rounded border bg-white shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 shrink-0"
                                        checked={selectedAssignedIds.has(a.user_id)}
                                        onChange={() => toggleAssignedSelection(a.user_id)}
                                    />
                                    <div className="overflow-hidden">
                                        <p className="font-medium truncate">{a.name}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {a.email} {a.groupName && <span className="ml-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">- Lớp: {a.groupName}</span>}
                                        </p>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-red-500" onClick={() => handleRemove(a.user_id)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
