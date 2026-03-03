import { UserNav } from "@/components/shared/UserNav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, Mic, BrainCircuit, UserCircle, Sparkles, Wand2 } from "lucide-react"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"

export default async function MilestonesPage() {
    const supabase = await createClient()
    const { data: dbMilestones } = await supabase.from('milestones').select('*').eq('is_active', true).order('level', { ascending: true })

    const STYLE_PRESETS = [
        {
            icon: <Mic className="w-5 h-5 text-blue-500" />,
            color: "border-blue-200 bg-gradient-to-br from-white to-blue-50/50",
            buttonColor: "bg-blue-600 hover:bg-blue-700"
        },
        {
            icon: <BookOpen className="w-5 h-5 text-emerald-500" />,
            color: "border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50",
            buttonColor: "bg-emerald-600 hover:bg-emerald-700"
        },
        {
            icon: <UserCircle className="w-5 h-5 text-amber-500" />,
            color: "border-amber-200 bg-gradient-to-br from-white to-amber-50/50",
            buttonColor: "bg-amber-600 hover:bg-amber-700"
        },
        {
            icon: <BrainCircuit className="w-5 h-5 text-purple-500" />,
            color: "border-purple-200 bg-gradient-to-br from-white to-purple-50/50",
            buttonColor: "bg-purple-600 hover:bg-purple-700"
        }
    ]

    const milestones = dbMilestones || []

    return (
        <div className="min-h-screen bg-muted/20">
            <header className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <div className="font-bold text-xl text-primary flex items-center gap-2">
                    <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                        LUYỆN NÓI CÙNG KOREA LINK
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
                    {/* Thẻ Card Trợ Lý AI (VIP) */}
                    <Card className="col-span-1 sm:col-span-2 relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 border-amber-300 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 group cursor-pointer">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                        <div className="p-1 sm:p-2">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl shadow-inner border border-white/30 text-white">
                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <div className="text-xs font-bold tracking-[0.2em] text-white/90 uppercase bg-black/10 px-3 py-1 rounded-full backdrop-blur-sm">
                                        TÍNH NĂNG ĐỘC QUYỀN
                                    </div>
                                </div>
                                <CardTitle className="text-2xl sm:text-3xl font-black text-white drop-shadow-sm">Trợ Lý AI: Tạo Đoạn Giới Thiệu Bản Thân</CardTitle>
                                <CardDescription className="text-white/90 text-sm sm:text-base leading-relaxed mt-2 max-w-2xl font-medium">
                                    Không biết viết CV tiếng Hàn? KHÔNG SAO! Chỉ cần khai báo thông tin cơ bản bằng Tiếng Việt, AI Gemini sẽ tự động rập khuôn Ngữ Pháp theo Mốc Giáo Trình để đúc kết cho bạn một bản Introduce Yourself hoàn hảo cực sốc!
                                </CardDescription>
                            </CardHeader>
                            <CardFooter className="pt-4 pb-4">
                                <Button asChild className="bg-white text-amber-700 hover:bg-amber-50 shadow-lg hover:shadow-xl transition-all font-bold text-base h-12 px-8 rounded-full">
                                    <Link href="/milestones/intro-generator">
                                        Trải Nghiệm Ngay <Wand2 className="w-5 h-5 ml-2" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </div>
                    </Card>

                    {/* Connecting line for visual milestone progression */}
                    <div className="absolute left-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-blue-200 via-amber-200 to-purple-200 -translate-x-1/2 hidden sm:block rounded-full z-0 opacity-40"></div>

                    {milestones.length === 0 && (
                        <div className="col-span-2 text-center py-10 text-muted-foreground w-full">
                            Admin chưa thiết lập Mốc kiểm tra nào trong hệ thống, hoặc DB chưa được khởi tạo.
                        </div>
                    )}
                    {milestones.map((ms: any, index: number) => {
                        const style = STYLE_PRESETS[index % STYLE_PRESETS.length]
                        return (
                            <Card key={ms.id} className={`z-10 relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ${style.color}`}>
                                {/* Decorative number background */}
                                <div className="absolute -right-6 -bottom-8 text-black/[0.03] text-9xl font-black italic select-none pointer-events-none">
                                    {ms.level}
                                </div>

                                <CardHeader className="pb-3 relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-black/5">
                                            {style.icon}
                                        </div>
                                        <div className="text-xs font-bold tracking-[0.2em] text-muted-foreground/80 uppercase">
                                            Mốc Level {ms.level}
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl font-bold text-gray-800">{ms.title}</CardTitle>
                                    <CardDescription className="text-gray-600 leading-relaxed min-h-[40px]">
                                        {ms.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="pt-5 relative">
                                    <Button asChild className={`w-full text-white shadow-sm flex items-center justify-between group h-11 text-base ${style.buttonColor}`}>
                                        <Link href={`/milestones/${ms.level}`}>
                                            Bắt đầu Kiểm tra
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </main>
        </div>
    )
}
