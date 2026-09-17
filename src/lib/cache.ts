/**
 * High-performance In-Memory TTL Cache for ConnectU.
 *
 * Eliminates repeat WAN roundtrips to remote Neon PostgreSQL database.
 * Feed queries and suggestion lookups resolve in < 1ms on cache hits.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlSeconds: number = 15): void {
  // Prevent memory overflow by capping entries
  if (memoryStore.size > 2000) {
    const oldestKey = memoryStore.keys().next().value;
    if (oldestKey) memoryStore.delete(oldestKey);
  }

  memoryStore.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function invalidateCache(keyPattern?: string): void {
  if (!keyPattern) {
    memoryStore.clear();
    return;
  }

  for (const key of memoryStore.keys()) {
    if (key.includes(keyPattern)) {
      memoryStore.delete(key);
    }
  }
}
