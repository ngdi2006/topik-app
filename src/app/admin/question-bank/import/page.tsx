'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Upload, Download, CheckCircle, XCircle, FileAudio, FileImage } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function ImportQuestionPage() {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [importing, setImporting] = useState(false)
    
    // Media files state
    const [requiredMediaFiles, setRequiredMediaFiles] = useState<string[]>([])
    const [uploadedMediaFiles, setUploadedMediaFiles] = useState<File[]>([])
    const supabase = createClient()

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setPreview([])
            setStats(null)
        }
    }

    const handleUpload = async () => {
        if (!file) {
            toast.error('Vui lòng chọn file Excel')
            return
        }

        setLoading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/admin/question-bank/import', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (!data.success) {
                throw new Error(data.error)
            }

            setPreview(data.preview)
            setStats(data.stats)
            
            // Extract required media filenames
            const validData = data.preview.filter((p: any) => p.valid).map((p: any) => p.data);
            const mediaNames = new Set<string>();
            validData.forEach((q: any) => {
                if (q.question_image_url && !q.question_image_url.startsWith('http')) {
                    mediaNames.add(q.question_image_url);
                }
                if (q.audio_url && !q.audio_url.startsWith('http')) {
                    mediaNames.add(q.audio_url);
                }
                q.options?.forEach((opt: any) => {
                    if (opt.type === 'image' && opt.content && !opt.content.startsWith('http')) {
                        mediaNames.add(opt.content);
                    }
                });
            });
            setRequiredMediaFiles(Array.from(mediaNames));
            setUploadedMediaFiles([]);

            toast.success(`Đã parse ${data.stats.total} câu hỏi`)
        } catch (error: any) {
            toast.error(error.message || 'Lỗi upload file')
        } finally {
            setLoading(false)
        }
    }

    const handleMediaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setUploadedMediaFiles(Array.from(e.target.files));
        }
    }

    const handleConfirmImport = async () => {
        const validQuestions = preview.filter((p) => p.valid).map((p) => p.data)

        if (validQuestions.length === 0) {
            toast.error('Không có câu hỏi hợp lệ để import')
            return
        }

        const missingFiles = requiredMediaFiles.filter(
            name => !uploadedMediaFiles.some(f => f.name === name)
        );

        if (missingFiles.length > 0) {
            const proceed = window.confirm(`Bạn chưa tải lên đủ ${missingFiles.length} file media. Vẫn tiếp tục import chứ?`);
            if (!proceed) return;
        }

        setImporting(true)

        try {
            // 1. Upload media files if any
            const mediaUrls: Record<string, string> = {};
            if (uploadedMediaFiles.length > 0) {
                // Lấy tên kho đầu tiên để làm tên thư mục (Nếu có)
                const folderName = validQuestions[0]?.category_name 
                    ? validQuestions[0].category_name.replace(/[^a-zA-Z0-9_-]/g, '_') 
                    : 'uncategorized';

                toast.info(`Đang tải lên ${uploadedMediaFiles.length} file media...`);
                for (const file of uploadedMediaFiles) {
                    // Check if file is actually required
                    if (!requiredMediaFiles.includes(file.name)) continue;

                    const fileExt = file.name.split('.').pop();
                    const fileName = `${folderName}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('questions-media')
                        .upload(fileName, file);
                    
                    if (uploadError) {
                        toast.error(`Lỗi upload file ${file.name}: ${uploadError.message}`);
                        setImporting(false);
                        return;
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('questions-media')
                        .getPublicUrl(fileName);
                    
                    mediaUrls[file.name] = publicUrl;
                }
            }

            // 2. Map URLs back into preview
            const finalQuestions = validQuestions.map((q) => {
                const updatedQ = { ...q, options: q.options ? [...q.options] : [] };
                if (updatedQ.question_image_url && mediaUrls[updatedQ.question_image_url]) {
                    updatedQ.question_image_url = mediaUrls[updatedQ.question_image_url];
                }
                if (updatedQ.audio_url && mediaUrls[updatedQ.audio_url]) {
                    updatedQ.audio_url = mediaUrls[updatedQ.audio_url];
                }
                updatedQ.options = updatedQ.options.map((opt: any) => {
                    if (opt.type === 'image' && mediaUrls[opt.content]) {
                        return { ...opt, content: mediaUrls[opt.content] };
                    }
                    return opt;
                });
                return updatedQ;
            });

            const res = await fetch('/api/admin/question-bank/import', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: finalQuestions }),
            })

            const data = await res.json()

            if (!data.success) {
                throw new Error(data.error)
            }

            toast.success(`Đã import ${data.inserted} câu hỏi!`)
            router.push('/admin/question-bank')
        } catch (error: any) {
            toast.error(error.message || 'Lỗi import')
        } finally {
            setImporting(false)
        }
    }

    const handleDownloadTemplate = async () => {
        try {
            const res = await fetch('/api/admin/question-bank/template')
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'question-bank-template.xlsx'
            a.click()
            toast.success('Đã tải template')
        } catch (error) {
            toast.error('Lỗi tải template')
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">Import Câu Hỏi từ Excel</h2>
                    <p className="text-muted-foreground">
                        Upload file Excel để nhập hàng loạt câu hỏi
                    </p>
                </div>
            </div>

            {/* Download Template */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold mb-1">Bước 1: Tải Template</h3>
                        <p className="text-sm text-muted-foreground">
                            Tải file Excel mẫu, điền thông tin câu hỏi
                        </p>
                    </div>
                    <Button onClick={handleDownloadTemplate} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Tải Template
                    </Button>
                </div>
            </Card>

            {/* Upload File */}
            <Card className="p-6">
                <h3 className="font-semibold mb-4">Bước 2: Upload File Excel</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileSelect}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleUpload}
                            disabled={!file || loading}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {loading ? 'Đang xử lý...' : 'Upload & Parse'}
                        </Button>
                    </div>

                    {file && (
                        <p className="text-sm text-muted-foreground">
                            File: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </p>
                    )}
                </div>
            </Card>

            {/* Preview Results */}
            {stats && (
                <>
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4">Kết quả Parse</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-600">Tổng số</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    {stats.total}
                                </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                                <p className="text-sm text-green-600">Hợp lệ</p>
                                <p className="text-2xl font-bold text-green-700">
                                    {stats.valid}
                                </p>
                            </div>
                            <div className="p-4 bg-red-50 rounded-lg">
                                <p className="text-sm text-red-600">Lỗi</p>
                                <p className="text-2xl font-bold text-red-700">
                                    {stats.invalid}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Media Upload Section */}
                    {requiredMediaFiles.length > 0 && (
                        <Card className="p-6 border-orange-200 bg-orange-50/30">
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="font-semibold text-orange-700">Bước 3: Upload Media Files</h3>
                                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
                                    Bắt buộc
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                Hệ thống phát hiện {requiredMediaFiles.length} file đính kèm trong Excel. Vui lòng chọn các file này để tải lên trước khi Import.
                            </p>
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,audio/*"
                                        onChange={handleMediaFileSelect}
                                        className="flex-1 p-2 bg-white border rounded"
                                    />
                                </div>

                                {/* Required files list */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                                    {requiredMediaFiles.map((filename, idx) => {
                                        const isUploaded = uploadedMediaFiles.some(f => f.name === filename);
                                        return (
                                            <div key={idx} className={`flex items-center gap-2 p-2 rounded text-sm border ${isUploaded ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                                                {filename.match(/\.(mp3|wav|ogg)$/i) ? <FileAudio className="w-4 h-4 shrink-0" /> : <FileImage className="w-4 h-4 shrink-0" />}
                                                <span className="truncate flex-1" title={filename}>{filename}</span>
                                                {isUploaded && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Preview Table */}
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4">Chi tiết</h3>
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left">Dòng</th>
                                        <th className="p-2 text-left">Trạng thái</th>
                                        <th className="p-2 text-left">Kho</th>
                                        <th className="p-2 text-left">Loại</th>
                                        <th className="p-2 text-left">Level</th>
                                        <th className="p-2 text-left">Lỗi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((item, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="p-2">{item.row}</td>
                                            <td className="p-2">
                                                {item.valid ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                )}
                                            </td>
                                            <td className="p-2">
                                                {item.data?.category_name || '-'}
                                            </td>
                                            <td className="p-2">
                                                {item.data?.question_type || '-'}
                                            </td>
                                            <td className="p-2">
                                                {item.data?.level || '-'}
                                            </td>
                                            <td className="p-2 text-red-600 text-xs">
                                                {item.errors?.join(', ') || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Confirm Import */}
                    {stats.valid > 0 && (
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setPreview([])
                                    setStats(null)
                                    setFile(null)
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleConfirmImport}
                                disabled={importing}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {importing ? 'Đang import...' : `Import ${stats.valid} câu hỏi`}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
