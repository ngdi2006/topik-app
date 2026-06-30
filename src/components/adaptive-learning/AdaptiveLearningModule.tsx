"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QuestionBank as MockQuestionBank } from './mockData';
import { extractVocabFromQuestions, extractGrammarFromQuestions } from './utils';
import Dashboard from './Dashboard';
import LearningScreen from './LearningScreen';
import MiniTestScreen from './MiniTestScreen';
import { Question, QuestionBankType, WeakCategory } from './types';
import { Loader2 } from 'lucide-react';

type ModuleState = 'dashboard' | 'learning' | 'testing';

function AdaptiveLearningContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId');
  const resultId = searchParams.get('resultId');

  const [currentState, setCurrentState] = useState<ModuleState>('dashboard');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  
  const [dynamicQuestionBank, setDynamicQuestionBank] = useState<QuestionBankType>(MockQuestionBank);
  const [weakCategories, setWeakCategories] = useState<WeakCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRealData = async () => {
      if (!examId || !resultId) {
        // Fallback to mock data if no params
        setWeakCategories([
          { categoryId: "dang_01", name: "Tìm từ đồng nghĩa / Trích xuất biểu đồ", errorCount: 3 },
          { categoryId: "dang_02", name: "Sắp xếp câu thành đoạn văn", errorCount: 1 }
        ]);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/exams/${examId}/result/${resultId}`);
        const data = await res.json();
        if (!res.ok) throw new Error("Failed to fetch result");

        const questions = data.questions || [];
        const answers = data.result?.answers || {};

        const groups: Record<string, any[]> = {};
        
        questions.forEach((q: any) => {
            const userAnswer = answers[q.id];
            // If answer is wrong or unanswered
            if (userAnswer === undefined || Number(userAnswer) !== Number(q.correct_answer)) {
                const cid = q.category_id || "unknown";
                if (!groups[cid]) {
                    groups[cid] = [];
                }
                // Extract option strings from {type, content} objects
                const optionStrings = (q.options || []).map((opt: any) => 
                    typeof opt === 'string' ? opt : (opt?.content || '')
                );
                // Get correct answer text
                const correctOpt = q.options?.[q.correct_answer];
                const correctAnswerText = typeof correctOpt === 'string' 
                    ? correctOpt 
                    : (correctOpt?.content || "Đáp án đúng");
                    
                groups[cid].push({
                    id: q.id,
                    content: (q.question_text || '') + ' ' + (q.passage || ''),
                    options: optionStrings,
                    answer: correctAnswerText,
                    category_name: q.category?.name || q.category_name || null,
                    translated_text: q.translated_text,
                    ai_vocab_list: q.ai_vocab_list,
                    ai_grammar_list: q.ai_grammar_list
                });
            }
        });

        if (Object.keys(groups).length > 0) {
            const newBank: QuestionBankType = {};
            const newWeakCategories: WeakCategory[] = [];
            
            let index = 1;
            const allVocabMap = new Map();
            const allGrammarMap = new Map();
            const allQuestions: any[] = [];

            for (const [cid, qList] of Object.entries(groups)) {
                // Try to get category name from the first question, or use a fallback
                let catName = qList[0].category_name;
                if (!catName) {
                    catName = `Dạng bài ${index}`;
                }
                // Extract vocab and grammar from AI data, fallback to old functions
                let vocab_list: any[] = [];
                let grammar_list: any[] = [];
                
                qList.forEach(q => {
                   if (q.ai_vocab_list && q.ai_vocab_list.length > 0) {
                       vocab_list.push(...q.ai_vocab_list);
                   }
                   if (q.ai_grammar_list && q.ai_grammar_list.length > 0) {
                       grammar_list.push(...q.ai_grammar_list);
                   }
                });

                if (vocab_list.length === 0) {
                    vocab_list = extractVocabFromQuestions(qList, 5); // Fallback
                } else {
                    vocab_list = vocab_list.slice(0, 10); // Limit to 10 AI items per category
                }

                if (grammar_list.length === 0) {
                    grammar_list = extractGrammarFromQuestions(qList, 3); // Fallback
                } else {
                    grammar_list = grammar_list.slice(0, 5); // Limit AI items
                }
                
                newBank[cid] = {
                    name: catName,
                    vocab_list,
                    grammar_list,
                    questions: qList
                };
                
                newWeakCategories.push({
                    categoryId: cid,
                    name: catName,
                    errorCount: qList.length
                });

                // Tích lũy cho thẻ ALL
                vocab_list.forEach(v => {
                    if (!allVocabMap.has(v.word)) allVocabMap.set(v.word, v);
                });
                grammar_list.forEach(g => {
                    if (!allGrammarMap.has(g.structures)) allGrammarMap.set(g.structures, g);
                });
                allQuestions.push(...qList);
                
                index++;
            }

            // Tạo category ALL
            newBank['ALL'] = {
                name: "Tất cả Lỗi sai",
                vocab_list: Array.from(allVocabMap.values()).sort(() => 0.5 - Math.random()),
                grammar_list: Array.from(allGrammarMap.values()).sort(() => 0.5 - Math.random()),
                questions: allQuestions.sort(() => 0.5 - Math.random())
            };
            
            // Sort by errorCount descending
            newWeakCategories.sort((a, b) => b.errorCount - a.errorCount);
            
            setDynamicQuestionBank(newBank);
            setWeakCategories(newWeakCategories);
        } else {
            // No wrong questions!
            setWeakCategories([]);
        }
      } catch (err) {
        console.error("Error fetching real data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealData();
  }, [examId, resultId]);

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setCurrentState('learning');
  };

  const handleReadyForTest = () => {
    if (selectedCategoryId) {
      const categoryData = dynamicQuestionBank[selectedCategoryId];
      // Get max 5 questions
      const shuffled = [...categoryData.questions].sort(() => 0.5 - Math.random());
      setTestQuestions(shuffled.slice(0, 5));
      setCurrentState('testing');
    }
  };

  const handleTestComplete = () => {
    setCurrentState('dashboard');
    setSelectedCategoryId(null);
  };

  const handleBackToDashboard = () => {
    setCurrentState('dashboard');
    setSelectedCategoryId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-500 font-medium">Đang trích xuất câu sai từ bài thi của bạn...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto min-h-[600px]">
      {currentState === 'dashboard' && (
        <Dashboard 
          weakCategories={weakCategories} 
          onSelectCategory={handleSelectCategory} 
        />
      )}

      {currentState === 'learning' && selectedCategoryId && dynamicQuestionBank[selectedCategoryId] && (
        <LearningScreen
          category={dynamicQuestionBank[selectedCategoryId]}
          onBack={handleBackToDashboard}
          onReadyForTest={handleReadyForTest}
        />
      )}

      {currentState === 'testing' && selectedCategoryId && dynamicQuestionBank[selectedCategoryId] && (
        <MiniTestScreen
          questions={testQuestions}
          categoryName={dynamicQuestionBank[selectedCategoryId].name}
          onComplete={handleTestComplete}
        />
      )}
    </div>
  );
}

export default function AdaptiveLearningModule() {
  return (
    <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin w-8 h-8 text-blue-500"/></div>}>
      <AdaptiveLearningContent />
    </Suspense>
  );
}
