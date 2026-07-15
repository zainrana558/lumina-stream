import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/contact`;

export const metadata: Metadata = {
  title: 'Contact Us — Lumovia Support, Feedback & Bug Reports',
  description:
    'Get in touch with the Lumovia team. Find our support email, social media channels, and information about reporting bugs or submitting feedback for the free streaming catalog.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Contact Lumovia — Support, Feedback & Bug Reports',
    description: 'Reach the Lumovia team for support, feature suggestions, or bug reports. We value community input and respond to all inquiries.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: 'Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Contact Lumovia — Support, Feedback & Bug Reports',
    description: 'Reach the Lumovia team for support, feature suggestions, or bug reports. We value community input and respond to all inquiries.',
    images: [`${siteUrl}/og/og-genres.png`],
  },
};

// Social icons — decorative-only, following the Footer.tsx pattern.
const SOCIAL_CHANNELS = [
  { icon: '𝕏', label: 'Twitter / X' },
  { icon: '📘', label: 'Facebook' },
  { icon: '📸', label: 'Instagram' },
] as const;

export default function ContactPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Contact', item: pageUrl },
    ],
  };

  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Lumovia',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
    mainEntity: {
      '@type': 'Organization',
      name: 'Lumovia',
      url: siteUrl,
      email: 'support@lumovia.stream',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }} />

      <style>{`
        .contact-card { transition: background .2s, border-color .2s; }
        .contact-card:hover { background: rgba(255,245,232,.07); border-color: rgba(255,245,232,.15); }
      `}</style>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 'clamp(60px,7vw,80px) 20px 60px',
      }}>
        {/* Hero */}
        <h1 className="f-cinzel-dec" style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          color: '#FFF5E8',
          marginBottom: 16,
          letterSpacing: '.02em',
        }}>
          Contact Us
        </h1>
        <p className="f-crimson" style={{
          fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
          color: 'rgba(255,245,232,.7)',
          lineHeight: 1.8,
          marginBottom: 20,
        }}>
          We would love to hear from you. Whether you have a question, suggestion, or issue, here are the best ways to reach the Lumovia team.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.92rem, 1.3vw, 1.05rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 48,
        }}>
          Lumovia is built by and for entertainment enthusiasts. Community feedback is the driving force behind our platform improvements, and we genuinely read and consider every message we receive. Below you will find our contact methods, social media presence, and guidance on how to report issues or share ideas. Before reaching out, we recommend checking our FAQ page — most common questions are already answered there.
        </p>

        {/* Contact Methods */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 20,
        }}>
          Get in Touch
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20,
          marginBottom: 56,
        }}>
          {/* Email */}
          <div className="contact-card" style={{
            background: 'rgba(255,245,232,.04)',
            border: '1px solid rgba(255,245,232,.08)',
            borderRadius: 12,
            padding: '20px 16px',
          }}>
            <div className="f-cinzel" style={{
              fontSize: '.95rem',
              color: '#FFB347',
              marginBottom: 10,
            }}>
              Email Support
            </div>
            <p className="f-crimson" style={{
              fontSize: '.85rem',
              color: 'rgba(255,245,232,.55)',
              lineHeight: 1.7,
              marginBottom: 12,
            }}>
              For general inquiries, account issues, or partnership opportunities.
            </p>
            <span className="f-crimson" style={{
              fontSize: '.88rem',
              color: '#FFB347',
              wordBreak: 'break-all' as const,
            }}>
              support@lumovia.stream
            </span>
          </div>

          {/* Social Media */}
          <div className="contact-card" style={{
            background: 'rgba(255,245,232,.04)',
            border: '1px solid rgba(255,245,232,.08)',
            borderRadius: 12,
            padding: '20px 16px',
          }}>
            <div className="f-cinzel" style={{
              fontSize: '.95rem',
              color: '#FFB347',
              marginBottom: 10,
            }}>
              Social Media
            </div>
            <p className="f-crimson" style={{
              fontSize: '.85rem',
              color: 'rgba(255,245,232,.55)',
              lineHeight: 1.7,
              marginBottom: 12,
            }}>
              Follow us for platform updates, new feature announcements, and community highlights.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              {SOCIAL_CHANNELS.map(ch => (
                <span
                  key={ch.label}
                  aria-label={ch.label}
                  title={ch.label}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '.85rem',
                    background: '#0C091A',
                    boxShadow: '3px 3px 8px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.2),inset 0 1px 0 rgba(255,255,255,.04)',
                    color: 'rgba(255,245,232,.35)',
                    cursor: 'default',
                  }}
                >
                  {ch.icon}
                </span>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="contact-card" style={{
            background: 'rgba(255,245,232,.04)',
            border: '1px solid rgba(255,245,232,.08)',
            borderRadius: 12,
            padding: '20px 16px',
          }}>
            <div className="f-cinzel" style={{
              fontSize: '.95rem',
              color: '#FFB347',
              marginBottom: 10,
            }}>
              Check Our FAQ
            </div>
            <p className="f-crimson" style={{
              fontSize: '.85rem',
              color: 'rgba(255,245,232,.55)',
              lineHeight: 1.7,
              marginBottom: 12,
            }}>
              Most questions are already answered in our comprehensive FAQ, covering accounts, content, devices, and legal topics.
            </p>
            <Link href="/faq" style={{
              color: '#FFB347',
              textDecoration: 'none',
              fontSize: '.88rem',
            }}>
              Visit FAQ Page →
            </Link>
          </div>
        </div>

        {/* Bug Reports & Feedback */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 20,
        }}>
          Bug Reports &amp; Feedback
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 56 }}>
          <div style={{
            background: 'rgba(255,245,232,.04)',
            border: '1px solid rgba(255,245,232,.08)',
            borderRadius: 12,
            padding: '20px 16px',
          }}>
            <h3 className="f-cinzel" style={{
              fontSize: '.95rem',
              color: '#FFF5E8',
              marginBottom: 10,
            }}>
              Found a Bug?
            </h3>
            <p className="f-crimson" style={{
              fontSize: '.85rem',
              color: 'rgba(255,245,232,.55)',
              lineHeight: 1.7,
              margin: 0,
            }}>
              If you encounter a bug, broken page, incorrect data, or any unexpected behavior on Lumovia, please email us at <span style={{ color: '#FFB347' }}>support@lumovia.stream</span> with a description of the issue, the URL where it occurred, and your browser/device information. Screenshots are always helpful. We investigate and fix reported bugs as a top priority.
            </p>
          </div>
          <div style={{
            background: 'rgba(255,245,232,.04)',
            border: '1px solid rgba(255,245,232,.08)',
            borderRadius: 12,
            padding: '20px 16px',
          }}>
            <h3 className="f-cinzel" style={{
              fontSize: '.95rem',
              color: '#FFF5E8',
              marginBottom: 10,
            }}>
              Have a Suggestion?
            </h3>
            <p className="f-crimson" style={{
              fontSize: '.85rem',
              color: 'rgba(255,245,232,.55)',
              lineHeight: 1.7,
              margin: 0,
            }}>
              We love hearing ideas for new features, content categories, or improvements. Many of our most popular features — including collections, the Year in Review, and genre portal redesigns — originated from community suggestions. Send your ideas to <span style={{ color: '#FFB347' }}>support@lumovia.stream</span> and we will add them to our development roadmap for consideration.
            </p>
          </div>
          <div style={{
            background: 'rgba(255,245,232,.04)',
            border: '1px solid rgba(255,245,232,.08)',
            borderRadius: 12,
            padding: '20px 16px',
          }}>
            <h3 className="f-cinzel" style={{
              fontSize: '.95rem',
              color: '#FFF5E8',
              marginBottom: 10,
            }}>
              Content Corrections
            </h3>
            <p className="f-crimson" style={{
              fontSize: '.85rem',
              color: 'rgba(255,245,232,.55)',
              lineHeight: 1.7,
              margin: 0,
            }}>
              Since our data is sourced from TMDB and AniList, corrections to titles, cast information, or images should be submitted directly to those platforms. TMDB and AniList both allow community contributions, and their updates will automatically reflect on Lumovia during our regular data syncs. Contact us only if you believe there is a display issue on our end.
            </p>
          </div>
        </div>

        {/* Response Times */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 20,
        }}>
          What to Expect
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 20,
          marginBottom: 56,
        }}>
          {[
            { label: 'General Inquiries', value: '1–3 business days' },
            { label: 'Bug Reports', value: 'Acknowledged within 24 hours' },
            { label: 'Feature Requests', value: 'Reviewed weekly' },
            { label: 'Partnership Inquiries', value: '3–5 business days' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(255,245,232,.04)',
              border: '1px solid rgba(255,245,232,.08)',
              borderRadius: 12,
              padding: '20px 16px',
            }}>
              <div className="f-cinzel" style={{
                fontSize: '.9rem',
                color: '#FFB347',
                marginBottom: 8,
              }}>
                {item.label}
              </div>
              <p className="f-crimson" style={{
                fontSize: '.82rem',
                color: 'rgba(255,245,232,.55)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* SEO Text */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 16,
        }}>
          Reaching the Lumovia Team
        </h2>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 16,
        }}>
          Lumovia is a community-driven platform, and our users are at the heart of every decision we make. Whether you have discovered a bug that needs fixing, a feature that would improve your experience, or simply want to share your thoughts about the platform, we are here to listen. Our team reviews every piece of feedback and uses it to shape the future of Lumovia.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 0,
        }}>
          For the fastest resolution, we recommend checking our FAQ page first — it covers over twenty common questions about accounts, content, ratings, devices, and legal matters. If you still need assistance, email is the most reliable way to reach us. We aim to respond to all inquiries within one to three business days, with bug reports prioritized for faster acknowledgment. Thank you for being part of the Lumovia community and helping us build the best free streaming catalog on the web.
        </p>
      </div>
    </>
  );
}