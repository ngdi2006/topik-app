import { UserNav } from "@/components/shared/UserNav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, Mic, BrainCircuit, UserCircle } from "lucide-react"
import Link from "next/link"

export default function MilestonesPage() {
    const milestones = [
        {
            id: 1,
            title: "Mốc 1: Nhập môn",
            description: "Kiểm tra phát âm cơ bản, từ có biến âm phổ biến và phản xạ chào hỏi.",
            icon: <Mic className="w-5 h-5 text-blue-500" />,
            color: "border-blue-200 bg-gradient-to-br from-white to-blue-50/50",
            buttonColor: "bg-blue-600 hover:bg-blue-700"
        },
        {
            id: 2,
            title: "Mốc 2: Sau Bài 8",
            description: "Kiểm tra đọc hiểu đoạn văn ngắn và phản xạ vấn đáp tình huống.",
            icon: <BookOpen className="w-5 h-5 text-emerald-500" />,
            color: "border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50",
            buttonColor: "bg-emerald-600 hover:bg-emerald-700"
        },
        {
            id: 3,
            title: "Mốc 3: Sau Bài 20",
            description: "Tích hợp AI tạo Form Giới thiệu bản thân chi tiết, đọc diễn cảm và Vấn đáp mở rộng.",
            icon: <UserCircle className="w-5 h-5 text-amber-500" />,
            color: "border-amber-200 bg-gradient-to-br from-white to-amber-50/50",
            buttonColor: "bg-amber-600 hover:bg-amber-700"
        },
        {
            id: 4,
            title: "Mốc 4: Sau Bài 30",
            description: "Đánh giá toàn diện kỹ năng Trung cấp, đọc đoạn văn dài và Vấn đáp phản xạ thực tế.",
            icon: <BrainCircuit className="w-5 h-5 text-purple-500" />,
            color: "border-purple-200 bg-gradient-to-br from-white to-purple-50/50",
            buttonColor: "bg-purple-600 hover:bg-purple-700"
        }
    ]

    return (
        <div className="min-h-screen bg-muted/20">
            <header className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <div className="font-bold text-xl text-primary flex items-center gap-2">
                    <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                        TOPIK IBT
                    </Link>
                    <span className="text-muted-foreground font-normal text-sm">/</span>
                    <span>Đánh giá Mốc Tiến Độ</span>
                </div>
                <div className="flex items-center gap-4">
                    <UserNav />
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 md:p-12">
                <div className="mb-12 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-4">
                        Kiểm Tra Năng Lực Theo Mốc 🎯
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Hệ thống Giáo viên AI sẽ lắng nghe, phân tích phát âm và chấm điểm hội thoại của bạn theo sát quá trình học. Hãy chọn cột mốc bạn vừa vượt qua để bắt đầu!
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 relative">
                    {/* Connecting line for visual milestone progression */}
                    <div className="absolute left-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-blue-200 via-amber-200 to-purple-200 -translate-x-1/2 hidden sm:block rounded-full z-0 opacity-40"></div>

                    {milestones.map((ms, index) => (
                        <Card key={ms.id} className={`z-10 relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ${ms.color}`}>
                            {/* Decorative number background */}
                            <div className="absolute -right-6 -bottom-8 text-black/[0.03] text-9xl font-black italic select-none pointer-events-none">
                                {index + 1}
                            </div>

                            <CardHeader className="pb-3 relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-black/5">
                                        {ms.icon}
                                    </div>
                                    <div className="text-xs font-bold tracking-[0.2em] text-muted-foreground/80 uppercase">
                                        Giai đoạn {index + 1}
                                    </div>
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-800">{ms.title}</CardTitle>
                                <CardDescription className="text-gray-600 leading-relaxed min-h-[40px]">
                                    {ms.description}
                                </CardDescription>
                            </CardHeader>
                            <CardFooter className="pt-5 relative">
                                <Button asChild className={`w-full text-white shadow-sm flex items-center justify-between group h-11 text-base ${ms.buttonColor}`}>
                                    <Link href={`/milestones/${ms.id}`}>
                                        Bắt đầu Kiểm tra
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    )
}
