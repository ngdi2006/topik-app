import { BookOpen, ClipboardCheck, Headphones, Sparkles } from "lucide-react"
import LessonPreview from "./LessonPreview"

export default function LearningJourney({ destination }: { destination: string }) {
  const steps = [
    { icon: BookOpen, title: "Chọn một bài học", text: "Bắt đầu từ giáo trình và chủ đề bạn muốn khám phá.", tone: "bg-blue-50 text-blue-600" },
    { icon: Headphones, title: "Đọc, nghe và thực hành", text: "Ghi nhớ kiến thức qua hội thoại và bài tập tương tác.", tone: "bg-violet-50 text-violet-600" },
    { icon: ClipboardCheck, title: "Ôn lại, rồi thử sức", text: "Xem bài đã làm và tiến thêm một bước với đề thi thử.", tone: "bg-indigo-50 text-indigo-600" },
  ]
  return <section id="cach-hoc" className="scroll-mt-24 border-y border-slate-200/80 bg-white" data-home-journey><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-18 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-10">
    <div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-violet-600"><span className="h-px w-6 bg-violet-400" /> Học đơn giản hơn</p><h2 className="mt-3 max-w-lg text-3xl font-bold leading-tight tracking-[-.04em] text-slate-900 sm:text-4xl">Một bài học nhỏ.<br />Một bước tiến mới.</h2><p className="mt-4 max-w-md text-sm leading-7 text-slate-500">Chọn nhịp học phù hợp với bạn. Bắt đầu bằng một lời chào và từng bước xây dựng sự tự tin.</p>
      <div className="relative mt-8"><span aria-hidden="true" className="absolute bottom-9 left-[23px] top-8 w-px bg-gradient-to-b from-blue-200 via-violet-200 to-indigo-100" /><ol className="relative space-y-1">{steps.map(({ icon: Icon, title, text, tone }, index) => <li className="relative flex gap-4 py-3" key={title}><span className={`relative grid size-12 shrink-0 place-items-center rounded-2xl border-4 border-white ${tone}`}><Icon className="size-5" /><span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border-2 border-white bg-slate-900 text-[8px] font-bold text-white">{index + 1}</span></span><div className="pt-1"><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{text}</p></div></li>)}</ol></div>
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs leading-5 text-blue-800"><Sparkles className="mt-0.5 size-4 shrink-0 text-blue-500" /><p>Thử một câu hỏi bên cạnh để làm quen cách học cùng Korea Link.</p></div>
    </div>
    <div className="relative min-w-0 rounded-[32px] bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 p-2 sm:p-4"><div className="mb-3 flex items-center justify-between gap-2 px-3 pt-2 text-[10px] font-semibold text-slate-500"><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-blue-500" /> Korea Link · Học thử</span><span>한국어</span></div><LessonPreview destination={destination} /></div>
  </div></section>
}
