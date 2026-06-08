import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }

  try {
    const url = new URL(`${TMDB_BASE}${endpoint}`);
    url.searchParams.set('api_key', apiKey);

    // Forward all other query params
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') url.searchParams.set(key, value);
    });

    const res = await fetch(url.toString(), {
      next: { revalidate: 300 },
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `TMDB API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[TMDB API Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
