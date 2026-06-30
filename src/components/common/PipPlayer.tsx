'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface PipPlayerProps {
  url: string;
  title: string;
  episodeInfo?: string;
  onClose: () => void;
  onExpand: () => void;
  colorScheme?: { bg?: string; acc?: string };
}

export default function PipPlayer({ url, title, episodeInfo, onClose, onExpand, colorScheme }: PipPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: window.innerWidth - 380, y: window.innerHeight - 280 });
  const [size, setSize] = useState({ w: 320, h: 180 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [visible, setVisible] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  const acc = colorScheme?.acc || '#FFB347';

  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - size.w, dragStart.current.px + dx)),
      y: Math.max(0, Math.min(window.innerHeight - size.h, dragStart.current.py + dy)),
    });
  }, [dragging, size]);

  const handleDragEnd = useCallback(() => { setDragging(false); }, []);

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [size]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizing) return;
    const dx = e.clientX - resizeStart.current.mx;
    const ratio = 16 / 9;
    const newW = Math.max(160, Math.min(400, resizeStart.current.w + dx));
    const newH = newW / ratio;
    setSize({ w: newW, h: newH });
  }, [resizing]);

  const handleResizeEnd = useCallback(() => { setResizing(false); }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 9998,
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid rgba(255,255,255,.08)`,
        boxShadow: `0 12px 40px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.04)`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(.95)',
        transition: 'opacity .3s ease, transform .3s cubic-bezier(.22,1,.36,1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Drag handle — minimal, no colored bar */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        style={{
          height: 6, cursor: dragging ? 'grabbing' : 'grab',
          flexShrink: 0,
          background: 'transparent',
        }}
      />

      {/* Video iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          src={url}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          allow="autoplay; fullscreen"
          title={`${title} mini player`}
        />
      </div>

      {/* Bottom bar — clean, minimal */}
      <div style={{
        height: 30, flexShrink: 0,
        background: 'rgba(7,4,15,.9)',
        display: 'flex', alignItems: 'center',
        padding: '0 10px',
        gap: 6,
        borderTop: '1px solid rgba(255,255,255,.06)',
      }}>
        <div className="f-cinzel" style={{
          flex: 1, minWidth: 0,
          fontSize: '.5rem',
          color: 'rgba(255,245,232,.5)', letterSpacing: '.04em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}{episodeInfo ? ` · ${episodeInfo}` : ''}
        </div>
        <button onClick={handleExpand} title="Expand" style={{
          width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,.06)', color: 'rgba(255,245,232,.4)', fontSize: '.65rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
        }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = acc; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,245,232,.4)'; }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
        <button onClick={handleClose} title="Close" style={{
          width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,.06)', color: 'rgba(255,245,232,.4)', fontSize: '.65rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
        }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,138,.15)'; e.currentTarget.style.color = '#FF6B8A'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,245,232,.4)'; }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        style={{
          position: 'absolute', bottom: 30, right: 0,
          width: 16, height: 16, cursor: 'nwse-resize',
          zIndex: 5,
        }}
      />
    </div>
  );
}