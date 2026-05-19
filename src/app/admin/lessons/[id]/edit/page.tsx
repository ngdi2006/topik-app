'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

interface LessonData {
    lesson_number: number
    chapter: number
    title_korean: string
    title_vietnamese: string
    description: string
    is_published: boolean
    vocabulary: any[]
    grammar: any[]
    conversations: any[]
    culture: any[]
}

export default function EditLessonPage() {
    const router = useRouter()
    const params = useParams()
    const lessonId = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<LessonData>({
        lesson_number: 0,
        chapter: 1,
        title_korean: '',
        title_vietnamese: '',
        description: '',
        is_published: false,
        vocabulary: [],
        grammar: [],
        conversations: [],
        culture: []
    })

    useEffect(() => {
        fetchLesson()
    }, [lessonId])

    async function fetchLesson() {
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('lessons')
                .select('*')
                .eq('id', lessonId)
                .single()

            if (error) throw error
            setFormData(data)
        } catch (err: any) {
            alert('Lỗi: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('lessons')
                .update(formData)
                .eq('id', lessonId)

            if (error) throw error

            alert('Cập nhật bài học thành công!')
            router.push('/admin/lessons')
        } catch (err: any) {
            alert('Lỗi: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    // Vocabulary handlers
    function addVocabulary() {
        setFormData({
            ...formData,
            vocabulary: [
                ...formData.vocabulary,
                { word: '', romanization: '', meaning: '', example: '', exampleMeaning: '' }
            ]
        })
    }

    function updateVocabulary(index: number, field: string, value: string) {
        const updated = [...formData.vocabulary]
        updated[index] = { ...updated[index], [field]: value }
        setFormData({ ...formData, vocabulary: updated })
    }

    function removeVocabulary(index: number) {
        setFormData({
            ...formData,
            vocabulary: formData.vocabulary.filter((_, i) => i !== index)
        })
    }

    // Grammar handlers
    function addGrammar() {
        setFormData({
            ...formData,
            grammar: [
                ...formData.grammar,
                { pattern: '', explanation: '', usage: '', examples: [] }
            ]
        })
    }

    function updateGrammar(index: number, field: string, value: any) {
        const updated = [...formData.grammar]
        updated[index] = { ...updated[index], [field]: value }
        setFormData({ ...formData, grammar: updated })
    }

    function removeGrammar(index: number) {
        setFormData({
            ...formData,
            grammar: formData.grammar.filter((_, i) => i !== index)
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-500">Đang tải...</div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/lessons"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chỉnh Sửa Bài Học</h1>
                    <p className="text-gray-600 mt-1">Bài {formData.lesson_number}: {formData.title_vietnamese}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Thông tin cơ bản</h2>

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
                                onChange={(e) => setFormData({ ...formData, lesson_number: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                                onChange={(e) => setFormData({ ...formData, chapter: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            Công khai bài học
                        </label>
                    </div>
                </div>

                {/* Vocabulary Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Từ vựng</h2>
                        <button
                            type="button"
                            onClick={addVocabulary}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm từ
                        </button>
                    </div>

                    {formData.vocabulary.map((vocab, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Từ {index + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => removeVocabulary(index)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    placeholder="Từ tiếng Hàn"
                                    value={vocab.word}
                                    onChange={(e) => updateVocabulary(index, 'word', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Phiên âm"
                                    value={vocab.romanization}
                                    onChange={(e) => updateVocabulary(index, 'romanization', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Nghĩa tiếng Việt"
                                    value={vocab.meaning}
                                    onChange={(e) => updateVocabulary(index, 'meaning', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Câu ví dụ tiếng Hàn"
                                value={vocab.example}
                                onChange={(e) => updateVocabulary(index, 'example', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input
                                type="text"
                                placeholder="Nghĩa câu ví dụ"
                                value={vocab.exampleMeaning}
                                onChange={(e) => updateVocabulary(index, 'exampleMeaning', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    ))}

                    {formData.vocabulary.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                            Chưa có từ vựng. Nhấn "Thêm từ" để bắt đầu.
                        </p>
                    )}
                </div>

                {/* Grammar Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Ngữ pháp</h2>
                        <button
                            type="button"
                            onClick={addGrammar}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm ngữ pháp
                        </button>
                    </div>

                    {formData.grammar.map((gram, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Ngữ pháp {index + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => removeGrammar(index)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Mẫu câu (vd: N은/는)"
                                value={gram.pattern}
                                onChange={(e) => updateGrammar(index, 'pattern', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <textarea
                                placeholder="Giải thích"
                                value={gram.explanation}
                                onChange={(e) => updateGrammar(index, 'explanation', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <textarea
                                placeholder="Cách sử dụng"
                                value={gram.usage}
                                onChange={(e) => updateGrammar(index, 'usage', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    ))}

                    {formData.grammar.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                            Chưa có ngữ pháp. Nhấn "Thêm ngữ pháp" để bắt đầu.
                        </p>
                    )}
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </button>
                    <Link
                        href="/admin/lessons"
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Hủy
                    </Link>
                </div>
            </form>
        </div>
    )
}
