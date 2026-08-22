interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export const CACHE_TTL = {
  soil: Infinity,
  weather: 2 * 60 * 60 * 1000,
  geocode: 24 * 60 * 60 * 1000,
  satellite: 6 * 60 * 60 * 1000,
} as const;
