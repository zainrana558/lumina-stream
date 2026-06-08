import '@/styles/global.css';
import { CS, GCARDS, MOODS } from '@/styles/themes';

const featured = [
  { id: 1, title: 'Breaking Bad', sub: 'Chemistry is power', genre: ['Drama', 'Thriller'], r: 9.5, yr: 2008, eps: 62, cs: 3, poster_path: '/ztkUQFLlC19CCMYHW73WxxWgMD5.jpg', backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', desc: 'A chemistry teacher turned meth manufacturer.' },
  { id: 2, title: 'Stranger Things', sub: 'The upside down awaits', genre: ['Sci-Fi', 'Horror'], r: 8.7, yr: 2016, eps: 34, cs: 0, poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', backdrop_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', desc: 'A mother searches for her missing son in a town with terrifying secrets.' },
  { id: 3, title: 'The Dark Knight', sub: 'Why so serious?', genre: ['Action', 'Drama'], r: 9.0, yr: 2008, eps: 1, cs: 4, poster_path: '/qJ2tW6WMUDux911BTUgMe1nNaD3.jpg', backdrop_path: '/nMKdUUepR0i5zn0y1T4CsSB5ez.jpg', desc: 'Batman faces the Joker in an epic battle for Gotham.' },
  { id: 4, title: 'Inception', sub: 'Your mind is the scene', genre: ['Sci-Fi', 'Action'], r: 8.8, yr: 2010, eps: 1, cs: 7, poster_path: '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg', backdrop_path: '/oSLd47YDGxRiMPeGncRQhUBEemX.jpg', desc: 'A thief enters dreams to plant an idea.' },
  { id: 5, title: 'Demon Slayer', sub: 'The journey begins', genre: ['Animation', 'Action'], r: 8.9, yr: 2019, eps: 44, cs: 1, poster_path: '/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg', backdrop_path: '/wTS2xUoM3Q4cVHzfBPPSZOf4T2k.jpg', desc: 'A boy becomes a demon slayer to save his sister.' },
];

export const metadata = { title: 'Lumina Stream - Dream, Discover, Stream', description: 'Explore movies, TV shows, anime, and cartoons.' };

export default function HomePage() {
  return (
    <div className="page" style={{ minHeight: '100vh', background: '#07040F' }}>
      {/* Hero Section */}
      <section style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '-6%', background: `url(${featured[0].backdrop_path}) center/cover no-repeat`, zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(7,4,15,.85) 0%,rgba(7,4,15,.6) 40%,rgba(7,4,15,.75) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 3, padding: '0 clamp(1rem,5vw,4rem)', maxWidth: 720 }}>
          <div className="s1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 20, marginBottom: '1.3rem', background: '#0D0A1E', boxShadow: '4px 4px 12px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.06),0 0 0 1px rgba(255,179,71,.28)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF4444', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: '.64rem', letterSpacing: '.15em', color: 'rgba(255,179,71,.9)' }}>FEATURED</span>
          </div>
          <h1 className="h1 s2" style={{ fontSize: 'clamp(2.2rem,5.5vw,5.2rem)', marginBottom: '.85rem' }}>{featured[0].title}</h1>
          <p className="s3" style={{ fontFamily: "'Cinzel',serif", fontSize: 'clamp(.73rem,.98vw,.88rem)', letterSpacing: '.06em', color: 'rgba(255,245,232,.52)', marginBottom: '.72rem' }}>{featured[0].genre.join(' · ')}</p>
          <p className="s4" style={{ fontFamily: "'Crimson Pro',serif", fontSize: 'clamp(.9rem,1.2vw,1.05rem)', lineHeight: 1.78, color: 'rgba(255,245,232,.68)', maxWidth: 530, marginBottom: '1.4rem' }}>{featured[0].desc}</p>
          <div className="s4" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.8rem' }}>
            <div className="badge-r">⭐ {featured[0].r}</div>
            <span style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.38)', alignSelf: 'center', fontFamily: "'Cinzel',serif" }}>{featured[0].eps} eps · {featured[0].yr}</span>
          </div>
          <div className="s5" style={{ display: 'flex', gap: '.85rem', flexWrap: 'wrap' }}>
            <button className="btn-p">▶ Play Now</button>
            <button className="btn-g">ℹ More Info</button>
          </div>
        </div>
      </section>

      {/* Content Rows */}
      <section style={{ padding: '3rem 0', position: 'relative', zIndex: 3 }}>
        {['Trending Now', 'Popular TV', 'Top Rated', 'Sci-Fi', 'Animation', 'Comedy'].map((title, i) => (
          <div key={title} style={{ marginBottom: 44 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, paddingInline: 'clamp(1rem,5vw,3rem)' }}>
              <div>
                <div style={{ fontSize: '8.5px', color: 'rgba(255,245,232,.3)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 5, fontFamily: "'Cinzel',serif" }}>Curated for you</div>
                <div className="sec" style={{ fontSize: 'clamp(1rem,2vw,1.25rem)' }}>{title}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-icon" style={{ width: 30, height: 30, fontSize: 12 }}>←</button>
                <button className="btn-icon" style={{ width: 30, height: 30, fontSize: 12 }}>→</button>
              </div>
            </div>
            <div className="hide-scroll" style={{ display: 'flex', gap: 14, padding: '6px clamp(1rem,5vw,3rem)', overflowX: 'auto' }}>
              {featured.map((item, j) => {
                const s = CS[(i * 3 + j) % CS.length];
                return (
                  <div key={`${i}-${j}`} style={{ flexShrink: 0, width: 'clamp(135px,18vw,215px)', animation: `card-in .45s ${j * 0.06}s both` }}>
                    <div className="card" style={{ height: 296, background: s.bg }}>
                      <div className="cring" />
                      <div className="cinfo">
                        <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: '.92rem', color: '#FFF5E8', marginBottom: 3, textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>{item.title}</div>
                        <div style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.48)' }}>{item.genre.slice(0, 2).join(' · ')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Genre Portals */}
      <section style={{ padding: '0 clamp(1rem,5vw,3rem) 4rem', position: 'relative', zIndex: 3 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="sec" style={{ fontSize: 'clamp(1.1rem,2.2vw,1.5rem)', marginBottom: 4 }}>Genre Portals</h2>
          <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.82rem', color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>Step into a world</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(200px,20vw,300px),1fr))', gap: '1.2rem' }}>
          {GCARDS.map((g, i) => (
            <div key={g.key} className="genre-portal" style={{ animationDelay: `${i * 0.08}s`, border: `1px solid ${g.tc}25` }}>
              <div className="portal-backdrop" style={{ backgroundImage: g.col }} />
              <div className="portal-overlay" />
              <div className="portal-content">
                <div style={{ fontFamily: "'Cinzel Decorative',serif", fontWeight: 900, fontSize: 'clamp(1.1rem,1.8vw,1.5rem)', color: '#FFF5E8', letterSpacing: '.04em', textShadow: '0 3px 12px rgba(0,0,0,.9)', marginBottom: 4 }}>{g.name}</div>
                <div className="portal-cta">Enter Portal →</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mood Section */}
      <section style={{ padding: '0 clamp(1rem,5vw,3rem) 4rem', position: 'relative', zIndex: 3 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="sec" style={{ fontSize: 'clamp(1.1rem,2.2vw,1.5rem)', marginBottom: 4 }}>Watch by Mood</h2>
          <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.82rem', color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>Pick your vibe</div>
        </div>
        <div className="hide-scroll" style={{ display: 'flex', gap: 'clamp(.8rem,1.4vw,1.2rem)', overflowX: 'auto', paddingBottom: 8 }}>
          {MOODS.map((m, i) => (
            <div key={m.name} className="mood-landscape" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="mood-bg" style={{ background: `linear-gradient(160deg,${m.col}08,${m.col}1a,${m.col}0c)` }} />
              <div className="mood-overlay" />
              <div className="mood-content">
                <div style={{ fontFamily: "'Cinzel Decorative',serif", fontWeight: 900, fontSize: 'clamp(.95rem,1.4vw,1.15rem)', color: '#FFF5E8', letterSpacing: '.04em', textShadow: '0 3px 10px rgba(0,0,0,.8)', marginBottom: 4 }}>{m.name}</div>
                <div style={{ width: 32, height: 2, background: `linear-gradient(90deg, ${m.col}, transparent)`, borderRadius: 2, opacity: 0.5 }} />
              </div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', border: `1px solid ${m.col}18`, pointerEvents: 'none', zIndex: 3 }} />
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 3, background: '#04020A', borderTop: '1px solid rgba(255,255,255,.055)', padding: '3rem clamp(1rem,5vw,3rem) 2.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          <div>
            <span className="logo" style={{ fontSize: '1.25rem', display: 'block', marginBottom: '.6rem' }}>LUMINA</span>
            <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.88rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.68 }}>The dreamlike world of streaming.</p>
          </div>
          <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', letterSpacing: '.14em', color: 'rgba(255,179,71,.6)', marginBottom: '.9rem' }}>GENRES</div>{GCARDS.map(g => <div key={g.name} style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.86rem', color: 'rgba(255,245,232,.38)', marginBottom: '.42rem', cursor: 'pointer' }}>{g.name}</div>)}</div>
          <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', letterSpacing: '.14em', color: 'rgba(255,179,71,.6)', marginBottom: '.9rem' }}>ACCOUNT</div>{['Sign In', 'My List', 'History'].map(l => <div key={l} style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.86rem', color: 'rgba(255,245,232,.38)', marginBottom: '.42rem', cursor: 'pointer' }}>{l}</div>)}</div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.055)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', letterSpacing: '.09em', color: 'rgba(255,245,232,.22)' }}>© 2025 LUMINA STREAM · ALL RIGHTS RESERVED</div>
        </div>
      </footer>
    </div>
  );
}
