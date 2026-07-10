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

/** Genre-specific analysis text — makes each page unique based on genre combo */
function buildGenreAnalysis(title: string, genres: string[], mediaType: string, rating?: number, runtime?: number): string {
  const g = genres.slice(0, 3).join(' and ');
  const typeLabel = mediaType === 'movie' ? 'film' : mediaType === 'anime' ? 'anime' : 'series';
  const primaryGenre = genres[0] || 'entertainment';

  const genreInsights: Record<string, string> = {
    'Action': `The ${primaryGenre} genre is one of the most popular categories on Lumovia, drawing millions of viewers who crave adrenaline-fueled storytelling. ${title} exemplifies what makes great ${g} ${typeLabel}s compelling: strong pacing, memorable characters, and set pieces that keep audiences engaged from beginning to end.`,
    'Comedy': `${title} brings the art of comedic storytelling to life in a way that resonates with audiences worldwide. The ${g} ${typeLabel} genre has evolved significantly over the decades, and this ${typeLabel} represents some of the best modern ${primaryGenre.toLowerCase()} writing available.`,
    'Drama': `Drama remains the cornerstone of great storytelling, and ${title} delivers powerful emotional depth that sets it apart from typical ${primaryGenre.toLowerCase()} fare. Viewers on Lumovia consistently rate ${g} titles highly because of their ability to explore complex human experiences.`,
    'Horror': `The horror genre has experienced a remarkable renaissance in recent years, and ${title} stands as a testament to the creative potential of ${g} storytelling. Horror fans on Lumovia appreciate ${typeLabel}s that balance genuine scares with thoughtful narrative elements.`,
    'Romance': `Romance continues to be one of the most searched-for genres on streaming platforms, and ${title} captures the emotional resonance that fans of ${g} ${typeLabel}s seek. The chemistry between characters and the exploration of love in its many forms make this ${typeLabel} a standout.`,
    'Sci-Fi': `Science fiction offers some of the most imaginative storytelling in entertainment, and ${title} pushes the boundaries of the ${g} genre with its creative vision. Fans of speculative fiction on Lumovia will find much to appreciate in this ${typeLabel}'s approach to world-building and futuristic concepts.`,
    'Thriller': `Thrillers demand tight plotting and relentless tension, and ${title} delivers on both fronts. The ${g} ${typeLabel} genre rewards viewers who appreciate carefully constructed narratives with unexpected twists and morally complex characters.`,
    'Animation': `Animation has grown far beyond children's entertainment, and ${title} showcases the artistic and narrative possibilities of the medium. ${g} animated ${typeLabel}s attract dedicated fanbases on Lumovia who appreciate both the visual artistry and the depth of storytelling.`,
    'Fantasy': `Fantasy storytelling transports audiences to extraordinary worlds, and ${title} builds an immersive ${g} experience that keeps viewers coming back. The genre's blend of mythological elements and human drama makes it one of the most engaging categories on Lumovia.`,
    'Mystery': `Mystery ${typeLabel}s challenge viewers to piece together clues and unravel complex puzzles, and ${title} is a compelling entry in the ${g} genre. The satisfaction of a well-executed reveal keeps fans of detective and suspense stories thoroughly engaged.`,
    'Crime': `Crime dramas and thrillers continue to captivate audiences with their exploration of the criminal underworld and moral ambiguity. ${title} adds to this rich tradition with its ${g} storytelling that keeps viewers guessing and invested in every scene.`,
    'Documentary': `Documentary filmmaking has become increasingly popular as viewers seek factual, thought-provoking content. ${title} exemplifies the power of the ${g} genre to inform, challenge, and inspire audiences on Lumovia and beyond.`,
  };

  const insight = genreInsights[primaryGenre] || genreInsights['Drama'] || `The ${g} genre offers something for every type of viewer, and ${title} is a strong representative of what makes this category compelling. Lumovia users who enjoy ${primaryGenre.toLowerCase()} content consistently rate these ${typeLabel}s highly for their entertainment value and storytelling quality.`;

  const ratingContext = rating && rating >= 7.5
    ? ` With a TMDB rating of ${rating.toFixed(1)}/10, ${title} ranks among the higher-rated ${primaryGenre.toLowerCase()} titles available on the platform, indicating strong audience approval.`
    : rating && rating >= 6
    ? ` The ${rating.toFixed(1)}/10 TMDB rating suggests that ${title} has found its audience, even if opinions vary — which is typical for ${primaryGenre.toLowerCase()} ${typeLabel}s that take creative risks.`
    : '';

  const runtimeContext = runtime && mediaType === 'movie'
    ? ` At ${runtime} minutes, this ${typeLabel} uses its runtime effectively to develop its ${primaryGenre.toLowerCase()} themes without overstaying its welcome.`
    : '';

  return insight + ratingContext + runtimeContext;
}

/** Build a programmatic FAQ array for any title */
function buildFaq(props: SeoContentProps): Array<{ q: string; a: string }> {
  const { title, mediaType, genres, rating, runtime, seasons, episodes, year, overview, releaseDate, status, voteCount, originalLanguage, productionCompanies } = props;
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
    faq.push({
      q: `Is ${title} worth watching in ${new Date().getFullYear()}?`,
      a: `${title} has a rating of ${rating.toFixed(1)}/10 on TMDB based on ${voteCount ? voteCount.toLocaleString() + ' user ratings' : 'audience ratings'}, which means it is ${verdict}. ${genres.length > 0 ? `It falls under the ${genres.slice(0, 3).join(', ')} ${genres.length > 1 ? 'genres' : 'genre'}.` : ''} You can explore ${title} on Lumovia along with thousands of similar titles.`,
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

  return faq.slice(0, 7);
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
    ? `${title} features ${castNames.slice(0, 3).map(c => c.name).join(', ')}${castNames.length > 3 ? `, ${castNames.slice(3, 6).map(c => c.name).join(', ')}` : ''}${castNames.length > 6 ? `, and ${castNames.slice(6).map(c => c.name).join(', ')}` : ''} in its cast. Each cast member's page on Lumovia includes their complete filmography, a detailed biography, and links to every movie and TV show they have appeared in — making it easy to discover new content through your favorite actors.`
    : '';

  const similarNames = similar.slice(0, 8).map(s => s.title || s.name || '').filter(Boolean);
  const similarText = similarNames.length > 0
    ? `If you enjoyed ${title}, you might also like ${similarNames.slice(0, 3).join(', ')}${similarNames.length > 3 ? `, ${similarNames[3]}` : ''}${similarNames.length > 4 ? `, and ${similarNames[4]}` : ''}. All of these titles are available to explore on Lumovia with full cast details, ratings, trailers, and episode guides. Our recommendation system analyzes genre, rating, and audience patterns to surface the most relevant similar titles for every show in our catalog.`
    : '';

  // Build unique genre analysis paragraph
  const genreAnalysis = genres.length > 0
    ? buildGenreAnalysis(title, genres, mediaType, rating, runtime)
    : '';

  // Build a unique "why watch" paragraph based on title characteristics
  const whyWatchParts: string[] = [];
  if (rating && rating >= 8) {
    whyWatchParts.push(`${title} has earned a place among the top-rated ${genres[0] || ''} titles on Lumovia with its impressive ${rating.toFixed(1)}/10 TMDB score`);
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
    comparisonParts.push(`holds a ${rating.toFixed(1)}/10 rating on TMDB`);
  }
  const comparisonText = comparisonParts.length > 2
    ? comparisonParts.join(', ') + '. Explore our curated collections by year, decade, and genre to find more titles that match your taste.'
    : '';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <style>{`
        .seo-detail{max-width:1000px;margin:0 auto;padding:0 20px 60px}
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