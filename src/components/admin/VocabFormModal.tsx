'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, X, Music } from 'lucide-react'

const INDUSTRY_LABELS: Record<string, string> = {
    'COMMON': 'Chung (Tất cả ngành)',
    'MANUFACTURING': 'Sản xuất chế tạo',
    'FISHERY': 'Ngư nghiệp',
    'AGRICULTURE': 'Nông nghiệp',
    'FORESTRY': 'Lâm nghiệp',
    'SERVICE': 'Dịch vụ',
    'CONSTRUCTION': 'Xây dựng'
}

interface VocabFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    editData?: any
}

export function VocabFormModal({ isOpen, onClose, onSuccess, editData }: VocabFormModalProps) {
    const [wordKr, setWordKr] = useState('')
    const [wordVi, setWordVi] = useState('')
    const [industry, setIndustry] = useState('COMMON')
    const [type, setType] = useState('TOOL')
    
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
    
    const [audioFile, setAudioFile] = useState<File | null>(null)
    const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null)

    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (editData) {
                setWordKr(editData.word_kr || '')
                setWordVi(editData.word_vi || '')
                setIndustry(editData.industry || 'COMMON')
                setType(editData.type || 'TOOL')
                setPreviewImageUrl(editData.image_url || null)
                setPreviewAudioUrl(editData.audio_url || null)
            } else {
                setWordKr('')
                setWordVi('')
                setIndustry('COMMON')
                setType('TOOL')
                setImageFile(null)
                setPreviewImageUrl(null)
                setAudioFile(null)
                setPreviewAudioUrl(null)
            }
        }
    }, [isOpen, editData])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            setPreviewImageUrl(URL.createObjectURL(file))
        }
    }

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAudioFile(file)
            setPreviewAudioUrl(URL.createObjectURL(file))
        }
    }

    const handleSave = async () => {
        if (!wordKr.trim() || !wordVi.trim()) {
            toast.error('Vui lòng nhập đủ Tiếng Hàn và Tiếng Việt')
            return
        }

        setIsSaving(true)
        try {
            let finalImageUrl = editData ? editData.image_url : null
            if (imageFile) {
                const formData = new FormData()
                formData.append('file', imageFile)
                formData.append('folder', 'vocab_vong2')
                const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: formData })
                if (!uploadRes.ok) throw new Error('Upload ảnh thất bại')
                const uploadData = await uploadRes.json()
                finalImageUrl = uploadData.url
            }

            let finalAudioUrl = editData ? editData.audio_url : null
            if (audioFile) {
                const formData = new FormData()
                formData.append('file', audioFile)
                formData.append('folder', 'vocab_vong2')
                const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: formData })
                if (!uploadRes.ok) throw new Error('Upload âm thanh thất bại')
                const uploadData = await uploadRes.json()
                finalAudioUrl = uploadData.url
            } else if (!finalAudioUrl && wordKr.trim()) {
                finalAudioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q=${encodeURIComponent(wordKr.trim())}`
            }

            const payload = {
                word_kr: wordKr,
                word_vi: wordVi,
                industry,
                type,
                image_url: finalImageUrl,
                audio_url: finalAudioUrl
            }

            let res
            if (editData) {
                res = await fetch(`/api/admin/vocabulary-vong2/${editData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
            } else {
                res = await fetch('/api/admin/vocabulary-vong2', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
            }

            const data = await res.json()
            if (!data.success) throw new Error(data.error)

            toast.success(editData ? 'Cập nhật thành công!' : 'Thêm mới thành công!')
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error(error)
            toast.error('Lỗi khi lưu: ' + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editData ? 'Sửa Từ Vựng' : 'Thêm Từ Vựng Mới'}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Tiếng Hàn *</label>
                            <Input value={wordKr} onChange={e => setWordKr(e.target.value)} placeholder="Ví dụ: 망치" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Tiếng Việt *</label>
                            <Input value={wordVi} onChange={e => setWordVi(e.target.value)} placeholder="Ví dụ: Cái búa" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Ngành nghề</label>
                            <Select value={industry} onValueChange={setIndustry}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(INDUSTRY_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Phân loại</label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TOOL">Dụng cụ (TOOL)</SelectItem>
                                    <SelectItem value="SIGN">Biển báo (SIGN)</SelectItem>
                                    <SelectItem value="COMMAND">Khẩu lệnh (COMMAND)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4 border-l pl-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex justify-between">
                                Hình ảnh
                                {previewImageUrl && (
                                    <button onClick={() => {setImageFile(null); setPreviewImageUrl(null)}} className="text-red-500 hover:text-red-700 text-xs flex items-center">
                                        <X className="w-3 h-3 mr-1"/> Xóa ảnh
                                    </button>
                                )}
                            </label>
                            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
                                {previewImageUrl ? (
                                    <img src={previewImageUrl} alt="preview" className="max-h-32 mx-auto rounded" />
                                ) : (
                                    <div className="py-4 text-slate-400">
                                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <span className="text-sm">Click để chọn ảnh</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex justify-between">
                                Âm thanh
                                {previewAudioUrl && (
                                    <button onClick={() => {setAudioFile(null); setPreviewAudioUrl(null)}} className="text-red-500 hover:text-red-700 text-xs flex items-center">
                                        <X className="w-3 h-3 mr-1"/> Xóa âm thanh
                                    </button>
                                )}
                            </label>
                            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
                                {previewAudioUrl ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Music className="w-8 h-8 text-blue-500" />
                                        <audio controls src={previewAudioUrl} className="h-8 w-full max-w-[200px]" />
                                    </div>
                                ) : (
                                    <div className="py-4 text-slate-400">
                                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <span className="text-sm">Click để chọn file âm thanh (.mp3)</span>
                                        <p className="text-xs text-blue-500 mt-2 font-medium">Hoặc để trống, hệ thống sẽ tự dùng AI đọc tiếng Hàn</p>
                                    </div>
                                )}
                                <input type="file" accept="audio/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleAudioChange} />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Hủy</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                        {isSaving ? 'Đang lưu...' : 'Lưu lại'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
