'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { FileSpreadsheet, FileArchive, CheckCircle2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { toast } from 'sonner'

interface BulkImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const [excelFile, setExcelFile] = useState<File | null>(null)
    const [zipFile, setZipFile] = useState<File | null>(null)
    const [isImporting, setIsImporting] = useState(false)
    
    // Progress state
    const [progressStatus, setProgressStatus] = useState('')
    const [progressPercent, setProgressPercent] = useState(0)

    const handleImport = async () => {
        if (!excelFile) {
            toast.error('Vui lòng chọn file Excel')
            return
        }

        setIsImporting(true)
        setProgressPercent(0)
        setProgressStatus('Đang khởi tạo...')

        try {
            // Bước A & B: Giải nén và Upload ảnh nếu có ZIP
            const uploadedUrls: Record<string, string> = {}
            if (zipFile) {
                setProgressStatus('Đang giải nén file ZIP...')
                const zip = new JSZip()
                const zipContent = await zip.loadAsync(zipFile)
                
                const imageFiles = Object.values(zipContent.files).filter(f => !f.dir && f.name.match(/\.(png|jpe?g|gif|webp)$/i))
                
                if (imageFiles.length > 0) {
                    let uploadedCount = 0
                    for (const imgZip of imageFiles) {
                        try {
                            setProgressStatus(`Đang upload ảnh: ${imgZip.name}...`)
                            const blob = await imgZip.async('blob')
                            // Clean up file name from paths (e.g. folder/image.png -> image.png)
                            const filename = imgZip.name.split('/').pop() || imgZip.name
                            
                            const file = new File([blob], filename, { type: blob.type || 'image/png' })
                            
                            const formData = new FormData()
                            formData.append('file', file)
                            formData.append('folder', 'interview_tools')
                            
                            const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
                            const data = await res.json()
                            
                            if (data.success) {
                                uploadedUrls[filename] = data.url
                            } else {
                                console.warn(`Lỗi upload ảnh ${filename}:`, data.error)
                            }
                        } catch (err) {
                            console.error(`Lỗi upload ảnh ${imgZip.name}:`, err)
                        }
                        uploadedCount++
                        setProgressPercent(Math.floor((uploadedCount / imageFiles.length) * 40)) // 40% for images
                    }
                }
            }

            // Bước C: Đọc và phân tích file Excel
            setProgressStatus('Đang đọc file Excel...')
            setProgressPercent(45)
            
            const bstr = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => resolve(e.target?.result as string)
                reader.onerror = (e) => reject(e)
                reader.readAsBinaryString(excelFile)
            })

            setProgressPercent(50)
            const wb = XLSX.read(bstr, { type: 'binary' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const rawData = XLSX.utils.sheet_to_json(ws)

            setProgressStatus('Đang phân tích dữ liệu câu hỏi...')
            const formattedData = rawData.map((row: any) => {
                try {
                    const imgName = row['Tên File Ảnh'] || row['Link Ảnh công cụ'] || row['tool_image_file'] || row['tool_image_url'] || null
                    const finalUrl = (imgName && uploadedUrls[imgName]) ? uploadedUrls[imgName] : imgName

                    // Bước D: Cắt chuỗi mảng suggested_answers bằng ký tự |
                    const rawAnswers = row['Gợi ý trả lời'] || row['suggested_answers']
                    let parsedAnswers = null
                    if (rawAnswers) {
                        if (typeof rawAnswers === 'string') {
                            parsedAnswers = rawAnswers.split('|').map((s: string) => s.trim()).filter(Boolean)
                        } else {
                            parsedAnswers = [String(rawAnswers)]
                        }
                    }

                    return {
                        category: row['Phân loại'] || row['category'] || 'Giao tiếp',
                        question_text: row['Câu hỏi'] || row['question_text'] || '',
                        vietnamese_meaning: row['Dịch nghĩa'] || row['vietnamese_meaning'] || '',
                        countdown_after_audio: parseInt(row['Giây đếm ngược'] || row['countdown_after_audio'] || '5', 10),
                        question_audio_url: row['Link Audio'] || row['question_audio_url'] || null,
                        suggested_answers: parsedAnswers && parsedAnswers.length > 0 ? parsedAnswers : null,
                        target_zone_id: row['ID Ô thả'] || row['target_zone_id'] || null,
                        tool_image_url: finalUrl || null,
                    }
                } catch (err) {
                    console.error("Lỗi parse dòng Excel:", row, err)
                    return null
                }
            }).filter((q: any) => q && q.question_text) // Bỏ qua lỗi

            setProgressPercent(60)

            if (formattedData.length === 0) {
                toast.error('File Excel không chứa câu hỏi hợp lệ.')
                return
            }

            setProgressStatus(`Đang lưu ${formattedData.length} câu hỏi vào Database...`)
            
            // Bước C2: Gọi API lưu database
            const res = await fetch('/api/admin/interview-questions/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formattedData)
            })

            setProgressPercent(90)

            const resData = await res.json()
            if (!resData.success) throw new Error(resData.error)

            setProgressPercent(100)
            setProgressStatus('Hoàn thành!')
            toast.success(`Đã import thành công ${formattedData.length} câu hỏi!`)
            
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1000)

        } catch (error: any) {
            toast.error('Lỗi khi import: ' + error.message)
            setProgressStatus('Lỗi: ' + error.message)
        } finally {
            setIsImporting(false)
        }
    }

    const resetFiles = () => {
        setExcelFile(null)
        setZipFile(null)
        setProgressPercent(0)
        setProgressStatus('')
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isImporting) {
                resetFiles()
                onClose()
            }
        }}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">Import Dữ Liệu Vòng 2</DialogTitle>
                    <DialogDescription>
                        Tải lên file Excel chứa câu hỏi và file ZIP chứa hình ảnh để hệ thống tự động tải và gán link trực tiếp.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* File Excel */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">1. File Danh sách (Excel/CSV) *</label>
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="outline" 
                                className="w-full justify-start h-12 relative overflow-hidden bg-green-50/50 hover:bg-green-50 border-green-200"
                                onClick={() => document.getElementById('excel-upload')?.click()}
                                disabled={isImporting}
                            >
                                <FileSpreadsheet className="w-5 h-5 mr-3 text-green-600" />
                                <span className="truncate flex-1 text-left text-green-900">
                                    {excelFile ? excelFile.name : 'Bấm để chọn file Excel...'}
                                </span>
                                {excelFile && (
                                    <CheckCircle2 className="w-5 h-5 text-green-600 absolute right-3" />
                                )}
                            </Button>
                            <input 
                                id="excel-upload"
                                type="file" 
                                className="hidden" 
                                accept=".xlsx, .xls, .csv"
                                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>

                    {/* File ZIP */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">2. File Ảnh nén (.zip) (Tùy chọn)</label>
                        <p className="text-xs text-gray-500 mb-2">Hệ thống sẽ tự giải nén và đối chiếu với <strong>[Tên File Ảnh]</strong> được khai báo trong Excel.</p>
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="outline" 
                                className="w-full justify-start h-12 relative overflow-hidden bg-amber-50/50 hover:bg-amber-50 border-amber-200"
                                onClick={() => document.getElementById('zip-upload')?.click()}
                                disabled={isImporting}
                            >
                                <FileArchive className="w-5 h-5 mr-3 text-amber-500" />
                                <span className="truncate flex-1 text-left text-amber-900">
                                    {zipFile ? zipFile.name : 'Bấm để chọn file ZIP...'}
                                </span>
                                {zipFile && (
                                    <CheckCircle2 className="w-5 h-5 text-green-600 absolute right-3" />
                                )}
                            </Button>
                            <input 
                                id="zip-upload"
                                type="file" 
                                className="hidden" 
                                accept=".zip"
                                onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {isImporting && (
                        <div className="space-y-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="flex justify-between text-sm font-medium text-blue-800">
                                <span>{progressStatus}</span>
                                <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={resetFiles} disabled={isImporting}>
                        Làm mới
                    </Button>
                    <Button variant="outline" onClick={onClose} disabled={isImporting}>
                        Hủy
                    </Button>
                    <Button onClick={handleImport} disabled={!excelFile || isImporting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
                        {isImporting ? 'Đang xử lý...' : 'Bắt đầu Import'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
