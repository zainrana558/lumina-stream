'use client';

import { useState, useEffect } from 'react';

export interface FilterState {
  genre: string;
  yearFrom: string;
  yearTo: string;
  minRating: string;
  sortBy: string;
  mediaType: string;
  runtimeFrom: string;
  runtimeTo: string;
}

interface SearchFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  genres: { id: number; name: string }[];
  mediaType?: string;
}

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Popularity' },
  { value: 'vote_average.desc', label: 'Rating' },
  { value: 'release_date.desc', label: 'Newest' },
  { value: 'release_date.asc', label: 'Oldest' },
];

export default function SearchFilters({ filters, onFilterChange, genres, mediaType = 'all' }: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- intentional: sync local state with prop changes */
    setLocalFilters(filters);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [filters]);

  const handleChange = (key: keyof FilterState, value: string) => {
    const updated = { ...localFilters, [key]: value };
    if (key === 'mediaType') {
      updated.genre = '';
    }
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  const removeFilter = (key: keyof FilterState) => {
    const defaults: Partial<FilterState> = {
      genre: '', yearFrom: '', yearTo: '', minRating: '',
      sortBy: '', mediaType: mediaType, runtimeFrom: '', runtimeTo: '',
    };
    const updated = { ...localFilters, [key]: defaults[key] || '' };
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  const clearAll = () => {
    const cleared: FilterState = {
      genre: '', yearFrom: '', yearTo: '', minRating: '',
      sortBy: '', mediaType: mediaType, runtimeFrom: '', runtimeTo: '',
    };
    setLocalFilters(cleared);
    onFilterChange(cleared);
  };

  const activeFilters: { key: keyof FilterState; label: string }[] = [];
  if (localFilters.genre) {
    const g = genres.find(g => g.id === Number(localFilters.genre));
    activeFilters.push({ key: 'genre', label: g ? g.name : localFilters.genre });
  }
  if (localFilters.yearFrom) activeFilters.push({ key: 'yearFrom', label: `From ${localFilters.yearFrom}` });
  if (localFilters.yearTo) activeFilters.push({ key: 'yearTo', label: `To ${localFilters.yearTo}` });
  if (localFilters.minRating) activeFilters.push({ key: 'minRating', label: `≥ ${localFilters.minRating}★` });
  if (localFilters.runtimeFrom) activeFilters.push({ key: 'runtimeFrom', label: `≥ ${localFilters.runtimeFrom} min` });
  if (localFilters.runtimeTo) activeFilters.push({ key: 'runtimeTo', label: `≤ ${localFilters.runtimeTo} min` });
  if (localFilters.sortBy) {
    const opt = SORT_OPTIONS.find(o => o.value === localFilters.sortBy);
    if (opt) activeFilters.push({ key: 'sortBy', label: `Sort: ${opt.label}` });
  }

  const currentYear = new Date().getFullYear();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Filter controls row */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Media type toggle */}
        <div style={{ display: 'flex', gap: 2, background: '#090716', borderRadius: 10, padding: 2, boxShadow: 'inset 2px 2px 6px rgba(0,0,0,.6),inset -1px -1px 3px rgba(35,20,75,.15)' }}>
          {(['all', 'movie', 'tv'] as const).map(t => (
            <button className="f-cinzel"
              key={t}
              onClick={() => handleChange('mediaType', t)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                fontSize: '.68rem',
                
                cursor: 'pointer',
                background: localFilters.mediaType === t ? 'var(--gold)' : 'transparent',
                color: localFilters.mediaType === t ? '#05020A' : 'rgba(255,245,232,.4)',
                fontWeight: localFilters.mediaType === t ? 700 : 400,
                transition: 'all .22s',
              }}
            >
              {t === 'all' ? 'All' : t === 'movie' ? 'Movies' : 'TV'}
            </button>
          ))}
        </div>

        {/* Genre dropdown */}
        <select
          value={localFilters.genre}
          onChange={(e) => handleChange('genre', e.target.value)}
          className="neo-select"
          style={{ maxWidth: 160 }}
        >
          <option value="" style={{ background: '#0C091A' }}>Genre</option>
          {genres.map(g => (
            <option key={g.id} value={g.id} style={{ background: '#0C091A' }}>{g.name}</option>
          ))}
        </select>

        {/* Year range */}
        <input
          type="number"
          className="inp"
          placeholder="Year from"
          min={1900}
          max={currentYear + 5}
          value={localFilters.yearFrom}
          onChange={(e) => handleChange('yearFrom', e.target.value)}
          style={{ width: 90, padding: '6px 10px', fontSize: '.72rem' }}
        />
        <span style={{ color: 'rgba(255,245,232,.25)', alignSelf: 'center', fontSize: '.72rem' }}>–</span>
        <input
          type="number"
          className="inp"
          placeholder="Year to"
          min={1900}
          max={currentYear + 5}
          value={localFilters.yearTo}
          onChange={(e) => handleChange('yearTo', e.target.value)}
          style={{ width: 90, padding: '6px 10px', fontSize: '.72rem' }}
        />

        {/* Runtime range */}
        <input
          type="number"
          className="inp"
          placeholder="Min min"
          min={0}
          max={300}
          value={localFilters.runtimeFrom}
          onChange={(e) => handleChange('runtimeFrom', e.target.value)}
          style={{ width: 80, padding: '6px 10px', fontSize: '.72rem' }}
        />
        <span style={{ color: 'rgba(255,245,232,.25)', alignSelf: 'center', fontSize: '.72rem' }}>–</span>
        <input
          type="number"
          className="inp"
          placeholder="Max min"
          min={0}
          max={300}
          value={localFilters.runtimeTo}
          onChange={(e) => handleChange('runtimeTo', e.target.value)}
          style={{ width: 80, padding: '6px 10px', fontSize: '.72rem' }}
        />
        {/* Min rating */}
        <select
          value={localFilters.minRating}
          onChange={(e) => handleChange('minRating', e.target.value)}
          className="neo-select"
          style={{ maxWidth: 100 }}
        >
          <option value="" style={{ background: '#0C091A' }}>Rating</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <option key={n} value={n} style={{ background: '#0C091A' }}>≥ {n}★</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={localFilters.sortBy}
          onChange={(e) => handleChange('sortBy', e.target.value)}
          className="neo-select"
          style={{ maxWidth: 120 }}
        >
          <option value="" style={{ background: '#0C091A' }}>Sort by</option>
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value} style={{ background: '#0C091A' }}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="f-cinzel" style={{ fontSize: '.6rem', color: 'rgba(255,245,232,.3)',  letterSpacing: '.08em' }}>FILTERS:</span>
          {activeFilters.map(f => (
            <span
              key={f.key}
              onClick={() => removeFilter(f.key)}
              className="gtag"
              style={{ cursor: 'pointer', fontSize: '.6rem', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {f.label}
              <span style={{ opacity: 0.5 }}>✕</span>
            </span>
          ))}
          <button className="f-cinzel"
            onClick={clearAll}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '.6rem', color: '#FF6B8A', 
              padding: '3px 8px',
            }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
