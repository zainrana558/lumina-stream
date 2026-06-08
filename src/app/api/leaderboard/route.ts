import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/cache";

interface LeaderboardEntry {
  media_id: number;
  media_type: string;
  avg_rating: number;
  rating_count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limit: 30 req / 60s per IP
    const rl = await checkRateLimit(request, 'leaderboard');
    if (!rl.success) {
      return NextResponse.json(
        { entries: [], error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // Try Redis cache first (global leaderboard, 30 min TTL)
    const cached = await getCached<{ entries: LeaderboardEntry[]; totalRatings: number; uniqueTitles: number }>('leaderboard', 'global');
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          ...rateLimitHeaders(rl),
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
          'X-Cache': 'HIT',
        },
      });
    }

    const supabase = await createClient();

    const { data: ratingsData, error } = await supabase
      .from("ratings")
      .select("media_id, media_type, rating");

    if (error || !ratingsData || ratingsData.length === 0) {
      return NextResponse.json({ entries: [], totalRatings: 0, uniqueTitles: 0 });
    }

    const groupMap: Record<string, { sum: number; count: number }> = {};
    for (const r of ratingsData) {
      const key = `${r.media_type}-${r.media_id}`;
      if (!groupMap[key]) groupMap[key] = { sum: 0, count: 0 };
      groupMap[key].sum += r.rating || 0;
      groupMap[key].count += 1;
    }

    const entries: LeaderboardEntry[] = Object.entries(groupMap)
      .map(([key, data]) => {
        const [media_type, media_idStr] = key.split("-");
        return {
          media_id: parseInt(media_idStr),
          media_type,
          avg_rating: Math.round((data.sum / data.count) * 10) / 10,
          rating_count: data.count,
        };
      })
      .filter(e => e.rating_count >= 1)
      .sort((a, b) => {
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.rating_count - a.rating_count;
      })
      .slice(0, 50);

    const result = {
      entries,
      totalRatings: ratingsData.length,
      uniqueTitles: entries.length,
    };

    // Cache in Redis (fire-and-forget)
    setCache('leaderboard', 'global', result).catch(() => {});

    return NextResponse.json(result, {
      headers: {
        ...rateLimitHeaders(rl),
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ entries: [], error: message }, { status: 500 });
  }
}
