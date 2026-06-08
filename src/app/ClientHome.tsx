'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import SearchOverlay from '@/components/layout/SearchOverlay';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import HeroCarousel from '@/components/common/HeroCarousel';
import ContentRow from '@/components/common/ContentRow';
import GenrePortal from '@/components/common/GenrePortal';
import MoodCard from '@/components/common/MoodCard';
import { GCARDS, MOODS } from '@/styles/themes';
import type { MediaItem, ContentRowData } from '@/types';

export default function ClientHome({ featured, rows }: { featured: MediaItem[]; rows: ContentRowData[] }) {
  const [searchOpen, setSearchOpen] = useState(false);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Good Morning';
    if (h >= 12 && h < 17) return 'Good Afternoon';
    if (h >= 17 && h < 21) return 'Good Evening';
    return 'Late Night Vibes';
  })();

  return (
    <div className="page">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      <HeroCarousel items={featured} />

      <section style={{ padding: '0 0 3.5rem', position: 'relative', zIndex: 3 }}>
        {rows.map((row, i) => (
          <ContentRow key={`row-${i}`} title={row.title} sub={row.sub} items={row.items} endpoint={row.endpoint} params={row.params} />
        ))}
      </section>

      <section style={{ padding: `0 var(--pad) 4rem`, position: 'relative', zIndex: 3 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="sec" style={{ fontSize: 'clamp(1.1rem,2.2vw,1.5rem)', marginBottom: 4 }}>Genre Portals</h2>
          <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.82rem', color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>{greeting} — step into a world</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(200px,20vw,300px),1fr))', gap: '1.2rem' }}>
          {GCARDS.map((g, i) => <GenrePortal key={g.key} genre={g} index={i} />)}
        </div>
      </section>

      <section style={{ padding: `0 var(--pad) 4rem`, position: 'relative', zIndex: 3 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="sec" style={{ fontSize: 'clamp(1.1rem,2.2vw,1.5rem)', marginBottom: 4 }}>Watch by Mood</h2>
          <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.82rem', color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>Pick your vibe — each mood is alive</div>
        </div>
        <div className="hide-scroll" style={{ display: 'flex', gap: 'clamp(.8rem,1.4vw,1.2rem)', overflowX: 'auto', paddingBottom: 8 }}>
          {MOODS.map((m, i) => <MoodCard key={m.name} mood={m} index={i} />)}
        </div>
      </section>

      <Footer />
      <BottomNav />
    </div>
  );
}
