'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { Type, Image as ImageIcon, X, Upload } from 'lucide-react'
import { toast } from 'sonner'

export interface OptionData {
    type: 'text' | 'image'
    content: string
}

interface OptionInputProps {
    value: OptionData
    onChange: (value: OptionData) => void
    placeholder?: string
}

export function OptionInput({
    value,
    onChange,
    placeholder = 'Nhập đáp án...',
}: OptionInputProps) {
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleTypeToggle = (newType: 'text' | 'image') => {
        if (newType === value.type) return
        // Clear content when switching type
        onChange({ type: newType, content: '' })
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 10 * 1024 * 1024) {
            toast.error('File quá lớn (tối đa 10MB)')
            return
        }

        setUploading(true)
        const toastId = toast.loading('Đang upload...')

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('folder', 'options')

            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()
            if (!data.success) throw new Error(data.error)

            onChange({ type: 'image', content: data.url })
            toast.success('Upload thành công!', { id: toastId })
        } catch (error: any) {
            toast.error(error.message || 'Upload thất bại', { id: toastId })
        } finally {
            setUploading(false)
        }
    }

    const handleRemoveImage = () => {
        onChange({ type: 'image', content: '' })
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <div className="flex-1 space-y-2">
            {/* Type Toggle */}
            <div className="flex gap-1">
                <Button
                    type="button"
                    variant={value.type === 'text' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleTypeToggle('text')}
                >
                    <Type className="w-3 h-3 mr-1" />
                    Văn bản
                </Button>
                <Button
                    type="button"
                    variant={value.type === 'image' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleTypeToggle('image')}
                >
                    <ImageIcon className="w-3 h-3 mr-1" />
                    Hình ảnh
                </Button>
            </div>

            {/* Content based on type */}
            {value.type === 'text' ? (
                <RichTextEditor
                    value={value.content}
                    onChange={(content) =>
                        onChange({ type: 'text', content })
                    }
                    placeholder={placeholder}
                    minHeight="100px"
                />
            ) : (
                <div className="space-y-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading}
                    />

                    {value.content ? (
                        <div className="relative inline-block border rounded-lg p-2 bg-gray-50">
                            <img
                                src={value.content}
                                alt="Đáp án"
                                className="max-h-32 rounded"
                            />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6"
                                onClick={handleRemoveImage}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-20 border-dashed"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            <div className="flex flex-col items-center gap-1">
                                <Upload className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                    {uploading ? 'Đang upload...' : 'Click để upload hình ảnh'}
                                </span>
                            </div>
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
