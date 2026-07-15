import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { LANGUAGE_SLUGS } from '@/lib/slug';

export const dynamic = 'force-static';
export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/languages`;

export const metadata: Metadata = {
  title: 'Languages - Browse Movies & TV by Language | Lumovia',
  description:
    'Browse movies and TV shows by language on Lumovia. Discover content in English, Spanish, French, Japanese, Korean, Hindi, Mandarin, and many more languages from around the world.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Browse by Language — Lumovia',
    description:
      'Explore our catalog in over 20 languages. Find movies, TV shows, and anime in English, Japanese, Korean, French, Spanish, Hindi, and more.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: 'Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Browse by Language — Lumovia',
    description: 'Explore our catalog in over 20 languages. Find movies, TV shows, and anime in English, Japanese, Korean, French, Spanish, Hindi, and more.',
    images: [`${siteUrl}/og/og-genres.png`],
  },
};

const LANGUAGE_CATEGORIES = [
  {
    title: 'Germanic',
    languages: [
      { name: 'English', iso: 'en', titles: '85,000+ titles', region: 'Global' },
      { name: 'German', iso: 'de', titles: '8,500+ titles', region: 'Germany, Austria, Switzerland' },
      { name: 'Dutch', iso: 'nl', titles: '2,200+ titles', region: 'Netherlands, Belgium' },
      { name: 'Swedish', iso: 'sv', titles: '3,100+ titles', region: 'Sweden' },
      { name: 'Norwegian', iso: 'no', titles: '1,800+ titles', region: 'Norway' },
      { name: 'Danish', iso: 'da', titles: '1,900+ titles', region: 'Denmark' },
    ],
  },
  {
    title: 'Romance',
    languages: [
      { name: 'French', iso: 'fr', titles: '12,000+ titles', region: 'France, Canada, Belgium, Switzerland' },
      { name: 'Spanish', iso: 'es', titles: '14,000+ titles', region: 'Spain, Latin America, USA' },
      { name: 'Portuguese', iso: 'pt', titles: '7,500+ titles', region: 'Brazil, Portugal' },
      { name: 'Italian', iso: 'it', titles: '6,800+ titles', region: 'Italy, Switzerland' },
      { name: 'Romanian', iso: 'ro', titles: '1,200+ titles', region: 'Romania, Moldova' },
    ],
  },
  {
    title: 'Asian',
    languages: [
      { name: 'Japanese', iso: 'ja', titles: '18,000+ titles', region: 'Japan' },
      { name: 'Korean', iso: 'ko', titles: '12,000+ titles', region: 'South Korea' },
      { name: 'Mandarin Chinese', iso: 'zh', titles: '9,500+ titles', region: 'China, Taiwan, Singapore' },
      { name: 'Hindi', iso: 'hi', titles: '11,000+ titles', region: 'India' },
      { name: 'Thai', iso: 'th', titles: '3,800+ titles', region: 'Thailand' },
      { name: 'Vietnamese', iso: 'vi', titles: '1,500+ titles', region: 'Vietnam' },
    ],
  },
  {
    title: 'Other',
    languages: [
      { name: 'Arabic', iso: 'ar', titles: '3,200+ titles', region: 'Middle East, North Africa' },
      { name: 'Turkish', iso: 'tr', titles: '4,500+ titles', region: 'Turkey' },
      { name: 'Russian', iso: 'ru', titles: '7,000+ titles', region: 'Russia, CIS' },
      { name: 'Polish', iso: 'pl', titles: '2,800+ titles', region: 'Poland' },
      { name: 'Czech', iso: 'cs', titles: '1,600+ titles', region: 'Czech Republic' },
    ],
  },
];

export default function LanguagesPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Languages', item: pageUrl },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Languages',
    description: metadata.description as string,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <div
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: 'clamp(60px,7vw,80px) 20px 60px',
        }}
      >
        {/* Hero */}
        <h1
          className="f-cinzel-dec"
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            color: '#FFF5E8',
            marginBottom: 16,
            letterSpacing: '.02em',
          }}
        >
          Languages
        </h1>
        <p
          className="f-crimson"
          style={{
            fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
            color: 'rgba(255,245,232,.7)',
            lineHeight: 1.8,
            marginBottom: 20,
          }}
        >
          Entertainment speaks every language. Explore our catalog across more than twenty languages and discover stories from every corner of the world, in their original tongue.
        </p>
        <p
          className="f-crimson"
          style={{
            fontSize: 'clamp(.92rem, 1.3vw, 1.05rem)',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.8,
            marginBottom: 48,
          }}
        >
          Language is one of the most powerful lenses for discovering new content. Whether you want to immerse yourself in the poetic dialogue of French cinema, follow the intricate plots of K-Dramas in Korean, experience the emotional depth of Hindi films, or simply find content in your native language, Lumovia makes it effortless. Our catalog spans over twenty languages, each representing a rich tradition of storytelling. Browsing by language opens up entire worlds of entertainment that you might never encounter through genre or popularity filters alone.
          </p>

        {/* Language Categories */}
        {LANGUAGE_CATEGORIES.map((category) => (
          <section key={category.title} style={{ marginBottom: 48 }}>
            <h2
              className="f-cinzel"
              style={{
                fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
                color: '#FFF5E8',
                marginBottom: 20,
              }}
            >
              {category.title}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 20,
              }}
            >
              {category.languages.map((lang) => (
                <Link
                  key={lang.name}
                  href={`/language/${LANGUAGE_SLUGS[lang.iso] || lang.iso.toLowerCase()}`}
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(255,245,232,.04)',
                      border: '1px solid rgba(255,245,232,.08)',
                      borderRadius: 12,
                      padding: '20px 16px',
                      transition: 'background .2s, border-color .2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,245,232,.08)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,245,232,.15)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,245,232,.04)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,245,232,.08)';
                    }}
                  >
                    <div
                      className="f-cinzel"
                      style={{
                        fontSize: '.95rem',
                        color: '#FFB347',
                        marginBottom: 6,
                      }}
                    >
                      {lang.name}
                    </div>
                    <div
                      className="f-crimson"
                      style={{
                        fontSize: '.78rem',
                        color: 'rgba(255,245,232,.7)',
                        marginBottom: 8,
                      }}
                    >
                      {lang.titles}
                    </div>
                    <p
                      className="f-crimson"
                      style={{
                        fontSize: '.78rem',
                        color: 'rgba(255,245,232,.4)',
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {lang.region}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* SEO Text */}
        <section style={{ marginTop: 24 }}>
          <h2
            className="f-cinzel"
            style={{
              fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)',
              color: '#FFF5E8',
              marginBottom: 16,
            }}
          >
            Multilingual Entertainment on Lumovia
          </h2>
          <p
            className="f-crimson"
            style={{
              fontSize: '.88rem',
              color: 'rgba(255,245,232,.4)',
              lineHeight: 1.8,
              marginBottom: 12,
            }}
          >
            Lumovia&apos;s catalog is a multilingual treasure trove. English-language content forms the largest portion of our library with over 85,000 titles spanning Hollywood, British, Australian, and Canadian productions. But the real adventure begins when you explore beyond English — Japanese alone accounts for over 18,000 titles including the world&apos;s most extensive anime collection, while Korean content has surged in popularity with 12,000+ titles covering K-Dramas, Korean cinema, and variety shows. Spanish-language content from both Spain and Latin America totals over 14,000 titles, and Hindi cinema contributes more than 11,000 films from Bollywood and regional Indian industries.
          </p>
          <p
            className="f-crimson"
            style={{
              fontSize: '.88rem',
              color: 'rgba(255,245,232,.4)',
              lineHeight: 1.8,
              marginBottom: 12,
            }}
          >
            Browsing by language is one of the best ways to discover content you would never find through traditional search. Our language filters work across all content types — movies, TV shows, anime, and cartoons — and can be combined with genre, year, and rating filters for precise discovery. Each title page also displays the original language of the content, so you always know what language a film or series was produced in. For language learners, watching content in the target language with subtitles is one of the most effective and enjoyable ways to build comprehension, making our language-browsing features valuable far beyond pure entertainment.
          </p>
        </section>
      </div>
    </>
  );
}