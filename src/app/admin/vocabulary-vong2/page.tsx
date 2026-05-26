'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Upload, Trash2, Edit } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { VocabBulkImportModal } from "@/components/admin/VocabBulkImportModal"

const INDUSTRY_LABELS: Record<string, string> = {
    'COMMON': 'Chung (Tất cả ngành)',
    'MANUFACTURING': 'Sản xuất chế tạo',
    'FISHERY': 'Ngư nghiệp',
    'AGRICULTURE': 'Nông nghiệp'
}

export default function VocabularyVong2AdminPage() {
    const [vocabList, setVocabList] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [importModalOpen, setImportModalOpen] = useState(false)

    const fetchVocab = async () => {
        try {
            const res = await fetch('/api/admin/vocabulary-vong2')
            const data = await res.json()
            if (data.success) {
                setVocabList(data.data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVocab()
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa?')) return
        try {
            const res = await fetch(`/api/admin/vocabulary-vong2/${id}`, { method: 'DELETE' })
            if (res.ok) {
                fetchVocab()
            }
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Từ vựng & Biển báo (Vòng 2)</h1>
                    <p className="text-gray-500">Quản lý kho từ vựng trực quan và biển báo cho Phỏng vấn vòng 2</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => setImportModalOpen(true)}>
                        <Upload className="w-4 h-4" /> Nhập Excel / ZIP
                    </Button>
                    <Button className="gap-2" onClick={() => alert('Thêm thủ công đang được cập nhật')}>
                        <Plus className="w-4 h-4" /> Thêm mới
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách ({vocabList.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-10">Đang tải dữ liệu...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">Hình ảnh</th>
                                        <th className="px-6 py-3">Tiếng Hàn</th>
                                        <th className="px-6 py-3">Tiếng Việt</th>
                                        <th className="px-6 py-3">Ngành nghề</th>
                                        <th className="px-6 py-3">Loại</th>
                                        <th className="px-6 py-3 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vocabList.map(item => (
                                        <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt="img" className="w-16 h-16 object-contain bg-gray-100 rounded" />
                                                ) : <span className="text-gray-400">Không có</span>}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">{item.word_kr}</td>
                                            <td className="px-6 py-4">{item.word_vi}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary">{INDUSTRY_LABELS[item.industry] || item.industry}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge>{item.type}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button variant="ghost" size="icon" className="text-blue-600">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {vocabList.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center">Chưa có dữ liệu</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <VocabBulkImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={() => {
                    setImportModalOpen(false)
                    fetchVocab()
                }}
            />
        </div>
    )
}
