import React from 'react';
import { WeakCategory } from './types';
import { CheckCircle2, Flame, ArrowRight, Target, Sparkles, XCircle, AlertTriangle, BrainCircuit, Zap, ChevronRight } from 'lucide-react';
interface DashboardProps {
  weakCategories: WeakCategory[];
  onSelectCategory: (categoryId: string) => void;
}

export default function Dashboard({ weakCategories, onSelectCategory }: DashboardProps) {
  if (weakCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-emerald-100 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4 ring-8 ring-emerald-50/50">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">Tuyệt vời!</h3>
        <p className="text-gray-500 text-sm max-w-sm">Bạn đã hoàn thành xuất sắc bài thi và không có điểm yếu nào cần khắc phục lúc này. Hãy tiếp tục phát huy nhé!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-8 shadow-xl">
        {/* Abstract shapes for background */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 rounded-full bg-blue-600/30 blur-3xl opacity-50 mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-56 h-56 rounded-full bg-purple-600/30 blur-3xl opacity-50 mix-blend-screen pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-200 text-xs font-semibold mb-4 backdrop-blur-sm">
              <BrainCircuit size={14} />
              Phân tích AI từ bài làm
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight leading-snug">
              Kế hoạch học tập <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                dành riêng cho bạn
              </span>
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Hệ thống đã phân tích lỗi sai và lập lộ trình ngắn nhất giúp bạn tối ưu điểm số. Bắt đầu ngay nhé!
            </p>
          </div>
          
          <div className="hidden md:flex w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 items-center justify-center shrink-0 shadow-[0_0_30px_rgba(59,130,246,0.3)] relative">
            <Target size={40} className="text-white relative z-10" />
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-[spin_4s_linear_infinite]" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Nút Ôn tập Toàn bộ */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 transition-transform hover:-translate-y-1 hover:shadow-xl">
          <div>
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-300 fill-yellow-300" />
              Ôn tập Toàn bộ Lỗi sai
            </h3>
            <p className="text-blue-100 text-sm">
              Gom chung tất cả từ vựng và ngữ pháp từ {weakCategories.reduce((acc, cat) => acc + cat.errorCount, 0)} câu sai để luyện tập một lèo.
            </p>
          </div>
          <button 
            onClick={() => onSelectCategory('ALL')}
            className="w-full sm:w-auto shrink-0 px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2 shadow-sm"
          >
            Bắt đầu học ngay <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 mt-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shadow-inner">
              <Flame className="text-red-500" size={18} />
            </div>
            Cần ưu tiên khắc phục
          </h3>
          <span className="text-xs font-semibold text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100 self-start sm:self-auto">
            {weakCategories.length} dạng bài
          </span>
        </div>
        
        <div className="grid gap-3 sm:gap-4">
          {weakCategories.map((category, index) => {
            const isTopPriority = index === 0;
            return (
              <div 
                key={category.categoryId}
                onClick={() => onSelectCategory(category.categoryId)}
                className={`group relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 transition-all duration-300 cursor-pointer border-2
                  ${isTopPriority 
                    ? 'border-red-100 hover:border-red-300 shadow-sm hover:shadow-md hover:shadow-red-500/10' 
                    : 'border-transparent hover:border-blue-200 shadow-sm hover:shadow-md hover:shadow-blue-500/10'
                  } hover:-translate-y-0.5`}
              >
                {/* Decorative background element */}
                <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none
                  ${isTopPriority ? 'bg-red-500' : 'bg-blue-500'}`} />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Rank Badge */}
                    <div className={`shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg font-black shadow-inner
                      ${index === 0 ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30 ring-2 ring-red-50' : 
                        index === 1 ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-orange-500/30 ring-2 ring-orange-50' : 
                        index === 2 ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-50' :
                        'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors'}`}>
                      #{index + 1}
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 sm:line-clamp-1 leading-tight">
                        {category.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold
                          ${isTopPriority ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                          <XCircle size={12} />
                          Sai {category.errorCount} câu
                        </span>
                        {isTopPriority && (
                          <span className="text-[10px] sm:text-xs font-bold text-rose-500 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                            <AlertTriangle size={12} className="animate-pulse" />
                            KHẨN CẤP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    className={`w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2
                      ${isTopPriority 
                        ? 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white' 
                        : 'bg-slate-50 text-slate-700 group-hover:bg-blue-600 group-hover:text-white'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCategory(category.categoryId);
                    }}
                  >
                    Vào ôn tập
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
