import AdaptiveLearningModule from '@/components/adaptive-learning/AdaptiveLearningModule';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserNav } from "@/components/shared/UserNav"

export const metadata = {
  title: 'Gợi ý luyện tập cá nhân | TOPIK',
  description: 'Gợi ý luyện tập cá nhân dựa trên kết quả bài thi',
};

export default function AdaptiveLearningPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
          </Link>
          <h1 className="font-bold text-xl text-primary">Gợi ý luyện tập cá nhân</h1>
        </div>
        <UserNav />
      </header>

      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <AdaptiveLearningModule />
        </div>
      </main>
    </div>
  );
}
