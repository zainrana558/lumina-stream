'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import SupabaseNotConfigured from '@/components/common/SupabaseNotConfigured';
import { CollectionCard, CreateCollectionModal, CollectionDetail } from '@/components/common/Collections';

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

export default function CollectionsPage() {
  const { user, profile, authLoading, supabaseReady } = useApp();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/collections?profileId=${profile.id}`);
      const data = await res.json();
      setCollections(data.collections || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => { if (!cancelled) await fetchCollections(); };
    load();
    return () => { cancelled = true; };
  }, [fetchCollections]);

  const handleCreate = async (data: { name: string; description: string; isPublic: boolean }) => {
    if (!profile) return;
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          name: data.name,
          description: data.description,
          isPublic: data.isPublic,
        }),
      });
      const result = await res.json();
      if (result.collection) {
        setShowCreate(false);
        fetchCollections();
      }
    } catch { /* silent */ }
  };

  const handleDelete = async (collectionId: string) => {
    if (!profile) return;
    if (!confirm('Delete this collection? This cannot be undone.')) return;
    try {
      await fetch('/api/collections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, collectionId }),
      });
      fetchCollections();
    } catch { /* silent */ }
  };

  const P = 'clamp(1rem,5vw,3rem)';

  // Redirect to profile selection if logged in but no profile selected
  useEffect(() => {
    if (user && !profile && !authLoading) {
      router.replace('/profiles');
    }
  }, [user, profile, authLoading, router]);

  if (!supabaseReady) return <SupabaseNotConfigured />;

  if (!user) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ fontSize: '3rem', opacity: .3 }}>📋</div>
        <h2 className="f-cinzel" style={{  fontSize: '1.2rem', color: 'rgba(255,245,232,.6)', letterSpacing: '.08em' }}>Sign in to manage collections</h2>
        <button className="btn-p" onClick={() => router.push('/login')}>Sign In</button>
      </div>
    );
  }

  // Wait for profile to load (redirect handled by useEffect above)
  if (!profile) return null;

  // Show collection detail view
  if (selectedCollection) {
    return (
      <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ padding: `2.2rem ${P} 0`, position: 'relative', zIndex: 3 }}>
          <button
            onClick={() => setSelectedCollection(null)}
            className="btn-g"
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: '.68rem', marginBottom: '1rem' }}
          >
            ← Back to Collections
          </button>
        </div>
        <div style={{ padding: `0 ${P} 5.5rem`, position: 'relative', zIndex: 3 }}>
          <CollectionDetail collectionId={selectedCollection} />
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: `2.2rem ${P} 0`, position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', marginBottom: 4 }}>Collections</h1>
            <p className="f-crimson" style={{  color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>
              Create curated lists of your favorite shows
            </p>
          </div>
          <button
            className="btn-p f-cinzel"
            onClick={() => setShowCreate(true)}
            style={{ padding: '10px 22px', borderRadius: 12, fontSize: '.72rem',  letterSpacing: '.04em' }}
          >
            + New Collection
          </button>
        </div>
      </div>

      <div style={{ padding: `1.5rem ${P} 5.5rem`, position: 'relative', zIndex: 3 }}>
        {loading ? (
          <div className="f-cinzel" style={{ textAlign: 'center', padding: '5rem', color: 'rgba(255,245,232,.3)',  fontSize: '.82rem', letterSpacing: '.1em' }}>
            <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '1.5rem', marginBottom: '.5rem' }}>✦</div>
            <div>Loading collections...</div>
          </div>
        ) : collections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem', opacity: .25 }}>📋</div>
            <h3 className="f-cinzel" style={{  fontSize: '1.1rem', color: 'rgba(255,245,232,.5)', marginBottom: '.5rem' }}>No collections yet</h3>
            <p className="f-crimson" style={{  color: 'rgba(255,245,232,.3)', marginBottom: '1.5rem', fontSize: '.9rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
              Create your first collection to organize your favorite shows into curated lists like &quot;My Top 10 Shonen&quot; or &quot;Weekend Binge&quot;
            </p>
            <button className="btn-p" onClick={() => setShowCreate(true)} style={{ padding: '10px 28px', borderRadius: 12, fontSize: '.75rem' }}>
              Create Your First Collection
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(200px,22vw,280px), 1fr))', gap: '1.2rem' }}>
            {collections.map((col, i) => (
              <div key={col.id} style={{ position: 'relative' }}>
                <CollectionCard
                  collection={col}
                  onClick={() => setSelectedCollection(col.id)}
                />
                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(col.id); }}
                  style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 5,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,.08)',
                    color: 'rgba(255,245,232,.5)', fontSize: '.7rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity .2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#FF4A4A'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                  aria-label="Delete collection"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateCollectionModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
