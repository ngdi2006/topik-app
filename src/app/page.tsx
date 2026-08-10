import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  AudioLines,
  BadgeCheck,
  BookOpenCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Headphones,
  Mic2,
  Sparkles,
  Trophy,
  Wrench,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

const INTERVIEW_FEATURES = [
  { icon: Mic2, label: 'Giới thiệu bản thân' },
  { icon: Headphones, label: 'Khẩu lệnh phản xạ' },
  { icon: BookOpenCheck, label: 'Từ vựng & biển báo' },
  { icon: Wrench, label: 'Thực hành công cụ' },
]

const LEARNING_BENEFITS = [
  'Lộ trình 7 phần bám sát nội dung Vòng 2',
  'Nghe giọng Hàn, luyện phản xạ và thao tác',
  'Theo dõi tiến độ, câu cần ôn và điểm yếu',
  'Thi thử phỏng vấn tổng hợp theo ngành',
]

const EXPERIENCE_GALLERY = [
  {
    src: '/images/landing/2aoboqqso0hhcqndkbuocp72l2m0fuevznbazjew1.jpg',
    alt: 'Học viên thực hành sử dụng công cụ cho Phỏng vấn Vòng 2',
    kicker: 'Thực hành theo chỉ dẫn',
    title: 'Thực hành đúng trước khi thi',
    description: 'Nhận diện dụng cụ, nghe yêu cầu và thực hiện đúng trình tự thao tác.',
    position: 'object-center',
  },
  {
    src: '/images/landing/2aoboqqso3cjftkkcglpw1oajj22j3eufyop2ncy4.jpg',
    alt: 'Giáo viên đánh giá thao tác sử dụng dụng cụ của học viên',
    kicker: 'Đánh giá trực tiếp',
    title: 'Chỉnh từng bước thao tác',
    description: 'Phát hiện lỗi và sửa ngay trong mỗi lượt thực hành.',
    position: 'object-center',
  },
  {
    src: '/images/landing/2aoboqqso5naxrbfdmspqvuhcw9vnumw9ni55bue6.jpg',
    alt: 'Giáo viên Korea Link theo dõi và ghi nhận kết quả Vòng 2',
    kicker: 'Theo sát tiến độ',
    title: 'Tập trung vào từng học viên',
    position: 'object-center',
  },
  {
    src: '/images/landing/2aoboqqsouqgvjk9ycgsuagdafhbypvha8dhyzgw8.jpg',
    alt: 'Học viên thực hành nội dung thể lực trong Vòng 2',
    kicker: 'Mô phỏng thực tế',
    title: 'Làm quen mọi tình huống',
    position: 'object-center',
  },
]

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f8fc] text-slate-950 selection:bg-violet-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(#cbd5e1_0.7px,transparent_0.7px)] [background-size:18px_18px] opacity-35" />
      <div className="pointer-events-none absolute -left-40 top-12 size-[520px] rounded-full bg-blue-300/25 blur-[110px]" />
      <div className="pointer-events-none absolute -right-40 top-48 size-[560px] rounded-full bg-violet-300/25 blur-[120px]" />

      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8 lg:px-12">
          <Link className="flex items-center gap-2.5" href="/">
            <span className="relative size-9 overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200/80">
              <Image
                alt="Logo Korea Link"
                className="absolute left-1/2 top-1/2 size-14 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
                height={56}
                priority
                src="/images/logo/logo.k.png"
                width={56}
              />
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900">Korea Link</span>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-3" aria-label="Tài khoản">
            <Link href="/register">
              <Button className="hidden rounded-xl px-4 font-bold text-slate-600 hover:bg-slate-100 sm:inline-flex" variant="ghost">Đăng ký miễn phí</Button>
            </Link>
            <Link href="/login">
              <Button className="rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700">Đăng nhập</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/90 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-violet-700 shadow-sm backdrop-blur sm:text-xs">
              <Sparkles className="size-4 text-amber-500" /> Từ EPS‑TOPIK đến Vòng 2
            </div>
            <h1 className="text-[2.35rem] font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-6xl lg:text-[4.25rem]">
              <span className="block text-slate-950">Rèn phản xạ</span>
              <span className="mt-2 block bg-gradient-to-r from-blue-600 via-indigo-500 to-fuchsia-600 bg-clip-text pr-2 font-bold italic tracking-[-0.025em] text-transparent drop-shadow-[0_10px_24px_rgba(109,40,217,0.16)]">Bứt phá Vòng 2</span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-[15px] font-medium leading-6 text-slate-600 sm:text-lg sm:leading-7 lg:mx-0">
              Thi thử EPS‑TOPIK, luyện phản xạ và thực hành Vòng 2 theo đúng ngành của bạn.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/register">
                <Button className="h-13 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-7 text-base font-black text-white shadow-xl shadow-violet-500/25 hover:from-blue-700 hover:to-violet-700 sm:w-auto">
                  Luyện Vòng 2 ngay <ArrowRight className="size-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button className="h-13 w-full rounded-2xl border-slate-200 bg-white px-7 text-base font-bold text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto" variant="outline">
                  Thi thử EPS‑TOPIK
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px]">
            <div className="absolute -inset-5 rounded-[40px] bg-gradient-to-br from-blue-400/25 to-violet-500/30 blur-2xl" />
            <div className="group relative overflow-hidden rounded-[30px] border-[6px] border-white bg-slate-950 shadow-2xl shadow-slate-400/40">
              <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/3]">
                <Image
                  alt="Học viên Korea Link tham gia buổi phỏng vấn Vòng 2 thực tế"
                  className="object-cover object-center transition duration-700 ease-out motion-safe:group-hover:scale-[1.035]"
                  fill
                  priority
                  sizes="(max-width: 1024px) 92vw, 48vw"
                  src="/images/landing/2aoboqqso2hzmlpzp8ruavrgjshcjeanhu7oy9vk3.jpg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur sm:text-xs">
                    <Mic2 className="size-3.5" /> Phỏng vấn Vòng 2 thực tế
                  </span>
                  <h2 className="mt-3 text-2xl font-extrabold leading-[1.12] tracking-[-0.025em] sm:text-3xl">
                    Luyện như thi thật
                    <span className="mt-1 block font-semibold italic text-cyan-100">Tự tin bước vào phòng</span>
                  </h2>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {INTERVIEW_FEATURES.map(({ icon: Icon, label }) => (
                      <div className="flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2 text-[10px] font-bold ring-1 ring-white/20 backdrop-blur-md sm:text-xs" key={label}>
                        <Icon className="size-4 shrink-0 text-cyan-300" /> {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-[10px] font-black text-slate-800 shadow-lg backdrop-blur sm:text-xs">
                <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>
                Mô phỏng thi thật
              </div>
            </div>
            <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-xl backdrop-blur sm:flex">
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><AudioLines className="size-5" /></span>
              <div><strong className="block text-xs">7 phần luyện tập</strong><span className="text-[10px] text-slate-500">Theo đúng ngành nghề</span></div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white py-16 sm:py-20" id="lo-trinh">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Chọn đúng mục tiêu</p>
              <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
                Hai lộ trình
                <span className="ml-2 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text font-semibold italic text-transparent">một mục tiêu</span>
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">Vào đúng nội dung bạn cần, tiến độ của từng lộ trình được theo dõi riêng.</p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="group relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white shadow-xl shadow-indigo-500/20 sm:p-8">
                <div className="absolute -right-16 -top-20 size-64 rounded-full border-[42px] border-white/5 transition-transform duration-500 group-hover:scale-110" />
                <div className="relative">
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-950">Nổi bật</span>
                    <Mic2 className="size-8 text-blue-200" />
                  </div>
                  <h3 className="mt-6 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">Phỏng vấn <span className="font-semibold italic text-cyan-200">Vòng 2</span></h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Luyện từ câu cơ bản đến bài thi tổng hợp, theo đúng ngành nghề đăng ký.</p>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {LEARNING_BENEFITS.map((benefit) => (
                      <li className="flex items-start gap-2 text-xs font-semibold text-white/90 sm:text-sm" key={benefit}>
                        <Check className="mt-0.5 size-4 shrink-0 text-cyan-300" /> {benefit}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button className="mt-7 h-12 rounded-xl bg-white px-6 font-black text-indigo-700 hover:bg-blue-50">Vào luyện Vòng 2 <ArrowRight className="size-4" /></Button>
                  </Link>
                </div>
              </article>

              <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">Thi lý thuyết</span>
                  <ClipboardCheck className="size-8 text-blue-600" />
                </div>
                <h3 className="mt-6 text-2xl font-extrabold tracking-[-0.025em]">Thi thử <span className="font-semibold italic text-blue-600">EPS‑TOPIK</span></h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Đề thi bám sát cấu trúc thật, chấm điểm và lưu lịch sử làm bài.</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white p-3 shadow-sm"><Clock3 className="size-5 text-blue-600" /><strong className="mt-2 block text-sm">Đúng thời gian</strong></div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm"><Trophy className="size-5 text-amber-500" /><strong className="mt-2 block text-sm">Có xếp hạng</strong></div>
                </div>
                <Link className="mt-7 inline-flex items-center gap-1.5 text-sm font-black text-blue-700 hover:text-blue-900" href="/register">Xem đề thi <ChevronRight className="size-4" /></Link>
              </article>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-24">
          <div className="pointer-events-none absolute -left-28 top-0 size-96 rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="pointer-events-none absolute -right-28 bottom-0 size-96 rounded-full bg-violet-600/20 blur-[100px]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
            <div className="mb-9 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Học từ trải nghiệm thật</p>
                <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
                  Học từ trải nghiệm
                  <span className="ml-2 font-semibold italic text-cyan-300">thực tế</span>
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">Nội dung trực tuyến được xây dựng từ các buổi mô phỏng, thực hành công cụ và đánh giá trực tiếp tại Korea Link.</p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold ring-1 ring-white/15">
                <BadgeCheck className="size-4 text-emerald-400" />
                <span className="md:hidden">Vuốt để khám phá</span>
                <span className="hidden md:inline">Hình ảnh thực tế tại trung tâm</span>
              </div>
            </div>

            <div className="-mx-4 grid snap-x snap-mandatory auto-cols-[84%] grid-flow-col gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid-flow-row md:auto-cols-auto md:grid-cols-12 md:grid-rows-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
              {EXPERIENCE_GALLERY.map((item, index) => (
                <article
                  className={`group relative min-h-[360px] snap-center overflow-hidden rounded-[24px] bg-slate-900 ring-1 ring-white/10 md:rounded-[26px] ${index === 0 ? 'md:col-span-7 md:row-span-2 md:min-h-[600px]' : index === 1 ? 'md:col-span-5 md:min-h-[290px]' : index === 2 ? 'md:col-span-3 md:min-h-[290px]' : 'md:col-span-2 md:min-h-[290px]'}`}
                  key={item.src}
                >
                  <Image
                    alt={item.alt}
                    className={`object-cover ${item.position} transition duration-700 ease-out motion-safe:group-hover:scale-105`}
                    fill
                    sizes="(max-width: 767px) 84vw, (max-width: 1279px) 42vw, 32vw"
                    src={item.src}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/5 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-white/12 text-[10px] font-black ring-1 ring-white/20 backdrop-blur">0{index + 1}</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">{item.kicker}</span>
                    </div>
                    <h3 className={`${index === 0 ? 'text-xl md:text-2xl' : 'text-lg'} text-balance font-extrabold leading-tight tracking-[-0.02em]`}>{item.title}</h3>
                    {item.description ? <p className="mt-1.5 max-w-lg text-xs leading-5 text-slate-300">{item.description}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-8">
            <div className="relative overflow-hidden rounded-[32px] border border-violet-200 bg-gradient-to-br from-white via-white to-violet-50 p-5 shadow-[0_24px_70px_-30px_rgba(109,40,217,0.35)] sm:p-10">
              <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-violet-200/45 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -left-24 size-64 rounded-full bg-blue-200/35 blur-3xl" />

              <div className="relative text-center">
                <span className="inline-flex rounded-full bg-violet-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700 sm:text-xs">Gói Phỏng vấn Vòng 2</span>
                <h2 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">Kích hoạt lộ trình</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">Một gói mở toàn bộ nội dung trong thời hạn bạn chọn.</p>

                <div className="mx-auto mt-5 grid max-w-2xl grid-cols-1 gap-2 text-left sm:grid-cols-3">
                  {['Mở đầy đủ P2–P7', 'Thi thử Phỏng vấn Vòng 2', 'Ôn tập đúng điểm yếu'].map((benefit) => (
                    <div className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200/80" key={benefit}>
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="size-3" /></span>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mt-7 grid gap-4 sm:grid-cols-2">
                {[
                  { days: '10 ngày', price: '49.000đ', daily: '4.900đ/ngày', note: 'Ôn cấp tốc trước ngày phỏng vấn' },
                  { days: '30 ngày', price: '99.000đ', daily: '3.300đ/ngày', note: 'Luyện đều, có thời gian cải thiện', saving: 'Tiết kiệm 48.000đ' },
                ].map((plan, index) => (
                  <article className={`relative flex flex-col rounded-[22px] border p-5 text-left transition duration-300 motion-safe:hover:-translate-y-1 ${index === 1 ? 'border-violet-500 bg-gradient-to-br from-white to-violet-50 shadow-xl shadow-violet-200/50 ring-2 ring-violet-100' : 'border-slate-200 bg-white shadow-sm hover:shadow-lg'}`} key={plan.days}>
                    {index === 1 ? <span className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white">Khuyên dùng</span> : null}
                    <strong className="text-xl font-extrabold tracking-[-0.02em] text-slate-950">{plan.days}</strong>
                    <p className="mt-1 pr-20 text-xs leading-5 text-slate-500">{plan.note}</p>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <p className="text-3xl font-extrabold tracking-[-0.04em] text-violet-700">{plan.price}</p>
                      <span className="pb-1 text-[10px] font-bold text-slate-500">≈ {plan.daily}</span>
                    </div>
                    {plan.saving ? <p className="mt-2 text-[10px] font-bold text-emerald-600">{plan.saving} so với 3 gói 10 ngày</p> : <div className="mt-2 h-[15px]" />}
                    <Link className="mt-4" href="/register">
                      <Button className={`h-11 w-full rounded-xl font-extrabold ${index === 1 ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-300/40 hover:from-blue-700 hover:to-violet-700' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'}`} variant={index === 1 ? 'default' : 'outline'}>
                        Chọn gói {plan.days} <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                  </article>
                ))}
              </div>

            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white/95">
        <div className="h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-6 text-center sm:flex-row sm:px-8 sm:py-7 sm:text-left lg:px-12">
          <Link aria-label="Korea Link" className="relative block h-16 w-32 overflow-hidden" href="/">
            <Image
              alt="Korea Link"
              className="absolute left-1/2 top-1/2 h-32 w-32 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
              height={128}
              src="/images/logo/logokl1.png"
              width={128}
            />
          </Link>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600">Từ EPS‑TOPIK đến Phỏng vấn Vòng 2</p>
            <p className="text-[10px] font-medium text-slate-400">© {new Date().getFullYear()} Korea Link</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
