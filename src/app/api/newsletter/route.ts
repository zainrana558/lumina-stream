import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { newsletterSignupSchema } from '@/lib/schemas';
import { csrfGuard } from '@/lib/csrf';

// POST /api/newsletter — public signup form, no auth required.
// Only captures the subscription (RLS on newsletter_subscribers allows
// anon INSERT only, see supabase/migrations/009_newsletter_subscribers.sql)
// — no email-sending service is wired up, so nothing is mailed out yet.
export async function POST(request: NextRequest) {
  try {
    const csrfError = await csrfGuard(request);
    if (csrfError) {
      return NextResponse.json(csrfError, { status: csrfError.status });
    }

    const rl = await checkRateLimit(request, 'newsletter');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in a minute.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Signup is temporarily unavailable.' }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    const parsed = newsletterSignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid email address.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: parsed.data.email, source: parsed.data.source });

    if (error) {
      // Unique violation — already subscribed. Treat as success so the
      // form doesn't leak whether an email is already on the list.
      if (error.code === '23505') {
        return NextResponse.json({ status: 'subscribed' });
      }
      return NextResponse.json({ error: 'Could not save your subscription. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ status: 'subscribed' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
