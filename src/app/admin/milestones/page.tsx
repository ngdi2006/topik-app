"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"

export default function AdminMilestones() {
    const supabase = createClient()
    const [milestones, setMilestones] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Form State
    const [isOpen, setIsOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        level: "",
        title: "",
        description: "",
        reading_text: "",
        qa_text: "",
        has_personal_form: "false",
        is_active: "true"
    })

    useEffect(() => {
        fetchMilestones()
    }, [])

    const fetchMilestones = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('milestones')
            .select('*')
            .order('level', { ascending: true })

        if (error) {
            toast.error("Lỗi tải dữ liệu: " + error.message)
        } else {
            setMilestones(data || [])
        }
        setLoading(false)
    }

    const handleOpenEdit = (m: any) => {
        setFormData({
            level: m.level,
            title: m.title,
            description: m.description || "",
            reading_text: m.reading_text || "",
            qa_text: m.qa_text || "",
            has_personal_form: m.has_personal_form ? "true" : "false",
            is_active: m.is_active ? "true" : "false"
        })
        setEditingId(m.id)
        setIsOpen(true)
    }

    const handleOpenNew = () => {
        setFormData({
            level: "", title: "", description: "", reading_text: "", qa_text: "", has_personal_form: "false", is_active: "true"
        })
        setEditingId(null)
        setIsOpen(true)
    }

    const handleSave = async () => {
        if (!formData.level || !formData.title || !formData.reading_text || !formData.qa_text) {
            toast.error("Vui lòng nhập đủ các trường bắt buộc (Level, Title, Reading, QA).")
            return
        }

        setIsSaving(true)
        const payload = {
            ...formData,
            has_personal_form: formData.has_personal_form === "true",
            is_active: formData.is_active === "true",
            updated_at: new Date().toISOString()
        }

        try {
            if (editingId) {
                const { error } = await supabase.from('milestones').update(payload).eq('id', editingId)
                if (error) throw error
                toast.success("Cập nhật mốc thành công!")
            } else {
                const { error } = await supabase.from('milestones').insert([payload])
                if (error) throw error
                toast.success("Thêm mốc mới thành công!")
            }
            setIsOpen(false)
            fetchMilestones()
        } catch (error: any) {
            toast.error("Lỗi lưu dữ liệu: " + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string, level: string) => {
        if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN mốc Level ${level} này không?`)) return

        try {
            const { error } = await supabase.from('milestones').delete().eq('id', id)
            if (error) throw error
            toast.success("Đã xóa Mốc đánh giá thành công!")
            fetchMilestones()
        } catch (error: any) {
            toast.error("Lỗi xóa: " + error.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Quản lý Mốc Đánh Giá</h2>
                    <p className="text-muted-foreground">
                        Thêm sửa xóa các câu hỏi Đọc và Vấn đáp cho hệ thống Đánh giá năng lực AI.
                    </p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenNew} className="gap-2">
                            <Plus className="w-4 h-4" /> Thêm Mốc Mới
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Sửa nội dung Mốc" : "Thêm Mốc Đánh Giá Mới"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mã Level (Bắt buộc, Duy nhất)</Label>
                                    <Input placeholder="VD: 5, 6, 7..." value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })} disabled={!!editingId} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tiêu đề</Label>
                                    <Input placeholder="VD: Mốc 5: Phỏng vấn xin việc" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Mô tả ngắn (Hiển thị dưới Tiêu đề)</Label>
                                <Input placeholder="Mô tả kỹ năng kiểm tra..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Bài Tập Đọc Thành Tiếng (Văn bản để thu âm đọc)</Label>
                                <Textarea className="h-24" placeholder="Nhập tiếng Hàn..." value={formData.reading_text} onChange={e => setFormData({ ...formData, reading_text: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Câu Hỏi Vấn Đáp (Nghe & Trả lời tự do)</Label>
                                <Textarea className="h-16" placeholder="Nhập câu hỏi tiếng Hàn..." value={formData.qa_text} onChange={e => setFormData({ ...formData, qa_text: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Bật Form Xin Thông Tin Cá Nhân</Label>
                                    <Select value={formData.has_personal_form} onValueChange={v => setFormData({ ...formData, has_personal_form: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="false">Tắt (Mặc định)</SelectItem>
                                            <SelectItem value="true">Bật (Buộc HS điền Form để AI soạn bài)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Trạng Thái Hiển Thị</Label>
                                    <Select value={formData.is_active} onValueChange={v => setFormData({ ...formData, is_active: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Đang Hoạt Động (Hiện)</SelectItem>
                                            <SelectItem value="false">Ẩn (Khóa mốc này)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {editingId ? "Lưu Thay Đổi" : "Tạo Mới"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Level</th>
                                    <th className="px-4 py-3 font-medium">Tiêu đề</th>
                                    <th className="px-4 py-3 font-medium hidden md:table-cell">Mô tả</th>
                                    <th className="px-4 py-3 font-medium">Form Cá nhân</th>
                                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                                    <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="h-32 text-center text-muted-foreground">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                            Đang tải dữ liệu Mốc Đánh giá...
                                        </td>
                                    </tr>
                                ) : milestones.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Chưa có Mốc đánh giá nào trong CSDL! Sếp hãy chạy file SQL hoặc ấn "Thêm Mốc Mới" nhé.
                                        </td>
                                    </tr>
                                ) : (
                                    milestones.map((m) => (
                                        <tr key={m.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-primary">Level {m.level}</td>
                                            <td className="px-4 py-3 font-medium">{m.title}</td>
                                            <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{m.description}</td>
                                            <td className="px-4 py-3">
                                                {m.has_personal_form ? (
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">Bật</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Tắt</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {m.is_active ? (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Hiện</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Đang Ẩn</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(m)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id, m.level)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
