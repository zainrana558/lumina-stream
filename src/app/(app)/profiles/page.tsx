import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfiles } from '@/actions/profiles';
import ProfileSelector from '@/components/auth/ProfileSelector';

export const metadata = {
  title: 'LUMINA — Select Profile',
};

export default async function ProfilesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profiles = await getProfiles(user.id);

  return (
    <>
      <style>{`
        .profiles-page-bg {
          position: fixed;
          inset: 0;
          background: #07040F;
          z-index: -1;
          overflow: hidden;
        }
        .profiles-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .profiles-orb-1 {
          top: -22%;
          left: -14%;
          width: 65vw;
          height: 65vw;
          background: radial-gradient(circle, rgba(139, 120, 255, 0.09) 0%, transparent 70%);
          animation: profiles-aurora 20s ease-in-out infinite;
        }
        .profiles-orb-2 {
          top: 38%;
          right: -18%;
          width: 55vw;
          height: 55vw;
          background: radial-gradient(circle, rgba(255, 107, 138, 0.07) 0%, transparent 70%);
          animation: profiles-aurora 24s ease-in-out infinite reverse;
          animation-delay: -7s;
        }
        .profiles-orb-3 {
          bottom: -22%;
          left: 28%;
          width: 48vw;
          height: 48vw;
          background: radial-gradient(circle, rgba(255, 179, 71, 0.055) 0%, transparent 70%);
          animation: profiles-aurora 28s ease-in-out infinite;
          animation-delay: -13s;
        }
        .profiles-content-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(1rem, 5vw, 2rem);
          animation: profiles-page-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes profiles-aurora {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
          40% { transform: translate(3%, 5%) scale(1.08); opacity: 0.45; }
          70% { transform: translate(-4%, 3%) scale(0.93); opacity: 0.18; }
        }
        @keyframes profiles-page-in {
          from { opacity: 0; transform: scale(0.975) translateY(12px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>

      <div className="profiles-page-bg">
        <div className="profiles-orb profiles-orb-1" />
        <div className="profiles-orb profiles-orb-2" />
        <div className="profiles-orb profiles-orb-3" />
      </div>

      <main className="profiles-content-wrapper">
        <ProfileSelector profiles={profiles || []} />
      </main>
    </>
  );
}
