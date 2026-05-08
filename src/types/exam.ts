// =====================================================================
// TOPIK-IBT: TypeScript Types cho Question Bank & Exam System
// =====================================================================

export type QuestionType = 'reading' | 'listening';
export type ExamStatus = 'Draft' | 'Published';
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned';
export type PracticeSessionType = 'retry' | 'similar' | 'vocabulary_quiz' | 'grammar_quiz';
export type PracticeStatus = 'pending' | 'in_progress' | 'completed';

// ============================================
// QUESTION BANK
// ============================================
export interface QuestionOption {
    type: 'text' | 'image';
    content: string; // text hoặc URL
}

export interface QuestionBank {
    id: string;
    question_type: QuestionType;
    level: number; // 1-6

    passage?: string | null;
    question_text: string;
    question_image_url?: string | null;
    audio_url?: string | null;

    options: QuestionOption[]; // 4 items
    correct_answer: number; // 0-3
    shuffle_options: boolean;

    points: number;
    tags: string[];

    created_by?: string | null;
    created_at: string;
    updated_at: string;
}

export interface QuestionBankCreate {
    question_type: QuestionType;
    level: number;
    passage?: string;
    question_text: string;
    question_image_url?: string;
    audio_url?: string;
    options: QuestionOption[];
    correct_answer: number;
    shuffle_options?: boolean;
    points?: number;
    tags?: string[];
}

// ============================================
// EXAM & RULES
// ============================================
export interface Exam {
    id: string;
    title: string;
    level: string;
    exam_level?: number | null;

    duration: number;
    reading_duration?: number | null;
    listening_duration?: number | null;

    total_questions: number;
    order_index: number;
    status: ExamStatus;

    is_ai_generated?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface ExamQuestionRule {
    id: string;
    exam_id: string;

    question_type: QuestionType;
    category_id?: string | null;
    levels: number[]; // [3, 4, 5]
    tags: string[];

    quantity: number;
    points_per_question: number; // 0 = use question.points
    time_per_question: number; // Thời gian đếm ngược sau audio (giây) - chỉ cho listening

    section_name?: string | null;
    order_index: number;

    created_at: string;
}

export interface ExamQuestionRuleCreate {
    exam_id: string;
    question_type: QuestionType;
    levels: number[];
    tags?: string[];
    quantity: number;
    points_per_question?: number;
    section_name?: string;
    order_index: number;
}

// ============================================
// EXAM ATTEMPTS
// ============================================
export interface QuestionSnapshot extends QuestionBank {
    rule_id: string;
    order: number;
    section: string;
    points_override?: number; // từ rule.points_per_question
}

export interface ExamAttempt {
    id: string;
    user_id: string;
    exam_id: string;

    questions_snapshot: QuestionSnapshot[];
    answers: Record<string, number>; // { questionId: optionIndex }

    score: number;
    total_points: number;
    correct_count: number;
    wrong_count: number;

    attempt_number: number;
    status: AttemptStatus;

    started_at: string;
    completed_at?: string | null;
}

export interface ExamAttemptCreate {
    user_id: string;
    exam_id: string;
    questions_snapshot: QuestionSnapshot[];
    attempt_number: number;
}

export interface ExamSubmission {
    attempt_id: string;
    answers: Record<string, number>;
}

// ============================================
// AI ANALYSIS
// ============================================
export interface WeakArea {
    type: QuestionType | string;
    tags?: string[];
    error_rate: number;
    count: number;
}

export interface StrongArea {
    type: QuestionType | string;
    success_rate: number;
    count: number;
}

export interface Recommendation {
    type: PracticeSessionType;
    title: string;
    description: string;
    question_ids?: string[];
    filters?: {
        type?: QuestionType;
        levels?: number[];
        tags?: string[];
    };
    count: number;
}

export interface VocabularyItem {
    word: string;
    meaning: string;
    example?: string;
    context?: string;
}

export interface GrammarPoint {
    pattern: string;
    explanation: string;
    example?: string;
}

export interface ExamAnalysis {
    id: string;
    attempt_id: string;
    user_id: string;

    weak_areas: WeakArea[];
    strong_areas: StrongArea[];

    recommendations: Recommendation[];

    vocabulary_list: VocabularyItem[];
    grammar_points: GrammarPoint[];

    ai_summary?: string | null;

    created_at: string;
}

// ============================================
// PRACTICE SESSIONS
// ============================================
export interface PracticeSession {
    id: string;
    user_id: string;
    analysis_id?: string | null;

    session_type: PracticeSessionType;
    questions_snapshot: QuestionSnapshot[];
    answers: Record<string, number>;

    score: number;
    total_points: number;
    correct_count: number;
    wrong_count: number;

    status: PracticeStatus;

    started_at?: string | null;
    completed_at?: string | null;
    created_at: string;
}

export interface PracticeSessionCreate {
    user_id: string;
    analysis_id?: string;
    session_type: PracticeSessionType;
    questions_snapshot: QuestionSnapshot[];
}

// ============================================
// USER QUESTION HISTORY
// ============================================
export interface UserQuestionHistory {
    id: string;
    user_id: string;
    rule_id: string;
    question_bank_id: string;
    cycle_number: number;
    shown_at: string;
}

// ============================================
// EXCEL IMPORT/EXPORT
// ============================================
export interface ExcelQuestionRow {
    question_type: string;
    level: number;
    passage?: string;
    question_text: string;
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
    correct_answer: number; // 1-4
    points?: number;
    tags?: string;
    question_image_url?: string;
    audio_url?: string;
}

export interface ExcelImportResult {
    row: number;
    valid: boolean;
    errors: string[];
    data?: QuestionBankCreate;
}

export interface ExcelImportPreview {
    success: boolean;
    preview: ExcelImportResult[];
    stats: {
        total: number;
        valid: number;
        invalid: number;
    };
}

// ============================================
// API RESPONSES
// ============================================
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ============================================
// FILTERS & QUERIES
// ============================================
export interface QuestionBankFilter {
    question_type?: QuestionType;
    level?: number;
    tags?: string[];
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface ExamRuleFilter {
    exam_id: string;
}

// ============================================
// GRADING
// ============================================
export interface GradingResult {
    score: number;
    total_points: number;
    correct_count: number;
    wrong_count: number;
    percentage: number;
    details: {
        question_id: string;
        is_correct: boolean;
        points_earned: number;
        points_possible: number;
    }[];
}
