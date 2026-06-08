'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useApp } from '@/contexts/AppContext';
import { getPosterUrl } from '@/lib/images';

interface Collection {
  id: string;
  name: string;
  description: string;
  cover_path: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  profile: { id: string; name: string; avatar_url: string | null };
  item_count: number;
}

interface CollectionItem {
  id: string;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
  order_index: number;
  added_at: string;
}

const DEFAULT_COVERS = [
  'linear-gradient(135deg,#FF6B8A22,#FF6B8A08)',
  'linear-gradient(135deg,#8B78FF22,#8B78FF08)',
  'linear-gradient(135deg,#4ECDC422,#4ECDC408)',
  'linear-gradient(135deg,#FFB34722,#FFB34708)',
  'linear-gradient(135deg,#78D62122,#78D62108)',
];

export function CollectionCard({ collection, onClick }: { collection: Collection; onClick: () => void }) {
  const coverBg = collection.cover_path
    ? `url(https://image.tmdb.org/t/p/w300${collection.cover_path}) center/cover no-repeat`
    : DEFAULT_COVERS[collection.id.charCodeAt(0) % DEFAULT_COVERS.length];

  return (
    <div
      onClick={onClick}
      className="neo-card"
      style={{
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        transition: 'transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s',
        animation: 'card-in .45s both',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,.6), 0 0 20px rgba(139,120,255,.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Cover area */}
      <div style={{
        height: 140, position: 'relative',
        background: coverBg,
        display: 'flex', alignItems: 'flex-end',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.8) 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', padding: '12px 14px', width: '100%' }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.82rem', color: '#FFF5E8', fontWeight: 700, marginBottom: 2, textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>
            {collection.name}
          </div>
          <div style={{ fontSize: '.55rem', color: 'rgba(255,245,232,.45)', fontFamily: "'JetBrains Mono',monospace" }}>
            {collection.item_count} {collection.item_count === 1 ? 'title' : 'titles'}
          </div>
        </div>
        {!collection.is_public && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            padding: '2px 8px', borderRadius: 6,
            background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
            fontSize: '.48rem', color: 'rgba(255,245,232,.5)',
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            Private
          </div>
        )}
      </div>
      {/* Description */}
      {collection.description && (
        <div style={{ padding: '10px 14px 12px', fontSize: '.65rem', color: 'rgba(255,245,232,.4)', fontFamily: "'Crimson Pro',serif", lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {collection.description}
        </div>
      )}
    </div>
  );
}

export function CreateCollectionModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: { name: string; description: string; isPublic: boolean }) => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) { setName(''); setDesc(''); setIsPublic(true); setCreating(false); }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    await onCreate({ name: name.trim(), description: desc.trim(), isPublic });
    setCreating(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 998,
      background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fi .2s ease both',
    }} onClick={onClose}>
      <div
        className="neo-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: 420, maxWidth: 'calc(100vw - 2rem)', borderRadius: 18,
          padding: '1.8rem', animation: 'eu .3s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.1rem', color: '#FFF5E8', marginBottom: '1.2rem' }}>Create Collection</div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '.62rem', color: 'rgba(255,179,71,.6)', fontFamily: "'Cinzel',serif", letterSpacing: '.08em', marginBottom: 6 }}>NAME</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Top 10 Shonen"
              maxLength={100}
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                background: '#08051A', border: '1px solid rgba(255,255,255,.08)',
                color: '#FFF5E8', fontFamily: "'Crimson Pro',serif", fontSize: '.9rem',
                outline: 'none', transition: 'border-color .2s',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(139,120,255,.5)'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,.08)'; }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '.62rem', color: 'rgba(255,179,71,.6)', fontFamily: "'Cinzel',serif", letterSpacing: '.08em', marginBottom: 6 }}>DESCRIPTION (optional)</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Best action anime of all time..."
              maxLength={500}
              rows={3}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                background: '#08051A', border: '1px solid rgba(255,255,255,.08)',
                color: '#FFF5E8', fontFamily: "'Crimson Pro',serif", fontSize: '.85rem',
                outline: 'none', resize: 'vertical', transition: 'border-color .2s',
              }}
              onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(139,120,255,.5)'; }}
              onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,.08)'; }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: isPublic ? 'linear-gradient(135deg,#78D621,#4ECDC4)' : 'rgba(255,255,255,.1)',
                position: 'relative', cursor: 'pointer', border: 'none',
                transition: 'background .3s',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2,
                left: isPublic ? 20 : 2,
                transition: 'left .3s cubic-bezier(.34,1.56,.64,1)',
                boxShadow: '0 2px 4px rgba(0,0,0,.3)',
              }} />
            </button>
            <span style={{ fontSize: '.7rem', color: 'rgba(255,245,232,.5)', fontFamily: "'Crimson Pro',serif" }}>
              {isPublic ? 'Anyone can see this collection' : 'Only you can see this collection'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-g" style={{ padding: '8px 18px', borderRadius: 10, fontSize: '.72rem' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="btn-p"
              style={{ padding: '8px 22px', borderRadius: 10, fontSize: '.72rem', opacity: name.trim() ? 1 : .5 }}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CollectionDetail({ collectionId }: { collectionId: string }) {
  const { user, profile } = useApp();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const res = await fetch(`/api/collections/${collectionId}`);
        const data = await res.json();
        if (data.collection) {
          setCollection(data.collection);
          setItems(data.items || []);
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchCollection();
  }, [collectionId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,245,232,.3)', fontFamily: "'Cinzel',serif" }}>
        <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '1.5rem' }}>✦</div>
        <div style={{ marginTop: '.5rem' }}>Loading collection...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: 'rgba(255,245,232,.5)' }}>Collection not found</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 'clamp(1.2rem,2.5vw,1.6rem)', color: '#FFF5E8', marginBottom: 6 }}>{collection.name}</div>
          {collection.description && (
            <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.85rem', color: 'rgba(255,245,232,.45)', lineHeight: 1.5, marginBottom: 8 }}>
              {collection.description}
            </div>
          )}
          <div style={{ fontSize: '.58rem', color: 'rgba(255,245,232,.25)', fontFamily: "'JetBrains Mono',monospace" }}>
            by {collection.profile.name} · {items.length} {items.length === 1 ? 'title' : 'titles'} · {new Date(collection.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Items grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(120px,15vw,160px), 1fr))', gap: '1rem' }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            onClick={() => router.push(`/details/${item.media_id}`)}
            style={{
              cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
              animation: `card-in .4s ${i * 0.04}s both`,
              transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <div style={{
              aspectRatio: '2/3', position: 'relative', borderRadius: 12,
              background: 'linear-gradient(135deg,#14052E,#2D1B5E)',
              boxShadow: '3px 3px 10px rgba(0,0,0,.6)',
              overflow: 'hidden',
            }}>
              {item.poster_path ? (
                <Image src={getPosterUrl({ poster_path: item.poster_path }, 'w342') || ''} alt={item.title} fill sizes="(max-width: 768px) 33vw, 15vw" loading="lazy" style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: .2 }}>🎬</div>
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 8px', background: 'linear-gradient(to top, rgba(0,0,0,.85), transparent)', }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', color: '#FFF5E8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 2px 6px rgba(0,0,0,.8)' }}>
                  {item.title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.5rem', opacity: .3 }}>📋</div>
          <div style={{ fontFamily: "'Crimson Pro',serif", color: 'rgba(255,245,232,.35)' }}>This collection is empty</div>
        </div>
      )}
    </div>
  );
}
