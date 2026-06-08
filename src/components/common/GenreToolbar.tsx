'use client';

interface GenreToolbarProps {
  onSearch: (query: string) => void;
  onSort: (sort: string) => void;
  genres: string[];
  onGenreFilter: (genre: string | null) => void;
  activeSort?: string;
  activeGenre?: string | null;
}

const SORT_OPTIONS = [
  { value: 'rating_desc', label: 'Rating ↓' },
  { value: 'rating_asc', label: 'Rating ↑' },
  { value: 'year_desc', label: 'Newest' },
  { value: 'year_asc', label: 'Oldest' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
];

export default function GenreToolbar({ onSearch, onSort, genres, onGenreFilter, activeSort = 'rating_desc', activeGenre = null }: GenreToolbarProps) {
  return (
    <div style={{
      padding: '0 clamp(1rem,5vw,3rem)',
      marginBottom: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '.75rem',
      position: 'sticky', top: 64, zIndex: 5,
      paddingTop: 12, paddingBottom: 8,
      background: 'linear-gradient(to bottom, #07040F 60%, transparent)',
    }}>
      <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,245,232,.25)', fontSize: '.9rem' }}>🔍</span>
          <input
            className="inp"
            style={{ paddingLeft: 38, fontSize: '.88rem' }}
            placeholder="Search..."
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <select
          value={activeSort}
          onChange={(e) => onSort(e.target.value)}
          style={{
            padding: '11px 14px', background: '#090716',
            border: '1px solid rgba(255,255,255,.07)', borderRadius: 12,
            color: '#FFF5E8', fontFamily: "'Cinzel',serif", fontSize: '.7rem',
            cursor: 'pointer', outline: 'none',
            boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.7),inset -2px -2px 5px rgba(35,20,75,.18)',
          }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value} style={{ background: '#0C091A' }}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="hide-scroll" style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', paddingBottom: 2 }}>
        <button
          className={`chip${activeGenre === null ? ' on' : ''}`}
          onClick={() => onGenreFilter(null)}
          style={{ flexShrink: 0 }}
        >
          All
        </button>
        {genres.map(g => (
          <button
            key={g}
            className={`chip${activeGenre === g ? ' on' : ''}`}
            onClick={() => onGenreFilter(g)}
            style={{ flexShrink: 0 }}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
