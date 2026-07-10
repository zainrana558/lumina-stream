import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const dynamic = 'force-static';
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

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Privacy Policy',
  description: metadata.description,
  url: pageUrl,
  isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  datePublished: '2026-07-07',
  dateModified: '2026-07-07',
};

const p = { className: 'f-crimson', style: { fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 } as React.CSSProperties };
const ps = { className: 'f-crimson', style: { fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 } as React.CSSProperties };
const h2 = { className: 'f-cinzel', style: { fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 } as React.CSSProperties };
const b = { style: { color: '#FFB347' } as React.CSSProperties };

export default function PrivacyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#FFF5E8', marginBottom: 16, letterSpacing: '.02em' }}>Privacy Policy</h1>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 12 }}>Last updated: July 7, 2026</p>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 48 }}>Effective date: July 7, 2026</p>

        <h2 {...h2}>1. Introduction</h2>
        <p {...ps}>
          Lumina Stream (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website at lumina-stream-omega.vercel.app (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Service. We respect your privacy and are committed to protecting your personal data. This policy applies to all visitors, including both authenticated and unauthenticated users, and is incorporated into our <Link href="/terms" style={{ color: '#FFB347' }}>Terms of Service</Link> by reference. Please also review our <Link href="/cookies" style={{ color: '#FFB347' }}>Cookie Policy</Link> for information about how we use cookies and similar technologies.
        </p>

        <h2 {...h2}>2. Information We Collect</h2>
        <p {...p}>
          <strong {...b}>2.1 Information You Provide.</strong> When you create an account, we collect your email address (used exclusively for authentication via Supabase), profile name, and any content you voluntarily submit such as watchlists, ratings, comments, and collection names. We do not collect payment information — our Service is completely free. We do not require your real name, date of birth, or physical address.
        </p>
        <p {...p}>
          <strong {...b}>2.2 Automatically Collected Information.</strong> When you access the Service, we automatically collect your IP address (used for rate limiting via Upstash Redis to prevent abuse), browser type and version, operating system, referring URLs, pages viewed, and visit timestamps. This data is processed at the edge through Cloudflare Workers and Vercel edge functions and is not stored permanently. IP addresses are used solely for security and abuse prevention purposes, not for tracking or profiling individual users.
        </p>
        <p {...ps}>
          <strong {...b}>2.3 Cookies and Local Storage.</strong> We use Supabase authentication cookies (sb-access-token, sb-refresh-token) to maintain your session, a profile_id cookie to remember your selected profile, and browser localStorage to store UI preferences, notification dismissal status, viewing progress, and legal disclaimer dismissal status. See our <Link href="/cookies" style={{ color: '#FFB347' }}>Cookie Policy</Link> for full details.
        </p>

        <h2 {...h2}>3. How We Use Your Information</h2>
        <p {...ps}>
          We use your information to: provide and maintain the Service, including authenticating your account via Supabase; personalize your experience through watchlists, collections, and viewing history stored in our Supabase database; improve and optimize the Service based on aggregate, anonymized usage patterns; detect, prevent, and address technical issues, abuse, and security threats; and comply with legal obligations, including responding to valid DMCA takedown notices and law enforcement requests. We do <strong {...b}>not</strong> sell, rent, or trade your personal information to third parties for marketing purposes. We do <strong {...b}>not</strong> use your personal information to build advertising profiles or to serve targeted advertisements based on your viewing history.
        </p>

        <h2 {...h2}>4. Third-Party Services</h2>
        <p {...p}>
          <strong {...b}>The Movie Database (TMDB).</strong> We fetch movie and TV show metadata from TMDB&apos;s public API under the Creative Commons Attribution-ShareAlike 4.0 International License. TMDB has its own privacy policy at themoviedb.org. Your IP address is transmitted to TMDB when content data is fetched on your behalf by our server.
        </p>
        <p {...p}>
          <strong {...b}>AniList.</strong> We fetch anime metadata from AniList&apos;s public GraphQL API under their terms of service. Your IP is transmitted to AniList when anime data is requested by our server. See anilist.co for their privacy policy.
        </p>
        <p {...p}>
          <strong {...b}>Supabase.</strong> Account authentication and user data are handled by Supabase (supabase.com). Your email and profile data are stored securely in our Supabase instance. See supabase.com/privacy for their privacy policy.
        </p>
        <p {...p}>
          <strong {...b}>Cloudflare.</strong> We use Cloudflare Workers for edge caching and DDoS protection. Cloudflare may collect IP addresses and request metadata. See cloudflare.com/privacypolicy for their privacy policy.
        </p>
        <p {...p}>
          <strong {...b}>Upstash Redis.</strong> Used exclusively for server-side rate limiting. Your IP is temporarily stored with automatic expiration and is not persisted, aggregated, or used for any purpose other than rate limiting.
        </p>
        <p {...p}>
          <strong {...b}>Embed Streaming Providers.</strong> Third-party embed providers (such as vidsrc.fyi, vidsrc.pm, autoembed.co, and others) are independent services operated by entities unaffiliated with Lumina Stream. These providers may set their own cookies and collect data independently. We do not control these services and have no visibility into their data practices — review their individual privacy policies before using them. Please see our <Link href="/disclaimer" style={{ color: '#FFB347' }}>Disclaimer</Link> for our full position on third-party content.
        </p>
        <p {...ps}>
          <strong {...b}>Advertising Partners.</strong> To support our free service, we may work with advertising partners such as PopAds, Adsterra, PropellerAds, and related networks. These partners may collect anonymized device information, browsing patterns, and interaction data to serve relevant advertisements. Ad networks may set their own cookies and use tracking technologies subject to their respective privacy policies. You can opt out of interest-based advertising through tools provided by the <a href="https://www.networkadvertising.org" target="_blank" rel="noopener noreferrer" style={{ color: '#FFB347' }}>Network Advertising Initiative</a>.
        </p>

        <h2 {...h2}>5. Data Security</h2>
        <p {...ps}>
          We implement industry-standard security measures including: HTTPS encryption for all data in transit; secure authentication tokens managed by Supabase with automatic refresh and expiration; Content Security Policy (CSP) headers to prevent XSS and injection attacks; HTTP Strict Transport Security (HSTS) with preload; X-Content-Type-Options: nosniff headers; Referrer-Policy: strict-origin-when-cross-origin; Permissions-Policy restricting camera, microphone, and geolocation access; IP-based rate limiting via Upstash Redis to prevent abuse; and edge-level DDoS protection via Cloudflare. While we strive to protect your data, no method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2 {...h2}>6. Data Retention</h2>
        <p {...ps}>
          We retain your account data for as long as your account is active. Upon account deletion, personal data is permanently removed within 30 days, except where retention is required by law (e.g., in response to a valid legal process or to resolve disputes). Server logs and rate-limiting data are retained for a maximum of 7 days and are not used for any purpose beyond security and abuse prevention. LocalStorage data is stored on your device only and can be cleared at any time through your browser settings.
        </p>

        <h2 {...h2}>7. Your Rights</h2>
        <p {...ps}>
          Depending on your jurisdiction, you may have the right to: access, correct, or delete your personal data; object to or restrict processing; request data portability; and withdraw consent at any time. Under the EU General Data Protection Regulation (GDPR), you have the right to lodge a complaint with a supervisory authority and to receive a copy of your personal data in a structured, commonly used, and machine-readable format. Under the California Consumer Privacy Act (CCPA), California residents may request data disclosure and opt out of data sale (we do not sell personal information). Under other applicable laws, additional rights may be available. To exercise these rights, contact us through the <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page or our social media channels. We will respond within 30 days.
        </p>

        <h2 {...h2}>8. Children&apos;s Privacy</h2>
        <p {...ps}>
          Our Service is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that we have inadvertently collected personal information from a child under 13, we will delete such information promptly. By using the Service, you represent and warrant that you are at least 13 years old, or if you are between 13 and 18, that your parent or legal guardian has reviewed and consents to this Privacy Policy on your behalf. Please see our <Link href="/terms" style={{ color: '#FFB347' }}>Terms of Service</Link> (Section 3) for the full eligibility requirements.
        </p>

        <h2 {...h2}>9. Legal Disclosures</h2>
        <p {...ps}>
          We may disclose your personal information if required to do so by law, including in response to a valid court order, subpoena, or other legal process; to comply with applicable law, regulation, or legal process; to cooperate with law enforcement investigations; to establish, exercise, or defend our legal rights; or to protect the safety of our users, the public, or Lumina Stream. We will notify affected users of legal disclosures to the extent permitted by law, unless we are legally prohibited from doing so.
        </p>

        <h2 {...h2}>10. Changes to This Policy</h2>
        <p {...ps}>
          We may update this Privacy Policy periodically. Material changes will be posted on this page with a revised &quot;Last updated&quot; and &quot;Effective date.&quot; We may also notify registered users of significant changes via email or through a prominent notice on the Service. Continued use of the Service after changes constitutes your acceptance of the updated Privacy Policy. It is your responsibility to review this page periodically for updates.
        </p>

        <h2 {...h2}>11. Contact Us</h2>
        <p {...ps}>
          If you have questions about this Privacy Policy or wish to exercise your data rights, reach out through our <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page or social media channels. For comprehensive legal information, please also see our <Link href="/terms" style={{ color: '#FFB347' }}>Terms of Service</Link>, <Link href="/disclaimer" style={{ color: '#FFB347' }}>Disclaimer</Link>, and <Link href="/dmca" style={{ color: '#FFB347' }}>DMCA &amp; Copyright Policy</Link>.
        </p>
      </div>
    </>
  );
}