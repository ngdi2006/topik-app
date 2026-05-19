'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

interface Lesson {
    id: string
    lesson_number: number
    chapter: number
    title_korean: string
    title_vietnamese: string
    description: string | null
    is_published: boolean
    created_at: string
    updated_at: string
}

export default function AdminLessonsPage() {
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchLessons()
    }, [])

    async function fetchLessons() {
        try {
            setLoading(true)
            const supabase = createClient()

            const { data, error } = await supabase
                .from('lessons')
                .select('id, lesson_number, chapter, title_korean, title_vietnamese, description, is_published, created_at, updated_at')
                .order('lesson_number', { ascending: true })

            if (error) throw error
            setLessons(data || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function togglePublish(lessonId: string, currentStatus: boolean) {
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('lessons')
                .update({ is_published: !currentStatus })
                .eq('id', lessonId)

            if (error) throw error

            // Update local state
            setLessons(lessons.map(lesson =>
                lesson.id === lessonId
                    ? { ...lesson, is_published: !currentStatus }
                    : lesson
            ))
        } catch (err: any) {
            alert('Lỗi: ' + err.message)
        }
    }

    async function deleteLesson(lessonId: string, lessonNumber: number) {
        if (!confirm(`Bạn có chắc muốn xóa Bài ${lessonNumber}? Hành động này không thể hoàn tác.`)) {
            return
        }

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('lessons')
                .delete()
                .eq('id', lessonId)

            if (error) throw error

            setLessons(lessons.filter(lesson => lesson.id !== lessonId))
        } catch (err: any) {
            alert('Lỗi: ' + err.message)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-500">Đang tải...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Lỗi: {error}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Bài Học</h1>
                    <p className="text-gray-600 mt-1">Quản lý nội dung bài học EPS-TOPIK 2025</p>
                </div>
                <Link
                    href="/admin/lessons/create"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Thêm Bài Học
                </Link>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Bài
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Chương
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tiêu đề
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mô tả
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Trạng thái
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {lessons.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        Chưa có bài học nào. Nhấn "Thêm Bài Học" để bắt đầu.
                                    </td>
                                </tr>
                            ) : (
                                lessons.map((lesson) => (
                                    <tr key={lesson.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-900">
                                                {lesson.lesson_number}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">
                                                {lesson.chapter}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="font-medium text-gray-900">
                                                    {lesson.title_korean}
                                                </div>
                                                <div className="text-gray-600">
                                                    {lesson.title_vietnamese}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 max-w-xs truncate">
                                                {lesson.description || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => togglePublish(lesson.id, lesson.is_published)}
                                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                                    lesson.is_published
                                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                }`}
                                            >
                                                {lesson.is_published ? (
                                                    <>
                                                        <Eye className="w-3 h-3" />
                                                        Công khai
                                                    </>
                                                ) : (
                                                    <>
                                                        <EyeOff className="w-3 h-3" />
                                                        Nháp
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/admin/lessons/${lesson.id}/edit`}
                                                    className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => deleteLesson(lesson.id, lesson.lesson_number)}
                                                    className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
