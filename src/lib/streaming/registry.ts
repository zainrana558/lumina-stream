/**
 * Provider Registry
 *
 * Moves static provider data to a layered cache system:
 *   L1: In-memory cache (per-instance, for cold starts)
 *   L2: Redis Hash cache (TTL 15min, shared across instances)
 *   L3: Hardcoded fallback array (current static config from providers.ts)
 *
 * Future: Supabase `providers` table as the source of truth for admin-managed
 * provider configuration. For now, the hardcoded list IS the source of truth,
 * and Redis just ensures cross-instance consistency of swap state.
 *
 * Cache key: registry:all → Redis Hash {name → JSON ProviderRecord}
 */

import { getRedis } from '@/lib/redis';
import { getAllProviders, type StreamProvider, type ProviderTier, type ProviderCategory } from '@/lib/streaming/providers';

// ── Types ──

export interface ProviderRecord {
  name: string;
  tier: ProviderTier;
  category: ProviderCategory;
  isActive: boolean;
  /** ISO timestamp of when this record was last updated */
  updatedAt: string;
  /** true if this provider was swapped in from the replacement pool */
  replaced: boolean;
  /** URL generation functions serialized as patterns */
  movieUrlPattern: string;
  tvUrlPattern: string;
  animeUrlPattern?: string;
}

const REGISTRY_CACHE_KEY = 'registry:all';
const REGISTRY_CACHE_TTL = 15 * 60; // 15 minutes

// ── In-Memory L1 Cache ──

let memoryCache: Map<string, ProviderRecord> | null = null;
let memoryCacheTime = 0;
const MEMORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ── Hardcoded Fallback (L3) ──

function buildFallbackRecords(): Map<string, ProviderRecord> {
  const providers = getAllProviders();
  const records = new Map<string, ProviderRecord>();

  for (const p of providers) {
    // Build URL patterns from both path-based and query-param providers
    const sampleMovie = p.getMovieUrl(0);
    const sampleTv = p.getTvUrl(0, 1, 1);

    // Derive movie pattern: replace the sample ID (0) with {id}
    const movieUrlPattern = sampleMovie
      .replace(/([?&]video_id=)0/, '$1{id}')
      .replace(/([?&]tmdb=)0/, '$1{id}')
      .replace(/\/0(\/|$|\?)/, '/{id}$1')
      .replace(/\/0$/, '/{id}');

    // Derive TV pattern: replace sample values with placeholders
    let tvUrlPattern = sampleTv
      .replace(/([?&]video_id=)0/, '$1{id}')
      .replace(/([?&]tmdb=)0/, '$1{id}')
      .replace(/\/0\//, '/{id}/')
      .replace(/\/0\//, '/{id}/');  // handle multiple /0/ segments

    // Replace season/episode sample values (1) with placeholders
    tvUrlPattern = tvUrlPattern
      .replace(/\/1\/1$/, '/{s}/{e}')
      .replace(/season=1/, 'season={s}')
      .replace(/episode=1/, 'episode={e}')
      .replace(/[&?]s=1(&|$)/, '$1s={s}$2')
      .replace(/[&?]e=1(&|$)/, '$1e={e}$2')
      .replace(/autonext=1/, 'autonext={autonext}');

    records.set(p.name, {
      name: p.name,
      tier: p.tier,
      category: p.category,
      isActive: true,
      updatedAt: new Date().toISOString(),
      replaced: false,
      movieUrlPattern,
      tvUrlPattern,
      animeUrlPattern: p.getAnimeUrl ? p.getAnimeUrl(0, 1).replace(/\/0\//, '/{id}/').replace(/\/1$/, '/{ep}') : undefined,
    });
  }

  return records;
}

// ── Redis L2 Cache ──

async function readFromRedis(): Promise<Map<string, ProviderRecord> | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const data = await client.hgetall(REGISTRY_CACHE_KEY) as Record<string, string> | null;
    if (!data || Object.keys(data).length === 0) return null;

    const records = new Map<string, ProviderRecord>();
    for (const [name, json] of Object.entries(data)) {
      try {
        records.set(name, JSON.parse(json) as ProviderRecord);
      } catch {
        // Skip malformed entries
      }
    }

    return records.size > 0 ? records : null;
  } catch {
    return null;
  }
}

async function writeToRedis(records: Map<string, ProviderRecord>): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const hash: Record<string, string> = {};
    for (const [name, record] of records) {
      hash[name] = JSON.stringify(record);
    }
    await client.hset(REGISTRY_CACHE_KEY, hash);
    await client.expire(REGISTRY_CACHE_KEY, REGISTRY_CACHE_TTL);
  } catch {
    // Ignore — will rebuild on next cache miss
  }
}

// ── Public API ──

/**
 * Get all active provider records from the registry.
 * Layered: L1 memory → L2 Redis → L3 hardcoded fallback.
 */
export async function getProviderRegistry(): Promise<Map<string, ProviderRecord>> {
  const now = Date.now();

  // L1: In-memory cache
  if (memoryCache && (now - memoryCacheTime) < MEMORY_CACHE_TTL) {
    return new Map(memoryCache);
  }

  // L2: Redis cache
  if (getRedis()) {
    const fromRedis = await readFromRedis();
    if (fromRedis) {
      memoryCache = fromRedis;
      memoryCacheTime = now;
      return new Map(fromRedis);
    }
  }

  // L3: Hardcoded fallback
  const fallback = buildFallbackRecords();
  memoryCache = fallback;
  memoryCacheTime = now;

  // Asynchronously write to Redis for next time
  writeToRedis(fallback).catch(() => {});

  return fallback;
}

/**
 * Get a single provider record by name.
 */
export async function getProviderByName(name: string): Promise<ProviderRecord | null> {
  const registry = await getProviderRegistry();
  return registry.get(name) ?? null;
}

/**
 * Get providers filtered by category.
 */
export async function getProvidersByCategory(category: ProviderCategory): Promise<ProviderRecord[]> {
  const registry = await getProviderRegistry();
  return Array.from(registry.values())
    .filter(p => p.isActive && (p.category === category || p.category === 'all'))
    .sort((a, b) => a.tier - b.tier);
}

/**
 * Get providers filtered by tier.
 */
export async function getProvidersByTier(tier: ProviderTier): Promise<ProviderRecord[]> {
  const registry = await getProviderRegistry();
  return Array.from(registry.values())
    .filter(p => p.isActive && p.tier === tier)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all active provider names as an array.
 */
export async function getActiveProviderNames(): Promise<string[]> {
  const registry = await getProviderRegistry();
  return Array.from(registry.values())
    .filter(p => p.isActive)
    .map(p => p.name);
}

/**
 * Invalidate the registry cache (called after admin updates).
 * Clears both L1 and L2 caches.
 */
export async function invalidateRegistryCache(): Promise<void> {
  memoryCache = null;
  memoryCacheTime = 0;

  const client = getRedis();
  if (client) {
    try {
      await client.del(REGISTRY_CACHE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * SQL migration for the providers table (Supabase).
 * Run this manually or via a migration tool to create the table.
 * The app does NOT depend on this table — it's an optional enhancement
 * for future admin-managed provider configuration.
 */
export const PROVIDERS_MIGRATION_SQL = `
-- Provider registry table for admin-managed configuration
-- This is OPTIONAL — the app works with hardcoded providers + Redis cache
-- Add this to Supabase via the SQL editor when you want admin management

CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tier INT NOT NULL DEFAULT 3 CHECK (tier BETWEEN 1 AND 3),
  base_url TEXT NOT NULL,
  embed_pattern TEXT,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_providers_tier ON providers(tier);
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(is_active);

-- capabilities JSONB example:
-- {
--   "supportsMovie": true,
--   "supportsAnime": false,
--   "supportsEpisode": true,
--   "maxQuality": "1080p",
--   "requiresReferrer": false
-- }

-- RLS: Only authenticated admins can modify
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active providers"
  ON providers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can read all providers"
  ON providers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert providers"
  ON providers FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Add admin role check: auth.jwt() ->> 'role' = 'admin'

CREATE POLICY "Admins can update providers"
  ON providers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true); -- Add admin role check

CREATE POLICY "Admins can delete providers"
  ON providers FOR DELETE
  TO authenticated
  USING (true); -- Add admin role check
`;