import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeName } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';
  // Prevent redirect to API routes or external paths
  if (next.startsWith('/api/') || next.startsWith('//') || next.includes('://')) {
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  }

  if (code) {
    try {
      const supabase = await createClient();

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        // Log auth error for monitoring (production-safe)
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin));
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if user has profiles — if not, auto-create one
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('account_id', user.id)
          .limit(1);

        if (!existingProfiles || existingProfiles.length === 0) {
          // Extract name from user metadata
          const rawName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.preferred_username ||
            user.email?.split('@')[0] ||
            'Dreamer';

          const name = sanitizeName(rawName);

          // Guard against empty name after sanitization
          const finalName = name.trim().length > 0 ? name : 'Dreamer';

          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              name: finalName,
              account_id: user.id,
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=8B78FF&color=fff&size=128`,
            })
            .select('id')
            .single();

          if (!insertError && newProfile) {
            // Set the profile_id cookie and redirect
            const response = NextResponse.redirect(new URL(next, requestUrl.origin));
            response.cookies.set('profile_id', newProfile.id, {
              path: '/',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 365, // 1 year
            });
            return response;
          }
        } else {
          // User has profiles — redirect to profile selector
          // Pass 'next' as query param so after selection they land where they intended
          const profilesUrl = next !== '/'
            ? `/profiles?next=${encodeURIComponent(next)}`
            : '/profiles';
          const response = NextResponse.redirect(new URL(profilesUrl, requestUrl.origin));
          return response;
        }
      }

      // No user after exchange — redirect to profiles to choose
      return NextResponse.redirect(new URL('/profiles', requestUrl.origin));
    } catch (err) {
      // Log unexpected auth error for monitoring
      return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin));
    }
  }

  // No code provided
  return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin));
}
