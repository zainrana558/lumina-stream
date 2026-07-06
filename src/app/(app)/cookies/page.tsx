import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/cookies`;

export const metadata: Metadata = {
  title: 'Cookie Policy - Lumina Stream',
  description: 'Lumina Stream cookie policy. Learn about essential Supabase auth cookies, third-party embed cookies, local storage usage, and how to manage your cookie preferences.',
  alternates: { canonical: pageUrl },
  openGraph: { type: 'website', url: pageUrl, title: 'Cookie Policy - Lumina Stream', description: 'Learn how Lumina Stream uses cookies and local storage.', siteName: 'Lumina Stream' },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Cookie Policy', item: pageUrl },
  ],
};

export default function CookiePolicyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#FFF5E8', marginBottom: 16, letterSpacing: '.02em' }}>Cookie Policy</h1>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 12 }}>Last updated: July 7, 2026</p>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 48 }}>Effective date: July 7, 2026</p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>1. Introduction</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          Cookies are small text files placed on your device by a website to store information about your browsing session. They help websites remember your preferences, maintain your session, and provide a better user experience. This Cookie Policy explains what cookies Lumina Stream (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) uses, why we use them, and how you can manage them. For more information about how we handle your data generally, please see our <Link href="/privacy" style={{ color: '#FFB347' }}>Privacy Policy</Link>.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>2. Essential Cookies</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          These cookies are strictly necessary for the Service to function. They enable core features such as authentication and session management. <strong style={{ color: '#FFB347' }}>These cookies cannot be disabled</strong> — doing so would prevent you from logging in and using the Service.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>sb-access-token.</strong> Set by Supabase authentication. Contains your JWT access token used to authenticate API requests. Expires after a short period and is automatically refreshed by the refresh token.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>sb-refresh-token.</strong> Set by Supabase authentication. Contains your refresh token used to obtain a new access token when the current one expires. This cookie has a longer lifespan to keep you logged in across sessions.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>profile_id.</strong> Set by Lumina Stream. Stores your currently selected profile identifier so the Service loads the correct profile preferences when you return.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>3. Analytics Cookies</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>We do not use any analytics cookies.</strong> Lumina Stream does not use Google Analytics, GA4, or any other third-party analytics service. We do not track your browsing behavior for analytics purposes, and no analytics cookies are set by our Service.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>4. Advertising Cookies</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>We may display advertisements on our Service.</strong> Advertising partners — including PopAds, Adsterra, PropellerAds, and similar networks — may use cookies and web beacons to serve relevant ads, measure ad performance, and limit how often you see the same ad. These cookies are set by the respective ad networks and are governed by their own privacy policies. You can manage your ad preferences through your browser settings or third-party tools such as the Network Advertising Initiative opt-out page. Please note that opting out of advertising cookies will not remove ads from the Service, but the ads you see may be less relevant to your interests.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>5. Third-Party Cookies</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          When you use the video player on Lumina Stream, the embedded streaming provider (such as vidsrc.fyi, vidsrc.pm, autoembed.co, and others) may set its own cookies on your device. These cookies are governed by the respective provider&apos;s cookie and privacy policies, not ours.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          Additionally, Cloudflare may set <strong style={{ color: '#FFB347' }}>cf_clearance</strong> cookies as part of DDoS protection and bot mitigation. These cookies are necessary for the Service to remain accessible and are set at the infrastructure level. We do not control the behavior of these third-party cookies. If you wish to understand or manage them, you should consult the respective provider&apos;s own policy documentation.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>6. Local Storage</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          In addition to cookies, Lumina Stream uses your browser&apos;s localStorage to store certain preferences and data entirely on your device. This data <strong style={{ color: '#FFB347' }}>is never sent to our servers</strong>. We store the following:
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Theme preference.</strong> Your chosen light or dark mode setting so the site renders in your preferred appearance on return visits.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Notification dismissal.</strong> Records which banners and notifications you have dismissed so they do not reappear unnecessarily.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Viewing progress.</strong> Tracks how far you have watched in a movie or episode, allowing you to resume from where you left off.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>UI preferences.</strong> Other interface settings such as layout choices, filter preferences, and similar customization options.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>7. Managing Cookies</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          You can control and manage cookies through your browser settings. Most browsers allow you to view, delete, or block cookies. The steps vary by browser:
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Chrome:</strong> Settings &rarr; Privacy and security &rarr; Cookies and other site data.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Firefox:</strong> Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Safari:</strong> Preferences &rarr; Privacy &rarr; Manage Website Data.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Edge:</strong> Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies and site data.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          Please note that disabling or blocking essential cookies (sb-access-token, sb-refresh-token, profile_id) will prevent you from logging in and using authenticated features of the Service. Third-party cookies from embed providers can only be managed through your browser&apos;s cookie settings or by not using the video player.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>8. Changes to This Policy</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          We may update this Cookie Policy from time to time to reflect changes in our practices or for legal, regulatory, or operational reasons. Any changes will be posted on this page with a revised &quot;Last updated&quot; date. Continued use of the Service after changes are posted constitutes your acceptance of the updated policy.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>9. Contact Us</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          If you have any questions about this Cookie Policy, reach out through our <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page or social media channels. For comprehensive legal information, please also see our <Link href="/terms" style={{ color: '#FFB347' }}>Terms of Service</Link>, <Link href="/privacy" style={{ color: '#FFB347' }}>Privacy Policy</Link>, <Link href="/disclaimer" style={{ color: '#FFB347' }}>Disclaimer</Link>, and <Link href="/dmca" style={{ color: '#FFB347' }}>DMCA &amp; Copyright Policy</Link>.
        </p>
      </div>
    </>
  );
}