import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const adminClient = createAdminClient();

        // User statistics and leaderboard source are independent after auth.
        const [{ data: userAttempts }, { data: allAttempts }] = await Promise.all([
            adminClient
                .from('exam_attempts')
                .select('score, started_at, completed_at')
                .eq('user_id', user.id)
                .eq('status', 'completed'),
            adminClient
                .from('exam_attempts')
                .select('user_id, score, started_at, completed_at')
                .eq('status', 'completed')
                .order('score', { ascending: false }),
        ]);

        const examsTaken = userAttempts?.length || 0;
        const avgScore = examsTaken > 0 ? Math.round(userAttempts!.reduce((acc, curr) => acc + (curr.score || 0), 0) / examsTaken) : 0;
        const streak = 5; // Có thể làm tính toán streak phức tạp hơn ở đây
        const vocabLearned = 350; // Mock data

        const stats = { examsTaken, avgScore, streak, vocabLearned };

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

        const top20 = sortedUsers.slice(0, 20);
        const currentUserRank = sortedUsers.findIndex(u => u.user_id === user.id) + 1;
        const currentUserData = sortedUsers.find(u => u.user_id === user.id);

        const userIdsToFetch = top20.map(u => u.user_id);
        const { data: profiles } = await adminClient
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIdsToFetch);

        const profilesById = new Map((profiles || []).map(profile => [profile.id, profile]));
        const leaderboard = top20.map((entry, index) => {
            const profile = profilesById.get(entry.user_id);
            const name = profile?.full_name || 'Thí sinh';

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

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unable to load dashboard statistics';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
