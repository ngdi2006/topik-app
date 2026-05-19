import { createClient } from '@/lib/supabase/client'

// Types for database responses
interface LessonDB {
    id: string
    lesson_number: number
    chapter: number
    title_korean: string
    title_vietnamese: string
    description: string | null
    vocabulary: any[]
    grammar: any[]
    conversations: any[]
    culture: any[]
    is_published: boolean
    created_at: string
    updated_at: string
}

interface UserProgressDB {
    id: string
    user_id: string
    lesson_id: string
    progress_percent: number
    is_completed: boolean
    completed_sections: string[]
    last_accessed_at: string
    created_at: string
    updated_at: string
}

interface AISpeakingScenarioDB {
    id: string
    lesson_id: string
    scenario_title: string
    scenario_title_korean: string | null
    context: string | null
    system_prompt: string
    sample_dialogue: any[]
    difficulty_level: number
    is_published: boolean
    created_at: string
    updated_at: string
}

// Frontend types (camelCase)
export interface LessonVocabulary {
    word: string
    romanization: string
    meaning: string
    example: string
    exampleMeaning: string
}

export interface LessonGrammar {
    pattern: string
    explanation: string
    usage: string
    examples: Array<{
        korean: string
        vietnamese: string
    }>
}

export interface LessonConversation {
    title: string
    context: string
    lines: Array<{
        speaker: string
        korean: string
        vietnamese: string
    }>
}

export interface LessonCulture {
    title: string
    content: string
}

export interface UserProgress {
    progressPercent: number
    isCompleted: boolean
    completedSections: string[]
    lastAccessedAt: string
}

export interface Lesson {
    id: string
    lessonNumber: number
    chapter: number
    titleKorean: string
    titleVietnamese: string
    description: string | null
    vocabulary: LessonVocabulary[]
    grammar: LessonGrammar[]
    conversations: LessonConversation[]
    culture: LessonCulture[]
    isPublished: boolean
    createdAt: string
    updatedAt: string
}

export interface LessonWithProgress extends Lesson {
    progress: UserProgress | null
}

export interface AISpeakingScenario {
    id: string
    lessonId: string
    scenarioTitle: string
    scenarioTitleKorean: string | null
    context: string | null
    systemPrompt: string
    sampleDialogue: Array<{
        speaker: string
        korean: string
        vietnamese: string
    }>
    difficultyLevel: number
    isPublished: boolean
    createdAt: string
    updatedAt: string
}

// Helper function to convert snake_case DB response to camelCase
function mapLessonFromDB(lesson: LessonDB, progress?: UserProgressDB | null): LessonWithProgress {
    return {
        id: lesson.id,
        lessonNumber: lesson.lesson_number,
        chapter: lesson.chapter,
        titleKorean: lesson.title_korean,
        titleVietnamese: lesson.title_vietnamese,
        description: lesson.description,
        vocabulary: lesson.vocabulary as LessonVocabulary[],
        grammar: lesson.grammar as LessonGrammar[],
        conversations: lesson.conversations as LessonConversation[],
        culture: lesson.culture as LessonCulture[],
        isPublished: lesson.is_published,
        createdAt: lesson.created_at,
        updatedAt: lesson.updated_at,
        progress: progress ? {
            progressPercent: progress.progress_percent,
            isCompleted: progress.is_completed,
            completedSections: progress.completed_sections,
            lastAccessedAt: progress.last_accessed_at
        } : null
    }
}

function mapScenarioFromDB(scenario: AISpeakingScenarioDB): AISpeakingScenario {
    return {
        id: scenario.id,
        lessonId: scenario.lesson_id,
        scenarioTitle: scenario.scenario_title,
        scenarioTitleKorean: scenario.scenario_title_korean,
        context: scenario.context,
        systemPrompt: scenario.system_prompt,
        sampleDialogue: scenario.sample_dialogue,
        difficultyLevel: scenario.difficulty_level,
        isPublished: scenario.is_published,
        createdAt: scenario.created_at,
        updatedAt: scenario.updated_at
    }
}

/**
 * Fetch all published lessons with user progress (if authenticated)
 * Uses Supabase embedded select to left-join user_progress
 * RLS automatically filters to current user's progress
 */
export async function fetchLessonsWithProgress(): Promise<LessonWithProgress[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('lessons')
        .select(`
            *,
            user_progress (
                id,
                user_id,
                lesson_id,
                progress_percent,
                is_completed,
                completed_sections,
                last_accessed_at,
                created_at,
                updated_at
            )
        `)
        .eq('is_published', true)
        .order('lesson_number', { ascending: true })

    if (error) {
        console.error('Error fetching lessons:', error)
        throw error
    }

    // Map DB response to frontend types
    return (data || []).map((lesson: any) => {
        // user_progress is an array due to Supabase's embedded select
        // but should only have 0 or 1 item due to UNIQUE(user_id, lesson_id)
        const progress = lesson.user_progress?.[0] || null
        return mapLessonFromDB(lesson, progress)
    })
}

/**
 * Fetch a single lesson by ID with user progress
 */
export async function fetchLessonById(lessonId: string): Promise<LessonWithProgress | null> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('lessons')
        .select(`
            *,
            user_progress (
                id,
                user_id,
                lesson_id,
                progress_percent,
                is_completed,
                completed_sections,
                last_accessed_at,
                created_at,
                updated_at
            )
        `)
        .eq('id', lessonId)
        .eq('is_published', true)
        .single()

    if (error) {
        console.error('Error fetching lesson:', error)
        return null
    }

    const progress = data.user_progress?.[0] || null
    return mapLessonFromDB(data, progress)
}

/**
 * Fetch a single lesson by lesson_number with user progress
 */
export async function fetchLessonByNumber(lessonNumber: number): Promise<LessonWithProgress | null> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('lessons')
        .select(`
            *,
            user_progress (
                id,
                user_id,
                lesson_id,
                progress_percent,
                is_completed,
                completed_sections,
                last_accessed_at,
                created_at,
                updated_at
            )
        `)
        .eq('lesson_number', lessonNumber)
        .eq('is_published', true)
        .single()

    if (error) {
        console.error('Error fetching lesson:', error)
        return null
    }

    const progress = data.user_progress?.[0] || null
    return mapLessonFromDB(data, progress)
}

/**
 * Fetch AI speaking scenarios for a specific lesson
 */
export async function fetchAIScenariosForLesson(lessonId: string): Promise<AISpeakingScenario[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('ai_speaking_scenarios')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('is_published', true)
        .order('difficulty_level', { ascending: true })

    if (error) {
        console.error('Error fetching AI scenarios:', error)
        throw error
    }

    return (data || []).map(mapScenarioFromDB)
}

/**
 * Update or create user progress for a lesson
 */
export async function upsertUserProgress(
    lessonId: string,
    progressData: {
        progressPercent: number
        isCompleted: boolean
        completedSections: string[]
    }
): Promise<void> {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('User not authenticated')
    }

    const { error } = await supabase
        .from('user_progress')
        .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            progress_percent: progressData.progressPercent,
            is_completed: progressData.isCompleted,
            completed_sections: progressData.completedSections,
            last_accessed_at: new Date().toISOString()
        }, {
            onConflict: 'user_id,lesson_id'
        })

    if (error) {
        console.error('Error upserting user progress:', error)
        throw error
    }
}
