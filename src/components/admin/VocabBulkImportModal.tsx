'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { FileSpreadsheet, FileArchive, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
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
    type: string;
    word_kr: string;
    word_vi: string;
    image_url: string | null;

    imageFile?: File;
    previewImageUrl?: string;

    audio_url: string | null;
    audioFile?: File;
    previewAudioUrl?: string;
};

export function VocabBulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [previewData, setPreviewData] = useState<PreviewRow[]>([])
    
    const [excelFile, setExcelFile] = useState<File | null>(null)
    const [zipFile, setZipFile] = useState<File | null>(null)
    const [isImporting, setIsImporting] = useState(false)
    
    const [progressStatus, setProgressStatus] = useState('')
    const [progressPercent, setProgressPercent] = useState(0)

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Ngành nghề': 'MANUFACTURING',
                'Phân loại': 'TOOL',
                'Tiếng Hàn': '망치',
                'Tiếng Việt': 'Cái búa',
                'Tên File Ảnh': 'hammer.jpg',
                'Tên File Âm Thanh': 'hammer.mp3'
            },
            {
                'Ngành nghề': 'COMMON',
                'Phân loại': 'SIGN',
                'Tiếng Hàn': '금연',
                'Tiếng Việt': 'Cấm hút thuốc',
                'Tên File Ảnh': 'no_smoking.png',
                'Tên File Âm Thanh': 'no_smoking.mp3'
            },
            {
                'Ngành nghề': 'COMMON',
                'Phân loại': 'COMMAND',
                'Tiếng Hàn': '앞으로 가세요',
                'Tiếng Việt': 'Đi về phía trước',
                'Tên File Ảnh': '',
                'Tên File Âm Thanh': ''
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        ws['!cols'] = [
            { wch: 18 }, // Ngành nghề
            { wch: 15 }, // Phân loại
            { wch: 20 }, // Tiếng Hàn
            { wch: 25 }, // Tiếng Việt
            { wch: 20 }, // Tên File Ảnh
            { wch: 20 }  // Tên File Âm Thanh
        ];

        const guideData = [
            ['HƯỚNG DẪN NHẬP DỮ LIỆU TỪ VỰNG VÒNG 2'],
            [],
            ['1. CỘT "Ngành nghề" (Bắt buộc)'],
            ['Nhập 1 trong các mã sau viết hoa:'],
            ['MANUFACTURING', 'Sản xuất chế tạo'],
            ['FISHERY', 'Ngư nghiệp'],
            ['AGRICULTURE', 'Nông nghiệp'],
            ['FORESTRY', 'Lâm nghiệp'],
            ['SERVICE', 'Dịch vụ'],
            ['CONSTRUCTION', 'Xây dựng'],
            ['COMMON', 'Chung (Tất cả ngành)'],
            [],
            ['2. CỘT "Phân loại" (Bắt buộc)'],
            ['Nhập 1 trong các mã sau viết hoa:'],
            ['TOOL', 'Dụng cụ, vật dụng'],
            ['SIGN', 'Biển báo'],
            ['COMMAND', 'Khẩu lệnh'],
            [],
            ['* LƯU Ý ĐỐI VỚI KHẨU LỆNH CHUNG:'],
            ['Để nhập khẩu lệnh dùng chung cho tất cả ngành, bạn vui lòng điền:'],
            [' - Cột "Ngành nghề":', 'COMMON'],
            [' - Cột "Phân loại":', 'COMMAND'],
            [],
            ['3. CỘT "Tên File Ảnh" & "Tên File Âm Thanh" (Tùy chọn)'],
            ['Cách 1:', 'Điền chính xác tên file (vd: hammer.jpg, audio.mp3) sẽ được bọc trong file ZIP tải lên.'],
            ['Cách 2:', 'Điền đường link URL (http://...) của file ảnh hoặc âm thanh đã có trên mạng.']
        ];
        const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
        wsGuide['!cols'] = [{ wch: 20 }, { wch: 80 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsGuide, "Hướng dẫn");
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "vocabulary_vong2_template.xlsx");
    }

    const handlePreview = async () => {
        if (!excelFile) {
            toast.error('Vui lòng chọn file Excel')
            return
        }

        setIsImporting(true)
        setProgressPercent(0)
        setProgressStatus('Đang đọc dữ liệu...')

        try {
            const zipFilesMap: Record<string, File> = {}
            if (zipFile) {
                setProgressStatus('Đang giải nén file ZIP...')
                setProgressPercent(10)
                const zip = new JSZip()
                const zipContent = await zip.loadAsync(zipFile)
                
                const mediaFiles = Object.values(zipContent.files).filter(f => !f.dir && f.name.match(/\.(png|jpe?g|gif|webp|mp3|wav|ogg)$/i))
                
                for (const fZip of mediaFiles) {
                    const blob = await fZip.async('blob')
                    const filename = fZip.name.split('/').pop() || fZip.name
                    let mimeType = blob.type
                    if (!mimeType) {
                        if (filename.match(/\.mp3$/i)) mimeType = 'audio/mpeg'
                        else if (filename.match(/\.png$/i)) mimeType = 'image/png'
                        else if (filename.match(/\.jpe?g$/i)) mimeType = 'image/jpeg'
                    }
                    const file = new File([blob], filename, { type: mimeType })
                    zipFilesMap[filename] = file
                }
            }

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

            setProgressStatus('Đang phân tích dữ liệu...')
            
            const parsedRows: PreviewRow[] = []
            
            rawData.forEach((row: any, index: number) => {
                const errors: string[] = []
                let isValid = true
                
                const industryRaw = row['Ngành nghề'] || row['industry'] || 'COMMON'
                const industry = industryRaw.toUpperCase()
                const validIndustries = ['MANUFACTURING', 'FISHERY', 'AGRICULTURE', 'FORESTRY', 'SERVICE', 'COMMON', 'CONSTRUCTION']
                if (!validIndustries.includes(industry)) {
                    errors.push(`Ngành nghề không hợp lệ: ${industry}`)
                    isValid = false
                }

                const typeRaw = row['Phân loại'] || row['type'] || 'TOOL'
                const type = typeRaw.toUpperCase()
                const validTypes = ['TOOL', 'SIGN', 'COMMAND']
                if (!validTypes.includes(type)) {
                    errors.push(`Loại không hợp lệ: ${type}`)
                    isValid = false
                }

                const word_kr = row['Tiếng Hàn'] || row['word_kr'] || ''
                if (!word_kr) {
                    return 
                }

                const word_vi = row['Tiếng Việt'] || row['word_vi'] || ''

                const imgName = row['Tên File Ảnh'] || row['image_url'] || null
                let imageFile: File | undefined = undefined
                let previewImageUrl: string | undefined = undefined

                if (imgName) {
                    if (imgName.match(/^https?:\/\/[0-9a-fA-F]{6}/)) {
                        previewImageUrl = imgName.replace(/^https?:\/\//, 'https://placehold.co/150x150/');
                    } else if (imgName.match(/^[0-9a-fA-F]{6}/)) {
                        previewImageUrl = `https://placehold.co/150x150/${imgName}`;
                    } else if (imgName.startsWith('http')) {
                        previewImageUrl = imgName
                    } else if (zipFilesMap[imgName]) {
                        imageFile = zipFilesMap[imgName]
                        previewImageUrl = URL.createObjectURL(imageFile)
                    } else {
                        errors.push(`Thiếu file ảnh đính kèm: ${imgName}`)
                        isValid = false
                    }
                }

                const audioName = row['Tên File Âm Thanh'] || row['audio_url'] || null
                let audioFile: File | undefined = undefined
                let previewAudioUrl: string | undefined = undefined

                if (audioName) {
                    if (audioName.startsWith('http')) {
                        previewAudioUrl = audioName
                    } else if (zipFilesMap[audioName]) {
                        audioFile = zipFilesMap[audioName]
                        previewAudioUrl = URL.createObjectURL(audioFile)
                    } else {
                        errors.push(`Thiếu file âm thanh đính kèm: ${audioName}`)
                        isValid = false
                    }
                } else {
                    // Fallback to Google TTS if no audio provided
                    previewAudioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q=${encodeURIComponent(word_kr)}`
                }

                parsedRows.push({
                    originalIndex: index + 2, 
                    isValid,
                    errors,
                    industry,
                    type,
                    word_kr,
                    word_vi,
                    image_url: imgName,
                    imageFile,
                    previewImageUrl,
                    audio_url: audioName,
                    audioFile,
                    previewAudioUrl
                })
            })

            setPreviewData(parsedRows)
            setStep(2)
        } catch (error: any) {
            console.error(error)
            toast.error('Có lỗi xảy ra: ' + error.message)
        } finally {
            setIsImporting(false)
        }
    }

    const handleConfirmImport = async () => {
        const validData = previewData.filter(r => r.isValid)
        if (validData.length === 0) {
            toast.error('Không có dữ liệu hợp lệ để import.')
            return
        }

        setIsImporting(true)
        setProgressPercent(0)
        
        try {
            setProgressStatus('Đang upload các file ảnh và âm thanh (nếu có)...')
            const finalDataToInsert: any[] = []

            for (let i = 0; i < validData.length; i++) {
                const row = validData[i]
                setProgressPercent(Math.round(20 + (i / validData.length) * 40)) 
                
                let finalImageUrl = row.previewImageUrl
                if (row.imageFile) {
                    const formData = new FormData()
                    formData.append('file', row.imageFile)
                    formData.append('folder', 'vocab_vong2')
                    const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: formData })
                    if (!uploadRes.ok) throw new Error(`Upload ảnh thất bại: ${row.imageFile.name}`)
                    const uploadData = await uploadRes.json()
                    finalImageUrl = uploadData.url
                }

                let finalAudioUrl = row.previewAudioUrl
                if (row.audioFile) {
                    const formData = new FormData()
                    formData.append('file', row.audioFile)
                    formData.append('folder', 'vocab_vong2')
                    const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: formData })
                    if (!uploadRes.ok) throw new Error(`Upload âm thanh thất bại: ${row.audioFile.name}`)
                    const uploadData = await uploadRes.json()
                    finalAudioUrl = uploadData.url
                }

                finalDataToInsert.push({
                    industry: row.industry,
                    type: row.type,
                    word_kr: row.word_kr,
                    word_vi: row.word_vi,
                    image_url: finalImageUrl,
                    audio_url: finalAudioUrl,
                })
            }

            setProgressStatus('Đang lưu dữ liệu vào hệ thống...')
            setProgressPercent(80)

            const insertRes = await fetch('/api/admin/vocabulary-vong2/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalDataToInsert)
            })

            setProgressPercent(90)

            const resData = await insertRes.json()
            if (!resData.success) throw new Error(resData.error)

            setProgressPercent(100)
            toast.success(`Đã import thành công ${finalDataToInsert.length} từ vựng!`)
            
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1000)
        } catch (error: any) {
            console.error(error)
            toast.error('Lỗi khi lưu: ' + error.message)
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isImporting) onClose()
        }}>
            <DialogContent className={`transition-all duration-300 ${step === 2 ? 'max-w-5xl' : 'max-w-xl'}`}>
                <DialogHeader>
                    <DialogTitle className="text-xl">Import Từ Vựng Vòng 2</DialogTitle>
                    <DialogDescription>
                        {step === 1 
                            ? 'Tải lên file Excel và ZIP chứa hình ảnh.'
                            : 'Kiểm tra và đối soát lại dữ liệu trước khi thêm vào hệ thống.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold">1. File Danh sách (Excel/CSV) *</label>
                                    <Button variant="link" size="sm" onClick={handleDownloadTemplate} className="text-blue-600 p-0 h-auto">
                                        Tải file Excel mẫu
                                    </Button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" className="w-full justify-start h-12 relative overflow-hidden bg-green-50/50 hover:bg-green-50 border-green-200" onClick={() => document.getElementById('excel-upload')?.click()} disabled={isImporting}>
                                        <FileSpreadsheet className="w-5 h-5 mr-3 text-green-600" />
                                        <span className="truncate flex-1 text-left text-green-900">{excelFile ? excelFile.name : 'Bấm để chọn file Excel...'}</span>
                                        {excelFile && <CheckCircle2 className="w-5 h-5 text-green-600 absolute right-3" />}
                                    </Button>
                                    <input id="excel-upload" type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">2. File Ảnh nén (.zip) (Tùy chọn)</label>
                                <p className="text-xs text-gray-500 mb-2">Hệ thống sẽ tự giải nén và đối chiếu với <strong>[Tên File Ảnh]</strong> được khai báo trong Excel.</p>
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" className="w-full justify-start h-12 relative overflow-hidden bg-amber-50/50 hover:bg-amber-50 border-amber-200" onClick={() => document.getElementById('zip-upload')?.click()} disabled={isImporting}>
                                        <FileArchive className="w-5 h-5 mr-3 text-amber-500" />
                                        <span className="truncate flex-1 text-left text-amber-900">{zipFile ? zipFile.name : 'Bấm để chọn file ZIP...'}</span>
                                        {zipFile && <CheckCircle2 className="w-5 h-5 text-green-600 absolute right-3" />}
                                    </Button>
                                    <input id="zip-upload" type="file" className="hidden" accept=".zip" onChange={(e) => setZipFile(e.target.files?.[0] || null)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4 bg-slate-50 p-3 rounded-lg border">
                                <div>
                                    <p className="font-medium text-slate-800">Kết quả đối soát</p>
                                    <p className="text-sm text-slate-600">
                                        Hợp lệ: <span className="font-bold text-green-600">{previewData.filter(d => d.isValid).length}</span> | 
                                        Lỗi: <span className="font-bold text-red-600">{previewData.filter(d => !d.isValid).length}</span>
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setStep(1)} disabled={isImporting}>
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Trở lại
                                </Button>
                            </div>

                            <div className="max-h-[450px] overflow-y-auto border rounded-lg shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 whitespace-nowrap">Dòng (Excel)</th>
                                            <th className="px-4 py-3 min-w-[120px]">Trạng thái</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Hình ảnh</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Âm thanh</th>
                                            <th className="px-4 py-3">Ngành nghề</th>
                                            <th className="px-4 py-3">Loại</th>
                                            <th className="px-4 py-3">Tiếng Hàn</th>
                                            <th className="px-4 py-3">Tiếng Việt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {previewData.map((row, i) => (
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
                                                <td className="px-4 py-3 text-center">
                                                    {row.previewImageUrl ? (
                                                        <img src={row.previewImageUrl} alt="preview" className="w-10 h-10 object-contain mx-auto rounded-md shadow-sm border" />
                                                    ) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {row.previewAudioUrl ? (
                                                        <button 
                                                            onClick={() => new Audio(row.previewAudioUrl).play()}
                                                            className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors mx-auto block"
                                                            title="Nghe thử"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                                                        </button>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">{row.industry}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.type}</td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{row.word_kr}</td>
                                                <td className="px-4 py-3 text-slate-600">{row.word_vi}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {/* Progress Bar */}
                    {isImporting && step === 2 && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
                            <div className="flex justify-between text-sm mb-2 font-medium">
                                <span className="text-blue-600">{progressStatus}</span>
                                <span className="text-slate-600">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isImporting}>Hủy</Button>
                    
                    {step === 1 ? (
                        <Button onClick={handlePreview} disabled={!excelFile || isImporting} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Tiếp tục đối soát
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleConfirmImport} 
                            disabled={isImporting || previewData.filter(d => d.isValid).length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
                        >
                            {isImporting ? 'Đang lưu...' : 'Tiến hành Import'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
