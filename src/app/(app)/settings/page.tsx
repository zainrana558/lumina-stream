'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import SupabaseNotConfigured from '@/components/common/SupabaseNotConfigured';
import Image from 'next/image';

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
}

const SECTIONS: SettingsSection[] = [
  { id: 'account', title: 'Account', icon: '👤' },
  { id: 'profile', title: 'Profile & Avatar', icon: '🎭' },
  { id: 'appearance', title: 'Appearance', icon: '🎨' },
  { id: 'notifications', title: 'Notifications', icon: '🔔' },
  { id: 'privacy', title: 'Privacy & Data', icon: '🔒' },
  { id: 'about', title: 'About Lumina', icon: '✨' },
];

export default function SettingsPage() {
  const { user, profile, authLoading, handleSignOut, supabaseReady } = useApp();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>('account');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
        <div style={{ fontSize: '3rem', opacity: .3 }}>⚙️</div>
        <h2 className="f-cinzel" style={{  fontSize: '1.2rem', color: 'rgba(255,245,232,.6)', letterSpacing: '.08em' }}>Sign in to access settings</h2>
        <button className="btn-p" onClick={() => router.push('/login')}>Sign In</button>
      </div>
    );
  }

  if (!profile) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const P = 'clamp(1rem,5vw,3rem)';

  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: `2.2rem ${P} 0`, position: 'relative', zIndex: 3 }}>
        <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', marginBottom: 4 }}>⚙️ Settings</h1>
        <p className="f-crimson" style={{  color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>
          Manage your account, preferences, and privacy
        </p>
      </div>

      <div style={{ padding: `1.5rem ${P} 5.5rem`, position: 'relative', zIndex: 3, display: 'flex', gap: '1.5rem' }}>
        {/* Sidebar - Desktop */}
        <nav style={{ display: 'none', width: 220, flexShrink: 0 }} className="settings-sidebar">
          <div style={{ position: 'sticky', top: 'clamp(70px,8vw,90px)', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {SECTIONS.map((section) => (
              <button className="f-cinzel"
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.65rem',
                  padding: '.65rem .9rem', borderRadius: 10,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                   fontSize: '.68rem',
                  letterSpacing: '.04em', transition: 'all .2s',
                  background: activeSection === section.id
                    ? 'linear-gradient(135deg,rgba(255,179,71,.12),rgba(255,107,138,.08))'
                    : 'transparent',
                  color: activeSection === section.id
                    ? '#FFF5E8'
                    : 'rgba(255,245,232,.4)',
                  borderLeft: activeSection === section.id
                    ? '2px solid #FFB347'
                    : '2px solid transparent',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{section.icon}</span>
                {section.title}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile Tab Selector */}
        <div style={{ display: 'none', width: '100%', marginBottom: '.5rem' }} className="settings-mobile-tabs">
          <div style={{ display: 'flex', gap: '.4rem', overflowX: 'auto', paddingBottom: '.5rem', WebkitOverflowScrolling: 'touch' }}>
            {SECTIONS.map((section) => (
              <button className="f-cinzel"
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.4rem',
                  padding: '.5rem .75rem', borderRadius: 20,
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                   fontSize: '.6rem',
                  letterSpacing: '.04em', transition: 'all .2s', flexShrink: 0,
                  background: activeSection === section.id
                    ? 'linear-gradient(135deg,rgba(255,179,71,.15),rgba(255,107,138,.1))'
                    : 'rgba(255,255,255,.04)',
                  color: activeSection === section.id
                    ? '#FFF5E8'
                    : 'rgba(255,245,232,.4)',
                  borderLeft: activeSection === section.id ? undefined : undefined,
                }}
              >
                <span>{section.icon}</span> {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeSection === 'account' && (
            <AccountSection
              user={user}
              profile={profile}
              onSignOut={() => { handleSignOut(); router.push('/'); }}
              showToast={showToast}
            />
          )}
          {activeSection === 'profile' && (
            <ProfileSection profile={profile} showToast={showToast} />
          )}
          {activeSection === 'appearance' && (
            <AppearanceSection showToast={showToast} />
          )}
          {activeSection === 'notifications' && (
            <NotificationsSection showToast={showToast} />
          )}
          {activeSection === 'privacy' && (
            <PrivacySection showToast={showToast} />
          )}
          {activeSection === 'about' && (
            <AboutSection />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="f-cinzel" style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '10px 20px', borderRadius: 12,
          background: 'linear-gradient(135deg,rgba(255,179,71,.2),rgba(255,107,138,.15))',
          border: '1px solid rgba(255,179,71,.3)',
           fontSize: '.72rem',
          color: '#FFF5E8', letterSpacing: '.04em',
          boxShadow: '0 4px 20px rgba(0,0,0,.6)',
          animation: 'card-in .3s both',
        }}>
          {toast}
        </div>
      )}

      {/* Responsive styles */}
      <style jsx>{`
        @media (min-width: 768px) {
          .settings-sidebar { display: block !important; }
          .settings-mobile-tabs { display: none !important; }
        }
        @media (max-width: 767px) {
          .settings-sidebar { display: none !important; }
          .settings-mobile-tabs { display: block !important; }
        }
      `}</style>
    </div>
  );
}

/* ============ ACCOUNT SECTION ============ */

function AccountSection({
  user,
  profile,
  onSignOut,
  showToast,
}: {
  user: any;
  profile: any;
  onSignOut: () => void;
  showToast: (msg: string) => void;
}) {
  return (
    <div style={{ animation: 'card-in .3s both' }}>
      <SectionHeader icon="👤" title="Account" subtitle="Your account information and session management" />

      <div className="neo-card s1" style={{ padding: '1.2rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div className="f-cinzel" style={{
            width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
            background: profile.avatar_url ? undefined : 'linear-gradient(135deg,#8B78FF,#FF6B8A)',
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 600, color: '#FFF5E8',
            
          }}>
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.name} width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              profile.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
            )}
          </div>
          <div>
            <div className="f-cinzel" style={{  fontSize: '.9rem', color: '#FFF5E8' }}>{profile.name}</div>
            <div className="f-mono" style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.35)',  marginTop: 2 }}>
              {user.email || 'No email'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          <InfoRow label="Profile ID" value={profile.id.slice(0, 8) + '...'} mono />
          <InfoRow label="Account ID" value={user.id.slice(0, 8) + '...'} mono />
          <InfoRow
            label="Member Since"
            value={profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
          />
          {profile.is_kids && <InfoRow label="Kids Mode" value="Enabled" highlight="#78D621" />}
        </div>
      </div>

      <div className="neo-card s1" style={{ padding: '1.2rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div className="f-cinzel" style={{  fontSize: '.72rem', color: 'rgba(255,245,232,.5)', letterSpacing: '.06em', marginBottom: '.8rem' }}>
          DANGER ZONE
        </div>
        <button className="f-cinzel"
          onClick={() => { if (confirm('Are you sure you want to sign out?')) { onSignOut(); } }}
          style={{
            width: '100%', padding: '.7rem', borderRadius: 10, border: 'none',
            cursor: 'pointer',  fontSize: '.72rem',
            letterSpacing: '.06em', transition: 'all .2s',
            background: 'rgba(255,74,74,.1)', color: '#FF4A4A',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,74,74,.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,74,74,.1)'; }}
        >
          Sign Out of Lumina
        </button>
      </div>
    </div>
  );
}

/* ============ PROFILE SECTION ============ */

function ProfileSection({ profile, showToast }: { profile: any; showToast: (msg: string) => void }) {
  const [name, setName] = useState(profile.name);
  const [kidsMode, setKidsMode] = useState(!!profile.is_kids);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, name, is_kids: kidsMode }),
      });
      if (res.ok) {
        showToast('Profile updated successfully');
      } else {
        showToast('Failed to update profile');
      }
    } catch {
      showToast('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ animation: 'card-in .3s both' }}>
      <SectionHeader icon="🎭" title="Profile & Avatar" subtitle="Customize your viewing identity" />

      <div className="neo-card s1" style={{ padding: '1.2rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div className="f-cinzel" style={{  fontSize: '.68rem', color: 'rgba(255,245,232,.4)', letterSpacing: '.06em', marginBottom: '.6rem' }}>
          DISPLAY NAME
        </div>
        <input className="f-crimson"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          style={{
            width: '100%', padding: '.65rem .9rem', borderRadius: 10,
            background: '#0C091A', border: '1px solid rgba(255,255,255,.08)',
            color: '#FFF5E8', fontSize: '.85rem',
             outline: 'none',
            transition: 'border-color .2s',
          }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,179,71,.3)'; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.08)'; }}
        />
        <div className="f-mono" style={{ fontSize: '.55rem', color: 'rgba(255,245,232,.25)', marginTop: '.3rem', }}>
          {name.length}/20 characters
        </div>
      </div>

      <div className="neo-card s1" style={{ padding: '1.2rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="f-cinzel" style={{  fontSize: '.72rem', color: '#FFF5E8', letterSpacing: '.04em' }}>
              👶 Kids Mode
            </div>
            <div className="f-crimson" style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.3)',  marginTop: 2 }}>
              Filter content suitable for younger audiences
            </div>
          </div>
          <button
            onClick={() => setKidsMode(!kidsMode)}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: kidsMode ? '#78D621' : 'rgba(255,255,255,.1)',
              border: `1px solid ${kidsMode ? 'rgba(120,214,33,.4)' : 'rgba(255,255,255,.1)'}`,
              cursor: 'pointer', position: 'relative',
              transition: 'all .25s', flexShrink: 0,
            }}
            role="switch"
            aria-checked={kidsMode}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: kidsMode ? '#05020A' : '#FFF5E8',
              position: 'absolute', top: 2,
              left: kidsMode ? 22 : 3,
              transition: 'left .25s', boxShadow: '0 1px 3px rgba(0,0,0,.4)',
            }} />
          </button>
        </div>
      </div>

      <button
        className="btn-p f-cinzel"
        onClick={handleSave}
        disabled={saving || name === profile.name}
        style={{
          width: '100%', padding: '.75rem', borderRadius: 12,
           fontSize: '.72rem',
          letterSpacing: '.06em', opacity: saving ? .6 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>

      <div className="f-crimson" style={{
        marginTop: '1rem', padding: '.8rem 1rem', borderRadius: 10,
        background: 'rgba(139,120,255,.06)', border: '1px solid rgba(139,120,255,.15)',
        fontSize: '.6rem', color: 'rgba(255,245,232,.35)', 
        lineHeight: 1.5,
      }}>
        💡 To change your avatar, visit the <span style={{ color: '#8B78FF', cursor: 'pointer' }} onClick={() => window.location.href = '/profiles'}>Manage Profiles</span> page and click on your profile picture.
      </div>
    </div>
  );
}

/* ============ APPEARANCE SECTION ============ */

function AppearanceSection({ showToast }: { showToast: (msg: string) => void }) {
  const [reducedMotion, setReducedMotion] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  return (
    <div style={{ animation: 'card-in .3s both' }}>
      <SectionHeader icon="🎨" title="Appearance" subtitle="Customize how Lumina looks and feels" />

      <div className="neo-card s1" style={{ padding: '1.2rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div className="f-cinzel" style={{  fontSize: '.72rem', color: '#FFF5E8', letterSpacing: '.04em' }}>
              🌊 Reduced Motion
            </div>
            <div className="f-crimson" style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.3)',  marginTop: 2 }}>
              Minimize animations and transitions
            </div>
          </div>
          <button
            onClick={() => {
              const next = !reducedMotion;
              setReducedMotion(next);
              document.documentElement.style.setProperty('--reduced-motion', next ? '1' : '0');
              showToast(next ? 'Reduced motion enabled' : 'Animations restored');
            }}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: reducedMotion ? '#4ECDC4' : 'rgba(255,255,255,.1)',
              border: `1px solid ${reducedMotion ? 'rgba(78,205,196,.4)' : 'rgba(255,255,255,.1)'}`,
              cursor: 'pointer', position: 'relative',
              transition: 'all .25s', flexShrink: 0,
            }}
            role="switch"
            aria-checked={reducedMotion}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: reducedMotion ? '#05020A' : '#FFF5E8',
              position: 'absolute', top: 2,
              left: reducedMotion ? 22 : 3,
              transition: 'left .25s', boxShadow: '0 1px 3px rgba(0,0,0,.4)',
            }} />
          </button>
        </div>
      </div>

      <div className="neo-card s1" style={{ padding: '1.2rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div className="f-cinzel" style={{  fontSize: '.68rem', color: 'rgba(255,245,232,.4)', letterSpacing: '.06em', marginBottom: '.6rem' }}>
          THEME COLORS
        </div>
        <p className="f-crimson" style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.3)',  lineHeight: 1.5, marginBottom: '.8rem' }}>
          Use the theme switcher in the top-right corner to toggle between dark and light themes. Additional theme customization will be available in a future update.
        </p>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {[
            { color: '#FFB347', label: 'Amber' },
            { color: '#8B78FF', label: 'Violet' },
            { color: '#FF6B8A', label: 'Rose' },
            { color: '#4ECDC4', label: 'Teal' },
          ].map(({ color, label }) => (
            <div key={color} style={{
              display: 'flex', alignItems: 'center', gap: '.4rem',
              padding: '.35rem .7rem', borderRadius: 8,
              background: `${color}12`, border: `1px solid ${color}30`,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              <span className="f-cinzel" style={{ fontSize: '.55rem', color: 'rgba(255,245,232,.4)',  letterSpacing: '.04em' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ NOTIFICATIONS SECTION ============ */

function NotificationsSection({ showToast }: { showToast: (msg: string) => void }) {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
    return Notification.permission;
  });

  return (
    <div style={{ animation: 'card-in .3s both' }}>
      <SectionHeader icon="🔔" title="Notifications" subtitle="Control how Lumina notifies you" />

      <div className="neo-card s1" style={{ padding: '1.2rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div className="f-cinzel" style={{  fontSize: '.68rem', color: 'rgba(255,245,232,.4)', letterSpacing: '.06em', marginBottom: '.6rem' }}>
          PUSH NOTIFICATIONS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="f-cinzel" style={{  fontSize: '.72rem', color: '#FFF5E8', letterSpacing: '.04em' }}>
              Browser Notifications
            </div>
            <div className="f-crimson" style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.3)',  marginTop: 2 }}>
              Get notified about new episodes and releases
            </div>
          </div>
          <span className="gtag" style={{
            fontSize: '.52rem', padding: '3px 10px',
            background: permission === 'granted' ? 'rgba(120,214,33,.12)' : permission === 'denied' ? 'rgba(255,74,74,.12)' : 'rgba(255,179,71,.12)',
            color: permission === 'granted' ? '#78D621' : permission === 'denied' ? '#FF4A4A' : '#FFB347',
            border: `1px solid ${permission === 'granted' ? 'rgba(120,214,33,.25)' : permission === 'denied' ? 'rgba(255,74,74,.25)' : 'rgba(255,179,71,.25)'}`,
          }}>
            {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not Set'}
          </span>
        </div>
        {permission !== 'granted' && permission !== 'denied' && (
          <button
            className="btn-p f-cinzel"
            onClick={async () => {
              if ('Notification' in window) {
                const result = await Notification.requestPermission();
                setPermission(result);
                showToast(result === 'granted' ? 'Notifications enabled!' : 'Notifications blocked');
              }
            }}
            style={{
              width: '100%', padding: '.6rem', borderRadius: 10,
               fontSize: '.68rem',
              letterSpacing: '.04em', marginTop: '.8rem',
            }}
          >
            Enable Notifications
          </button>
        )}
        {permission === 'denied' && (
          <div className="f-crimson" style={{
            marginTop: '.6rem', padding: '.5rem .8rem', borderRadius: 8,
            background: 'rgba(255,74,74,.06)', border: '1px solid rgba(255,74,74,.15)',
            fontSize: '.58rem', color: 'rgba(255,245,232,.3)', 
            lineHeight: 1.5,
          }}>
            Notifications are blocked in your browser settings. To enable them, go to your browser&apos;s site settings and allow notifications for this website.
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ PRIVACY SECTION ============ */

function PrivacySection({ showToast }: { showToast: (msg: string) => void }) {
  const [clearing, setClearing] = useState(false);

  const handleClearWatchlist = async () => {
    if (!confirm('Are you sure you want to clear your entire watchlist? This cannot be undone.')) return;
    setClearing(true);
    try {
      const res = await fetch('/api/watchlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearAll: true }) });
      if (res.ok) {
        showToast('Watchlist cleared');
      }
    } catch {
      showToast('Failed to clear watchlist');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div style={{ animation: 'card-in .3s both' }}>
      <SectionHeader icon="🔒" title="Privacy & Data" subtitle="Manage your data and privacy preferences" />

      <div className="neo-card s1" style={{ padding: '1.2rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div className="f-cinzel" style={{  fontSize: '.68rem', color: 'rgba(255,245,232,.4)', letterSpacing: '.06em', marginBottom: '.8rem' }}>
          DATA MANAGEMENT
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          <DataActionRow
            icon="📋"
            title="Clear Watchlist"
            description="Remove all titles from your watchlist"
            onClick={handleClearWatchlist}
            loading={clearing}
            danger
          />
        </div>
      </div>

      <div className="neo-card s1" style={{ padding: '1.2rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div className="f-cinzel" style={{  fontSize: '.68rem', color: 'rgba(255,245,232,.4)', letterSpacing: '.06em', marginBottom: '.6rem' }}>
          PRIVACY INFO
        </div>
        <div className="f-crimson" style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.3)',  lineHeight: 1.6 }}>
          Your viewing data is stored securely and used only to personalize your experience. We do not share your personal information with third parties. All data is stored on Supabase&apos;s encrypted infrastructure.
        </div>
      </div>
    </div>
  );
}

/* ============ ABOUT SECTION ============ */

function AboutSection() {
  return (
    <div style={{ animation: 'card-in .3s both' }}>
      <SectionHeader icon="✨" title="About Lumina" subtitle="Your personal streaming companion" />

      <div className="neo-card s1" style={{ padding: '1.5rem', borderRadius: 14, marginBottom: '1rem', textAlign: 'center' }}>
        <div className="f-cinzel-dec" style={{  fontSize: '1.8rem', color: '#FFB347', marginBottom: '.3rem', letterSpacing: '.06em' }}>
          LUMINA
        </div>
        <div className="f-crimson" style={{  fontSize: '.85rem', color: 'rgba(255,245,232,.3)', fontStyle: 'italic', marginBottom: '1rem' }}>
          Dream, Discover, Stream
        </div>
        <div className="f-mono" style={{
          display: 'inline-block', padding: '.3rem .8rem', borderRadius: 20,
          background: 'rgba(139,120,255,.1)', border: '1px solid rgba(139,120,255,.2)',
           fontSize: '.55rem',
          color: '#8B78FF', letterSpacing: '.04em',
        }}>
          v1.0.0
        </div>
      </div>

      <div className="neo-card s1" style={{ padding: '1.2rem 1.4rem', borderRadius: 14, marginBottom: '1rem' }}>
        <div className="f-cinzel" style={{  fontSize: '.68rem', color: 'rgba(255,245,232,.4)', letterSpacing: '.06em', marginBottom: '.6rem' }}>
          POWERED BY
        </div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          {[
            { name: 'Next.js 16', icon: '▲' },
            { name: 'Supabase', icon: '⚡' },
            { name: 'TMDB', icon: '🎬' },
            { name: 'AniList', icon: '🌸' },
            { name: 'Vercel', icon: '⚡' },
          ].map(({ name, icon }) => (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: '.35rem',
              padding: '.35rem .7rem', borderRadius: 8,
              background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
            }}>
              <span style={{ fontSize: '.75rem' }}>{icon}</span>
              <span className="f-mono" style={{ fontSize: '.55rem', color: 'rgba(255,245,232,.4)', }}>
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ SHARED COMPONENTS ============ */

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.2rem' }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h2 className="sec" style={{ fontSize: 'clamp(.9rem,1.8vw,1.15rem)' }}>{title}</h2>
      </div>
      <p className="f-crimson" style={{  fontSize: '.78rem', color: 'rgba(255,245,232,.3)', fontStyle: 'italic', paddingLeft: '1.7rem' }}>
        {subtitle}
      </p>
    </div>
  );
}

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.35rem 0' }}>
      <span className="f-cinzel" style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.35)',  letterSpacing: '.04em' }}>
        {label}
      </span>
      <span className={mono ? "f-mono" : "f-crimson"} style={{
        fontSize: '.6rem',
        
        color: highlight || 'rgba(255,245,232,.5)',
        letterSpacing: mono ? '.02em' : '0',
      }}>
        {value}
      </span>
    </div>
  );
}

function DataActionRow({
  icon, title, description, onClick, loading, danger,
}: {
  icon: string; title: string; description: string;
  onClick: () => void; loading?: boolean; danger?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '.7rem .8rem', borderRadius: 10,
      background: danger ? 'rgba(255,74,74,.04)' : 'rgba(255,255,255,.02)',
      border: `1px solid ${danger ? 'rgba(255,74,74,.1)' : 'rgba(255,255,255,.05)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <div>
          <div className="f-cinzel" style={{  fontSize: '.7rem', color: '#FFF5E8', letterSpacing: '.04em' }}>{title}</div>
          <div className="f-crimson" style={{ fontSize: '.6rem', color: 'rgba(255,245,232,.25)',  marginTop: 1 }}>{description}</div>
        </div>
      </div>
      <button className="f-cinzel"
        onClick={onClick}
        disabled={loading}
        style={{
          padding: '.4rem .8rem', borderRadius: 8, border: 'none',
          cursor: loading ? 'wait' : 'pointer', 
          fontSize: '.6rem', letterSpacing: '.04em', transition: 'all .2s',
          background: danger ? 'rgba(255,74,74,.15)' : 'rgba(255,179,71,.12)',
          color: danger ? '#FF4A4A' : '#FFB347',
        }}
      >
        {loading ? '...' : danger ? 'Clear' : 'Action'}
      </button>
    </div>
  );
}
