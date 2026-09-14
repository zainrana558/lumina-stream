/**
 * Auth Attempt Rate-Limit Gate
 *
 * POST /api/auth/attempt-check
 *
 * Login/signup call `supabase.auth.*` directly from the client (Supabase SDK),
 * so no Lumovia API route ever sees those requests — the app's own 'auth'
 * rate-limit preset (5/60s, brute-force protection) was defined but never
 * actually applied anywhere. This route gives the login/signup forms a real
 * server-side gate to check *before* attempting the Supabase call, so
 * automated credential-stuffing/brute-force against the app's own UI is
 * rate-limited by Lumovia itself, on top of Supabase Auth's own backend limits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, 'auth');
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute before trying again.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }
  return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rl) });
}
