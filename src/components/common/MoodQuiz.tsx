'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wand2, X, Moon, Zap, Leaf, Flame, CloudRain, Sun, MoonStar, Flower2,
  Brain, Laugh, HeartCrack, Skull, BookOpen, Swords, Heart, Compass,
  type LucideIcon,
} from 'lucide-react';

interface QuizStep {
  q: string;
  opts: { label: string; icon: LucideIcon; scores: Record<string, number> }[];
}

const STEPS: QuizStep[] = [
  {
    q: 'What\'s your energy level?',
    opts: [
      { label: 'Sleepy', icon: Moon, scores: { Melancholy: 3, Thrilling: 0, Romantic: 1, Epic: 0, Chill: 1, Pumped: 0 } },
      { label: 'Energetic', icon: Zap, scores: { Melancholy: 0, Thrilling: 1, Romantic: 0, Epic: 2, Chill: 0, Pumped: 3 } },
      { label: 'Chill', icon: Leaf, scores: { Melancholy: 1, Thrilling: 0, Romantic: 1, Epic: 0, Chill: 3, Pumped: 0 } },
      { label: 'Fired up', icon: Flame, scores: { Melancholy: 0, Thrilling: 2, Romantic: 0, Epic: 3, Chill: 0, Pumped: 1 } },
    ],
  },
  {
    q: 'Pick a vibe',
    opts: [
      { label: 'Rainy day', icon: CloudRain, scores: { Melancholy: 3, Thrilling: 0, Romantic: 1, Epic: 0, Chill: 2, Pumped: 0 } },
      { label: 'Sunny', icon: Sun, scores: { Melancholy: 0, Thrilling: 0, Romantic: 1, Epic: 2, Chill: 2, Pumped: 3 } },
      { label: 'Late night', icon: MoonStar, scores: { Melancholy: 2, Thrilling: 3, Romantic: 1, Epic: 1, Chill: 0, Pumped: 0 } },
      { label: 'Spring', icon: Flower2, scores: { Melancholy: 0, Thrilling: 0, Romantic: 3, Epic: 1, Chill: 2, Pumped: 1 } },
    ],
  },
  {
    q: 'What are you feeling?',
    opts: [
      { label: 'Thoughtful', icon: Brain, scores: { Melancholy: 3, Thrilling: 0, Romantic: 1, Epic: 1, Chill: 1, Pumped: 0 } },
      { label: 'Laughing', icon: Laugh, scores: { Melancholy: 0, Thrilling: 0, Romantic: 0, Epic: 1, Chill: 3, Pumped: 2 } },
      { label: 'Emotional', icon: HeartCrack, scores: { Melancholy: 3, Thrilling: 0, Romantic: 2, Epic: 0, Chill: 1, Pumped: 0 } },
      { label: 'On edge', icon: Skull, scores: { Melancholy: 0, Thrilling: 3, Romantic: 0, Epic: 2, Chill: 0, Pumped: 2 } },
    ],
  },
  {
    q: 'Choose your escape',
    opts: [
      { label: 'Get lost in story', icon: BookOpen, scores: { Melancholy: 3, Thrilling: 1, Romantic: 2, Epic: 0, Chill: 1, Pumped: 0 } },
      { label: 'Action overload', icon: Swords, scores: { Melancholy: 0, Thrilling: 2, Romantic: 0, Epic: 3, Chill: 0, Pumped: 3 } },
      { label: 'Love & drama', icon: Heart, scores: { Melancholy: 1, Thrilling: 0, Romantic: 3, Epic: 1, Chill: 0, Pumped: 0 } },
      { label: 'Explore worlds', icon: Compass, scores: { Melancholy: 0, Thrilling: 1, Romantic: 1, Epic: 3, Chill: 1, Pumped: 1 } },
    ],
  },
];

const MOOD_INFO: Record<string, { col: string; desc: string; icon: LucideIcon }> = {
  Melancholy: { col: '#8B78FF', icon: CloudRain, desc: 'You\'re in a reflective mood. Dive into deep, emotional stories that resonate with your soul.' },
  Pumped:     { col: '#FFB347', icon: Zap,       desc: 'Energy is flowing through you! Action-packed adventures and high-octane thrills await.' },
  Romantic:   { col: '#FF6B8A', icon: Heart,     desc: 'Love is in the air. Heartfelt stories, tender romances, and emotional journeys are calling.' },
  Thrilling:  { col: '#FF4A4A', icon: Skull,     desc: 'You crave suspense and adrenaline. Edge-of-your-seat mysteries and dark thrillers await.' },
  Chill:      { col: '#78D621', icon: Leaf,      desc: 'Relax and unwind. Light-hearted, easy-watching content is exactly what you need right now.' },
  Epic:       { col: '#FF8C00', icon: Flame,     desc: 'Go big or go home. Grand adventures, legendary sagas, and epic worlds are ready for you.' },
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
  // Read after mount — a localStorage value in the initial state makes the first
  // client render differ from SSR (which always sees null) → hydration mismatch.
  const [lastMood, setLastMood] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: localStorage read after mount to avoid a hydration mismatch
    try { setLastMood(localStorage.getItem('lumina-mood-quiz')); } catch { /* ignore */ }
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
        className="shine-sweep"
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
        <Wand2 size={18} color="#8B78FF" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span className="f-cinzel" style={{  fontSize: 'clamp(.55rem,.72vw,.65rem)', letterSpacing: '.14em', color: 'rgba(139,120,255,.6)', textTransform: 'uppercase', fontWeight: 600 }}>Mood Quiz</span>
          {lastMood && (
            <span className="f-crimson" style={{  fontSize: '.68rem', color: 'rgba(255,245,232,.5)', fontStyle: 'italic' }}>
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
            animation: 'tilt-in .45s cubic-bezier(.22,1,.36,1) both',
            position: 'relative',
          }}>
            {/* Close button */}
            <button onClick={close} style={{
              position: 'absolute', top: 12, right: 16,
              background: 'none', border: 'none', color: 'rgba(255,245,232,.4)',
              cursor: 'pointer', padding: 4, display: 'flex',
            }}><X size={18} /></button>

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
                <h3 className="f-cinzel" style={{
                   fontSize: 'clamp(.95rem,1.3vw,1.15rem)',
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
                      className="pop-in"
                      style={{
                        padding: 'clamp(14px,2vw,20px) 12px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,.06)',
                        background: '#110E24',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        transition: 'all .2s',
                        boxShadow: '4px 4px 12px rgba(0,0,0,.7), -2px -2px 6px rgba(45,25,90,.2), inset 0 1px 0 rgba(255,255,255,.04)',
                        animationDelay: `${i * 0.06}s`,
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
                      <opt.icon size={30} color="#8B78FF" strokeWidth={1.75} />
                      <span className="f-cinzel" style={{  fontSize: 'clamp(.62rem,.78vw,.72rem)', color: 'rgba(255,245,232,.7)', letterSpacing: '.06em' }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : info ? (
              <div style={{ textAlign: 'center', animation: 'eu .4s cubic-bezier(.34,1.56,.64,1) both' }}>
                <div className="pop-in glow-pulse" style={{
                  display: 'flex', justifyContent: 'center', marginBottom: '1rem',
                  color: info.col,
                }}>
                  <info.icon size={64} strokeWidth={1.5} />
                </div>
                <h3 className="f-cinzel-dec" style={{
                   fontWeight: 900,
                  fontSize: 'clamp(1.5rem,3vw,2rem)', marginBottom: '.75rem',
                  background: `linear-gradient(135deg, ${info.col}, #FFB347)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>{result}</h3>
                <p className="f-crimson" style={{
                   fontSize: '.95rem',
                  color: 'rgba(255,245,232,.6)', lineHeight: 1.65, marginBottom: '1.5rem',
                  fontStyle: 'italic',
                }}>{info.desc}</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn-p" onClick={() => { close(); router.push(`/browse?mood=${result.toLowerCase()}`); }}>
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
