import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Bot, CheckCircle, Sparkles, Star, Gem, PlayCircle, BarChart3, Clock, Medal } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 overflow-hidden relative selection:bg-blue-500/30 font-sans">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
      
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/20 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-400/20 blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-emerald-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes float-reverse {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(15px) rotate(-2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 7s ease-in-out infinite; }
        .draw-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: dash 2s ease-out forwards; }
      `}} />

      {/* Navbar */}
      <header className="relative z-50 flex items-center justify-between px-4 py-4 sm:px-8 lg:px-16 w-full max-w-7xl mx-auto backdrop-blur-sm bg-white/40 rounded-b-3xl border-b border-white/40 shadow-sm">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/30">
            K
          </div>
          <span className="hidden sm:inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-800 font-extrabold">Korea Link</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-5 rounded-xl hidden sm:flex h-11">
              Đăng nhập
            </Button>
          </Link>
          <Link href="/register">
            <Button className="font-bold shadow-lg shadow-blue-500/30 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white h-11">
              Bắt đầu ngay
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        
        {/* HERO SECTION */}
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 pt-12 pb-20 lg:pt-24 lg:pb-32 flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          {/* Left: Text Content */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left relative z-10 w-full">
            
            {/* Decorative Sparkle */}
            <div className="absolute -top-12 -left-8 text-yellow-400 opacity-60 animate-float hidden lg:block">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-blue-600 text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span>Nền tảng học tiếng Hàn AI thế hệ mới</span>
            </div>
            
            <h1 className="text-[2.5rem] sm:text-6xl xl:text-7xl font-black tracking-tight text-slate-900 leading-[1.15] mb-6 relative z-10">
              Chinh phục <br className="hidden lg:block" />
              <span className="relative inline-block text-blue-600 lg:text-slate-900">
                EPS-TOPIK
                {/* SVG Highlight Underline */}
                <svg className="absolute w-full h-4 -bottom-1 left-0 text-yellow-400 -z-10 draw-line hidden lg:block" viewBox="0 0 200 20" preserveAspectRatio="none">
                  <path d="M2,15 C50,2 150,5 198,12" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span> <br />
              Dễ dàng hơn bao giờ hết
            </h1>
            
            <p className="max-w-xl text-base sm:text-lg text-slate-600 font-semibold mb-8 leading-relaxed">
              Trải nghiệm thi thử với giao diện chuẩn 100% thực tế. Chấm điểm tự động, phân tích lỗi sai và lộ trình học tập cá nhân hóa cùng AI trợ giảng.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto relative">
              {/* Arrow pointing to button */}
              <div className="absolute -left-12 top-full mt-2 hidden lg:block text-slate-400 animate-pulse">
                <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
                  <path d="M10,10 Q30,50 80,40" stroke="currentColor" strokeWidth="3" strokeDasharray="5,5" fill="none"/>
                  <path d="M70,30 L85,38 L75,50" stroke="currentColor" strokeWidth="3" fill="none"/>
                </svg>
              </div>

              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-2xl shadow-xl shadow-blue-500/30 group transition-all hover:-translate-y-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg">
                  Bắt đầu học miễn phí
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-14 px-8 rounded-2xl bg-white/80 border-slate-200 hover:bg-slate-50 hover:text-blue-600 font-bold transition-all hover:-translate-y-1 shadow-sm text-slate-700 text-lg">
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Xem Demo
                </Button>
              </Link>
            </div>
            
            {/* Social Proof */}
            <div className="mt-10 flex items-center gap-4 text-sm font-semibold text-slate-500 bg-white/50 px-4 py-2 rounded-full border border-slate-100">
              <div className="flex -space-x-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-bold text-slate-700 text-[10px] shadow-sm bg-gradient-to-br ${i===1?'from-blue-100 to-blue-200':i===2?'from-green-100 to-green-200':i===3?'from-yellow-100 to-yellow-200':'from-pink-100 to-pink-200'}`}>
                    U{i}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex text-yellow-400 mb-0.5">
                  <Star className="w-3.5 h-3.5 fill-current"/><Star className="w-3.5 h-3.5 fill-current"/><Star className="w-3.5 h-3.5 fill-current"/><Star className="w-3.5 h-3.5 fill-current"/><Star className="w-3.5 h-3.5 fill-current"/>
                </div>
                <span className="text-xs">Hơn 10,000+ học viên tin dùng</span>
              </div>
            </div>
          </div>
          
          {/* Right: Graphic / Illustration */}
          <div className="flex-1 w-full relative min-h-[450px] lg:min-h-[600px] flex items-center justify-center mt-10 lg:mt-0">
            
            {/* Decorative background blob */}
            <div className="absolute w-[300px] h-[300px] lg:w-[400px] lg:h-[400px] bg-gradient-to-tr from-blue-400 to-purple-400 rounded-full blur-[60px] lg:blur-[80px] opacity-30"></div>
            
            {/* Main Mockup Card */}
            <div className="relative z-10 w-full max-w-[340px] bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white shadow-2xl shadow-slate-300/50 p-6 animate-float">
              
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                  <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                  <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                </div>
                <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Đề thi số 1</div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-bold text-slate-400 mb-1">Điểm Đọc Hiểu</p>
                    <h3 className="text-5xl font-black text-slate-800">100<span className="text-xl text-slate-400">/100</span></h3>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 shadow-inner">
                    <Medal className="w-7 h-7" />
                  </div>
                </div>
                
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 w-full rounded-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px]"></div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
                    <div className="flex-1">
                      <div className="h-2.5 w-24 bg-blue-200 rounded-full mb-2"></div>
                      <div className="h-2.5 w-16 bg-blue-100 rounded-full"></div>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 opacity-70">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">2</div>
                    <div className="flex-1">
                      <div className="h-2.5 w-32 bg-slate-200 rounded-full mb-2"></div>
                      <div className="h-2.5 w-20 bg-slate-200 rounded-full"></div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>
                  </div>
                </div>
              </div>

              {/* Floating Element 1 */}
              <div className="absolute -left-16 sm:-left-20 top-24 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-float-reverse flex items-center gap-3 z-20">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xl font-black shadow-inner">
                  가
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Từ vựng mới</p>
                  <p className="text-base font-black text-slate-800">안녕하세요</p>
                </div>
              </div>

              {/* Floating Element 2 */}
              <div className="absolute -right-10 sm:-right-14 -bottom-8 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-float-reverse flex items-center gap-3 z-20" style={{ animationDelay: '1s' }}>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-inner">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Thời gian</p>
                  <p className="text-base font-black text-slate-800">45:00</p>
                </div>
              </div>
            </div>

            {/* Background decorative svg */}
            <svg className="absolute right-0 top-10 text-slate-300 w-64 h-64 -z-10 animate-spin opacity-50" style={{ animationDuration: '60s' }} viewBox="0 0 100 100" fill="none">
              <path d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="relative z-10 bg-white py-24 sm:py-32 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 text-center">
            
            {/* Title Deco */}
            <div className="inline-block mb-6 relative">
              <svg className="absolute -top-6 -left-8 w-12 h-12 text-blue-300" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="4" strokeDasharray="10 10" />
              </svg>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 relative z-10">
                Tại sao chọn <span className="text-blue-600">Korea Link?</span>
              </h2>
            </div>
            
            <p className="text-slate-500 max-w-2xl mx-auto font-semibold text-lg mb-16 sm:mb-24">
              Hệ thống được thiết kế chuyên biệt để giúp bạn tối ưu hóa thời gian ôn tập và đạt điểm tối đa trong kỳ thi EPS-TOPIK.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  icon: <BookOpen className="w-10 h-10 text-blue-600" />,
                  title: "Đề Thi Chuẩn Xác",
                  desc: "Hàng ngàn câu hỏi được cập nhật liên tục bám sát cấu trúc thi thật, chia theo từng kỹ năng Nghe - Đọc.",
                  bg: "bg-blue-50",
                  color: "border-blue-100",
                  shadow: "hover:shadow-blue-500/20"
                },
                {
                  icon: <Bot className="w-10 h-10 text-purple-600" />,
                  title: "Trợ Lý AI 24/7",
                  desc: "Giải thích đáp án chi tiết, hướng dẫn mẹo làm bài như một gia sư riêng, giúp bạn hiểu sâu bản chất.",
                  bg: "bg-purple-50",
                  color: "border-purple-100",
                  shadow: "hover:shadow-purple-500/20"
                },
                {
                  icon: <BarChart3 className="w-10 h-10 text-emerald-600" />,
                  title: "Phân Tích Chuyên Sâu",
                  desc: "Biểu đồ theo dõi sự tiến bộ, tự động chỉ ra điểm yếu cần khắc phục ngay để cải thiện điểm số nhanh chóng.",
                  bg: "bg-emerald-50",
                  color: "border-emerald-100",
                  shadow: "hover:shadow-emerald-500/20"
                }
              ].map((f, i) => (
                <div key={i} className={`p-8 sm:p-10 rounded-[2.5rem] bg-white border-2 ${f.color} shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-2 ${f.shadow} group relative overflow-hidden`}>
                  {/* Card Background Decoration */}
                  <div className={`absolute top-0 right-0 w-32 h-32 ${f.bg} rounded-bl-full -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-125 duration-500`}></div>
                  
                  <div className={`w-20 h-20 rounded-2xl ${f.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform relative z-10 shadow-sm border border-white`}>
                    {f.icon}
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-4 text-left relative z-10">{f.title}</h3>
                  <p className="text-slate-500 font-semibold text-left leading-relaxed text-base relative z-10">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section className="py-24 sm:py-32 relative z-10 overflow-hidden bg-slate-50">
          {/* Decorative Squiggles */}
          <div className="absolute top-20 left-10 text-blue-300 opacity-60 hidden lg:block">
             <svg width="150" height="150" viewBox="0 0 100 100" fill="none">
              <path d="M10,90 Q30,10 50,50 T90,10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
             </svg>
          </div>
          <div className="absolute bottom-20 right-10 text-purple-300 opacity-60 hidden lg:block">
             <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="3" strokeDasharray="10 15" />
             </svg>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-8 text-center mb-16 sm:mb-24 relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Đầu tư nhỏ, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Thành quả lớn</span>
            </h2>
            <p className="text-slate-500 text-lg font-semibold max-w-2xl mx-auto leading-relaxed">
              Nhận ngay <span className="font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-lg text-sm mx-1 inline-flex items-center gap-1 shadow-sm"><Gem className="w-4 h-4"/> 3 LƯỢT THI MIỄN PHÍ</span> khi đăng ký tài khoản. <br className="hidden sm:block" />Chọn gói nâng cấp để tiếp tục ôn luyện cường độ cao.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 max-w-6xl mx-auto px-4 relative z-10">
            {/* Gói 10 lượt */}
            <div className="flex flex-col p-8 sm:p-10 rounded-[2.5rem] bg-white border border-slate-200 shadow-xl shadow-slate-200/50 transition-all hover:border-blue-300 hover:-translate-y-2 group">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Khởi động</h3>
              <p className="text-slate-500 font-medium text-sm mb-6">Phù hợp để làm quen với bài thi.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">99K</span>
                <span className="text-slate-500 font-bold text-base">VNĐ</span>
              </div>
              <div className="text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl inline-block mb-10 text-center w-max">10 lượt thi thử</div>
              
              <div className="flex flex-col gap-5 flex-1 mb-10">
                {["Chấm điểm tức thì", "Giải thích đáp án chi tiết", "Giao diện chuẩn thi thật"].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-base font-semibold text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Link href="/register" className="w-full mt-auto">
                <Button className="w-full h-14 rounded-2xl font-bold text-lg bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-all shadow-sm">Chọn gói này</Button>
              </Link>
            </div>

            {/* Gói 20 lượt */}
            <div className="flex flex-col p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-b from-blue-600 to-indigo-800 border border-blue-500 shadow-2xl shadow-blue-600/40 scale-100 lg:scale-110 z-10 relative text-white">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-black rounded-full uppercase tracking-widest shadow-xl flex items-center gap-1 border-2 border-white">
                <Star className="w-4 h-4 fill-current" /> Đề xuất
              </div>
              
              <h3 className="text-2xl font-bold text-blue-100 mb-2">Tăng tốc</h3>
              <p className="text-blue-200 font-medium text-sm mb-6">Dành cho giai đoạn luyện đề.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-6xl font-black text-white">189K</span>
                <span className="text-blue-200 font-bold text-base">VNĐ</span>
              </div>
              <div className="text-sm font-bold text-blue-900 bg-yellow-400 px-4 py-2 rounded-xl inline-block mb-10 text-center w-max shadow-inner shadow-yellow-200/50">20 lượt thi thử</div>
              
              <div className="flex flex-col gap-5 flex-1 mb-10">
                {["Tất cả quyền lợi gói Khởi động", "Phân tích điểm mạnh, yếu", "Thống kê thời gian làm bài", "Ưu tiên hỗ trợ kỹ thuật"].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-yellow-400" />
                    </div>
                    <span className="text-base font-semibold text-blue-50">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Link href="/register" className="w-full mt-auto">
                <Button className="w-full h-14 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black text-lg shadow-xl shadow-yellow-500/30 transition-all hover:-translate-y-1">Chọn gói này</Button>
              </Link>
            </div>

            {/* Gói 50 lượt */}
            <div className="flex flex-col p-8 sm:p-10 rounded-[2.5rem] bg-white border border-slate-200 shadow-xl shadow-slate-200/50 transition-all hover:border-emerald-300 hover:-translate-y-2 group">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Về đích</h3>
              <p className="text-slate-500 font-medium text-sm mb-6">Tối ưu chi phí để chinh phục.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">399K</span>
                <span className="text-slate-500 font-bold text-base">VNĐ</span>
              </div>
              <div className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl inline-block mb-10 text-center w-max">50 lượt thi thử</div>
              
              <div className="flex flex-col gap-5 flex-1 mb-10">
                {["Luyện tập thỏa thích", "Không lo hết lượt giữa chừng", "Tất cả quyền lợi gói Tăng tốc"].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-base font-semibold text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Link href="/register" className="w-full mt-auto">
                <Button className="w-full h-14 rounded-2xl font-bold text-lg bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition-all shadow-sm">Chọn gói này</Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-12 relative z-10 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/20 mb-6">
            K
          </div>
          <h2 className="font-black text-2xl text-slate-900 mb-8 tracking-tight">Korea Link</h2>
          
          <div className="w-full max-w-sm h-px bg-slate-200 mb-8"></div>
          
          <div className="text-center font-medium text-slate-500 text-sm max-w-md leading-relaxed">
            &copy; {new Date().getFullYear()} Korea Link. All rights reserved. <br/>Chúc các bạn thi tốt EPS-TOPIK và thành công tại Hàn Quốc!
          </div>
        </div>
      </footer>
    </div>
  );
}
