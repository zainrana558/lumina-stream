import type { Metadata } from "next";
import "@/styles/global.css";

export const metadata: Metadata = {
  title: {
    default: "Lumina Stream - Dream, Discover, Stream",
    template: "%s | Lumina Stream",
  },
  description: "Explore a curated collection of movies, TV shows, anime, and cartoons.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FFB347" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;500;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400;1,600&family=JetBrains+Mono:wght@400;600&family=Bangers&family=Fredoka+One&family=Playfair+Display:ital,wght@0,700;0,900;1,600;1,900&family=Special+Elite&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
