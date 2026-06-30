"use client";

import React, { useState } from 'react';
import { BrainCircuit, Play, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AISyncPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [processed, setProcessed] = useState(0);
    const [logs, setLogs] = useState<{ id: string, status: string, error?: string }[]>([]);
    const [isFinished, setIsFinished] = useState(false);

    const startSync = async () => {
        setIsRunning(true);
        setIsFinished(false);
        setProcessed(0);
        setLogs([]);

        let keepRunning = true;
        let totalProcessed = 0;

        toast.info("Bắt đầu tiến trình đồng bộ AI...");

        while (keepRunning) {
            try {
                // Tự động nghỉ 4 giây trước mỗi lần gọi API để tránh lỗi Rate Limit của Gemini
                await new Promise(resolve => setTimeout(resolve, 4000));

                const res = await fetch('/api/admin/ai-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batchSize: 2 }) // Xử lý 2 câu mỗi lần gọi để an toàn
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Lỗi khi gọi API AI Sync");
                }

                if (data.processed === 0) {
                    // Đã xử lý hết
                    keepRunning = false;
                    setIsFinished(true);
                    toast.success("Tuyệt vời! Tất cả câu hỏi đã được đồng bộ AI.");
                    break;
                }

                totalProcessed += data.processed;
                setProcessed(totalProcessed);
                setLogs(prev => [...prev, ...data.results]);

            } catch (err: any) {
                keepRunning = false;
                toast.error(`Đồng bộ bị dừng do lỗi: ${err.message}`);
                console.error(err);
            }
        }

        setIsRunning(false);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-800">
                    <BrainCircuit className="w-8 h-8 text-blue-600" />
                    Đồng bộ Trí Tuệ Nhân Tạo (AI)
                </h1>
                <p className="text-gray-500 mt-2">
                    Công cụ này sẽ tự động dịch nghĩa câu hỏi, trích xuất từ vựng và ngữ pháp cho toàn bộ câu hỏi trong hệ thống chưa có dữ liệu AI. Dữ liệu sẽ được lưu thẳng vào Database để sử dụng ngay lập tức cho Gợi ý Luyện tập.
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg text-gray-900">Trạng thái đồng bộ</h3>
                        <p className="text-sm text-gray-500">
                            {isRunning ? "Hệ thống đang gọi API Gemini..." : 
                             isFinished ? "Hoàn thành! Bạn có thể dừng tại đây." : 
                             "Sẵn sàng bắt đầu quá trình đồng bộ hàng loạt."}
                        </p>
                    </div>

                    <button
                        onClick={startSync}
                        disabled={isRunning}
                        className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all
                            ${isRunning ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
                    >
                        {isRunning ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Đang chạy...</>
                        ) : (
                            <><Play className="w-5 h-5 fill-current" /> Bắt đầu đồng bộ</>
                        )}
                    </button>
                </div>

                <div className="mt-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700">Tiến trình hiện tại</span>
                        <span className="text-sm font-bold text-blue-600">Đã xử lý: {processed} câu</span>
                    </div>
                    
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full bg-blue-500 rounded-full transition-all duration-500 ${isRunning ? 'animate-pulse' : ''}`}
                            style={{ width: isRunning ? '100%' : (isFinished ? '100%' : '0%') }}
                        />
                    </div>
                </div>
            </div>

            {logs.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="font-bold text-sm text-gray-700 mb-3">Nhật ký xử lý (Logs)</h4>
                    <div className="h-64 overflow-y-auto space-y-2 pr-2">
                        {logs.map((log, i) => (
                            <div key={i} className="text-sm flex items-start gap-2 bg-white p-2 rounded border border-gray-100">
                                {log.status === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                )}
                                <div>
                                    <span className="font-medium">Câu hỏi ID: {log.id}</span>
                                    {log.error && <p className="text-red-500 text-xs mt-1">{log.error}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
