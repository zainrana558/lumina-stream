import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/disclaimer`;

export const metadata: Metadata = {
  title: 'Disclaimer - Lumina Stream',
  description: 'Lumina Stream disclaimer. Lumina Stream is a metadata catalog and discovery platform. We do not host, upload, store, or distribute any video files. All streaming is provided by third-party embed services.',
  alternates: { canonical: pageUrl },
  openGraph: { type: 'website', url: pageUrl, title: 'Disclaimer - Lumina Stream', description: 'Important disclaimers about Lumina Stream\'s services, third-party content, and limitations of liability.', siteName: 'Lumina Stream' },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Disclaimer', item: pageUrl },
  ],
};

export default function DisclaimerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#FFF5E8', marginBottom: 16, letterSpacing: '.02em' }}>Disclaimer</h1>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 48 }}>Last updated: June 20, 2025</p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>1. General Disclaimer</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          The information provided by Lumina Stream (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) on lumina-stream-omega.vercel.app (the &quot;Service&quot;) is for general informational and entertainment purposes only. All content on this site is provided &quot;as is&quot; and &quot;as available&quot; without any representations or warranties, express or implied. We make no warranties regarding the completeness, accuracy, reliability, suitability, or availability of the Service or the information, products, services, or related graphics contained on the Service for any purpose. Any reliance you place on such information is therefore strictly at your own risk.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>2. Not a Hosting Platform</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>Lumina Stream does NOT host, upload, store, or distribute any video files.</strong> We are a metadata catalog and discovery platform. Our Service aggregates publicly available information about movies and TV shows from sources such as The Movie Database (TMDB) and AniList, and provides links to third-party embed streaming providers. We do not have any video content on our servers, nor do we control, manage, or operate any streaming infrastructure.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>3. Third-Party Content</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          All video streaming accessible through the Service is provided by independent third-party embed providers (such as vidsrc.fyi, vidsrc.pm, autoembed.co, and others). These providers are not owned, controlled, or operated by Lumina Stream.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          We do not endorse, verify, or take responsibility for the content served by these third-party providers, including but not limited to the accuracy, legality, quality, or availability of any streamed material. Accessing third-party content is done entirely at your own risk and discretion. We strongly encourage users to verify that they are accessing content through legitimate and authorized channels in accordance with applicable laws.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>4. Accuracy of Information</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          Metadata displayed on the Service — including titles, descriptions, cast and crew information, release dates, ratings, posters, and other details — is sourced from third-party databases, primarily <strong style={{ color: '#FFB347' }}>TMDB</strong> and <strong style={{ color: '#FFB347' }}>AniList</strong>. While we strive to present accurate and up-to-date information, we cannot guarantee that all metadata is correct, complete, or current. Errors, omissions, or outdated information may exist. We are not responsible for any inaccuracies in metadata provided by these external sources.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>5. External Links</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          The Service may contain links to third-party websites and services that are not operated or controlled by Lumina Stream. These links are provided for convenience and reference only. We have no control over the content, privacy policies, or practices of any third-party website or service. The inclusion of any link does not imply our endorsement, sponsorship, or recommendation. We advise you to review the terms and privacy policies of any third-party site you visit through links on our Service. We assume no responsibility for any damage or loss caused or alleged to be caused by or in connection with the use of or reliance on any content, goods, or services available on or through any third-party websites.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>6. No Professional Advice</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          The content on the Service is intended for <strong style={{ color: '#FFB347' }}>entertainment purposes only</strong>. Nothing on this site should be construed as professional advice of any kind, including but not limited to legal, financial, medical, or other professional advice. Always seek the advice of qualified professionals regarding any specific questions or concerns you may have.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>7. Limitation of Liability</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          To the fullest extent permitted by applicable law, Lumina Stream, its developers, and contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, profits, goodwill, or other intangible losses, resulting from: your access to or use of (or inability to access or use) the Service; any content obtained through the Service, whether from us or third-party providers; unauthorized access to or alteration of your transmissions or data; any other matter relating to the Service. This limitation of liability applies whether the alleged liability is based on contract, tort, negligence, strict liability, or any other basis, even if we have been advised of the possibility of such damage.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>8. Changes to This Disclaimer</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          We reserve the right to update or modify this Disclaimer at any time without prior notice. Changes will be effective immediately upon posting on this page with a revised &quot;Last updated&quot; date. Your continued use of the Service after any changes constitutes your acceptance of the updated Disclaimer.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>9. Contact Us</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          If you have any questions about this Disclaimer, reach out through our <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page or social media channels.
        </p>
      </div>
    </>
  );
}