'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string; // ISO date string
  label?: string;
}

export default function CountdownTimer({ targetDate, label = 'Next Episode airs in' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) { setTimeLeft('Airing now!'); return; }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setTimeLeft(`${days}d ${hours}h ${mins}m`);
      else if (hours > 0) setTimeLeft(`${hours}h ${mins}m`);
      else setTimeLeft(`${mins}m`);
    };

    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderRadius: 10,
      background: 'rgba(255,179,71,.1)', border: '1px solid rgba(255,179,71,.25)',
    }}>
      <span style={{ fontSize: '.9rem' }}>⏰</span>
      <div>
        <div className="f-cinzel" style={{  fontSize: '.6rem', color: 'rgba(255,179,71,.6)', letterSpacing: '.1em' }}>{label.toUpperCase()}</div>
        <div className="f-mono" style={{
           fontSize: '.82rem',
          color: 'rgba(255,179,71,.9)', fontWeight: 600,
        }}>{timeLeft}</div>
      </div>
    </div>
  );
}
