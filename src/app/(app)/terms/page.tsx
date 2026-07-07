import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const dynamic = 'force-static';
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

const p = { className: 'f-crimson', style: { fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 12 } as React.CSSProperties };
const ps = { className: 'f-crimson', style: { fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: 'rgba(255,245,232,.7)', lineHeight: 1.8, marginBottom: 32 } as React.CSSProperties };
const h2 = { className: 'f-cinzel', style: { fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#FFF5E8', marginBottom: 20 } as React.CSSProperties };
const b = { style: { color: '#FFB347' } as React.CSSProperties };

export default function TermsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#FFF5E8', marginBottom: 16, letterSpacing: '.02em' }}>Terms of Service</h1>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 12 }}>Last updated: July 7, 2026</p>
        <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.8, marginBottom: 48 }}>Effective date: July 7, 2026</p>

        {/* ── 1. Agreement to Terms ── */}
        <h2 {...h2}>1. Agreement to Terms</h2>
        <p {...ps}>
          By accessing, browsing, or using Lumina Stream (the &quot;Service,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service (&quot;Terms&quot;), our <Link href="/privacy" style={{ color: '#FFB347' }}>Privacy Policy</Link>, our <Link href="/cookies" style={{ color: '#FFB347' }}>Cookie Policy</Link>, our <Link href="/disclaimer" style={{ color: '#FFB347' }}>Disclaimer</Link>, and our <Link href="/dmca" style={{ color: '#FFB347' }}>DMCA &amp; Copyright Policy</Link>, all of which are incorporated herein by reference and collectively referred to as the &quot;Agreement.&quot; If you do not agree with any part of this Agreement, you must discontinue use of the Service immediately and cease all access to the website. These Terms constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and Lumina Stream. We reserve the right to refuse service to anyone for any reason at any time without notice. Your continued use of the Service following the posting of any changes to these Terms constitutes your informed acceptance of those changes, whether or not you received direct notification.
        </p>

        {/* ── 2. Nature of the Service ── */}
        <h2 {...h2}>2. Nature of the Service</h2>
        <p {...p}>
          <strong {...b}>2.1 Catalog and Discovery Platform.</strong> Lumina Stream is a free, non-commercial catalog and discovery platform designed to help users explore, organize, and track information about movies, TV shows, and anime. The Service aggregates metadata from publicly available, authorized sources, including The Movie Database (TMDB) and AniList, to present rich informational content such as synopses, cast and crew details, ratings, release schedules, and posters. <strong {...b}>Lumina Stream does not host, upload, store, cache, transcode, distribute, or stream any video or audio files on its servers or infrastructure.</strong>
        </p>
        <p {...p}>
          <strong {...b}>2.2 Third-Party Embed Functionality.</strong> The Service may provide embedded streaming players that link to content hosted on third-party websites operated by independent entities entirely unaffiliated with Lumina Stream. When a user elects to use an embedded player, the user is accessing content from that third-party provider&apos;s own servers and infrastructure. Lumina Stream serves solely as an informational directory and does not control, operate, endorse, or assume responsibility for any third-party streaming provider, its content, its legality, or its availability. The inclusion of any embedded player does not constitute an endorsement, partnership, or affiliation of any kind with the respective third-party provider.
        </p>
        <p {...p}>
          <strong {...b}>2.3 No Content Hosting.</strong> At no point does any video, audio, or audiovisual content pass through, reside on, or originate from Lumina Stream&apos;s servers. We do not operate any media servers, CDN nodes, or content delivery infrastructure for streaming media. Our servers serve only HTML, CSS, JavaScript, API responses containing metadata, and static assets (images, fonts, icons). Any streaming that occurs happens exclusively between the user&apos;s browser and the third-party provider&apos;s servers.
        </p>
        <p {...ps}>
          <strong {...b}>2.4 Search Engine / Directory Function.</strong> Lumina Stream functions as a specialized search engine and informational directory, similar in nature to how general-purpose search engines index and link to third-party content across the internet. The Service provides hypertext links and embeds to content that exists elsewhere on the internet. The provision of links or embeds to third-party content does not constitute hosting, distribution, or publication of that content by Lumina Stream.
        </p>

        {/* ── 3. Eligibility and Age Requirements ── */}
        <h2 {...h2}>3. Eligibility and Age Requirements</h2>
        <p {...p}>
          <strong {...b}>3.1 Minimum Age.</strong> You must be at least 13 years of age to use the Service. By using the Service, you represent and warrant that you are at least 13 years old. If you are under 18 years of age, you represent and warrant that your parent or legal guardian has reviewed and agrees to these Terms on your behalf.
        </p>
        <p {...p}>
          <strong {...b}>3.2 Jurisdictional Compliance.</strong> You are solely responsible for ensuring that your use of the Service complies with all applicable local, state, national, and international laws and regulations in your jurisdiction of residence or access. Certain jurisdictions may restrict or prohibit access to certain types of content or third-party streaming services. It is your responsibility to understand and comply with the laws applicable to you. Lumina Stream does not make any representation that the Service or any content accessible through it is appropriate or lawful in all jurisdictions.
        </p>
        <p {...ps}>
          <strong {...b}>3.3 Prohibited Jurisdictions.</strong> If your jurisdiction prohibits accessing third-party streaming services or linking to such services, you must not use the Service. Lumina Stream operates under the principle that linking to publicly available third-party content is lawful, but we do not guarantee this position applies in every jurisdiction worldwide.
        </p>

        {/* ── 4. User Accounts ── */}
        <h2 {...h2}>4. User Accounts</h2>
        <p {...p}>
          <strong {...b}>4.1 Registration.</strong> To access certain features of the Service (such as watchlists, collections, viewing history, and personalized recommendations), you must register an account. Registration requires a valid email address, which is used solely for authentication via Supabase. You are responsible for providing accurate and complete information during registration and for keeping that information up to date.
        </p>
        <p {...p}>
          <strong {...b}>4.2 Account Security.</strong> You are solely responsible for maintaining the confidentiality of your account credentials, including your password and authentication tokens. You must notify us immediately of any unauthorized use of your account or any other breach of security. Lumina Stream will not be liable for any loss or damage arising from your failure to protect your account information. You agree not to share your account credentials with any third party.
        </p>
        <p {...p}>
          <strong {...b}>4.3 One Account Per Person.</strong> Each user is limited to one account. Creating multiple accounts, using automated tools to register accounts, or sharing account credentials with others is strictly prohibited and may result in immediate suspension or termination of all associated accounts without prior notice.
        </p>
        <p {...ps}>
          <strong {...b}>4.4 Account Termination.</strong> We reserve the right to suspend or terminate your account at our sole discretion, with or without cause, and with or without notice. Upon termination, your right to use the Service ceases immediately. Provisions of these Terms that by their nature should survive termination (including but not limited to indemnification, limitation of liability, and disclaimers) will survive.
        </p>

        {/* ── 5. Acceptable Use Policy ── */}
        <h2 {...h2}>5. Acceptable Use Policy</h2>
        <p {...p}>
          You agree to use the Service only for lawful purposes and in accordance with these Terms. The following activities are strictly prohibited:
        </p>
        <p {...p}>
          <strong {...b}>5.1 No Scraping or Automated Extraction.</strong> You may not scrape, crawl, spider, data-mine, or otherwise extract data from the Service through any automated means, including but not limited to bots, scripts, scrapers, or other automated tools, without our prior written consent. We monitor for automated access and reserve the right to block any IP address, user agent, or account that engages in unauthorized data extraction.
        </p>
        <p {...p}>
          <strong {...b}>5.2 No Circumvention of Security Measures.</strong> You may not bypass, disable, circumvent, or interfere with any rate limiting, security measures, access restrictions, content protection mechanisms, or technical protection measures we have in place, including but not limited to Content Security Policy headers, rate limiters, authentication systems, and access controls.
        </p>
        <p {...p}>
          <strong {...b}>5.3 No Illegal Activity.</strong> You may not use the Service in any way that violates any applicable local, state, national, or international law or regulation, including but not limited to copyright law, intellectual property law, and telecommunications law.
        </p>
        <p {...p}>
          <strong {...b}>5.4 No Harmful Code.</strong> You may not transmit, upload, or distribute any malware, viruses, worms, trojans, ransomware, spyware, adware, or other harmful or malicious code through the Service.
        </p>
        <p {...p}>
          <strong {...b}>5.5 No Harassment or Abuse.</strong> You may not use the Service to harass, abuse, threaten, stalk, defame, or otherwise harm other users or any third party.
        </p>
        <p {...p}>
          <strong {...b}>5.6 No Reverse Engineering.</strong> You may not decompile, disassemble, reverse engineer, or otherwise attempt to derive the source code of any part of the Service, or create derivative works based on the Service or its components.
        </p>
        <p {...p}>
          <strong {...b}>5.7 No Commercial Exploitation.</strong> You may not use the Service for any commercial purpose without our express prior written consent, including but not limited to reselling access to the Service, using the Service to drive commercial traffic, or incorporating the Service into any commercial product or service.
        </p>
        <p {...p}>
          <strong {...b}>5.8 No Interference with Service Operation.</strong> You may not attempt to overload, flood, spam, or otherwise interfere with the proper operation of the Service, including but not limited to sending excessive requests to our API endpoints, engaging in denial-of-service attacks, or manipulating any voting, rating, or ranking systems.
        </p>
        <p {...ps}>
          We reserve the right to terminate or suspend your access to the Service immediately, without prior notice or liability, for any conduct that we determine, in our sole discretion, violates these Terms, is harmful to other users, the Service, or third parties, or is otherwise objectionable. Violations may also result in IP-based blocking and reporting to relevant authorities.
        </p>

        {/* ── 6. Intellectual Property ── */}
        <h2 {...h2}>6. Intellectual Property</h2>
        <p {...p}>
          <strong {...b}>6.1 Service Ownership.</strong> The Lumina Stream website, including its design, layout, code, graphics, logos, and original content (excluding third-party metadata), is the intellectual property of Lumina Stream and is protected by applicable copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, create derivative works from, or commercially exploit any part of the Service without our prior written permission.
        </p>
        <p {...p}>
          <strong {...b}>6.2 TMDB Data.</strong> Movie and TV show metadata displayed on the Service is sourced from The Movie Database (TMDB) and is used under the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0). TMDB and the TMDB logo are trademarks of The Movie Database. We provide proper attribution to TMDB as required by the license terms.
        </p>
        <p {...p}>
          <strong {...b}>6.3 AniList Data.</strong> Anime metadata is sourced from AniList and is used in accordance with AniList&apos;s terms of service and licensing provisions. We do not claim ownership over any data provided by AniList.
        </p>
        <p {...p}>
          <strong {...b}>6.4 Third-Party Content Ownership.</strong> All video, audio, and audiovisual content accessible through third-party embeds is owned by and is the sole responsibility of the respective third-party providers and/or the original copyright holders. Lumina Stream claims no ownership, right, title, or interest in any third-party streaming content. Any questions regarding the ownership or legality of such content should be directed to the respective third-party provider or copyright holder.
        </p>
        <p {...ps}>
          <strong {...b}>6.5 User-Generated Content.</strong> By submitting content to the Service — including but not limited to watchlists, collections, ratings, and comments — you grant Lumina Stream a non-exclusive, worldwide, royalty-free, perpetual, irrevocable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such content in connection with the operation and improvement of the Service. You represent and warrant that you have the right to grant this license. You retain any moral rights you may have in your content to the extent permitted by applicable law.
        </p>

        {/* ── 7. Third-Party Content and Embeds ── */}
        <h2 {...h2}>7. Third-Party Content and Embeds</h2>
        <p {...p}>
          <strong {...b}>7.1 No Control Over Third Parties.</strong> The Service may include embedded streaming players provided by third-party services. <strong {...b}>Lumina Stream does not operate, control, endorse, monitor, or have any affiliation with any third-party streaming providers.</strong> We do not host, upload, or stream any video content ourselves. The third-party providers are solely responsible for the content they host, its legality, its availability, and their own compliance with applicable laws.
        </p>
        <p {...p}>
          <strong {...b}>7.2 User Assumes All Risk.</strong> All third-party content accessed through embeds is subject to the terms, privacy policies, and licensing agreements of the respective third-party providers. You access third-party embedded content entirely at your own risk and discretion. <strong {...b}>You are solely responsible for determining whether accessing any particular content through a third-party provider is lawful in your jurisdiction.</strong> Lumina Stream disclaims all liability for any damages, losses, or legal issues arising from your interaction with such content.
        </p>
        <p {...p}>
          <strong {...b}>7.3 No Warranty of Legality.</strong> We make no representations or warranties whatsoever about the legality, accuracy, reliability, quality, availability, or intellectual property status of any third-party embedded content. The presence of a link or embed does not indicate that we have verified the legal status of the content or that we believe the content to be authorized for distribution by the third-party provider.
        </p>
        <p {...ps}>
          <strong {...b}>7.4 Takedown Cooperation.</strong> If you believe any embedded content infringes your rights, please contact us through our <Link href="/dmca" style={{ color: '#FFB347' }}>DMCA &amp; Copyright Policy</Link> page so we can review and take appropriate action, including disabling the link or embed to the identified content. Because we do not host the content ourselves, the most effective remedy is to also contact the third-party provider directly.
        </p>

        {/* ── 8. User Responsibilities Regarding Content ── */}
        <h2 {...h2}>8. User Responsibilities Regarding Content</h2>
        <p {...p}>
          <strong {...b}>8.1 Lawful Use.</strong> You acknowledge and agree that you are solely responsible for ensuring that your use of the Service and any content accessed through third-party embeds complies with all applicable laws in your jurisdiction. This includes but is not limited to copyright law, broadcast regulations, and telecommunications laws.
        </p>
        <p {...p}>
          <strong {...b}>8.2 No Unauthorized Downloading or Recording.</strong> You may not use the Service or any tools, extensions, or third-party software in conjunction with the Service to download, record, capture, rip, store, or otherwise permanently copy any content streamed through third-party embeds, unless you have the express authorization of the copyright holder.
        </p>
        <p {...p}>
          <strong {...b}>8.3 No Circumvention of DRM or Geo-Restrictions.</strong> You may not circumvent, bypass, or defeat any digital rights management (DRM), copy protection, geographic restrictions, or other access control mechanisms employed by third-party content providers.
        </p>
        <p {...ps}>
          <strong {...b}>8.4 Verification of Authorized Sources.</strong> We strongly encourage all users to verify that they are accessing content through legitimate and authorized channels, such as the official streaming platforms, theatrical releases, or broadcast networks for the content in question. Lumina Stream does not verify, endorse, or guarantee the authorization status of any third-party embed provider.
        </p>

        {/* ── 9. DMCA Safe Harbor and Copyright ── */}
        <h2 {...h2}>9. DMCA Safe Harbor and Copyright</h2>
        <p {...p}>
          <strong {...b}>9.1 Safe Harbor Designation.</strong> Lumina Stream complies with the provisions of the Digital Millennium Copyright Act (DMCA), Title 17, United States Code, Section 512, and claims the safe harbor protections available to online service providers under &sect; 512(a)-(d). We do not store, host, or serve any infringing content on our servers. Our role is limited to providing links and embedded directory references to content hosted by third parties.
        </p>
        <p {...p}>
          <strong {...b}>9.2 No Knowledge of Infringement.</strong> We do not have actual knowledge that any material on our Service or accessible through links on our Service infringes copyright. We are not aware of any facts or circumstances from which infringing activity is apparent. When we are notified of specific allegedly infringing material as described in our <Link href="/dmca" style={{ color: '#FFB347' }}>DMCA &amp; Copyright Policy</Link>, we will act expeditiously to remove or disable access to the identified material.
        </p>
        <p {...p}>
          <strong {...b}>9.3 No Financial Benefit from Infringement.</strong> Lumina Stream does not receive a direct financial benefit from any specific act of infringement that is identifiable on our Service. The Service is provided free of charge to users and any advertising revenue is not attributable to the availability of any specific third-party content.
        </p>
        <p {...ps}>
          <strong {...b}>9.4 Designated DMCA Agent.</strong> We have designated a DMCA agent to receive notifications of claimed infringement. Please refer to our <Link href="/dmca" style={{ color: '#FFB347' }}>DMCA &amp; Copyright Policy</Link> for complete contact information and takedown procedures.
        </p>

        {/* ── 10. Disclaimer of Warranties ── */}
        <h2 {...h2}>10. Disclaimer of Warranties</h2>
        <p {...ps}>
          THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE FULLEST EXTENT PERMITTED BY LAW, LUMINA STREAM EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO: (A) IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT; (B) WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; (C) WARRANTIES REGARDING THE ACCURACY, COMPLETENESS, RELIABILITY, OR CURRENTNESS OF ANY METADATA, RATINGS, OR OTHER CONTENT DISPLAYED ON THE SERVICE; (D) WARRANTIES THAT ANY CONTENT ACCESSIBLE THROUGH THIRD-PARTY EMBEDS IS LAWFUL, AUTHORIZED, OR NON-INFRINGING; AND (E) WARRANTIES THAT THE SERVICE IS FREE FROM VIRUSES, MALWARE, OR OTHER HARMFUL COMPONENTS. NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED BY YOU THROUGH THE SERVICE SHALL CREATE ANY WARRANTY NOT EXPRESSLY STATED HEREIN. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF IMPLIED WARRANTIES, SO THE ABOVE EXCLUSIONS MAY NOT APPLY TO YOU IN WHOLE OR IN PART. IN SUCH CASES, OUR LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW.
        </p>

        {/* ── 11. Limitation of Liability ── */}
        <h2 {...h2}>11. Limitation of Liability</h2>
        <p {...ps}>
          TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, LUMINA STREAM AND ITS OPERATORS, CONTRIBUTORS, AFFILIATES, SUCCESSORS, AND ASSIGNS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, EXEMPLARY, OR ANY OTHER DAMAGES WHATSOEVER, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, DATA, GOODWILL, USE, OR OTHER INTANGIBLE LOSSES, REGARDLESS OF WHETHER SUCH DAMAGES ARE BASED ON CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, BREACH OF STATUTORY DUTY, OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. IN NO EVENT SHALL OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE, WHETHER IN CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE, EXCEED THE AMOUNT OF ONE HUNDRED U.S. DOLLARS ($100.00) OR THE EQUIVALENT IN YOUR LOCAL CURRENCY. THIS LIMITATION APPLIES TO ALL CAUSES OF ACTION OR CLAIMS, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, EVEN IF ANY REMEDY FAILS OF ITS ESSENTIAL PURPOSE. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF LIABILITY FOR CONSEQUENTIAL OR INCIDENTAL DAMAGES, SO THE ABOVE LIMITATION MAY NOT APPLY TO YOU.
        </p>

        {/* ── 12. Indemnification ── */}
        <h2 {...h2}>12. Indemnification</h2>
        <p {...ps}>
          You agree to defend, indemnify, and hold harmless Lumina Stream and its operators, contributors, affiliates, successors, and assigns from and against any and all claims, demands, damages, losses, liabilities, costs, and expenses — including reasonable attorneys&apos; fees, expert fees, and litigation costs — arising out of or related to: (A) your use of or inability to use the Service; (B) your violation of these Terms or the Agreement; (C) your violation of any applicable law, regulation, or third-party right, including intellectual property rights; (D) any content you submit, post, transmit, or make available through the Service; (E) your interaction with any third-party content accessible through the Service, including any claims that such content is infringing, unlawful, or otherwise objectionable; (F) any harm caused to any third party as a result of your use of the Service; or (G) any breach of your representations, warranties, or obligations under these Terms. This indemnification obligation will survive the termination of your account and these Terms and is binding upon your heirs, executors, and assigns.
        </p>

        {/* ── 13. No Agency or Partnership ── */}
        <h2 {...h2}>13. No Agency, Partnership, or Joint Venture</h2>
        <p {...ps}>
          Nothing in these Terms or the Agreement shall be construed as creating any agency, partnership, joint venture, franchise, or employment relationship between you and Lumina Stream. You acknowledge that Lumina Stream is not your agent, and you are not the agent of Lumina Stream. No party to these Terms has the authority to bind the other party to any agreement, obligation, or liability. Your relationship with Lumina Stream is that of an independent user of a service, and nothing in these Terms creates any fiduciary duty or obligation of loyalty.
        </p>

        {/* ── 14. Severability ── */}
        <h2 {...h2}>14. Severability</h2>
        <p {...ps}>
          If any provision of these Terms is held by a court of competent jurisdiction to be invalid, illegal, unenforceable, or void, that provision shall be modified to the minimum extent necessary to make it valid and enforceable, or if modification is not possible, shall be severed from these Terms. The severance or modification of any provision shall not affect the validity or enforceability of the remaining provisions of these Terms, which shall continue in full force and effect. The remaining provisions shall be construed as if the invalid, illegal, or unenforceable provision had never been contained herein.
        </p>

        {/* ── 15. Waiver ── */}
        <h2 {...h2}>15. Waiver and Course of Dealing</h2>
        <p {...ps}>
          The failure of Lumina Stream to enforce any right or provision of these Terms at any time shall not constitute a waiver of such right or provision. Any waiver of any provision of these Terms will be effective only if in writing and signed by Lumina Stream. A waiver of any breach of these Terms shall not be deemed a waiver of any subsequent or similar breach. No course of dealing, course of performance, or trade usage shall be used to modify, explain, or supplement any provision of these Terms. Lumina Stream&apos;s rights and remedies under these Terms are cumulative and not exclusive of any other rights or remedies available at law or in equity.
        </p>

        {/* ── 16. Entire Agreement ── */}
        <h2 {...h2}>16. Entire Agreement</h2>
        <p {...ps}>
          These Terms, together with the <Link href="/privacy" style={{ color: '#FFB347' }}>Privacy Policy</Link>, <Link href="/cookies" style={{ color: '#FFB347' }}>Cookie Policy</Link>, <Link href="/disclaimer" style={{ color: '#FFB347' }}>Disclaimer</Link>, and <Link href="/dmca" style={{ color: '#FFB347' }}>DMCA &amp; Copyright Policy</Link>, constitute the entire agreement between you and Lumina Stream regarding the Service and supersede all prior or contemporaneous communications, representations, agreements, understandings, and negotiations, whether oral or written, between you and Lumina Stream relating to the Service. No modification of these Terms shall be effective unless made in accordance with Section 17 below.
        </p>

        {/* ── 17. Modifications ── */}
        <h2 {...h2}>17. Modifications to Terms</h2>
        <p {...ps}>
          We reserve the right to modify, amend, supplement, or replace these Terms at any time at our sole discretion, with or without notice to you. When we make material changes, we will update the &quot;Last updated&quot; and &quot;Effective date&quot; at the top of this page. We may also, at our sole option, notify registered users of significant changes via email or through a prominent notice on the Service. Your continued use of the Service after any such changes constitutes your informed acceptance of the revised Terms, whether or not you received direct notification. It is your sole responsibility to review these Terms periodically for updates. If you do not agree with the modified Terms, you must immediately stop using the Service and, if applicable, delete your account.
        </p>

        {/* ── 18. Governing Law and Dispute Resolution ── */}
        <h2 {...h2}>18. Governing Law and Dispute Resolution</h2>
        <p {...p}>
          <strong {...b}>18.1 Governing Law.</strong> These Terms shall be governed by and construed in accordance with the laws of the United States of America, without regard to its conflict of law principles, and specifically the provisions of the Digital Millennium Copyright Act (17 U.S.C. &sect; 512). To the extent that any dispute involves matters outside the scope of U.S. federal law, the laws of the State of California shall apply.
        </p>
        <p {...p}>
          <strong {...b}>18.2 Binding Arbitration.</strong> Any disputes arising out of or relating to these Terms or the Service shall first be resolved through good-faith negotiation. If negotiation is unsuccessful within 30 days, the dispute shall be submitted to binding arbitration administered under the rules of the American Arbitration Association (AAA). The arbitration shall be conducted by a single arbitrator and shall take place in the English language. The arbitrator&apos;s decision shall be final and binding, and judgment on the arbitration award may be entered in any court of competent jurisdiction.
        </p>
        <p {...p}>
          <strong {...b}>18.3 Class Action Waiver.</strong> You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action. You waive any right to participate in a class action lawsuit or class-wide arbitration against Lumina Stream. If for any reason a claim proceeds in court rather than in arbitration, you and Lumina Stream each waive any right to a jury trial.
        </p>
        <p {...ps}>
          <strong {...b}>18.4 International Users.</strong> For users outside the United States, these Terms shall be governed by U.S. federal law and, where applicable, the laws of the State of California. You consent to the exclusive jurisdiction of the federal and state courts located in the State of California for any matters not subject to arbitration. The provisions of the DMCA safe harbor (17 U.S.C. &sect; 512) shall apply to all users regardless of jurisdiction. The United Nations Convention on Contracts for the International Sale of Goods (CISG) shall not apply to these Terms.
        </p>

        {/* ── 19. Termination ── */}
        <h2 {...h2}>19. Termination</h2>
        <p {...p}>
          <strong {...b}>19.1 By User.</strong> You may stop using the Service at any time. If you have an account, you may request account deletion through the Settings page. Upon account deletion, your personal data will be permanently removed within 30 days in accordance with our <Link href="/privacy" style={{ color: '#FFB347' }}>Privacy Policy</Link>.
        </p>
        <p {...p}>
          <strong {...b}>19.2 By Lumina Stream.</strong> We may suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. We may also discontinue or modify the Service at any time without liability to you.
        </p>
        <p {...ps}>
          <strong {...b}>19.3 Survival.</strong> The following provisions shall survive any termination of these Terms or your account: Sections 1, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, and 19.
        </p>

        {/* ── 20. Assignment ── */}
        <h2 {...h2}>20. Assignment</h2>
        <p {...ps}>
          You may not assign, transfer, or delegate your rights or obligations under these Terms, in whole or in part, without our prior written consent. Any purported assignment without such consent shall be null and void. Lumina Stream may assign its rights and obligations under these Terms without restriction, including to any successor, acquirer, or affiliate. These Terms shall be binding upon and inure to the benefit of the parties, their permitted successors, and permitted assigns.
        </p>

        {/* ── 21. Force Majeure ── */}
        <h2 {...h2}>21. Force Majeure</h2>
        <p {...ps}>
          Lumina Stream shall not be liable for any failure or delay in performing its obligations under these Terms where such failure or delay results from circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, epidemics or pandemics, power outages, internet or telecommunications failures, government actions, orders of domestic or foreign courts or tribunals, or non-performance of third parties. In the event of a force majeure, we will make reasonable efforts to mitigate the impact and resume performance as soon as practicable.
        </p>

        {/* ── 22. Contact ── */}
        <h2 {...h2}>22. Contact</h2>
        <p {...ps}>
          If you have any questions, concerns, or requests regarding these Terms of Service, please reach out through our <Link href="/settings" style={{ color: '#FFB347' }}>Settings</Link> page or our social media channels. For copyright or DMCA-related inquiries, please refer to our <Link href="/dmca" style={{ color: '#FFB347' }}>DMCA &amp; Copyright Policy</Link> page. We will make reasonable efforts to respond to all inquiries within a timely manner.
        </p>
      </div>
    </>
  );
}