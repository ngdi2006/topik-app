'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { FileSpreadsheet, FileArchive, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { toast } from 'sonner'

interface BulkImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

type PreviewRow = {
    originalIndex: number;
    isValid: boolean;
    errors: string[];
    
    industry: string;
    category: string;
    question_text: string;
    vietnamese_meaning: string;
    countdown_after_audio: number;
    question_audio_url: string | null;
    suggested_answers: string[] | null;
    target_zone_id: string | null;
    tool_image_url: string | null; // Raw image name from Excel

    imageFile?: File;
    previewImageUrl?: string;
};

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [previewData, setPreviewData] = useState<PreviewRow[]>([])
    
    const [excelFile, setExcelFile] = useState<File | null>(null)
    const [zipFile, setZipFile] = useState<File | null>(null)
    const [isImporting, setIsImporting] = useState(false)
    
    // Progress state
    const [progressStatus, setProgressStatus] = useState('')
    const [progressPercent, setProgressPercent] = useState(0)

    const handlePreview = async () => {
        if (!excelFile) {
            toast.error('Vui lòng chọn file Excel')
            return
        }

        setIsImporting(true)
        setProgressPercent(0)
        setProgressStatus('Đang đọc dữ liệu...')

        try {
            // 1. Read ZIP if exists
            const zipFilesMap: Record<string, File> = {}
            if (zipFile) {
                setProgressStatus('Đang giải nén file ZIP...')
                setProgressPercent(10)
                const zip = new JSZip()
                const zipContent = await zip.loadAsync(zipFile)
                
                const imageFiles = Object.values(zipContent.files).filter(f => !f.dir && f.name.match(/\.(png|jpe?g|gif|webp)$/i))
                
                for (const imgZip of imageFiles) {
                    const blob = await imgZip.async('blob')
                    const filename = imgZip.name.split('/').pop() || imgZip.name
                    const file = new File([blob], filename, { type: blob.type || 'image/png' })
                    zipFilesMap[filename] = file
                }
            }

            // 2. Read Excel
            setProgressStatus('Đang đọc file Excel...')
            setProgressPercent(40)
            
            const bstr = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => resolve(e.target?.result as string)
                reader.onerror = (e) => reject(e)
                reader.readAsBinaryString(excelFile)
            })

            setProgressPercent(60)
            const wb = XLSX.read(bstr, { type: 'binary' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const rawData = XLSX.utils.sheet_to_json(ws)

            setProgressStatus('Đang phân tích dữ liệu câu hỏi...')
            
            const parsedRows: PreviewRow[] = []
            
            rawData.forEach((row: any, index: number) => {
                const errors: string[] = []
                let isValid = true
                
                const rawInd = row['Ngành nghề'] || row['industry'] || ''
                let industry = 'Sản xuất chế tạo'
                if (rawInd) {
                    const upperInd = String(rawInd).toUpperCase().trim()
                    const industryMap: Record<string, string> = {
                        'MANUFACTURING': 'Sản xuất chế tạo',
                        'FISHERY': 'Ngư nghiệp',
                        'AGRICULTURE': 'Nông nghiệp',
                        'FORESTRY': 'Lâm nghiệp',
                        'SERVICE': 'Dịch vụ',
                        'CONSTRUCTION': 'Xây dựng',
                        'COMMON': 'Chung (Tất cả ngành)',
                    }
                    industry = industryMap[upperInd] || rawInd
                }

                const category = row['Phân loại'] || row['category'] || ''
                if (!category) {
                    errors.push('Thiếu phân loại')
                    isValid = false
                }

                const question_text = row['Câu hỏi'] || row['question_text'] || ''
                if (!question_text) {
                    // Skip completely empty rows based on question text missing
                    return 
                }

                const imgName = row['Tên File Ảnh'] || row['Link Ảnh công cụ'] || row['tool_image_file'] || row['tool_image_url'] || null
                let imageFile: File | undefined = undefined
                let previewImageUrl: string | undefined = undefined

                if (imgName) {
                    // Check if it's a URL or needs a file from ZIP
                    if (imgName.startsWith('http')) {
                        previewImageUrl = imgName
                    } else if (zipFilesMap[imgName]) {
                        imageFile = zipFilesMap[imgName]
                        previewImageUrl = URL.createObjectURL(imageFile)
                    } else {
                        errors.push(`Thiếu file ảnh đính kèm: ${imgName}`)
                        isValid = false
                    }
                }

                const rawAnswers = row['Gợi ý trả lời'] || row['suggested_answers']
                let parsedAnswers = null
                if (rawAnswers) {
                    if (typeof rawAnswers === 'string') {
                        parsedAnswers = rawAnswers.split('|').map((s: string) => s.trim()).filter(Boolean)
                    } else {
                        parsedAnswers = [String(rawAnswers)]
                    }
                }

                parsedRows.push({
                    originalIndex: index + 2, // +2 because Excel index usually excludes header (1) and array is 0-indexed
                    isValid,
                    errors,
                    industry,
                    category,
                    question_text,
                    vietnamese_meaning: row['Dịch nghĩa'] || row['vietnamese_meaning'] || '',
                    countdown_after_audio: parseInt(row['Giây đếm ngược'] || row['countdown_after_audio'] || '5', 10),
                    question_audio_url: row['Link Audio'] || row['question_audio_url'] || null,
                    suggested_answers: parsedAnswers && parsedAnswers.length > 0 ? parsedAnswers : null,
                    target_zone_id: row['ID Ô thả'] || row['target_zone_id'] || null,
                    tool_image_url: imgName || null,
                    imageFile,
                    previewImageUrl
                })
            })

            setPreviewData(parsedRows)
            setStep(2)
            setProgressPercent(100)
        } catch (error: any) {
            toast.error('Lỗi khi phân tích: ' + error.message)
        } finally {
            setIsImporting(false)
        }
    }

    const handleConfirmImport = async () => {
        const validData = previewData.filter(r => r.isValid)
        if (validData.length === 0) {
            toast.error('Không có câu hỏi nào hợp lệ để import.')
            return
        }

        setIsImporting(true)
        setProgressPercent(0)
        setProgressStatus('Đang chuẩn bị upload ảnh...')

        try {
            // 1. Upload valid images
            let uploadedCount = 0
            const imagesToUpload = validData.filter(r => r.imageFile && !r.tool_image_url?.startsWith('http'))
            const uploadedUrls: Record<string, string> = {}

            for (const row of imagesToUpload) {
                if (!row.imageFile || uploadedUrls[row.imageFile.name]) continue
                
                setProgressStatus(`Đang upload ảnh: ${row.imageFile.name}...`)
                
                const formData = new FormData()
                formData.append('file', row.imageFile)
                formData.append('folder', 'interview_tools')
                
                const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
                const data = await res.json()
                
                if (data.success) {
                    uploadedUrls[row.imageFile.name] = data.url
                } else {
                    console.warn(`Lỗi upload ảnh ${row.imageFile.name}:`, data.error)
                }
                
                uploadedCount++
                setProgressPercent(Math.floor((uploadedCount / imagesToUpload.length) * 50)) // 50% for images
            }

            // 2. Insert into DB
            setProgressStatus('Đang lưu dữ liệu vào hệ thống...')
            setProgressPercent(60)

            const finalDataToInsert = validData.map(r => {
                let finalUrl = r.tool_image_url
                if (r.imageFile && uploadedUrls[r.imageFile.name]) {
                    finalUrl = uploadedUrls[r.imageFile.name]
                }

                return {
                    industry: r.industry,
                    category: r.category,
                    question_text: r.question_text,
                    vietnamese_meaning: r.vietnamese_meaning,
                    countdown_after_audio: r.countdown_after_audio,
                    question_audio_url: r.question_audio_url,
                    suggested_answers: r.suggested_answers,
                    target_zone_id: r.target_zone_id,
                    tool_image_url: finalUrl,
                }
            })

            const res = await fetch('/api/admin/interview-questions/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalDataToInsert)
            })

            setProgressPercent(90)

            const resData = await res.json()
            if (!resData.success) throw new Error(resData.error)

            setProgressPercent(100)
            setProgressStatus('Hoàn thành!')
            toast.success(`Đã import thành công ${finalDataToInsert.length} câu hỏi!`)
            
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
        setStep(1)
        setPreviewData([])
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isImporting) {
                resetFiles()
                onClose()
            }
        }}>
            <DialogContent className={`transition-all duration-300 w-[95vw] ${step === 2 ? 'sm:max-w-7xl' : 'sm:max-w-2xl'}`}>
                <DialogHeader>
                    <DialogTitle className="text-xl">Import Dữ Liệu Vòng 2</DialogTitle>
                    <DialogDescription>
                        {step === 1 
                            ? 'Tải lên file Excel chứa câu hỏi và file ZIP chứa hình ảnh để hệ thống tự động tải và gán link trực tiếp.'
                            : 'Kiểm tra và đối soát lại dữ liệu trước khi chính thức thêm vào hệ thống.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {step === 1 && (
                        <div className="space-y-6">
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
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between border">
                                <div>
                                    <p className="font-medium text-slate-800">Kết quả đối soát</p>
                                    <p className="text-sm text-slate-600">
                                        Tổng số câu hợp lệ: <span className="font-bold text-green-600">{previewData.filter(d => d.isValid).length}</span> câu | 
                                        Số câu lỗi bị bỏ qua: <span className="font-bold text-red-600">{previewData.filter(d => !d.isValid).length}</span> câu
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setStep(1)} disabled={isImporting}>
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Trở lại
                                </Button>
                            </div>

                            <Tabs defaultValue={Array.from(new Set(previewData.map(d => d.industry)))[0] || 'Sản xuất chế tạo'}>
                                <TabsList className="mb-4 flex flex-wrap h-auto gap-2 p-1 bg-slate-100">
                                    {Array.from(new Set(previewData.map(d => d.industry))).map((ind, idx) => (
                                        <TabsTrigger key={idx} value={ind} className="data-[state=active]:bg-white">
                                            {ind} ({previewData.filter(d => d.industry === ind).length})
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {Array.from(new Set(previewData.map(d => d.industry))).map((ind, idx) => (
                                    <TabsContent key={idx} value={ind} className="m-0">
                                        <div className="max-h-[450px] overflow-y-auto border rounded-lg shadow-sm">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
                                                    <tr>
                                                        <th className="px-4 py-3 whitespace-nowrap">Dòng (Excel)</th>
                                                        <th className="px-4 py-3 min-w-[120px]">Trạng thái</th>
                                                        <th className="px-4 py-3 min-w-[120px]">Phân loại</th>
                                                        <th className="px-4 py-3">Câu hỏi</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">Hình ảnh (Đối soát)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {previewData.filter(d => d.industry === ind).map((row, i) => (
                                                        <tr key={i} className={`${!row.isValid ? 'bg-red-50/30' : 'hover:bg-slate-50'}`}>
                                                            <td className="px-4 py-3 font-medium text-slate-500">{row.originalIndex}</td>
                                                            <td className="px-4 py-3">
                                                                {row.isValid ? (
                                                                    <span className="inline-flex items-center text-green-600 bg-green-100 px-2.5 py-0.5 rounded-full text-xs font-medium border border-green-200">
                                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Hợp lệ
                                                                    </span>
                                                                ) : (
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <span className="inline-flex items-center text-red-600 bg-red-100 px-2.5 py-0.5 rounded-full text-xs font-medium w-fit border border-red-200">
                                                                            <AlertTriangle className="w-3 h-3 mr-1" /> Có lỗi
                                                                        </span>
                                                                        {row.errors.map((e, idx) => (
                                                                            <span key={idx} className="text-xs text-red-500 font-medium">* {e}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700">{row.category}</td>
                                                            <td className="px-4 py-3 text-slate-700">
                                                                <div className="line-clamp-2" title={row.question_text}>
                                                                    {row.question_text}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {row.previewImageUrl ? (
                                                                    <div className="relative w-14 h-14 rounded-md border shadow-sm bg-white overflow-hidden p-0.5">
                                                                        <img src={row.previewImageUrl} alt="preview" className="object-contain w-full h-full rounded-sm" />
                                                                    </div>
                                                                ) : row.tool_image_url ? (
                                                                    <div className="flex items-center gap-1.5 text-xs">
                                                                        <span className="text-red-500 font-medium line-through decoration-red-300">{row.tool_image_url}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300 text-xs italic">Không có</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </div>
                    )}

                    {/* Progress Bar */}
                    {isImporting && (
                        <div className="mt-4 space-y-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
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

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    {step === 1 ? (
                        <>
                            <Button variant="ghost" onClick={resetFiles} disabled={isImporting}>
                                Làm mới
                            </Button>
                            <Button variant="outline" onClick={onClose} disabled={isImporting}>
                                Hủy
                            </Button>
                            <Button 
                                onClick={handlePreview} 
                                disabled={!excelFile || isImporting} 
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                            >
                                {isImporting ? 'Đang đọc...' : 'Đọc dữ liệu'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)} disabled={isImporting}>
                                Hủy đối soát
                            </Button>
                            <Button 
                                onClick={handleConfirmImport} 
                                disabled={isImporting || previewData.filter(d => d.isValid).length === 0} 
                                className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
                            >
                                {isImporting ? 'Đang thêm...' : '[XÁC NHẬN THÊM VÀO HỆ THỐNG]'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

