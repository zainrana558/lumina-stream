'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Mail, HelpCircle, X } from 'lucide-react';

const SUPPORT_EMAIL = 'support@lumovia.stream';

/**
 * A persistent quick-access widget, not a live-chat replacement — there's
 * no chat backend, so this expands into fast paths to the existing support
 * channels (email, the full Contact page, FAQ) instead of pretending to be
 * a chat window. Positioned above ScrollToTop.tsx's button (bottom:88) so
 * the two never overlap when both are visible.
 */
export default function FloatingContactButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'fixed', bottom: 144, right: 20, zIndex: 9000 }}>
      {open && (
        <div
          className="neo-raised f-cinzel"
          role="menu"
          style={{
            position: 'absolute', bottom: 52, right: 0,
            width: 200, borderRadius: 14, padding: 8,
            background: 'rgba(12,9,26,.96)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,179,71,.25)',
            animation: 'card-in .18s ease both',
          }}
        >
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            role="menuitem"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9, color: '#FFF5E8', textDecoration: 'none', fontSize: '.76rem', transition: 'background .15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,245,232,.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Mail size={15} color="#FFB347" /> Email support
          </a>
          <Link
            href="/contact"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9, color: '#FFF5E8', textDecoration: 'none', fontSize: '.76rem', transition: 'background .15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,245,232,.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <MessageCircle size={15} color="#FFB347" /> Contact page
          </Link>
          <Link
            href="/faq"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9, color: '#FFF5E8', textDecoration: 'none', fontSize: '.76rem', transition: 'background .15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,245,232,.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <HelpCircle size={15} color="#FFB347" /> FAQ
          </Link>
        </div>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close contact menu' : 'Contact us'}
        aria-expanded={open}
        className="contact-fab"
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: open ? 'rgba(255,179,71,.15)' : 'rgba(12,9,26,.85)',
          border: `1px solid ${open ? 'rgba(255,179,71,.6)' : 'rgba(255,179,71,.3)'}`,
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#FFF5E8',
          boxShadow: '3px 3px 12px rgba(0,0,0,.7), -1px -1px 4px rgba(45,25,90,.2), inset 0 1px 0 rgba(255,255,255,.08)',
          transition: 'all .2s', padding: 0,
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {open ? <X size={17} /> : <MessageCircle size={17} />}
      </button>
    </div>
  );
}
