'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface QuizStep {
  q: string;
  opts: { label: string; scores: Record<string, number> }[];
}

const STEPS: QuizStep[] = [
  {
    q: 'What\'s your energy level?',
    opts: [
      { label: 'Sleepy', scores: { Melancholy: 3, Thrilling: 0, Romantic: 1, Epic: 0, Chill: 1, Pumped: 0 } },
      { label: 'Energetic', scores: { Melancholy: 0, Thrilling: 1, Romantic: 0, Epic: 2, Chill: 0, Pumped: 3 } },
      { label: 'Chill', scores: { Melancholy: 1, Thrilling: 0, Romantic: 1, Epic: 0, Chill: 3, Pumped: 0 } },
      { label: 'Fired up', scores: { Melancholy: 0, Thrilling: 2, Romantic: 0, Epic: 3, Chill: 0, Pumped: 1 } },
    ],
  },
  {
    q: 'Pick a vibe',
    opts: [
      { label: 'Rainy day', scores: { Melancholy: 3, Thrilling: 0, Romantic: 1, Epic: 0, Chill: 2, Pumped: 0 } },
      { label: 'Sunny', scores: { Melancholy: 0, Thrilling: 0, Romantic: 1, Epic: 2, Chill: 2, Pumped: 3 } },
      { label: 'Late night', scores: { Melancholy: 2, Thrilling: 3, Romantic: 1, Epic: 1, Chill: 0, Pumped: 0 } },
      { label: 'Spring', scores: { Melancholy: 0, Thrilling: 0, Romantic: 3, Epic: 1, Chill: 2, Pumped: 1 } },
    ],
  },
  {
    q: 'What are you feeling?',
    opts: [
      { label: 'Thoughtful', scores: { Melancholy: 3, Thrilling: 0, Romantic: 1, Epic: 1, Chill: 1, Pumped: 0 } },
      { label: 'Laughing', scores: { Melancholy: 0, Thrilling: 0, Romantic: 0, Epic: 1, Chill: 3, Pumped: 2 } },
      { label: 'Emotional', scores: { Melancholy: 3, Thrilling: 0, Romantic: 2, Epic: 0, Chill: 1, Pumped: 0 } },
      { label: 'On edge', scores: { Melancholy: 0, Thrilling: 3, Romantic: 0, Epic: 2, Chill: 0, Pumped: 2 } },
    ],
  },
  {
    q: 'Choose your escape',
    opts: [
      { label: 'Get lost in story', scores: { Melancholy: 3, Thrilling: 1, Romantic: 2, Epic: 0, Chill: 1, Pumped: 0 } },
      { label: 'Action overload', scores: { Melancholy: 0, Thrilling: 2, Romantic: 0, Epic: 3, Chill: 0, Pumped: 3 } },
      { label: 'Love & drama', scores: { Melancholy: 1, Thrilling: 0, Romantic: 3, Epic: 1, Chill: 0, Pumped: 0 } },
      { label: 'Explore worlds', scores: { Melancholy: 0, Thrilling: 1, Romantic: 1, Epic: 3, Chill: 1, Pumped: 1 } },
    ],
  },
];

const MOOD_INFO: Record<string, { col: string; desc: string }> = {
  Melancholy: { col: '#8B78FF', desc: 'You\'re in a reflective mood. Dive into deep, emotional stories that resonate with your soul.' },
  Pumped:     { col: '#FFB347', desc: 'Energy is flowing through you! Action-packed adventures and high-octane thrills await.' },
  Romantic:   { col: '#FF6B8A', desc: 'Love is in the air. Heartfelt stories, tender romances, and emotional journeys are calling.' },
  Thrilling:  { col: '#FF4A4A', desc: 'You crave suspense and adrenaline. Edge-of-your-seat mysteries and dark thrillers await.' },
  Chill:      { col: '#78D621', desc: 'Relax and unwind. Light-hearted, easy-watching content is exactly what you need right now.' },
  Epic:       { col: '#FF8C00', desc: 'Go big or go home. Grand adventures, legendary sagas, and epic worlds are ready for you.' },
};

const TIEBREAKER = ['Thrilling', 'Epic', 'Romantic', 'Chill', 'Pumped', 'Melancholy'];

function calcResult(answers: number[]): string {
  const totals: Record<string, number> = { Melancholy: 0, Pumped: 0, Romantic: 0, Thrilling: 0, Chill: 0, Epic: 0 };
  answers.forEach((optIdx, stepIdx) => {
    const opt = STEPS[stepIdx].opts[optIdx];
    Object.entries(opt.scores).forEach(([mood, pts]) => { totals[mood] += pts; });
  });
  let maxScore = -1;
  let result = 'Chill';
  TIEBREAKER.forEach(mood => {
    if (totals[mood] > maxScore) { maxScore = totals[mood]; result = mood; }
  });
  return result;
}

export default function MoodQuiz() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [lastMood, setLastMood] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lumina-mood-quiz');
      if (saved) setLastMood(saved);
    } catch {}
  }, []);

  const handleSelect = (optIdx: number) => {
    const next = [...answers, optIdx];
    setAnswers(next);
    if (step < 3) {
      setStep(step + 1);
    } else {
      const mood = calcResult(next);
      setResult(mood);
      try { localStorage.setItem('lumina-mood-quiz', mood); } catch {}
      setLastMood(mood);
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers([]);
    setResult(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const info = result ? MOOD_INFO[result] : null;

  return (
    <>
      {/* Collapsed button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'relative',
          padding: 'clamp(12px,1.5vw,16px) clamp(20px,2.8vw,32px)',
          borderRadius: 16,
          border: '1px solid rgba(139,120,255,.28)',
          background: 'linear-gradient(135deg, #0D0A1E 0%, #18063A 100%)',
          boxShadow: '4px 4px 14px rgba(0,0,0,.7), -2px -2px 6px rgba(45,25,90,.25), inset 0 1px 0 rgba(255,255,255,.06), 0 0 12px rgba(139,120,255,.12)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          transition: 'all .3s ease',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: 'clamp(.55rem,.72vw,.65rem)', letterSpacing: '.14em', color: 'rgba(139,120,255,.6)', textTransform: 'uppercase', fontWeight: 600 }}>Mood Quiz</span>
          {lastMood && (
            <span style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.68rem', color: 'rgba(255,245,232,.5)', fontStyle: 'italic' }}>
              {lastMood}
            </span>
          )}
        </div>
      </button>

      {/* Expanded quiz overlay */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(4,2,10,.92)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
            animation: 'fi .25s ease both',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div style={{
            maxWidth: 480, width: '100%',
            background: '#0D0A1E', borderRadius: 20,
            padding: 'clamp(1.5rem,4vw,2.5rem)',
            boxShadow: '12px 12px 40px rgba(0,0,0,.9), -4px -4px 14px rgba(45,25,90,.25), 0 0 0 1px rgba(255,255,255,.05)',
            animation: 'page-in .35s cubic-bezier(.22,1,.36,1) both',
          }}>
            {/* Close button */}
            <button onClick={close} style={{
              position: 'absolute', top: 12, right: 16,
              background: 'none', border: 'none', color: 'rgba(255,245,232,.4)',
              cursor: 'pointer', fontSize: '1.2rem', padding: 4,
            }}>x</button>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: '1.5rem' }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{
                  width: i <= step ? 24 : 8, height: 8, borderRadius: 4,
                  background: i < step ? '#8B78FF' : i === step ? 'rgba(139,120,255,.5)' : 'rgba(255,255,255,.12)',
                  transition: 'all .3s cubic-bezier(.34,1.56,.64,1)',
                }} />
              ))}
            </div>

            {/* Quiz content */}
            {!result ? (
              <>
                <h3 style={{
                  fontFamily: "'Cinzel',serif", fontSize: 'clamp(.95rem,1.3vw,1.15rem)',
                  color: '#FFF5E8', textAlign: 'center', marginBottom: '1.5rem',
                  fontWeight: 700, letterSpacing: '.04em',
                  animation: 'fi .3s ease both',
                }}>
                  {STEPS[step].q}
                </h3>
                <div key={step} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                  animation: 'eu .4s cubic-bezier(.34,1.56,.64,1) both',
                }}>
                  {STEPS[step].opts.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(i)}
                      style={{
                        padding: 'clamp(14px,2vw,20px) 12px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,.06)',
                        background: '#110E24',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        transition: 'all .2s',
                        boxShadow: '4px 4px 12px rgba(0,0,0,.7), -2px -2px 6px rgba(45,25,90,.2), inset 0 1px 0 rgba(255,255,255,.04)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
                        e.currentTarget.style.borderColor = 'rgba(139,120,255,.3)';
                        e.currentTarget.style.boxShadow = '6px 6px 18px rgba(0,0,0,.8), -3px -3px 9px rgba(45,25,90,.25), 0 0 16px rgba(139,120,255,.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)';
                        e.currentTarget.style.boxShadow = '4px 4px 12px rgba(0,0,0,.7), -2px -2px 6px rgba(45,25,90,.2), inset 0 1px 0 rgba(255,255,255,.04)';
                      }}
                    >
                      <span style={{
                        fontSize: 'clamp(1.6rem,3vw,2.2rem)',
                        fontFamily: "'Cinzel',serif",
                        fontWeight: 700,
                        color: '#8B78FF',
                      }}>{opt.label[0].toUpperCase()}</span>
                      <span style={{ fontFamily: "'Cinzel',serif", fontSize: 'clamp(.62rem,.78vw,.72rem)', color: 'rgba(255,245,232,.7)', letterSpacing: '.06em' }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : info ? (
              <div style={{ textAlign: 'center', animation: 'eu .4s cubic-bezier(.34,1.56,.64,1) both' }}>
                <div style={{
                  fontSize: '3.5rem', marginBottom: '1rem',
                  fontFamily: "'Cinzel Decorative',serif", fontWeight: 900,
                  filter: `drop-shadow(0 0 20px ${info.col}50)`,
                  animation: 'float 3s ease-in-out infinite',
                  color: info.col,
                }}>{result[0]}</div>
                <h3 style={{
                  fontFamily: "'Cinzel Decorative',serif", fontWeight: 900,
                  fontSize: 'clamp(1.5rem,3vw,2rem)', marginBottom: '.75rem',
                  background: `linear-gradient(135deg, ${info.col}, #FFB347)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>{result}</h3>
                <p style={{
                  fontFamily: "'Crimson Pro',serif", fontSize: '.95rem',
                  color: 'rgba(255,245,232,.6)', lineHeight: 1.65, marginBottom: '1.5rem',
                  fontStyle: 'italic',
                }}>{info.desc}</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn-p" onClick={() => { close(); router.push('/browse'); }}>
                    Browse {result}
                  </button>
                  <button className="btn-g" onClick={reset}>
                    Retake Quiz
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
