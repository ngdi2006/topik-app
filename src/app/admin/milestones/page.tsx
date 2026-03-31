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
import { Loader2, Plus, Pencil, Trash2, BookOpen, Clock, Trophy, Dumbbell } from "lucide-react"

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
        reading_texts: [""],
        reading_points: 20,
        reading_time_limit: 120,
        qa_sections: [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: [""] }],
        grammar_context: "",
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

    const safeParseArray = (val: string) => {
        if (!val) return [""]
        try {
            const parsed = JSON.parse(val)
            if (Array.isArray(parsed)) return parsed
            return [val]
        } catch {
            return [val]
        }
    }

    const safeParseQaSections = (val: string) => {
        if (!val) return [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: [""] }]
        try {
            const parsed = JSON.parse(val)
            if (Array.isArray(parsed)) {
                if (parsed.length === 0) return [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: [""] }]
                // Trường hợp cũ: Mảng các chuỗi ['câu 1', 'câu 2']
                if (typeof parsed[0] === 'string') {
                    return [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: parsed }]
                }
                // Trường hợp cấu trúc Object mới
                return parsed.map((s: any) => ({
                    title: s.title || "Câu 1",
                    points: s.points || 20,
                    time_limit: s.time_limit || 60,
                    question_count: s.question_count || 1,
                    questions: s.questions || [""]
                }))
            }
            return [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: [val] }]
        } catch {
            return [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: [val] }]
        }
    }

    const handleOpenEdit = (m: any) => {
        setFormData({
            level: m.level,
            title: m.title,
            description: m.description || "",
            reading_texts: safeParseArray(m.reading_text),
            reading_points: m.reading_points || 20,
            reading_time_limit: m.reading_time_limit || 120,
            qa_sections: safeParseQaSections(m.qa_text),
            grammar_context: m.grammar_context || "",
            has_personal_form: m.has_personal_form ? "true" : "false",
            is_active: m.is_active ? "true" : "false"
        })
        setEditingId(m.id)
        setIsOpen(true)
    }

    const handleOpenNew = () => {
        setFormData({
            level: "", title: "", description: "", reading_texts: [""], reading_points: 20, reading_time_limit: 120, qa_sections: [{ title: "Câu 1", points: 20, time_limit: 60, question_count: 1, questions: [""] }], grammar_context: "", has_personal_form: "false", is_active: "true"
        })
        setEditingId(null)
        setIsOpen(true)
    }

    const handleSave = async () => {
        // Bảo toàn tuyệt đối cấu trúc Input gốc, kể cả các ô trống để user có thể lưu nháp
        const validReadingTexts = formData.reading_texts.map(t => t.trim())

        const validQaSections = formData.qa_sections.map(section => ({
            title: section.title.trim() || "Câu Hỏi Không Tên",
            points: section.points,
            time_limit: section.time_limit,
            question_count: Math.max(1, section.question_count || 1),
            questions: section.questions.map(q => q.trim()).filter(q => q) // Filter empty out
        }))

        if (!formData.level || !formData.title || validReadingTexts.length === 0 || validQaSections.length === 0) {
            toast.error("Vui lòng nhập đủ: Level, Tiêu đề, ít nhất 1 bài Đọc và ít nhất 1 Dạng Vấn Đáp có Ngân hàng câu hỏi.")
            return
        }

        setIsSaving(true)
        const payload = {
            level: formData.level,
            title: formData.title,
            description: formData.description,
            reading_text: JSON.stringify(validReadingTexts),
            reading_points: Number(formData.reading_points) || 0,
            reading_time_limit: Number(formData.reading_time_limit) || 0,
            qa_text: JSON.stringify(validQaSections),
            grammar_context: formData.grammar_context,
            has_personal_form: formData.has_personal_form === "true",
            is_active: formData.is_active === "true"
        }

        try {
            if (editingId) {
                const res = await fetch('/api/admin/milestones', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingId, ...payload })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                toast.success("Cập nhật mốc thành công!")
            } else {
                const res = await fetch('/api/admin/milestones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
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
            const res = await fetch(`/api/admin/milestones?id=${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
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
                            {/* Thông tin cơ bản */}
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

                            {/* ====================== PHÂN VÙNG 2 MODE ====================== */}
                            <div className="rounded-xl border-2 border-dashed border-gray-200 p-1">
                                <div className="flex gap-2 mb-3 px-3 pt-3">
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200">
                                        <Dumbbell className="w-3.5 h-3.5" /> LUYỆN TẬP — Không điểm, không đếm giờ
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200">
                                        <Trophy className="w-3.5 h-3.5" /> KIỂM TRA — Có điểm số + đồng hồ đếm ngược
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground px-3 pb-3 italic">Nội dung câu hỏi dùng chung cho cả 2 chế độ. Điểm số và giới hạn thời gian bên dưới CHỈ áp dụng khi học viên chọn chế độ <strong>KIỂM TRA</strong>.</p>
                            </div>
                            {/* SECTION 1: BÀI ĐỌC */}
                            <div className="space-y-4 border-2 border-blue-200 p-4 rounded-xl bg-blue-50/40">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-blue-700 font-bold text-base flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" /> Ngân hàng: Bài Đọc Thành Tiếng
                                        </Label>
                                        <p className="text-xs text-blue-500 mt-0.5">Hệ thống sẽ bốc ngẫu nhiên 1 câu cho mỗi lần thi</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => setFormData({ ...formData, reading_texts: [...formData.reading_texts, ""] })}><Plus className="w-4 h-4 mr-1" /> Thêm câu</Button>
                                </div>

                                {/* Cấu hình riêng CHẾ ĐỘ KIỂM TRA */}
                                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Trophy className="w-3.5 h-3.5 text-red-600" />
                                        <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Cấu hình chế độ KIỂM TRA</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="space-y-1">
                                            <Label className="text-red-700 text-xs flex items-center gap-1">
                                                <Trophy className="w-3 h-3" /> Điểm tối đa phần Đọc
                                            </Label>
                                            <Input type="number" placeholder="Vd: 20" value={formData.reading_points} onChange={e => setFormData({ ...formData, reading_points: parseInt(e.target.value) || 0 })} className="bg-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-red-700 text-xs flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Giới hạn thời gian (Giây)
                                            </Label>
                                            <Input type="number" placeholder="Vd: 120" value={formData.reading_time_limit} onChange={e => setFormData({ ...formData, reading_time_limit: parseInt(e.target.value) || 0 })} className="bg-white" />
                                        </div>
                                    </div>
                                </div>

                                {formData.reading_texts.map((text, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <Textarea className="h-20" placeholder={`Câu Đọc ${idx + 1}...`} value={text} onChange={e => {
                                            const newArr = [...formData.reading_texts]
                                            newArr[idx] = e.target.value
                                            setFormData({ ...formData, reading_texts: newArr })
                                        }} />
                                        {formData.reading_texts.length > 1 && (
                                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
                                                const newArr = formData.reading_texts.filter((_, i) => i !== idx)
                                                setFormData({ ...formData, reading_texts: newArr })
                                            }}><Trash2 className="w-4 h-4" /></Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {/* SECTION 2: VẤN ĐÁP */}
                            <div className="space-y-4 border-2 border-emerald-200 p-4 rounded-xl bg-emerald-50/40">
                                <div className="flex items-center justify-between pb-2 border-b border-emerald-100 mb-2">
                                    <div>
                                        <Label className="text-emerald-700 font-bold text-base flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" /> Giao án Vấn Đáp Cơ Động
                                        </Label>
                                        <p className="text-xs text-emerald-600 mt-0.5">Mỗi dạng sẽ bốc ngẫu nhiên 1 câu. Điểm/Thời gian bên dưới chỉ áp dụng khi KIỂM TRA.</p>
                                    </div>
                                    <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                                        setFormData({
                                            ...formData,
                                            qa_sections: [...formData.qa_sections, { title: `Câu ${formData.qa_sections.length + 1}`, points: 20, time_limit: 60, question_count: 1, questions: [""] }]
                                        })
                                    }}>
                                        <Plus className="w-4 h-4 mr-1" /> Thêm Bài Vấn Đáp Mới
                                    </Button>
                                </div>
                                {formData.qa_sections.map((section, secIdx) => (
                                    <div key={secIdx} className="bg-white p-4 rounded-lg border shadow-sm relative space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-md font-semibold font-mono border border-emerald-200">
                                                [{secIdx + 1}]
                                            </div>
                                            <Input className="font-semibold text-emerald-800 border-white focus-visible:ring-1 bg-emerald-50 max-w-[200px]" placeholder="TD: Câu 1, Miêu tả..." value={section.title} onChange={(e) => {
                                                const newSec = formData.qa_sections.map((s, i) => i === secIdx ? { ...s, title: e.target.value } : s)
                                                setFormData({ ...formData, qa_sections: newSec })
                                            }} />
                                            {formData.qa_sections.length > 1 && (
                                                <Button variant="ghost" size="sm" className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                                                    if (!confirm(`Xóa Bài Vấn Đáp [${secIdx + 1}]?`)) return
                                                    const newSec = formData.qa_sections.filter((_, i) => i !== secIdx)
                                                    setFormData({ ...formData, qa_sections: newSec })
                                                }}>
                                                    <Trash2 className="w-4 h-4 mr-1" /> Hủy bài này
                                                </Button>
                                            )}
                                        </div>

                                        {/* Cấu hình chế độ KIỂM TRA cho từng bài QA */}
                                        <div className="bg-red-50 border border-red-200 p-2 rounded-lg mt-2">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Trophy className="w-3 h-3 text-red-600" />
                                                <span className="text-xs font-bold text-red-700">Cấu hình KIỂM TRA cho dạng này</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 text-sm">
                                                <div className="space-y-1">
                                                    <Label className="text-red-700 text-xs flex items-center gap-1"><Trophy className="w-3 h-3" /> Điểm/Câu</Label>
                                                    <Input type="number" className="h-8 bg-white" value={section.points} onChange={(e) => {
                                                        const newSec = formData.qa_sections.map((s, i) => i === secIdx ? { ...s, points: parseInt(e.target.value) || 0 } : s)
                                                        setFormData({ ...formData, qa_sections: newSec })
                                                    }} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-red-700 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian/Câu (s)</Label>
                                                    <Input type="number" className="h-8 bg-white" value={section.time_limit} onChange={(e) => {
                                                        const newSec = formData.qa_sections.map((s, i) => i === secIdx ? { ...s, time_limit: parseInt(e.target.value) || 0 } : s)
                                                        setFormData({ ...formData, qa_sections: newSec })
                                                    }} />
                                                </div>
                                                <div className="space-y-1 bg-emerald-50/80 rounded-md p-1 border border-emerald-200 shadow-sm relative -top-1">
                                                    <Label className="text-emerald-800 text-xs flex items-center gap-1 font-bold"><BookOpen className="w-3 h-3" /> Số lượng bốc</Label>
                                                    <Input type="number" min="1" max="10" className="h-7 bg-white text-emerald-900 font-bold" value={section.question_count} onChange={(e) => {
                                                        const newSec = formData.qa_sections.map((s, i) => i === secIdx ? { ...s, question_count: parseInt(e.target.value) || 1 } : s)
                                                        setFormData({ ...formData, qa_sections: newSec })
                                                    }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pl-2 space-y-2 border-l-2 border-emerald-100 pt-2 ml-4">
                                            <Label className="text-sm font-medium text-emerald-600 flex justify-between items-center">
                                                Ngân hàng câu hỏi (Random bốc thăm 1 câu)
                                                <Button size="sm" variant="ghost" className="h-6 text-emerald-600" onClick={() => {
                                                    const newSec = formData.qa_sections.map((s, i) => i === secIdx ? { ...s, questions: [...s.questions, ""] } : s)
                                                    setFormData({ ...formData, qa_sections: newSec })
                                                }}><Plus className="w-3 h-3 mr-1" /> Thêm câu</Button>
                                            </Label>
                                            {section.questions.map((text, qIdx) => (
                                                <div key={qIdx} className="flex gap-2 items-start">
                                                    <div className="mt-2 text-xs font-bold text-gray-400 w-4">{qIdx + 1}.</div>
                                                    <Textarea className="h-10 min-h-0 py-2" placeholder={`Nội dung câu hỏi ${qIdx + 1}...`} value={text} onChange={e => {
                                                        const newSec = formData.qa_sections.map((s, i) => i === secIdx ? { ...s, questions: s.questions.map((q, j) => j === qIdx ? e.target.value : q) } : s)
                                                        setFormData({ ...formData, qa_sections: newSec })
                                                    }} />
                                                    {section.questions.length > 1 && (
                                                        <Button variant="ghost" size="icon" className="text-red-400 h-8 w-8 mt-1" onClick={() => {
                                                            const newSec = formData.qa_sections.map((s, i) => i === secIdx ? { ...s, questions: s.questions.filter((_, j) => j !== qIdx) } : s)
                                                            setFormData({ ...formData, qa_sections: newSec })
                                                        }}><Trash2 className="w-4 h-4" /></Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2 border p-4 rounded-xl bg-amber-50">
                                <Label className="text-amber-800 font-bold">Tài liệu Context & Ngữ pháp áp dụng (Dành riêng cho AI giới thiệu bản thân)</Label>
                                <Textarea
                                    className="h-24 bg-amber-50/50"
                                    placeholder="Điền ngữ pháp/từ vựng cốt lõi của bài này để mớm cho AI. Vd: Ngữ pháp -(으)니까, -(으)면, từ vựng về Thời tiết..."
                                    value={formData.grammar_context}
                                    onChange={e => setFormData({ ...formData, grammar_context: e.target.value })}
                                />
                                <p className="text-xs text-amber-600/80 italic">
                                    * Phần này không hiển thị ra cho học viên, chỉ dùng để nhét vào Prompt mớm cho AI.
                                </p>
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
