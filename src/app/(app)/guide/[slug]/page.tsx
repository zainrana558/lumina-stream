/**
 * Individual Guide Page — AI-friendly Q&A content optimized for featured snippets.
 * Server component for SEO (fully server-rendered, no client JS needed).
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CANONICAL_BASE, SITE_NAME } from '@/lib/seo/constants';
import { GUIDES } from '@/content/guides';

export const dynamic = 'force-static';
export const revalidate = 86400;

/* ─── Genre links shown at the bottom of each guide ─── */
const GENRE_LINKS = [
  { label: 'Action', href: '/genre/action' },
  { label: 'Anime', href: '/genre/anime' },
  { label: 'Crime', href: '/genre/crime' },
  { label: 'Drama', href: '/genre/drama' },
  { label: 'Fantasy', href: '/genre/fantasy' },
  { label: 'Horror', href: '/genre/horror' },
  { label: 'Romance', href: '/genre/romance' },
  { label: 'Sci-Fi', href: '/genre/science-fiction' },
  { label: 'Thriller', href: '/genre/thriller' },
];

/* ─── Page ─── */
interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return { title: 'Guide Not Found — Lumovia', robots: { index: false } };

  const title = `${guide.question} — Lumovia Guide`;
  const description = guide.shortAnswer.slice(0, 160);
  const pageUrl = `${CANONICAL_BASE}/guide/${guide.slug}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      type: 'article',
      url: pageUrl,
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary' as const,
      title,
      description,
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);

  if (!guide) {
    return (
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 'clamp(1rem,5vw,2rem)',
        paddingTop: 120,
        paddingBottom: 120,
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.2rem)', color: '#FFF5E8', marginBottom: 16 }}>
          Guide Not Found
        </h1>
        <p style={{ color: 'rgba(255,245,232,.55)', fontSize: '.95rem', marginBottom: 32, lineHeight: 1.7 }}>
          The guide you are looking for does not exist or has been removed.
        </p>
        <Link href="/guides" style={{
          display: 'inline-block',
          padding: '10px 28px',
          borderRadius: 50,
          background: 'linear-gradient(175deg,#FFE566,#FFB347,#E07200)',
          color: '#05020A',
          fontWeight: 700,
          textDecoration: 'none',
          fontSize: '.9rem',
        }}>
          Browse All Guides
        </Link>
      </div>
    );
  }

  /* Related guides — same category, excluding current */
  const relatedGuides = GUIDES.filter(
    (g) => g.category === guide.category && g.slug !== guide.slug
  ).slice(0, 3);

  /* If not enough same-category, fill with other guides */
  const moreGuides = relatedGuides.length < 3
    ? [
        ...relatedGuides,
        ...GUIDES.filter(
          (g) => g.slug !== guide.slug && !relatedGuides.some((r) => r.slug === g.slug)
        ).slice(0, 3 - relatedGuides.length),
      ]
    : relatedGuides;

  const pageUrl = `${CANONICAL_BASE}/guide/${guide.slug}`;
  const guidesUrl = `${CANONICAL_BASE}/guides`;

  /* JSON-LD structures */
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: CANONICAL_BASE },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: guidesUrl },
      { '@type': 'ListItem', position: 3, name: guide.question, item: pageUrl },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: guide.question,
        acceptedAnswer: { '@type': 'Answer', text: guide.shortAnswer },
      },
    ],
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.question,
    description: guide.shortAnswer,
    datePublished: '2025-01-15',
    dateModified: new Date().toISOString().split('T')[0],
    author: { '@type': 'Organization', name: SITE_NAME, url: CANONICAL_BASE },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: CANONICAL_BASE,
      logo: { '@type': 'ImageObject', url: `${CANONICAL_BASE}/logo.svg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
  };

  /* Styles */
  const breadcrumbColor = 'rgba(255,245,232,.4)';
  const breadcrumbActiveColor = 'rgba(255,245,232,.6)';
  const badgeBg = 'rgba(255,179,71,.15)';
  const badgeColor = '#FFB347';
  const calloutBg = 'rgba(255,179,71,.06)';
  const calloutBorder = 'rgba(255,179,71,.2)';
  const calloutText = 'rgba(255,245,232,.88)';
  const headingColor = '#FFF5E8';
  const textColor = 'rgba(255,245,232,.78)';
  const mutedColor = 'rgba(255,245,232,.45)';
  const borderColor = 'rgba(255,255,255,.06)';
  const cardBg = 'rgba(255,255,255,.03)';
  const cardBorder = 'rgba(255,255,255,.06)';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 'clamp(1rem,5vw,2rem)',
        paddingTop: 80,
        paddingBottom: 120,
      }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ fontSize: '.75rem', color: breadcrumbColor, marginBottom: 28 }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
          {' › '}
          <Link href="/guides" style={{ color: 'inherit', textDecoration: 'none' }}>Guides</Link>
          {' › '}
          <span style={{ color: breadcrumbActiveColor }}>{guide.category}</span>
        </nav>

        {/* Category badge */}
        <div style={{ marginBottom: 16 }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 20,
            background: badgeBg,
            color: badgeColor,
            fontSize: '.65rem',
            fontWeight: 600,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
          }}>
            {guide.category}
          </span>
        </div>

        {/* H1 — the question */}
        <h1 style={{
          fontSize: 'clamp(1.4rem,3.5vw,2.2rem)',
          color: headingColor,
          fontWeight: 700,
          lineHeight: 1.25,
          marginBottom: 24,
        }}>
          {guide.question}
        </h1>

        {/* Short answer callout */}
        <div style={{
          background: calloutBg,
          border: `1px solid ${calloutBorder}`,
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 40,
        }}>
          <p style={{
            color: calloutText,
            fontSize: '1.05rem',
            lineHeight: 1.75,
            margin: 0,
            fontWeight: 500,
          }}>
            {guide.shortAnswer}
          </p>
        </div>

        {/* Full content */}
        <div
          className="guide-content"
          style={{ color: textColor, fontSize: '.95rem', lineHeight: 1.85 }}
          dangerouslySetInnerHTML={{ __html: guide.content }}
        />

        {/* Tags */}
        <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {guide.tags.map((tag) => (
            <span key={tag} style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: '.7rem',
              color: mutedColor,
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.06)',
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* More Guides */}
        {moreGuides.length > 0 && (
          <section style={{ marginTop: 56, borderTop: `1px solid ${borderColor}`, paddingTop: 40 }}>
            <h2 style={{
              fontSize: 'clamp(1rem,2vw,1.3rem)',
              color: headingColor,
              marginBottom: 20,
              fontWeight: 600,
            }}>
              More Guides
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {moreGuides.map((related) => (
                <Link
                  key={related.slug}
                  href={`/guide/${related.slug}`}
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    padding: '16px 20px',
                    borderRadius: 10,
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    transition: 'border-color .2s',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: badgeBg,
                    color: badgeColor,
                    fontSize: '.6rem',
                    fontWeight: 600,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}>
                    {related.category}
                  </span>
                  <h3 style={{
                    fontSize: '.9rem',
                    color: headingColor,
                    margin: '4px 0',
                    fontWeight: 600,
                    lineHeight: 1.35,
                  }}>
                    {related.question}
                  </h3>
                  <p style={{
                    fontSize: '.78rem',
                    color: mutedColor,
                    margin: '6px 0 0',
                    lineHeight: 1.5,
                  }}>
                    {related.shortAnswer.slice(0, 120)}...
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Browse Genres */}
        <section style={{ marginTop: 48, borderTop: `1px solid ${borderColor}`, paddingTop: 32 }}>
          <h2 style={{
            fontSize: 'clamp(1rem,1.5vw,1.2rem)',
            color: headingColor,
            marginBottom: 16,
            fontWeight: 600,
          }}>
            Browse by Genre
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {GENRE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '.8rem',
                  color: '#FFB347',
                  textDecoration: 'none',
                  background: 'rgba(255,245,232,.04)',
                  border: '1px solid rgba(255,245,232,.08)',
                  transition: 'background .2s, border-color .2s',
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/browse"
              style={{
                display: 'inline-block',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '.8rem',
                color: '#FFB347',
                textDecoration: 'none',
                background: 'rgba(255,245,232,.04)',
                border: '1px solid rgba(255,245,232,.08)',
                transition: 'background .2s, border-color .2s',
              }}
            >
              Browse All
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: `1px solid ${borderColor}`,
          textAlign: 'center',
          color: mutedColor,
          fontSize: '.75rem',
        }}>
          <p>
            Part of the <Link href="/" style={{ color: '#FFB347', textDecoration: 'none' }}>Lumovia</Link> catalog · thousands of free movies, TV shows &amp; anime
          </p>
        </div>
      </div>

      {/* Guide content typography styles */}
      <style>{`
        .guide-content h2 {
          font-size: clamp(1.15rem, 2vw, 1.4rem);
          color: #FFF5E8;
          margin: 2rem 0 0.75rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .guide-content h3 {
          font-size: clamp(1rem, 1.6vw, 1.15rem);
          color: #FFB347;
          margin: 1.5rem 0 0.5rem;
          font-weight: 600;
        }
        .guide-content p {
          margin: 0 0 1rem;
          line-height: 1.85;
        }
        .guide-content ul {
          margin: 0 0 1rem;
          padding-left: 1.5rem;
        }
        .guide-content li {
          margin-bottom: 0.5rem;
          line-height: 1.75;
        }
        .guide-content strong {
          color: rgba(255,245,232,.92);
          font-weight: 600;
        }
        .guide-content a {
          color: #FFB347;
          text-decoration: none;
        }
      `}</style>
    </>
  );
}