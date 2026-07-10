/**
 * Server-rendered SEO content for /details/[id] pages.
 *
 * This component renders RICH, VISIBLE HTML that Googlebot can index
 * WITHOUT executing JavaScript. It sits ABOVE the client-rendered
 * DetailsContent component.
 *
 * For the 5,000+ detail URLs in our sitemap, this is the difference
 * between Google seeing an empty page vs. a thick, unique content page.
 */

import Link from 'next/link';
import { SITE_URL } from '@/lib/seo/metadata';

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface SimilarItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface SeasonInfo {
  season_number: number;
  name: string;
  episode_count: number;
}

interface SeoContentProps {
  title: string;
  year?: string;
  overview: string;
  tagline?: string;
  genres: string[];
  genreIds?: number[];
  mediaType: 'movie' | 'tv' | 'anime';
  showId: number;
  rating?: number;
  voteCount?: number;
  runtime?: number;
  seasons?: number;
  episodes?: number;
  status?: string;
  contentRating?: string;
  releaseDate?: string;
  cast: CastMember[];
  similar: SimilarItem[];
  productionCompanies?: string[];
  seasonList?: SeasonInfo[];
  originalTitle?: string;
  originalLanguage?: string;
  popularity?: number;
}

/** Build a programmatic FAQ array for any title */
function buildFaq(props: SeoContentProps): Array<{ q: string; a: string }> {
  const { title, mediaType, genres, rating, runtime, seasons, episodes, year, overview, releaseDate, status, voteCount } = props;
  const typeLabel = mediaType === 'movie' ? 'movie' : mediaType === 'anime' ? 'anime series' : 'TV series';
  const faq: Array<{ q: string; a: string }> = [];

  // Q1: What is [title] about?
  if (overview && overview.length > 30) {
    const short = overview.length > 300 ? overview.slice(0, 297) + '...' : overview;
    faq.push({
      q: `What is ${title} about?`,
      a: short,
    });
  }

  // Q2: Is it worth watching?
  if (rating && rating > 0) {
    const verdict = rating >= 8 ? 'widely considered excellent and highly recommended' :
      rating >= 7 ? 'well-received by audiences and generally recommended' :
      rating >= 6 ? 'moderately rated with mixed reception' :
      'has a lower than average rating, though individual opinions may vary';
    faq.push({
      q: `Is ${title} worth watching?`,
      a: `${title} has a rating of ${rating.toFixed(1)}/10 on TMDB, which means it is ${verdict}. ${genres.length > 0 ? `It falls under the ${genres.slice(0, 3).join(', ')} ${genres.length > 1 ? 'genres' : 'genre'}.` : ''} ${voteCount ? `This score is based on ${voteCount.toLocaleString()} user ratings.` : ''}`,
    });
  }

  // Q3: How long is it? (movie)
  if (runtime && mediaType === 'movie') {
    faq.push({
      q: `How long is ${title}?`,
      a: `${title} has a runtime of ${runtime} minutes (approximately ${Math.floor(runtime / 60)} hours and ${runtime % 60} minutes). ${year ? `It was released in ${year}.` : ''}`,
    });
  }

  // Q4: How many seasons/episodes? (TV/anime)
  if ((mediaType === 'tv' || mediaType === 'anime') && seasons && episodes) {
    faq.push({
      q: `How many seasons and episodes does ${title} have?`,
      a: `${title} has ${seasons} season${seasons !== 1 ? 's' : ''} and ${episodes} episode${episodes !== 1 ? 's' : ''} in total. ${status === 'Returning Series' ? 'The show is currently airing with new episodes being released.' : status === 'Ended' ? 'The series has concluded.' : ''}`,
    });
  }

  // Q5: When was it released?
  if (releaseDate || year) {
    const dateStr = releaseDate ? new Date(releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : year;
    faq.push({
      q: `When was ${title} released?`,
      a: `${title} was released on ${dateStr}. ${mediaType === 'movie' ? `It is a ${genres[0] || ''} film.` : `It is a ${genres[0] || ''} ${typeLabel}.`} Browse more ${mediaType === 'movie' ? 'movies' : 'TV shows'} from ${year || 'this period'} on Lumina Stream.`,
    });
  }

  // Q6: Where to watch
  faq.push({
    q: `Where can I watch ${title}?`,
    a: `You can discover and explore ${title} on Lumina Stream. Our platform provides detailed information about ${title} including cast, ratings, trailers, episode guides, and similar recommendations. Lumina Stream aggregates data from TMDB and AniList to give you the most comprehensive view of ${title} available online.`,
  });

  return faq.slice(0, 5);
}

/** Build FAQ JSON-LD schema */
function buildFaqSchema(faq: Array<{ q: string; a: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/** Get decade link for a given year */
function getDecadeLink(year?: string): { label: string; href: string } | null {
  if (!year) return null;
  const y = parseInt(year, 10);
  if (isNaN(y) || y < 1970) return null;
  const decade = Math.floor(y / 10) * 10;
  return { label: `${decade}s`, href: `/decade/${decade}s` };
}

export default function DetailSeoContent(props: SeoContentProps) {
  const {
    title, year, overview, tagline, genres, genreIds, mediaType, showId,
    rating, voteCount, runtime, seasons, episodes, status, contentRating,
    releaseDate, cast, similar, productionCompanies, seasonList,
    originalTitle, originalLanguage, popularity,
  } = props;

  const faq = buildFaq(props);
  const faqSchema = buildFaqSchema(faq);
  const decadeInfo = getDecadeLink(year);

  const portalGenreMap: Record<number, string> = {
    16: '/genre/anime', 27: '/genre/horror', 10749: '/genre/romance',
    9648: '/genre/mystery', 14: '/genre/fantasy',
  };

  const castNames = cast.slice(0, 10);
  const castText = castNames.length > 0
    ? `${title} features ${castNames.slice(0, 3).map(c => c.name).join(', ')}${castNames.length > 3 ? `, ${castNames.slice(3, 6).map(c => c.name).join(', ')}` : ''}${castNames.length > 6 ? `, and ${castNames.slice(6).map(c => c.name).join(', ')}` : ''} in its cast. Click on any cast member name to view their complete filmography, biography, and all movies and TV shows they have appeared in on Lumina Stream.`
    : '';

  const similarNames = similar.slice(0, 8).map(s => s.title || s.name || '').filter(Boolean);
  const similarText = similarNames.length > 0
    ? `If you enjoyed ${title}, you might also like ${similarNames.slice(0, 3).join(', ')}${similarNames.length > 3 ? `, ${similarNames[3]}` : ''}${similarNames.length > 4 ? `, and ${similarNames[4]}` : ''}. All of these titles are available to explore on Lumina Stream with full cast details, ratings, trailers, and episode guides.`
    : '';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <style>{`
        .seo-detail{max-width:1000px;margin:0 auto;padding:clamp(60px,7vw,80px) 20px 40px}
        .seo-detail h1{font-size:clamp(1.6rem,3.5vw,2.6rem);color:#FFF5E8;margin-bottom:8px;letter-spacing:.02em}
        .seo-detail .tagline{font-size:clamp(.9rem,1.3vw,1.05rem);color:#FFB347;margin-bottom:16px;font-style:italic}
        .seo-detail .meta-line{font-size:.85rem;color:rgba(255,245,232,.5);margin-bottom:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
        .seo-detail .tag{padding:3px 10px;border-radius:6px;font-size:.78rem;background:rgba(255,245,232,.05);border:1px solid rgba(255,245,232,.1);color:rgba(255,245,232,.6)}
        .seo-detail .tag-accent{background:rgba(255,179,71,.1);border-color:rgba(255,179,71,.25);color:#FFB347}
        .seo-detail p{font-size:clamp(.88rem,1.2vw,1.02rem);color:rgba(255,245,232,.55);line-height:1.75;margin-bottom:16px;max-width:860px}
        .seo-detail .section-label{font-size:.82rem;color:#FFB347;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;margin-top:28px}
        .seo-detail .cast-list,.seo-detail .similar-list,.seo-detail .season-list{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
        .seo-detail .cast-item a,.seo-detail .similar-item a,.seo-detail .season-item a{display:inline-block;padding:5px 12px;border-radius:8px;font-size:.8rem;color:#FFB347;text-decoration:none;background:rgba(255,245,232,.04);border:1px solid rgba(255,245,232,.08);transition:background .2s,border-color .2s}
        .seo-detail .similar-item a{color:#FFF5E8}
        .seo-detail .season-item a{color:rgba(255,245,232,.7)}
        .seo-detail .cast-item a:hover,.seo-detail .similar-item a:hover,.seo-detail .season-item a:hover{background:rgba(255,245,232,.08);border-color:rgba(255,179,71,.3)}
        .seo-detail details{background:rgba(255,245,232,.03);border:1px solid rgba(255,245,232,.07);border-radius:10px;padding:14px 18px;margin-bottom:10px;cursor:pointer}
        .seo-detail details summary{font-size:.88rem;color:#FFF5E8;list-style:none;display:flex;justify-content:space-between;align-items:center}
        .seo-detail details summary::after{content:'+';color:rgba(255,245,232,.3);font-size:.8rem}
        .seo-detail details[open] summary::after{content:'-'}
        .seo-detail details .answer{font-size:.83rem;color:rgba(255,245,232,.55);line-height:1.7;margin-top:10px}
        .seo-detail .nav-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
        .seo-detail .nav-links a{display:inline-block;padding:6px 14px;border-radius:8px;font-size:.78rem;color:#FFB347;text-decoration:none;background:rgba(255,245,232,.04);border:1px solid rgba(255,245,232,.08);transition:background .2s,border-color .2s}
        .seo-detail .nav-links a:hover{background:rgba(255,245,232,.08);border-color:rgba(255,179,71,.3)}
      `}</style>

      <article className="seo-detail f-crimson" aria-label={`Information about ${title}`}>
        <h1 className="f-cinzel-dec">{title}{year ? ` (${year})` : ''}</h1>
        {tagline && <div className="tagline f-crimson">{tagline}</div>}

        <div className="meta-line">
          {rating && rating > 0 && <span className="tag tag-accent">{rating.toFixed(1)}/10</span>}
          {voteCount && <span className="tag">{voteCount.toLocaleString()} ratings</span>}
          {runtime && <span className="tag">{runtime} min</span>}
          {contentRating && <span className="tag">{contentRating}</span>}
          {status && <span className="tag">{status}</span>}
          {originalLanguage && <span className="tag">{originalLanguage.toUpperCase()}</span>}
          {popularity && popularity > 10 && <span className="tag">Popularity: {Math.round(popularity)}</span>}
        </div>

        {originalTitle && originalTitle !== title && (
          <p style={{ fontSize: '.82rem', color: 'rgba(255,245,232,.35)', fontStyle: 'italic', marginBottom: 12 }}>
            Original title: {originalTitle}
          </p>
        )}

        {genres.length > 0 && (
          <>
            <div className="section-label f-cinzel">Genres</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {genres.map((genre, i) => {
                const gid = genreIds?.[i];
                const href = gid ? (portalGenreMap[gid] || `/browse?genre=${encodeURIComponent(genre)}`) : `/browse?genre=${encodeURIComponent(genre)}`;
                return (
                  <Link key={genre} href={href} style={{
                    display: 'inline-block', padding: '5px 12px', borderRadius: 8,
                    fontSize: '.8rem', color: '#FFB347', textDecoration: 'none',
                    background: 'rgba(255,179,71,.08)', border: '1px solid rgba(255,179,71,.2)',
                  }}>{genre}</Link>
                );
              })}
            </div>
          </>
        )}

        {overview && overview.length > 20 && (
          <p style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.6)', lineHeight: 1.8 }}>
            {overview}
          </p>
        )}

        {(mediaType === 'tv' || mediaType === 'anime') && seasonList && seasonList.length > 0 && (
          <>
            <div className="section-label f-cinzel">
              {seasons ? `${seasons} Seasons, ${episodes || ''} Episodes` : 'Seasons'}
            </div>
            <div className="season-list">
              {seasonList.map(s => (
                <span key={s.season_number} className="season-item">
                  <a href={`/details/${showId}/season/${s.season_number}/episode/1`}>
                    {s.name} ({s.episode_count} episodes)
                  </a>
                </span>
              ))}
            </div>
          </>
        )}

        {cast.length > 0 && (
          <>
            <div className="section-label f-cinzel">Cast &amp; Crew</div>
            <div className="cast-list">
              {cast.slice(0, 12).map(c => (
                <span key={c.id} className="cast-item">
                  <a href={`/person/${c.id}`}>
                    {c.name}{c.character ? ` as ${c.character}` : ''}
                  </a>
                </span>
              ))}
            </div>
            {castText && <p>{castText}</p>}
          </>
        )}

        {productionCompanies && productionCompanies.length > 0 && (
          <p>
            <span style={{ color: 'rgba(255,245,232,.4)', fontSize: '.82rem' }}>Production: </span>
            {productionCompanies.join(', ')}
          </p>
        )}

        {similar.length > 0 && (
          <>
            <div className="section-label f-cinzel">You Might Also Like</div>
            <div className="similar-list">
              {similar.slice(0, 10).map(s => (
                <span key={s.id} className="similar-item">
                  <a href={`/details/${s.id}`}>
                    {s.title || s.name}
                    {s.vote_average ? ` (${s.vote_average.toFixed(1)})` : ''}
                  </a>
                </span>
              ))}
            </div>
            {similarText && <p>{similarText}</p>}
          </>
        )}

        {faq.length > 0 && (
          <>
            <div className="section-label f-cinzel" style={{ marginTop: 36 }}>Frequently Asked Questions about {title}</div>
            {faq.map(item => (
              <details key={item.q}>
                <summary className="f-cinzel">{item.q}</summary>
                <div className="answer f-crimson">{item.a}</div>
              </details>
            ))}
          </>
        )}

        <nav aria-label="Related pages" className="nav-links">
          <Link href="/browse">Browse All</Link>
          <Link href="/movies">Movies</Link>
          <Link href="/tv-shows">TV Shows</Link>
          <Link href="/top-rated">Top Rated</Link>
          <Link href="/new-releases">New Releases</Link>
          <Link href="/genres">All Genres</Link>
          {decadeInfo && <Link href={decadeInfo.href}>{decadeInfo.label} Collection</Link>}
          {year && <Link href={`/year/${year}`}>{year} Releases</Link>}
          {genres.slice(0, 3).map((g, i) => {
            const gid = genreIds?.[i];
            const slug = gid ? portalGenreMap[gid] : null;
            return slug ? <Link key={g} href={slug}>{g}</Link> : null;
          })}
        </nav>
      </article>
    </>
  );
}