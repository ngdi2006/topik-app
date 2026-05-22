"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface LearnerMenuSetting {
    key: string
    label: string
    is_enabled: boolean
    sort_order: number
}

export default function AdminSettingsPage() {
    const [items, setItems] = useState<LearnerMenuSetting[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings/learner-menu')
            const json = await res.json()

            if (!json.success) {
                throw new Error(json.error || 'Không thể tải cấu hình menu')
            }

            setItems(json.data)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể tải cấu hình menu'
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = (key: string) => {
        setItems((current) =>
            current.map((item) =>
                item.key === key
                    ? { ...item, is_enabled: !item.is_enabled }
                    : item
            )
        )
    }

    const handleSave = async () => {
        setSaving(true)
        const toastId = toast.loading('Đang lưu cấu hình menu...')

        try {
            const res = await fetch('/api/admin/settings/learner-menu', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map((item) => ({
                        key: item.key,
                        is_enabled: item.is_enabled,
                    })),
                }),
            })

            const json = await res.json()
            if (!json.success) {
                throw new Error(json.error || 'Lưu cấu hình thất bại')
            }

            setItems(json.data)
            toast.success('Đã cập nhật menu dashboard học viên', { id: toastId })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Lưu cấu hình thất bại'
            toast.error(message, { id: toastId })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="py-12 text-center text-muted-foreground">Đang tải cấu hình...</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Quản lý các mục hiển thị trên dashboard học viên.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Menu dashboard học viên</CardTitle>
                    <CardDescription>
                        Bật hoặc tắt từng mục menu ở sidebar, menu mobile và phần tổng quan của học viên.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {items.map((item) => (
                        <div
                            key={item.key}
                            className="flex items-center justify-between rounded-lg border px-4 py-3"
                        >
                            <div>
                                <div className="font-medium text-sm">{item.label}</div>
                                <div className="text-xs text-muted-foreground">Khóa: {item.key}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggle(item.key)}
                                className="inline-flex"
                            >
                                <Badge variant={item.is_enabled ? 'default' : 'secondary'}>
                                    {item.is_enabled ? 'Hiển thị' : 'Ẩn'}
                                </Badge>
                            </button>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                            Chưa có cấu hình menu nào.
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSave} disabled={saving || items.length === 0}>
                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
