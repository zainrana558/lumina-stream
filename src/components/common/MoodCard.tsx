'use client';

import { useRouter } from 'next/navigation';
import type { Mood } from '@/types';

function MoodParticles({ mood }: { mood: Mood }) {
  const particles: React.ReactNode[] = [];
  const count = mood.name === 'Epic' ? 10 : mood.name === 'Romantic' ? 8 : mood.name === 'Melancholy' ? 14 : 6;

  for (let i = 0; i < count; i++) {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${10 + Math.random() * 80}%`,
      bottom: `${Math.random() * 20}%`,
      animationDelay: `${Math.random() * 4}s`,
      opacity: 0,
    };

    switch (mood.name) {
      case 'Epic':
        particles.push(
          <div key={i} style={{ ...style, width: `${2 + Math.random() * 4}px`, height: style.width, borderRadius: '50%', background: i % 3 === 0 ? '#FF4A4A' : i % 3 === 1 ? '#FF8C00' : '#FFB347', boxShadow: `0 0 6px ${style.background}`, animation: `ember-rise ${2 + Math.random() * 2}s ease-out ${style.animationDelay} infinite`, '--drift': `${-15 + Math.random() * 30}px` } as React.CSSProperties} />
        );
        break;
      case 'Romantic':
        particles.push(
          <div key={i} style={{ ...style, fontSize: `${8 + Math.random() * 10}px`, animation: `heart-rise ${3 + Math.random() * 3}s ease-in-out ${style.animationDelay} infinite`, '--sway': `${-20 + Math.random() * 40}px` } as React.CSSProperties}>❤</div>
        );
        break;
      case 'Melancholy':
        particles.push(
          <div key={i} style={{ ...style, width: '1px', height: `${20 + Math.random() * 30}px`, background: `linear-gradient(to bottom,transparent,rgba(139,120,255,.5))`, animation: `rain-fall ${0.8 + Math.random() * 0.8}s linear ${style.animationDelay} infinite` }} />
        );
        break;
      case 'Pumped':
        particles.push(
          <div key={i} style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 20%,rgba(255,179,71,.3),transparent 70%)`, animation: `lightning ${2.5 + Math.random() * 3}s ease ${style.animationDelay} infinite` }} />
        );
        break;
      case 'Thrilling':
        particles.push(
          <div key={i} style={{ position: 'absolute', height: '100%', width: '200%', top: `${20 + i * 25}%`, background: `linear-gradient(90deg,transparent,rgba(255,74,74,.08),transparent)`, animation: `fog-drift ${10 + i * 4}s linear ${i * 2}s infinite`, filter: 'blur(8px)' }} />
        );
        break;
      case 'Chill':
        particles.push(
          <div key={i} style={{ ...style, width: `${6 + Math.random() * 6}px`, height: style.width, borderRadius: '50% 0', background: i % 2 === 0 ? '#78D621' : '#5B8C35', animation: `leaf-sway ${4 + Math.random() * 4}s ease-in-out ${style.animationDelay} infinite` }} />
        );
        break;
    }
  }
  return <div className="mood-particles">{particles}</div>;
}

export default function MoodCard({ mood, index }: { mood: Mood; index: number }) {
  const router = useRouter();
  return (
    <div className="mood-landscape" onClick={() => router.push('/browse')}
      style={{ animationDelay: `${index * 0.1}s`, border: `1px solid ${mood.col}18` }}>
      <div className="mood-bg" style={{ background: `linear-gradient(160deg,${mood.col}08,${mood.col}1a,${mood.col}0c)` }}>
        <MoodParticles mood={mood} />
      </div>
      <div className="mood-overlay" />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 'clamp(3rem,5vw,4.5rem)', opacity: .12, filter: 'blur(2px)', animation: `float ${4 + index * 0.5}s ease-in-out infinite`, userSelect: 'none' }}>{mood.em}</div>
      <div className="mood-content">
        <div style={{ fontFamily: "'Cinzel Decorative',serif", fontWeight: 900, fontSize: 'clamp(.95rem,1.4vw,1.15rem)', color: '#FFF5E8', letterSpacing: '.04em', textShadow: '0 3px 10px rgba(0,0,0,.8)', marginBottom: 4 }}>{mood.name}</div>
        <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: 'clamp(.62rem,.75vw,.72rem)', color: `${mood.col}aa`, fontStyle: 'italic', marginBottom: 8 }}>{mood.desc}</div>
        <div style={{ width: 'clamp(24px,4vw,40px)', height: 2, background: `linear-gradient(90deg, ${mood.col}, transparent)`, borderRadius: 2, opacity: .5 }} />
      </div>
    </div>
  );
}
