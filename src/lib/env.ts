import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  TMDB_BEARER_TOKEN: z.string().min(1).optional(),
  TMDB_API_KEY: z.string().min(1).optional(),
  // Upstash Redis (for rate limiting + caching)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

declare global {
  var __validatedEnv: EnvSchema | undefined;
}

function parseEnv(): EnvSchema {
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    TMDB_BEARER_TOKEN: process.env.TMDB_BEARER_TOKEN,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const missing = parsed.error.flatten().fieldErrors;
    // Only fail on TMDB missing — Supabase and Upstash are optional
    const fields = Object.entries(missing)
      .filter(([k]) => k.startsWith('TMDB_'))
      .map(([k]) => k)
      .join(', ');
    if (fields) {
      throw new Error(
        `Missing or invalid environment variables: ${fields}. ` +
        `Check your .env file.`
      );
    }
  }

  const data = parsed.data;
  if (!data) {
    throw new Error('Environment validation failed unexpectedly.');
  }

  // At least one TMDB credential is required
  if (!data.TMDB_BEARER_TOKEN && !data.TMDB_API_KEY) {
    throw new Error(
      'Either TMDB_BEARER_TOKEN or TMDB_API_KEY must be set in environment variables.'
    );
  }

  return data;
}

export function getValidatedEnv(): EnvSchema {
  if (process.env.NODE_ENV === 'production' && globalThis.__validatedEnv) {
    return globalThis.__validatedEnv;
  }

  const result = parseEnv();

  if (process.env.NODE_ENV === 'production') {
    globalThis.__validatedEnv = result;
  }

  return result;
}
