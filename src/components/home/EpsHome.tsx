import Image from "next/image"
import HomeFooter from "./HomeFooter"
import LearningPaths from "./LearningPaths"
import LearningJourney from "./LearningJourney"
import ExamInvitation from "./ExamInvitation"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, BookOpen, Headphones, MousePointer2, Sparkles, Target } from "lucide-react"
import LearningVisual from "./LearningVisual"

type Account = { name: string; avatarUrl: string | null } | null
export default function EpsHome({ account }: { account: Account }) {
  const destination = (path: string) => account ? path : `/login?next=${encodeURIComponent(path)}`
  const exams = destination("/dashboard?section=thi-thu-de-thi")
  const library = destination("/textbooks")
  return <div className="min-h-screen bg-[#f5f7fc] text-[#0f172a] selection:bg-[#dbeafe]" data-homepage="eps">
    <a href="#noi-dung" className="sr-only fixed left-4 top-4 z-[100] rounded-xl bg-white p-3 font-semibold focus:not-sr-only">Đi đến nội dung</a>
    <header className="sticky top-0 z-40 border-b border-[#e2e8f0] bg-[#f5f7fc]/95 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5 sm:h-21 sm:px-8 lg:px-10">
        <Link href="/" aria-label="Korea Link · Trang chủ" className="flex shrink-0 items-center gap-2.5"><span className="relative block size-9 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200"><Image src="/images/logo/logo.k.png" alt="" width={56} height={56} className="absolute left-1/2 top-1/2 size-14 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" /></span><span className="text-lg font-extrabold tracking-tight sm:text-xl">Korea Link<span className="mt-0.5 hidden text-[9px] font-semibold uppercase tracking-[.22em] text-slate-500 sm:block">Tiếng Hàn · EPS-TOPIK</span></span></Link>
        <nav aria-label="Điều hướng trang chủ" className="hidden items-center gap-7 text-sm font-medium text-slate-500 lg:flex"><a href="#giao-trinh" className="py-3 transition-colors hover:text-blue-700">Giáo trình</a><a href="#luyen-thi" className="py-3 transition-colors hover:text-blue-700">Luyện thi</a><a href="#cach-hoc" className="py-3 transition-colors hover:text-blue-700">Cách học</a></nav>
        <div className="flex shrink-0 items-center gap-3">{account ? <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-xs font-semibold text-white transition-colors hover:from-blue-700 hover:to-violet-700 sm:px-5 sm:text-sm">Vào học <ArrowUpRight className="size-4" /><span className="sr-only"> · {account.name}</span></Link> : <><Link href="/login" className="hidden min-h-11 items-center px-2 text-sm font-semibold hover:text-blue-700 sm:inline-flex">Đăng nhập</Link><Link href="/register" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-xs font-semibold text-white transition-colors hover:from-blue-700 hover:to-violet-700 sm:px-5 sm:text-sm">Bắt đầu học <ArrowUpRight className="size-4" /></Link></>}</div>
      </div>
    </header>
    <main id="noi-dung">
      <section className="relative overflow-hidden border-b border-[#e2e8f0]">
        <div className="pointer-events-none absolute -right-32 top-0 size-[650px] rounded-full bg-[#e6edff]/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-5 px-5 pb-7 pt-6 sm:gap-10 sm:px-8 sm:pb-16 sm:pt-14 lg:grid-cols-[1.04fr_1fr] lg:gap-10 lg:px-10 lg:py-20">
          <div className="relative z-10">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 py-1.5 pl-2 pr-3 text-[10px] font-semibold text-violet-700 sm:mb-5 sm:text-xs"><span className="grid size-4 place-items-center rounded-full bg-violet-100"><Sparkles className="size-2.5" /></span> Học tiếng Hàn cùng Korea Link</p>
            <h1 data-home-hero-title className="max-w-xl text-[30px] font-extrabold leading-[1.16] tracking-[-.04em] min-[375px]:text-[34px] sm:text-[clamp(2.7rem,4.4vw,3.8rem)]">Tự tin chinh phục<br /><span className="inline-block bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">EPS-TOPIK.</span></h1>
            <p data-home-hero-description className="mt-3 max-w-[410px] text-sm leading-6 text-slate-500 sm:mt-5 sm:text-base sm:leading-7">Giáo trình, bài tập và thi thử.<br className="sm:hidden" /> Học gọn trong một nền tảng.</p>
            <div data-home-hero-actions className="mt-5 grid max-w-sm grid-cols-[1.25fr_1fr] gap-2.5 sm:mt-6 sm:flex sm:max-w-none sm:flex-wrap sm:gap-3"><Link href={library} aria-label="Khám phá giáo trình" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#195bff] px-3 text-xs font-bold text-white shadow-[0_8px_20px_-8px_#195bff80] transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:min-h-12 sm:rounded-full sm:px-6 sm:text-sm"><span className="sm:hidden">Vào học ngay</span><span className="hidden sm:inline">Khám phá giáo trình</span><ArrowRight className="size-3.5 shrink-0" /></Link><Link href={exams} aria-label="Thi thử ngay" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-3 text-xs font-semibold transition-colors hover:border-blue-300 sm:min-h-12 sm:rounded-full sm:px-5 sm:text-sm">Thi thử ngay<ArrowUpRight className="size-3.5 shrink-0" /></Link></div>
          </div>
          <LearningVisual />
        </div>
      </section>
      <div className="border-b border-[#e2e8f0] bg-[#eef2ff]"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-5 gap-y-4 px-5 py-5 text-xs font-semibold text-[#536a99] sm:grid-cols-4 sm:px-8 lg:px-10">{[{ icon: BookOpen, label: 'Giáo trình EPS-TOPIK' }, { icon: MousePointer2, label: 'Bài tập tương tác' }, { icon: Headphones, label: 'Luyện nghe theo bài' }, { icon: Target, label: 'Thi thử trực tuyến' }].map(({ icon: Icon, label }) => <span key={label} className="flex items-center justify-center gap-2"><Icon className="size-4 shrink-0" />{label}</span>)}</div></div>
      <LearningPaths library={library} exams={exams} />
      <LearningJourney destination={library} />
      <ExamInvitation destination={exams} library={library} />
    </main>
    <HomeFooter library={library} exams={exams} signedIn={!!account} />
  </div>
}
