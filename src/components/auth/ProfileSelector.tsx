'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createProfile, deleteProfile } from '@/actions/profiles';
import { useApp } from '@/contexts/AppContext';

interface ProfileData {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  is_kids?: boolean;
}

const AVATAR_COLORS = ['#8B78FF', '#FF6B8A', '#52C8F5', '#78D621', '#FF9020'];
const MAX_PROFILES = 5;

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function ProfileSelector({ profiles }: { profiles: ProfileData[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';
  const supabase = createClient();
  const { refreshProfile, handleSignOut } = useApp();

  const [profileName, setProfileName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editKids, setEditKids] = useState(false);
  const [saving, setSaving] = useState(false);

  // Avatar upload state
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = async (profileId: string) => {
    setError('');
    try {
      const res = await fetch('/api/select-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });

      if (!res.ok) {
        setError('Failed to select profile');
        return;
      }

      // Refresh profile in AppContext BEFORE navigating
      // so the target page sees the profile immediately
      await refreshProfile();
      router.push(nextUrl);
    } catch {
      setError('An unexpected error occurred');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    if (profiles.length >= MAX_PROFILES) {
      setError(`Maximum ${MAX_PROFILES} profiles allowed`);
      return;
    }

    setError('');
    setCreating(true);

    try {
      const result = await createProfile(profileName);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    } catch {
      setError('Failed to create profile');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    setError('');
    setDeleting(profileId);

    try {
      // deleteProfile verifies ownership server-side via requireAuth()
      const result = await deleteProfile(profileId);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    } catch {
      setError('Failed to delete profile');
    } finally {
      setDeleting(null);
    }
  };

  const handleSignOutNav = async () => {
    await handleSignOut();
    router.push('/login');
  };

  // Start editing a profile
  const startEdit = (profile: ProfileData) => {
    setEditingId(profile.id);
    setEditName(profile.name);
    setEditKids(!!profile.is_kids);
  };

  // Save profile edits (name + kids mode)
  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: editingId, name: editName, is_kids: editKids }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update profile');
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload handler
  const handleAvatarClick = (profileId: string) => {
    setUploadingId(profileId);
    // We use the ref to trigger file input
    const input = document.getElementById(`avatar-input-${profileId}`) as HTMLInputElement;
    if (input) input.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, profileId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a JPEG, PNG, WebP, or GIF image');
      setUploadingId(null);
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError(`File too large (${formatBytes(file.size)}). Maximum 2 MB allowed.`);
      setUploadingId(null);
      return;
    }

    setUploadingId(profileId);
    setError('');

    try {
      // Upload to Supabase storage
      const ext = file.name.split('.').pop() || 'webp';
      const filename = `${Date.now()}.${ext}`;
      const filePath = `${profileId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const res = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, avatar_url: publicUrl }),
      });

      if (!res.ok) {
        setError('Failed to update avatar');
      } else {
        router.refresh();
      }
    } catch (err) {
      setError('Failed to upload avatar');
    } finally {
      setUploadingId(null);
    }

    // Reset file input
    e.target.value = '';
  };

  return (
    <>
      <div className="ps-container">
        <div className="ps-header">
          <h1>LUMINA</h1>
          <p>Who&apos;s watching tonight?</p>
          <button className="ps-signout" onClick={handleSignOutNav}>
            ← Sign Out
          </button>
        </div>

        <div className="ps-grid">
          {profiles.map((profile, index) => (
            <div key={profile.id} className="ps-card">
              <button
                className="ps-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(profile.id);
                }}
                disabled={deleting === profile.id}
                title="Delete profile"
              >
                {deleting === profile.id ? '...' : '✕'}
              </button>

              {/* Avatar - clickable for upload */}
              <div
                className="ps-avatar"
                style={{
                  background: profile.avatar_url
                    ? `url(${profile.avatar_url}) center/cover no-repeat`
                    : getAvatarColor(index),
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onClick={() => handleAvatarClick(profile.id)}
                title="Click to change avatar"
              >
                {!profile.avatar_url && getInitials(profile.name)}

                {/* Camera overlay on hover */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,.55)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity .2s',
                  pointerEvents: 'none',
                }}
                className="avatar-hover-overlay"
                >
                  <span style={{ fontSize: '1.2rem' }}>📷</span>
                </div>

                {/* Upload spinner */}
                {uploadingId === profile.id && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ animation: 'spin 1s linear infinite', fontSize: '1.1rem' }}>✦</div>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                id={`avatar-input-${profile.id}`}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => handleAvatarUpload(e, profile.id)}
              />

              <div className="ps-name">{profile.name}</div>

              {/* Kids badge */}
              {profile.is_kids && (
                <div style={{
                  fontSize: '.52rem', fontFamily: "'Cinzel',serif",
                  letterSpacing: '.08em', color: '#78D621',
                  background: 'rgba(120,214,33,.12)',
                  padding: '2px 8px', borderRadius: 10,
                  border: '1px solid rgba(120,214,33,.25)',
                  marginBottom: '.4rem',
                }}>
                  👶 KIDS
                </div>
              )}

              {/* Edit button */}
              {editingId !== profile.id && (
                <button
                  className="ps-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(profile);
                  }}
                  style={{
                    fontSize: '.55rem', fontFamily: "'Cinzel',serif",
                    letterSpacing: '.06em', padding: '3px 10px',
                    borderRadius: 6, border: '1px solid rgba(255,255,255,.1)',
                    background: 'rgba(255,255,255,.04)', color: 'rgba(255,245,232,.5)',
                    cursor: 'pointer', transition: 'all .2s', marginTop: '.3rem',
                  }}
                >
                  ✏ Edit
                </button>
              )}

              {/* Edit panel */}
              {editingId === profile.id && (
                <div style={{
                  width: '100%', marginTop: '.5rem',
                  display: 'flex', flexDirection: 'column', gap: '.4rem',
                  padding: '.5rem', borderRadius: 10,
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(255,255,255,.06)',
                }}>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={20}
                    style={{
                      background: '#0C091A', border: '1px solid rgba(255,255,255,.1)',
                      borderRadius: 8, padding: '6px 10px', color: '#FFF5E8',
                      fontSize: '.75rem', fontFamily: "'Crimson Pro',serif",
                      outline: 'none',
                    }}
                    placeholder="Profile name"
                  />
                  {/* Kids Mode Toggle */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '.6rem',
                    padding: '4px 0',
                  }}>
                    <span style={{
                      fontSize: '.65rem', fontFamily: "'Cinzel',serif",
                      color: 'rgba(255,245,232,.5)', letterSpacing: '.05em',
                    }}>👶 Kids Mode</span>
                    <button
                      onClick={() => setEditKids(!editKids)}
                      style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: editKids ? '#78D621' : 'rgba(255,255,255,.1)',
                        border: `1px solid ${editKids ? 'rgba(120,214,33,.4)' : 'rgba(255,255,255,.1)'}`,
                        cursor: 'pointer', position: 'relative',
                        transition: 'all .25s', flexShrink: 0,
                      }}
                      role="switch"
                      aria-checked={editKids}
                    >
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: editKids ? '#05020A' : '#FFF5E8',
                        position: 'absolute', top: 2,
                        left: editKids ? 18 : 3,
                        transition: 'left .25s', boxShadow: '0 1px 3px rgba(0,0,0,.4)',
                      }} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                      disabled={saving || !editName.trim()}
                      style={{
                        flex: 1, padding: '5px 0', borderRadius: 8,
                        background: 'rgba(255,179,71,.15)', border: '1px solid rgba(255,179,71,.3)',
                        color: '#FFB347', fontFamily: "'Cinzel',serif",
                        fontSize: '.58rem', letterSpacing: '.06em',
                        cursor: saving ? 'wait' : 'pointer', transition: 'all .2s',
                      }}
                    >
                      {saving ? '...' : '✓ Save'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                      style={{
                        flex: 1, padding: '5px 0', borderRadius: 8,
                        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
                        color: 'rgba(255,245,232,.5)', fontFamily: "'Cinzel',serif",
                        fontSize: '.58rem', letterSpacing: '.06em',
                        cursor: 'pointer', transition: 'all .2s',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                className="ps-select-btn"
                onClick={() => handleSelect(profile.id)}
              >
                Select
              </button>
            </div>
          ))}
        </div>

        {profiles.length < MAX_PROFILES && (
          <div className="ps-create-section">
            <div className="ps-create-label">CREATE NEW PROFILE</div>
            <form className="ps-create-row" onSubmit={handleCreate}>
              <input
                className="ps-create-input"
                type="text"
                placeholder="Profile name..."
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                maxLength={20}
                required
              />
              <button
                className="ps-create-btn"
                type="submit"
                disabled={creating || !profileName.trim()}
              >
                {creating ? '...' : 'Create'}
              </button>
            </form>
            <div className="ps-count">
              {profiles.length} / {MAX_PROFILES} profiles
            </div>
          </div>
        )}

        <div className="ps-error">{error}</div>
      </div>

      {/* Hover overlay styles */}
      <style jsx>{`
        .ps-avatar:hover .avatar-hover-overlay {
          opacity: 1;
        }
      `}</style>
    </>
  );
}
