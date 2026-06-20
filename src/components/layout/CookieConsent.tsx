'use client';

import { useState, useEffect } from 'react';

const CONSENT_KEY = 'lumina_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ essential: true, analytics: false, ads: false, date: new Date().toISOString() }));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ essential: true, analytics: false, ads: false, date: new Date().toISOString(), declined: true }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'rgba(5,3,12,.95)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255,179,71,.15)',
      padding: '16px clamp(16px, 4vw, 48px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      flexWrap: 'wrap',
      boxShadow: '0 -4px 30px rgba(0,0,0,.6)',
    }}>
      <p className="f-crimson" style={{ fontSize: '.82rem', color: 'rgba(255,245,232,.65)', lineHeight: 1.6, flex: '1 1 400px', margin: 0 }}>
        We use essential cookies for authentication and preferences.{' '}
        <a href="/cookies" style={{ color: '#FFB347', textDecoration: 'none' }}>Learn more</a>
      </p>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button
          onClick={decline}
          className="f-cinzel"
          style={{
            fontSize: '.72rem',
            letterSpacing: '.08em',
            padding: '8px 18px',
            borderRadius: 8,
            border: '1px solid rgba(255,245,232,.12)',
            background: 'transparent',
            color: 'rgba(255,245,232,.5)',
            cursor: 'pointer',
            transition: 'all .2s',
          }}
        >
          DECLINE
        </button>
        <button
          onClick={accept}
          className="f-cinzel"
          style={{
            fontSize: '.72rem',
            letterSpacing: '.08em',
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #FFB347, #C860FF)',
            color: '#05030C',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all .2s',
          }}
        >
          ACCEPT
        </button>
      </div>
    </div>
  );
}