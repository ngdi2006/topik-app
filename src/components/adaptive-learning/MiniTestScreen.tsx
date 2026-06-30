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

  const handleSelectOption = (option: string) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questions[currentQuestionIdx].id]: option
    }));
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
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
            const prefix = (idx + 1).toString(); // 1, 2, 3, 4
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center gap-3 sm:gap-4 group
                  ${isSelected 
                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                    : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'
                  }`}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-colors
                  ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-200 group-hover:text-blue-700'}`}>
                  {prefix}
                </div>
                <span className="font-medium text-sm sm:text-base">{option}</span>
              </button>
            );
          })}
        </div>
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
          {currentQuestionIdx === questions.length - 1 ? 'Nộp bài' : 'Câu tiếp theo'}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
