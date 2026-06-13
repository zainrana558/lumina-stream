'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MOOD_SOUNDS: Record<string, { type: string; freq: number; freq2?: number; wave: OscillatorType; filterFreq?: number; lfoRate?: number; lfoDepth?: number }> = {
  Melancholy: { type: 'drone', freq: 100, freq2: 150, wave: 'sine', lfoRate: 0.3, lfoDepth: 15 },
  Pumped:     { type: 'rhythm', freq: 200, freq2: 400, wave: 'square', lfoRate: 4, lfoDepth: 0.8 },
  Romantic:   { type: 'pad', freq: 220, freq2: 330, wave: 'sine', lfoRate: 5, lfoDepth: 8 },
  Thrilling:  { type: 'tension', freq: 150, freq2: 157, wave: 'sawtooth', lfoRate: 0.1, lfoDepth: 50 },
  Chill:      { type: 'noise', freq: 800, wave: 'sine', filterFreq: 400, lfoRate: 0.2, lfoDepth: 100 },
  Epic:       { type: 'sweep', freq: 100, freq2: 400, wave: 'sawtooth', lfoRate: 0.15, lfoDepth: 0.5 },
};

const MOOD_COLORS: Record<string, string> = {
  Melancholy: '#8B78FF', Pumped: '#FFB347', Romantic: '#FF6B8A',
  Thrilling: '#FF4A4A', Chill: '#78D621', Epic: '#FF8C00',
};

export default function AmbientSoundscape({ mood }: { mood?: string }) {
  const [playing, setPlaying] = useState(false);
  const [selectedMood, setSelectedMood] = useState(mood || 'Chill');
  const [volume, setVolume] = useState(0.15);
  const [panelOpen, setPanelOpen] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ oscs: (OscillatorNode | AudioBufferSourceNode)[]; gains: GainNode[]; master: GainNode } | null>(null);

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lumina-soundscape');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.mood) setSelectedMood(data.mood);
        if (data.enabled) setPlaying(true);
      }
    } catch {}
  }, []);

  const stopAll = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes) {
      nodes.oscs.forEach(o => { try { o.stop(); } catch {} });
      nodes.gains.forEach(g => { try { g.disconnect(); } catch {} });
      try { nodes.master.disconnect(); } catch {}
      nodesRef.current = null;
    }
  }, []);

  const startSound = useCallback((moodName: string, vol: number) => {
    stopAll();
    const cfg = MOOD_SOUNDS[moodName];
    if (!cfg) return;

    const ctx = ctxRef.current || new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const master = ctx.createGain();
    master.gain.value = vol;
    master.connect(ctx.destination);

    const allOscs: (OscillatorNode | AudioBufferSourceNode)[] = [];
    const allGains: GainNode[] = [];

    if (cfg.type === 'noise') {
      // White noise through lowpass filter
      const bufSize = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cfg.filterFreq || 400;
      filter.Q.value = 1;
      noise.connect(filter);
      const gain = ctx.createGain();
      gain.gain.value = 0.4;
      filter.connect(gain);
      gain.connect(master);
      noise.start();
      // LFO modulating filter frequency
      const lfo = ctx.createOscillator();
      lfo.frequency.value = cfg.lfoRate || 0.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = cfg.lfoDepth || 100;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      allOscs.push(noise, lfo);
      allGains.push(gain);
    } else {
      // Oscillator-based
      const osc1 = ctx.createOscillator();
      osc1.type = cfg.wave;
      osc1.frequency.value = cfg.freq;
      const g1 = ctx.createGain();
      g1.gain.value = 0.3;
      osc1.connect(g1);
      g1.connect(master);

      const osc2 = ctx.createOscillator();
      osc2.type = cfg.wave;
      osc2.frequency.value = cfg.freq2 || cfg.freq * 1.5;
      const g2 = ctx.createGain();
      g2.gain.value = 0.15;
      osc2.connect(g2);
      g2.connect(master);

      osc1.start();
      osc2.start();
      allOscs.push(osc1, osc2);
      allGains.push(g1, g2);

      // LFO modulation
      if (cfg.lfoRate) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = cfg.lfoRate;
        const lfoG = ctx.createGain();
        lfoG.gain.value = cfg.lfoDepth || 10;
        lfo.connect(lfoG);
        lfoG.connect(osc1.frequency);
        lfoG.connect(osc2.frequency);
        lfo.start();
        allOscs.push(lfo);
        allGains.push(lfoG);
      }
    }

    nodesRef.current = { oscs: allOscs, gains: allGains, master };
  }, [stopAll]);

  const toggle = useCallback(() => {
    if (playing) {
      stopAll();
      setPlaying(false);
      try { localStorage.setItem('lumina-soundscape', JSON.stringify({ mood: selectedMood, enabled: false })); } catch {}
    } else {
      startSound(selectedMood, volume);
      setPlaying(true);
      try { localStorage.setItem('lumina-soundscape', JSON.stringify({ mood: selectedMood, enabled: true })); } catch {}
    }
  }, [playing, selectedMood, volume, startSound, stopAll]);

  const selectMood = useCallback((m: string) => {
    setSelectedMood(m);
    if (playing) {
      startSound(m, volume);
    }
    try { localStorage.setItem('lumina-soundscape', JSON.stringify({ mood: m, enabled: playing })); } catch {}
  }, [playing, volume, startSound]);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    if (nodesRef.current) {
      nodesRef.current.master.gain.value = v;
    }
    try { localStorage.setItem('lumina-soundscape', JSON.stringify({ mood: selectedMood, enabled: playing, volume: v })); } catch {}
  }, [selectedMood, playing]);

  // Cleanup on unmount
  useEffect(() => () => { stopAll(); if (ctxRef.current) ctxRef.current.close(); }, [stopAll]);

  const moodColor = MOOD_COLORS[selectedMood] || '#FFB347';

  return (
    <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 950, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      {/* Mini panel */}
      {panelOpen && (
        <div style={{
          background: '#0D0A1E', borderRadius: 14,
          padding: '14px 16px',
          boxShadow: `8px 8px 24px rgba(0,0,0,.85), -3px -3px 10px rgba(45,25,90,.22), 0 0 0 1px ${moodColor}22`,
          animation: 'eu .3s cubic-bezier(.34,1.56,.64,1) both',
          display: 'flex', flexDirection: 'column', gap: 10,
          minWidth: 200,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.keys(MOOD_SOUNDS).map(m => (
              <button
                key={m}
                onClick={() => selectMood(m)}
                style={{
                  padding: '6px 12px', borderRadius: 20,
                  border: `1px solid ${m === selectedMood ? MOOD_COLORS[m] + '60' : 'rgba(255,255,255,.06)'}`,
                  background: m === selectedMood ? `${MOOD_COLORS[m]}15` : '#110E24',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all .2s',
                  boxShadow: m === selectedMood ? `0 0 12px ${MOOD_COLORS[m]}20` : 'none',
                }}
              >
                <span className="f-cinzel" style={{  fontSize: '.6rem', color: m === selectedMood ? MOOD_COLORS[m] : 'rgba(255,245,232,.5)', letterSpacing: '.06em' }}>{m}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.3)' }}>Vol</span>
            <input
              type="range"
              min={0}
              max={0.3}
              step={0.01}
              value={volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              style={{ flex: 1, height: 3, accentColor: moodColor, cursor: 'pointer' }}
            />
          </div>
        </div>
      )}
      {/* Toggle button */}
      <button className="f-cinzel"
        onClick={() => { if (playing) toggle(); else setPanelOpen(p => !p); }}
        onContextMenu={(e) => { e.preventDefault(); setPanelOpen(p => !p); }}
        style={{
          width: 42, height: 42, borderRadius: '50%',
          border: `1px solid ${playing ? moodColor + '40' : 'rgba(255,255,255,.06)'}`,
          background: playing ? `${moodColor}12` : '#0D0A1E',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '.7rem',  fontWeight: 700,
          boxShadow: `4px 4px 12px rgba(0,0,0,.7), -2px -2px 6px rgba(45,25,90,.2), inset 0 1px 0 rgba(255,255,255,.04)${playing ? `, 0 0 16px ${moodColor}25` : ''}`,
          transition: 'all .3s',
          animation: playing ? `breathe 2s ease-in-out infinite` : 'none',
          color: playing ? moodColor : 'rgba(255,245,232,.4)',
        }}
        title={playing ? 'Click to stop' : 'Right-click or hold for options'}
      >
        {playing ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
