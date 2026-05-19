'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

interface Lesson {
    id: string
    lesson_number: number
    title_vietnamese: string
}

export default function CreatePracticePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [formData, setFormData] = useState({
        lesson_id: '',
        scenario_title: '',
        scenario_title_korean: '',
        context: '',
        system_prompt: '',
        sample_dialogue: [
            { speaker: 'AI', korean: '', vietnamese: '' },
            { speaker: 'User', korean: '', vietnamese: '' }
        ],
        difficulty_level: 1,
        is_published: false
    })

    useEffect(() => {
        fetchLessons()
    }, [])

    async function fetchLessons() {
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('lessons')
                .select('id, lesson_number, title_vietnamese')
                .order('lesson_number', { ascending: true })

            if (error) throw error
            setLessons(data || [])
        } catch (err: any) {
            alert('Lỗi: ' + err.message)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('ai_speaking_scenarios')
                .insert({
                    lesson_id: formData.lesson_id,
                    scenario_title: formData.scenario_title,
                    scenario_title_korean: formData.scenario_title_korean || null,
                    context: formData.context || null,
                    system_prompt: formData.system_prompt,
                    sample_dialogue: formData.sample_dialogue,
                    difficulty_level: formData.difficulty_level,
                    is_published: formData.is_published
                })

            if (error) throw error

            alert('Tạo kịch bản thành công!')
            router.push('/admin/practice')
        } catch (err: any) {
            alert('Lỗi: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    function addDialogueLine() {
        setFormData({
            ...formData,
            sample_dialogue: [
                ...formData.sample_dialogue,
                { speaker: 'AI', korean: '', vietnamese: '' }
            ]
        })
    }

    function updateDialogueLine(index: number, field: string, value: string) {
        const updated = [...formData.sample_dialogue]
        updated[index] = { ...updated[index], [field]: value }
        setFormData({ ...formData, sample_dialogue: updated })
    }

    function removeDialogueLine(index: number) {
        setFormData({
            ...formData,
            sample_dialogue: formData.sample_dialogue.filter((_, i) => i !== index)
        })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/practice"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Thêm Kịch Bản AI Mới</h1>
                    <p className="text-gray-600 mt-1">Tạo kịch bản hội thoại AI cho bài học</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Thông tin cơ bản</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bài học <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={formData.lesson_id}
                            onChange={(e) => setFormData({ ...formData, lesson_id: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="">-- Chọn bài học --</option>
                            {lessons.map(lesson => (
                                <option key={lesson.id} value={lesson.id}>
                                    Bài {lesson.lesson_number}: {lesson.title_vietnamese}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tiêu đề kịch bản (Tiếng Việt) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.scenario_title}
                            onChange={(e) => setFormData({ ...formData, scenario_title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Giới thiệu bản thân tại công ty mới"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tiêu đề kịch bản (Tiếng Hàn)
                        </label>
                        <input
                            type="text"
                            value={formData.scenario_title_korean}
                            onChange={(e) => setFormData({ ...formData, scenario_title_korean: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="새 회사에서 자기소개하기"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bối cảnh
                        </label>
                        <textarea
                            value={formData.context}
                            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Bạn vừa bắt đầu làm việc tại một nhà máy ở Hàn Quốc..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            System Prompt (Hướng dẫn cho AI) <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            value={formData.system_prompt}
                            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                            rows={5}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Bạn là một đồng nghiệp người Hàn Quốc tên 김민수..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Mô tả vai trò, tính cách và cách AI nên phản hồi
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Độ khó <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={formData.difficulty_level}
                            onChange={(e) => setFormData({ ...formData, difficulty_level: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value={1}>Cấp 1 - Rất dễ</option>
                            <option value={2}>Cấp 2 - Dễ</option>
                            <option value={3}>Cấp 3 - Trung bình</option>
                            <option value={4}>Cấp 4 - Khó</option>
                            <option value={5}>Cấp 5 - Rất khó</option>
                        </select>
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
                            Công khai kịch bản ngay
                        </label>
                    </div>
                </div>

                {/* Sample Dialogue */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Hội thoại mẫu</h2>
                        <button
                            type="button"
                            onClick={addDialogueLine}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm câu
                        </button>
                    </div>

                    {formData.sample_dialogue.map((line, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Câu {index + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => removeDialogueLine(index)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Người nói</label>
                                <select
                                    value={line.speaker}
                                    onChange={(e) => updateDialogueLine(index, 'speaker', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="AI">AI</option>
                                    <option value="User">User</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Tiếng Hàn</label>
                                <input
                                    type="text"
                                    value={line.korean}
                                    onChange={(e) => updateDialogueLine(index, 'korean', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="안녕하세요?"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Tiếng Việt</label>
                                <input
                                    type="text"
                                    value={line.vietnamese}
                                    onChange={(e) => updateDialogueLine(index, 'vietnamese', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Xin chào?"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Đang tạo...' : 'Tạo Kịch Bản'}
                    </button>
                    <Link
                        href="/admin/practice"
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Hủy
                    </Link>
                </div>
            </form>
        </div>
    )
}
