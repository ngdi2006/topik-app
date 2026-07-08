import React, { useState } from 'react';
import { Trophy } from 'lucide-react';

interface LeaderboardUser {
    rank: number;
    name: string;
    score: number;
    time: string;
    avatar: string;
}

interface LeaderboardProps {
    leaderboard: LeaderboardUser[];
    currentUserRank: { rank: number | string; score: number; time: string } | null;
}

export function Leaderboard({ leaderboard, currentUserRank }: LeaderboardProps) {
    const [activeTab, setActiveTab] = useState<'tuan-nay' | 'thang-nay'>('tuan-nay');

    const top1 = leaderboard.find(u => u.rank === 1);
    const top2 = leaderboard.find(u => u.rank === 2);
    const top3 = leaderboard.find(u => u.rank === 3);
    const rest = leaderboard.filter(u => u.rank > 3);

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                    <Trophy className="w-6 h-6 text-[#2B64CE]" />
                    Bảng Xếp Hạng
                </h1>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-full">
                    <button 
                        onClick={() => setActiveTab('tuan-nay')}
                        className={`py-2 px-6 text-sm font-semibold rounded-full transition-all ${activeTab === 'tuan-nay' ? 'bg-[#2B64CE] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
                    >
                        Tuần này
                    </button>
                    <button 
                        onClick={() => setActiveTab('thang-nay')}
                        className={`py-2 px-6 text-sm font-medium rounded-full transition-all ${activeTab === 'thang-nay' ? 'bg-[#2B64CE] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
                    >
                        Tháng này
                    </button>
                </div>
            </div>

            {/* Podium (Top 3) */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 items-end mt-4 md:mt-8 px-2 md:px-12">
                {/* Top 2 */}
                <div className="order-1 flex flex-col items-center">
                    {top2 && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full pt-6 pb-4 px-2 md:px-4 flex flex-col items-center gap-3 relative transform hover:-translate-y-1 transition-transform">
                            <div className="absolute -top-4 bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm border border-gray-300">
                                2
                            </div>
                            <img src={top2.avatar} alt="avatar" className="w-16 h-16 rounded-full bg-blue-50 border-4 border-gray-100" />
                            <div className="text-center w-full min-w-0">
                                <p className="text-sm md:text-base font-bold text-gray-900 truncate">{top2.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{top2.time}</p>
                            </div>
                            <div className="mt-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 w-full">
                                <p className="text-sm font-bold text-[#2B64CE] text-center">{top2.score}đ</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Top 1 */}
                <div className="order-2 flex flex-col items-center">
                    {top1 && (
                        <div className="bg-white rounded-2xl border-2 border-yellow-300 shadow-md w-full pt-8 pb-5 px-2 md:px-4 flex flex-col items-center gap-3 relative transform hover:-translate-y-1 transition-transform z-10 scale-105">
                            <div className="absolute -top-7 text-4xl drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] hover:scale-125 hover:-rotate-12 transition-all duration-300 z-20 cursor-default" title="Hạng 1">👑</div>
                            <img src={top1.avatar} alt="avatar" className="w-20 h-20 rounded-full bg-blue-50 border-4 border-yellow-100" />
                            <div className="text-center w-full min-w-0">
                                <p className="text-base md:text-lg font-bold text-gray-900 truncate">{top1.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{top1.time}</p>
                            </div>
                            <div className="mt-1 bg-yellow-50 px-4 py-1.5 rounded-full border border-yellow-200 w-full">
                                <p className="text-base font-bold text-yellow-700 text-center">{top1.score}đ</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Top 3 */}
                <div className="order-3 flex flex-col items-center">
                    {top3 && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full pt-6 pb-4 px-2 md:px-4 flex flex-col items-center gap-3 relative transform hover:-translate-y-1 transition-transform">
                            <div className="absolute -top-4 bg-orange-100 text-orange-700 w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm border border-orange-200">
                                3
                            </div>
                            <img src={top3.avatar} alt="avatar" className="w-16 h-16 rounded-full bg-blue-50 border-4 border-gray-100" />
                            <div className="text-center w-full min-w-0">
                                <p className="text-sm md:text-base font-bold text-gray-900 truncate">{top3.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{top3.time}</p>
                            </div>
                            <div className="mt-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 w-full">
                                <p className="text-sm font-bold text-[#2B64CE] text-center">{top3.score}đ</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* List (Rank 4+) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col mt-4 md:mt-8">
                <div className="p-0">
                    <ul className="divide-y divide-gray-50">
                        {rest.map((user) => (
                            <li key={user.rank} className="flex items-center gap-4 p-4 md:px-6 hover:bg-gray-50 transition-colors">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-gray-50 text-gray-500 border border-gray-100">
                                    {user.rank}
                                </div>
                                <img src={user.avatar} alt="avatar" className="w-12 h-12 rounded-full bg-blue-50 shrink-0 border border-gray-100" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-gray-900 truncate">{user.name}</p>
                                    <p className="text-sm text-gray-500">{user.time}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-base font-bold text-[#2B64CE]">{user.score}đ</p>
                                </div>
                            </li>
                        ))}
                        {rest.length === 0 && (
                            <li className="p-8 text-center text-gray-500">
                                Chưa có dữ liệu
                            </li>
                        )}
                    </ul>
                </div>

                {/* Current User Stats Footer */}
                {currentUserRank && (
                    <div className="p-4 md:px-6 bg-gray-50 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#2B64CE] flex items-center justify-center font-bold text-sm shrink-0">
                                {currentUserRank.rank || '-'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">Vị trí của bạn</p>
                                <p className="text-xs text-gray-500">{currentUserRank.score || 0} điểm • {currentUserRank.time || '0 phút'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
