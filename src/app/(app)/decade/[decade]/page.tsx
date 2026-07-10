import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';
import { notFound } from 'next/navigation';

export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;

const VALID_DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s'] as const;
type Decade = (typeof VALID_DECADES)[number];

const DECADE_META: Record<Decade, { startYear: number; endYear: number; title: string; description: string }> = {
  '2020s': {
    startYear: 2020, endYear: 2029,
    title: '2020s Movies & TV Shows',
    description: 'Explore the best movies and TV shows from the 2020s. From pandemic-era streaming hits to blockbuster franchise films and the rise of limited series, discover the defining content of the current decade. This period saw an explosion of streaming-first releases, the consolidation of the Marvel and Star Wars universes, and a new wave of international content reaching global audiences through platforms like Netflix and Disney+. Browse our curated selection of the decade\'s most popular and highest-rated titles, updated regularly from TMDB.',
  },
  '2010s': {
    startYear: 2010, endYear: 2019,
    title: '2010s Movies & TV Shows',
    description: 'Relive the golden age of streaming. The 2010s brought us the Marvel Cinematic Universe at its peak, the prestige TV revolution with shows like Breaking Bad and Game of Thrones, groundbreaking animation from studios like Pixar and Studio Ghibli, and the birth of binge-watching culture. Netflix transitioned from DVD mailer to global entertainment giant, and platforms like Hulu, Amazon Prime, and later Disney+ transformed how audiences consumed television. This page collects the most beloved and critically acclaimed titles from that transformative decade.',
  },
  '2000s': {
    startYear: 2000, endYear: 2009,
    title: '2000s Movies & TV Shows',
    description: 'Rediscover the iconic content of the 2000s. From the Lord of the Rings trilogy and early superhero films like Christopher Nolan\'s Batman Begins to the reality TV boom and the dawn of digital streaming with Netflix\'s first original series. The 2000s gave us cultural touchstones like The Dark Knight, Lost, The Office, and the rise of J.J. Abrams as a Hollywood powerhouse. Browse our selection of the most popular and top-rated titles from this pivotal decade in entertainment history.',
  },
  '1990s': {
    startYear: 1990, endYear: 1999,
    title: '1990s Movies & TV Shows',
    description: 'Travel back to the 1990s. Experience the era of Tarantino, the Disney Renaissance with films like The Lion King and Beauty and the Beast, the birth of The Simpsons as a cultural phenomenon, and indie film breakthroughs from directors like P.T. Anderson and David Fincher. The decade also saw the rise of must-see TV with Friends, Seinfeld, and The X-Files, while anime began its global crossover with Ghost in the Shell and Pokemon. Explore the titles that defined a generation.',
  },
  '1980s': {
    startYear: 1980, endYear: 1989,
    title: '1980s Movies & TV Shows',
    description: 'Explore the iconic 1980s. From John Hughes teen films like The Breakfast Club and Ferris Bueller\'s Day Off to Schwarzenegger action classics like The Terminator and Predator, the 1980s defined modern blockbuster culture. The decade gave us the birth of the blockbuster franchise with Star Wars sequels, Indiana Jones, and Back to the Future, the rise of music videos and MTV, neon aesthetics, and the birth of the VCR home-video revolution that changed how audiences watched movies forever.',
  },
  '1970s': {
    startYear: 1970, endYear: 1979,
    title: '1970s Movies & TV Shows',
    description: 'Discover the New Hollywood era. The 1970s gave us The Godfather, Star Wars, Jaws, Taxi Driver, and One Flew Over the Cuckoo\'s Nest — a revolution in filmmaking that introduced auteur directors like Scorsese, Coppola, Kubrick, and Spielberg. Television saw the debut of Saturday Night Live, the miniseries format with Roots, and the end of the classic studio system. This page collects the most celebrated films and series from the decade that rewrote the rules of modern entertainment.',
  },
};

export function generateStaticParams() {
  return VALID_DECADES.map(decade => ({ decade }));
}

export async function generateMetadata({ params }: { params: Promise<{ decade: string }> }): Promise<Metadata> {
  const { decade } = await params;
  const meta = DECADE_META[decade as Decade];
  if (!meta) return { title: 'Decade Not Found' };

  const pageUrl = `${siteUrl}/decade/${decade}`;
  return {
    title: `${meta.title} - Watch Free Online`,
    description: meta.description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website', url: pageUrl,
      title: `${meta.title} | Lumina Stream`,
      description: meta.description,
      siteName: 'Lumina Stream',
      images: [{ url: `${siteUrl}/og/og-decade.png`, width: 1344, height: 768, alt: `${meta.title} on Lumina Stream` }],
    },
    twitter: { card: 'summary_large_image', title: `${meta.title} | Lumina Stream`, description: meta.description, images: [`${siteUrl}/og/og-decade.png`] },
  };
}

async function getDecadeData(decade: Decade) {
  const meta = DECADE_META[decade];
  try {
    const [movies, tv] = await Promise.all([
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/movie', {
        sort_by: 'popularity.desc',
        'primary_release_date.gte': `${meta.startYear}-01-01`,
        'primary_release_date.lte': `${meta.endYear}-12-31`,
        'vote_count.gte': '100',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/tv', {
        sort_by: 'popularity.desc',
        'first_air_date.gte': `${meta.startYear}-01-01`,
        'first_air_date.lte': `${meta.endYear}-12-31`,
        'vote_count.gte': '100',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/movie', {
        sort_by: 'vote_average.desc',
        'primary_release_date.gte': `${meta.startYear}-01-01`,
        'primary_release_date.lte': `${meta.endYear}-12-31`,
        'vote_count.gte': '500',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/tv', {
        sort_by: 'vote_average.desc',
        'first_air_date.gte': `${meta.startYear}-01-01`,
        'first_air_date.lte': `${meta.endYear}-12-31`,
        'vote_count.gte': '500',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
    ]);

    const seen = new Set<number>();
    const unique = [...movies, ...tv, ...movies, ...tv]
      .filter((r: TMDBMediaItem) => {
        if (!r.poster_path || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .map(r => tmdbToMedia({ ...r, media_type: (r.media_type || 'movie') as 'movie' | 'tv' } as TMDBShow));
    return unique.slice(0, 100);
  } catch {
    return [];
  }
}

export default async function DecadePage({ params }: { params: Promise<{ decade: string }> }) {
  const { decade } = await params;
  const meta = DECADE_META[decade as Decade];
  if (!meta) notFound();

  const shows = await getDecadeData(decade as Decade);
  const pageUrl = `${siteUrl}/decade/${decade}`;

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.title,
    description: meta.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: meta.title, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: `What movies and TV shows are included in the ${meta.title} collection?`, acceptedAnswer: { '@type': 'Answer', text: `The ${meta.title} collection includes the most popular and highest-rated movies and TV shows released between ${meta.startYear} and ${meta.endYear}. We run four separate TMDB discover queries — popular movies, popular TV, top-rated movies, and top-rated TV — all filtered to this decade range, then deduplicate and sort by relevance.` } },
          { '@type': 'Question', name: 'How many titles are in each decade collection?', acceptedAnswer: { '@type': 'Answer', text: `Each decade page displays up to 100 titles, curated from thousands available on TMDB. The selection prioritizes titles with high popularity and strong audience ratings to surface the most beloved content from each decade.` } },
          { '@type': 'Question', name: 'Can I browse by individual year instead of decade?', acceptedAnswer: { '@type': 'Answer', text: `Yes. Lumina Stream also offers year-specific pages for every year from ${new Date().getFullYear() - 10} to ${new Date().getFullYear() + 1}. Visit the year pages for a more granular view of releases within the decade that interests you.` } },
        ],
      }) }} />
      <header style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 20px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>{meta.title}</h1>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          {meta.description}
        </p>
      </header>
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
    </>
  );
}