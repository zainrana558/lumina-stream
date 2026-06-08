'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PinEntryModalProps {
  profileName: string;
  profileColor: string;
  onSubmit: (pin: string) => boolean;
  onCancel: () => void;
}

// Simple djb2-like hash for PIN comparison.
// NOTE: This is a client-side obfuscation, not cryptographic security.
// It is intentional for the kids-mode PIN feature — the PIN is stored as a
// hashed string in the profiles table (set via /api/profiles PATCH) and
// compared client-side. This prevents casual shoulder-surfing of the raw PIN
// in localStorage/network, but a determined user can inspect the hash.
// True server-side PIN verification would require a dedicated API endpoint.
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export { simpleHash };

export default function PinEntryModal({ profileName, profileColor, onSubmit, onCancel }: PinEntryModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startLockout = useCallback(() => {
    setLocked(true);
    setLockTimer(30);
    setPin('');
    setError('Too many attempts. Locked for 30 seconds.');
    timerRef.current = setInterval(() => {
      setLockTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setLocked(false);
          setError('');
          attemptsRef.current = 0;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleNumber = useCallback((num: string) => {
    if (locked || pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setError('');
    if (newPin.length === 4) {
      attemptsRef.current += 1;
      const valid = onSubmit(simpleHash(newPin));
      if (!valid) {
        if (attemptsRef.current >= 3) {
          startLockout();
        } else {
          setError(`Incorrect PIN. ${3 - attemptsRef.current} attempts remaining.`);
          setShake(true);
          setTimeout(() => setShake(false), 500);
        }
        setPin('');
      }
    }
  }, [pin, locked, onSubmit, startLockout]);

  const handleBackspace = useCallback(() => {
    if (locked) return;
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, [locked]);

  // Keyboard support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (locked) return;
      if (e.key >= '0' && e.key <= '9') {
        handleNumber(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleNumber, handleBackspace, onCancel, locked]);

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <div
      className="s-overlay"
      style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="neo-raised"
        style={{
          padding: '2rem 2.5rem',
          borderRadius: 20,
          width: '100%',
          maxWidth: 320,
          textAlign: 'center',
          animation: shake ? 'shake .4s ease' : 'card-in .3s ease both',
        }}
      >
        {/* Profile avatar */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: profileColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#05020A',
            fontFamily: "'Cinzel',serif",
            margin: '0 auto 1rem',
            boxShadow: '4px 4px 12px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.15)',
          }}
        >
          {profileName.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.9rem', color: '#FFF5E8', marginBottom: '.25rem' }}>{profileName}</div>
        <div style={{ fontSize: '.72rem', color: 'rgba(255,245,232,.4)', marginBottom: '1.2rem' }}>Enter your PIN</div>

        {/* PIN dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: '1.5rem', height: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: pin.length > i ? 14 : 10,
                height: pin.length > i ? 14 : 10,
                borderRadius: '50%',
                background: pin.length > i ? '#FFB347' : 'rgba(255,245,232,.2)',
                transition: 'all .2s ease',
                boxShadow: pin.length > i ? '0 0 8px rgba(255,179,71,.4)' : 'none',
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{ fontSize: '.72rem', color: locked ? '#FF6B8A' : '#FF4A4A', marginBottom: '1rem', minHeight: 18 }}>
            {locked ? `🔒 ${error.replace(/locked for \d+ seconds\./, `locked for ${lockTimer}s.`)}` : error}
          </div>
        )}
        {!error && <div style={{ height: 18, marginBottom: '1rem' }} />}

        {/* Number pad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 220, margin: '0 auto' }}>
          {numbers.map(n => (
            n === '' ? (
              <div key="empty" />
            ) : n === '⌫' ? (
              <button
                key="backspace"
                className="btn-icon"
                onClick={handleBackspace}
                disabled={locked}
                aria-label="Backspace"
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(255,245,232,.08)',
                  border: '1px solid rgba(255,245,232,.1)',
                  color: '#FFF5E8', fontSize: '1.2rem',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.3 : 1,
                }}
              >
                ⌫
              </button>
            ) : (
              <button
                key={n}
                className="btn-icon"
                onClick={() => handleNumber(n)}
                disabled={locked}
                aria-label={n}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: locked ? 'rgba(255,245,232,.04)' : 'rgba(255,245,232,.1)',
                  border: '1px solid rgba(255,245,232,.12)',
                  color: '#FFF5E8', fontSize: '1.1rem',
                  fontFamily: "'Cinzel',serif", fontWeight: 600,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.3 : 1,
                  transition: 'all .15s',
                }}
              >
                {n}
              </button>
            )
          ))}
        </div>

        <button
          className="btn-g"
          onClick={onCancel}
          style={{ marginTop: '1.2rem', padding: '6px 20px', fontSize: '.72rem' }}
        >
          Cancel
        </button>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 50%, 90% { transform: translateX(-6px); }
            30%, 70% { transform: translateX(6px); }
          }
        `}</style>
      </div>
    </div>
  );
}
