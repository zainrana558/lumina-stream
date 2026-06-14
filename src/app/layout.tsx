import type { Metadata } from "next";
import { Cinzel_Decorative, Cinzel, Crimson_Pro, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "@/styles/global.css";

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

const _rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app';
const siteUrl = _rawSiteUrl.startsWith('http') ? _rawSiteUrl : `https://${_rawSiteUrl}`;

export const metadata: Metadata = {
  title: {
    default: "Lumina Stream - Dream, Discover, Stream",
    template: "%s | Lumina Stream",
  },
  description: "Explore a curated collection of movies, TV shows, anime, and cartoons. Trending, popular, and top-rated content updated weekly.",
  metadataBase: new URL(siteUrl),
  alternates: { canonical: siteUrl },
  manifest: '/manifest.json',
  openGraph: {
    title: "Lumina Stream",
    description: "Explore a curated collection of movies, TV shows, anime, and cartoons.",
    type: "website",
    url: siteUrl,
    siteName: "Lumina Stream",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumina Stream",
    description: "Explore a curated collection of movies, TV shows, anime, and cartoons.",
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
    title: 'Lumina Stream',
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
    <html lang="en" suppressHydrationWarning className={`${cinzelDec.variable} ${cinzel.variable} ${crimson.variable} ${jetbrains.variable} ${playfair.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Lumina" />
        <meta name="theme-color" content="#FFB347" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}