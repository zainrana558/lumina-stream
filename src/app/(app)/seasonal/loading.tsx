import { Sparkles } from 'lucide-react';

export default function SeasonalLoading() {
  return (
    <div className="f-cinzel" style={{ textAlign: 'center', padding: '10rem 0', color: 'rgba(255,245,232,.5)',  letterSpacing: '.1em' }}>
      <div style={{ display: 'flex', justifyContent: 'center', animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }}><Sparkles size={32} /></div>
      <div>Loading seasonal tracker...</div>
    </div>
  );
}
