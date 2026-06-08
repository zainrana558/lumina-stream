'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(16,185,129,.15)', border: 'rgba(16,185,129,.5)', icon: '✓' },
  error:   { bg: 'rgba(239,68,68,.15)',   border: 'rgba(239,68,68,.5)',   icon: '✕' },
  info:    { bg: 'rgba(59,130,246,.15)',  border: 'rgba(59,130,246,.5)',  icon: 'ℹ' },
  warning: { bg: 'rgba(245,158,11,.15)',  border: 'rgba(245,158,11,.5)',  icon: '⚠' },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4000;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100));
      if (elapsed >= duration) {
        clearInterval(interval);
        onRemove();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [duration, onRemove]);

  const c = COLORS[toast.type];

  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 12,
        background: c.bg, border: `1px solid ${c.border}`,
        backdropFilter: 'blur(12px)',
        boxShadow: '4px 4px 16px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)',
        animation: 'toast-in .3s ease both',
        minWidth: 260, maxWidth: 400,
        position: 'relative', overflow: 'hidden',
        fontFamily: "'Cinzel',serif",
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        background: c.border, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '.7rem', color: '#FFF5E8', fontWeight: 700,
      }}>{c.icon}</div>
      <span style={{ fontSize: '.78rem', color: '#FFF5E8', flex: 1 }}>{toast.message}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'rgba(255,245,232,.4)', cursor: 'pointer', fontSize: '.8rem', padding: 2 }}>✕</button>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 2,
        background: c.border, transition: 'width .1s linear',
        width: `${progress}%`, borderRadius: '0 0 12px 12px',
      }} />
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div style={{
        position: 'fixed', top: 70, right: 16, zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={() => removeToast(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
