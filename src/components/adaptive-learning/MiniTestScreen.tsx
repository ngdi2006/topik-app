import React, { useState } from 'react';
import { Question } from './types';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Award } from 'lucide-react';
import { extractTextFromContent } from './utils';

interface MiniTestScreenProps {
  questions: Question[];
  categoryName: string;
  onComplete: () => void;
}

export default function MiniTestScreen({ questions, categoryName, onComplete }: MiniTestScreenProps) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  const handleSelectOption = (option: string) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questions[currentQuestionIdx].id]: option
    }));
  };

  const handleNext = () => {
    if (!isAnswerRevealed) {
      setIsAnswerRevealed(true);
      return;
    }
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setIsAnswerRevealed(false);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    let currentScore = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.answer) {
        currentScore++;
      }
    });
    setScore(currentScore);
    setIsSubmitted(true);
  };

  const isPassed = score >= Math.ceil(questions.length * 0.8); // 80% to pass

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 py-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
          <div className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center text-4xl border-8 ${isPassed ? 'border-emerald-500 text-emerald-500' : 'border-orange-500 text-orange-500'}`}>
            {score}/{questions.length}
          </div>
          {isPassed && <Award className="absolute -top-2 -right-2 text-yellow-500 w-10 h-10" />}
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isPassed ? 'Xuất sắc! Bạn đã nắm chắc dạng này.' : 'Cần cố gắng thêm một chút nữa!'}
          </h2>
          <p className="text-sm text-gray-500">
            {isPassed ? 'Hãy tiếp tục chinh phục các dạng bài khác nhé.' : 'Bạn có thể xem lại lý thuyết và làm lại bài test này.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
          <button 
            onClick={onComplete}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            Quay lại Dashboard
          </button>
          {!isPassed && (
            <button 
              onClick={() => {
                setIsSubmitted(false);
                setSelectedAnswers({});
                setCurrentQuestionIdx(0);
                setScore(0);
                setIsAnswerRevealed(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw size={16} />
              Làm lại Test
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIdx];
  const hasSelected = !!selectedAnswers[currentQuestion.id];

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Mini Test</span>
          <h2 className="text-lg font-bold text-gray-800 line-clamp-1">{categoryName}</h2>
        </div>
        <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-bold text-sm shrink-0 ml-4">
          Câu {currentQuestionIdx + 1} / {questions.length}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-8 mb-6">
        <div className="mb-6">
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm sm:text-base font-medium">
            {extractTextFromContent(currentQuestion.content)}
          </p>
        </div>

        <div className="space-y-2.5">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentQuestion.id] === option;
            const isCorrect = option === currentQuestion.answer;
            const prefix = (idx + 1).toString(); // 1, 2, 3, 4
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                disabled={isAnswerRevealed}
                className={`group flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors sm:gap-4 sm:p-4
                  ${isAnswerRevealed && isCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : isAnswerRevealed && isSelected
                      ? 'border-red-400 bg-red-50 text-red-800'
                      : isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                    : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'
                  }`}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-colors
                  ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-200 group-hover:text-blue-700'}`}>
                  {prefix}
                </div>
                <span className="font-medium text-sm sm:text-base">{option}</span>
                {isAnswerRevealed && isCorrect ? <CheckCircle2 className="ml-auto size-5 shrink-0 text-emerald-600" aria-hidden="true" /> : null}
                {isAnswerRevealed && isSelected && !isCorrect ? <XCircle className="ml-auto size-5 shrink-0 text-red-600" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        {isAnswerRevealed ? (
          <div className="mt-6 space-y-4 rounded-xl border border-blue-100 bg-blue-50 p-4" aria-live="polite">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {currentQuestion.analysis?.question_kind?.name || 'Phân tích đáp án'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {currentQuestion.analysis?.correct_answer_explanation || 'Đáp án màu xanh là đáp án đúng của câu hỏi.'}
              </p>
            </div>
            {currentQuestion.analysis?.key_clues?.length ? (
              <div>
                <p className="text-xs font-bold text-slate-700">Manh mối cần chú ý</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {currentQuestion.analysis.key_clues.map((clue) => <li key={clue}>{clue}</li>)}
                </ul>
              </div>
            ) : null}
            {currentQuestion.analysis?.option_explanations?.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {currentQuestion.analysis.option_explanations.map((item) => (
                  <div key={item.index} className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">
                    <span className="font-bold text-slate-800">Đáp án {item.index + 1}:</span> {item.explanation}
                  </div>
                ))}
              </div>
            ) : null}
            {currentQuestion.analysis?.solving_strategy?.length ? (
              <div>
                <p className="text-xs font-bold text-slate-700">Cách giải dạng này</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  {currentQuestion.analysis.solving_strategy.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleNext}
          disabled={!hasSelected}
          className={`px-6 py-3 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all
            ${hasSelected 
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
        >
          {!isAnswerRevealed ? 'Kiểm tra đáp án' : currentQuestionIdx === questions.length - 1 ? 'Nộp bài' : 'Câu tiếp theo'}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
