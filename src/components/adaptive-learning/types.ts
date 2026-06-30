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
