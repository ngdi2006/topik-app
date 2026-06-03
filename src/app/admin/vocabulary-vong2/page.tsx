'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Upload, Trash2, Edit, Search, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { VocabBulkImportModal } from "@/components/admin/VocabBulkImportModal"
import { VocabFormModal } from "@/components/admin/VocabFormModal"

const INDUSTRY_LABELS: Record<string, string> = {
    'COMMON': 'Chung (Tất cả ngành)',
    'MANUFACTURING': 'Sản xuất chế tạo',
    'FISHERY': 'Ngư nghiệp',
    'AGRICULTURE': 'Nông nghiệp',
    'FORESTRY': 'Lâm nghiệp',
    'SERVICE': 'Dịch vụ',
    'CONSTRUCTION': 'Xây dựng'
}

export default function VocabularyVong2AdminPage() {
    const [vocabList, setVocabList] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [importModalOpen, setImportModalOpen] = useState(false)
    const [formModalOpen, setFormModalOpen] = useState(false)
    const [editItem, setEditItem] = useState<any>(null)

    // Filters & Pagination
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [industryFilter, setIndustryFilter] = useState('ALL')
    const [typeFilter, setTypeFilter] = useState('ALL')
    
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const limit = 20

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    const fetchVocab = async () => {
        setLoading(true)
        try {
            const url = new URL('/api/admin/vocabulary-vong2', window.location.origin)
            if (debouncedSearch) url.searchParams.set('search', debouncedSearch)
            if (industryFilter !== 'ALL') url.searchParams.set('industry', industryFilter)
            if (typeFilter !== 'ALL') url.searchParams.set('type', typeFilter)
            url.searchParams.set('page', page.toString())
            url.searchParams.set('limit', limit.toString())

            const res = await fetch(url.toString())
            const data = await res.json()
            if (data.success) {
                setVocabList(data.data)
                setTotalPages(data.totalPages || 1)
                setTotalCount(data.total || 0)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVocab()
    }, [debouncedSearch, industryFilter, typeFilter, page])

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
                    <Button className="gap-2" onClick={() => { setEditItem(null); setFormModalOpen(true); }}>
                        <Plus className="w-4 h-4" /> Thêm mới
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách từ vựng ({totalCount})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input 
                                placeholder="Tìm kiếm tiếng Hàn, tiếng Việt..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                            <Select value={industryFilter} onValueChange={(val) => { setIndustryFilter(val); setPage(1); }}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Ngành nghề" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả ngành nghề</SelectItem>
                                    {Object.entries(INDUSTRY_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Phân loại" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả loại</SelectItem>
                                    <SelectItem value="TOOL">Dụng cụ (TOOL)</SelectItem>
                                    <SelectItem value="SIGN">Biển báo (SIGN)</SelectItem>
                                    <SelectItem value="COMMAND">Khẩu lệnh (COMMAND)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-10">Đang tải dữ liệu...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">Hình ảnh</th>
                                        <th className="px-6 py-3">Âm thanh</th>
                                        <th className="px-6 py-3">Tiếng Hàn</th>
                                        <th className="px-6 py-3">Tiếng Việt</th>
                                        <th className="px-6 py-3">Ngành nghề</th>
                                        <th className="px-6 py-3">Loại</th>
                                        <th className="px-6 py-3 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vocabList.map(item => {
                                        let validImageUrl = item.image_url;
                                        if (validImageUrl) {
                                            if (validImageUrl.match(/^https?:\/\/[0-9a-fA-F]{6}/)) {
                                                validImageUrl = validImageUrl.replace(/^https?:\/\//, 'https://placehold.co/150x150/');
                                            } else if (validImageUrl.match(/^[0-9a-fA-F]{6}/)) {
                                                validImageUrl = `https://placehold.co/150x150/${validImageUrl}`;
                                            }
                                        }

                                        return (
                                        <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                {validImageUrl ? (
                                                    <img src={validImageUrl} alt="img" className="w-16 h-16 object-contain bg-gray-100 rounded" />
                                                ) : <span className="text-gray-400">Không có</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.audio_url ? (
                                                    <button 
                                                        onClick={() => {
                                                            const audio = new Audio(item.audio_url);
                                                            audio.play().catch(e => {
                                                                console.error('Lỗi phát âm thanh:', e);
                                                            });
                                                        }}
                                                        className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                        title="Nghe thử"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                                                    </button>
                                                ) : <span className="text-gray-400">-</span>}
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
                                                <Button variant="ghost" size="icon" className="text-blue-600" onClick={() => { setEditItem(item); setFormModalOpen(true); }}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                    {vocabList.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-10 text-center">Chưa có dữ liệu</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                Trước
                            </Button>
                            <span className="text-sm font-medium">Trang {page} / {totalPages}</span>
                            <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                                Sau
                            </Button>
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

            <VocabFormModal
                isOpen={formModalOpen}
                onClose={() => setFormModalOpen(false)}
                onSuccess={() => {
                    setFormModalOpen(false)
                    fetchVocab()
                }}
                editData={editItem}
            />
        </div>
    )
}
