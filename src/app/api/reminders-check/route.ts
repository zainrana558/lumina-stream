import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { tmdbFetch } from '@/lib/tmdb/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getCached, setCache } from '@/lib/cache';

interface ReminderItem {
  mediaId: number;
  mediaType: string;
  title: string;
  releaseDate?: string;
  addedAt: number;
}

interface NewEpisodeAlert {
  mediaId: number;
  mediaType: string;
  title: string;
  nextEpisode?: {
    seasonNumber: number;
    episodeNumber: number;
    episodeName: string;
    airDate: string;
  } | null;
  lastCheck: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 req / 60s (reminder check is expensive — multiple TMDB calls)
    const rl = await checkRateLimit(request, 'stats');
    if (!rl.success) {
      return NextResponse.json(
        { alerts: [], error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // Require auth — reminder check queries TMDB on behalf of the user
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ alerts: [], checkedAt: new Date().toISOString(), error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const reminders: ReminderItem[] = body.reminders || [];
    const lastCheckTime: string = body.lastCheck || new Date(0).toISOString();

    // Build a cache key from reminder IDs + lastCheck
    const reminderIds = reminders.map(r => `${r.mediaType}-${r.mediaId}`).sort().join(',');
    const cacheKey = `check:${reminderIds}:${lastCheckTime}`;

    // Try Redis cache (10 min TTL)
    const cached = await getCached<{ alerts: NewEpisodeAlert[] }>('reminders', cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        checkedAt: new Date().toISOString(),
        totalReminders: reminders.length,
        tvRemindersChecked: reminders.filter(r => r.mediaType === 'tv').length,
      }, {
        headers: {
          ...rateLimitHeaders(rl),
          'X-Cache': 'HIT',
        },
      });
    }

    const alerts: NewEpisodeAlert[] = [];

    // Filter TV shows only (movies don't get new episodes)
    const tvReminders = reminders.filter(r => r.mediaType === 'tv');

    // Process reminders in parallel (max 5 at a time to avoid rate limiting)
    const BATCH_SIZE = 5;
    for (let i = 0; i < tvReminders.length; i += BATCH_SIZE) {
      const batch = tvReminders.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (reminder) => {
          try {
            // Fetch TV show details with next_episode_to_air
            const data = await tmdbFetch<{
              next_episode_to_air?: {
                id: number;
                episode_number: number;
                name: string;
                air_date: string;
                season_number: number;
                overview: string;
                vote_average: number;
              } | null;
              status?: string;
              name?: string;
            }>(`/tv/${reminder.mediaId}`, {
              append_to_response: 'next_episode_to_air',
            });

            const nextEp = data.next_episode_to_air;

            // Check if there's a new episode since last check
            if (nextEp && nextEp.air_date && nextEp.air_date > lastCheckTime) {
              return {
                mediaId: reminder.mediaId,
                mediaType: reminder.mediaType,
                title: data.name || reminder.title,
                nextEpisode: {
                  seasonNumber: nextEp.season_number,
                  episodeNumber: nextEp.episode_number,
                  episodeName: nextEp.name,
                  airDate: nextEp.air_date,
                },
                lastCheck: new Date().toISOString(),
              } as NewEpisodeAlert;
            }

            // Also check if the show was "Returning Series" and now ended
            if (!nextEp && data.status === 'Ended') {
              return {
                mediaId: reminder.mediaId,
                mediaType: reminder.mediaType,
                title: data.name || reminder.title,
                nextEpisode: null,
                lastCheck: new Date().toISOString(),
              } as NewEpisodeAlert;
            }

            return null;
          } catch {
            return null;
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          alerts.push(result.value);
        }
      }
    }

    const result = { alerts };

    // Cache in Redis (fire-and-forget)
    setCache('reminders', cacheKey, result).catch(() => {});

    return NextResponse.json({
      alerts,
      checkedAt: new Date().toISOString(),
      totalReminders: reminders.length,
      tvRemindersChecked: tvReminders.length,
    }, {
      headers: {
        ...rateLimitHeaders(rl),
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[reminders-check] Error:', error);
    return NextResponse.json(
      { alerts: [], checkedAt: new Date().toISOString(), error: 'Failed to check reminders' },
      { status: 500 }
    );
  }
}
