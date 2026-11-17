import Image from "next/image"
import { BookOpen, Headphones, Layers3, Sparkles } from "lucide-react"

export default function LearningVisual() {
  return <div className="relative mx-auto w-full max-w-[560px] pb-1 pt-0 sm:pb-8 sm:pt-4" aria-label="Không gian học tiếng Hàn cùng giáo trình EPS-TOPIK">
    <div aria-hidden="true" className="absolute -inset-5 rounded-full bg-gradient-to-br from-blue-200/60 via-indigo-100/60 to-violet-200/60 blur-3xl" />
    <div className="relative overflow-hidden rounded-[28px] border-[5px] border-white bg-blue-50 shadow-[0_24px_65px_-25px_#4565b880] sm:rounded-[36px] sm:border-[7px]">
      <div className="relative aspect-[16/10] sm:aspect-[5/4]">
        <Image src="/dashboard/exam-learner-v2.webp" fill priority sizes="(min-width: 1024px) 48vw, 92vw" alt="Nhân vật anime Korea Link mặc áo xanh đang học và làm bài tiếng Hàn" className="object-cover object-right" />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-white/95 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-blue-700 shadow-sm sm:left-5 sm:top-5 sm:px-3 sm:py-2 sm:text-[10px]"><Sparkles className="size-3 text-violet-500" /> Cùng bạn học tiếng Hàn</div>
        <div className="absolute left-3 top-[26%] hidden w-[44%] sm:block rounded-2xl border border-white bg-white/95 p-3 shadow-lg shadow-blue-900/5 sm:left-5 sm:p-4"><span className="text-[9px] font-semibold uppercase tracking-wide text-violet-600 sm:text-[10px]">Một lời chào, khởi đầu mới</span><p lang="ko" className="mt-2 text-[clamp(1.05rem,3vw,1.9rem)] font-bold tracking-tight text-blue-700">안녕하세요!</p><p className="mt-1 text-[10px] text-slate-500 sm:text-xs">Xin chào bạn!</p></div>
        <div className="absolute bottom-3 left-3 flex gap-2 sm:bottom-5 sm:left-5">{[{ icon: BookOpen, label: 'Đọc & thực hành', color: 'text-blue-700' }, { icon: Headphones, label: 'Luyện nghe', color: 'text-violet-700' }].map(({ icon: Icon, label, color }) => <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-2.5 py-2 text-[9px] font-semibold shadow-sm sm:px-3 sm:text-[11px] ${color}`} key={label}><Icon className="size-3.5" />{label}</span>)}</div>
      </div>
    </div>
    <div className="relative mx-3 -mt-1 hidden items-center sm:flex gap-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_15px_35px_-20px_#3453a780] sm:mx-7 sm:-mt-3 sm:gap-4 sm:p-4">
      <div className="flex shrink-0 items-end -space-x-1.5" aria-hidden="true"><Image src="/textbooks/covers/eps-topik-2025-volume-1.png" width={44} height={62} sizes="44px" alt="" className="h-auto w-10 -rotate-6 rounded-r-sm border border-slate-100 shadow-sm sm:w-11" /><Image src="/textbooks/covers/eps-topik-2025-volume-2.png" width={44} height={62} sizes="44px" alt="" className="h-auto w-10 rotate-6 rounded-r-sm border border-slate-100 shadow-sm sm:w-11" /></div>
      <div className="min-w-0"><p className="text-xs font-bold text-slate-900 sm:text-sm">Giáo trình EPS-TOPIK</p><p className="mt-1 text-[10px] text-slate-500 sm:text-xs">2 quyển · 60 bài học</p></div><span className="ml-auto grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white sm:size-11"><Layers3 className="size-5" /></span>
    </div>
  </div>
}
