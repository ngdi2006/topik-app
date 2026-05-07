'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon, Music } from 'lucide-react'
import { toast } from 'sonner'

interface MediaUploaderProps {
    type: 'image' | 'audio'
    currentUrl?: string
    onUploadComplete: (url: string) => void
    folder?: string
}

export function MediaUploader({
    type,
    currentUrl,
    onUploadComplete,
    folder = 'general',
}: MediaUploaderProps) {
    const [uploading, setUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState(currentUrl || '')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const acceptedTypes =
        type === 'image'
            ? 'image/png,image/jpeg,image/jpg,image/webp,image/gif'
            : 'audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm'

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File quá lớn (tối đa 10MB)')
            return
        }

        setUploading(true)
        const toastId = toast.loading('Đang upload...')

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('folder', folder)

            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (!data.success) {
                throw new Error(data.error || 'Upload failed')
            }

            setPreviewUrl(data.url)
            onUploadComplete(data.url)
            toast.success('Upload thành công!', { id: toastId })
        } catch (error: any) {
            toast.error(error.message || 'Upload thất bại', { id: toastId })
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = () => {
        setPreviewUrl('')
        onUploadComplete('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-3">
            <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes}
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
            />

            {previewUrl ? (
                <div className="relative border rounded-lg p-4 bg-gray-50">
                    {type === 'image' ? (
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-48 mx-auto rounded"
                        />
                    ) : (
                        <div className="flex items-center gap-3">
                            <Music className="w-8 h-8 text-blue-500" />
                            <audio src={previewUrl} controls className="flex-1" />
                        </div>
                    )}
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={handleRemove}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-32 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    <div className="flex flex-col items-center gap-2">
                        {type === 'image' ? (
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                        ) : (
                            <Music className="w-8 h-8 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-500">
                            {uploading
                                ? 'Đang upload...'
                                : `Click để upload ${type === 'image' ? 'hình ảnh' : 'audio'}`}
                        </span>
                        <span className="text-xs text-gray-400">
                            Tối đa 10MB
                        </span>
                    </div>
                </Button>
            )}
        </div>
    )
}
