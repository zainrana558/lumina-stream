'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'lumina:install-dismissed-at';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Surfaces the browser's native "Add to Home Screen" flow via a small,
 * dismissible banner instead of letting the beforeinstallprompt event fire
 * and go nowhere (which is what happened before this existed — the event
 * was never listened for anywhere in the app despite manifest.json already
 * being fully configured for it).
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed (standalone display mode) — nothing to offer.
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) return;

    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_COOLDOWN_MS) return;
    } catch { /* localStorage unavailable — proceed */ }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* non-critical */ }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Lumovia"
      className="neo-raised f-cinzel"
      style={{
        position: 'fixed', bottom: 20, left: 20, right: 20, maxWidth: 420, margin: '0 auto', zIndex: 9100,
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14,
        background: 'rgba(12,9,26,.96)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,179,71,.3)',
        boxShadow: '4px 4px 16px rgba(0,0,0,.7)',
        animation: 'card-in .25s ease both',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: 'rgba(255,179,71,.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Download size={18} color="#FFB347" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#FFF5E8', fontSize: '.82rem', fontWeight: 600 }}>Install Lumovia</div>
        <div style={{ color: 'rgba(255,245,232,.5)', fontSize: '.7rem' }}>Faster access, full-screen playback</div>
      </div>
      <button
        onClick={install}
        style={{
          background: '#FFB347', color: '#1a0f00', border: 'none', borderRadius: 8,
          padding: '8px 14px', fontSize: '.76rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', color: 'rgba(255,245,232,.4)', cursor: 'pointer', padding: 4, display: 'flex' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
