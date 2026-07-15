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
import { personUrl, mediaUrl } from '@/lib/slug';

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

interface WriterEntry {
  name: string;
  job: string;
}

interface ReviewEntry {
  author: string;
  rating?: number | null;
  content: string;
  createdAt: string;
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
  anilistId?: number;
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
  directors?: string[];
  writers?: WriterEntry[];
  countries?: string[];
  languages?: string[];
  keywords?: string[];
  budget?: number;
  revenue?: number;
  homepage?: string;
  imdbId?: string;
  reviews?: ReviewEntry[];
}

/** Genre-specific analysis text — data-driven, not generic filler */
function buildGenreAnalysis(title: string, genres: string[], mediaType: string, rating?: number, runtime?: number): string {
  const g = genres.slice(0, 3).join(', ');
  const typeLabel = mediaType === 'movie' ? 'film' : mediaType === 'anime' ? 'anime' : 'series';
  const primaryGenre = genres[0] || 'entertainment';

  const parts: string[] = [];

  // Factual genre + type statement
  parts.push(`${title} is a ${primaryGenre.toLowerCase()} ${typeLabel}${genres.length > 1 ? ` that blends elements of ${genres.slice(1).join(', ')}` : ''}.`);

  // Rating context (factual, not promotional)
  if (rating && rating > 0) {
    const dataSource = mediaType === 'anime' ? 'AniList' : 'TMDB';
    if (rating >= 8) {
      parts.push(`With a ${dataSource} score of ${rating.toFixed(1)}/10, it ranks among the highest-rated ${primaryGenre.toLowerCase()} titles in our catalog.`);
    } else if (rating >= 7) {
      parts.push(`It holds a solid ${rating.toFixed(1)}/10 rating on ${dataSource}, placing it above average for ${primaryGenre.toLowerCase()} ${typeLabel}s.`);
    } else if (rating >= 6) {
      parts.push(`The ${dataSource} community has given it a ${rating.toFixed(1)}/10 rating.`);
    }
  }

  // Runtime context (movies only, factual)
  if (runtime && mediaType === 'movie') {
    const hrs = Math.floor(runtime / 60);
    const mins = runtime % 60;
    parts.push(`Runtime: ${hrs > 0 ? `${hrs}h ` : ''}${mins}m.`);
  }

  return parts.join(' ');
}

/** Build a programmatic FAQ array for any title */
function buildFaq(props: SeoContentProps): Array<{ q: string; a: string }> {
  const { title, mediaType, genres, rating, runtime, seasons, episodes, year, overview, releaseDate, status, voteCount, originalLanguage, productionCompanies, directors, writers } = props;
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
    const verdict = rating >= 8 ? 'widely considered excellent and highly recommended for fans of ' + (genres[0] || 'great') + ' entertainment' :
      rating >= 7 ? 'well-received by audiences and generally recommended as a solid ' + (genres[0] || 'entertainment') + ' title' :
      rating >= 6 ? 'moderately rated with mixed reception — it has its strengths but may not appeal to everyone' :
      'has a lower than average rating, though individual opinions vary significantly and some viewers may still find it enjoyable';
    const source = mediaType === 'anime' ? 'AniList' : 'TMDB';
    const ratingLabel = mediaType === 'anime' ? 'community score' : 'user ratings';
    faq.push({
      q: `Is ${title} worth watching in ${new Date().getFullYear()}?`,
      a: `${title} has a rating of ${rating.toFixed(1)}/10 on ${source} based on ${voteCount ? voteCount.toLocaleString() + ` ${ratingLabel}` : `audience ${ratingLabel}`}, which means it is ${verdict}. ${genres.length > 0 ? `It falls under the ${genres.slice(0, 3).join(', ')} ${genres.length > 1 ? 'genres' : 'genre'}.` : ''} You can explore ${title} on Lumovia along with thousands of similar titles.`,
    });
  }

  // Q3: How long is it? (movie)
  if (runtime && mediaType === 'movie') {
    const hrs = Math.floor(runtime / 60);
    const mins = runtime % 60;
    faq.push({
      q: `How long is ${title}?`,
      a: `${title} has a runtime of ${runtime} minutes (${hrs > 0 ? `approximately ${hrs} hour${hrs !== 1 ? 's' : ''}` : ''}${mins > 0 ? ` ${mins} minute${mins !== 1 ? 's' : ''}` : ''}). ${year ? `It was released in ${year}.` : ''} Browse the full details page on Lumovia for cast information, trailers, and similar movie recommendations.`,
    });
  }

  // Q4: How many seasons/episodes? (TV/anime)
  if ((mediaType === 'tv' || mediaType === 'anime') && seasons && episodes) {
    faq.push({
      q: `How many seasons and episodes does ${title} have?`,
      a: `${title} has ${seasons} season${seasons !== 1 ? 's' : ''} and ${episodes} episode${episodes !== 1 ? 's' : ''} in total. ${status === 'Returning Series' ? 'The show is currently airing with new episodes being released regularly.' : status === 'Ended' ? 'The series has concluded its run, but all episodes are available to explore.' : ''} Visit the detail page on Lumovia for a complete season-by-season episode guide with air dates and individual ratings.`,
    });
  }

  // Q5: When was it released?
  if (releaseDate || year) {
    const dateStr = releaseDate ? new Date(releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : year;
    faq.push({
      q: `When was ${title} released?`,
      a: `${title} was released on ${dateStr}. ${mediaType === 'movie' ? `It is a ${genres[0] || ''} film.` : `It is a ${genres[0] || ''} ${typeLabel}.`} Browse more ${mediaType === 'movie' ? 'movies' : 'TV shows'} from ${year || 'this period'} on Lumovia, where we organize content by year and decade for easy discovery.`,
    });
  }

  // Q6: Who is in the cast?
  faq.push({
      q: `Who stars in ${title}?`,
      a: `You can find the complete cast and crew list for ${title} on Lumovia. We provide full filmographies for every cast member, character names, and links to other projects they have appeared in. Click on any cast member to explore their entire body of work across movies and TV shows.`,
  });

  // Q7: What language is it in?
  if (originalLanguage && originalLanguage !== 'en') {
    const langNames: Record<string, string> = { ja: 'Japanese', ko: 'Korean', zh: 'Chinese', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', hi: 'Hindi', th: 'Thai', ar: 'Arabic', tr: 'Turkish', ru: 'Russian', pl: 'Polish', sv: 'Swedish', da: 'Danish', no: 'Norwegian', nl: 'Dutch', cs: 'Czech' };
    faq.push({
      q: `What language is ${title} in?`,
      a: `${title} is originally in ${langNames[originalLanguage] || originalLanguage.toUpperCase()}. International titles are well-represented on Lumovia — browse our anime, Korean drama, and international film collections to discover more content from around the world.`,
    });
  }

  // Q8: Who produced it?
  if (productionCompanies && productionCompanies.length > 0) {
    faq.push({
      q: `Who produced ${title}?`,
      a: `${title} was produced by ${productionCompanies.slice(0, 3).join(', ')}${productionCompanies.length > 3 ? ' and others' : ''}. Production company information, along with full cast details, ratings, and release information, is available on the Lumovia detail page for ${title}.`,
    });
  }

  // Q9: Where to watch
  faq.push({
    q: `Where can I watch ${title}?`,
    a: `You can discover and explore ${title} on Lumovia — a free platform that provides the most comprehensive information about ${title} available online, including cast and crew details, user ratings from millions of TMDB and AniList users, trailer links, episode guides for TV series, and AI-powered similar title recommendations. No subscription or sign-up is required to browse.`,
  });

  // Q10: Who directed it?
  if (directors && directors.length > 0) {
    faq.push({
      q: `Who directed ${title}?`,
      a: `${title} was directed by ${directors.join(', ')}.${writers && writers.length > 0 ? ` The screenplay was written by ${writers.slice(0, 3).map(w => w.name).join(', ')}.` : ''} Visit the Lumovia detail page for ${title} to explore the full cast and crew, watch trailers, and discover similar titles.`,
    });
  }

  return faq.slice(0, 4);
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
    anilistId, rating, voteCount, runtime, seasons, episodes, status, contentRating,
    releaseDate, cast, similar, productionCompanies, seasonList,
    originalTitle, originalLanguage, popularity,
    directors, writers, countries, languages, keywords,
    budget, revenue, homepage, imdbId, reviews,
  } = props;

  const faq = buildFaq(props);
  const faqSchema = buildFaqSchema(faq);
  const decadeInfo = getDecadeLink(year);

  const portalGenreMap: Record<number, string> = {
    16: '/genre/anime', 27: '/genre/horror', 10749: '/genre/romance',
    9648: '/genre/mystery', 14: '/genre/fantasy',
  };

  const castNames = cast.slice(0, 6);
  const castText = castNames.length > 0
    ? `${title} features ${castNames.map(c => c.name).join(', ')} in its cast. Explore each cast member's filmography on Lumovia.`
    : '';

  const similarNames = similar.slice(0, 5).map(s => s.title || s.name || '').filter(Boolean);
  const similarText = similarNames.length > 0
    ? `If you enjoyed ${title}, you might also like ${similarNames.slice(0, 3).join(', ')}${similarNames.length > 3 ? `, and ${similarNames[3]}` : ''}. All available to explore on Lumovia.`
    : '';

  // Build unique genre analysis paragraph
  const genreAnalysis = genres.length > 0
    ? buildGenreAnalysis(title, genres, mediaType, rating, runtime)
    : '';

  // Build a unique "why watch" paragraph based on title characteristics
  const whyWatchParts: string[] = [];
  if (rating && rating >= 8) {
    whyWatchParts.push(`${title} has earned a place among the top-rated ${genres[0] || ''} titles on Lumovia with its impressive ${rating.toFixed(1)}/10 ${mediaType === 'anime' ? 'AniList' : 'TMDB'} score`);
  }
  if (voteCount && voteCount > 5000) {
    whyWatchParts.push(`backed by a passionate community of ${voteCount.toLocaleString()} raters`);
  } else if (voteCount && voteCount > 500) {
    whyWatchParts.push(`supported by ${voteCount.toLocaleString()} audience ratings`);
  }
  if (popularity && popularity > 50) {
    whyWatchParts.push(`and a popularity score of ${Math.round(popularity)} that places it among the most talked-about titles currently`);
  }
  const whyWatch = whyWatchParts.length > 0
    ? whyWatchParts.join(', ') + '.'
    : `${title} is part of Lumovia's extensive catalog of ${mediaType === 'movie' ? 'movies' : 'TV shows and anime'}, where every title comes with detailed information powered by TMDB and AniList.`;

  // Build comparison context paragraph
  const comparisonParts: string[] = [];
  if (year) {
    comparisonParts.push(`${title} was released in ${year}`);
  }
  if (genres.length > 0) {
    comparisonParts.push(`belongs to the ${genres.slice(0, 2).join(' and ')} ${genres.length > 2 ? 'and other ' : ''}genre${genres.length > 1 ? 's' : ''}`);
  }
  if (rating) {
    comparisonParts.push(`holds a ${rating.toFixed(1)}/10 rating on ${mediaType === 'anime' ? 'AniList' : 'TMDB'}`);
  }
  const comparisonText = comparisonParts.length > 2
    ? comparisonParts.join(', ') + '. Explore our curated collections by year, decade, and genre to find more titles that match your taste.'
    : '';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

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

        {/* Genre-specific analysis — unique per page based on genre combination */}
        {genreAnalysis && (
          <p style={{ fontSize: 'clamp(.85rem,1.15vw,.98rem)', color: 'rgba(255,245,232,.5)', lineHeight: 1.75 }}>
            {genreAnalysis}
          </p>
        )}

        {/* Why watch — unique per page based on rating/vote count/popularity */}
        <p style={{ fontSize: 'clamp(.85rem,1.15vw,.98rem)', color: 'rgba(255,245,232,.5)', lineHeight: 1.75 }}>
          {whyWatch}
        </p>

        {/* Comparison context — ties the title to broader catalog categories */}
        {comparisonText && (
          <p style={{ fontSize: 'clamp(.85rem,1.15vw,.98rem)', color: 'rgba(255,245,232,.5)', lineHeight: 1.75 }}>
            {comparisonText}
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
                  <a href={`${mediaUrl(showId, title, mediaType, year)}/season/${s.season_number}/episode/1`}>
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
              {cast.slice(0, 6).map(c => (
                <span key={c.id} className="cast-item">
                  <a href={personUrl(c.id, c.name)}>
                    {c.name}{c.character ? ` as ${c.character}` : ''}
                  </a>
                </span>
              ))}
            </div>
            {castText && <p>{castText}</p>}
          </>
        )}

        {/* Director */}
        {directors && directors.length > 0 && (
          <p>
            <span style={{ color: 'rgba(255,245,232,.4)', fontSize: '.82rem' }}>Director: </span>
            {directors.join(', ')}
          </p>
        )}

        {/* Writers */}
        {writers && writers.length > 0 && (
          <p>
            <span style={{ color: 'rgba(255,245,232,.4)', fontSize: '.82rem' }}>Writers: </span>
            {writers.map(w => w.name).join(', ')}
          </p>
        )}

        {/* Production Companies */}
        {productionCompanies && productionCompanies.length > 0 && (
          <p>
            <span style={{ color: 'rgba(255,245,232,.4)', fontSize: '.82rem' }}>Production: </span>
            {productionCompanies.join(', ')}
          </p>
        )}

        {/* Country */}
        {countries && countries.length > 0 && (
          <p>
            <span style={{ color: 'rgba(255,245,232,.4)', fontSize: '.82rem' }}>Country: </span>
            {countries.join(', ')}
          </p>
        )}

        {/* Spoken Languages */}
        {languages && languages.length > 0 && (
          <p>
            <span style={{ color: 'rgba(255,245,232,.4)', fontSize: '.82rem' }}>Languages: </span>
            {languages.join(', ')}
          </p>
        )}

        {/* Budget & Revenue (movies only) */}
        {budget && budget > 0 && mediaType === 'movie' && (
          <p>
            <span style={{ color: 'rgba(255,245,232,.4)', fontSize: '.82rem' }}>Budget: </span>
            {budget >= 1_000_000_000 ? `$${(budget / 1_000_000_000).toFixed(1)}B` : budget >= 1_000_000 ? `$${(budget / 1_000_000).toFixed(1)}M` : `$${budget.toLocaleString()}`}
          </p>
        )}
        {revenue && revenue > 0 && mediaType === 'movie' && (
          <p>
            <span style={{ color: 'rgba(255,245,232,.4)', fontSize: '.82rem' }}>Revenue: </span>
            {revenue >= 1_000_000_000 ? `$${(revenue / 1_000_000_000).toFixed(1)}B` : revenue >= 1_000_000 ? `$${(revenue / 1_000_000).toFixed(1)}M` : `$${revenue.toLocaleString()}`}
          </p>
        )}

        {/* Keywords */}
        {keywords && keywords.length > 0 && (
          <>
            <div className="section-label f-cinzel" style={{ marginTop: 16 }}>Keywords</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {keywords.slice(0, 15).map(kw => (
                <Link key={kw} href={`/browse?genre=${encodeURIComponent(kw)}`} style={{
                  display: 'inline-block', padding: '4px 10px', borderRadius: 6,
                  fontSize: '.78rem', color: '#FFB347', textDecoration: 'none',
                  background: 'rgba(255,179,71,.06)', border: '1px solid rgba(255,179,71,.15)',
                }}>{kw}</Link>
              ))}
            </div>
          </>
        )}

        {/* TMDB Reviews */}
        {reviews && reviews.length > 0 && (
          <>
            <div className="section-label f-cinzel" style={{ marginTop: 16 }}>Reviews</div>
            {reviews.slice(0, 2).map(rev => (
              <div key={rev.author} style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,245,232,.02)', border: '1px solid rgba(255,245,232,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '.85rem', color: '#FFF5E8', fontWeight: 600 }}>{rev.author}</span>
                  {rev.rating && <span style={{ fontSize: '.75rem', color: '#FFB347' }}>{rev.rating}/10</span>}
                  <span style={{ fontSize: '.7rem', color: 'rgba(255,245,232,.35)' }}>{new Date(rev.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
                </div>
                <p style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rev.content.replace(/<[^>]*>/g, '')}</p>
              </div>
            ))}
          </>
        )}

        {similar.length > 0 && (
          <>
            <div className="section-label f-cinzel">You Might Also Like</div>
            <div className="similar-list">
              {similar.slice(0, 5).map(s => (
                <span key={s.id} className="similar-item">
                  <a href={mediaUrl(s.id, s.title || s.name || '', undefined, (s.release_date || s.first_air_date)?.slice(0,4))}>
                    {s.title || s.name}
                    {s.vote_average ? ` (${s.vote_average.toFixed(1)})` : ''}
                  </a>
                </span>
              ))}
            </div>
            {similarText && <p>{similarText}</p>}
          </>
        )}

        {/* External links — important for SEO (Google requires external links) */}
        <div className="section-label f-cinzel" style={{ marginTop: 28 }}>External Sources</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {mediaType !== 'anime' && (
            <a
              href={`https://www.themoviedb.org/${mediaType === 'movie' ? 'movie' : 'tv'}/${showId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 8, fontSize: '.8rem', color: '#FFB347', textDecoration: 'none', background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)' }}
            >
              View on TMDB
            </a>
          )}
          {mediaType !== 'anime' && imdbId && (
            <a
              href={`https://www.imdb.com/title/${imdbId}/`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 8, fontSize: '.8rem', color: '#FFB347', textDecoration: 'none', background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)' }}
            >
              IMDb
            </a>
          )}
          {mediaType !== 'anime' && !imdbId && (
            <a
              href={`https://www.imdb.com/find/?q=${encodeURIComponent(title)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 8, fontSize: '.8rem', color: '#FFB347', textDecoration: 'none', background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)' }}
            >
              Search on IMDb
            </a>
          )}
          {homepage && (
            <a
              href={homepage}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 8, fontSize: '.8rem', color: '#FFB347', textDecoration: 'none', background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)' }}
            >
              Official Website
            </a>
          )}
          <a
            href={anilistId ? `https://anilist.co/anime/${anilistId}/` : (mediaType === 'anime' ? `https://anilist.co/search/anime?search=${encodeURIComponent(title)}` : `https://anilist.co/`)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 8, fontSize: '.8rem', color: '#FFB347', textDecoration: 'none', background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)' }}
          >
            AniList
          </a>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(title + (year ? ` ${year}` : ''))}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 8, fontSize: '.8rem', color: '#FFB347', textDecoration: 'none', background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)' }}
          >
            Google Search
          </a>
          <a
            href={`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 8, fontSize: '.8rem', color: '#FFB347', textDecoration: 'none', background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)' }}
          >
            Wikipedia
          </a>
        </div>

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
          <Link href="/seasonal">Seasonal Anime</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/release-calendar">Release Calendar</Link>
          <Link href="/genres">All Genres</Link>
          {decadeInfo && <Link href={decadeInfo.href}>{decadeInfo.label} Collection</Link>}
          {year && <Link href={`/year/${year}`}>{year} Releases</Link>}
          {genres.slice(0, 3).map((g, i) => {
            const gid = genreIds?.[i];
            const slug = gid ? portalGenreMap[gid] : null;
            return slug ? <Link key={g} href={slug}>{g}</Link> : null;
          })}
          {genres.filter(g => !portalGenreMap[genreIds?.[genres.indexOf(g)] ?? -1]).slice(0, 2).map(g => (
            <Link key={`browse-${g}`} href={`/browse?genre=${encodeURIComponent(g)}`}>{g}</Link>
          ))}
        </nav>
      </article>
    </>
  );
}