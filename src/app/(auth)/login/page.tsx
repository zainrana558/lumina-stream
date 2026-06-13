import LoginForm from '@/components/auth/LoginForm';

// Auth pages use Supabase client at component top-level which requires
// runtime env vars — prevent static prerendering at build time.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <>
      <style>{`
        .login-page {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 430px;
          animation: auth-page-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .login-page::before {
          content: '';
          position: absolute;
          top: 0;
          left: 12%;
          right: 12%;
          height: 2.5px;
          background: linear-gradient(90deg, transparent, #FFB347, #FF6B8A, #8B78FF, #4ECDC4, transparent);
          border-radius: 0 0 2px 2px;
          box-shadow: 0 0 16px rgba(255, 107, 138, 0.4), 0 0 30px rgba(139, 120, 255, 0.2);
          z-index: 1;
        }
        @keyframes auth-page-in {
          from { opacity: 0; transform: scale(0.975) translateY(12px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>

      <div className="login-page">
        <LoginForm />
      </div>
    </>
  );
}
