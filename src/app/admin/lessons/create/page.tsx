'use client'

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CreateLessonPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        lesson_number: '',
        chapter: '1',
        title_korean: '',
        title_vietnamese: '',
        description: '',
        is_published: false
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('lessons')
                .insert({
                    lesson_number: parseInt(formData.lesson_number),
                    chapter: parseInt(formData.chapter),
                    title_korean: formData.title_korean,
                    title_vietnamese: formData.title_vietnamese,
                    description: formData.description || null,
                    is_published: formData.is_published,
                    vocabulary: [],
                    grammar: [],
                    conversations: [],
                    culture: []
                })

            if (error) throw error

            alert('Tạo bài học thành công!')
            router.push('/admin/lessons')
        } catch (err: any) {
            alert('Lỗi: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/lessons"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Thêm Bài Học Mới</h1>
                    <p className="text-gray-600 mt-1">Tạo bài học EPS-TOPIK 2025</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Số bài học <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.lesson_number}
                            onChange={(e) => setFormData({ ...formData, lesson_number: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Chương <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.chapter}
                            onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="1"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tiêu đề tiếng Hàn <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.title_korean}
                        onChange={(e) => setFormData({ ...formData, title_korean: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="자기소개"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tiêu đề tiếng Việt <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.title_vietnamese}
                        onChange={(e) => setFormData({ ...formData, title_vietnamese: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Tự giới thiệu"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mô tả
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Học cách giới thiệu bản thân, quốc tịch và nghề nghiệp."
                    />
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="is_published"
                        checked={formData.is_published}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="is_published" className="text-sm font-medium text-gray-700">
                        Công khai bài học ngay
                    </label>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Đang tạo...' : 'Tạo Bài Học'}
                    </button>
                    <Link
                        href="/admin/lessons"
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Hủy
                    </Link>
                </div>
            </form>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>Lưu ý:</strong> Sau khi tạo bài học, bạn có thể chỉnh sửa để thêm từ vựng, ngữ pháp, hội thoại và văn hóa.
                </p>
            </div>
        </div>
    )
}
