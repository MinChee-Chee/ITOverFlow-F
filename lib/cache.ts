/**
 * Simple in-memory cache implementation
 * For production, consider using Redis or similar distributed cache
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    // If cache is full, remove oldest entry
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) {
        this.store.delete(firstKey);
      }
    }

    this.store.set(key, {
      data: value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  size(): number {
    return this.store.size;
  }
}

// Export singleton instance
export const cache = new Cache(1000);

/**
 * Cache helper function with automatic key generation
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetcher();
  cache.set(key, data, ttlMs);
  return data;
}

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}


