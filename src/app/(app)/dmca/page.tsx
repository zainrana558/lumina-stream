import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/dmca`;

export const metadata: Metadata = {
  title: 'DMCA & Copyright Policy - Lumina Stream',
  description: 'Lumina Stream DMCA and copyright policy. Learn about our position as a catalog/discovery platform, DMCA safe harbor compliance, how to file takedown notices, counter-notifications, and our commitment to intellectual property rights.',
  alternates: { canonical: pageUrl },
  openGraph: { type: 'website', url: pageUrl, title: 'DMCA & Copyright Policy - Lumina Stream', description: 'DMCA takedown procedures and copyright policy for Lumina Stream.', siteName: 'Lumina Stream' },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'DMCA & Copyright Policy', item: pageUrl },
  ],
};

const p = { className: 'f-crimson', style: { fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 } as React.CSSProperties };
const ps = { className: 'f-crimson', style: { fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 } as React.CSSProperties };
const h2 = { className: 'f-cinzel', style: { fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 } as React.CSSProperties };
const b = { style: { color: '#FFB347' } as React.CSSProperties };

export default function DmcaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#FFF5E8', marginBottom: 16, letterSpacing: '.02em' }}>DMCA &amp; Copyright Policy</h1>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 12 }}>Last updated: July 7, 2026</p>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 48 }}>Effective date: July 7, 2026</p>

        {/* ── Section 1: Copyright Policy ── */}
        <h2 {...h2}>1. Commitment to Intellectual Property Rights</h2>
        <p {...ps}>
          Lumina Stream (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) deeply respects the intellectual property rights of content creators, copyright holders, and the broader creative community. We expect all users of our Service to share this respect. This DMCA &amp; Copyright Policy (&quot;Policy&quot;) is an integral part of our <Link href="/terms" style={{ color: '#FFB347' }}>Terms of Service</Link> and is incorporated herein by reference. This Policy outlines our procedures for responding to claims of copyright infringement, describes the steps copyright holders may take, and details our compliance with applicable intellectual property laws, including the Digital Millennium Copyright Act (&quot;DMCA&quot;), Title 17, United States Code, Section 512, and equivalent international provisions such as the EU Copyright Directive (Directive 2001/29/EC, as amended by Directive 2019/790) and the UK Copyright, Designs and Patents Act 1988 (as amended).
        </p>

        {/* ── Section 2: Our Position and Service Architecture ── */}
        <h2 {...h2}>2. Our Position and Service Architecture</h2>
        <p {...p}>
          <strong {...b}>2.1 Catalog and Discovery Platform.</strong> <strong {...b}>Lumina Stream does NOT host, store, upload, cache, transcode, distribute, or stream any video files, movies, TV shows, anime, or any other audiovisual content on our servers or infrastructure.</strong> Our Service functions as an informational directory and search tool that aggregates publicly available metadata from authorized third-party databases. We provide links and embeds to content that exists on third-party servers operated by entities entirely unaffiliated with Lumina Stream.
        </p>
        <p {...p}>
          <strong {...b}>2.2 Metadata Sources.</strong> The information we display is sourced exclusively from:
        </p>
        <p {...p}>
          <strong {...b}>TMDB (The Movie Database).</strong> We fetch movie and television metadata — including titles, descriptions, cast information, ratings, posters, and release dates — from TMDB&apos;s publicly accessible API under TMDB&apos;s terms of service and the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0). This data is provided under proper license and is used solely to present an organized catalog of content information.
        </p>
        <p {...p}>
          <strong {...b}>AniList.</strong> We retrieve anime metadata — including titles, synopses, cover images, episode data, and scores — from AniList&apos;s public GraphQL API under the terms of their service.
        </p>
        <p {...p}>
          <strong {...b}>2.3 Third-Party Embed Providers.</strong> When users elect to watch content, they are directed to third-party streaming embeds operated by independent providers. These providers are solely responsible for the content they host, serve, and distribute. Lumina Stream does not control, endorse, monitor, operate, or have any affiliation with these third-party services. Any streaming that occurs happens entirely on the third-party provider&apos;s infrastructure, not ours. We function analogously to a search engine that provides links to content hosted elsewhere.
        </p>
        <p {...ps}>
          <strong {...b}>2.4 No Content on Our Servers.</strong> At no point does any video or audio file pass through, reside on, or originate from Lumina Stream&apos;s servers. Our technical architecture makes it impossible for us to host, modify, or distribute streaming media. We serve only HTML pages, API responses containing metadata, JavaScript, CSS, and static image assets.
        </p>

        {/* ── Section 3: DMCA Safe Harbor Compliance ── */}
        <h2 {...h2}>3. DMCA Safe Harbor Compliance</h2>
        <p {...p}>
          <strong {...b}>3.1 Qualification for Safe Harbor.</strong> Lumina Stream qualifies for the safe harbor protections available under 17 U.S.C. &sect; 512 of the DMCA. We meet all statutory requirements for safe harbor eligibility as follows:
        </p>
        <p {...p}>
          <strong {...b}>3.2 &sect; 512(a) — Transitory Digital Network Communications.</strong> To the extent that our Service transmits, routes, or provides connections for third-party embed content through hyperlinks or embedded references, such transmissions are carried out automatically by our technical systems without human intervention, without modification of the content, and without storing the content for longer than necessary to effect the transmission.
        </p>
        <p {...p}>
          <strong {...b}>3.3 &sect; 512(b) — System Caching.</strong> Our edge caching infrastructure (via Vercel and Cloudflare) caches publicly accessible web pages and API responses containing metadata only. This caching is carried out automatically, does not modify the content, and complies with standard caching protocols including respect for cache-control headers. We do not cache streaming media content.
        </p>
        <p {...p}>
          <strong {...b}>3.4 &sect; 512(c) — Information Residing on Systems at Direction of Users.</strong> To the extent that our Service provides links or embedded references to content hosted by third parties, we do not have actual knowledge that the linked material is infringing, we are not aware of facts or circumstances from which infringing activity is apparent, we do not receive a direct financial benefit from any specific infringing activity, and we act expeditiously to remove or disable access to material upon receiving a valid DMCA takedown notice.
        </p>
        <p {...p}>
          <strong {...b}>3.5 &sect; 512(d) — Information Location Tools.</strong> Our Service functions as an information location tool (directory/index) that refers or links users to third-party content. We do not have actual knowledge that the linked material is infringing, we are not aware of facts or circumstances from which infringing activity is apparent, we do not receive a direct financial benefit from any specific infringing activity that we have the right and ability to control, and we act expeditiously to remove or disable access to the link or embedded reference upon receiving a valid DMCA takedown notice.
        </p>
        <p {...ps}>
          <strong {...b}>3.6 Designated DMCA Agent.</strong> In accordance with &sect; 512(c)(2), Lumina Stream designates a DMCA agent to receive notifications of claimed copyright infringement. Contact information for our designated agent is provided in Section 9 below.
        </p>

        {/* ── Section 4: Takedown Procedure ── */}
        <h2 {...h2}>4. Takedown Procedure</h2>
        <p {...p}>
          Upon receiving a properly formatted DMCA takedown notice that complies with the requirements of 17 U.S.C. &sect; 512(c)(3), we will:
        </p>
        <p {...p}>
          <strong {...b}>1.</strong> Promptly acknowledge receipt of the notification (within 48 hours).
        </p>
        <p {...p}>
          <strong {...b}>2.</strong> Review the notice for compliance with statutory requirements. If the notice is incomplete or does not meet the requirements of &sect; 512(c)(3)(A), we will request additional information from the complainant before taking action.
        </p>
        <p {...p}>
          <strong {...b}>3.</strong> Remove or disable access to the allegedly infringing material referenced in the notice, including disabling links or embeds to the specific third-party providers identified. We will make our best effort to remove or disable access within 5-7 business days of receiving a complete, valid notice.
        </p>
        <p {...p}>
          <strong {...b}>4.</strong> Notify the user or entity, if identifiable, that the content has been removed or disabled.
        </p>
        <p {...ps}>
          <strong {...b}>5.</strong> Forward the complete takedown notice, including the complainant&apos;s contact information, to the affected user or entity so they may file a counter-notification if they believe the removal was in error.
        </p>

        {/* ── Section 5: How to File a DMCA Takedown ── */}
        <h2 {...h2}>5. How to File a DMCA Takedown Notice</h2>
        <p {...p}>
          If you believe that content accessible through Lumina Stream infringes your copyright, you may submit a DMCA takedown notice to our designated DMCA agent. To be valid under 17 U.S.C. &sect; 512(c)(3)(A), your notice must include <strong {...b}>all</strong> of the following elements. Incomplete notices will not be processed:
        </p>
        <p {...p}>
          <strong {...b}>1. Identification of the copyrighted work.</strong> A clear description of the copyrighted work that you claim has been infringed. If multiple works are involved, provide a representative list. Include registration numbers (if registered with the U.S. Copyright Office), the title, author, release date, or any other information that sufficiently identifies the work. If available, provide a URL where the work is legitimately available (e.g., an official streaming platform, the copyright holder&apos;s website, or a retail listing).
        </p>
        <p {...p}>
          <strong {...b}>2. Identification of the infringing material.</strong> The specific URL(s) or location(s) on Lumina Stream where the allegedly infringing material appears. You must identify each instance with sufficient detail for us to locate it. Provide the full URL of the Lumina Stream page (e.g., the exact details page URL). General statements such as &quot;my entire catalog is infringed&quot; or &quot;all content on your site&quot; are insufficient — specific URLs are mandatory.
        </p>
        <p {...p}>
          <strong {...b}>3. Your contact information.</strong> Your full legal name (not a pseudonym or company name without an individual&apos;s name), physical mailing address (P.O. boxes alone are insufficient for the address of the designated agent), telephone number, and a valid email address so that we may reach you and so that we can forward your information to the affected party.
        </p>
        <p {...p}>
          <strong {...b}>4. Good faith statement.</strong> A statement that you have a good faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
        </p>
        <p {...p}>
          <strong {...b}>5. Perjury statement.</strong> A statement, made under penalty of perjury under the laws of the United States of America, that the information provided in the notice is accurate and that you are the copyright owner or are authorized to act on behalf of the copyright owner.
        </p>
        <p {...p}>
          <strong {...b}>6. Physical or electronic signature.</strong> Your physical signature or a valid electronic signature. Typing &quot;/s/&quot; followed by your full legal name constitutes a valid electronic signature under the E-SIGN Act (15 U.S.C. &sect; 7001 et seq.) and the Uniform Electronic Transactions Act (UETA).
        </p>
        <p {...ps}>
          <strong {...b}>Important:</strong> Pursuant to 17 U.S.C. &sect; 512(f), any person who knowingly materially misrepresents that material or activity is infringing, or that material or activity was removed or disabled by mistake or misidentification, shall be liable for any damages, including costs and attorneys&apos; fees, incurred by the alleged infringer, by any copyright owner or copyright owner&apos;s authorized licensee, or by the service provider, who is injured by such misrepresentation as a result of the service provider relying upon such misrepresentation in removing or disabling access to the material or activity claimed to be infringing.
        </p>

        <div style={{ backgroundColor: 'rgba(255,245,232,.05)', border: '1px solid rgba(255,245,232,.1)', borderRadius: 8, padding: '20px 24px', marginBottom: 32 }}>
          <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
{`Subject: DMCA Takedown Notice — Copyright Infringement

To: Lumina Stream DMCA Designated Agent

1. Description of Copyrighted Work:
   [Title of the work, e.g., "Inception" (2010), directed by
    Christopher Nolan. If registered, include U.S. Copyright
    Office Registration #XX-XXXXX. Include a URL where the
    work is legitimately available, e.g., an official platform.]

2. Location of Infringing Material:
   [Full URL(s) on Lumina Stream, e.g.,
    https://lumina-stream-omega.vercel.app/details/27205-inception
    One URL per line. Specific URLs are required.]

3. My Contact Information:
   Name: [Your full legal name — not a pseudonym]
   Address: [Your physical mailing address — not a P.O. box alone]
   Email: [Your email address]
   Phone: [Your telephone number]

4. Good Faith Statement:
   I have a good faith belief that the use of the
   above-referenced material is not authorized by the
   copyright owner, its agent, or the law.

5. Perjury Statement:
   I swear, under penalty of perjury under the laws of the
   United States of America, that the information in this
   notice is accurate and that I am the copyright owner or
   am authorized to act on behalf of the owner of an
   exclusive right that is allegedly infringed.

6. Signature:
   /s/ [Your full legal name]
   Date: [Date]`}
          </p>
        </div>

        {/* ── Section 6: Counter-Notification ── */}
        <h2 {...h2}>6. Counter-Notification Procedure</h2>
        <p {...p}>
          If you believe that your content was wrongly removed or disabled as a result of a DMCA takedown notice, you may file a counter-notification under 17 U.S.C. &sect; 512(g). Your counter-notification must include:
        </p>
        <p {...p}>
          <strong {...b}>1.</strong> Identification of the material that was removed or disabled and the location (URL) where it previously appeared on Lumina Stream.
        </p>
        <p {...p}>
          <strong {...b}>2.</strong> A statement, under penalty of perjury, that you have a good faith belief that the material was removed or disabled as a result of a mistake or misidentification.
        </p>
        <p {...p}>
          <strong {...b}>3.</strong> Your full legal name, physical address, telephone number, and email address.
        </p>
        <p {...p}>
          <strong {...b}>4.</strong> A statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located (or, if you are located outside the United States, the Federal District Court for the judicial district in which Lumina Stream is located), and that you will accept service of process from the person who filed the original DMCA notice or their authorized agent.
        </p>
        <p {...p}>
          <strong {...b}>5.</strong> Your physical or electronic signature.
        </p>
        <p {...ps}>
          Upon receiving a valid counter-notification, we will forward it to the original complainant and restore the removed material within 10-14 business days, unless the complainant files a court action seeking an injunction against the alleged infringer. Filing a false counter-notification may expose you to liability for damages under 17 U.S.C. &sect; 512(f), including attorneys&apos; fees and costs.
        </p>

        {/* ── Section 7: Repeat Infringers ── */}
        <h2 {...h2}>7. Repeat Infringer Policy</h2>
        <p {...p}>
          In accordance with 17 U.S.C. &sect; 512(i)(1)(A), Lumina Stream maintains and implements a policy of terminating access for users or accounts that are determined to be repeat infringers. We track all DMCA notices received, actions taken, and any relevant account activity in connection with each notice.
        </p>
        <p {...p}>
          <strong {...b}>Definition of Repeat Infringer.</strong> For the purposes of this policy, a &quot;repeat infringer&quot; includes: (A) any user or account holder who has been the subject of two (2) or more valid DMCA takedown notices in any rolling 12-month period; (B) any user who has been found by a court of competent jurisdiction to have committed copyright infringement on one or more occasions; or (C) any user who engages in a pattern of activity that demonstrates a disregard for intellectual property rights.
        </p>
        <p {...ps}>
          <strong {...b}>Consequences.</strong> Upon determination that a user is a repeat infringer, we will terminate the user&apos;s account, remove all user-generated content associated with that account, and block the user from creating new accounts. Termination decisions are made at our sole discretion, are final, and are not subject to appeal. We may also report repeat infringers to relevant authorities if required by applicable law.
        </p>

        {/* ── Section 8: International Copyright Compliance ── */}
        <h2 {...h2}>8. International Copyright Compliance</h2>
        <p {...p}>
          <strong {...b}>8.1 European Union.</strong> For users and copyright holders within the European Union, Lumina Stream complies with the EU Copyright Directive (Directive 2001/29/EC, as amended by Directive 2019/790, also known as the &quot;Digital Single Market Directive&quot;). Under this framework, we operate as an information society service provider and benefit from the limitation of liability for mere conduit, caching, and hosting as provided in the E-Commerce Directive (Directive 2000/31/EC, Articles 12-14). We act expeditiously to remove or disable access upon notification of allegedly illegal content.
        </p>
        <p {...p}>
          <strong {...b}>8.2 United Kingdom.</strong> For users and copyright holders in the United Kingdom, Lumina Stream complies with the UK Copyright, Designs and Patents Act 1988 (as amended), including the provisions governing secondary infringement and the liability of service providers. We act in good faith and expeditiously upon receiving valid infringement notices.
        </p>
        <p {...ps}>
          <strong {...b}>8.3 Other Jurisdictions.</strong> We are committed to complying with the copyright laws of all jurisdictions in which we operate or are accessible. If your jurisdiction has specific notice-and-takedown procedures that differ from the DMCA, please contact us and we will endeavor to comply with the applicable local requirements. We respect and will respond to valid takedown notices from any jurisdiction.
        </p>

        {/* ── Section 9: Contact Information ── */}
        <h2 {...h2}>9. Contact Information</h2>
        <p {...p}>
          <strong {...b}>DMCA Designated Agent.</strong> All DMCA takedown notices and counter-notifications should be sent to our designated DMCA agent. You can reach our DMCA agent through the <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page, where our current contact methods are listed. Please include &quot;DMCA Takedown Notice&quot; or &quot;DMCA Counter-Notification&quot; in the subject line of any correspondence.
        </p>
        <p {...p}>
          <strong {...b}>Response Time.</strong> We will acknowledge receipt of all DMCA notices within 48 hours. Valid and complete notices will be processed within 5-7 business days. Incomplete notices will be returned with a request for the missing information.
        </p>
        <p {...ps}>
          <strong {...b}>Direct Takedown at Source.</strong> Because Lumina Stream does not host, store, or serve any streaming content, the most effective and expeditious way to have allegedly infringing material removed at its source is to also send a DMCA notice directly to the third-party embed provider that is serving the content. We will cooperate fully with copyright holders and will promptly remove links or embeds to any content identified in a valid DMCA notice, but removal at the source prevents the content from being accessible through any platform.
        </p>
      </div>
    </>
  );
}