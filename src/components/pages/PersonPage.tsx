'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Card from '@/components/common/Card';
import type { MediaItem } from '@/types';
import { tmdbToMedia } from '@/types';

interface PersonCredit {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  character?: string;
  job?: string;
  department?: string;
  episode_count?: number;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  popularity?: number;
  overview?: string;
}

interface PersonData {
  id: number;
  name: string;
  profile_path: string | null;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  homepage: string | null;
  also_known_as: string[];
  known_for_department: string;
  combined_credits?: {
    cast: PersonCredit[];
    crew: PersonCredit[];
  };
}

const TMDB_GENRE_ID_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

function creditToMediaItem(c: PersonCredit): MediaItem {
  const title = c.title || c.name || 'Untitled';
  const date = c.release_date || c.first_air_date || '';
  const year = date ? parseInt(date.split('-')[0]) : 2024;
  const genres = (c.genre_ids || []).map(id => TMDB_GENRE_ID_MAP[id] || '').filter(Boolean);
  return {
    id: c.id,
    title,
    sub: c.character || c.job || c.department || '',
    genre: genres.length > 0 ? genres : ['Drama'],
    r: c.vote_average || 0,
    yr: year,
    eps: 10,
    st: '',
    tag: c.media_type === 'movie' ? 'Movie' : 'Series',
    cs: Math.abs(c.id) % 8,
    featured: (c.vote_average || 0) > 7.5,
    progress: 0,
    desc: c.overview || '',
    cast: [],
    epList: [],
    poster_path: c.poster_path,
    backdrop_path: null,
    media_type: c.media_type,
  };
}

type FilterTab = 'all' | 'cast' | 'crew';

export default function PersonPageClient({ person }: { person: PersonData }) {
  const router = useRouter();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'year'>('popularity');

  const allCredits = useMemo(() => {
    let credits: PersonCredit[] = [];
    if (person.combined_credits?.cast) credits = [...credits, ...person.combined_credits.cast];
    if (person.combined_credits?.crew) credits = [...credits, ...person.combined_credits.crew];
    // Deduplicate by id
    const seen = new Set<number>();
    return credits.filter(c => {
      if (seen.has(c.id) || !c.poster_path) return false;
      seen.add(c.id);
      return true;
    });
  }, [person]);

  const filteredCredits = useMemo(() => {
    let list = allCredits;
    if (filter === 'cast') list = list.filter(c => c.character || c.media_type === 'movie');
    if (filter === 'crew') list = list.filter(c => c.job || c.department);
    if (sortBy === 'popularity') list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    if (sortBy === 'year') list.sort((a, b) => {
      const aDate = a.release_date || a.first_air_date || '';
      const bDate = b.release_date || b.first_air_date || '';
      return bDate.localeCompare(aDate);
    });
    return list;
  }, [allCredits, filter, sortBy]);

  const knownFor = useMemo(() => {
    return allCredits
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 6)
      .map(creditToMediaItem);
  }, [allCredits]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const age = person.birthday
    ? `${Math.floor((new Date(person.deathday || new Date().toISOString()).getTime() - new Date(person.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years old`
    : null;

  return (
    <div className="page" style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <div style={{ position: 'relative', minHeight: '50vh', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg,#05020A 0%,#0C091A 30%,#18063A 60%,#2D1B5E 100%)',
          zIndex: 0,
        }} />
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,179,71,.15) 0%,transparent 65%)', filter: 'blur(60px)', animation: 'aurora 12s ease-in-out infinite' }} />

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130, background: 'linear-gradient(to bottom,#07040F,transparent)', zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top,#07040F 0%,rgba(7,4,15,.85) 50%,transparent 100%)', zIndex: 2 }} />

        <button className="btn-g" onClick={() => router.back()} style={{ position: 'absolute', top: 'clamp(70px,8vw,88px)', left: 'clamp(1rem,5vw,2.5rem)', zIndex: 10, padding: '9px 18px', fontSize: '.73rem' }}>← Back</button>

        <div style={{ position: 'absolute', bottom: '8%', left: 'clamp(1rem,5vw,2.5rem)', right: 'clamp(1rem,5vw,2.5rem)', zIndex: 3, maxWidth: 'clamp(300px,60vw,1040px)', display: 'flex', gap: 'clamp(1.5rem,3vw,2.5rem)', alignItems: 'flex-end' }}>
          {/* Profile Photo */}
          <div style={{
            width: 'clamp(140px,18vw,220px)', height: 'clamp(200px,26vw,320px)',
            borderRadius: 16, overflow: 'hidden', flexShrink: 0,
            boxShadow: '8px 8px 24px rgba(0,0,0,.8),-3px -3px 10px rgba(45,25,90,.25),inset 0 1px 0 rgba(255,255,255,.06),0 0 0 1px rgba(255,179,71,.2)',
          }}>
            {person.profile_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w780${person.profile_path}`}
                alt={person.name}
                width={220}
                height={320}
                loading="eager"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1E1838,#0C091A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>🎭</div>
            )}
          </div>

          {/* Name & Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: '.5rem', flexWrap: 'wrap' }}>
              <span className="badge-r" style={{ fontSize: '.62rem', padding: '3px 10px' }}>{person.known_for_department}</span>
              {person.combined_credits && (
                <span className="gtag" style={{ fontSize: '.58rem', padding: '3px 10px' }}>
                  {(person.combined_credits.cast?.length || 0) + (person.combined_credits.crew?.length || 0)} credits
                </span>
              )}
            </div>
            <h1 className="s2 f-cinzel-dec" style={{
               fontWeight: 900,
              fontSize: 'clamp(1.6rem,3.5vw,3rem)',
              background: 'linear-gradient(135deg,#FFF 0%,#FFB347 65%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: '.5rem', lineHeight: 1.1,
            }}>{person.name}</h1>
            <div className="f-crimson" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap',  fontSize: '.88rem', color: 'rgba(255,245,232,.55)' }}>
              {person.birthday && <span>📅 {formatDate(person.birthday)}</span>}
              {age && <span>🎂 {age}</span>}
              {person.place_of_birth && <span>📍 {person.place_of_birth}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem clamp(1rem,5vw,2.5rem)', position: 'relative', zIndex: 3, maxWidth: 1040, margin: '0 auto' }}>
        {/* Also Known As */}
        {person.also_known_as && person.also_known_as.length > 0 && (
          <div className="neo-raised" style={{ padding: '1.2rem 1.5rem', borderRadius: 16, marginBottom: '1.5rem' }}>
            <h3 className="f-cinzel" style={{  fontSize: '.68rem', letterSpacing: '.14em', color: '#FFB347', marginBottom: '.65rem' }}>ALSO KNOWN AS</h3>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              {person.also_known_as.map(name => (
                <span key={name} className="gtag" style={{ fontSize: '.7rem', padding: '4px 12px' }}>{name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Biography */}
        {person.biography && (
          <div className="neo-raised" style={{ padding: '1.4rem 1.6rem', borderRadius: 16, marginBottom: '2rem' }}>
            <h3 className="f-cinzel" style={{  fontSize: '.68rem', letterSpacing: '.14em', color: '#FFB347', marginBottom: '.75rem' }}>BIOGRAPHY</h3>
            <p className="f-crimson" style={{  lineHeight: 1.85, color: 'rgba(255,245,232,.75)', fontSize: 'clamp(.9rem,1.1vw,1rem)' }}>
              {bioExpanded || person.biography.length <= 400
                ? person.biography
                : person.biography.slice(0, 400) + '...'}
            </p>
            {person.biography.length > 400 && (
              <button className="f-cinzel" onClick={() => setBioExpanded(!bioExpanded)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#FFB347',
                 fontSize: '.72rem', marginTop: '.5rem', padding: 0,
              }}>
                {bioExpanded ? '▲ Show less' : '▼ Read more'}
              </button>
            )}
            {person.homepage && (
              <div style={{ marginTop: '1rem' }}>
                <a href={person.homepage} target="_blank" rel="noopener noreferrer" className="btn-g" style={{ display: 'inline-block', padding: '8px 16px', fontSize: '.72rem', textDecoration: 'none' }}>
                  🔗 Official Website
                </a>
              </div>
            )}
          </div>
        )}

        {/* Known For */}
        {knownFor.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="f-cinzel" style={{ fontSize: '8.5px', color: 'rgba(255,245,232,.3)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 5, }}>Most recognized for</div>
                <div className="sec" style={{ fontSize: 'clamp(1rem,2vw,1.25rem)' }}>🌟 Known For</div>
              </div>
            </div>
            <div className="hide-scroll" style={{ display: 'flex', gap: 14, padding: '6px 0', overflowX: 'auto', overflowY: 'visible' }}>
              {knownFor.map((item, i) => (
                <div key={item.id} style={{ animation: `card-in .45s ${i * 0.045}s both`, minWidth: 140, flexShrink: 0 }}>
                  <Card show={item} sz="md" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Filmography */}
        {allCredits.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: '.75rem' }}>
              <div>
                <div className="sec" style={{ fontSize: 'clamp(1rem,2vw,1.25rem)' }}>🎬 Full Filmography</div>
                <div className="f-crimson" style={{ fontSize: '.72rem', color: 'rgba(255,245,232,.3)',  marginTop: 4 }}>
                  {filteredCredits.length} titles
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                {/* Filter tabs */}
                {(['all', 'cast', 'crew'] as const).map(t => (
                  <button className="f-cinzel" key={t} onClick={() => setFilter(t)} style={{
                    padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: '.68rem',  fontWeight: 600,
                    background: filter === t ? 'var(--gold)' : '#090716',
                    color: filter === t ? '#05020A' : 'rgba(255,245,232,.4)',
                    boxShadow: filter === t ? '3px 3px 8px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22)' : 'inset 2px 2px 6px rgba(0,0,0,.6),inset -1px -1px 3px rgba(35,20,75,.15)',
                    transition: 'all .22s',
                    textTransform: 'capitalize',
                  }}>{t}</button>
                ))}
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'popularity' | 'year')} className="neo-select" style={{ maxWidth: 120 }}>
                  <option value="popularity" style={{ background: '#0C091A' }}>Popularity</option>
                  <option value="year" style={{ background: '#0C091A' }}>Newest</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '1.2rem' }}>
              {filteredCredits.map((credit, i) => {
                const mediaItem = creditToMediaItem(credit);
                return (
                  <div key={credit.id} style={{ animation: `card-in .42s ${Math.min(i, 8) * 0.035}s both` }}>
                    <Card show={mediaItem} sz="md" />
                    <div className="f-mono" style={{ marginTop: '.4rem', fontSize: '.58rem', color: 'rgba(255,245,232,.35)',  padding: '0 2px' }}>
                      {credit.character && <span>as {credit.character}</span>}
                      {credit.job && <span>{credit.job}</span>}
                      {credit.episode_count && <span> · {credit.episode_count} eps</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
