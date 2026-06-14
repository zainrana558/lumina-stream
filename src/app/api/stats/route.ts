import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedProfileId } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    // Rate limit: 15 req / 60s per IP
    const rl = await checkRateLimit(request, 'stats');
    if (!rl.success) {
      return NextResponse.json(
        { stats: null, error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ stats: null, error: "Not authenticated" });

    const profileId = await getVerifiedProfileId(user.id);
    if (!profileId) return NextResponse.json({ stats: null, error: "No active profile" });

    // Try Redis cache first (per-user stats, 5 min TTL)
    const cacheKey = `stats:${profileId}`;
    const cached = await getCached<{ stats: unknown }>('stats', cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          ...rateLimitHeaders(rl),
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch watch progress (with durations for hours calc)
    const { data: progressData } = await supabase
      .from("watch_progress")
      .select("media_id, media_type, title, poster_path, progress, duration, updated_at")
      .eq("profile_id", profileId)
      .gt("progress", 0);

    // Fetch watch history (for dates, streak, monthly breakdown) — limit 200
    const { data: historyData } = await supabase
      .from("watch_history")
      .select("media_id, media_type, title, poster_path, watched_at")
      .eq("profile_id", profileId)
      .order("watched_at", { ascending: false })
      .limit(200);

    // Fetch ratings (for favorite genre) — only needed columns
    const { data: ratingsData } = await supabase
      .from("ratings")
      .select("media_id, media_type, rating")
      .eq("profile_id", profileId);

    // Calculate total hours watched from progress durations
    const totalSeconds = (progressData || []).reduce((sum, p) => {
      // progress is 0-1 fraction, duration is total seconds of content
      // Only count watched seconds, not total duration
      return sum + ((p.progress || 0) * (p.duration || 0));
    }, 0);
    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

    // Unique titles
    const uniqueTitles = new Set([
      ...(progressData || []).map(p => `${p.media_type}-${p.media_id}`),
      ...(historyData || []).map(h => `${h.media_type}-${h.media_id}`),
    ]);

    // Monthly breakdown from history
    const monthlyData: Record<string, number> = {};
    (historyData || []).forEach(h => {
      const date = new Date(h.watched_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = (monthlyData[key] || 0) + 1;
    });

    // Recent watches (deduplicated)
    const watchedTitles = [
      ...(progressData || []).map(p => ({ title: p.title, poster_path: p.poster_path, media_id: p.media_id, media_type: p.media_type, updated_at: p.updated_at })),
      ...(historyData || []).map(h => ({ title: h.title, poster_path: h.poster_path, media_id: h.media_id, media_type: h.media_type, updated_at: h.watched_at })),
    ];

    // Streak calculation
    let streak = 0;
    if (historyData && historyData.length > 0) {
      const uniqueDays = new Set(
        historyData.map(h => new Date(h.watched_at).toISOString().split('T')[0])
      );
      const sortedDays = Array.from(uniqueDays).sort().reverse();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let checkDate = new Date(today);
      const latestDay = new Date(sortedDays[0]);
      const diffDays = Math.floor((today.getTime() - latestDay.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        streak = 1;
        checkDate = new Date(latestDay);
        for (let i = 1; i < sortedDays.length; i++) {
          const prevDay = new Date(checkDate);
          prevDay.setDate(prevDay.getDate() - 1);
          const prevDayStr = prevDay.toISOString().split('T')[0];
          if (sortedDays.includes(prevDayStr)) {
            streak++;
            checkDate = prevDay;
          } else {
            break;
          }
        }
      }
    }

    // Recent watches (deduplicated)
    const recentMap = new Map<string, typeof watchedTitles[0]>();
    watchedTitles.forEach(w => {
      const key = `${w.media_type}-${w.media_id}`;
      if (!recentMap.has(key)) recentMap.set(key, w);
    });
    const recentWatches = Array.from(recentMap.values())
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);

    // Average rating
    const avgRating = ratingsData && ratingsData.length > 0
      ? Math.round((ratingsData.reduce((s, r) => s + (r.rating || 0), 0) / ratingsData.length) * 10) / 10
      : 0;

    const stats = {
      totalHours,
      totalTitles: uniqueTitles.size,
      monthlyData,
      streak,
      recentWatches,
      avgRating,
      totalRatings: ratingsData?.length || 0,
      totalHistory: historyData?.length || 0,
    };

    const result = { stats };

    // Cache result in Redis (fire-and-forget)
    setCache('stats', cacheKey, result).catch(() => {});

    return NextResponse.json(result, {
      headers: {
        ...rateLimitHeaders(rl),
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ stats: null, error: message }, { status: 500 });
  }
}
