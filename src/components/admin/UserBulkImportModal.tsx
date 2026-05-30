'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowLeft, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

interface UserBulkImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

type PreviewRow = {
    originalIndex: number
    isValid: boolean
    errors: string[]
    
    name: string
    email: string
    password: string
    role: string
    groupName: string
    dateOfBirth: string
}

export function UserBulkImportModal({ isOpen, onClose, onSuccess }: UserBulkImportModalProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [previewData, setPreviewData] = useState<PreviewRow[]>([])
    
    const [excelFile, setExcelFile] = useState<File | null>(null)
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
        setProgressStatus('Đang đọc file Excel...')

        try {
            const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => resolve(e.target?.result as ArrayBuffer)
                reader.onerror = (e) => reject(e)
                reader.readAsArrayBuffer(excelFile)
            })

            setProgressPercent(50)
            const wb = XLSX.read(arrayBuffer, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const rawData = XLSX.utils.sheet_to_json(ws)

            setProgressStatus('Đang phân tích dữ liệu...')
            
            const parsedRows: PreviewRow[] = []
            const emailSet = new Set<string>()
            
            rawData.forEach((row: any, index: number) => {
                const errors: string[] = []
                let isValid = true

                // Normalize keys: NFC, lowercase, remove all spaces
                const normalizedRow: Record<string, any> = {}
                for (const key in row) {
                    if (key && typeof key === 'string') {
                        const cleanKey = key.normalize('NFC').toLowerCase().replace(/[\s_]+/g, '')
                        normalizedRow[cleanKey] = row[key]
                    }
                }

                // Check if row is entirely empty
                const hasAnyValue = Object.values(normalizedRow).some(val => val !== undefined && val !== null && val !== '')
                if (!hasAnyValue) return
                
                // Read properties using the highly normalized keys
                const name = normalizedRow['họtên'] || normalizedRow['name'] || normalizedRow['họvàtên'] || ''
                if (!name) {
                    errors.push('Thiếu họ tên')
                    isValid = false
                }

                const email = normalizedRow['email'] || ''
                if (!email) {
                    errors.push('Thiếu email')
                    isValid = false
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
                    errors.push('Email không hợp lệ')
                    isValid = false
                } else if (emailSet.has(String(email))) {
                    errors.push('Email trùng lặp trong file')
                    isValid = false
                } else {
                    emailSet.add(String(email))
                }

                const password = normalizedRow['mậtkhẩu'] || normalizedRow['password'] || ''
                if (!password) {
                    errors.push('Thiếu mật khẩu')
                    isValid = false
                } else if (String(password).length < 6) {
                    errors.push('Mật khẩu tối thiểu 6 ký tự')
                    isValid = false
                }

                const rawRole = normalizedRow['vaitrò'] || normalizedRow['role'] || ''
                let role = String(rawRole).toLowerCase().trim()
                const validRoles = ['learner', 'supporter', 'teacher', 'admin']
                if (!validRoles.includes(role)) {
                    role = 'learner' // default
                }

                const groupName = normalizedRow['nhóm/lớp'] || normalizedRow['lớp'] || normalizedRow['nhóm'] || normalizedRow['groupname'] || ''
                
                let rawDateOfBirth = normalizedRow['ngàysinh'] || normalizedRow['dob'] || normalizedRow['dateofbirth'] || ''
                let dateOfBirth = ''
                if (rawDateOfBirth) {
                    if (rawDateOfBirth instanceof Date) {
                        dateOfBirth = rawDateOfBirth.toISOString().split('T')[0]
                    } else if (typeof rawDateOfBirth === 'number') {
                        // Convert Excel serial date to JS Date
                        const date = new Date(Math.round((rawDateOfBirth - 25569) * 86400 * 1000))
                        dateOfBirth = date.toISOString().split('T')[0]
                    } else {
                        // Assuming string format
                        dateOfBirth = String(rawDateOfBirth).trim()
                    }
                }

                parsedRows.push({
                    originalIndex: index + 2,
                    isValid,
                    errors,
                    name: String(name).trim(),
                    email: String(email).trim(),
                    password: String(password).trim(),
                    role,
                    groupName: String(groupName).trim(),
                    dateOfBirth: String(dateOfBirth).trim()
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
            toast.error('Không có dữ liệu hợp lệ để import.')
            return
        }

        setIsImporting(true)
        setProgressPercent(30)
        setProgressStatus('Đang tạo tài khoản...')

        try {
            const finalDataToInsert = validData.map(r => ({
                name: r.name,
                email: r.email,
                password: r.password,
                role: r.role,
                groupName: r.groupName,
                dateOfBirth: r.dateOfBirth
            }))

            const res = await fetch('/api/admin/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalDataToInsert)
            })

            setProgressPercent(90)

            const resData = await res.json()
            if (!res.ok) throw new Error(resData.error || 'Lỗi không xác định')

            setProgressPercent(100)
            setProgressStatus('Hoàn thành!')
            
            if (resData.errors && resData.errors.length > 0) {
                const firstError = resData.errors[0]?.error || 'Lỗi không xác định';
                toast.warning(`Thành công ${resData.successCount}. Lỗi ${resData.errors.length} tài khoản. Lỗi mẫu: ${firstError}`)
                console.warn("Import errors:", resData.errors)
            } else {
                toast.success(`Đã import thành công ${resData.successCount} người dùng!`)
            }
            
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
        setProgressPercent(0)
        setProgressStatus('')
        setStep(1)
        setPreviewData([])
    }

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            {
                'Họ Tên': 'Nguyễn Văn A',
                'Email': 'nguyenvana@example.com',
                'Mật khẩu': '123456',
                'Vai trò': 'learner',
                'Nhóm/Lớp': 'Lớp TOPIK 1',
                'Ngày sinh': '1990-01-01'
            },
            {
                'Họ Tên': 'Trần Thị B',
                'Email': 'tranthib@example.com',
                'Mật khẩu': '123456',
                'Vai trò': 'supporter',
                'Nhóm/Lớp': '',
                'Ngày sinh': ''
            }
        ])
        
        // Auto-size columns
        const wscols = [
            { wch: 20 },
            { wch: 25 },
            { wch: 15 },
            { wch: 15 },
            { wch: 20 },
            { wch: 15 },
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Users')
        XLSX.writeFile(wb, 'Mau_Import_Nguoi_Dung.xlsx')
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isImporting) {
                resetFiles()
                onClose()
            }
        }}>
            <DialogContent className={`transition-all duration-300 w-[95vw] ${step === 2 ? 'sm:max-w-5xl' : 'sm:max-w-xl'}`}>
                <DialogHeader>
                    <DialogTitle className="text-xl">Import Người Dùng</DialogTitle>
                    <DialogDescription>
                        {step === 1 
                            ? 'Tải lên file Excel chứa thông tin người dùng (Họ Tên, Email, Mật khẩu, Vai trò, Nhóm/Lớp).'
                            : 'Kiểm tra lại dữ liệu trước khi thêm vào hệ thống.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold">1. File Danh sách (Excel/CSV) *</label>
                                    <Button variant="ghost" size="sm" onClick={downloadTemplate} className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                        <Download className="w-4 h-4 mr-1.5" />
                                        Tải file mẫu
                                    </Button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button 
                                        variant="outline" 
                                        className="w-full justify-start h-12 relative overflow-hidden bg-green-50/50 hover:bg-green-50 border-green-200"
                                        onClick={() => document.getElementById('user-excel-upload')?.click()}
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
                                        id="user-excel-upload"
                                        type="file" 
                                        className="hidden" 
                                        accept=".xlsx, .xls, .csv"
                                        onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    <p>File cần có các cột: <strong>Họ Tên</strong>, <strong>Email</strong>, <strong>Mật khẩu</strong>, <strong>Vai trò</strong> (learner/supporter/teacher/admin), <strong>Nhóm/Lớp</strong>, <strong>Ngày sinh</strong> (YYYY-MM-DD)</p>
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
                                        Tổng hợp lệ: <span className="font-bold text-green-600">{previewData.filter(d => d.isValid).length}</span> | 
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
                                            <th className="px-4 py-3">Họ Tên</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">Vai trò</th>
                                            <th className="px-4 py-3">Nhóm/Lớp</th>
                                            <th className="px-4 py-3">Ngày sinh</th>
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
                                                <td className="px-4 py-3 text-slate-700">{row.name}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.email}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.role}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.groupName}</td>
                                                <td className="px-4 py-3 text-slate-700">{row.dateOfBirth}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

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
                                {isImporting ? 'Đang thêm...' : 'Xác nhận tạo tài khoản'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
