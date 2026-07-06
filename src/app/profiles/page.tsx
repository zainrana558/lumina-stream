import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import ProfileSelector from '@/components/auth/ProfileSelector';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Select Profile — Lumina Stream',
  robots: { index: false, follow: false },
};

interface ProfileData {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  is_kids?: boolean;
}

export default async function ProfilesPage() {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured()) {
    redirect('/');
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not authenticated — redirect to login
  if (!user) {
    redirect('/login');
  }

  // Fetch all profiles for this account
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, created_at, is_kids')
    .eq('account_id', user.id)
    .order('created_at', { ascending: true });

  const typedProfiles: ProfileData[] = (profiles || []).map((p) => ({
    id: p.id,
    name: p.name || 'Unnamed',
    avatar_url: p.avatar_url,
    created_at: p.created_at,
    is_kids: p.is_kids,
  }));

  return <ProfileSelector profiles={typedProfiles} />;
}