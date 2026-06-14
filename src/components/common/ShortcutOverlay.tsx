'use client';

import { CS } from '@/styles/themes';

const SHORTCUTS = [
  { key: 'Space / K', action: 'Play / Pause', icon: '⏯' },
  { key: 'F', action: 'Toggle Fullscreen', icon: '⛶' },
  { key: 'Tab', action: 'Switch Server', icon: '🔄' },
  { key: 'P', action: 'Pop-out to PiP', icon: '📺' },
  { key: '< / >', action: 'Previous / Next Episode', icon: '⏮' },
  { key: 'N', action: 'Next Episode', icon: '⏭' },
  { key: 'S / Shift+S', action: 'Next / Previous Season', icon: '📑' },
  { key: '1 – 9', action: 'Jump to Episode N', icon: '🔢' },
  { key: 'W', action: 'Toggle My List', icon: '📋' },
  { key: 'T / Shift+T', action: 'Next / Previous Tab', icon: '📂' },
  { key: 'G', action: 'Scroll to Top', icon: '⬆' },
  { key: 'L', action: 'Go Back', icon: '←' },
  { key: 'C', action: 'Toggle Subtitles', icon: '💬' },
  { key: 'Escape', action: 'Exit Player', icon: '✕' },
  { key: '?', action: 'Show / Hide This', icon: '⌨' },
];

export default function ShortcutOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  const s = CS[0];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fi .2s ease both',
      }}
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0C091A', border: `1px solid ${s.acc}30`,
          borderRadius: 16, padding: '2rem 2.5rem',
          maxWidth: 520, width: '90%',
          boxShadow: `8px 8px 32px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.04)`,
        }}
      >
        <h2 className="f-cinzel-dec" style={{  fontSize: '1.2rem', color: '#FFF5E8', marginBottom: '.3rem' }}>Keyboard Shortcuts</h2>
        <p className="f-cinzel" style={{  fontSize: '.7rem', color: 'rgba(255,245,232,.4)', marginBottom: '1.5rem', letterSpacing: '.08em' }}>Press ? to toggle · Press Esc to close</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {SHORTCUTS.map((sc, i) => (
            <div
              key={sc.key}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)',
                animation: `card-in .3s ${i * 0.03}s both`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: `${s.acc}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>{sc.icon}</span>
                <span className="f-cinzel" style={{  fontSize: '.78rem', color: '#FFF5E8' }}>{sc.action}</span>
              </div>
              <kbd className="f-mono" style={{
                 fontSize: '.65rem', color: s.acc,
                padding: '4px 10px', borderRadius: 6,
                background: '#090716', border: '1px solid rgba(255,255,255,.1)',
                boxShadow: 'inset 1px 1px 3px rgba(0,0,0,.5)',
              }}>{sc.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}