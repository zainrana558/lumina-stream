/**
 * Server-rendered SEO content for episode pages.
 * Renders visible HTML for Googlebot without JS execution.
 */

import Link from 'next/link';

interface EpisodeSeoProps {
  showTitle: string;
  showId: number;
  season: number;
  episode: number;
  episodeTitle?: string;
  episodeOverview?: string;
  runtime?: number;
  airDate?: string;
  rating?: number;
  showOverview?: string;
  showGenres?: string[];
  showMediaType?: 'tv' | 'movie' | 'anime';
  totalEpisodes?: number;
}

function buildEpisodeFaq(props: EpisodeSeoProps): Array<{ q: string; a: string }> {
  const { showTitle, season, episode, episodeTitle, episodeOverview, runtime, airDate, rating, showOverview, showGenres } = props;
  const epLabel = `Season ${season} Episode ${episode}`;
  const displayName = episodeTitle ? `${showTitle} ${epLabel}: ${episodeTitle}` : `${showTitle} ${epLabel}`;
  const faq: Array<{ q: string; a: string }> = [];

  if (episodeOverview && episodeOverview.length > 20) {
    faq.push({
      q: `What happens in ${displayName}?`,
      a: episodeOverview.length > 300 ? episodeOverview.slice(0, 297) + '...' : episodeOverview,
    });
  }

  if (episodeOverview && showOverview && showOverview.length > 20) {
    faq.push({
      q: `What is ${showTitle} about?`,
      a: showOverview.length > 250 ? showOverview.slice(0, 247) + '...' : showOverview,
    });
  }

  if (airDate) {
    const dateStr = new Date(airDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    faq.push({
      q: `When did ${displayName} air?`,
      a: `${displayName} originally aired on ${dateStr}. Browse the complete episode guide for ${showTitle} Season ${season} on Lumina Stream, where you can find every episode with air dates, ratings, and detailed synopses.`,
    });
  }

  if (runtime) {
    faq.push({
      q: `How long is ${displayName}?`,
      a: `The runtime for ${displayName} is approximately ${runtime} minutes. Episode runtimes may vary slightly depending on the broadcast version. View the full season guide on Lumina Stream for runtimes of all episodes in Season ${season}.`,
    });
  }

  faq.push({
    q: `Where can I watch ${displayName}?`,
    a: `Discover ${displayName} on Lumina Stream. Our platform provides detailed episode information including synopses, cast details, air dates, and ratings for ${showTitle} and thousands of other TV shows. Browse the complete episode guide and explore similar titles.`,
  });

  return faq.slice(0, 5);
}

export default function EpisodeSeoContent(props: EpisodeSeoProps) {
  const {
    showTitle, showId, season, episode, episodeTitle, episodeOverview,
    runtime, airDate, rating, showOverview, showGenres, showMediaType, totalEpisodes,
  } = props;

  const faq = buildEpisodeFaq(props);
  const epLabel = `S${season}E${episode}`;
  const displayName = episodeTitle ? `${showTitle} ${epLabel}: ${episodeTitle}` : `${showTitle} ${epLabel}`;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <style>{`
        .seo-ep{max-width:1000px;margin:0 auto;padding:clamp(60px,7vw,80px) 20px 30px}
        .seo-ep h1{font-size:clamp(1.4rem,3vw,2.2rem);color:#FFF5E8;margin-bottom:6px;letter-spacing:.02em}
        .seo-ep .show-link{color:#FFB347;text-decoration:none;font-size:clamp(.95rem,1.4vw,1.15rem);display:inline-block;margin-bottom:14px;transition:color .2s}
        .seo-ep .show-link:hover{color:#fff}
        .seo-ep .meta-line{font-size:.82rem;color:rgba(255,245,232,.45);margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
        .seo-ep .tag{padding:3px 10px;border-radius:6px;font-size:.75rem;background:rgba(255,245,232,.05);border:1px solid rgba(255,245,232,.1);color:rgba(255,245,232,.55)}
        .seo-ep .tag-accent{background:rgba(255,179,71,.1);border-color:rgba(255,179,71,.25);color:#FFB347}
        .seo-ep p{font-size:clamp(.86rem,1.2vw,1rem);color:rgba(255,245,232,.55);line-height:1.75;margin-bottom:14px;max-width:860px}
        .seo-ep .section-label{font-size:.8rem;color:#FFB347;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;margin-top:24px}
        .seo-ep .ep-nav{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
        .seo-ep .ep-nav a{display:inline-block;padding:4px 10px;border-radius:7px;font-size:.78rem;color:rgba(255,245,232,.7);text-decoration:none;background:rgba(255,245,232,.04);border:1px solid rgba(255,245,232,.07);transition:background .2s}
        .seo-ep .ep-nav a:hover{background:rgba(255,245,232,.08)}
        .seo-ep .ep-nav a.active{background:rgba(255,179,71,.12);border-color:rgba(255,179,71,.25);color:#FFB347}
        .seo-ep details{background:rgba(255,245,232,.03);border:1px solid rgba(255,245,232,.07);border-radius:10px;padding:12px 16px;margin-bottom:8px;cursor:pointer}
        .seo-ep details summary{font-size:.85rem;color:#FFF5E8;list-style:none;display:flex;justify-content:space-between;align-items:center}
        .seo-ep details summary::after{content:'+';color:rgba(255,245,232,.3);font-size:.8rem}
        .seo-ep details[open] summary::after{content:'-'}
        .seo-ep details .answer{font-size:.8rem;color:rgba(255,245,232,.5);line-height:1.7;margin-top:8px}
        .seo-ep .nav-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
        .seo-ep .nav-links a{display:inline-block;padding:6px 14px;border-radius:8px;font-size:.78rem;color:#FFB347;text-decoration:none;background:rgba(255,245,232,.04);border:1px solid rgba(255,245,232,.08);transition:background .2s,border-color .2s}
        .seo-ep .nav-links a:hover{background:rgba(255,245,232,.08);border-color:rgba(255,179,71,.3)}
      `}</style>

      <article className="seo-ep f-crimson" aria-label={`Episode information for ${displayName}`}>
        <Link href={`/details/${showId}`} className="show-link f-cinzel">
          {showTitle}
        </Link>
        <h1 className="f-cinzel-dec">
          {episodeTitle ? `${episodeTitle}` : `Episode ${episode}`}
          <span style={{ fontSize: '.7em', color: 'rgba(255,245,232,.4)', marginLeft: 8 }}>{epLabel}</span>
        </h1>

        <div className="meta-line">
          <span className="tag tag-accent">Season {season}</span>
          <span className="tag">Episode {episode}</span>
          {airDate && <span className="tag">Aired {airDate}</span>}
          {runtime && <span className="tag">{runtime} min</span>}
          {rating && rating > 0 && <span className="tag">{rating.toFixed(1)}/10</span>}
          {totalEpisodes && <span className="tag">{totalEpisodes} episodes in season</span>}
        </div>

        {showGenres && showGenres.length > 0 && (
          <p style={{ fontSize: '.82rem', color: 'rgba(255,245,232,.35)', marginBottom: 16 }}>
            Genres: {showGenres.join(', ')}
          </p>
        )}

        {/* Episode navigation */}
        <div className="section-label f-cinzel">Season {season} Episodes</div>
        <div className="ep-nav">
          {Array.from({ length: Math.min(totalEpisodes || 20, 24) }, (_, i) => i + 1).map(epNum => (
            <a
              key={epNum}
              href={`/details/${showId}/season/${season}/episode/${epNum}`}
              className={epNum === episode ? 'active' : ''}
              aria-current={epNum === episode ? 'page' : undefined}
            >
              {epNum}
            </a>
          ))}
          {(totalEpisodes || 20) > 24 && (
            <span style={{ color: 'rgba(255,245,232,.3)', fontSize: '.78rem', padding: '4px 8px' }}>
              +{((totalEpisodes || 20) - 24)} more
            </span>
          )}
        </div>

        {/* Episode synopsis */}
        {episodeOverview && episodeOverview.length > 10 && (
          <>
            <div className="section-label f-cinzel">Episode Synopsis</div>
            <p style={{ fontSize: 'clamp(.88rem,1.2vw,1.02rem)', color: 'rgba(255,245,232,.6)', lineHeight: 1.8 }}>
              {episodeOverview}
            </p>
          </>
        )}

        {/* Show overview */}
        {showOverview && showOverview.length > 20 && (
          <>
            <div className="section-label f-cinzel">About {showTitle}</div>
            <p>
              {showOverview.length > 400 ? showOverview.slice(0, 397) + '...' : showOverview}
              {' '}Read more about {showTitle} and browse all episodes on the{' '}
              <a href={`/details/${showId}`} style={{ color: '#FFB347', textDecoration: 'none' }}>
                full details page
              </a>.
            </p>
          </>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <>
            <div className="section-label f-cinzel" style={{ marginTop: 30 }}>FAQ about this Episode</div>
            {faq.map(item => (
              <details key={item.q}>
                <summary className="f-cinzel">{item.q}</summary>
                <div className="answer f-crimson">{item.a}</div>
              </details>
            ))}
          </>
        )}

        {/* Internal links */}
        <nav aria-label="Related pages" className="nav-links">
          <Link href={`/details/${showId}`}>Full Show Details</Link>
          <Link href="/tv-shows">TV Shows</Link>
          <Link href="/browse">Browse All</Link>
          <Link href="/top-rated">Top Rated</Link>
          <Link href="/new-releases">New Releases</Link>
          {showGenres?.slice(0, 2).map(g => (
            <Link key={g} href={`/browse?genre=${encodeURIComponent(g)}`}>{g}</Link>
          ))}
        </nav>
      </article>
    </>
  );
}