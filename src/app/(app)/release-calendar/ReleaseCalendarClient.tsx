'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CS } from '@/styles/themes';

import { getPosterUrl } from '@/lib/images';

interface UpcomingMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
  genre_ids: number[];
  popularity: number;
}

interface ReleaseCalendarClientProps {
  grouped: Record<string, UpcomingMovie[]>;
  sortedMonths: string[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ReleaseCalendarClient({ grouped, sortedMonths }: ReleaseCalendarClientProps) {
  const router = useRouter();
  const [expandedMovie, setExpandedMovie] = useState<number | null>(null);

  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: '2.2rem clamp(1rem,5vw,3rem) 0', position: 'relative', zIndex: 3 }}>
        <div className="page-in" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📅</span>
          <h1 className="sec" style={{ fontSize: 'clamp(1.3rem,3vw,2rem)' }}>Release Calendar</h1>
        </div>
        <p className="s2" style={{ fontFamily: "'Crimson Pro',serif", color: 'rgba(255,245,232,.45)', fontSize: '1rem' }}>
          Upcoming movie releases · {sortedMonths.length} months
        </p>
      </div>

      <section style={{ padding: '2rem clamp(1rem,5vw,3rem) 5.5rem', position: 'relative', zIndex: 3 }}>
        {sortedMonths.map((monthKey, monthIdx) => {
          const [yearStr, monthStr] = monthKey.split('-');
          const monthName = MONTH_NAMES[parseInt(monthStr) - 1];
          const movies = grouped[monthKey];

          return (
            <div key={monthKey} style={{ marginBottom: '2.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                marginBottom: '1rem',
                paddingBottom: '.75rem',
                borderBottom: '1px solid rgba(255,255,255,.06)',
                animation: `card-in .5s ${monthIdx * 0.08}s both`,
              }}>
                <h2 style={{
                  fontFamily: "'Cinzel',serif",
                  fontSize: 'clamp(1rem,2vw,1.3rem)',
                  color: '#FFF5E8',
                  fontWeight: 700,
                  letterSpacing: '.04em',
                }}>
                  {monthName} {yearStr}
                </h2>
                <span style={{
                  fontSize: '.68rem',
                  color: 'rgba(255,179,71,.6)',
                  fontFamily: "'JetBrains Mono',monospace",
                  background: '#0D0A1E',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}>
                  {movies.length} movies
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                {movies.map((movie, i) => {
                  const isExpanded = expandedMovie === movie.id;
                  const cs = Math.abs(movie.id) % 8;
                  const releaseDate = new Date(movie.release_date);
                  const day = releaseDate.getDate();
                  const dayOfWeek = releaseDate.toLocaleDateString('en-US', { weekday: 'short' });
                  const formattedDate = releaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                  return (
                    <div
                      key={movie.id}
                      className="neo-raised"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedMovie(isExpanded ? null : movie.id);
                        }
                      }}
                      onClick={() => setExpandedMovie(isExpanded ? null : movie.id)}
                      style={{
                        padding: '1rem 1.1rem',
                        borderRadius: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start',
                        animation: `card-in .4s ${monthIdx * 0.08 + i * 0.04}s both`,
                        border: isExpanded ? `1px solid ${CS[cs].acc}33` : '1px solid rgba(255,255,255,.04)',
                        transition: 'border-color .25s',
                      }}
                    >
                      {/* Date badge */}
                      <div style={{
                        flexShrink: 0,
                        width: 48,
                        textAlign: 'center',
                        paddingTop: 2,
                      }}>
                        <div style={{
                          fontFamily: "'Cinzel',serif",
                          fontSize: '1.3rem',
                          fontWeight: 700,
                          color: CS[cs].acc,
                          lineHeight: 1.1,
                        }}>
                          {String(day).padStart(2, '0')}
                        </div>
                        <div style={{
                          fontSize: '.58rem',
                          color: 'rgba(255,245,232,.3)',
                          fontFamily: "'Cinzel',serif",
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                        }}>
                          {dayOfWeek}
                        </div>
                      </div>

                      {/* Poster */}
                      {movie.poster_path ? (
                        <div style={{
                          width: 48,
                          height: 72,
                          borderRadius: 8,
                          overflow: 'hidden',
                          flexShrink: 0,
                          boxShadow: '3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.2)',
                        }}>
                          <Image
                            src={getPosterUrl({ poster_path: movie.poster_path }, 'w92') || ''}
                            alt={movie.title}
                            width={48}
                            height={72}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: 48,
                          height: 72,
                          borderRadius: 8,
                          flexShrink: 0,
                          background: CS[cs].bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          boxShadow: '3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.2)',
                        }}>
                          {CS[cs].em}
                        </div>
                      )}

                      {/* Title & Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: "'Cinzel',serif",
                          fontWeight: 600,
                          fontSize: '.88rem',
                          color: '#FFF5E8',
                          marginBottom: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {movie.title}
                        </div>
                        <div style={{
                          fontSize: '.68rem',
                          color: 'rgba(255,245,232,.4)',
                          fontFamily: "'JetBrains Mono',monospace",
                          marginBottom: isExpanded ? 8 : 0,
                        }}>
                          {formattedDate}
                          {movie.vote_average > 0 ? ` · ⭐ ${movie.vote_average.toFixed(1)}` : ''}
                        </div>

                        {/* Expanded overview */}
                        {isExpanded && movie.overview && (
                          <div style={{
                            fontFamily: "'Crimson Pro',serif",
                            fontSize: '.88rem',
                            color: 'rgba(255,245,232,.65)',
                            lineHeight: 1.7,
                            marginTop: '.5rem',
                            animation: 'fi .2s ease both',
                          }}>
                            {movie.overview}
                          </div>
                        )}

                        {isExpanded && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/details/${movie.id}`);
                            }}
                            className="btn-p"
                            style={{ marginTop: '.75rem', padding: '7px 16px', fontSize: '.72rem' }}
                          >
                            View Details
                          </button>
                        )}
                      </div>

                      {/* Expand indicator */}
                      <span style={{
                        flexShrink: 0,
                        fontSize: '.7rem',
                        color: 'rgba(255,245,232,.25)',
                        transition: 'transform .25s',
                        display: 'inline-block',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        marginTop: 8,
                      }}>
                        ▶
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
