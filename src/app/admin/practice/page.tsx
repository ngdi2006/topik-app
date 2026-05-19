'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

interface AIScenario {
    id: string
    lesson_id: string
    scenario_title: string
    scenario_title_korean: string | null
    difficulty_level: number
    is_published: boolean
    created_at: string
}

interface Lesson {
    id: string
    lesson_number: number
    title_vietnamese: string
}

export default function AdminPracticePage() {
    const [scenarios, setScenarios] = useState<AIScenario[]>([])
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterLesson, setFilterLesson] = useState<string>('all')

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            setLoading(true)
            const supabase = createClient()

            // Fetch scenarios
            const { data: scenariosData, error: scenariosError } = await supabase
                .from('ai_speaking_scenarios')
                .select('id, lesson_id, scenario_title, scenario_title_korean, difficulty_level, is_published, created_at')
                .order('created_at', { ascending: false })

            if (scenariosError) throw scenariosError

            // Fetch lessons for filter
            const { data: lessonsData, error: lessonsError } = await supabase
                .from('lessons')
                .select('id, lesson_number, title_vietnamese')
                .order('lesson_number', { ascending: true })

            if (lessonsError) throw lessonsError

            setScenarios(scenariosData || [])
            setLessons(lessonsData || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function togglePublish(scenarioId: string, currentStatus: boolean) {
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('ai_speaking_scenarios')
                .update({ is_published: !currentStatus })
                .eq('id', scenarioId)

            if (error) throw error

            setScenarios(scenarios.map(scenario =>
                scenario.id === scenarioId
                    ? { ...scenario, is_published: !currentStatus }
                    : scenario
            ))
        } catch (err: any) {
            alert('Lỗi: ' + err.message)
        }
    }

    async function deleteScenario(scenarioId: string, scenarioTitle: string) {
        if (!confirm(`Bạn có chắc muốn xóa kịch bản "${scenarioTitle}"? Hành động này không thể hoàn tác.`)) {
            return
        }

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('ai_speaking_scenarios')
                .delete()
                .eq('id', scenarioId)

            if (error) throw error

            setScenarios(scenarios.filter(scenario => scenario.id !== scenarioId))
        } catch (err: any) {
            alert('Lỗi: ' + err.message)
        }
    }

    function getLessonInfo(lessonId: string) {
        const lesson = lessons.find(l => l.id === lessonId)
        return lesson ? `Bài ${lesson.lesson_number}: ${lesson.title_vietnamese}` : 'N/A'
    }

    const filteredScenarios = filterLesson === 'all'
        ? scenarios
        : scenarios.filter(s => s.lesson_id === filterLesson)

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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Luyện Tập AI</h1>
                    <p className="text-gray-600 mt-1">Quản lý kịch bản hội thoại AI cho từng bài học</p>
                </div>
                <Link
                    href="/admin/practice/create"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Thêm Kịch Bản
                </Link>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lọc theo bài học
                </label>
                <select
                    value={filterLesson}
                    onChange={(e) => setFilterLesson(e.target.value)}
                    className="w-full lg:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                    <option value="all">Tất cả bài học</option>
                    {lessons.map(lesson => (
                        <option key={lesson.id} value={lesson.id}>
                            Bài {lesson.lesson_number}: {lesson.title_vietnamese}
                        </option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Kịch bản
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Bài học
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Độ khó
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
                            {filteredScenarios.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        {filterLesson === 'all'
                                            ? 'Chưa có kịch bản nào. Nhấn "Thêm Kịch Bản" để bắt đầu.'
                                            : 'Không có kịch bản nào cho bài học này.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredScenarios.map((scenario) => (
                                    <tr key={scenario.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="font-medium text-gray-900">
                                                    {scenario.scenario_title}
                                                </div>
                                                {scenario.scenario_title_korean && (
                                                    <div className="text-gray-600">
                                                        {scenario.scenario_title_korean}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600">
                                                {getLessonInfo(scenario.lesson_id)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Cấp {scenario.difficulty_level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => togglePublish(scenario.id, scenario.is_published)}
                                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                                    scenario.is_published
                                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                }`}
                                            >
                                                {scenario.is_published ? (
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
                                                    href={`/admin/practice/${scenario.id}/edit`}
                                                    className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => deleteScenario(scenario.id, scenario.scenario_title)}
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
