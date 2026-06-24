import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/privacy`;

export const metadata: Metadata = {
  title: 'Privacy Policy - Lumina Stream',
  description: 'Lumina Stream privacy policy. Learn how we collect, use, and protect your personal information, including data from Supabase authentication, TMDB, AniList, and third-party embed providers.',
  alternates: { canonical: pageUrl },
  openGraph: { type: 'website', url: pageUrl, title: 'Privacy Policy - Lumina Stream', description: 'Learn how Lumina Stream handles your data and protects your privacy.', siteName: 'Lumina Stream' },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Privacy Policy', item: pageUrl },
  ],
};

export default function PrivacyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#FFF5E8', marginBottom: 16, letterSpacing: '.02em' }}>Privacy Policy</h1>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 48 }}>Last updated: June 20, 2025</p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>1. Introduction</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          Lumina Stream (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website at lumina-stream-omega.vercel.app (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Service. We respect your privacy and are committed to protecting your personal data. This policy applies to all visitors, including both authenticated and unauthenticated users.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>2. Information We Collect</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>2.1 Information You Provide.</strong> When you create an account, we collect your email address (used exclusively for authentication via Supabase), profile name, and any content you voluntarily submit such as watchlists, ratings, comments, and collection names. We do not collect payment information — our Service is completely free.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>2.2 Automatically Collected Information.</strong> When you access the Service, we automatically collect your IP address (used for rate limiting via Upstash Redis to prevent abuse), browser type and version, operating system, referring URLs, pages viewed, and visit timestamps. This data is processed at the edge through Cloudflare Workers and is not stored permanently.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>2.3 Cookies and Local Storage.</strong> We use Supabase authentication cookies (sb-access-token, sb-refresh-token) to maintain your session, a profile_id cookie to remember your selected profile, and browser localStorage to store UI preferences, notification dismissal status, and viewing progress. See our <Link href="/cookies" style={{ color: '#FFB347' }}>Cookie Policy</Link> for details.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>3. How We Use Your Information</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          We use your information to: provide and maintain the Service, including authenticating your account via Supabase; personalize your experience through watchlists, collections, and viewing history stored in our Supabase database; improve and optimize the Service based on usage patterns; detect, prevent, and address technical issues, abuse, and security threats; and comply with legal obligations.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          We do <strong style={{ color: '#FFB347' }}>not</strong> sell, rent, or trade your personal information to third parties for marketing purposes.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>4. Third-Party Services</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>The Movie Database (TMDB).</strong> We fetch movie and TV show metadata from TMDB&apos;s public API. TMDB has its own privacy policy at themoviedb.org. Your IP address is transmitted to TMDB when content data is fetched on your behalf.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>AniList.</strong> We fetch anime metadata from AniList&apos;s public GraphQL API. Your IP is transmitted to AniList when anime data is requested. See anilist.co for their privacy policy.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Supabase.</strong> Account authentication and user data are handled by Supabase (supabase.com). Your email and profile data are stored securely in our Supabase instance.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Cloudflare.</strong> We use Cloudflare Workers for edge caching and DDoS protection. Cloudflare may collect IP addresses and request metadata. See cloudflare.com/privacypolicy.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Upstash Redis.</strong> Used exclusively for server-side rate limiting. Your IP is temporarily stored with automatic expiration and is not persisted.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Embed Streaming Providers.</strong> Third-party embed providers (such as vidsrc.fyi, vidsrc.pm, autoembed.co, and others) may set their own cookies and collect data independently. We do not control these services — review their individual privacy policies.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>Advertising Partners.</strong> To support our free service, we may work with advertising partners such as PopAds, Adsterra, PropellerAds, and related networks. These partners may collect anonymized device information, browsing patterns, and interaction data to serve relevant advertisements. Ad networks may set their own cookies and use tracking technologies subject to their respective privacy policies. You can opt out of interest-based advertising through tools provided by the <a href="https://www.networkadvertising.org" target="_blank" rel="noopener noreferrer" style={{ color: '#FFB347' }}>Network Advertising Initiative</a>.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>5. Data Security</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          We implement industry-standard security measures including: HTTPS encryption for all data in transit; secure authentication tokens managed by Supabase with automatic refresh and expiration; Content Security Policy (CSP) headers to prevent XSS and injection attacks; HTTP Strict Transport Security (HSTS); and IP-based rate limiting via Upstash Redis. While we strive to protect your data, no method of electronic storage or transmission is 100% secure.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>6. Data Retention</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          We retain your account data for as long as your account is active. Upon account deletion, personal data is permanently removed within 30 days, except where retention is required by law. Server logs and rate-limiting data are retained for a maximum of 7 days. LocalStorage data is stored on your device only.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>7. Your Rights</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          Depending on your jurisdiction, you may have the right to: access, correct, or delete your personal data; object to or restrict processing; request data portability; and withdraw consent at any time. Under GDPR, you may lodge a complaint with a supervisory authority. Under CCPA, California residents may request data disclosure and opt out of data sale (we do not sell personal information).
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          To exercise these rights, contact us through the <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page or our social media channels. We will respond within 30 days.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>8. Children&apos;s Privacy</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          Our Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If discovered, such data will be deleted promptly.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>9. Changes to This Policy</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          We may update this Privacy Policy periodically. Material changes will be posted on this page with a revised date. Continued use of the Service after changes constitutes acceptance.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>10. Contact Us</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          If you have questions about this Privacy Policy, reach out through our <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page or social media channels.
        </p>
      </div>
    </>
  );
}