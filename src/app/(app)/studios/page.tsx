import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const dynamic = 'force-static';
export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/studios`;

export const metadata: Metadata = {
  title: 'Production Studios - Film & TV Studios Directory | Lumovia',
  description:
    'Explore major film and TV production studios including Warner Bros, Disney, Netflix, Pixar, and more. Discover which studios produce your favorite movies, TV shows, anime, and streaming originals on Lumovia.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Production Studios Directory — Lumovia',
    description:
      'Browse our comprehensive directory of production studios from Hollywood majors to streaming originals, animation powerhouses, and international distributors.',
    siteName: 'Lumovia',
  },
};

const STUDIO_CATEGORIES = [
  {
    title: 'Major Studios',
    studios: [
      {
        name: 'Warner Bros.',
        desc: 'One of the oldest and most iconic studios in Hollywood, behind the Harry Potter franchise, The Dark Knight trilogy, Dune, Barbie, and the DC Extended Universe including Aquaman and Wonder Woman.',
      },
      {
        name: 'Disney',
        desc: 'The world\'s largest entertainment company, home to the Marvel Cinematic Universe, Star Wars, Pixar, and beloved animated classics from Snow White to Encanto.',
      },
      {
        name: 'Universal',
        desc: 'Producer of blockbuster franchises including Jurassic World, Fast & Furious, Despicable Me, and the critically acclaimed Oppenheimer. Home to one of the oldest film studios still in operation.',
      },
      {
        name: 'Paramount',
        desc: 'A legendary Hollywood studio behind the Mission: Impossible series, Transformers, Star Trek, A Quiet Place, and the Sonic the Hedgehog films.',
      },
      {
        name: 'Sony / Columbia',
        desc: 'The studio behind the Spider-Man franchise, Jumanji, Ghostbusters, and the Academy Award-winning Everything Everywhere All at Once.',
      },
      {
        name: '20th Century Studios',
        desc: 'Formerly 20th Century Fox, responsible for Avatar, the X-Men franchise, The Simpsons, and decades of classic cinema from Alien to Fight Club.',
      },
    ],
  },
  {
    title: 'Streaming Originals',
    studios: [
      {
        name: 'Netflix',
        desc: 'The pioneer of streaming originals with massive global hits including Stranger Things, Squid Game, The Crown, Bridgerton, and Wednesday.',
      },
      {
        name: 'Amazon Studios',
        desc: 'Producer of award-winning content like The Boys, The Marvelous Mrs. Maisel, The Lord of the Rings: The Rings of Power, and Fleabag.',
      },
      {
        name: 'Apple TV+',
        desc: 'Apple\'s streaming division known for premium quality originals including Ted Lasso, Severance, The Morning Show, and Foundation.',
      },
      {
        name: 'HBO / Max',
        desc: 'Home to prestige television including Game of Thrones, Succession, The Last of Us, The Wire, and a vast library of critically acclaimed series.',
      },
      {
        name: 'Hulu',
        desc: 'A leading streaming platform producing popular originals like The Handmaid\'s Tale, Only Murders in the Building, and Prey.',
      },
      {
        name: 'Disney+',
        desc: 'The streaming home for all Disney, Pixar, Marvel, Star Wars, and National Geographic content, featuring exclusive series like The Mandalorian and Loki.',
      },
    ],
  },
  {
    title: 'Animation',
    studios: [
      {
        name: 'Pixar',
        desc: 'The pioneering computer animation studio behind Toy Story, Finding Nemo, Up, Coco, Inside Out, and Soul — widely regarded as the gold standard for animated storytelling.',
      },
      {
        name: 'DreamWorks',
        desc: 'Creator of beloved animated franchises including Shrek, How to Train Your Dragon, Kung Fu Panda, and Madagascar.',
      },
      {
        name: 'Studio Ghibli',
        desc: 'Japan\'s legendary animation studio founded by Hayao Miyazaki, responsible for Spirited Away, My Neighbor Totoro, Princess Mononoke, and The Boy and the Heron.',
      },
      {
        name: 'Illumination',
        desc: 'The studio behind the Despicable Me and Minions franchise, The Secret Life of Pets, Sing, and the Super Mario Bros. Movie.',
      },
      {
        name: 'Warner Animation',
        desc: 'Producer of The Lego Movie franchise, Happy Feet, and the DC animated universe including the beloved Batman: The Animated Series.',
      },
    ],
  },
  {
    title: 'International',
    studios: [
      {
        name: 'A24',
        desc: 'The acclaimed independent studio behind Everything Everywhere All at Once, Moonlight, Lady Bird, Uncut Gems, Midsommar, and The Lighthouse.',
      },
      {
        name: 'Neon',
        desc: 'A modern indie distributor known for Parasite, Portrait of a Lady on Fire, The Worst Person in the World, and Longlegs.',
      },
      {
        name: 'Pathé',
        desc: 'One of France\'s oldest and most prestigious film studios, co-producer of The Intouchables, The Artist, and countless European cinema classics.',
      },
      {
        name: 'Toho',
        desc: 'Japan\'s largest film studio, home to the Godzilla franchise, the films of Akira Kurosawa, and a dominant force in Japanese cinema for nearly a century.',
      },
      {
        name: 'CJ Entertainment',
        desc: 'South Korea\'s leading entertainment company, distributor of global hits like Parasite, Snowpiercer, and Oldboy that helped fuel the Korean Wave.',
      },
    ],
  },
];

export default function StudiosPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Studios', item: pageUrl },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Production Studios',
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
          Production Studios
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
          Behind every great movie, TV show, and animated feature is a production studio that shaped its vision. Explore the studios that define modern entertainment.
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
          Production studios are the creative engines of the entertainment industry. From the legendary lots of Hollywood&apos;s Golden Age to today&apos;s streaming-first production companies, studios define the stories we watch, the talent they attract, and the visual language of entire eras of cinema. On Lumovia, every title in our catalog is tagged with its production company, making it easy to explore the full filmography of your favorite studios. Whether you want to binge every Marvel film, discover every A24 indie, or explore the complete filmography of Studio Ghibli, our studio directory is your gateway.
        </p>

        {/* Studio Categories */}
        {STUDIO_CATEGORIES.map((category) => (
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
              {category.studios.map((studio) => (
                <div
                  key={studio.name}
                  style={{
                    background: 'rgba(255,245,232,.04)',
                    border: '1px solid rgba(255,245,232,.08)',
                    borderRadius: 12,
                    padding: '20px 16px',
                  }}
                >
                  <div
                    className="f-cinzel"
                    style={{
                      fontSize: '.95rem',
                      color: '#FFB347',
                      marginBottom: 8,
                    }}
                  >
                    {studio.name}
                  </div>
                  <p
                    className="f-crimson"
                    style={{
                      fontSize: '.82rem',
                      color: 'rgba(255,245,232,.55)',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {studio.desc}
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
            Explore Studios on Lumovia
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
            Lumovia&apos;s catalog includes titles from over 100 production studios and distributors worldwide. Our studio directory covers the full spectrum of entertainment production, from the major Hollywood studios that have defined cinema for over a century to the streaming-first production companies that are reshaping how stories are told and distributed. Every studio page aggregates all titles from that producer in our catalog, letting you explore their complete body of work — from blockbusters and franchise installments to independent films and festival darlings.
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
            Whether you are a film student researching the output of A24, an anime fan cataloging every Studio Ghibli masterpiece, or a casual viewer who simply wants to find more movies from the studio behind your favorite film, our production studio directory makes it easy. Studios are also integrated into our title detail pages, so when you browse any movie or show on Lumovia, you can click on its production company to discover more content from the same creative team.
          </p>
        </section>
      </div>
    </>
  );
}