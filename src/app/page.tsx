import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Bot, CheckCircle, Sparkles, Star, Gem } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden relative selection:bg-primary/30">
      {/* Background Decorative Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] rounded-full bg-primary/10 blur-[80px] md:blur-[100px] opacity-70" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] md:w-[60vw] md:h-[60vw] rounded-full bg-blue-500/10 blur-[100px] md:blur-[120px] opacity-70" />
      </div>

      {/* Navbar Placeholder / Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 sm:py-4 sm:px-6 lg:px-12 w-full max-w-7xl mx-auto">
        <div className="font-bold text-lg sm:text-xl tracking-tight flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm sm:text-base">
            K
          </div>
          <span className="hidden sm:inline-block">Korea Link</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-medium hover:bg-primary/10 hover:text-primary px-3 sm:px-4 text-xs sm:text-sm">
              Đăng nhập
            </Button>
          </Link>
          <Link href="/register">
            <Button className="font-medium shadow-md shadow-primary/20 px-4 sm:px-6 text-xs sm:text-sm h-8 sm:h-10">
              Đăng ký
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex flex-col items-center pt-6 pb-12 px-4 sm:pt-16 sm:pb-20 sm:px-12 lg:px-24">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center max-w-4xl gap-4 sm:gap-6 mb-12 sm:mb-24 mt-2 sm:mt-8">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/5 text-primary text-[10px] sm:text-sm font-semibold mb-1 sm:mb-2 border border-primary/20 shadow-sm">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Nền tảng học tiếng Hàn thông minh</span>
          </div>
          
          <h1 className="text-[1.65rem] xs:text-[1.85rem] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-foreground/70 leading-[1.2] pb-1 sm:pb-2 whitespace-nowrap sm:whitespace-normal">
            THI THỬ EPS-TOPIK <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500 inline-block sm:mt-2">
              CÙNG KOREA LINK
            </span>
          </h1>
          
          <p className="max-w-2xl text-sm sm:text-lg md:text-xl text-muted-foreground mt-2 sm:mt-4 mb-4 sm:mb-8 leading-relaxed font-medium px-2 sm:px-0">
            Chinh phục kỳ thi tiếng Hàn với hệ thống trắc nghiệm chuyên sâu và trợ lý AI thông minh, giúp bạn tự tin giao tiếp và đạt điểm cao.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-6 sm:px-0">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-sm sm:text-base h-12 sm:h-14 px-6 sm:px-8 rounded-xl shadow-xl shadow-primary/25 group transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                Bắt đầu học ngay
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm sm:text-base h-12 sm:h-14 px-6 sm:px-8 rounded-xl backdrop-blur-sm bg-background/50 border-border/80 transition-all hover:bg-accent hover:text-accent-foreground font-semibold">
                Vào Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 max-w-6xl w-full relative px-2 sm:px-0">
          {[
            {
              icon: <BookOpen className="w-5 h-5 sm:w-8 sm:h-8 text-primary" />,
              title: "Thi thử sát thực tế",
              description: "Hệ thống ngân hàng câu hỏi chuẩn form EPS-TOPIK, cập nhật liên tục các đề thi sát nhất với thực tế.",
              bg: "bg-primary/5",
              border: "group-hover:border-primary/50",
            },
            {
              icon: <Bot className="w-5 h-5 sm:w-8 sm:h-8 text-blue-500" />,
              title: "Giao tiếp với AI",
              description: "Luyện nói và phản xạ tiếng Hàn với trợ lý ảo thông minh, sửa lỗi phát âm và ngữ pháp ngay lập tức.",
              bg: "bg-blue-500/5",
              border: "group-hover:border-blue-500/50",
            },
            {
              icon: <CheckCircle className="w-5 h-5 sm:w-8 sm:h-8 text-indigo-500" />,
              title: "Theo dõi tiến độ",
              description: "Phân tích điểm mạnh, điểm yếu qua từng bài thi để tối ưu lộ trình học tập và chinh phục điểm số cao nhất.",
              bg: "bg-indigo-500/5",
              border: "group-hover:border-indigo-500/50",
            },
          ].map((feature, i) => (
            <div 
              key={i} 
              className={`group flex flex-col gap-2 sm:gap-4 p-5 sm:p-8 rounded-2xl sm:rounded-[1.5rem] border border-border/40 bg-card/40 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${feature.border}`}
            >
              <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ${feature.bg} flex items-center justify-center shadow-inner mb-1 sm:mb-2`}>
                {feature.icon}
              </div>
              <h3 className="text-base sm:text-xl font-bold tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-medium text-xs sm:text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Pricing Section */}
        <div className="mt-16 sm:mt-32 w-full max-w-6xl flex flex-col items-center mb-6 sm:mb-10 px-2 sm:px-0">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-[1.75rem] sm:text-4xl md:text-5xl font-bold tracking-tight mb-2 sm:mb-4">
              Mua Lượt <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Làm Bài</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto font-medium px-4">
              Chọn gói phù hợp với nhu cầu luyện thi của bạn. <br className="hidden sm:block" />
              Mỗi tài khoản được tặng <span className="font-bold text-red-500">3 lượt miễn phí</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 sm:gap-y-12 md:gap-8 w-full max-w-5xl mx-auto">
            {/* Gói 10 lượt */}
            <div className="flex flex-col p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xl relative transition-all hover:border-border hover:shadow-lg">
              <h3 className="text-lg sm:text-2xl font-bold tracking-tight mb-1 sm:mb-2">Gói 10 lượt</h3>
              <p className="text-muted-foreground mb-3 sm:mb-4 text-[11px] sm:text-sm font-medium">Phù hợp để làm quen với cấu trúc bài thi.</p>
              
              <div className="mb-1 sm:mb-2 mt-1 sm:mt-2 flex items-baseline gap-1">
                <span className="text-3xl sm:text-5xl font-extrabold">99K</span>
                <span className="text-muted-foreground font-semibold text-xs sm:text-base">VNĐ</span>
              </div>
              <p className="text-muted-foreground mb-4 sm:mb-6 text-xs sm:text-sm font-semibold h-4 sm:h-6 text-primary">≈ 10k / lượt</p>
              
              <div className="flex flex-col gap-2.5 sm:gap-4 flex-1 mb-6 sm:mb-8">
                {[
                  "10 lượt làm bài thi thử",
                  "Chấm điểm & giải đáp án",
                  "Giao diện chuẩn thi thật",
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 sm:gap-3">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm font-semibold text-foreground/80">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Link href="/register" className="w-full mt-auto">
                <Button className="w-full rounded-xl h-10 sm:h-12 font-bold border-border/80 text-xs sm:text-base" variant="outline">Mua gói 10 lượt</Button>
              </Link>
            </div>

            {/* Gói 20 lượt */}
            <div className="flex flex-col p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-2 border-primary/50 bg-card/60 backdrop-blur-2xl relative shadow-2xl shadow-primary/10 scale-100 lg:scale-105 z-10 transition-all hover:border-primary mt-2 md:mt-0">
              <div className="absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2 px-3 py-1 sm:px-4 sm:py-1 bg-gradient-to-r from-primary to-blue-500 text-primary-foreground text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-widest shadow-md whitespace-nowrap flex items-center gap-1">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" /> Phổ biến nhất
              </div>
              <h3 className="text-lg sm:text-2xl font-bold tracking-tight mb-1 sm:mb-2 text-primary">Gói 20 lượt</h3>
              <p className="text-muted-foreground mb-3 sm:mb-4 text-[11px] sm:text-sm font-medium">Dành cho giai đoạn tăng tốc luyện thi.</p>
              
              <div className="mb-1 sm:mb-2 mt-1 sm:mt-2 flex items-baseline gap-1">
                <span className="text-3xl sm:text-5xl font-extrabold text-primary">189K</span>
                <span className="text-muted-foreground font-semibold text-xs sm:text-base">VNĐ</span>
              </div>
              <p className="text-muted-foreground mb-4 sm:mb-6 text-xs sm:text-sm font-semibold h-4 sm:h-6 text-primary">≈ 9k / lượt</p>
              
              <div className="flex flex-col gap-2.5 sm:gap-4 flex-1 mb-6 sm:mb-8">
                {[
                  "20 lượt làm bài thi thử",
                  "Chấm điểm & giải đáp án",
                  "Giao diện chuẩn thi thật",
                  "Phân tích điểm mạnh, yếu",
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 sm:gap-3">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm font-semibold text-foreground/90">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Link href="/register" className="w-full mt-auto">
                <Button className="w-full rounded-xl h-10 sm:h-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/25 text-xs sm:text-base">Mua gói 20 lượt</Button>
              </Link>
            </div>

            {/* Gói 50 lượt */}
            <div className="flex flex-col p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xl relative transition-all hover:border-border hover:shadow-lg mt-2 md:mt-0">
               <div className="absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2 px-3 py-1 sm:px-4 sm:py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-widest shadow-md whitespace-nowrap flex items-center gap-1">
                <Gem className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" /> Tiết kiệm nhất
              </div>
              <h3 className="text-lg sm:text-2xl font-bold tracking-tight mb-1 sm:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500">Gói 50 lượt</h3>
              <p className="text-muted-foreground mb-3 sm:mb-4 text-[11px] sm:text-sm font-medium">Lựa chọn tối ưu chi phí để chinh phục.</p>
              
              <div className="mb-1 sm:mb-2 mt-1 sm:mt-2 flex items-baseline gap-1">
                <span className="text-3xl sm:text-5xl font-extrabold text-teal-600">399K</span>
                <span className="text-muted-foreground font-semibold text-xs sm:text-base">VNĐ</span>
              </div>
              <p className="text-muted-foreground mb-4 sm:mb-6 text-xs sm:text-sm font-semibold h-4 sm:h-6 text-teal-600">≈ 8k / lượt</p>
              
              <div className="flex flex-col gap-2.5 sm:gap-4 flex-1 mb-6 sm:mb-8">
                {[
                  "50 lượt làm bài thi thử",
                  "Tất cả tính năng Gói 20",
                  "Luyện tập thỏa thích",
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 sm:gap-3">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm font-semibold text-foreground/80">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Link href="/register" className="w-full mt-auto">
                <Button className="w-full rounded-xl h-10 sm:h-12 font-bold hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-colors border-border/80 text-xs sm:text-base" variant="outline">Mua gói 50 lượt</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 sm:py-10 mt-4 sm:mt-12 relative z-10 border-t border-border/30 bg-background/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-[10px] sm:text-sm font-medium text-muted-foreground">
          &copy; {new Date().getFullYear()} Korea Link. All rights reserved. Chúc các bạn thi tốt EPS-TOPIK!
        </div>
      </footer>
    </div>
  );
}
