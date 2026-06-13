'use client';

import { useState } from 'react';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface PlayerControlsProps {
  speed: number;
  muted: boolean;
  volume: number;
  subtitlesOn: boolean;
  showTitle: string;
  showEpInfo: string;
  onSetSpeed: (speed: number) => void;
  onToggleMute: () => void;
  onSetVolume: (vol: number) => void;
  onToggleSubtitles: () => void;
  onPlayPause: () => void;
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
  onReplay: () => void;
  onExit: () => void;
  onPip: () => void;
}

export default function PlayerControls({
  speed, muted, volume, subtitlesOn,
  showTitle, showEpInfo,
  onSetSpeed, onToggleMute, onSetVolume, onToggleSubtitles,
  onPlayPause, onPrevEpisode, onNextEpisode, onReplay, onExit, onPip,
}: PlayerControlsProps) {
  const [speedOpen, setSpeedOpen] = useState(false);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
      padding: '16px 24px 20px',
      background: 'linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.4) 60%, transparent 100%)',
      animation: 'fi .3s ease both',
    }}>
      {/* Info bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="f-cinzel" style={{  fontSize: '.85rem', color: '#FFF5E8', fontWeight: 600 }}>{showTitle}</div>
          {showEpInfo && <div className="f-mono" style={{  fontSize: '.65rem', color: 'rgba(255,245,232,.45)', marginTop: 2 }}>{showEpInfo}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="f-mono" style={{  fontSize: '.6rem', color: 'rgba(255,245,232,.5)', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,.05)' }}>{speed}x</span>
          <span className="f-mono" style={{  fontSize: '.6rem', color: subtitlesOn ? 'rgba(255,179,71,.8)' : 'rgba(255,245,232,.3)', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,.05)' }}>CC {subtitlesOn ? 'ON' : 'OFF'}</span>
        </div>
      </div>

      {/* Volume slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button onClick={onToggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#FFF5E8', width: 28, textAlign: 'center' }}>
          {muted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
        </button>
        <input
          type="range" min={0} max={100} value={muted ? 0 : volume}
          onChange={e => onSetVolume(Number(e.target.value))}
          style={{ flex: 1, height: 4, accentColor: 'rgba(255,179,71,.7)', cursor: 'pointer' }}
        />
      </div>

      {/* Transport controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Prev Episode */}
          <button onClick={onPrevEpisode} title="Previous Episode" style={{
            width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.85rem', color: '#FFF5E8', transition: 'all .2s',
          }}>⏮</button>
          {/* Replay 30s */}
          <button onClick={onReplay} title="Replay 30 seconds" style={{
            width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,.1)',
            border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', color: '#FFF5E8', transition: 'all .2s',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ transform: 'scaleX(-1)' }}>▶</span><span className="f-mono" style={{ fontSize: '.55rem',  marginLeft: 1 }}>30</span>
            </span>
          </button>
          {/* Play/Pause */}
          <button onClick={onPlayPause} title="Play/Pause" style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(255,179,71,.2)', border: '1.5px solid rgba(255,179,71,.5)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', color: '#FFF5E8', transition: 'all .2s',
            boxShadow: '0 0 16px rgba(255,179,71,.2)',
          }}>▶</button>
          {/* Forward 30s */}
          <button onClick={() => {}} title="Forward 30 seconds" style={{
            width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,.1)',
            border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', color: '#FFF5E8', transition: 'all .2s',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span className="f-mono" style={{ fontSize: '.55rem',  marginRight: 1 }}>30</span><span>▶</span>
            </span>
          </button>
          {/* Next Episode */}
          <button onClick={onNextEpisode} title="Next Episode" style={{
            width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.85rem', color: '#FFF5E8', transition: 'all .2s',
          }}>⏭</button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Speed dropdown */}
          <div style={{ position: 'relative' }}>
            <button className="f-mono"
              onClick={() => setSpeedOpen(!speedOpen)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: '.65rem',

                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)',
                color: '#FFF5E8', cursor: 'pointer',
              }}
            >{speed}x</button>
            {speedOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
                background: '#0C091A', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 10, padding: 4, minWidth: 80,
                boxShadow: '4px 4px 16px rgba(0,0,0,.8)',
              }}>
                {SPEEDS.map(sp => (
                  <button className="f-mono"
                    key={sp}
                    onClick={() => { onSetSpeed(sp); setSpeedOpen(false); }}
                    style={{
                      display: 'block', width: '100%', padding: '6px 12px',
                      background: speed === sp ? 'rgba(255,179,71,.2)' : 'transparent',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                       fontSize: '.7rem',
                      color: speed === sp ? 'rgba(255,179,71,.9)' : '#FFF5E8',
                      transition: 'all .15s',
                    }}
                  >{sp}x</button>
                ))}
              </div>
            )}
          </div>
          {/* Subtitles */}
          <button className="f-cinzel" onClick={onToggleSubtitles} title="Toggle Subtitles" style={{
            padding: '7px 14px', borderRadius: 8, fontSize: '.65rem',
            background: subtitlesOn ? 'rgba(255,179,71,.15)' : 'rgba(255,255,255,.08)',
            border: `1px solid ${subtitlesOn ? 'rgba(255,179,71,.4)' : 'rgba(255,255,255,.1)'}`,
            color: subtitlesOn ? 'rgba(255,179,71,.9)' : '#FFF5E8', cursor: 'pointer',
            flexShrink: 0,
          }}>CC</button>
          {/* PiP */}
          <button onClick={onPip} title="Picture in Picture" className="btn-g" style={{ padding: '7px 16px', fontSize: '.72rem', flexShrink: 0, whiteSpace: 'nowrap' }}>PiP</button>
          {/* Exit */}
          <button onClick={onExit} className="btn-g" style={{ padding: '7px 16px', fontSize: '.72rem', flexShrink: 0, whiteSpace: 'nowrap' }}>Exit</button>
        </div>
      </div>
    </div>
  );
}
