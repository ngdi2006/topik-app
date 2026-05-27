import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Bot, CheckCircle, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden relative selection:bg-primary/30">
      {/* Background Decorative Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/10 blur-[100px] opacity-70" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/10 blur-[120px] opacity-70" />
      </div>

      {/* Navbar Placeholder / Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12 w-full max-w-7xl mx-auto">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black">
            K
          </div>
          <span>Korea Link</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="hidden sm:inline-flex font-medium hover:bg-primary/10 hover:text-primary">
              Đăng nhập
            </Button>
          </Link>
          <Link href="/register">
            <Button className="font-medium shadow-md shadow-primary/20">
              Đăng ký
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex flex-col items-center pt-16 pb-20 px-6 sm:px-12 lg:px-24">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center max-w-4xl gap-6 mb-24 mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 text-primary text-sm font-semibold mb-2 border border-primary/20 shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>Nền tảng học tiếng Hàn thông minh</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-foreground/70 leading-[1.1] pb-2">
            THI THỬ EPS-TOPIK <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
              CÙNG KOREA LINK
            </span>
          </h1>
          
          <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mt-4 mb-8 leading-relaxed font-medium">
            Chinh phục kỳ thi tiếng Hàn với hệ thống trắc nghiệm chuyên sâu và trợ lý AI thông minh, giúp bạn tự tin giao tiếp và đạt điểm cao.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-xl shadow-xl shadow-primary/25 group transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                Bắt đầu học ngay
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-14 px-8 rounded-xl backdrop-blur-sm bg-background/50 border-border/80 transition-all hover:bg-accent hover:text-accent-foreground font-semibold">
                Vào Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full relative">
          {[
            {
              icon: <BookOpen className="w-8 h-8 text-primary" />,
              title: "Thi thử sát thực tế",
              description: "Hệ thống ngân hàng câu hỏi chuẩn form EPS-TOPIK, cập nhật liên tục các đề thi sát nhất với thực tế.",
              bg: "bg-primary/5",
              border: "group-hover:border-primary/50",
            },
            {
              icon: <Bot className="w-8 h-8 text-blue-500" />,
              title: "Giao tiếp với AI",
              description: "Luyện nói và phản xạ tiếng Hàn với trợ lý ảo thông minh, sửa lỗi phát âm và ngữ pháp ngay lập tức.",
              bg: "bg-blue-500/5",
              border: "group-hover:border-blue-500/50",
            },
            {
              icon: <CheckCircle className="w-8 h-8 text-indigo-500" />,
              title: "Theo dõi tiến độ",
              description: "Phân tích điểm mạnh, điểm yếu qua từng bài thi để tối ưu lộ trình học tập và chinh phục điểm số cao nhất.",
              bg: "bg-indigo-500/5",
              border: "group-hover:border-indigo-500/50",
            },
          ].map((feature, i) => (
            <div 
              key={i} 
              className={`group flex flex-col gap-4 p-8 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${feature.border}`}
            >
              <div className={`w-16 h-16 rounded-2xl ${feature.bg} flex items-center justify-center shadow-inner mb-2`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-medium">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="w-full py-8 mt-12 relative z-10 border-t border-border/30 bg-background/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm font-medium text-muted-foreground">
          &copy; {new Date().getFullYear()} Korea Link. All rights reserved. Chúc các bạn thi tốt EPS-TOPIK!
        </div>
      </footer>
    </div>
  );
}
