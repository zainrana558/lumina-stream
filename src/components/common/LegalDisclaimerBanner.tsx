'use client';

import Link from 'next/link';
import { useState } from 'react';

/**
 * LegalDisclaimerBanner — shown below the video player iframe.
 * Reinforces that Lumovia does not host content and that
 * users are responsible for verifying legality in their jurisdiction.
 * Dismissible (stored in localStorage).
 */
export default function LegalDisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('lumina_legal_disclaimer_dismissed', '1');
    } catch {
      // localStorage may be unavailable
    }
  };

  return (
    <div
      style={{
        background: 'rgba(255,179,71,0.08)',
        border: '1px solid rgba(255,179,71,0.15)',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '0.75rem',
          lineHeight: 1.5,
          color: 'rgba(255,245,232,.5)',
          flex: 1,
          minWidth: 200,
        }}
      >
        <strong style={{ color: 'rgba(255,179,71,.7)' }}>Notice:</strong> Content is
        provided by third-party providers not operated by Lumovia. We do not host
        or stream any files. You are responsible for verifying that your use complies
        with local laws.{' '}
        <Link
          href="/disclaimer"
          style={{ color: 'rgba(255,179,71,.7)', textDecoration: 'underline' }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Disclaimer
        </Link>
        {' · '}
        <Link
          href="/dmca"
          style={{ color: 'rgba(255,179,71,.7)', textDecoration: 'underline' }}
          target="_blank"
          rel="noopener noreferrer"
        >
          DMCA
        </Link>
      </p>
      <button
        onClick={handleDismiss}
        style={{
          background: 'rgba(255,179,71,0.15)',
          border: '1px solid rgba(255,179,71,0.25)',
          color: 'rgba(255,245,232,.6)',
          borderRadius: 4,
          padding: '4px 12px',
          fontSize: '0.7rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Dismiss
      </button>
    </div>
  );
}