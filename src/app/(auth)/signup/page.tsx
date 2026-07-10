import SignupForm from '@/components/auth/SignupForm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Create Account — Lumina Stream',
  description: 'Create a free Lumina Stream account to unlock watchlists, collections, viewing stats, year-in-review, activity feed, and personalized recommendations across thousands of movies, TV shows, and anime.',
  alternates: { canonical: `${CANONICAL_BASE}/signup` },
};

// Auth pages use Supabase client at component top-level which requires
// runtime env vars — prevent static prerendering at build time.
export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <>
      <style>{`
        .signup-page {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 430px;
          animation: auth-page-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .signup-page::before {
          content: '';
          position: absolute;
          top: 0;
          left: 12%;
          right: 12%;
          height: 2.5px;
          background: linear-gradient(90deg, transparent, #FFB347, #FF6B8A, #8B78FF, #4ECDC4, transparent);
          border-radius: 0 0 2px 2px;
          box-shadow: 0 0 16px rgba(255, 107, 138, 0.4), 0 0 30px rgba(139, 120, 255, 0.2);
          z-index: 1;
        }
        @keyframes auth-page-in {
          from { opacity: 0; transform: scale(0.975) translateY(12px); }
          to { opacity: 1; transform: none; }
        }
        .auth-seo-links { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 16px; }
        .auth-seo-links a { padding: 4px 10px; border-radius: 6px; font-size: .72rem; color: rgba(255,245,232,.4); text-decoration: none; border: 1px solid rgba(255,245,232,.06); }
        .auth-seo-links a:hover { color: #FFB347; border-color: rgba(255,179,71,.2); }
      `}</style>

      <div className="signup-page">
        <SignupForm />
        <nav className="auth-seo-links" aria-label="Explore Lumina Stream">
          <Link href="/browse">Browse</Link>
          <Link href="/movies">Movies</Link>
          <Link href="/tv-shows">TV Shows</Link>
          <Link href="/top-rated">Top Rated</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
    </>
  );
}
