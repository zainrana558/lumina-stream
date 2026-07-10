import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const dynamic = 'force-static';
export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/disclaimer`;

export const metadata: Metadata = {
  title: 'Disclaimer - Lumovia',
  description: 'Lumovia disclaimer. Lumovia is a metadata catalog and discovery platform. We do not host, upload, store, or distribute any video files. All streaming is provided by third-party embed services.',
  alternates: { canonical: pageUrl },
  openGraph: { type: 'website', url: pageUrl, title: 'Disclaimer - Lumovia', description: 'Important disclaimers about Lumovia\'s services, third-party content, and limitations of liability.', siteName: 'Lumovia' },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Disclaimer', item: pageUrl },
  ],
};

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Disclaimer',
  description: metadata.description,
  url: pageUrl,
  isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
  datePublished: '2026-07-07',
  dateModified: '2026-07-07',
};

const ps = { className: 'f-crimson', style: { fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 } as React.CSSProperties };
const h2 = { className: 'f-cinzel', style: { fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 } as React.CSSProperties };
const b = { style: { color: '#FFB347' } as React.CSSProperties };

export default function DisclaimerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#FFF5E8', marginBottom: 16, letterSpacing: '.02em' }}>Disclaimer</h1>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 12 }}>Last updated: July 7, 2026</p>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 48 }}>Effective date: July 7, 2026</p>

        <h2 {...h2}>1. General Disclaimer</h2>
        <p {...ps}>
          The information provided by Lumovia (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) on lumovia-stream-omega.vercel.app (the &quot;Service&quot;) is for general informational and entertainment purposes only. All content on this site is provided &quot;as is&quot; and &quot;as available&quot; without any representations or warranties, express or implied. We make no warranties regarding the completeness, accuracy, reliability, suitability, or availability of the Service or the information, products, services, or related graphics contained on the Service for any purpose. Any reliance you place on such information is therefore strictly at your own risk. This Disclaimer should be read in conjunction with our <Link href="/terms" style={{ color: '#FFB347' }}>Terms of Service</Link> and <Link href="/privacy" style={{ color: '#FFB347' }}>Privacy Policy</Link>.
        </p>

        <h2 {...h2}>2. Not a Hosting Platform</h2>
        <p {...ps}>
          <strong {...b}>Lumovia does NOT host, upload, store, cache, transcode, or distribute any video or audio files.</strong> We are a metadata catalog and discovery platform, functioning as a specialized search engine and informational directory. Our Service aggregates publicly available information about movies, TV shows, and anime from authorized sources such as The Movie Database (TMDB) and AniList, and provides links and embedded references to third-party streaming providers. We do not have any video or audio content on our servers, nor do we control, manage, or operate any streaming infrastructure. Our technical architecture is incapable of hosting or distributing media files.
        </p>

        <h2 {...h2}>3. Third-Party Content</h2>
        <p {...ps}>
          All video streaming accessible through the Service is provided by independent third-party embed providers operated by entities entirely unaffiliated with Lumovia. These providers are not owned, controlled, monitored, or operated by Lumovia. We do not endorse, verify, or take responsibility for the content served by these third-party providers, including but not limited to the accuracy, legality, quality, licensing status, authorization, or availability of any streamed material. <strong {...b}>Accessing third-party content is done entirely at your own risk and discretion.</strong> We strongly encourage users to verify that they are accessing content through legitimate and authorized channels in accordance with applicable laws in their jurisdiction. The inclusion of any third-party embed does not constitute a recommendation, endorsement, or sponsorship of that provider or its content.
        </p>

        <h2 {...h2}>4. User Responsibility for Lawful Use</h2>
        <p {...ps}>
          <strong {...b}>You are solely responsible for determining whether your use of the Service and any content accessed through it is lawful in your jurisdiction.</strong> Laws regarding streaming, linking, and copyright vary significantly between countries, states, and regions. What may be permissible in one jurisdiction may be unlawful in another. Lumovia does not make any representation that the Service or any content accessible through it is appropriate or lawful in all jurisdictions. It is your responsibility to understand and comply with the laws applicable to you, including but not limited to copyright law, broadcasting regulations, and telecommunications regulations. By using the Service, you acknowledge and accept full responsibility for your compliance with all applicable laws.
        </p>

        <h2 {...h2}>5. No Warranty of Content Legality</h2>
        <p {...ps}>
          Lumovia makes no warranty, representation, or guarantee whatsoever regarding the legality, authorization, or licensing status of any content accessible through third-party embeds. The presence of a link or embed does not indicate that we have verified the legal status of the content, that we believe the content to be authorized for distribution by the third-party provider, or that the content is lawful to access in your jurisdiction. Users who are concerned about the legal status of any content should not access it and should instead seek authorized distribution channels.
        </p>

        <h2 {...h2}>6. Accuracy of Metadata</h2>
        <p {...ps}>
          Metadata displayed on the Service — including titles, descriptions, cast and crew information, release dates, ratings, posters, and other details — is sourced from third-party databases, primarily <strong {...b}>TMDB</strong> and <strong {...b}>AniList</strong>. While we strive to present accurate and up-to-date information, we cannot guarantee that all metadata is correct, complete, or current. Errors, omissions, or outdated information may exist due to the nature of relying on external data sources. We are not responsible for any inaccuracies in metadata provided by these external sources, nor do we verify or validate such metadata against primary sources.
        </p>

        <h2 {...h2}>7. External Links</h2>
        <p {...ps}>
          The Service may contain links to third-party websites and services that are not operated or controlled by Lumovia. These links are provided for convenience and reference only, similar to how a search engine provides links to third-party websites. We have no control over the content, privacy policies, terms of service, or practices of any third-party website or service. The inclusion of any link does not imply our endorsement, sponsorship, partnership, affiliation, or recommendation. We advise you to review the terms and privacy policies of any third-party site you visit through links on our Service. We assume no responsibility for any damage or loss caused or alleged to be caused by or in connection with the use of or reliance on any content, goods, or services available on or through any third-party websites.
        </p>

        <h2 {...h2}>8. No Professional Advice</h2>
        <p {...ps}>
          The content on the Service is intended for <strong {...b}>entertainment and informational purposes only</strong>. Nothing on this site should be construed as professional advice of any kind, including but not limited to legal, financial, medical, or other professional advice. Always seek the advice of qualified professionals regarding any specific questions or concerns you may have. No content on this site creates any professional-client, fiduciary, or advisory relationship between you and Lumovia.
        </p>

        <h2 {...h2}>9. Limitation of Liability</h2>
        <p {...ps}>
          To the fullest extent permitted by applicable law, Lumovia, its developers, contributors, affiliates, successors, and assigns shall not be liable for any direct, indirect, incidental, special, consequential, punitive, or exemplary damages, including but not limited to loss of data, profits, goodwill, or other intangible losses, resulting from: (A) your access to or use of (or inability to access or use) the Service; (B) any content obtained through the Service, whether from us or third-party providers, including claims that such content is infringing or unlawful; (C) unauthorized access to or alteration of your transmissions or data; (D) any legal action, claim, or proceeding arising from your use of the Service or any third-party content; or (E) any other matter relating to the Service. This limitation of liability applies whether the alleged liability is based on contract, tort, negligence, strict liability, breach of statutory duty, or any other basis, even if we have been advised of the possibility of such damage. Please see our <Link href="/terms" style={{ color: '#FFB347' }}>Terms of Service</Link> (Section 11) for the full limitation of liability provision, including the cap on total aggregate liability.
        </p>

        <h2 {...h2}>10. Changes to This Disclaimer</h2>
        <p {...ps}>
          We reserve the right to update or modify this Disclaimer at any time at our sole discretion, with or without notice. Changes will be effective immediately upon posting on this page with a revised &quot;Last updated&quot; and &quot;Effective date.&quot; Your continued use of the Service after any changes constitutes your acceptance of the updated Disclaimer. It is your responsibility to review this page periodically for updates.
        </p>

        <h2 {...h2}>11. Contact Us</h2>
        <p {...ps}>
          If you have any questions about this Disclaimer, please refer to our <Link href="/terms" style={{ color: '#FFB347' }}>Terms of Service</Link> and <Link href="/dmca" style={{ color: '#FFB347' }}>DMCA &amp; Copyright Policy</Link> for comprehensive legal information. For direct inquiries, reach out through our <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page or social media channels.
        </p>
      </div>
    </>
  );
}