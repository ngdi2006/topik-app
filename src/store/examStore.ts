import { create } from 'zustand'

interface ExamState {
    currentQuestionIndex: number;
    answers: Record<string, number>; // questionId -> optionIndex
    isSubmitted: boolean;
    setCurrentQuestionIndex: (index: number) => void;
    setAnswer: (questionId: string, optionIndex: number) => void;
    submitExam: () => void;
    resetExam: () => void;
}

export const useExamStore = create<ExamState>((set) => ({
    currentQuestionIndex: 0,
    answers: {},
    isSubmitted: false,
    setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
    setAnswer: (questionId, optionIndex) =>
        set((state) => ({
            answers: { ...state.answers, [questionId]: optionIndex }
        })),
    submitExam: () => set({ isSubmitted: true }),
    resetExam: () => set({ currentQuestionIndex: 0, answers: {}, isSubmitted: false }),
}))
