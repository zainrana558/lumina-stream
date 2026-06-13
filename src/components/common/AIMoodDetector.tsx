'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const MOOD_MAP: Record<string, { name: string; col: string }> = {
  Pumped:     { name: 'Pumped',     col: '#FFB347' },
  Melancholy: { name: 'Melancholy', col: '#8B78FF' },
  Romantic:   { name: 'Romantic',   col: '#FF6B8A' },
  Thrilling:  { name: 'Thrilling',  col: '#FF4A4A' },
  Chill:      { name: 'Chill',      col: '#78D621' },
  Epic:       { name: 'Epic',       col: '#FF8C00' },
};

function detectMood(brightness: number, warmth: number, contrast: number): string {
  if (brightness > 160 && warmth > 20) return 'Pumped';
  if (brightness < 80 && warmth < -10) return 'Melancholy';
  if (warmth > 15 && brightness > 90 && brightness < 170) return 'Romantic';
  if (brightness < 120 && contrast > 50) return 'Thrilling';
  if (brightness > 80 && brightness < 160 && contrast < 40) return 'Chill';
  return 'Epic';
}

interface AIMoodDetectorProps {
  onMoodDetected?: (mood: string) => void;
}

export default function AIMoodDetector({ onMoodDetected }: AIMoodDetectorProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'result' | 'error'>('idle');
  const [detectedMood, setDetectedMood] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const samplesRef = useRef<{ b: number; w: number; c: number }[]>([]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const analyze = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 64;
    canvas.height = 48;

    let frameCount = 0;
    const maxFrames = 12; // ~4 seconds at 3fps

    const sample = () => {
      if (frameCount >= maxFrames || !videoRef.current) {
        // Calculate average across all samples
        const samples = samplesRef.current;
        if (samples.length === 0) { setStatus('error'); stopCamera(); return; }

        const avgB = samples.reduce((s, x) => s + x.b, 0) / samples.length;
        const avgW = samples.reduce((s, x) => s + x.w, 0) / samples.length;
        const avgC = samples.reduce((s, x) => s + x.c, 0) / samples.length;

        const mood = detectMood(avgB, avgW, avgC);
        setDetectedMood(mood);
        setStatus('result');
        onMoodDetected?.(mood);
        stopCamera();
        return;
      }

      ctx.drawImage(video, 0, 0, 64, 48);
      const imageData = ctx.getImageData(0, 0, 64, 48);
      const pixels = imageData.data;

      let totalR = 0, totalG = 0, totalB = 0;
      const brightnesses: number[] = [];
      const pixelCount = pixels.length / 4;

      for (let i = 0; i < pixels.length; i += 4) {
        totalR += pixels[i];
        totalG += pixels[i + 1];
        totalB += pixels[i + 2];
        brightnesses.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
      }

      const avgBrightness = brightnesses.reduce((a, b) => a + b) / pixelCount;
      const warmth = (totalR / pixelCount) - (totalB / pixelCount);
      const variance = brightnesses.reduce((s, b) => s + Math.pow(b - avgBrightness, 2), 0) / pixelCount;
      const contrast = Math.sqrt(variance);

      samplesRef.current.push({ b: avgBrightness, w: warmth, c: contrast });
      frameCount++;

      rafRef.current = requestAnimationFrame(() => setTimeout(sample, 300));
    };

    sample();
  }, [onMoodDetected, stopCamera]);

  const startScan = useCallback(async () => {
    setStatus('scanning');
    setDetectedMood(null);
    samplesRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 64, height: 48 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Small delay for camera to stabilize
      setTimeout(analyze, 500);
    } catch {
      setStatus('error');
    }
  }, [analyze]);

  const reset = () => {
    setStatus('idle');
    setDetectedMood(null);
    samplesRef.current = [];
  };

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const mood = detectedMood ? MOOD_MAP[detectedMood] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={status === 'idle' || status === 'result' || status === 'error' ? startScan : undefined}
        style={{
          position: 'relative',
          padding: 'clamp(12px,1.5vw,16px) clamp(20px,2.8vw,32px)',
          borderRadius: 16,
          border: status === 'scanning' ? '1px solid rgba(78,208,196,.4)' : '1px solid rgba(78,208,196,.28)',
          background: 'linear-gradient(135deg, #0D0A1E 0%, #18063A 100%)',
          boxShadow: `4px 4px 14px rgba(0,0,0,.7), -2px -2px 6px rgba(45,25,90,.25), inset 0 1px 0 rgba(255,255,255,.06), 0 0 ${status === 'scanning' ? '20' : '12'}px ${status === 'scanning' ? 'rgba(78,208,196,.2)' : 'rgba(78,208,196,.1)'}`,
          cursor: status === 'scanning' ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          transition: 'all .3s ease',
          overflow: 'hidden',
        }}
      >
        <span className="f-cinzel" style={{
          fontSize: '1.1rem',
          
          fontWeight: 700,
          color: 'rgba(78,208,196,.8)',
          filter: 'drop-shadow(0 0 6px rgba(78,208,196,.5))',
          animation: status === 'scanning' ? 'pulse-dot 1s ease-in-out infinite' : 'none',
        }}>AI</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span className="f-cinzel" style={{
             fontSize: 'clamp(.55rem,.72vw,.65rem)',
            letterSpacing: '.14em', color: 'rgba(78,208,196,.6)',
            textTransform: 'uppercase', fontWeight: 600,
          }}>
            {status === 'scanning' ? 'Scanning...' : status === 'result' && mood ? `Your vibe: ${mood.name}` : status === 'error' ? 'Camera unavailable' : 'AI Mood'}
          </span>
          {status === 'result' && mood && (
            <span className="f-crimson" style={{
               fontSize: '.66rem',
              color: `${mood.col}80`, fontStyle: 'italic',
              animation: 'fi .3s ease both',
            }}>
              Based on your ambient lighting
            </span>
          )}
        </div>
      </button>

      {/* Hidden video + canvas for analysis */}
      <video ref={videoRef} playsInline muted style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
