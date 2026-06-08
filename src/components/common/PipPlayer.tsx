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

export default function PipPlayer({ url, title, episodeInfo, onClose, onExpand }: PipPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: window.innerWidth - 380, y: window.innerHeight - 280 });
  const [size, setSize] = useState({ w: 320, h: 180 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [visible, setVisible] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

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
    const dy = e.clientY - resizeStart.current.my;
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
        border: '1.5px solid rgba(255,179,71,.25)',
        boxShadow: '6px 6px 20px rgba(0,0,0,.88),-2px -2px 8px rgba(45,25,90,.15),0 0 30px rgba(0,0,0,.5)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity .3s ease, transform .3s cubic-bezier(.22,1,.36,1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Drag handle */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        style={{
          height: 8, cursor: dragging ? 'grabbing' : 'grab',
          flexShrink: 0,
          background: 'rgba(255,179,71,.12)',
        }}
      />

      {/* Video iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          src={url}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          allow="autoplay; fullscreen"
        />
      </div>

      {/* Bottom bar */}
      <div style={{
        height: 28, flexShrink: 0,
        background: 'rgba(7,4,15,.92)',
        display: 'flex', alignItems: 'center',
        padding: '0 8px',
        gap: 6,
        borderTop: '1px solid rgba(255,255,255,.06)',
      }}>
        <div style={{
          flex: 1, minWidth: 0,
          fontFamily: "'Cinzel',serif", fontSize: '.52rem',
          color: 'rgba(255,245,232,.6)', letterSpacing: '.04em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}{episodeInfo ? ` · ${episodeInfo}` : ''}
        </div>
        <button onClick={handleClose} style={{
          width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer',
          background: 'none', color: 'rgba(255,245,232,.5)', fontSize: '.6rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color .2s',
        }} onMouseEnter={(e) => { e.currentTarget.style.color = '#FF6B8A'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,245,232,.5)'; }}>
          ✕
        </button>
        <button onClick={onExpand} style={{
          width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer',
          background: 'none', color: 'rgba(255,245,232,.5)', fontSize: '.7rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color .2s',
        }} onMouseEnter={(e) => { e.currentTarget.style.color = '#FFB347'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,245,232,.5)'; }}>
          ⤢
        </button>
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        style={{
          position: 'absolute', bottom: 28, right: 0,
          width: 16, height: 16, cursor: 'nwse-resize',
          zIndex: 5,
        }}
      />
    </div>
  );
}
