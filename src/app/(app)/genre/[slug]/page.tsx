import { tmdbFetch } from '@/lib/tmdb/server';
import { getPopularAnime } from '@/lib/anilist/client';
import { anilistToMediaItem } from '@/lib/anilist/client';
import type { Metadata } from 'next';
import AnimeThemedPage from '@/components/pages/AnimePage';
import CartoonThemedPage from '@/components/pages/CartoonPage';
import HorrorThemedPage from '@/components/pages/HorrorPage';
import RomanceThemedPage from '@/components/pages/RomancePage';
import MysteryThemedPage from '@/components/pages/MysteryPage';
import FantasyThemedPage from '@/components/pages/FantasyPage';
import type { MediaItem, TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';

interface GenreConfig {
  component: React.ComponentType<{ initialShows: MediaItem[] }>;
  genreId: number;
  mediaType: 'tv' | 'movie';
  extraParams?: Record<string, string>;
  source?: 'tmdb' | 'anilist';
}

const GENRE_MAP: Record<string, GenreConfig> = {
  anime:   { component: AnimeThemedPage,   genreId: 16,    mediaType: 'tv',   extraParams: { sort_by: 'popularity.desc' }, source: 'anilist' },
  cartoon: { component: CartoonThemedPage,  genreId: 16,    mediaType: 'tv',   extraParams: { sort_by: 'popularity.desc', vote_count_gte: '50', with_original_language: 'en' }, source: 'tmdb' },
  horror:  { component: HorrorThemedPage,   genreId: 27,    mediaType: 'movie', extraParams: { sort_by: 'popularity.desc', vote_count_gte: '50' }, source: 'tmdb' },
  romance: { component: RomanceThemedPage,  genreId: 10749, mediaType: 'movie', extraParams: { sort_by: 'popularity.desc', vote_count_gte: '50' }, source: 'tmdb' },
  mystery: { component: MysteryThemedPage,  genreId: 9648,  mediaType: 'movie', extraParams: { sort_by: 'popularity.desc', vote_count_gte: '50' }, source: 'tmdb' },
  fantasy: { component: FantasyThemedPage,  genreId: 14,    mediaType: 'movie', extraParams: { sort_by: 'popularity.desc', vote_count_gte: '50' }, source: 'tmdb' },
};

/* ── Anime title patterns to filter out of cartoon results ── */
const ANIME_TITLE_PATTERNS = [
  /\b(?:dragon\s*ball|naruto|one\s*piece|bleach|demon\s*slayer|attack\s*on\s*titan|jujutsu|my\s*hero\s*academia|spy\s*x\s*family|chainsaw\s*man|sword\s*art\s*online|death\s*note|fullmetal|hunter\s*x|hunter\s*x?|tokyo\s*revenger|tokyo\s*ghoul|mob\s*psycho|one\s*punch|cowboy\s*bebop|evangelion|pokemon|yugioh|digimon|sailor\s*moon|code\s*geass|gundam|jojo|naruto|bleach|fairy\s*tail|black\s*clover|mha|aot|ds)\b/i,
  /(?:刀語|鬼滅|進撃|呪術|僕のヒーロー|ワンパン|ドラゴンボール|ナルト|ワンピース|ブリーチ|ポケモン|ソードアート|ハンター)/,
  /\s(?:sub|dub|uncut)\b/i,
  /\(\d{4}\s*(?:TV|ONA|OVA|Movie)\)/,
];

function isLikelyAnime(title: string): boolean {
  return ANIME_TITLE_PATTERNS.some(p => p.test(title));
}

const GENRE_META: Record<string, { title: string; description: string }> = {
  anime:   { title: 'Anime', description: 'Discover popular and trending anime series. From action-packed shonen to heartwarming slice-of-life, explore the best anime curated for you.' },
  cartoon: { title: 'Cartoons', description: 'Explore classic and modern cartoon series. Laugh, adventure, and enjoy animated shows for all ages.' },
  horror:  { title: 'Horror', description: 'Face your darkest fears with the best horror movies. From psychological thrillers to supernatural terror, find your next scare.' },
  romance: { title: 'Romance', description: 'Feel every heartbeat with romantic movies. From passionate love stories to tender moments, discover the best romance films.' },
  mystery: { title: 'Mystery', description: 'Unravel the unknown with mystery and thriller movies. From detective stories to mind-bending puzzles, keep guessing.' },
  fantasy: { title: 'Fantasy', description: 'Beyond imagination awaits. Explore epic fantasy movies with magical worlds, mythical creatures, and legendary adventures.' },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = GENRE_META[slug];
  if (!meta) return { title: 'Genre Not Found' };
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: `${meta.title} | Lumina Stream`,
      description: meta.description,
    },
  };
}

export const revalidate = 600; // 10 min — genre lists are stable

async function fetchTmdbPages(
  mediaType: string,
  paramsMap: Record<string, string>,
  totalPages: number = 5,
): Promise<TMDBShow[]> {
  const allResults = await Promise.all(
    Array.from({ length: totalPages }, (_, i) =>
      tmdbFetch<{ results?: TMDBShow[] }>(
        `/discover/${mediaType}`,
        { ...paramsMap, page: String(i + 1) },
      ).catch(() => ({ results: [] }))
    )
  );

  // Deduplicate by ID
  const seen = new Set<number>();
  return allResults
    .flatMap(d => d.results || [])
    .filter(r => {
      if (!r.poster_path || seen.has(r.id)) return false;
      // Skip very low-quality entries (fewer than ~50 votes = obscure)
      if (r.vote_count !== undefined && r.vote_count < 50 && r.popularity < 5) return false;
      seen.add(r.id);
      return true;
    });
}

export default async function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = GENRE_MAP[slug];

  if (!config) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.2rem', color: 'rgba(255,245,232,.4)' }}>Genre not found</div>
      </div>
    );
  }

  let shows: MediaItem[] = [];

  // Anime uses AniList for complete anime coverage
  if (config.source === 'anilist') {
    try {
      // Fetch 3 pages (60 items) from AniList for rich content
      const [page1, page2, page3] = await Promise.all([
        getPopularAnime(1, 20).catch(() => ({ media: [], pageInfo: { hasNextPage: false } })),
        getPopularAnime(2, 20).catch(() => ({ media: [], pageInfo: { hasNextPage: false } })),
        getPopularAnime(3, 20).catch(() => ({ media: [], pageInfo: { hasNextPage: false } })),
      ]);
      const allMedia = [...page1.media, ...page2.media, ...page3.media];
      const seen = new Set<number>();
      shows = allMedia
        .filter(m => m.coverImage?.large && !seen.has(m.id))
        .map(m => { seen.add(m.id); return anilistToMediaItem(m); });
    } catch {
      // Fallback to TMDB if AniList fails
      try {
        const paramsMap: Record<string, string> = {
          with_genres: config.genreId.toString(),
          ...config.extraParams,
        };
        const results = await fetchTmdbPages(config.mediaType, paramsMap, 3);
        shows = results.slice(0, 60).map(r => tmdbToMedia({ ...r, media_type: config.mediaType }));
      } catch {
        shows = [];
      }
    }
  } else if (slug === 'cartoon') {
    // Cartoon: dual fetch — English animation + cartoon keyword — then filter anime
    try {
      const [englishResults, keywordResults] = await Promise.all([
        fetchTmdbPages(config.mediaType, {
          with_genres: config.genreId.toString(),
          ...config.extraParams,
        }, 4),
        // Fetch by "cartoon" keyword for titles tagged as cartoon specifically
        fetchTmdbPages(config.mediaType, {
          with_keywords: '210755', // TMDB keyword: "cartoon"
          sort_by: 'popularity.desc',
          vote_count_gte: '30',
        }, 2).catch(() => []),
      ]);

      // Merge and deduplicate
      const seen = new Set<number>();
      const merged: TMDBShow[] = [];
      for (const item of [...englishResults, ...keywordResults]) {
        if (seen.has(item.id)) continue;
        // Filter out titles that look like anime
        if (item.name && isLikelyAnime(item.name)) continue;
        if (item.title && isLikelyAnime(item.title)) continue;
        seen.add(item.id);
        merged.push(item);
      }
      shows = merged.map(r => tmdbToMedia({ ...r, media_type: config.mediaType }));
    } catch {
      shows = [];
    }
  } else {
    // All other genres use TMDB — fetch 3 pages (up to 60 items)
    try {
      const paramsMap: Record<string, string> = {
        with_genres: config.genreId.toString(),
        ...config.extraParams,
      };
      const results = await fetchTmdbPages(config.mediaType, paramsMap, 3);
      shows = results.map(r => tmdbToMedia({ ...r, media_type: config.mediaType }));
    } catch {
      shows = [];
    }
  }

  const Component = config.component;
  return <Component initialShows={shows} />;
}
