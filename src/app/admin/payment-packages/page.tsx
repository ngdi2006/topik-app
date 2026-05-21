"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface PaymentPackage {
    id: string
    package_name: string
    credits: number
    price_vnd: number
    display_order: number
    is_active: boolean
    created_at: string
}

export default function PaymentPackagesPage() {
    const [packages, setPackages] = useState<PaymentPackage[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<PaymentPackage | null>(null)
    const [form, setForm] = useState({
        package_name: '',
        credits: '',
        price_vnd: '',
        display_order: '0',
        is_active: true
    })

    useEffect(() => { fetchPackages() }, [])

    const fetchPackages = async () => {
        try {
            const res = await fetch('/api/admin/payment-packages')
            const json = await res.json()
            if (json.success) setPackages(json.data)
        } catch (error) {
            toast.error('Không thể tải danh sách gói')
        } finally {
            setLoading(false)
        }
    }

    const openCreate = () => {
        setEditing(null)
        setForm({ package_name: '', credits: '', price_vnd: '', display_order: '0', is_active: true })
        setDialogOpen(true)
    }

    const openEdit = (pkg: PaymentPackage) => {
        setEditing(pkg)
        setForm({
            package_name: pkg.package_name,
            credits: String(pkg.credits),
            price_vnd: String(pkg.price_vnd),
            display_order: String(pkg.display_order),
            is_active: pkg.is_active
        })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!form.package_name || !form.credits || !form.price_vnd) {
            toast.error('Vui lòng điền đầy đủ thông tin')
            return
        }

        const toastId = toast.loading(editing ? 'Đang cập nhật...' : 'Đang tạo...')

        try {
            const url = editing
                ? `/api/admin/payment-packages/${editing.id}`
                : '/api/admin/payment-packages'
            const method = editing ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    package_name: form.package_name,
                    credits: Number(form.credits),
                    price_vnd: Number(form.price_vnd),
                    display_order: Number(form.display_order),
                    is_active: form.is_active
                })
            })

            const json = await res.json()
            if (!json.success) throw new Error(json.error)

            toast.success(editing ? 'Đã cập nhật gói' : 'Đã tạo gói mới', { id: toastId })
            setDialogOpen(false)
            fetchPackages()
        } catch (error: any) {
            toast.error(error.message || 'Có lỗi xảy ra', { id: toastId })
        }
    }

    const handleToggleActive = async (pkg: PaymentPackage) => {
        const toastId = toast.loading('Đang cập nhật...')
        try {
            const res = await fetch(`/api/admin/payment-packages/${pkg.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...pkg, is_active: !pkg.is_active })
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)

            toast.success(pkg.is_active ? 'Đã tắt gói' : 'Đã bật gói', { id: toastId })
            fetchPackages()
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        }
    }

    const handleDelete = async (pkg: PaymentPackage) => {
        if (!confirm(`Xóa gói "${pkg.package_name}"?`)) return

        const toastId = toast.loading('Đang xóa...')
        try {
            const res = await fetch(`/api/admin/payment-packages/${pkg.id}`, { method: 'DELETE' })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)

            toast.success('Đã xóa gói', { id: toastId })
            fetchPackages()
        } catch (error: any) {
            toast.error(error.message, { id: toastId })
        }
    }

    const formatPrice = (price: number) =>
        new Intl.NumberFormat('vi-VN').format(price) + ' đ'

    if (loading) {
        return <div className="flex items-center justify-center py-12 text-muted-foreground">Đang tải...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Gói thanh toán</h1>
                <Button onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm gói
                </Button>
            </div>

            <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Tên gói</th>
                            <th className="text-center px-4 py-3 font-medium">Số lượt</th>
                            <th className="text-right px-4 py-3 font-medium">Giá</th>
                            <th className="text-center px-4 py-3 font-medium">Thứ tự</th>
                            <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                            <th className="text-right px-4 py-3 font-medium">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {packages.map((pkg) => (
                            <tr key={pkg.id} className={!pkg.is_active ? 'opacity-50' : ''}>
                                <td className="px-4 py-3 font-medium">{pkg.package_name}</td>
                                <td className="px-4 py-3 text-center">{pkg.credits}</td>
                                <td className="px-4 py-3 text-right">{formatPrice(pkg.price_vnd)}</td>
                                <td className="px-4 py-3 text-center">{pkg.display_order}</td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => handleToggleActive(pkg)}
                                        className="inline-flex"
                                    >
                                        <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                                            {pkg.is_active ? 'Hiển thị' : 'Ẩn'}
                                        </Badge>
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(pkg)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {packages.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                    Chưa có gói nào
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Sửa gói' : 'Thêm gói mới'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tên gói</Label>
                            <Input
                                value={form.package_name}
                                onChange={(e) => setForm({ ...form, package_name: e.target.value })}
                                placeholder="VD: Gói 10 lượt"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Số lượt</Label>
                                <Input
                                    type="number"
                                    value={form.credits}
                                    onChange={(e) => setForm({ ...form, credits: e.target.value })}
                                    placeholder="10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Giá (VNĐ)</Label>
                                <Input
                                    type="number"
                                    value={form.price_vnd}
                                    onChange={(e) => setForm({ ...form, price_vnd: e.target.value })}
                                    placeholder="99000"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Thứ tự hiển thị</Label>
                                <Input
                                    type="number"
                                    value={form.display_order}
                                    onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Trạng thái</Label>
                                <Button
                                    type="button"
                                    variant={form.is_active ? 'default' : 'secondary'}
                                    className="w-full h-9"
                                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                >
                                    {form.is_active ? 'Hiển thị' : 'Ẩn'}
                                </Button>
                            </div>
                        </div>
                        <Button onClick={handleSave} className="w-full">
                            {editing ? 'Cập nhật' : 'Tạo gói'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
