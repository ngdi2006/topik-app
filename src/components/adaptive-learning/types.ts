export interface Vocab {
  id: string;
  word: string;
  meaning: string;
  explanation: string;
  example: string;
  fillInBlankQuestion: string;
  fillInBlankAnswer: string;
}

export interface Grammar {
  id: string;
  structures: string;
  usage: string;
  explanation: string;
  example: string;
  fillInBlankQuestion: string;
  fillInBlankAnswer: string;
}

export interface Question {
  id: string;
  content: string;
  options: string[];
  answer: string;
  translatedText?: string | null;
  analysis?: QuestionAnalysis | null;
}

export interface QuestionAnalysis {
  question_kind?: { code?: string; name?: string; skill?: string };
  task_summary?: string;
  passage_translation?: string;
  question_translation?: string;
  key_clues?: string[];
  correct_answer_explanation?: string;
  option_explanations?: Array<{
    index: number;
    is_correct: boolean;
    translation?: string;
    explanation?: string;
  }>;
  solving_strategy?: string[];
  common_mistakes?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CategoryData {
  name: string;
  vocab_list: Vocab[];
  grammar_list: Grammar[];
  questions: Question[];
}

export interface QuestionBankType {
  [key: string]: CategoryData;
}

export interface ExamDetail {
  question_id: string;
  category_id: string;
  is_correct: boolean;
}

export interface ExamResultType {
  student_id: string;
  total_score: number;
  details: ExamDetail[];
}

export interface WeakCategory {
  categoryId: string;
  name: string;
  errorCount: number;
}
