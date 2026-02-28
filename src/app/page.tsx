import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-primary">
          TOPIK IBT Platform
        </h1>
        <p className="max-w-[600px] text-lg text-muted-foreground">
          Nền tảng thi trắc nghiệm tiếng Hàn và luyện giao tiếp với AI dành cho học viên.
        </p>
        <div className="flex gap-4 items-center flex-col sm:flex-row mt-4">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto">
              Đăng nhập ngay
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Vào Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
