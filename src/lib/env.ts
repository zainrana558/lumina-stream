import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  TMDB_BEARER_TOKEN: z.string().min(1).optional(),
  TMDB_API_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

declare global {
  var __validatedEnv: EnvSchema | undefined;
}

function parseEnv(): EnvSchema {
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    TMDB_BEARER_TOKEN: process.env.TMDB_BEARER_TOKEN,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  // Parse with optional fields - don't throw
  const parsed = envSchema.safeParse(raw);
  return parsed.success ? parsed.data : {} as EnvSchema;
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
