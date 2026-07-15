import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { COUNTRY_SLUGS } from '@/lib/slug';
import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/countries`;

export const metadata: Metadata = {
  title: 'Countries & Film Industries - Global Cinema Directory | Lumovia',
  description:
    'Explore film and TV industries from around the world. Discover content from the United States, Japan, South Korea, France, India, the United Kingdom, and more on Lumovia.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Countries & Film Industries — Lumovia',
    description:
      'Browse our global directory of film industries. Explore movies and TV shows from Hollywood, Bollywood, K-Drama, anime, European cinema, and Latin American productions.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: 'Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Countries & Film Industries — Lumovia',
    description: 'Browse our global directory of film industries. Explore movies and TV shows from Hollywood, Bollywood, K-Drama, anime, European cinema, and Latin American productions.',
    images: [`${siteUrl}/og/og-genres.png`],
  },
};

const COUNTRY_CATEGORIES = [
  {
    title: 'North America',
    countries: [
      { name: 'United States', flag: '🇺🇸', code: 'US', desc: 'Home to Hollywood, the largest film industry in the world by revenue. Dominates global box office with blockbuster franchises, prestige television, and a vast ecosystem of independent cinema from New York to Los Angeles.' },
      { name: 'Canada', flag: '🇨🇦', code: 'CA', desc: 'A major production hub known for its thriving film festivals (Toronto, Vancouver), tax incentive programs that attract Hollywood productions, and acclaimed creators like Denis Villeneuve and Ryan Reynolds.' },
      { name: 'Mexico', flag: '🇲🇽', code: 'MX', desc: 'Rich cinematic tradition from the Golden Age of Mexican cinema to modern masterpieces by directors like Guillermo del Toro, Alfonso Cuarón, and Alejandro González Iñárritu.' },
    ],
  },
  {
    title: 'Europe',
    countries: [
      { name: 'United Kingdom', flag: '🇬🇧', code: 'GB', desc: 'A powerhouse of film and television production, home to Pinewood and Shepperton studios, the James Bond franchise, Harry Potter, and acclaimed TV from the BBC, ITV, and streaming originals.' },
      { name: 'France', flag: '🇫🇷', code: 'FR', desc: 'The birthplace of cinema and home to Cannes, the world\'s most prestigious film festival. French cinema spans art house classics, animated masterpieces, and global hits like The Intouchables.' },
      { name: 'Germany', flag: '🇩🇪', code: 'DE', desc: 'A major European film market with a rich history from Expressionist cinema to modern international co-productions. Known for the Berlin International Film Festival and acclaimed filmmakers like Wim Wenders and Werner Herzog.' },
      { name: 'Spain', flag: '🇪🇸', code: 'ES', desc: 'Producer of acclaimed international cinema and popular series. From Pedro Almodóvar\'s award-winning films to the global phenomenon of La Casa de Papel (Money Heist), Spain\'s film industry continues to captivate worldwide audiences.' },
      { name: 'Italy', flag: '🇮🇹', code: 'IT', desc: 'A historic cornerstone of world cinema, from Federico Fellini and Sergio Leone to Paolo Sorrentino. Italian cinema is celebrated for its neorealist roots, stylish genre films, and the prestigious Venice Film Festival.' },
    ],
  },
  {
    title: 'Asia',
    countries: [
      { name: 'Japan', flag: '🇯🇵', code: 'JP', desc: 'A global entertainment titan. Japan produces the world\'s most influential anime and manga, alongside a prolific live-action film industry spanning samurai epics, J-Horror, and the films of Akira Kurosawa and Hayao Miyazaki.' },
      { name: 'South Korea', flag: '🇰🇷', code: 'KR', desc: 'The epicenter of the Korean Wave (Hallyu). Korean cinema and K-Dramas have achieved massive global popularity, from Parasite\'s historic Best Picture Oscar to hits like Squid Game, Train to Busan, and Crash Landing on You.' },
      { name: 'India', flag: '🇮🇳', code: 'IN', desc: 'Home to Bollywood — the world\'s most prolific film industry by volume. India produces over 2,000 films annually across multiple languages including Hindi, Tamil, Telugu, and Malayalam, with a massive global audience.' },
      { name: 'China', flag: '🇨🇳', code: 'CN', desc: 'One of the largest film markets in the world by box office revenue. Chinese cinema ranges from wuxia epics and historical dramas to modern sci-fi blockbusters like The Wandering Earth.' },
      { name: 'Thailand', flag: '🇹🇭', code: 'TH', desc: 'A rising force in Southeast Asian cinema known for horror, action, and romantic films. Thai cinema gained international acclaim through films like Ong-Bak and the horror anthology The Medium, while Thai BL series have built a massive global fanbase.' },
    ],
  },
  {
    title: 'Latin America',
    countries: [
      { name: 'Brazil', flag: '🇧🇷', code: 'BR', desc: 'The largest film industry in Latin America, known for vibrant urban dramas, social documentaries, and the internationally acclaimed City of God. Brazil also has a fast-growing streaming market and a strong tradition in telenovelas.' },
      { name: 'Argentina', flag: '🇦🇷', code: 'AR', desc: 'A cornerstone of Latin American cinema with a rich tradition of auteur filmmaking. Argentine cinema has won multiple Academy Awards for Best Foreign Language Film and produced celebrated works by directors like Lucrecia Martel.' },
      { name: 'Colombia', flag: '🇨🇴', code: 'CO', desc: 'An emerging film market gaining international recognition for films like Embrace of the Serpent and documentaries exploring the country\'s complex history. Colombia\'s creative industry is expanding rapidly in both film and television.' },
    ],
  },
];

export default function CountriesPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Countries', item: pageUrl },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Countries & Film Industries',
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

      <style>{`
        .country-card {
          background: rgba(255,245,232,.04);
          border: 1px solid rgba(255,245,232,.08);
          border-radius: 12px;
          padding: 20px 16px;
          transition: background .2s, border-color .2s;
        }
        .country-card:hover {
          background: rgba(255,245,232,.07);
          border-color: rgba(255,245,232,.15);
        }
        .country-link {
          color: #FFB347;
          text-decoration: none;
          display: block;
        }
        .country-link:hover {
          text-decoration: underline;
        }
      `}</style>

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
          Countries &amp; Film Industries
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
          Great stories come from every corner of the globe. Explore the film and television industries that shape culture, define genres, and captivate billions of viewers worldwide.
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
          The world of entertainment is no longer confined to a single country or language. From Hollywood blockbusters and British period dramas to Korean thrillers, Japanese anime, Indian musicals, and French art house cinema, Lumovia&apos;s catalog reflects the truly global nature of modern entertainment. Each country on this page represents a unique film industry with its own traditions, genres, and creative voices. Browse any country to discover its most notable productions, or use our region filters to explore cinema from specific parts of the world.
        </p>

        {/* Country Categories */}
        {COUNTRY_CATEGORIES.map((category) => (
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
              {category.countries.map((country) => (
                <div key={country.code} className="country-card">
                  <Link
                    href={`/country/${COUNTRY_SLUGS[country.code] || country.code.toLowerCase()}`}
                    className="country-link"
                  >
                    <div
                      className="f-cinzel"
                      style={{
                        fontSize: '.95rem',
                        color: '#FFB347',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: '1.3rem' }}>{country.flag}</span>
                      {country.name}
                    </div>
                  </Link>
                  <p
                    className="f-crimson"
                    style={{
                      fontSize: '.82rem',
                      color: 'rgba(255,245,232,.55)',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {country.desc}
                  </p>
                </div>
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
            Global Cinema on Lumovia
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
            Lumovia catalogs entertainment from dozens of countries and film industries around the world. Our platform makes it easy to discover content beyond the English-speaking world — from the gripping K-Dramas of South Korea and the visually stunning anime of Japan, to the colorful musicals of Bollywood and the socially conscious cinema of Latin America. Every title in our catalog includes its country of origin, so you can filter and browse by the specific film industries that interest you most.
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
            The rise of streaming platforms has broken down geographic barriers in entertainment. A viewer in Brazil can watch a Japanese anime series with Portuguese subtitles, while a viewer in Germany can enjoy a Korean thriller with German dubbing. Lumovia embraces this global accessibility by cataloging titles from every major film market and making them discoverable through country-based browsing, language filters, and our intelligent recommendation engine. Whether you are exploring world cinema for the first time or you are a dedicated fan of a specific national film industry, our country directory helps you navigate the rich landscape of global entertainment.
          </p>
        </section>
      </div>
    </>
  );
}