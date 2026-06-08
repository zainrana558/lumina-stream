'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import SearchOverlay from '@/components/layout/SearchOverlay';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import ContentRow from '@/components/common/ContentRow';
import type { MediaItem } from '@/types';

export default function ClientBrowse({ sections }: { sections: { title: string; items: MediaItem[]; genreId: number }[] }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="page" style={{ paddingTop: 80 }}>
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      <div style={{ padding: '0 var(--pad) 3rem' }}>
        <h1 className="h1" style={{ fontSize: 'clamp(1.8rem,4vw,3.2rem)', marginBottom: '.5rem' }}>Browse</h1>
        <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: '1rem', color: 'rgba(255,245,232,.5)', fontStyle: 'italic', marginBottom: '2.5rem' }}>Explore by genre — find your next obsession</p>
      </div>
      <section style={{ position: 'relative', zIndex: 3, paddingBottom: '3rem' }}>
        {sections.map((s, i) => (
          <ContentRow key={s.title} title={s.title} sub={`${s.items.length} titles`} items={s.items} endpoint="/discover/movie" params={{ with_genres: String(s.genreId), sort_by: 'popularity.desc' }} />
        ))}
      </section>
      <Footer />
      <BottomNav />
    </div>
  );
}
