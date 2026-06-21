import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/dmca`;

export const metadata: Metadata = {
  title: 'DMCA &amp; Copyright Policy - Lumina Stream',
  description: 'Lumina Stream DMCA and copyright policy. Learn about our position as a catalog/discovery platform, how to file DMCA takedown notices, counter-notifications, and our commitment to intellectual property rights.',
  alternates: { canonical: pageUrl },
  openGraph: { type: 'website', url: pageUrl, title: 'DMCA &amp; Copyright Policy - Lumina Stream', description: 'DMCA takedown procedures and copyright policy for Lumina Stream.', siteName: 'Lumina Stream' },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'DMCA &amp; Copyright Policy', item: pageUrl },
  ],
};

export default function DmcaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#FFF5E8', marginBottom: 16, letterSpacing: '.02em' }}>DMCA &amp; Copyright Policy</h1>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 48 }}>Last updated: June 20, 2025</p>

        {/* ── Section 1: Copyright Policy ── */}
        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>1. Copyright Policy</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          Lumina Stream (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects the intellectual property rights of others and expects our users to do the same. We are committed to complying with the Digital Millennium Copyright Act (&quot;DMCA&quot;), Title 17, United States Code, Section 512, and the corresponding provisions of international copyright law. This policy outlines our procedures for responding to claims of copyright infringement and describes the steps copyright holders may take to have allegedly infringing material removed from our Service.
        </p>

        {/* ── Section 2: Our Position ── */}
        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>2. Our Position</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Lumina Stream is a catalog and discovery platform.</strong> We do NOT host, store, upload, or stream any video files, movies, TV shows, or any other audiovisual content on our servers. Our Service functions as an informational directory that aggregates publicly available metadata from third-party databases, specifically:
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>TMDB (The Movie Database).</strong> We fetch movie and television metadata — including titles, descriptions, cast information, ratings, posters, and release dates — from TMDB&apos;s publicly accessible API. This data is provided under TMDB&apos;s terms of service and is used solely to present an organized catalog of content available elsewhere.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>AniList.</strong> We retrieve anime metadata — including titles, synopses, cover images, episode data, and scores — from AniList&apos;s public GraphQL API under the terms of their service.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>Third-Party Embed Providers.</strong> When users choose to watch content, they are directed to third-party streaming embeds operated by independent providers (such as vidsrc.fyi, vidsrc.pm, autoembed.co, and others). These providers are solely responsible for the content they host and serve. Lumina Stream does not control, endorse, or have any affiliation with these third-party services. Any streaming that occurs happens entirely on the third-party provider&apos;s infrastructure, not ours.
        </p>

        {/* ── Section 3: DMCA Compliance ── */}
        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>3. DMCA Compliance</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          In accordance with 17 U.S.C. &sect; 512 (&quot;Online Copyright Infringement Liability Limitation Act&quot;), Lumina Stream designates a DMCA agent to receive notifications of claimed copyright infringement. Upon receiving a properly formatted DMCA takedown notice that complies with the requirements of &sect; 512(c)(3), we will:
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>1.</strong> Promptly review and acknowledge receipt of the notification.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>2.</strong> Remove or disable access to the allegedly infringing material referenced in the notice, including disabling links to the specific third-party embed providers identified.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>3.</strong> Notify the user or entity that posted or linked to the material, if identifiable, that the content has been removed or disabled.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>4.</strong> Forward the complete takedown notice, including the complainant&apos;s contact information, to the affected user or entity so they may file a counter-notification if they believe the removal was in error.
        </p>

        {/* ── Section 4: How to File a DMCA Takedown ── */}
        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>4. How to File a DMCA Takedown Notice</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          If you believe that content accessible through Lumina Stream infringes your copyright, you may submit a DMCA takedown notice to our designated DMCA agent. To be valid under 17 U.S.C. &sect; 512(c)(3)(A), your notice must include the following elements:
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>1. Identification of the copyrighted work.</strong> A clear description of the copyrighted work that you claim has been infringed. If multiple works are involved, provide a representative list. Include registration numbers, if applicable, or any other information that sufficiently identifies the work (e.g., title, author, publication date, ISBN, or a URL where the work is legitimately available).
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>2. Identification of the infringing material.</strong> The specific URL(s) or location(s) on Lumina Stream where the allegedly infringing material appears. You must identify each instance with sufficient detail for us to locate it (e.g., the full URL of the Lumina Stream page containing the link). General statements such as &quot;my entire catalog is infringed&quot; are insufficient — specific URLs are required.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>3. Your contact information.</strong> Your full legal name, mailing address, telephone number, and email address so that we may reach you regarding the complaint and so that we can forward your information to the affected party.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>4. Good faith statement.</strong> A statement that you have a good faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>5. Perjury statement.</strong> A statement, made under penalty of perjury, that the information provided in the notice is accurate and that you are the copyright owner or authorized to act on behalf of the copyright owner.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>6. Physical or electronic signature.</strong> Your physical signature or a valid electronic signature (e.g., typing &quot;/s/&quot; followed by your full legal name constitutes an electronic signature under the E-SIGN Act and the Uniform Electronic Transactions Act).
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>Sample DMCA Takedown Notice:</strong>
        </p>
        <div style={{ backgroundColor: 'rgba(255,245,232,.05)', border: '1px solid rgba(255,245,232,.1)', borderRadius: 8, padding: '20px 24px', marginBottom: 32 }}>
          <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
{`Subject: DMCA Takedown Notice — Copyright Infringement

To: Lumina Stream DMCA Agent

1. Description of Copyrighted Work:
   [Title of the work, e.g., &quot;Inception&quot; (2010), directed by Christopher Nolan, registered with the U.S. Copyright Office under Registration #XX-XXXXX]

2. Location of Infringing Material:
   [Full URL(s) on Lumina Stream, e.g., https://lumina-stream-omega.vercel.app/details/27205-inception]

3. My Contact Information:
   Name: [Your full legal name]
   Address: [Your mailing address]
   Email: [Your email address]
   Phone: [Your telephone number]

4. Good Faith Statement:
   I have a good faith belief that the use of the above-referenced material is not authorized by the copyright owner, its agent, or the law.

5. Perjury Statement:
   I swear, under penalty of perjury, that the information in this notice is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

6. Signature:
   /s/ [Your full legal name]
   Date: [Date]`}
          </p>
        </div>

        {/* ── Section 5: Counter-Notification ── */}
        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>5. Counter-Notification</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          If you believe that your content was wrongly removed or disabled as a result of a DMCA takedown notice, you may file a counter-notification under 17 U.S.C. &sect; 512(g). Your counter-notification must include:
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>1.</strong> Identification of the material that was removed or disabled and the location (URL) where it previously appeared on Lumina Stream.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>2.</strong> A statement, under penalty of perjury, that you have a good faith belief that the material was removed or disabled as a result of a mistake or misidentification.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>3.</strong> Your full legal name, physical address, telephone number, and email address.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>4.</strong> A statement that you consent to the jurisdiction of the Federal District Court in the district where your address is located (or, if outside the United States, the district where Lumina Stream is located), and that you will accept service of process from the person who filed the original DMCA notice or their agent.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>5.</strong> Your physical or electronic signature.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          Upon receiving a valid counter-notification, we will forward it to the original complainant and restore the removed material within 10–14 business days, unless the complainant files a court action seeking an injunction against the alleged infringer. Please be aware that filing a false counter-notification may expose you to liability under 17 U.S.C. &sect; 512(f).
        </p>

        {/* ── Section 6: Repeat Infringers ── */}
        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>6. Repeat Infringers</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          In accordance with 17 U.S.C. &sect; 512(i)(1)(A), Lumina Stream maintains a policy of terminating access for users or accounts that are determined to be repeat infringers. We track all DMCA notices received and actions taken in connection with each account or user. For the purposes of this policy, a &quot;repeat infringer&quot; is any user or account holder who has been the subject of three (3) or more valid DMCA takedown notices in any rolling 12-month period, or who has been found by a court of competent jurisdiction to have committed copyright infringement.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          Upon determination that a user is a repeat infringer, we will terminate the user&apos;s account, remove all user-generated content associated with that account, and block the user from creating new accounts. Termination decisions are made at our sole discretion and are final.
        </p>

        {/* ── Section 7: Contact Information ── */}
        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>7. Contact Information</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>DMCA Designated Agent.</strong> All DMCA takedown notices and counter-notifications should be sent to our designated DMCA agent. You can reach us through the <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page, where our current contact methods are listed.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>Response Time.</strong> We aim to acknowledge receipt of all DMCA notices within 48 hours and to process valid notices within 5–7 business days. We may request additional information if the notice is incomplete or does not meet the statutory requirements under &sect; 512(c)(3)(A).
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>Important Note.</strong> Because Lumina Stream does not host or store any streaming content, the most effective way to have infringing material removed at its source is to also send a DMCA notice directly to the third-party embed provider that is serving the content. We will cooperate fully with copyright holders and will remove links to any content identified in a valid DMCA notice.
        </p>
      </div>
    </>
  );
}
