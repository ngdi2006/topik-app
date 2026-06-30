import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const adminClient = createAdminClient();

        // 1. Fetch user stats
        const { data: userAttempts } = await adminClient
            .from('exam_attempts')
            .select('score, started_at, completed_at, status')
            .eq('user_id', user.id)
            .eq('status', 'completed');

        const examsTaken = userAttempts?.length || 0;
        const avgScore = examsTaken > 0 ? Math.round(userAttempts!.reduce((acc, curr) => acc + (curr.score || 0), 0) / examsTaken) : 0;
        const streak = 5; // Có thể làm tính toán streak phức tạp hơn ở đây
        const vocabLearned = 350; // Mock data

        const stats = { examsTaken, avgScore, streak, vocabLearned };

        // 2. Fetch Leaderboard
        const { data: allAttempts } = await adminClient
            .from('exam_attempts')
            .select('user_id, score, started_at, completed_at')
            .eq('status', 'completed')
            .order('score', { ascending: false });

        const userBestScores = new Map();
        if (allAttempts) {
            allAttempts.forEach(attempt => {
                const duration = new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime();
                const durationMinutes = Math.max(1, Math.round(duration / 60000));
                
                if (!userBestScores.has(attempt.user_id) || userBestScores.get(attempt.user_id).score < attempt.score) {
                    userBestScores.set(attempt.user_id, {
                        user_id: attempt.user_id,
                        score: attempt.score,
                        time: `${durationMinutes} phút`
                    });
                }
            });
        }

        const sortedUsers = Array.from(userBestScores.values())
            .sort((a, b) => b.score - a.score);

        const top5 = sortedUsers.slice(0, 5);
        let currentUserRank = sortedUsers.findIndex(u => u.user_id === user.id) + 1;
        const currentUserData = sortedUsers.find(u => u.user_id === user.id);

        const userIdsToFetch = top5.map(u => u.user_id);
        const { data: profiles } = await adminClient
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIdsToFetch);

        const leaderboard = top5.map((entry, index) => {
            const profile = profiles?.find(p => p.id === entry.user_id);
            let name = profile?.full_name || 'Thí sinh';
            
            // Mask name (Nguyễn Văn A -> Nguyễn Văn A*)
            if (name.length > 2) {
                const parts = name.split(' ');
                if (parts.length > 1) {
                    const lastName = parts[parts.length - 1];
                    name = parts.slice(0, -1).join(' ') + ' ' + lastName.charAt(0) + '*';
                } else {
                    name = name.substring(0, name.length - 1) + '*';
                }
            }

            return {
                rank: index + 1,
                name: name,
                score: entry.score,
                time: entry.time,
                avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                stats,
                leaderboard,
                currentUser: {
                    rank: currentUserRank || null,
                    score: currentUserData?.score || 0,
                    time: currentUserData?.time || '0 phút'
                }
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
