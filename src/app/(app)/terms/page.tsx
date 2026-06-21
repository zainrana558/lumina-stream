import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/terms`;

export const metadata: Metadata = {
  title: 'Terms of Service - Lumina Stream',
  description: 'Lumina Stream terms of service. Read the legal terms and conditions governing your use of Lumina Stream, including acceptable use, intellectual property, disclaimers, and limitation of liability.',
  alternates: { canonical: pageUrl },
  openGraph: { type: 'website', url: pageUrl, title: 'Terms of Service - Lumina Stream', description: 'Read the terms and conditions governing your use of Lumina Stream.', siteName: 'Lumina Stream' },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Terms of Service', item: pageUrl },
  ],
};

export default function TermsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#FFF5E8', marginBottom: 16, letterSpacing: '.02em' }}>Terms of Service</h1>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 48 }}>Last updated: June 20, 2025</p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>1. Acceptance of Terms</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          By accessing or using Lumina Stream (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree with any part of these Terms, you must discontinue use of the Service immediately. These Terms constitute a legally binding agreement between you and Lumina Stream. We reserve the right to refuse service to anyone for any reason at any time. Your continued use of the Service following the posting of any changes to these Terms constitutes acceptance of those changes.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>2. Description of Service</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          Lumina Stream is a free catalog and discovery platform designed to help users explore movies, TV shows, and anime. The Service aggregates metadata from publicly available sources, including The Movie Database (TMDB) and AniList, to provide rich information such as synopses, cast details, ratings, and release schedules. <strong style={{ color: '#FFB347' }}>Lumina Stream does not host, upload, store, or distribute any video or audio files.</strong> Any streaming functionality is provided exclusively through third-party embeds as described in Section 6 below. The Service is provided free of charge and is supported as-is without any guarantee of availability or functionality.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>3. User Accounts</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>3.1 Registration.</strong> To access certain features of the Service, such as watchlists, collections, and personalized recommendations, you must register an account. Registration requires a valid email address, which is used solely for authentication via Supabase. You are responsible for providing accurate and complete information during registration and for keeping that information up to date.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>3.2 Account Security.</strong> You are solely responsible for maintaining the confidentiality of your account credentials, including your password and authentication tokens. You must notify us immediately of any unauthorized use of your account or any other breach of security. Lumina Stream will not be liable for any loss or damage arising from your failure to protect your account information.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>3.3 One Account Per Person.</strong> Each user is limited to one account. Creating multiple accounts, using automated tools to register accounts, or sharing account credentials with others is strictly prohibited and may result in suspension or termination of all associated accounts.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>4. Acceptable Use</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          You agree to use the Service only for lawful purposes and in accordance with these Terms. You may not: scrape, crawl, or otherwise extract data from the Service through automated means without prior written consent; use the Service in any way that violates any applicable local, state, national, or international law or regulation; attempt to bypass, disable, or circumvent any rate limiting, security measures, or access restrictions we have in place; transmit any malware, viruses, or other harmful code through the Service; or use the Service to harass, abuse, or harm other users.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          We reserve the right to terminate or suspend your access to the Service immediately, without prior notice or liability, for any conduct that we determine, in our sole discretion, violates these Terms, is harmful to other users, or is otherwise objectionable. Abuse of our API endpoints or intentional manipulation of rate limits will result in IP-based blocking.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>5. Intellectual Property</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>5.1 TMDB Data.</strong> Movie and TV show metadata displayed on the Service is sourced from The Movie Database (TMDB) and is used under the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0). TMDB and the TMDB logo are trademarks of The Movie Database. We provide proper attribution to TMDB as required by the license terms.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: '#FFB347' }}>5.2 AniList Data.</strong> Anime metadata is sourced from AniList and is used in accordance with AniList&apos;s terms of service and licensing provisions. We do not claim ownership over any data provided by AniList.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          <strong style={{ color: '#FFB347' }}>5.3 User-Generated Content.</strong> By submitting content to the Service — including but not limited to watchlists, collections, ratings, and comments — you grant Lumina Stream a non-exclusive, worldwide, royalty-free, perpetual, irrevocable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such content in connection with the operation and improvement of the Service. You retain any moral rights you may have in your content to the extent permitted by applicable law.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>6. Third-Party Content &amp; Embeds</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 }}>
          The Service may include embedded streaming players provided by third-party services (such as vidsrc.fyi, vidsrc.pm, autoembed.co, and others). These embeds are provided for informational and convenience purposes only. <strong style={{ color: '#FFB347' }}>Lumina Stream does not operate, control, or endorse any third-party streaming providers.</strong> We do not host, upload, or stream any video content ourselves.
        </p>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          All third-party content accessed through embeds is subject to the terms, privacy policies, and licensing agreements of the respective third-party providers. You access third-party embedded content at your own risk, and Lumina Stream disclaims all liability for any damages, losses, or legal issues arising from your interaction with such content. We make no representations about the legality, accuracy, reliability, or quality of any third-party embedded content. If you believe any embedded content infringes your rights, please contact us so we can review and take appropriate action.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>7. Disclaimer of Warranties</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE FULLEST EXTENT PERMITTED BY LAW, LUMINA STREAM DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. We do not warrant that the Service will be uninterrupted, timely, secure, or error-free. We do not guarantee the accuracy, completeness, or reliability of any metadata, ratings, or other content displayed on the Service. No advice or information obtained through the Service shall create any warranty not expressly stated in these Terms.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>8. Limitation of Liability</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, LUMINA STREAM AND ITS OPERATORS, CONTRIBUTORS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, REGARDLESS OF WHETHER SUCH DAMAGES ARE BASED ON CONTRACT, TORT, STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. In no event shall our total liability to you for all claims arising out of or relating to the Service exceed the amount of one hundred U.S. dollars ($100.00) or the equivalent in your local currency.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>9. Indemnification</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          You agree to defend, indemnify, and hold harmless Lumina Stream and its operators, contributors, and affiliates from and against any and all claims, demands, damages, losses, liabilities, costs, and expenses — including reasonable attorneys&apos; fees — arising out of or related to: your use of or inability to use the Service; your violation of these Terms; your violation of any rights of a third party, including intellectual property rights; or any content you submit, post, or transmit through the Service. This indemnification obligation will survive the termination of your account and these Terms.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>10. Modifications to Terms</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          We reserve the right to modify, amend, or replace these Terms at any time at our sole discretion. When we make material changes, we will update the &quot;Last updated&quot; date at the top of this page. We may also, at our option, notify registered users of significant changes via email or through a prominent notice on the Service. Your continued use of the Service after any such changes constitutes your acceptance of the revised Terms. It is your responsibility to review these Terms periodically for updates. If you do not agree with the modified Terms, you must stop using the Service and, if applicable, delete your account.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>11. Governing Law</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising out of or relating to these Terms or the Service shall be resolved through good-faith negotiation or, if necessary, through binding arbitration in accordance with applicable arbitration rules. You agree that any legal action or proceeding arising under these Terms will be brought exclusively in the courts of the applicable jurisdiction, and you consent to the personal jurisdiction of such courts. The failure of Lumina Stream to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
        </p>

        <h2 className="f-cinzel" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 }}>12. Contact</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 }}>
          If you have any questions, concerns, or requests regarding these Terms of Service, please reach out through our <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page or our social media channels. We will make reasonable efforts to respond to all inquiries within a timely manner.
        </p>
      </div>
    </>
  );
}