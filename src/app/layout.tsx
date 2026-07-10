import type { Metadata } from "next";
import { Cinzel_Decorative, Cinzel, Crimson_Pro, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "@/styles/global.css";
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const cinzelDec = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-cinzel-dec",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lumovia — Free Movies, TV Shows & Anime",
    template: "%s | Lumovia",
  },
  description: "Stream thousands of free movies, TV shows, anime, and cartoons on Lumovia. Discover trending, top-rated, and new releases updated daily.",
  metadataBase: new URL(CANONICAL_BASE),
  alternates: { languages: { 'x-default': CANONICAL_BASE, 'en-US': CANONICAL_BASE } },
  manifest: '/manifest.json',
  openGraph: {
    title: "Lumovia",
    description: "Free movies, TV shows, anime & cartoons on Lumovia.",
    type: "website",
    url: CANONICAL_BASE,
    siteName: "Lumovia",
    locale: "en_US",
    images: [{ url: `${CANONICAL_BASE}/og/og-movies.png`, width: 1344, height: 768, alt: "Lumovia - Dream, Discover, Stream" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumovia",
    description: "Free movies, TV shows, anime & cartoons on Lumovia.",
    images: [`${CANONICAL_BASE}/og/og-movies.png`],
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lumovia',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US" suppressHydrationWarning className={`${cinzelDec.variable} ${cinzel.variable} ${crimson.variable} ${jetbrains.variable} ${playfair.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Lumovia" />
        <meta name="theme-color" content="#FFB347" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="google-site-verification" content="IZ_kgkZCobezDHfENC4rcTL_eNcV1i71jvcEVmTRrlc" />
        <meta name="google-site-verification" content="7GLDADu8cHgC3DgA2pmUpHQoXEgehwnk3dLXtedP-F4" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Lumovia',
              url: CANONICAL_BASE,
              logo: `${CANONICAL_BASE}/logo.svg`,
              sameAs: ['https://github.com/zainrana558'],
              description: 'Lumovia is a free streaming catalog and content discovery platform for movies, TV shows, anime, and cartoons, powered by TMDB and AniList.',
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Lumovia',
              url: CANONICAL_BASE,
              description: 'Free streaming catalog — discover movies, TV shows, anime, and cartoons. Browse thousands of titles with ratings, trailers, cast info, and episode guides.',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${CANONICAL_BASE}/browse?search={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
