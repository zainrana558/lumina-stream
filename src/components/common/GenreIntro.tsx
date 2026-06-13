'use client';

import { useState, useEffect } from 'react';

const GENRE_STYLES: Record<string, { primary: string; secondary: string; blurPx: number; jitter: number; stagger: number }> = {
  horror:  { primary: '#DC143C', secondary: '#8B0000', blurPx: 10, jitter: 6,  stagger: 55 },
  anime:   { primary: '#FF0096', secondary: '#00FFFF', blurPx: 8,  jitter: 3,  stagger: 40 },
  romance: { primary: '#FF6B8A', secondary: '#FF4D6D', blurPx: 7,  jitter: 2,  stagger: 50 },
  mystery: { primary: '#FFB347', secondary: '#FFD700', blurPx: 6,  jitter: 1,  stagger: 65 },
  fantasy: { primary: '#C39BD3', secondary: '#FFD700', blurPx: 8,  jitter: 2,  stagger: 45 },
  cartoon: { primary: '#74B9FF', secondary: '#FF8B80', blurPx: 5,  jitter: 0,  stagger: 60 },
};

const RAINBOW = ['#FF6B8A','#FFB347','#78D621','#74B9FF','#C39BD3','#FF8C00'];

interface GenreIntroProps {
  text: string;
  genre: 'anime' | 'cartoon' | 'horror' | 'romance' | 'mystery' | 'fantasy';
}

export default function GenreIntro({ text, genre }: GenreIntroProps) {
  const [revealed, setRevealed] = useState<boolean[]>(() => new Array(text.split('').length).fill(false));
  const s = GENRE_STYLES[genre] || GENRE_STYLES.anime;
  const chars = text.split('');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    chars.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setRevealed(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, i * s.stagger));
    });
    return () => timers.forEach(clearTimeout);
  }, [text, genre]);

  return (
    <span style={{ display: 'inline-flex' }}>
      {chars.map((ch, i) => {
        const isRevealed = revealed[i];
        const isSpace = ch === ' ';
        if (isSpace) return <span key={i} style={{ width: '0.3em' }} />;

        const isHorror = genre === 'horror';
        const isCartoon = genre === 'cartoon';
        const isMystery = genre === 'mystery';

        let color = s.primary;
        if (genre === 'anime') color = i % 2 === 0 ? s.primary : s.secondary;
        if (genre === 'fantasy') color = RAINBOW[i % RAINBOW.length];
        if (genre === 'cartoon') color = RAINBOW[i % RAINBOW.length];

        const jx = isHorror ? (Math.random() - 0.5) * s.jitter : isRevealed ? 0 : 0;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              fontWeight: 'inherit',
              letterSpacing: 'inherit',
              color,
              filter: isRevealed ? 'blur(0px)' : `blur(${s.blurPx}px)`,
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed
                ? (isCartoon ? `scale(1) rotate(0deg)` : 'translateX(0)')
                : (isCartoon ? `scale(0.3) rotate(${(i % 2 === 0 ? -15 : 15)}deg)` : `translateX(${jx}px)`),
              transition: `all ${isCartoon ? '0.4s cubic-bezier(.34,1.56,.64,1)' : '0.35s ease-out'}`,
              textShadow: isRevealed ? `0 0 20px ${color}40` : 'none',
              // mystery cursor blink on last char
              animation: (isMystery && i === chars.length - 1 && isRevealed) ? 'cursor-blink 1s step-end infinite' : 'none',
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
