import React, { useState, useEffect } from 'react';
import { CategoryData, Vocab, Grammar } from './types';
import { ArrowLeft, BookOpen, PenTool, CheckCircle, RotateCcw, X, Check, BrainCircuit } from 'lucide-react';

interface LearningScreenProps {
  category: CategoryData;
  onBack: () => void;
  onReadyForTest: () => void;
}

export default function LearningScreen({ category, onBack, onReadyForTest }: LearningScreenProps) {
  const [activeTab, setActiveTab] = useState<'vocab' | 'grammar'>('vocab');
  
  const [vocabQueue, setVocabQueue] = useState<Vocab[]>([...category.vocab_list]);
  const [grammarQueue, setGrammarQueue] = useState<Grammar[]>([...category.grammar_list]);
  
  const [learnedVocab, setLearnedVocab] = useState<string[]>([]);
  const [learnedGrammar, setLearnedGrammar] = useState<string[]>([]);

  const [isFlipped, setIsFlipped] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [blankAnswer, setBlankAnswer] = useState('');
  const [quizError, setQuizError] = useState(false);

  // Reset state when tab changes
  useEffect(() => {
    setIsFlipped(false);
    setQuizMode(false);
    setBlankAnswer('');
    setQuizError(false);
  }, [activeTab]);

  const activeQueue = activeTab === 'vocab' ? vocabQueue : grammarQueue;
  const currentItem = activeQueue[0];
  const totalItems = activeTab === 'vocab' ? category.vocab_list.length : category.grammar_list.length;
  const learnedItems = activeTab === 'vocab' ? learnedVocab : learnedGrammar;
  
  const isAllLearned = learnedVocab.length === category.vocab_list.length && learnedGrammar.length === category.grammar_list.length;

  const handleNotLearned = () => {
    setIsFlipped(false);
    if (activeTab === 'vocab') {
      setVocabQueue(prev => [...prev.slice(1), prev[0]]);
    } else {
      setGrammarQueue(prev => [...prev.slice(1), prev[0]]);
    }
  };

  const handleLearnedClick = () => {
    setQuizMode(true);
    setBlankAnswer('');
    setQuizError(false);
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;
    
    if (blankAnswer.trim().toLowerCase() === currentItem.fillInBlankAnswer.toLowerCase()) {
      // Correct!
      setQuizMode(false);
      setIsFlipped(false);
      if (activeTab === 'vocab') {
        setLearnedVocab(prev => [...prev, currentItem.id]);
        setVocabQueue(prev => prev.slice(1));
      } else {
        setLearnedGrammar(prev => [...prev, currentItem.id]);
        setGrammarQueue(prev => prev.slice(1));
      }
    } else {
      setQuizError(true);
    }
  };

  const renderHighlightedExample = (text: string, highlight: string) => {
    if (!highlight || !text) return text;
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapeRegExp(highlight)})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() 
        ? <span key={i} className="bg-yellow-200 text-yellow-900 font-bold px-1.5 py-0.5 rounded mx-0.5">{part}</span>
        : part
    );
  };

  const renderFlashcard = () => {
    if (!currentItem) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Tuyệt vời!</h3>
          <p className="text-gray-500 text-sm">Bạn đã thuộc hết phần {activeTab === 'vocab' ? 'từ vựng' : 'ngữ pháp'} này.</p>
        </div>
      );
    }

    if (quizMode) {
      return (
        <div className="flex flex-col items-center justify-center h-full animate-in zoom-in-95 duration-300 w-full max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-6">
            <BrainCircuit size={14} /> Kiểm tra nhanh
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-6 leading-relaxed text-center">
            {currentItem.fillInBlankQuestion.split('(   )').map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="inline-block mx-2 text-blue-600 border-b-2 border-blue-600 pb-0.5 px-2 font-black">
                    {quizError ? <span className="text-red-500">?</span> : '...'}
                  </span>
                )}
              </React.Fragment>
            ))}
          </h3>
          
          <form onSubmit={handleQuizSubmit} className="w-full space-y-4">
            <div>
              <input 
                type="text" 
                value={blankAnswer}
                onChange={(e) => { setBlankAnswer(e.target.value); setQuizError(false); }}
                placeholder="Nhập từ còn thiếu..."
                className={`w-full p-4 rounded-xl border-2 text-center text-lg font-bold transition-colors focus:outline-none
                  ${quizError ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 focus:border-blue-500'}`}
                autoFocus
              />
              {quizError && <p className="text-red-500 text-sm mt-2 text-center font-medium">Chưa chính xác, bạn hãy thử lại nhé!</p>}
            </div>
            
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setQuizMode(false)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors"
              >
                Quay lại
              </button>
              <button 
                type="submit"
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors"
              >
                Kiểm tra
              </button>
            </div>
          </form>
        </div>
      );
    }

    const title = activeTab === 'vocab' ? (currentItem as Vocab).word : (currentItem as Grammar).structures;
    const subtitle = activeTab === 'vocab' ? (currentItem as Vocab).meaning : (currentItem as Grammar).usage;

    return (
      <div 
        className="relative w-full h-full min-h-[300px] sm:min-h-[340px] perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`w-full h-full absolute inset-0 transition-all duration-500 transform-style-3d
          ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* FRONT */}
          <div className="absolute inset-0 backface-hidden bg-white border-2 border-gray-100 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-sm group-hover:border-blue-200 group-hover:shadow-md transition-all">
            <span className="absolute top-4 right-4 text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">Chạm để lật</span>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">{title}</h3>
            <p className="text-sm font-medium text-blue-500">Xem ý nghĩa & giải thích</p>
          </div>

          {/* BACK */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-blue-50 border-2 border-blue-100 rounded-2xl p-6 sm:p-8 flex flex-col items-center shadow-md overflow-y-auto">
            <span className="absolute top-4 right-4 text-xs font-bold text-blue-400 bg-white px-2 py-1 rounded">Mặt sau</span>
            
            <div className="flex-1 w-full flex flex-col justify-center items-center text-center space-y-4">
              <h4 className="text-xl sm:text-2xl font-bold text-blue-700">{subtitle}</h4>
              
              <div className="w-full bg-white p-5 rounded-xl shadow-sm text-left border border-gray-100 mt-2">
                <p className="text-sm sm:text-base text-gray-800 font-medium italic leading-relaxed">
                  "{renderHighlightedExample(currentItem.example, currentItem.fillInBlankAnswer)}"
                </p>
                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                  <span className="font-bold text-gray-700">Dịch câu:</span> 
                  {(currentItem as any).example_translation || "(Chưa có bản dịch cho câu này)"}
                </p>
              </div>

              <div className="w-full bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-left">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-medium">
                  <span className="text-blue-600 font-bold block mb-1">Lưu ý cách dùng:</span>
                  {currentItem.explanation}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto">
      <div className="flex items-start sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">Lý thuyết: {category.name}</h2>
          <div className="w-full bg-gray-100 h-1.5 mt-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${((learnedVocab.length + learnedGrammar.length) / (category.vocab_list.length + category.grammar_list.length)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 overflow-hidden">
        <button
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all
            ${activeTab === 'vocab' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('vocab')}
        >
          <BookOpen size={16} />
          Từ vựng ({learnedVocab.length}/{category.vocab_list.length})
        </button>
        <button
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all
            ${activeTab === 'grammar' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('grammar')}
        >
          <PenTool size={16} />
          Ngữ pháp ({learnedGrammar.length}/{category.grammar_list.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col">
        {currentItem && !quizMode && (
          <div className="text-center mb-4">
            <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
              Đang học: {learnedItems.length + 1} / {totalItems}
            </span>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center">
          {renderFlashcard()}
        </div>

        {currentItem && !quizMode && (
          <div className="flex gap-4 mt-8">
            <button 
              onClick={handleNotLearned}
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl font-bold transition-colors border border-orange-100"
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <RotateCcw size={20} />
              </div>
              <span>Chưa thuộc</span>
            </button>
            <button 
              onClick={handleLearnedClick}
              disabled={!isFlipped}
              className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl font-bold transition-colors border
                ${isFlipped 
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100' 
                  : 'bg-gray-50 text-gray-400 border-gray-100 opacity-50 cursor-not-allowed'}`}
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Check size={24} />
              </div>
              <span>Đã thuộc</span>
            </button>
          </div>
        )}
      </div>

      {isAllLearned && (
        <div className="animate-in slide-in-from-bottom-4 zoom-in-95 duration-500">
          <button 
            onClick={onReadyForTest}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-500/30"
          >
            <CheckCircle size={24} />
            Đã thuộc hoàn toàn, bắt đầu Test!
          </button>
        </div>
      )}
    </div>
  );
}
