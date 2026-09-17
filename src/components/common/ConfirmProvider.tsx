'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' reads red (delete/leave/sign-out); 'default' reads gold. */
  variant?: 'danger' | 'default';
}

interface ConfirmContextValue {
  /** Resolves true if the user confirmed, false if they cancelled/dismissed. */
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Replaces window.confirm() with a styled modal matching the app's own
 * visual language (same .s-overlay/.neo-raised pattern as PinEntryModal),
 * while keeping the call site just as simple: `if (await confirm(...))`.
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

interface PendingConfirm extends Required<Omit<ConfirmOptions, 'title'>> {
  title?: string;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(!!pending);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending({
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Confirm',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        variant: opts.variant ?? 'default',
        resolve,
      });
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setPending(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          ref={trapRef}
          className="s-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-label={pending.title || 'Confirm action'}
          style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
          onClick={(e) => { if (e.target === e.currentTarget) settle(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') settle(false); }}
        >
          <div
            className="neo-raised"
            style={{
              padding: '1.8rem 2rem',
              borderRadius: 20,
              width: '100%',
              maxWidth: 380,
              textAlign: 'center',
              animation: 'card-in .3s ease both',
            }}
          >
            <div
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: pending.variant === 'danger' ? 'rgba(255,74,74,.15)' : 'rgba(255,179,71,.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
                color: pending.variant === 'danger' ? '#FF6B8A' : '#FFB347',
              }}
            >
              {pending.variant === 'danger' ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
            </div>
            {pending.title && (
              <div className="f-cinzel" style={{ fontSize: '.95rem', color: '#FFF5E8', marginBottom: '.5rem', fontWeight: 600 }}>
                {pending.title}
              </div>
            )}
            <div style={{ fontSize: '.82rem', color: 'rgba(255,245,232,.65)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {pending.message}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-g" onClick={() => settle(false)} style={{ padding: '9px 22px', fontSize: '.78rem' }} autoFocus>
                {pending.cancelLabel}
              </button>
              {pending.variant === 'danger' ? (
                // .btn-p's box-shadow hardcodes gold/brown tones tuned for
                // its own gradient — overriding just the background would
                // leave a gold-tinted shadow around a red face, so this is
                // a plain bespoke button instead of a reskinned .btn-p.
                <button
                  onClick={() => settle(true)}
                  className="f-cinzel"
                  style={{
                    padding: '9px 22px', fontSize: '.78rem', fontWeight: 500, letterSpacing: '.05em',
                    borderRadius: 50, border: 'none', cursor: 'pointer',
                    background: '#E5484D', color: '#FFF5E8',
                    boxShadow: '0 4px 14px rgba(229,72,77,.4)',
                    transition: 'transform .1s, box-shadow .1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(229,72,77,.55)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(229,72,77,.4)'; }}
                >
                  {pending.confirmLabel}
                </button>
              ) : (
                <button className="btn-p" onClick={() => settle(true)} style={{ padding: '9px 22px', fontSize: '.78rem' }}>
                  {pending.confirmLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
